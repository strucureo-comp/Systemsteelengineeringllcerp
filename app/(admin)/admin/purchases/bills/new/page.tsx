'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPurchaseOrders, getVendors, createVendorBill, getPurchaseOrder, getGRNs } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    Save,
    RefreshCcw,
    Receipt,
    Calculator,
    FileText,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    UploadCloud
} from 'lucide-react';
import { toast } from 'sonner';
import type { PurchaseOrder, Vendor, GRN } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

export default function NewVendorBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get('po_id');
  const { baseCurrency } = useCompanySettings();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // Form State
  const [billNumber, setBillNumber] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedPo, setSelectedPo] = useState(poId || 'none');
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<any[]>([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);

  useEffect(() => {
    fetchData();
  }, []);

  // Effect to load PO and GRN details when selected
  useEffect(() => {
    if (selectedPo && selectedPo !== 'none') {
        loadPoAndGrnDetails(selectedPo);
    }
  }, [selectedPo]);

  const fetchData = async () => {
    try {
      const [v, o] = await Promise.all([getVendors(), getPurchaseOrders()]);
      setVendors(v || []);
      setOrders(o?.filter((order: any) => ['approved', 'ordered', 'received'].includes(order.status)) || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPoAndGrnDetails = async (id: string) => {
      try {
          setLoading(true);
          const [po, allGrns] = await Promise.all([
              getPurchaseOrder(id),
              getGRNs()
          ]);

          if (po) {
              setSelectedVendor(po.vendor_id);
              // Filter GRNs for this PO
              const relevantGrns = allGrns.filter((g: any) => g.purchase_order_id === id);
              setGrns(relevantGrns);

              if (po.lines && po.lines.length > 0) {
                  setLines(po.lines.map((l: any) => {
                      // Calculate total received for this item across GRNs
                      const received = relevantGrns.reduce((sum: number, g: any) => {
                          const item = g.items?.find((i: any) => i.description === l.description || i.item_id === l.item_id);
                          return sum + (item?.quantity_received || 0);
                      }, 0);

                      return {
                          description: l.description,
                          quantity: l.quantity,
                          unit_price: l.unit_price,
                          tax_rate: 0,
                          po_quantity: l.quantity,
                          received_quantity: received
                      };
                  }));
              }
          }
      } catch (e) {
          toast.error('Failed to load document chain');
      } finally {
          setLoading(false);
      }
  };

  const simulateOCR = () => {
      setIsOcrLoading(true);
      toast.info('Analyzing document structure...');

      setTimeout(() => {
          setBillNumber(generateRef('BILL'));
          setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
          toast.success('OCR Capture Complete: Vendor invoice data extracted');
          setIsOcrLoading(false);
      }, 2000);
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
    const tax = lines.reduce((acc, line) => acc + (line.quantity * line.unit_price * (line.tax_rate / 100)), 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const matchingStatus = useMemo(() => {
      if (selectedPo === 'none') return 'direct';

      const hasOverbilling = lines.some(l => l.received_quantity !== undefined && l.quantity > l.received_quantity);
      const noGrn = grns.length === 0;

      if (noGrn) return 'no_grn';
      if (hasOverbilling) return 'mismatch';
      return 'matched';
  }, [lines, selectedPo, grns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber) return toast.error('Bill Number is required');
    if (!selectedVendor) return toast.error('Vendor is required');
    if (!dueDate) return toast.error('Due Date is required');

    if (matchingStatus === 'mismatch') {
        return toast.error('3-Way Match Failed: Cannot bill more than received quantity');
    }
    if (matchingStatus === 'no_grn' && selectedPo !== 'none') {
        return toast.error('3-Way Match Failed: No Goods Receipt found for this PO');
    }

    try {
      setSubmitting(true);
      await createVendorBill({
        bill_number: billNumber,
        purchase_order_id: selectedPo === 'none' ? null : selectedPo,
        vendor_id: selectedVendor,
        due_date: dueDate,
        amount: totals.subtotal,
        tax_amount: totals.tax,
        total_amount: totals.total,
        status: 'pending',
        lines: lines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            amount: l.quantity * l.unit_price,
            tax_amount: l.quantity * l.unit_price * (l.tax_rate / 100),
            total_amount: (l.quantity * l.unit_price) * (1 + l.tax_rate / 100)
        }))
      });
      toast.success('Bill created and pending approval');
      router.push('/admin/purchases/bills');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !vendors.length) return (
    <DashboardShell requireAdmin>
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-pulse">
            <div className="flex justify-between items-center border-b pb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md bg-muted" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 bg-muted" />
                        <Skeleton className="h-3 w-32 bg-muted" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32 bg-muted" />
                    <Skeleton className="h-10 w-40 bg-muted" />
                </div>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
                <Skeleton className="h-48 w-full bg-muted rounded-md" />
                <Skeleton className="h-48 md:col-span-2 w-full bg-muted rounded-md" />
            </div>
            <Skeleton className="h-64 w-full bg-muted rounded-md" />
        </div>
    </DashboardShell>
  );

  return (
    <DashboardShell requireAdmin>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="flex items-center justify-between border-b pb-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Record Vendor Bill</h1>
                    <p className="text-muted-foreground">3-Way Match Validation Active</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={simulateOCR} disabled={isOcrLoading} className="h-10 gap-2 font-bold uppercase text-[10px]">
                    {isOcrLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Auto-Scan Bill
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="h-10 px-8 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg"
                >
                    {submitting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Finalize Bill
                </Button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-8 md:grid-cols-3">
                <Card className="border border-border shadow-sm bg-card p-6">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Receipt size={14} className="text-primary" /> Bill Identity
                        </CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Vendor Invoice No.</Label>
                            <Input
                                value={billNumber}
                                onChange={(e) => setBillNumber(e.target.value)}
                                className="h-10 font-bold"
                                placeholder="INV-0000"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Due Date</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="h-10 font-bold"
                                required
                            />
                        </div>
                    </div>
                </Card>

                <Card className="md:col-span-2 border border-border shadow-sm bg-card p-6">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck size={14} className="text-primary" /> 3-Way Matching Context
                        </CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Source Purchase Order</Label>
                            <select
                                className="w-full h-10 rounded-md border border-border bg-card text-xs font-bold uppercase px-3"
                                value={selectedPo}
                                onChange={(e) => setSelectedPo(e.target.value)}
                            >
                                <option value="none">DIRECT BILL (NO PO)</option>
                                {orders.map(o => (
                                    <option key={o.id} value={o.id}>{o.po_number} - {vendors.find(v => v.id === o.vendor_id)?.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={cn(
                            "flex items-center p-4 rounded-md border",
                            matchingStatus === 'matched' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                            matchingStatus === 'mismatch' ? "bg-rose-50 border-rose-100 text-rose-700" :
                            matchingStatus === 'no_grn' ? "bg-amber-50 border-amber-100 text-amber-700" :
                            "bg-muted border-border text-muted-foreground"
                        )}>
                            <div className="mr-3">
                                {matchingStatus === 'matched' && <CheckCircle2 size={20} />}
                                {matchingStatus === 'mismatch' && <AlertCircle size={20} />}
                                {matchingStatus === 'no_grn' && <AlertCircle size={20} />}
                                {matchingStatus === 'direct' && <ShieldCheck size={20} />}
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold">Validation Status</p>
                                <p className="text-[10px] font-bold uppercase">
                                    {matchingStatus === 'matched' && "3-Way Match Verified"}
                                    {matchingStatus === 'mismatch' && "Quantity Mismatch Detected"}
                                    {matchingStatus === 'no_grn' && "Missing Goods Receipt"}
                                    {matchingStatus === 'direct' && "Non-PO Expenditure"}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="border border-border shadow-sm bg-card overflow-hidden">
                <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b bg-muted/30">
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Bill Line Items</CardTitle>
                    <Button type="button" onClick={addLine} variant="outline" className="h-8 text-[9px] font-black uppercase">
                        Add Line
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase text-muted-foreground">
                            <tr>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 w-24">Qty</th>
                                <th className="px-6 py-3 w-24">Price</th>
                                <th className="px-6 py-3 w-32">Status</th>
                                <th className="px-6 py-3 w-32 text-right">Total</th>
                                <th className="px-6 py-3 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {lines.map((line, idx) => (
                                <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-3">
                                        <Input
                                            value={line.description}
                                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                                            className="h-9 border-none shadow-none font-bold text-xs uppercase"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <Input
                                            type="number"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value))}
                                            className="h-9 font-bold text-xs"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <Input
                                            type="number"
                                            value={line.unit_price}
                                            onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value))}
                                            className="h-9 font-bold text-xs"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        {line.received_quantity !== undefined ? (
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className={cn(
                                                    "text-xs font-semibold border-none px-1.5",
                                                    line.quantity <= line.received_quantity ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    Rec: {line.received_quantity}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs font-semibold border-none px-1.5 bg-zinc-100">
                                                    PO: {line.po_quantity}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-right text-xs font-black">
                                        {(line.quantity * line.unit_price).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-rose-500">
                                            <RefreshCcw size={14} className="rotate-45" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="p-8 border-t bg-muted/10 flex justify-end">
                        <div className="w-72 space-y-3">
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                <span>Subtotal</span>
                                <span>{formatCurrency(totals.subtotal, baseCurrency)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                <span>Tax (0%)</span>
                                <span>{formatCurrency(totals.tax, baseCurrency)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-black text-foreground pt-3 border-t border-border">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(totals.total, baseCurrency)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </form>
      </div>
    </DashboardShell>
  );
}
