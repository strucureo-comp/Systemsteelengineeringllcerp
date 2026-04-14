'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Users,
    ChevronRight,
    Briefcase,
    UserPlus,
    Clock,
    Calendar,
    GitBranch,
    DollarSign,
    FileText,
    Receipt,
    Settings
} from 'lucide-react';

const hrNav = [
    {
        title: 'Core Registry',
        items: [
            { title: 'Employee Team', href: '/admin/hr/team', icon: Users },
            { title: 'Job Openings', href: '/admin/hr/hiring', icon: Briefcase },
            { title: 'Onboarding', href: '/admin/hr/onboarding', icon: UserPlus },
        ]
    },
    {
        title: 'Operations',
        items: [
            { title: 'Attendance', href: '/admin/hr/attendance', icon: Clock },
            { title: 'Leaves', href: '/admin/hr/leaves', icon: Calendar },
            { title: 'Workflows', href: '/admin/hr/workflows', icon: GitBranch },
        ]
    },
    {
        title: 'Payroll & Finance',
        items: [
            { title: 'Payroll Run', href: '/admin/hr/payroll', icon: DollarSign },
            { title: 'Payslips', href: '/admin/hr/payslips', icon: FileText },
            { title: 'Claims', href: '/admin/hr/claims', icon: Receipt },
        ]
    },
    {
        title: 'Configuration',
        items: [
            { title: 'HR Settings', href: '/admin/hr/settings', icon: Settings },
        ]
    }
];

interface HRLayoutProps {
    children: React.ReactNode;
}

export default function HRLayout({ children }: HRLayoutProps) {
    const pathname = usePathname();

    return (
        <>
            <div className="flex flex-1 overflow-hidden h-full">
                {/* Left Sidebar */}
                <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
                    <nav className="p-4 space-y-6 overflow-y-auto">
                        {hrNav.map((group) => (
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
                <main className="flex-1 overflow-y-auto bg-muted/5">
                    <div className="p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
