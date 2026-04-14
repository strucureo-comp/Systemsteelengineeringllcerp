'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getOpportunities, getLeads } from '@/lib/api';
import { getSalesInvoices, getSalesQuotations, getProformaInvoices, getDeliveryNotes } from '@/lib/services/business-documents-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    TrendingUp, Users, Target, DollarSign,
    ShoppingCart, FileText, UserPlus,
    Clock, Plus, Receipt, FileSignature,
    ArrowUpRight, BarChart3, Briefcase, ChevronRight, Truck, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Opportunity, Lead, Invoice } from '@/lib/db/types';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

const isToday = (date: string) => {
    if (!date) return false;
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
};

const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
};

export default function SalesDashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { getModuleLabel, companyProfile } = useTenant();
    const { baseCurrency } = useCompanySettings();
    
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [proformas, setProformas] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Check if B2B/B2C based on company profile settings
    const isRetail = companyProfile?.businessType === 'b2c_retail';

    const fmt = useCallback((n: number) => {
        return formatCurrency(n, baseCurrency, { compact: true });
    }, [baseCurrency]);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLoading(false);
            return;
        }

        fetchData();
    }, [authLoading, user, baseCurrency]); // Reload on currency change if needed

    const fetchData = async () => {
        try {
            setLoading(true);
            const [oppsData, leadsData, invData, quotesData, proformaData, deliveryData] = await Promise.all([
                getOpportunities().catch(() => []),
                getLeads().catch(() => []),
                getSalesInvoices().catch(() => []),
                getSalesQuotations().catch(() => []),
                getProformaInvoices().catch(() => []),
                getDeliveryNotes().catch(() => []),
            ]);
            setOpportunities((oppsData as any) || []);
            setLeads(leadsData || []);
            setInvoices(invData || []);
            setQuotes(quotesData || []);
            setProformas(proformaData || []);
            setDeliveries(deliveryData || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const stats = useMemo(() => {
        const wonOpps = opportunities.filter(o => o.stage === 'won');
        const pipelineOpps = opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost');
        const revenue = wonOpps.reduce((sum, o) => sum + Number(o.amount), 0);
        const pipelineValue = pipelineOpps.reduce((sum, o) => sum + Number(o.amount), 0);
        const winRate = opportunities.length > 0 ? (wonOpps.length / opportunities.length) * 100 : 0;
        
        // Count all non-completed and non-rejected invoices as "pending"
        const pendingInvoiceAmount = invoices
            .filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== ('rejected' as any))
            .reduce((s, i) => s + Number(i.amount || 0), 0);
        
        const activeQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'pending_approval' || q.status === 'approved').length;
        const activeProformas = proformas.filter(p => p.status !== 'completed' && p.status !== 'rejected').length;
        const pendingDeliveries = deliveries.filter(d => d.status !== 'completed' && d.status !== 'rejected').length;

        const followUpsToday = opportunities.flatMap(o => o.followUps || []).filter(f => f.status === 'Pending' && isToday(f.scheduledAt)).length;
        const overdueFollowUps = opportunities.flatMap(o => o.followUps || []).filter(f => f.status === 'Missed' || (f.status === 'Pending' && isOverdue(f.scheduledAt))).length;

        return {
            revenue,
            pipelineValue,
            winRate,
            activeLeads: leads.length,
            pendingInvoiceAmount,
            invoiceCount: invoices.length,
            activeQuotes,
            activeProformas,
            pendingDeliveries,
            followUpsToday,
            overdueFollowUps
        };
    }, [opportunities, leads, invoices, quotes]);

    return (
        <ModuleGuard module="sales">
            {loading ? (
                <div className="space-y-6 max-w-4xl animate-pulse">
                    <div>
                        <div className="h-8 w-48 bg-muted rounded mb-2" />
                        <div className="h-4 w-64 bg-muted rounded" />
                    </div>
                    <div className="h-[400px] bg-muted rounded-xl w-full" />
                </div>
            ) : (
                <>
                    <div className="space-y-6 max-w-4xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold leading-none tracking-tight">{getModuleLabel('sales')}</h1>
                            <p className="text-sm text-muted-foreground mt-2">Manage your commercial pipeline, leads, and revenue stream.</p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-3">
                            <Button onClick={() => router.push('/admin/sales/quotations')} size="sm" variant="secondary" className="h-9 gap-2 font-bold uppercase text-[10px] tracking-widest px-4">
                                <Plus className="h-3 w-3" /> New Quotation
                            </Button>
                            <Button size="sm" variant="outline" className="h-9 gap-2 font-bold uppercase text-[10px] tracking-widest px-4" onClick={() => router.push('/admin/sales/invoices')}>
                                <Receipt className="h-3 w-3" /> New Invoice
                            </Button>
                        </div>
                    </div>

                    {/* Quick Stats: Clear KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <MetricCard key="revenue" title="REVENUE (WON)" value={fmt(stats.revenue)} trend="Confirmed" />
                        <MetricCard key="pipeline" title="PIPELINE VALUE" value={fmt(stats.pipelineValue)} trend="Expected" />
                        <MetricCard key="leads" title="ACTIVE LEADS" value={stats.activeLeads.toString()} trend="Qualified" />
                        <MetricCard key="invoices" title="PENDING INVOICES" value={fmt(stats.pendingInvoiceAmount)} trend="Unpaid" />
                        <MetricCard key="proformas" title="ACTIVE PROFORMAS" value={stats.activeProformas.toString()} trend="Drafts" />
                        <MetricCard key="deliveries" title="PENDING SHIP" value={stats.pendingDeliveries.toString()} trend="Logistics" />
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Commercial Board</h2>
                            <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase">Live Pipeline</Badge>
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => router.push('/admin/sales/leads')}>
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-3 space-y-0">
                                    <div className="h-8 w-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                        <Target className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">Leads & CRM</CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Convert prospects into accounts</p>
                                </CardContent>
                            </Card>

                            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => router.push('/admin/sales/quotations')}>
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-3 space-y-0">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                                        <FileSignature className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">Quotations</CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Estimates and proposals</p>
                                </CardContent>
                            </Card>

                            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => router.push('/admin/sales/invoices')}>
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-3 space-y-0">
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                        <Receipt className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">Billing</CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Invoices and revenue collection</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Secondary Insights or Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                        <Card className="border shadow-sm">
                            <CardHeader className="border-b py-3 px-5">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Active Opportunities</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {opportunities.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground uppercase tracking-widest font-black opacity-50">Empty Slate</div>
                                ) : (
                                    <div className="divide-y">
                                        {opportunities.slice(0, 5).map((opp, idx) => (
                                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-xs uppercase">{opp.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{opp.account?.name}</p>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight">{opp.stage?.replace('_', ' ')}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardHeader className="border-b py-3 px-5">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Urgent Follow-ups</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    <div className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase">Scheduled Today</p>
                                            <p className="text-lg font-black">{stats.followUpsToday}</p>
                                        </div>
                                        <div className="h-8 w-8 rounded bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-red-600">Overdue Actions</p>
                                            <p className="text-lg font-black text-red-600">{stats.overdueFollowUps}</p>
                                        </div>
                                        <div className="h-8 w-8 rounded bg-red-500/10 text-red-600 flex items-center justify-center">
                                            <Plus className="h-4 w-4 rotate-45" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN */}
                        <div className="space-y-8">

                            <Card className="border-border shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
                                    <CardTitle className="text-base font-bold">Recent Quotes</CardTitle>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" asChild>
                                        <Link href="/admin/sales/quotations">View All</Link>
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {quotes.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground">No recent quotes.</div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {quotes.slice(0, 5).map((q, idx) => (
                                                <div key={q.id || q._id || `quote-${idx}`} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-sm">{q.number || q.quote_number}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{q.customerName || q.account?.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm">{fmt(Number(q.total || q.total_amount))}</p>
                                                        <Badge variant="outline" className="mt-1 text-[10px]">{q.status}</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-border shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
                                    <CardTitle className="text-base font-bold">Quick Navigation</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 divide-y divide-border">
                                    <Link href="/admin/sales/opportunities" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border border-border rounded-md bg-background shadow-sm"><Target className="h-4 w-4" /></div>
                                            <span className="font-bold text-sm">Opportunities & Leads Pipeline</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                    <Link href="/admin/sales/customers" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border border-border rounded-md bg-background shadow-sm"><Users className="h-4 w-4" /></div>
                                            <span className="font-bold text-sm">Customer Details</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                    <Link href="/admin/sales/invoices" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border border-border rounded-md bg-background shadow-sm"><Receipt className="h-4 w-4" /></div>
                                            <span className="font-bold text-sm">Sales Invoices</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                    <Link href="/admin/sales/quotations" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border border-border rounded-md bg-background shadow-sm"><FileText className="h-4 w-4" /></div>
                                            <span className="font-bold text-sm">Quotations</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                    <Link href="/admin/sales/proforma" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border border-border rounded-md bg-background shadow-sm"><Receipt className="h-4 w-4" /></div>
                                            <span className="font-bold text-sm">Proforma Invoices</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                    <Link href="/admin/sales/delivery-notes" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border border-border rounded-md bg-background shadow-sm"><Truck className="h-4 w-4" /></div>
                                            <span className="font-bold text-sm">Delivery Notes</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                </CardContent>
                            </Card>

                        </div>
                    </div>
                </>
            )}
        </ModuleGuard>
    );
}

function MetricCard({ title, value, trend }: { title: string, value: string, trend: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    {trend}
                </p>
            </CardContent>
        </Card>
    );
}
