'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendorBills, getVendors, submitVendorBill, approveVendorBill, rejectVendorBill } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Receipt,
    Plus,
    Search,
    RefreshCcw,
    ChevronRight,
    ChevronLeft,
    Send,
    Check,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import type { VendorBill, Vendor } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { PurchasesNav } from '../_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

export default function VendorBillsPage() {
    const router = useRouter();
    const { baseCurrency } = useCompanySettings();
    const [bills, setBills] = useState<VendorBill[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, [baseCurrency]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [billData, vendorData] = await Promise.all([
                getVendorBills(),
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

    const handleSubmit = async (bill: VendorBill) => {
        const result = await submitVendorBill(bill.id);
        if (result) {
            toast.success('Bill submitted for approval');
            await fetchData();
        } else {
            toast.error('Failed to submit bill');
        }
    };

    const handleApprove = async (bill: VendorBill) => {
        const result = await approveVendorBill(bill.id);
        if (result) {
            toast.success('Bill approved');
            await fetchData();
        } else {
            toast.error('Failed to approve bill');
        }
    };

    const handleReject = async (bill: VendorBill) => {
        const reason = window.prompt(`Rejection reason for ${bill.bill_number}`) || '';
        if (!reason) return;
        const result = await rejectVendorBill(bill.id, reason);
        if (result) {
            toast.success('Bill rejected');
            await fetchData();
        } else {
            toast.error('Failed to reject bill');
        }
    };

    const filteredBills = bills.filter(b => 
        b.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendors.find(v => v.id === b.vendor_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Vendor Bills</p>
            </div>
        </DashboardShell>
    );

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="purchases">
                <div className="space-y-6 max-w-4xl pb-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/admin/purchases')}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Vendor Bills</h1>
                                <p className="text-sm text-muted-foreground mt-2">Accounts Payable Ledger</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-sm" onClick={() => router.push('/admin/purchases/bills/new')}>
                                <Plus className="h-4 w-4" /> Record New Bill
                            </Button>
                        </div>
                    </div>

                <PurchasesNav />

                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="SEARCH BY BILL NUMBER OR VENDOR..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Bill Number</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendor</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Amount</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredBills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-foreground uppercase">{bill.bill_number}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{vendors.find(v => v.id === bill.vendor_id)?.name}</td>
                                        <td className="px-6 py-4 text-xs font-black text-right text-foreground">{fmt(Number(bill.total_amount))}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{new Date(bill.due_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-xs">
                                            <Badge variant="outline" className="text-[10px] border-none bg-muted text-muted-foreground">{bill.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {bill.status === 'draft' && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-blue-600" onClick={() => handleSubmit(bill)} title="Submit for Approval">
                                                        <Send size={16} />
                                                    </Button>
                                                )}
                                                {bill.status === 'pending_approval' && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-emerald-600" onClick={() => handleApprove(bill)} title="Approve">
                                                            <Check size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-rose-600" onClick={() => handleReject(bill)} title="Reject">
                                                            <X size={16} />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-primary">
                                                    <ChevronRight size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBills.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Receipt className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No Vendor Bills Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}
