-- ====================================================================
-- VisionDine 2.0 — AR Demo Central Configuration Migration
-- Date: 2026-10-16
-- Status: REVIEWED — READY FOR APPLICATION IN SUPABASE DASHBOARD
--
-- Objective:
-- 1. Create a dedicated `demo_dish_config` table for the public AR demo.
-- 2. Store all editable demo metadata (name, description, price, currency,
--    category, preview image URL, GLB model URL, AR scale).
-- 3. Binary model files (.glb) and images remain in Supabase Storage ('media' bucket).
-- 4. Enable Row Level Security (RLS) with public SELECT and super-admin-only ALL.
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: Create demo_dish_config Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_dish_config (
    id TEXT PRIMARY KEY DEFAULT 'wood-fired-pizza',
    name TEXT NOT NULL DEFAULT 'Wood-Fired Artisan Pizza',
    description TEXT DEFAULT 'Fresh mozzarella, San Marzano tomato sauce, fragrant basil leaves, and extra virgin olive oil on a blistered crust.',
    price NUMERIC(10, 2) NOT NULL DEFAULT 18.50,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    category VARCHAR(50) NOT NULL DEFAULT 'Specialty',
    image_url TEXT NOT NULL DEFAULT '/dish-pizza.svg',
    glb_url TEXT NOT NULL DEFAULT '/assets/pizza-source.glb',
    ar_scale NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Comment on table and columns
COMMENT ON TABLE public.demo_dish_config IS 'Central persistent configuration for the public VisionDine AR demo (/menu/khansaab/dish/wood-fired-pizza)';
COMMENT ON COLUMN public.demo_dish_config.glb_url IS 'Public HTTPS URL or path to the 3D GLB model in Supabase Storage';
COMMENT ON COLUMN public.demo_dish_config.ar_scale IS 'Scaling multiplier for WebAR viewport rendering';

-- --------------------------------------------------------------------
-- STEP 2: Grant Table Privileges
-- --------------------------------------------------------------------
-- SELECT granted broadly so anonymous visitors can read the public demo config.
-- Write operations are enforced exclusively by RLS Policy B below.
GRANT SELECT ON public.demo_dish_config TO anon, authenticated;

-- --------------------------------------------------------------------
-- STEP 3: Enable Row Level Security (RLS)
-- --------------------------------------------------------------------
ALTER TABLE public.demo_dish_config ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Public read demo dish config" ON public.demo_dish_config;
DROP POLICY IF EXISTS "Super admin manage demo dish config" ON public.demo_dish_config;

-- Policy A: Unrestricted Public Read Access
-- Allows any anonymous website visitor or mobile QR scanner to view the demo dish
CREATE POLICY "Public read demo dish config"
ON public.demo_dish_config
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy B: Super-Admin-Only Write Access
-- ONLY the verified super-admin email may INSERT, UPDATE, or DELETE.
-- Any other authenticated user is blocked by this policy.
-- WARNING: Do NOT add OR auth.role() = 'authenticated' here — that would
-- grant write access to every authenticated user, defeating the purpose.
CREATE POLICY "Super admin manage demo dish config"
ON public.demo_dish_config
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
)
WITH CHECK (
    (auth.jwt() ->> 'email') = 'usaidowais123@gmail.com'
);

-- --------------------------------------------------------------------
-- STEP 4: Seed Default Demo Dish Record
-- --------------------------------------------------------------------
INSERT INTO public.demo_dish_config (
    id,
    name,
    description,
    price,
    currency,
    category,
    image_url,
    glb_url,
    ar_scale
) VALUES (
    'wood-fired-pizza',
    'Wood-Fired Artisan Pizza',
    'Fresh mozzarella, San Marzano tomato sauce, fragrant basil leaves, and extra virgin olive oil on a blistered crust.',
    18.50,
    'PKR',
    'Specialty',
    '/dish-pizza.svg',
    '/assets/pizza-source.glb',
    1.00
) ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
