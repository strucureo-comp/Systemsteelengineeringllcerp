'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecurringExpenses } from '@/lib/api';
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
import type { RecurringExpense } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { PurchasesNav } from '../../_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function RecurringExpensesPage() {
    const router = useRouter();
    const { baseCurrency } = useCompanySettings();
    const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
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
            const data = await getRecurringExpenses();
            setExpenses(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const filteredExpenses = expenses.filter(e => 
        e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Recurring Expenses</p>
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
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Recurring Expenses</h1>
                            <p className="text-muted-foreground">Automated Spending Profiles</p>
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
                            placeholder="SEARCH BY CATEGORY OR DESCRIPTION..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Category</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Amount</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Next Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredExpenses.map((re) => (
                                    <tr key={re.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-foreground uppercase">{re.frequency}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{re.category}</td>
                                        <td className="px-6 py-4 text-xs font-black text-right text-foreground">{fmt(Number(re.amount))}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{re.next_date ? new Date(re.next_date).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Badge variant="outline" className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border-none", re.is_active ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500")}>
                                                {re.is_active ? 'Active' : 'Paused'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Repeat className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No Recurring Expenses Defined</p>
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
