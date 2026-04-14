'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getVendors, getVendorBills } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ChevronLeft, 
    Plus, 
    Trash2, 
    Save, 
    FileText,
    Store,
    RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import type { Vendor, VendorBill } from '@/lib/db/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewVendorCreditPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [creditNumber, setCreditNumber] = useState(`DR-${new Date().getTime().toString().slice(-6)}`);
  const [selectedVendorId, setSelectedVendor] = useState('');
  const [selectedBillId, setSelectedBill] = useState('none');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [v, b] = await Promise.all([getVendors(), getVendorBills()]);
      setVendors(v || []);
      setBills(b || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = useMemo(() => 
    bills.filter(b => b.vendor_id === selectedVendorId),
    [bills, selectedVendorId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return toast.error('Vendor is required');
    if (amount <= 0) return toast.error('Amount must be greater than 0');

    try {
      setSaving(true);
      // API call placeholder
      toast.success('Vendor Credit / Debit Note recorded');
      router.push('/admin/purchases/vendor-credits');
    } catch (e: any) {
      toast.error('Failed to record credit');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center font-bold">Loading...</div>;

  return (
    <DashboardShell requireAdmin>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Record Vendor Credit</h1>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">Debit Note Entry</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.back()} className="h-10 font-bold uppercase text-[10px] tracking-widest">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg">
                    {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Credit
                </Button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border border-border shadow-sm bg-card">
                <CardHeader className="border-b bg-muted/50 py-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credit Specification</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Credit Number</Label>
                            <Input value={creditNumber} onChange={(e) => setCreditNumber(e.target.value)} className="h-10 font-mono font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Select Vendor</Label>
                            <Select value={selectedVendorId} onValueChange={setSelectedVendor}>
                                <SelectTrigger className="h-10 border-border text-xs font-bold uppercase">
                                    <SelectValue placeholder="CHOOSE VENDOR..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map(v => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs font-bold uppercase">{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Link Original Bill (Optional)</Label>
                        <Select value={selectedBillId} onValueChange={setSelectedBill} disabled={!selectedVendorId}>
                            <SelectTrigger className="h-10 border-border text-xs font-bold uppercase">
                                <SelectValue placeholder="CHOOSE BILL..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-xs font-bold uppercase">No Link / General Credit</SelectItem>
                                {filteredBills.map(b => (
                                    <SelectItem key={b.id} value={b.id} className="text-xs font-bold uppercase">{b.bill_number} - {new Date(b.created_at).toLocaleDateString()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Credit Amount (AED)</Label>
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(parseFloat(e.target.value))} 
                                className="h-10 font-black text-lg text-primary" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Reason for Credit</Label>
                            <Input 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)} 
                                placeholder="e.g. Returned Goods, Price Adjustment"
                                className="h-10 text-xs font-bold uppercase" 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </form>
      </div>
    </DashboardShell>
  );
}
