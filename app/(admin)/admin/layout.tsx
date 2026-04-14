'use client';

import { Sidebar } from '@/components/shared/layout/sidebar';
import { MobileNav } from '@/components/shared/layout/mobile-nav';
import { Header } from '@/components/shared/layout/header';
import { TitleUpdater } from '@/components/shared/title-updater';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const { user, loading } = useAuth();
    const router = useRouter();

    const isAdminUser = (role?: string | null) => {
        const normalized = String(role || '').trim().toLowerCase();
        return normalized === 'admin' || normalized === 'superadmin' || normalized === 'administrator';
    };

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!isAdminUser(user.role)) {
                // Not an admin, they shouldn't be in the /admin area
                router.push('/login');
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user || !isAdminUser(user.role)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card/10 flex flex-col font-sans text-foreground selection:bg-primary/20">
            <TitleUpdater />

            <div className="flex-1 flex overflow-hidden">
                {/* Fixed Sidebar */}
                <Sidebar
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed((v) => !v)}
                />

                {/* Main Container */}
                <main className={cn(
                    "flex-1 flex flex-col transition-all duration-300 ease-in-out relative min-w-0 h-screen",
                    isCollapsed ? "md:pl-[72px]" : "md:pl-64"
                )}>
                    {/* Global Header */}
                    <Header />

                    {/* Content Hub - Standard padding for all hubs */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-12 no-scrollbar">
                        <div className="animate-in fade-in duration-500 w-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileNav />
        </div>
    );
}
