'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getVendors, getPurchaseRequests, createPurchaseOrder } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ChevronLeft, 
    Plus, 
    Trash2, 
    Save, 
    ShoppingCart,
    Store,
    ClipboardList,
    Calculator,
    Hash,
    RefreshCcw,
    FileText,
    Truck,
    Package,
    ShieldCheck,
    Eye,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Vendor, PurchaseRequest } from '@/lib/db/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POPreview } from '@/app/(admin)/admin/purchases/_components/po-preview';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { Skeleton } from '@/components/ui/skeleton';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request_id');
  const { companyProfile } = useTenant();
  const { baseCurrency, taxRate, taxName } = useCompanySettings();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);

  // Form State
  const [poNumber, setPoNumber] = useState(generateRef('PO'));
  const [selectedVendorId, setSelectedVendor] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(requestId || 'none');
  
  // Dynamic Defaults from Settings
  const defaultTaxRate = taxRate;
  const [lines, setLines] = useState([{ description: '', quantity: 1, unit_price: 0, tax_rate: defaultTaxRate }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const selectedVendor = useMemo(() => vendors.find(v => v.id === selectedVendorId) || null, [selectedVendorId, vendors]);

  useEffect(() => {
    if (selectedRequest !== 'none' && requests.length > 0) {
        const req = requests.find(r => r.id === selectedRequest);
        if (req) {
            setLines([{ 
                description: req.item_name, 
                quantity: req.quantity, 
                unit_price: 0, 
                tax_rate: defaultTaxRate 
            }]);
        }
    }
  }, [selectedRequest, requests, defaultTaxRate]);

  const fetchData = async () => {
    try {
      const [v, r] = await Promise.all([getVendors(), getPurchaseRequests()]);
      setVendors(v || []);
      setRequests(r || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load supply chain data');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price: 0, tax_rate: defaultTaxRate }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
    const tax = lines.reduce((acc, line) => acc + (line.quantity * line.unit_price * (line.tax_rate / 100)), 0);
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return toast.error('Vendor selection required');
    if (lines.some(l => !l.description || l.quantity <= 0)) return toast.error('Invalid line item specifications');

    try {
      setSaving(true);
      const payload = {
        po_number: poNumber,
        vendor_id: selectedVendorId,
        purchase_request_id: selectedRequest === 'none' ? null : selectedRequest,
        total_amount: totals.total,
        status: 'approved',
        lines: lines.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.quantity * l.unit_price,
          tax_amount: l.quantity * l.unit_price * (l.tax_rate / 100),
          total_amount: (l.quantity * l.unit_price) * (1 + l.tax_rate / 100)
        }))
      };

      await createPurchaseOrder(payload);
      toast.success('Purchase Order Dispatched');
      router.push('/admin/purchases');
    } catch (e: any) {
      toast.error(e.message || 'Failed to dispatch PO');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <DashboardShell requireAdmin>
        <div className="space-y-6 pb-12 animate-pulse">
            <div className="flex justify-between items-center border-b pb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md bg-muted" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 bg-muted" />
                        <Skeleton className="h-3 w-32 bg-muted" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 bg-muted" />
                    <Skeleton className="h-10 w-40 bg-muted" />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-40 w-full bg-muted rounded-md" />
                <Skeleton className="h-40 md:col-span-2 w-full bg-muted rounded-md" />
            </div>
            <Skeleton className="h-64 w-full bg-muted rounded-md" />
        </div>
    </DashboardShell>
  );

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-6 pb-12">
        {/* Document Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 bg-card -mx-4 px-4 sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10 rounded-md border border-border hover:bg-accent hover:text-accent-foreground"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div className="space-y-0.5">
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Issue Purchase Order</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Procurement System</span>
                        <div className="flex p-0.5 bg-muted rounded-md">
                            <button 
                                onClick={() => setViewMode('edit')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all",
                                    viewMode === 'edit' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-600"
                                )}
                            >
                                <Settings size={10} /> Configuration
                            </button>
                            <button 
                                onClick={() => setViewMode('preview')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all",
                                    viewMode === 'preview' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-zinc-600"
                                )}
                            >
                                <Eye size={10} /> Live Preview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest border-border"
                    onClick={() => router.back()}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    disabled={saving}
                    className="h-10 px-8 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                >
                    {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Confirm & Dispatch PO
                </Button>
            </div>
        </div>

        {viewMode === 'edit' ? (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Identification */}
                    <Card className="border border-border shadow-sm rounded-md bg-card">
                        <CardHeader className="border-b bg-muted/50 py-3">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Hash size={14} className="text-primary" /> Document Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">PO Control Number</Label>
                                <Input 
                                    value={poNumber} 
                                    onChange={(e) => setPoNumber(e.target.value)}
                                    className="h-10 border-border font-mono font-bold uppercase text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Linked Requisition</Label>
                                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                                    <SelectTrigger className="h-10 border-border text-xs font-bold uppercase">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-xs font-bold uppercase">Direct / No MR Link</SelectItem>
                                        {requests.map(r => (
                                            <SelectItem key={r.id} value={r.id} className="text-xs font-bold uppercase">
                                                MR-{r.id.slice(0, 4).toUpperCase()}: {r.item_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supplier Hub */}
                    <Card className="md:col-span-2 border border-border shadow-sm rounded-md bg-card">
                        <CardHeader className="border-b bg-muted/50 py-3">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Store size={14} className="text-primary" /> Supplier Selection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Target Vendor Entity</Label>
                                    <Select value={selectedVendorId} onValueChange={setSelectedVendor}>
                                        <SelectTrigger className="h-10 border-border text-xs font-bold uppercase">
                                            <SelectValue placeholder="Select Supplier..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vendors.map(v => (
                                                <SelectItem key={v.id} value={v.id} className="text-xs font-bold uppercase">{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center p-4 bg-muted rounded-md border border-border">
                                    <div className="h-8 w-8 rounded bg-zinc-200 flex items-center justify-center text-muted-foreground mr-3">
                                        <Truck size={16} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-muted-foreground">Logistics Mode</p>
                                        <p className="text-[10px] font-bold text-foreground uppercase">Standard Delivery</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Material Grid */}
                <Card className="border border-border shadow-sm rounded-md bg-card overflow-hidden">
                    <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Procurement Items</CardTitle>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Line items for this purchase order</p>
                        </div>
                        <Button type="button" onClick={addLine} variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5">
                            <Plus className="mr-1.5 h-3 w-3" /> Add Material
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Description</th>
                                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-24">Qty</th>
                                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-32">Price ({baseCurrency})</th>
                                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-24">Tax%</th>
                                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-32 text-right">Total</th>
                                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-16 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {lines.map((line, idx) => (
                                        <tr key={idx} className="group hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <Input 
                                                    placeholder="Material description..."
                                                    value={line.description}
                                                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                                                    className="h-9 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 bg-transparent font-bold text-xs uppercase"
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <Input 
                                                    type="number"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value))}
                                                    className="h-9 border-border text-xs font-bold text-center"
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <Input 
                                                    type="number"
                                                    value={line.unit_price}
                                                    onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value))}
                                                    className="h-9 border-border text-xs font-bold"
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <Input 
                                                    type="number"
                                                    value={line.tax_rate}
                                                    onChange={(e) => updateLine(idx, 'tax_rate', parseFloat(e.target.value))}
                                                    className="h-9 border-border text-xs font-bold"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-xs font-black text-foreground">
                                                    {formatCurrency(line.quantity * line.unit_price, baseCurrency)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => removeLine(idx)}
                                                    className="h-8 w-8 text-muted-foreground/60 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 bg-muted/30 border-t border-border">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Technical Instructions</Label>
                                <textarea 
                                    className="w-full rounded-md p-4 bg-card border border-border shadow-sm min-h-[120px] outline-none text-xs font-medium resize-none focus:ring-1 focus:ring-primary/20 uppercase"
                                    placeholder="Specify delivery timelines, QC requirements or site contact details..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2 border-b border-border pb-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                                        <span className="font-black text-foreground">{formatCurrency(totals.subtotal, baseCurrency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-widest">{taxName} (Calculated)</span>
                                        <span className="font-black text-foreground">{formatCurrency(totals.tax, baseCurrency)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-foreground text-card-foreground p-6 rounded-md shadow-xl shadow-zinc-200">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">Order Commitment</p>
                                        <p className="text-2xl font-black tracking-tighter">{formatCurrency(totals.total, baseCurrency)}</p>
                                    </div>
                                    <ShieldCheck className="h-8 w-8 text-primary opacity-50" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>
        ) : (
            <div className="animate-in zoom-in-95 duration-300 py-10 bg-muted rounded-md border-2 border-dashed border-border">
                <POPreview 
                    data={{
                        po_number: poNumber,
                        vendor_name: selectedVendor?.name,
                        vendor_address: selectedVendor?.address,
                        vendor_email: selectedVendor?.email,
                        items: lines,
                        subtotal: totals.subtotal,
                        tax_amount: totals.tax,
                        total_amount: totals.total,
                        notes: notes
                    }}
                />
            </div>
        )}
      </div>
    </DashboardShell>
  );
}
