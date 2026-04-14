'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    BookOpen, Landmark, Receipt, Globe,
    CreditCard, Wallet, FileText, Banknote,
    FileUp, FileDown, Book,
    Building2, Box, Package,
    ShieldCheck, CalendarCheck, LineChart, Settings,
    ChevronRight
} from 'lucide-react';

const financeNav = [
    {
        title: 'Core Operations',
        items: [
            { title: 'Ledger', href: '/admin/finance/ledger', icon: BookOpen },
            { title: 'Banking', href: '/admin/finance/banking', icon: Landmark },
            { title: 'Taxes', href: '/admin/finance/taxes', icon: Receipt },
            { title: 'Multi-Currency', href: '/admin/finance/multi-currency', icon: Globe },
        ]
    },
    {
        title: 'Receivables & Payables',
        items: [
            { title: 'Receivables', href: '/admin/finance/receivables', icon: Wallet },
            { title: 'Payables', href: '/admin/finance/payables', icon: CreditCard },
            { title: 'Invoices', href: '/admin/finance/invoices', icon: FileText },
            { title: 'Expenses', href: '/admin/finance/expenses', icon: Banknote },
        ]
    },
    {
        title: 'Vouchers',
        items: [
            { title: 'Payment Vouchers', href: '/admin/finance/payment-vouchers', icon: FileUp },
            { title: 'Receipt Vouchers', href: '/admin/finance/receipt-vouchers', icon: FileDown },
            { title: 'Intercompany', href: '/admin/finance/intercompany', icon: Book },
        ]
    },
    {
        title: 'Asset Management',
        items: [
            { title: 'Assets', href: '/admin/finance/assets', icon: Building2 },
            { title: 'Inventory', href: '/admin/finance/inventory', icon: Box },
            { title: 'Stock Journal', href: '/admin/finance/stock-journal', icon: Package },
        ]
    },
    {
        title: 'Closing & Control',
        items: [
            { title: 'Approvals', href: '/admin/finance/approvals', icon: ShieldCheck },
            { title: 'Period Close', href: '/admin/finance/period-close', icon: CalendarCheck },
            { title: 'Reports', href: '/admin/finance/reports', icon: LineChart },
            { title: 'Settings', href: '/admin/finance/settings', icon: Settings },
        ]
    },
];

interface FinanceLayoutProps {
    children: React.ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
    const pathname = usePathname();

    return (
        <>
            <div className="flex flex-1 overflow-hidden h-full">
                {/* Left Sidebar */}
                <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
                    <nav className="p-4 space-y-6 overflow-y-auto">
                        {financeNav.map((group) => (
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
