'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Factory, Package, ClipboardCheck, Activity, 
    Settings, ChevronRight, LayoutDashboard,
    FileText, Hammer, ShieldCheck, PieChart
} from 'lucide-react';

const manufacturingNav = [
    {
        title: 'Operations',
        items: [
            { title: 'Production Orders', href: '/admin/manufacturing/orders', icon: Package },
            { title: 'Work Centers', href: '/admin/manufacturing/work-centers', icon: Hammer },
        ]
    },
    {
        title: 'Master Data',
        items: [
            { title: 'BOMs', href: '/admin/manufacturing/boms', icon: FileText },
        ]
    },
    {
        title: 'Quality & Control',
        items: [
            { title: 'Inspections', href: '/admin/manufacturing/quality', icon: ShieldCheck },
        ]
    },
    {
        title: 'Analysis',
        items: [
            { title: 'Analytics', href: '/admin/manufacturing/analytics', icon: PieChart },
        ]
    },
];

interface ManufacturingLayoutProps {
    children: React.ReactNode;
}

export default function ManufacturingLayout({ children }: ManufacturingLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex h-[calc(100vh-10rem)] border border-border/50 rounded-2xl overflow-hidden bg-background shadow-sm">
            {/* Left Sidebar */}
            <aside className="w-64 shrink-0 border-r bg-card overflow-y-auto">
                <nav className="p-4 space-y-6">
                    {manufacturingNav.map((group) => (
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
                <div className="max-w-4xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
