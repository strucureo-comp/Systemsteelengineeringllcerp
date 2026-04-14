'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendors, createRFQ } from '@/lib/api';
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
    Layers,
    Store,
    RefreshCcw,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import type { Vendor } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

export default function NewRFQPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [rfqNumber, setRfqNumber] = useState(generateRef('RFQ'));
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [items, setItems] = useState([{ description: '', quantity: 1, unit: 'pcs' }]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const v = await getVendors();
      setVendors(v || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'pcs' }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev => 
        prev.includes(vendorId) 
            ? prev.filter(id => id !== vendorId) 
            : [...prev, vendorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendors.length === 0) return toast.error('Select at least one vendor');
    if (items.some(i => !i.description)) return toast.error('Item descriptions required');

    try {
      setSaving(true);
      const payload = {
        rfq_number: rfqNumber,
        vendors: selectedVendors,
        items,
        expiry_date: expiryDate,
        notes,
        status: 'sent'
      };

      await createRFQ(payload);
      toast.success('RFQ Dispatched to Vendors');
      router.push('/admin/purchases/rfqs');
    } catch (e: any) {
      toast.error(e.message || 'Failed to dispatch RFQ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <DashboardShell requireAdmin>
        <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-pulse">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 bg-muted" />
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
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">New Request for Quotation</h1>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">Sourcing Document</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.back()} className="h-10 font-bold uppercase text-[10px] tracking-widest">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg">
                    {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Dispatch RFQ
                </Button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border border-border shadow-sm bg-card">
                    <CardHeader className="border-b bg-muted/50 py-3">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">RFQ Number</Label>
                            <Input value={rfqNumber} onChange={(e) => setRfqNumber(e.target.value)} className="h-10 font-mono font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Expiry Date</Label>
                            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-10 font-bold" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border border-border shadow-sm bg-card">
                    <CardHeader className="border-b bg-muted/50 py-3">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Store size={14} className="text-primary" /> Vendor Shortlist
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {vendors.map(v => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => toggleVendor(v.id)}
                                    className={cn(
                                        "px-3 py-2 rounded-md text-[10px] font-bold uppercase border text-left transition-all",
                                        selectedVendors.includes(v.id)
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                                    )}
                                >
                                    {v.name}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-border shadow-sm bg-card overflow-hidden">
                <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Requested Items</CardTitle>
                    <Button type="button" onClick={addItem} variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary">
                        <Plus className="mr-1.5 h-3 w-3" /> Add Item
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Description</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-32">Qty</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-32">Unit</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-16 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {items.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-3">
                                        <Input 
                                            placeholder="Specify requirements..."
                                            value={item.description}
                                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            className="h-9 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 bg-transparent font-bold text-xs uppercase"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <Input 
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                                            className="h-9 border-border text-xs font-bold text-center"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <Select value={item.unit} onValueChange={(v) => updateItem(idx, 'unit', v)}>
                                            <SelectTrigger className="h-9 border-border text-[10px] font-bold uppercase">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pcs" className="text-xs font-bold uppercase">Pieces (pcs)</SelectItem>
                                                <SelectItem value="kg" className="text-xs font-bold uppercase">Kilograms (kg)</SelectItem>
                                                <SelectItem value="mtr" className="text-xs font-bold uppercase">Meters (mtr)</SelectItem>
                                                <SelectItem value="box" className="text-xs font-bold uppercase">Boxes (box)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => removeItem(idx)}
                                            className="h-8 w-8 text-muted-foreground/60 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-6 bg-muted/30 border-t border-border">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Additional Terms & Notes</Label>
                        <textarea 
                            className="w-full mt-2 rounded-md p-4 bg-card border border-border shadow-sm min-h-[100px] outline-none text-xs font-medium uppercase resize-none focus:ring-1 focus:ring-primary/20"
                            placeholder="Specify QA standards, lead time expectations or delivery terms..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </form>
      </div>
    </DashboardShell>
  );
}
