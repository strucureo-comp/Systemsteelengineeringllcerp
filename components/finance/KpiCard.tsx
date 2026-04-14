'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Shared KPI display card for all Finance module sub-pages.
 *
 * Variants:
 *  - default  : neutral card
 *  - alert    : red border + red value (overdue, critical)
 *  - warn     : amber border (attention needed)
 *
 * Supports optional delta trend line with direction arrow.
 */
export interface KpiCardProps {
    /** Metric label shown above the value */
    label: string;
    /** Formatted metric value (pass already-formatted string) */
    value: string;
    /** Show pulsing loading skeleton instead of value */
    loading?: boolean;
    /** Red accent — overdue / critical values */
    alert?: boolean;
    /** Amber accent — warning / attention */
    warn?: boolean;
    /** Optional delta string e.g. "+12%" shown below value */
    delta?: string;
    /** Direction of delta — positive = up (green), false = down (red) */
    positive?: boolean;
    /** Custom footer message shown below value */
    footer?: string;
    /** Optional className override on the card */
    className?: string;
}

export function KpiCard({
    label,
    value,
    loading = false,
    alert: hasAlert = false,
    warn = false,
    delta,
    positive,
    footer,
    className,
}: KpiCardProps) {
    return (
        <Card
            className={cn(
                hasAlert && 'border-red-500/50 dark:border-red-500/30',
                warn && 'border-amber-500/50 dark:border-amber-500/30',
                className,
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-7 w-24" />
                ) : (
                    <div
                        className={cn(
                            'text-2xl font-bold',
                            hasAlert && 'text-red-600 dark:text-red-400',
                            warn && 'text-amber-600 dark:text-amber-400',
                        )}
                    >
                        {value}
                    </div>
                )}

                {!loading && (delta || footer || hasAlert) && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center flex-wrap gap-1">
                        {delta && (
                            <span
                                className={cn(
                                    'font-medium flex items-center',
                                    positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                                )}
                            >
                                {positive ? (
                                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                                )}
                                {delta}
                            </span>
                        )}
                        
                        {hasAlert && !footer && (
                            <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Needs attention
                            </span>
                        )}

                        {footer && (
                            <span className={cn(hasAlert && 'text-red-600 dark:text-red-400 font-medium flex items-center gap-1')}>
                                {hasAlert && <AlertTriangle className="h-3 w-3" />}
                                {footer}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

