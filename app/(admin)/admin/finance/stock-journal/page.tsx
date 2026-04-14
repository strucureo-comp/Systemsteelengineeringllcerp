'use client';

import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { StockJournalContent } from '../_components/stock-journal-content';
import { Package } from 'lucide-react';

/**
 * Standalone Stock Journal page.
 * Covers: Adjustment, Transfer, Stock Count, Damage write-off, Revaluation.
 * GL impact auto-calculated on post.
 */
export default function StockJournalPage() {
    return (
        <DashboardShell requireAdmin>
            <div className="space-y-6 pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border pb-5">
                    <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Stock Journal</h1>
                        <p className="text-[11px] text-muted-foreground">
                            Inventory movements · FIFO / Weighted Avg · GL integration
                        </p>
                    </div>
                </div>

                {/* Reuse the existing, full-featured StockJournalContent */}
                <StockJournalContent />
            </div>
        </DashboardShell>
    );
}
