'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecurringBills, getVendors } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Repeat,
    Plus,
    Search,
    RefreshCcw,
    ChevronLeft
} from 'lucide-react';
import type { RecurringBill, Vendor } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { PurchasesNav } from '../../_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function RecurringBillsPage() {
    const router = useRouter();
    const { baseCurrency } = useCompanySettings();
    const [bills, setBills] = useState<RecurringBill[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
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
            const [billData, vendorData] = await Promise.all([
                getRecurringBills(),
                getVendors()
            ]);
            setBills(billData || []);
            setVendors(vendorData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const filteredBills = bills.filter(b => 
        vendors.find(v => v.id === b.vendor_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Recurring Bills</p>
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
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Recurring Bills</h1>
                            <p className="text-muted-foreground">Automated AP Profiles</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest">
                            <Plus className="h-4 w-4" /> Create Profile
                        </Button>
                    </div>
                </div>

                <PurchasesNav />

                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="SEARCH BY VENDOR..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Frequency</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendor</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Amount</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Next Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredBills.map((rb) => (
                                    <tr key={rb.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-foreground uppercase">{rb.frequency}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{vendors.find(v => v.id === rb.vendor_id)?.name}</td>
                                        <td className="px-6 py-4 text-xs font-black text-right text-foreground">{fmt(Number(rb.total_amount))}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{rb.next_bill_date ? new Date(rb.next_bill_date).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Badge variant="outline" className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border-none", rb.is_active ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500")}>
                                                {rb.is_active ? 'Active' : 'Paused'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBills.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Repeat className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No Recurring Bills Defined</p>
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
