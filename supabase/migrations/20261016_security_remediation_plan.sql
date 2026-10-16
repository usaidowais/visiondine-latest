-- ====================================================================
-- VisionDine 2.0 — Supabase Security Remediation Plan
-- Date: 2026-10-16
-- Status: PROPOSED / FOR REVIEW ONLY (DO NOT EXECUTE DIRECTLY)
--
-- Objective:
-- 1. Enable RLS on all tables (restaurants, dishes, analytics, analytics_events).
-- 2. Preserve unrestricted public access to active menus, dishes, and 3D assets.
-- 3. Restrict administrative write/delete access to verified administrators.
-- 4. Lock down analytics so public visitors can only INSERT telemetry events.
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: Enable Row Level Security (RLS) on all core tables
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- STEP 2: RESTAURANTS Table Policies
-- --------------------------------------------------------------------

-- Clean up existing permissive policies if present
DROP POLICY IF EXISTS "Admin Full Access" ON public.restaurants;
DROP POLICY IF EXISTS "Public Read Active Restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super Admin Full Access Restaurants" ON public.restaurants;

-- Policy 2A: Public Read Access
-- Allows any anonymous or authenticated visitor to read active restaurants for the menu/AR demo
CREATE POLICY "Public Read Active Restaurants"
ON public.restaurants
FOR SELECT
TO anon, authenticated
USING (
    status = 'active' OR status IS NULL
);

-- Policy 2B: Admin Full Access (Write / Update / Delete)
-- NOTE: Requires an authorized administrator check.
-- Phase 1 (Hackathon Safe Guard): Restrict to designated super admin email
CREATE POLICY "Super Admin Full Access Restaurants"
ON public.restaurants
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
    OR (auth.uid() = owner_id)
)
WITH CHECK (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
    OR (auth.uid() = owner_id)
);


-- --------------------------------------------------------------------
-- STEP 3: DISHES Table Policies
-- --------------------------------------------------------------------

-- Clean up existing policies
DROP POLICY IF EXISTS "Public Read Access" ON public.dishes;
DROP POLICY IF EXISTS "Admin Full Access" ON public.dishes;
DROP POLICY IF EXISTS "Public Read Dishes" ON public.dishes;
DROP POLICY IF EXISTS "Super Admin Full Access Dishes" ON public.dishes;

-- Policy 3A: Public Read Access
-- Allows visitors to explore dishes, images, and 3D models (.glb/.usdz)
CREATE POLICY "Public Read Dishes"
ON public.dishes
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 3B: Admin Full Access (Insert / Update / Delete)
-- Restricts dish management to verified super admin or restaurant owners
CREATE POLICY "Super Admin Full Access Dishes"
ON public.dishes
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
    OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = dishes.restaurant_id
        AND r.owner_id = auth.uid()
    )
)
WITH CHECK (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
    OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = dishes.restaurant_id
        AND r.owner_id = auth.uid()
    )
);


-- --------------------------------------------------------------------
-- STEP 4: ANALYTICS / ANALYTICS_EVENTS Table Policies
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Public Insert Analytics Telemetry" ON public.analytics;
DROP POLICY IF EXISTS "Admin Read Analytics" ON public.analytics;
DROP POLICY IF EXISTS "Admin Delete Analytics" ON public.analytics;

-- Policy 4A: Anonymous / Public Telemetry Logging
-- Allows public visitors to emit scan and view_ar events, but NEVER read or delete
CREATE POLICY "Public Insert Analytics Telemetry"
ON public.analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (
    event_type IN ('qr_scan', 'view_ar', 'click_dish', 'scan')
);

-- Policy 4B: Admin Read Access
-- Only authorized administrators can read analytics metrics
CREATE POLICY "Admin Read Analytics"
ON public.analytics
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
    OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = analytics.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- Policy 4C: Admin Delete Access (Required when deleting a restaurant)
CREATE POLICY "Admin Delete Analytics"
ON public.analytics
FOR DELETE
TO authenticated
USING (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
    OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = analytics.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- Mirror policies for analytics_events if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_events') THEN
        DROP POLICY IF EXISTS "Public Insert Analytics Events" ON public.analytics_events;
        DROP POLICY IF EXISTS "Admin Read Analytics Events" ON public.analytics_events;

        CREATE POLICY "Public Insert Analytics Events"
        ON public.analytics_events
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (
            event_type IN ('qr_scan', 'view_ar', 'click_dish', 'scan')
        );

        CREATE POLICY "Admin Read Analytics Events"
        ON public.analytics_events
        FOR SELECT
        TO authenticated
        USING (
            (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
        );
    END IF;
END $$;


-- --------------------------------------------------------------------
-- STEP 5: STORAGE BUCKET POLICIES (media bucket)
-- --------------------------------------------------------------------

-- Allow public read access to media assets (images, 3D glb models)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Media Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Media Storage" ON storage.objects;

CREATE POLICY "Public Read Media Storage"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media');

-- Allow authenticated users to upload only into their own user folder
CREATE POLICY "Authenticated Upload Media Storage"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'media'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com')
);
