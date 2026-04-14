'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Target, Lightbulb, Users, Handshake,
    MessageSquare, FileSignature, FileText, Receipt, Truck,
    ChevronRight
} from 'lucide-react';

const salesNav = [
    {
        title: 'CRM / Audience',
        items: [
            { title: 'Leads', href: '/admin/sales/leads', icon: Target },
            { title: 'Opportunities', href: '/admin/sales/opportunities', icon: Lightbulb },
            { title: 'Customers', href: '/admin/sales/customers', icon: Users },
            { title: 'Partners', href: '/admin/sales/partners', icon: Handshake },
        ]
    },
    {
        title: 'Sales Process',
        items: [
            { title: 'Enquiries', href: '/admin/sales/enquiries', icon: MessageSquare },
            { title: 'Quotations', href: '/admin/sales/quotations', icon: FileSignature },
            { title: 'Proforma', href: '/admin/sales/proforma', icon: FileText },
            { title: 'Invoices', href: '/admin/sales/invoices', icon: Receipt },
            { title: 'Delivery Notes', href: '/admin/sales/delivery-notes', icon: Truck },
        ]
    }
];

interface SalesLayoutProps {
    children: React.ReactNode;
}

export default function SalesLayout({ children }: SalesLayoutProps) {
    const pathname = usePathname();

    return (
        <>
            <div className="flex flex-1 overflow-hidden h-full">
                {/* Left Sidebar */}
                <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
                    <nav className="p-4 space-y-6 overflow-y-auto">
                        {salesNav.map((group) => (
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
