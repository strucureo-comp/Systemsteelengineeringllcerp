'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendorBills, createVendorPayment } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Save, RefreshCcw, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { VendorBill } from '@/lib/db/types';

export default function NewPaymentPage() {
  const router = useRouter();
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedBillId, setSelectedBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('Bank Transfer');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getVendorBills();
      // Filter for unpaid bills
      setBills(data.filter((b: any) => b.status !== 'paid') || []);
    } catch (e) {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleBillSelect = (billId: string) => {
    setSelectedBillId(billId);
    const bill = bills.find(b => b.id === billId);
    if (bill) {
        // Calculate remaining amount logic could go here if we tracked partial payments in frontend, 
        // for now defaulting to total_amount assuming 'pending' bills are fully unpaid or we just pay full.
        // Ideally the API should return 'amount_due'.
        setAmount(String(bill.total_amount || bill.amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillId) return toast.error('Please select a bill');
    if (!amount || parseFloat(amount) <= 0) return toast.error('Invalid amount');

    try {
        setSubmitting(true);
        await createVendorPayment({
            vendor_bill_id: selectedBillId,
            amount: parseFloat(amount),
            payment_date: date,
            payment_method: method,
            reference_no: ref,
            notes
        });
        toast.success('Payment recorded successfully');
        router.push('/admin/purchases');
    } catch (e: any) {
        toast.error(e.message || 'Failed to record payment');
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center font-bold">Loading...</div>;

  return (
    <DashboardShell requireAdmin>
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
            <div className="flex items-center justify-between">
                <Button 
                    variant="ghost" 
                    className="rounded-xl font-bold text-muted-foreground hover:text-slate-900"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="mr-2 h-5 w-5" /> Cancel
                </Button>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Record Vendor Payment</h1>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-card overflow-hidden">
                <CardHeader className="p-8 pb-6 bg-slate-50/50 border-b-2 border-border">
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                        <DollarSign size={24} className="text-emerald-600" /> Payment Details
                    </CardTitle>
                    <CardDescription className="font-bold text-muted-foreground">
                        Pay an outstanding vendor bill
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground ml-1">Select Bill to Pay</Label>
                            <select 
                                className="w-full h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none px-4 bg-card"
                                value={selectedBillId}
                                onChange={(e) => handleBillSelect(e.target.value)}
                                required
                            >
                                <option value="">Select a bill...</option>
                                {bills.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.bill_number} - {b.vendor?.name} (${Number(b.total_amount).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">Amount ($)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none text-lg"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">Payment Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <Input 
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="h-12 pl-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">Payment Method</Label>
                                <select 
                                    className="w-full h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none px-4 bg-card"
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                >
                                    <option>Bank Transfer</option>
                                    <option>Check</option>
                                    <option>Credit Card</option>
                                    <option>Cash</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">Reference No.</Label>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <Input 
                                        value={ref}
                                        onChange={(e) => setRef(e.target.value)}
                                        placeholder="Check # / Transaction ID"
                                        className="h-12 pl-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground ml-1">Notes</Label>
                            <Input 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-lg font-black shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-transform"
                        >
                            {submitting ? <RefreshCcw className="animate-spin mr-2" /> : <Save className="mr-2" />}
                            Confirm Payment
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    </DashboardShell>
  );
}
