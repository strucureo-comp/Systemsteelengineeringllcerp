'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPurchaseRequests, getProjects } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
    ClipboardList,
    Plus,
    Search,
    RefreshCcw,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import type { PurchaseRequest, Project } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { MaterialRequestForm } from '../_components/material-request-form';
import { PurchasesNav } from '../_components/purchases-nav';

export default function MaterialRequestsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMRFormOpen, setIsMROpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [requestData, projectData] = await Promise.all([
                getPurchaseRequests(),
                getProjects()
            ]);
            setRequests(requestData || []);
            setProjects(projectData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(r => 
        r.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Material Requests</p>
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
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Purchase Requests</h1>
                            <p className="text-muted-foreground">Site Level Requisitions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isMRFormOpen} onOpenChange={setIsMROpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest">
                                    <Plus className="h-4 w-4" /> New Requisition
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-md">
                                <MaterialRequestForm projects={projects} onSuccess={() => { setIsMROpen(false); fetchData(); }} />
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
                            placeholder="SEARCH BY ITEM NAME OR MR NO..."
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
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">MR No</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Material specification</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Project linkage</th>
                                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground font-mono uppercase">MR-{req.id.slice(0, 4).toUpperCase()}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-foreground uppercase">{req.item_name}</p>
                                            <p className="text-[10px] text-muted-foreground font-black tracking-widest">{req.quantity} {req.unit}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-foreground uppercase">{req.project?.title || 'General Site'}</p>
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase">Requested By: {req.requester?.full_name || 'Site Team'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={cn(
                                                "text-xs font-semibold px-2 py-0.5 rounded-full border-none",
                                                req.status === 'pending' ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                                            )}>{req.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-primary" onClick={() => router.push(`/admin/purchases/new?request_id=${req.id}`)}>
                                                <ChevronRight size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <ClipboardList className="h-10 w-10 text-zinc-100" />
                                                <p className="text-muted-foreground">No Material Requests Found</p>
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
