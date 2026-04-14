'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPurchaseOrder, getWarehouses, getProducts, createGRN } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ChevronLeft, 
    Save, 
    Truck,
    Package,
    MapPin,
    AlertCircle,
    CheckCircle2,
    RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { PurchaseOrder, Warehouse, Product } from '@/lib/db/types';
import { Skeleton } from '@/components/ui/skeleton';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

export default function NewGRNPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get('po_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [grnNumber, setGrnNumber] = useState(generateRef('GRN'));
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Line items state for receiving
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    if (!poId) {
      toast.error('No Purchase Order specified');
      router.push('/admin/purchases');
      return;
    }
    fetchData();
  }, [poId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poData, warehouseData, productData] = await Promise.all([
        getPurchaseOrder(poId!),
        getWarehouses(),
        getProducts()
      ]);

      if (!poData) {
        toast.error('Purchase Order not found');
        router.push('/admin/purchases');
        return;
      }

      setPo(poData);
      setWarehouses(warehouseData || []);
      setProducts(productData || []);

      // Initialize lines based on PO lines
      // Try to auto-match product variant by name
      const initialLines = (poData as any).lines?.map((line: any) => {
        // Simple matching logic: find a variant whose name or parent product name includes the description
        const matchedProduct = (productData as any[]).find((p: any) => 
            p.name.toLowerCase().includes(line.description.toLowerCase()) || 
            p.variants?.some((v: any) => v.name.toLowerCase().includes(line.description.toLowerCase()))
        );
        const matchedVariant = matchedProduct?.variants?.[0]?.id || ''; // Default to first variant if product found

        return {
            ...line,
            received_qty: line.quantity, // Default to full receipt
            variant_id: matchedVariant,
            location_id: '' // User must select
        };
      }) || [];

      setLines(initialLines);

    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const invalidLines = lines.filter(l => l.received_qty > 0 && (!l.variant_id || !l.location_id));
    if (invalidLines.length > 0) {
        toast.error(`Please select Item and Location for all received lines.`);
        return;
    }

    try {
        setSubmitting(true);
        const payload = {
            grn_number: grnNumber,
            purchase_order_id: poId,
            received_date: receivedDate,
            notes,
            lines: lines.filter(l => l.received_qty > 0).map(l => ({
                variant_id: l.variant_id,
                quantity: l.received_qty,
                location_id: l.location_id
            }))
        };

        await createGRN(payload);
        toast.success('Goods Received Note created successfully');
        router.push('/admin/purchases');
    } catch (e: any) {
        console.error(e);
        toast.error(e.message || 'Failed to create GRN');
    } finally {
        setSubmitting(false);
    }
  };

  // Flatten variants for dropdown
  const allVariants = useMemo(() => {
    const vars: any[] = [];
    products.forEach(p => {
        p.variants?.forEach(v => {
            vars.push({
                id: v.id,
                name: `${p.name} - ${v.sku} (${v.name !== p.name ? v.name : 'Standard'})`
            });
        });
    });
    return vars;
  }, [products]);

  // Flatten locations for dropdown
  const allLocations = useMemo(() => {
    const locs: any[] = [];
    warehouses.forEach(w => {
        w.locations?.forEach(l => {
            locs.push({
                id: l.id,
                name: `${w.code} - ${l.code} (${l.name || 'Standard'})`
            });
        });
    });
    return locs;
  }, [warehouses]);

  if (loading) return (
    <DashboardShell requireAdmin>
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-pulse">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-32 rounded-xl bg-muted" />
                <Skeleton className="h-10 w-64 bg-muted" />
            </div>
            <div className="grid gap-8 md:grid-cols-2">
                <Skeleton className="h-64 w-full bg-muted rounded-[2.5rem]" />
                <Skeleton className="h-64 w-full bg-muted rounded-[2.5rem]" />
            </div>
            <Skeleton className="h-96 w-full bg-muted rounded-[2.5rem]" />
        </div>
    </DashboardShell>
  );

  return (
    <DashboardShell requireAdmin>
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex items-center justify-between">
                <Button 
                    variant="ghost" 
                    className="rounded-xl font-bold text-muted-foreground hover:text-slate-900"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="mr-2 h-5 w-5" /> Cancel
                </Button>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Receive Goods (GRN)</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid gap-8 md:grid-cols-2">
                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                        <CardHeader className="p-0 pb-6">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Truck size={20} className="text-primary" /> Receipt Details
                            </CardTitle>
                        </CardHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">GRN Number</Label>
                                <Input 
                                    value={grnNumber}
                                    onChange={(e) => setGrnNumber(e.target.value)}
                                    className="h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">Received Date</Label>
                                <Input 
                                    type="date"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                    className="h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-muted-foreground ml-1">Notes</Label>
                                <Input 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Carrier, tracking no, etc."
                                    className="h-12 rounded-2xl border-2 border-border font-bold focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                        <CardHeader className="p-0 pb-6">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-500" /> Source PO Info
                            </CardTitle>
                        </CardHeader>
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-muted border border-border">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Purchase Order</p>
                                <p className="text-lg font-black text-foreground">{po?.po_number}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted border border-border">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Vendor</p>
                                <p className="text-lg font-black text-foreground">{po?.vendor?.name}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-2xl font-black">Items to Receive</CardTitle>
                        <CardDescription className="font-bold text-muted-foreground">Match PO lines to Inventory Items and Locations</CardDescription>
                    </CardHeader>
                    <div className="p-8 pt-4 space-y-6">
                        {lines.map((line, idx) => (
                            <div key={idx} className="p-6 rounded-3xl bg-muted border-2 border-border space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-black text-foreground text-lg">{line.description}</p>
                                        <p className="text-sm font-bold text-muted-foreground">Ordered: {line.quantity} units</p>
                                    </div>
                                    <div className="w-32">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Received Qty</Label>
                                        <Input 
                                            type="number" 
                                            value={line.received_qty}
                                            onChange={(e) => updateLine(idx, 'received_qty', parseFloat(e.target.value))}
                                            className="h-11 rounded-xl border-emerald-200 bg-card font-bold"
                                        />
                                    </div>
                                </div>

                                {line.received_qty > 0 && (
                                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                                                <Package size={14} /> Inventory Item (Variant)
                                            </Label>
                                            <select 
                                                className="w-full h-11 rounded-xl border-2 border-border px-3 font-bold text-sm bg-card focus:border-primary outline-none"
                                                value={line.variant_id}
                                                onChange={(e) => updateLine(idx, 'variant_id', e.target.value)}
                                            >
                                                <option value="">Select Product Variant...</option>
                                                {allVariants.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                                                <MapPin size={14} /> Target Location
                                            </Label>
                                            <select 
                                                className="w-full h-11 rounded-xl border-2 border-border px-3 font-bold text-sm bg-card focus:border-primary outline-none"
                                                value={line.location_id}
                                                onChange={(e) => updateLine(idx, 'location_id', e.target.value)}
                                            >
                                                <option value="">Select Warehouse Location...</option>
                                                {allLocations.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {allLocations.length === 0 && (
                            <div className="p-4 rounded-xl bg-amber-50 text-amber-800 font-bold flex items-center gap-2">
                                <AlertCircle size={20} />
                                Warning: No warehouse locations found. Please create a warehouse in SCM module first.
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={submitting}
                                className="h-14 px-8 rounded-2xl bg-primary text-lg font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                            >
                                {submitting ? <RefreshCcw className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                Confirm Receipt & Update Inventory
                            </Button>
                        </div>
                    </div>
                </Card>
            </form>
        </div>
    </DashboardShell>
  );
}
