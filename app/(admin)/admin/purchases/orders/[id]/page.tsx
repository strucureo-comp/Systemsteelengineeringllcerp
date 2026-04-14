'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPurchaseOrder } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ChevronLeft, 
    Printer, 
    Trash2, 
    RefreshCcw, 
    Store, 
    Calendar, 
    Hash,
    Truck,
    CheckCircle2,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PurchaseOrder } from '@/lib/db/types';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrder(id);
      setOrder(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCcw className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-foreground">Loading Order Details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-xl font-bold text-foreground">Purchase Order Not Found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8 pb-12">
        <div className="flex items-center justify-between">
            <Button 
                variant="ghost" 
                className="rounded-xl font-bold text-muted-foreground hover:text-slate-900"
                onClick={() => router.push('/admin/purchases')}
            >
                <ChevronLeft className="mr-2 h-5 w-5" /> Back to Purchases
            </Button>
            <div className="flex gap-3">
                <Button variant="outline" className="rounded-xl h-11 px-6 font-bold border-2" onClick={handlePrint}>
                    <Printer className="mr-2 h-5 w-5" /> Print PO
                </Button>
                <Button variant="destructive" className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-red-100">
                    <Trash2 className="mr-2 h-5 w-5" /> Cancel PO
                </Button>
            </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
                {/* Header Information */}
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-primary/10 text-primary border-none font-black px-3 py-1 uppercase text-[10px] tracking-widest">
                                    Purchase Order
                                </Badge>
                                <Badge className={cn(
                                    "rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-wider",
                                    order.status === 'received' ? "bg-emerald-50 text-emerald-600" :
                                    order.status === 'ordered' ? "bg-blue-50 text-blue-600" :
                                    "bg-muted text-muted-foreground"
                                )}>
                                    {order.status}
                                </Badge>
                            </div>
                            <h1 className="text-4xl font-black text-foreground tracking-tight">{order.po_number}</h1>
                            <div className="flex items-center gap-4 text-muted-foreground font-bold text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={16} />
                                    {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Hash size={16} />
                                    {order.id.slice(0, 8).toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Amount</p>
                            <h2 className="text-5xl font-black text-primary tracking-tighter">
                                ${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </Card>

                {/* Line Items */}
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-2xl font-black">Order Items</CardTitle>
                    </CardHeader>
                    <div className="p-8 pt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b-2 border-slate-50">
                                    <tr>
                                        <th className="pb-4 text-left text-xs font-black text-muted-foreground uppercase tracking-widest">Description</th>
                                        <th className="pb-4 text-center text-xs font-black text-muted-foreground uppercase tracking-widest">Quantity</th>
                                        <th className="pb-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Price</th>
                                        <th className="pb-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Tax</th>
                                        <th className="pb-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50">
                                    {order.lines && order.lines.length > 0 ? order.lines.map((line: any, idx: number) => (
                                        <tr key={line.id || idx}>
                                            <td className="py-6 pr-4">
                                                <p className="font-bold text-foreground">{line.description}</p>
                                            </td>
                                            <td className="py-6 text-center">
                                                <Badge variant="outline" className="rounded-lg font-black text-muted-foreground border-border">
                                                    {line.quantity} units
                                                </Badge>
                                            </td>
                                            <td className="py-6 text-right font-bold text-slate-700">
                                                ${Number(line.unit_price).toLocaleString()}
                                            </td>
                                            <td className="py-6 text-right font-bold text-muted-foreground">
                                                ${Number(line.tax_amount || 0).toLocaleString()}
                                            </td>
                                            <td className="py-6 text-right font-black text-foreground">
                                                ${Number(line.total_amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-muted-foreground font-bold italic">
                                                No items found in this order.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 pt-8 border-t-2 border-slate-50 flex justify-end">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-sm font-bold text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>${(Number(order.total_amount) - order.lines.reduce((acc: number, l: any) => acc + Number(l.tax_amount || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-muted-foreground">
                                    <span>Tax Amount</span>
                                    <span>${order.lines.reduce((acc: number, l: any) => acc + Number(l.tax_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t-2 border-slate-50">
                                    <span className="text-lg font-black text-foreground">Grand Total</span>
                                    <span className="text-lg font-black text-primary">${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-8">
                {/* Supplier Card */}
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                    <CardHeader className="p-0 pb-6">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <Store className="text-primary" size={20} /> Supplier
                        </CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted border border-border">
                            <p className="font-black text-foreground text-lg leading-tight">{order.vendor?.name}</p>
                            <p className="text-sm font-bold text-muted-foreground mt-1">{order.vendor?.contact_person}</p>
                        </div>
                        <div className="space-y-2 px-1">
                            <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                <FileText size={14} /> {order.vendor?.email || 'No email provided'}
                            </p>
                            <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                <Truck size={14} /> {order.vendor?.address || 'No address provided'}
                            </p>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl font-bold border-2">
                            View Supplier Profile
                        </Button>
                    </div>
                </Card>

                {/* Workflow Status */}
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                    <CardHeader className="p-0 pb-6">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <CheckCircle2 className="text-primary" size={20} /> Order Status
                        </CardTitle>
                    </CardHeader>
                    <div className="space-y-6">
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            <StatusStep 
                                title="Draft Created" 
                                date={new Date(order.created_at).toLocaleDateString()} 
                                completed 
                            />
                            <StatusStep 
                                title="Approved" 
                                date={new Date(order.created_at).toLocaleDateString()} 
                                completed={['approved', 'ordered', 'received', 'billed', 'paid'].includes(order.status)} 
                            />
                            <StatusStep 
                                title="Sent to Vendor" 
                                date={['ordered', 'received', 'billed', 'paid'].includes(order.status) ? "In Transit" : ""} 
                                completed={['ordered', 'received', 'billed', 'paid'].includes(order.status)} 
                            />
                            <StatusStep 
                                title="Goods Received" 
                                date={order.status === 'received' ? "Completed" : ""} 
                                completed={order.status === 'received'} 
                                last 
                            />
                        </div>
                        
                        {order.status !== 'received' && (
                            <Button 
                                className="w-full rounded-2xl h-12 font-black shadow-lg shadow-primary/20"
                                onClick={() => router.push(`/admin/purchases/grns/new?po_id=${order.id}`)}
                            >
                                Mark as Received (Create GRN)
                            </Button>
                        )}
                        {['approved', 'ordered', 'received'].includes(order.status) && (
                            <Button 
                                variant="outline"
                                className="w-full rounded-2xl h-12 font-black border-2 hover:bg-slate-50"
                                onClick={() => router.push(`/admin/purchases/bills/new?po_id=${order.id}`)}
                            >
                                Create Vendor Bill
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function StatusStep({ title, date, completed, last }: { title: string; date?: string; completed?: boolean; last?: boolean }) {
    return (
        <div className="relative">
            <div className={cn(
                "absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ring-4 ring-white z-10",
                completed ? "bg-primary" : "bg-slate-200"
            )} />
            <div>
                <p className={cn("text-sm font-black", completed ? "text-foreground" : "text-muted-foreground")}>{title}</p>
                {date && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{date}</p>}
            </div>
        </div>
    );
}
