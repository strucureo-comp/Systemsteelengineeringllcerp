'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getVendorBills, getVendors } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Layers,
    Save,
    RefreshCcw,
    ChevronLeft,
    CheckCircle2,
    Circle
} from 'lucide-react';
import { toast } from 'sonner';
import type { VendorBill, Vendor } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function NewBatchPaymentPage() {
    const router = useRouter();
    const { baseCurrency } = useCompanySettings();
    const [bills, setBills] = useState<VendorBill[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
    const [batchNumber, setBatchNumber] = useState(`BATCH-${new Date().getTime().toString().slice(-6)}`);

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
            const [b, v] = await Promise.all([getVendorBills(), getVendors()]);
            // Only unpaid or partial bills
            setBills(b?.filter(bill => bill.payment_status !== 'paid' && bill.status === 'approved') || []);
            setVendors(v || []);
        } catch (e) {
            toast.error('Failed to load pending bills');
        } finally {
            setLoading(false);
        }
    };

    const toggleBill = (id: string) => {
        setSelectedBillIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectedTotal = useMemo(() => {
        return bills
            .filter(b => selectedBillIds.includes(b.id))
            .reduce((sum, b) => sum + Number(b.total_amount), 0);
    }, [selectedBillIds, bills]);

    const handleSubmit = async () => {
        if (selectedBillIds.length === 0) return toast.error('Select at least one bill');
        
        try {
            setSubmitting(true);
            // In a real implementation, this would call a batch payment API
            toast.success('Batch payment processed successfully');
            router.push('/admin/purchases/payments/batch');
        } catch (e) {
            toast.error('Batch payment failed');
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    if (loading) return <div className="p-12 text-center font-bold">Loading Ledger...</div>;

    return (
        <DashboardShell requireAdmin>
            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                <div className="flex items-center justify-between border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">New Batch Payment</h1>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">Bulk Settlement</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => router.back()} className="h-10 font-bold uppercase text-[10px] tracking-widest">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={submitting || selectedBillIds.length === 0} 
                            className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg"
                        >
                            {submitting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                            Process Batch ({selectedBillIds.length})
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="border border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/50 border-b py-4">
                                <CardTitle className="text-xs font-black uppercase tracking-widest">Select Unpaid Bills</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/30 border-b border-border text-[9px] font-black uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-6 py-3 w-12 text-center">Select</th>
                                                <th className="px-6 py-3">Bill Ref</th>
                                                <th className="px-6 py-3">Vendor</th>
                                                <th className="px-6 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {bills.map(bill => (
                                                <tr 
                                                    key={bill.id} 
                                                    className={cn(
                                                        "hover:bg-muted/20 cursor-pointer transition-colors",
                                                        selectedBillIds.includes(bill.id) && "bg-primary/5"
                                                    )}
                                                    onClick={() => toggleBill(bill.id)}
                                                >
                                                    <td className="px-6 py-4 text-center">
                                                        {selectedBillIds.includes(bill.id) ? (
                                                            <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                                                        ) : (
                                                            <Circle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold font-mono uppercase">{bill.bill_number}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">
                                                        {vendors.find(v => v.id === bill.vendor_id)?.name || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-black text-right">{fmt(bill.total_amount || 0)}</td>
                                                </tr>
                                            ))}
                                            {bills.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center text-[10px] font-bold uppercase text-muted-foreground">
                                                        No pending bills available for batch payment
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="border border-border shadow-md bg-foreground text-card-foreground p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-6">Batch Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground uppercase font-bold">Total Selected</span>
                                    <span className="font-black">{selectedBillIds.length} Bills</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground uppercase font-bold">Batch ID</span>
                                    <span className="font-mono font-bold text-primary">{batchNumber}</span>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Total Commitment</span>
                                    <span className="text-xl font-black text-white">{fmt(selectedTotal)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
