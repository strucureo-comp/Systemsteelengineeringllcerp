'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    ChevronDown,
    Store,
    DollarSign,
    ClipboardList,
    ShoppingCart,
    Receipt,
    CreditCard,
    Repeat,
    Layers,
    FileText,
    Truck
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
    {
        title: 'Vendors',
        href: '/admin/purchases/vendors',
        icon: Store,
        items: [
            { title: 'All Vendors', href: '/admin/purchases/vendors', icon: Store },
            { title: 'Vendor Credits', href: '/admin/purchases/vendor-credits', icon: FileText },
        ]
    },
    {
        title: 'Expenses',
        href: '/admin/purchases/expenses',
        icon: DollarSign,
        items: [
            { title: 'All Expenses', href: '/admin/purchases/expenses', icon: DollarSign },
            { title: 'Recurring Expenses', href: '/admin/purchases/expenses/recurring', icon: Repeat },
        ]
    },
    {
        title: 'Procurement',
        href: '/admin/purchases/material-requests',
        icon: ClipboardList,
        items: [
            { title: 'Purchase Requests', href: '/admin/purchases/material-requests', icon: ClipboardList },
            { title: 'RFQs', href: '/admin/purchases/rfqs', icon: Layers },
        ]
    },
    {
        title: 'Purchase Orders',
        href: '/admin/purchases/orders',
        icon: ShoppingCart,
        items: [
            { title: 'Purchase Orders', href: '/admin/purchases/orders', icon: ShoppingCart },
            { title: 'Goods Receipts (GRN)', href: '/admin/purchases/grns', icon: Truck },
        ]
    },
    {
        title: 'Bills',
        href: '/admin/purchases/bills',
        icon: Receipt,
        items: [
            { title: 'All Bills', href: '/admin/purchases/bills', icon: Receipt },
            { title: 'Recurring Bills', href: '/admin/purchases/bills/recurring', icon: Repeat },
        ]
    },
    {
        title: 'Payments',
        href: '/admin/purchases/payments',
        icon: CreditCard,
        items: [
            { title: 'Payments Made', href: '/admin/purchases/payments', icon: CreditCard },
            { title: 'Batch Payments', href: '/admin/purchases/payments/batch', icon: Layers },
        ]
    },
];

export function PurchasesNav() {
    const pathname = usePathname();

    return (
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border w-full overflow-x-auto no-scrollbar">
            <Link 
                href="/admin/purchases"
                className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    pathname === '/admin/purchases' 
                        ? "bg-white text-primary shadow-sm ring-1 ring-border" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
            >
                Dashboard
            </Link>
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                    <DropdownMenu key={item.title}>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all outline-none whitespace-nowrap",
                                    isActive 
                                        ? "bg-white text-primary shadow-sm ring-1 ring-border" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                )}
                            >
                                <Icon size={14} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                                {item.title}
                                <ChevronDown size={12} className="opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl">
                            {item.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = pathname === subItem.href;
                                
                                return (
                                    <DropdownMenuItem key={subItem.title} asChild>
                                        <Link 
                                            href={subItem.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                                                isSubActive ? "bg-primary/5 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <SubIcon size={16} />
                                            <span className="text-[11px] uppercase tracking-wider">{subItem.title}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}
        </div>
    );
}
