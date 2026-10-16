'use client';

import React from 'react';
import { NavItem } from '@/components/ui/NavItem';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
    onLogout: () => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onClose }) => {
    const router = useRouter();
    const pathname = usePathname();

    const handleNavigation = (path: string) => {
        router.push(path);
        onClose?.();
    };

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    "fixed left-0 top-0 bottom-0 z-50 w-64 bg-background/95 backdrop-blur-md border-r border-border transition-transform duration-300 ease-in-out md:translate-x-0 pt-4 pb-4 flex flex-col shadow-2xl md:shadow-none",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="px-6 pb-6 border-b border-border/50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
                        VD
                    </div>
                    <div>
                        <h1 className="font-bold text-foreground text-lg leading-tight tracking-tight">VisionDine 2.0</h1>
                        <p className="text-xs text-muted-foreground font-medium">Super Admin</p>
                    </div>
                    <button className="md:hidden ml-auto text-muted-foreground hover:text-foreground transition-colors" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
                    <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform</div>

                    <NavItem
                        icon="dashboard"
                        label="Overview"
                        active={pathname === '/admin'}
                        onClick={() => handleNavigation('/admin')}
                    />
                    <NavItem
                        icon="store"
                        label="Restaurants"
                        active={pathname.startsWith('/admin/restaurants')}
                        onClick={() => handleNavigation('/admin/restaurants')}
                    />

                    <NavItem
                        icon="analytics"
                        label="Analytics"
                        active={pathname.startsWith('/admin/analytics')}
                        onClick={() => handleNavigation('/admin/analytics')}
                    />

                    <NavItem
                        icon="view_in_ar"
                        label="AR Demo"
                        active={pathname.startsWith('/admin/ar-demo')}
                        onClick={() => handleNavigation('/admin/ar-demo')}
                    />

                    <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">System</div>
                    <NavItem
                        icon="settings"
                        label="Settings"
                        active={pathname.startsWith('/admin/settings')}
                        onClick={() => handleNavigation('/admin/settings')}
                    />
                </nav>

                <div className="px-4 pt-4 border-t border-border/50">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all rounded-lg text-sm font-medium w-full px-4 py-3 group"
                    >
                        <span className="material-icons-round group-hover:scale-110 transition-transform">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};
