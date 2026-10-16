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
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!mounted) return;

                if (error || !session) {
                    document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('visiondine_auth');
                    }
                    router.push('/login');
                    return;
                }

                // Sync the active token to cookie so middleware always stays valid across navigations and refresh
                document.cookie = `supabase-auth-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax`;

                if (mounted) setIsLoading(false);
            } catch (error) {
                console.error('Authentication verification error:', error);
                if (mounted) {
                    document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('visiondine_auth');
                    }
                    router.push('/login');
                }
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                document.cookie = `supabase-auth-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax`;
            } else if ((event === 'SIGNED_OUT' || !session) && mounted) {
                document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('visiondine_auth');
                }
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
                        <span className="font-bold text-foreground">VisionDine 2.0 Admin</span>
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
