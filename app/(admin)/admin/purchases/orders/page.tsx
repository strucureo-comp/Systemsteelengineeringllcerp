'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPurchaseOrders, getVendors } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ShoppingCart,
    Plus,
    Search,
    RefreshCcw,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import type { PurchaseOrder, Vendor } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { PurchasesNav } from '../_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const { baseCurrency } = useCompanySettings();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, [baseCurrency]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [orderData, vendorData] = await Promise.all([
                getPurchaseOrders(),
                getVendors()
            ]);
            setOrders(orderData || []);
            setVendors(vendorData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const filteredOrders = orders.filter(o => 
        o.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendors.find(v => v.id === o.vendor_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Purchase Orders</p>
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
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Purchase Orders</h1>
                            <p className="text-muted-foreground">Official Procurement Orders</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest" onClick={() => router.push('/admin/purchases/new')}>
                            <Plus className="h-4 w-4" /> Issue New PO
                        </Button>
                    </div>
                </div>

                <PurchasesNav />

                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="SEARCH BY PO NUMBER OR VENDOR..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">PO Number</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendor Entity</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Commitment</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-foreground uppercase font-mono">{order.po_number}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{vendors.find(v => v.id === order.vendor_id)?.name || 'Unknown Vendor'}</td>
                                        <td className="px-6 py-4 text-xs font-black text-right text-foreground">{fmt(Number(order.total_amount))}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border-none bg-muted text-muted-foreground">{order.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-primary" onClick={() => router.push(`/admin/purchases/orders/${order.id}`)}>
                                                <ChevronRight size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShoppingCart className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No Purchase Orders Found</p>
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
