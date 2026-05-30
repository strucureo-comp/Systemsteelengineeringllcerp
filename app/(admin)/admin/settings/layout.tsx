'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Building2, Palette, DollarSign, Receipt,
    Users, Shield, Layers, ChevronRight,
    Workflow, Contact, User
} from 'lucide-react';

const settingsNav = [
    {
        title: 'General',
        items: [
            { title: 'Profile', href: '/admin/settings/profile', icon: User },
            { title: 'Company', href: '/admin/settings/company', icon: Building2 },
            { title: 'Branding', href: '/admin/settings/branding', icon: Palette },
            { title: 'Module Configuration', href: '/admin/settings/modules', icon: Layers },
        ]
    },
    {
        title: 'Finance',
        items: [
            { title: 'Currency & Fiscal', href: '/admin/settings/currency', icon: DollarSign },
            { title: 'Taxes', href: '/admin/settings/taxes', icon: Receipt },
        ]
    },
    {
        title: 'Access',
        items: [
            { title: 'Users', href: '/admin/settings/users', icon: Users },
            { title: 'Employees', href: '/admin/settings/employees', icon: Contact },
            { title: 'Roles & Permissions', href: '/admin/settings/roles', icon: Shield },
            { title: 'Approval Workflows', href: '/admin/settings/approvals', icon: Workflow },
        ]
    },
];

interface SettingsLayoutProps {
    children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();

    return (
        <>
            <div className="flex h-[calc(100vh-10rem)] border border-border/50 rounded-2xl overflow-hidden bg-background shadow-sm">
                {/* Left Sidebar */}
                <aside className="w-64 shrink-0 border-r bg-card overflow-y-auto">
                    <nav className="p-4 space-y-6">
                        {settingsNav.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                                    isActive
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </div>
                                                <ChevronRight className="h-3 w-3 opacity-50" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </>
    );
}
