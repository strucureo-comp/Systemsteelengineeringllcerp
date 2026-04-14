'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Store, Mails, MessageCircleQuestion, ShoppingCart, PackagePlus,
    Receipt, Banknote, CreditCard, Wallet,
    ChevronRight
} from 'lucide-react';

const purchasesNav = [
    {
        title: 'Sourcing',
        items: [
            { title: 'Vendors', href: '/admin/purchases/vendors', icon: Store },
        ]
    },
    {
        title: 'Procurement',
        items: [
            { title: 'Material Requests', href: '/admin/purchases/material-requests', icon: Mails },
            { title: 'RFQs', href: '/admin/purchases/rfqs', icon: MessageCircleQuestion },
            { title: 'Purchase Orders', href: '/admin/purchases/orders', icon: ShoppingCart },
            { title: 'GRNs', href: '/admin/purchases/grns', icon: PackagePlus },
        ]
    },
    {
        title: 'Spend Management',
        items: [
            { title: 'Bills', href: '/admin/purchases/bills', icon: Receipt },
            { title: 'Expenses', href: '/admin/purchases/expenses', icon: Banknote },
            { title: 'Payments', href: '/admin/purchases/payments', icon: CreditCard },
            { title: 'Vendor Credits', href: '/admin/purchases/vendor-credits', icon: Wallet },
        ]
    }
];

interface PurchasesLayoutProps {
    children: React.ReactNode;
}

export default function PurchasesLayout({ children }: PurchasesLayoutProps) {
    const pathname = usePathname();

    return (
        <>
            <div className="flex flex-1 overflow-hidden h-full">
                {/* Left Sidebar */}
                <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
                    <nav className="p-4 space-y-6 overflow-y-auto">
                        {purchasesNav.map((group) => (
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
