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
            { title: 'Vendor Statements', href: '/admin/purchases/vendors/statements', icon: FileText },
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
    return null;
}
