'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRFQs } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Layers,
    Plus,
    Search,
    RefreshCcw,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import type { RFQ } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { PurchasesNav } from '../_components/purchases-nav';

export default function RFQListPage() {
    const router = useRouter();
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getRFQs();
            setRfqs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredRFQs = rfqs.filter(r => 
        r.rfq_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading RFQs</p>
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
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Request for Quotes</h1>
                            <p className="text-muted-foreground">Strategic Sourcing</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest" onClick={() => router.push('/admin/purchases/rfqs/new')}>
                            <Plus className="h-4 w-4" /> New RFQ
                        </Button>
                    </div>
                </div>

                <PurchasesNav />

                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="SEARCH BY RFQ NUMBER..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">RFQ Number</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendors</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Items</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Expiry</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRFQs.map((rfq) => (
                                    <tr key={rfq.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-foreground uppercase font-mono">{rfq.rfq_number}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{rfq.vendors?.length || 0} Vendors</td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{rfq.items?.length || 0} Items</td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{rfq.expiry_date ? new Date(rfq.expiry_date).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border-none bg-zinc-100 text-zinc-600">{rfq.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-primary">
                                                <ChevronRight size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRFQs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Layers className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No RFQs Issued</p>
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
