'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Standard shell wrapper for every Finance sub-page.
 * Provides consistent header layout: back button + icon + title block + optional actions.
 */
interface FinancePageHeaderProps {
    /** Title text */
    title: string;
    /** Subtitle / breadcrumb text */
    subtitle: string;
    /** Lucide icon component */
    icon: React.ComponentType<{ className?: string }>;
    /** Link the back chevron points to — defaults to /admin/finance */
    backHref?: string;
    /** Optional right-side action slot */
    actions?: React.ReactNode;
    /** Optional badges slot (rendered next to title) */
    badges?: React.ReactNode;
}

export function FinancePageHeader({
    title,
    subtitle,
    icon: Icon,
    backHref = '/admin/finance',
    actions,
    badges,
}: FinancePageHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b border-border pb-5">
            <div className="flex items-center gap-3">
                <Link href={backHref}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight uppercase leading-none">{title}</h1>
                        {badges}
                    </div>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mt-1">{subtitle}</p>
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

/**
 * Standard table header row for all Finance list tables.
 * Children = `<span>` column labels.
 */
export function FinanceTableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "grid grid-cols-12 px-6 py-2.5 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t",
            className
        )}>
            {children}
        </div>
    );
}

/**
 * Standard empty state card.
 */
export function FinanceEmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="p-12 text-center space-y-3">
            <Icon className="h-9 w-9 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {description && (
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">{description}</p>
            )}
            {action}
        </div>
    );
}
