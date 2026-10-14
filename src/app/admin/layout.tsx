'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/services/supabaseService';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Auth Check
    React.useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            // 1. Check if demo cookie or local storage auth exists
            const hasCookie = typeof document !== 'undefined' && document.cookie.includes('supabase-auth-token');
            const hasStorage = typeof window !== 'undefined' && localStorage.getItem('visiondine_auth') === 'true';

            if (hasCookie || hasStorage) {
                if (mounted) setIsLoading(false);
                return;
            }

            // 2. Check Supabase auth session
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                if (session) {
                    if (mounted) setIsLoading(false);
                    return;
                }

                // If not authenticated, redirect to login
                router.push('/login');
            } catch (error) {
                console.warn('Supabase auth session check offline, proceeding with demo access:', error);
                // In demo / offline fallback mode, allow access
                if (mounted) setIsLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const hasCookie = typeof document !== 'undefined' && document.cookie.includes('supabase-auth-token');
            const hasStorage = typeof window !== 'undefined' && localStorage.getItem('visiondine_auth') === 'true';
            if (!session && !hasCookie && !hasStorage && mounted) {
                router.push('/login');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    // Logout
    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch {
            // ignore
        }
        // Clear middleware auth cookie and storage
        document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        if (typeof window !== 'undefined') {
            localStorage.removeItem('visiondine_auth');
        }
        window.location.href = '/login';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar
                onLogout={handleLogout}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 md:ml-64 flex flex-col transition-all duration-300">
                {/* Mobile Header */}
                <div className="md:hidden sticky top-0 z-40 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">VD</div>
                        <span className="font-bold text-foreground">VisionDine Admin</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                        <span className="material-icons-round text-foreground">menu</span>
                    </button>
                </div>

                <main className="flex-1 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
