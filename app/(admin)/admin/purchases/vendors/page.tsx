'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendors } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Store,
    Plus,
    Search,
    RefreshCcw,
    MoreHorizontal,
    UserPlus,
    ChevronLeft
} from 'lucide-react';
import type { Vendor } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { VendorForm } from '../_components/vendor-form';
import { PurchasesNav } from '../_components/purchases-nav';
import { useTenant } from '@/lib/tenant-context';

export default function VendorsListPage() {
    const { getModuleLabel } = useTenant();
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isVendorFormOpen, setIsVendorOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getVendors();
            setVendors(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const q = searchQuery.toLowerCase();
    const filteredVendors = vendors.filter((v) =>
        String(v.name ?? '').toLowerCase().includes(q) ||
        String(v.contact_person ?? '').toLowerCase().includes(q) ||
        String(v.email ?? '').toLowerCase().includes(q)
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Vendor Directory</p>
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
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Vendor Directory</h1>
                            <p className="text-muted-foreground">Manage Supply Chain Entities</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isVendorFormOpen} onOpenChange={setIsVendorOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest">
                                    <UserPlus className="h-4 w-4" /> Add New Vendor
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-md">
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Add New Vendor</DialogTitle>
                                    <DialogDescription>Create a vendor profile for procurement and purchasing workflows.</DialogDescription>
                                </DialogHeader>
                                <VendorForm onSuccess={() => { setIsVendorOpen(false); fetchData(); }} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <PurchasesNav />

                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="SEARCH VENDORS BY NAME, CONTACT OR EMAIL..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendor Name</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">TRN / Tax ID</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Contact Details</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredVendors.map((v, idx) => {
                                    const vendorId = String(v.id ?? `vendor-${idx}`);
                                    return (
                                    <tr key={vendorId} className="hover:bg-zinc-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-foreground uppercase">{v.name}</p>
                                            <p className="text-[9px] text-muted-foreground font-mono uppercase mt-0.5">ID: {vendorId.slice(0, 8)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground font-mono">
                                            {v.tax_id || 'NOT REGISTERED'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">{v.contact_person || 'N/A'}</p>
                                            <p className="text-[9px] text-muted-foreground font-medium">{v.email || 'No Email'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border-none bg-emerald-50 text-emerald-700">Active</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-primary">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                )})}
                                {filteredVendors.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Store className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No vendors matching your search</p>
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
