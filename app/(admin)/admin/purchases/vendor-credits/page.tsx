'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendorCredits } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    Plus,
    Search,
    RefreshCcw,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import type { DebitNote } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { PurchasesNav } from '../_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function VendorCreditsPage() {
    const router = useRouter();
    const { baseCurrency } = useCompanySettings();
    const [credits, setCredits] = useState<DebitNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handler = () => window.location.reload();
        window.addEventListener('erp_company_settings_changed', handler);
        return () => window.removeEventListener('erp_company_settings_changed', handler);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getVendorCredits();
            setCredits(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const filteredCredits = credits.filter(c => 
        c.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Vendor Credits</p>
            </div>
        </DashboardShell>
    );

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/purchases')}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Vendor Credits</h1>
                            <p className="text-muted-foreground">Debit Notes & Adjustments</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest">
                            <Plus className="h-4 w-4" /> New Credit Note
                        </Button>
                    </div>
                </div>

                <PurchasesNav />

                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="SEARCH BY NUMBER OR VENDOR..."
                            className="w-full h-10 pl-9 pr-4 rounded-md border border-border bg-card text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border shadow-sm rounded-md overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Credit No</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendor</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Amount</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredCredits.map((vc) => (
                                    <tr key={vc.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-foreground uppercase font-mono">{vc.number}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{vc.vendor?.name}</td>
                                        <td className="px-6 py-4 text-xs font-black text-right text-foreground">{fmt(Number(vc.total_amount))}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase">{vc.status}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-primary">
                                                <ChevronRight size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCredits.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <FileText className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No Vendor Credits Recorded</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </DashboardShell>
    );
}
