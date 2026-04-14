'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getCustomers, createCustomer, deleteCustomer, updateCustomer, getLeads, getOpportunities, getInvoices } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users, Search, Plus, Building2, Briefcase, Globe, Phone, Target, ChevronRight, Trash2, Edit2,
    Mail, MapPin, User, DollarSign, FileText, TrendingUp, ArrowUpRight, Calendar, Receipt, ArrowLeft,
    MessageSquare, CreditCard, BarChart3, Download, Printer
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { CustomerAccount, Lead, Opportunity, Invoice } from '@/lib/db/types';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function KpiCard({ label, value }: { label: string, value: string }) {
    return (
        <Card className="border-border shadow-sm">
            <CardContent className="p-4">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-lg font-black text-foreground tracking-tight">{value}</p>
            </CardContent>
        </Card>
    );
}

export default function SalesCustomersPage() {
    const { user } = useAuth();
    const { companyProfile } = useTenant();
    const { baseCurrency } = useCompanySettings();
    const router = useRouter();
    const [customers, setCustomers] = useState<CustomerAccount[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
    const [customerComments, setCustomerComments] = useState<{ id: string; text: string; createdAt: string; createdBy: string }[]>([]);
    const [newComment, setNewComment] = useState('');
    const [customerPayments, setCustomerPayments] = useState<any[]>([]);
    const [customerSalesOrders, setCustomerSalesOrders] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const isRetail = companyProfile?.businessType === 'b2c_retail';
    const currency = baseCurrency;

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const fmtNoDecimals = (n: number) => formatCurrency(n, baseCurrency, { compact: true });

    const [formData, setFormData] = useState({
        name: '', industry: '', website: '', phone: '', address: '', email: '',
        primary_contact: { first_name: '', last_name: '', email: '', phone: '', title: '' }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const custsData = await getCustomers().catch(() => []) || [];
            const [leadsData, oppsData, invsData] = await Promise.all([
                getLeads().catch(() => []),
                getOpportunities().catch(() => []),
                getInvoices().catch(() => []),
            ]);
            setCustomers((Array.isArray(custsData) ? custsData : []).filter((customer: any) => customer?.id) as any || []);
            setLeads(leadsData || []);
            setOpportunities((oppsData as any) || []);
            setInvoices(invsData || []);
        } catch (e) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.industry || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.phone || '').includes(searchQuery)
        );
    }, [customers, searchQuery]);

    // Compute aggregated data for a customer
    const getCustomerData = (customerId: string) => {
        const custOpps = opportunities.filter(o => o.account_id === customerId);
        const custInvoices = invoices.filter(i => i.client_id === customerId || i.customer_id === customerId);
        const wonDeals = custOpps.filter(o => o.stage === 'won');
        const totalRevenue = custInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);
        const pendingAmount = custInvoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount || 0), 0);
        const pipelineValue = custOpps.filter(o => o.stage !== 'won' && o.stage !== 'lost').reduce((s, o) => s + Number(o.amount || 0), 0);

        // Get payments from localStorage
        const allPayments = JSON.parse(localStorage.getItem('sales_payments') || '[]');
        const custPayments = allPayments.filter((p: any) => p.customerId === customerId || p.customer_id === customerId);

        // Get sales orders from localStorage
        const allSalesOrders = JSON.parse(localStorage.getItem('sales_orders') || '[]');
        const custSalesOrders = allSalesOrders.filter((o: any) => o.customerId === customerId || o.customer_id === customerId);

        // Calculate totals
        const totalPaid = custPayments.reduce((s: number, p: any) => s + Number(p.amount || p.total || 0), 0);
        const totalInvoiced = custInvoices.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
        const balance = totalInvoiced - totalPaid;

        // Calculate income by month (last 6 months)
        const monthlyIncome: { month: string; amount: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = month.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthRevenue = custInvoices
                .filter(i => i.status === 'paid' && (i as any).paid_at)
                .filter(i => {
                    const paidDate = new Date((i as any).paid_at);
                    return paidDate >= monthStart && paidDate <= monthEnd;
                })
                .reduce((s, i) => s + Number(i.amount || 0), 0);

            monthlyIncome.push({ month: key, amount: monthRevenue });
        }

        return {
            opportunities: custOpps,
            invoices: custInvoices,
            payments: custPayments,
            salesOrders: custSalesOrders,
            wonDeals: wonDeals.length,
            totalRevenue,
            pendingAmount,
            pipelineValue,
            totalDeals: custOpps.length,
            totalPaid,
            totalInvoiced,
            balance,
            monthlyIncome,
        };
    };

    // Load customer-specific data when a customer is selected
    const loadCustomerData = (customer: CustomerAccount) => {
        // Load comments from localStorage
        const savedComments = localStorage.getItem(`customer_comments_${customer.id}`);
        if (savedComments) {
            setCustomerComments(JSON.parse(savedComments));
        } else {
            setCustomerComments([]);
        }
        setNewComment('');
    };

    // Handle adding a comment
    const handleAddComment = () => {
        if (!newComment.trim() || !selectedCustomer) return;

        const comment = {
            id: Date.now().toString(),
            text: newComment.trim(),
            createdAt: new Date().toISOString(),
            createdBy: localStorage.getItem('user_name') || 'User'
        };

        const updatedComments = [...customerComments, comment];
        setCustomerComments(updatedComments);
        localStorage.setItem(`customer_comments_${selectedCustomer.id}`, JSON.stringify(updatedComments));
        setNewComment('');
        toast.success('Comment added');
    };

    // Handle deleting a comment
    const handleDeleteComment = (commentId: string) => {
        if (!selectedCustomer) return;
        const updatedComments = customerComments.filter(c => c.id !== commentId);
        setCustomerComments(updatedComments);
        localStorage.setItem(`customer_comments_${selectedCustomer.id}`, JSON.stringify(updatedComments));
        toast.success('Comment deleted');
    };

    // Calculate overall stats
    const overallStats = useMemo(() => ({
        totalCustomers: customers.length,
        totalRevenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0),
        activeDeals: opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost').length,
        convertedLeads: leads.filter(l => l.status === 'converted').length,
    }), [customers, invoices, opportunities, leads]);

    const handleSubmit = async () => {
        if (!formData.name) return toast.error('Account Name is required');
        try {
            if (editingId) {
                await updateCustomer(editingId, formData);
                toast.success('Customer updated');
            } else {
                await createCustomer(formData);
                toast.success('Customer registered');
            }
            setIsCreateOpen(false);
            setEditingId(null);
            fetchData();
            setFormData({
                name: '', industry: '', website: '', phone: '', address: '', email: '',
                primary_contact: { first_name: '', last_name: '', email: '', phone: '', title: '' }
            });
        } catch { toast.error(editingId ? 'Update failed' : 'Registration failed'); }
    };

    const handleEdit = (customer: CustomerAccount) => {
        setFormData({
            name: customer.name,
            industry: customer.industry || '',
            website: customer.website || '',
            phone: customer.phone || '',
            address: (customer as any).address || '',
            email: (customer as any).email || '',
            primary_contact: (customer as any).primary_contact ? { ...(customer as any).primary_contact } as any : { first_name: '', last_name: '', email: '', phone: '', title: '' }
        });
        setEditingId(customer.id);
        setIsCreateOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!id) {
            toast.error('Customer id is missing');
            return;
        }
        if (!confirm('Are you sure you want to delete this customer?')) return;
        try {
            const deleted = await deleteCustomer(id);
            if (!deleted) {
                throw new Error('Delete request failed');
            }
            toast.success('Customer deleted');
            fetchData();
        } catch {
            toast.error('Failed to delete customer');
        }
    };

    if (loading) return null;

    return (
        <ModuleGuard module="sales">
            <div className="space-y-6 max-w-4xl mx-auto pb-12">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/admin/sales')}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Back to Sales"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold leading-none tracking-tight">
                                Customer Accounts
                            </h1>
                            <p className="text-sm text-muted-foreground mt-2">
                                Centralized registry of customer profiles and fiscal history.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group mr-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="SEARCH ACCOUNTS..."
                                className="pl-9 h-9 w-56 rounded-lg border-border bg-card text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Button size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest gap-2 shadow-sm" onClick={() => router.push('/admin/sales/customers/new')}>
                            <Plus className="h-4 w-4" /> New Record
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard label="ACTIVE ACCOUNTS" value={overallStats.totalCustomers.toString()} />
                    <KpiCard label="TOTAL REVENUE" value={fmt(overallStats.totalRevenue)} />
                    <KpiCard label="PIPELINE DEALS" value={overallStats.activeDeals.toString()} />
                    <KpiCard label="CONVERSIONS" value={overallStats.convertedLeads.toString()} />
                </div>

                    {/* Customer Cards Grid */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCustomers.map(customer => {
                            const data = getCustomerData(customer.id);
                            return (
                                <Card
                                    key={customer.id}
                                    className="border border-border shadow-sm bg-card hover:border-primary/40 transition-colors cursor-pointer group"
                                    onClick={() => router.push(`/admin/sales/customers/${customer.id}`)}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                                {isRetail ? <Users size={20} /> : <Building2 size={20} />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-[10px] font-bold">Active</Badge>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); router.push(`/admin/sales/customers/${customer.id}`); }}>
                                                    <Edit2 size={12} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}>
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1 mb-4">
                                            <h3 className="text-sm font-bold text-foreground truncate">{customer.name}</h3>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Briefcase size={12} className="text-muted-foreground" />
                                                <p className="text-xs truncate">{customer.industry || 'General Sector'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone size={12} />
                                                <span className="text-xs">{customer.phone || 'No Contact'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Globe size={12} />
                                                <span className="text-xs truncate">{customer.website || 'No Web Profile'}</span>
                                            </div>
                                        </div>

                                        {/* Aggregated Financial Summary */}
                                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border">
                                            <div className="bg-muted/30 rounded-md p-2 text-center">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue</p>
                                                <p className="text-xs font-black text-foreground">{fmt(data.totalRevenue)}</p>
                                            </div>
                                            <div className="bg-muted/30 rounded-md p-2 text-center">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Deals</p>
                                                <p className="text-xs font-black text-foreground">{data.totalDeals}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {filteredCustomers.length === 0 && (
                            <div className="col-span-full py-16 text-center border border-dashed border-border rounded-lg bg-muted/20">
                                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs font-bold text-muted-foreground">No customers found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Detail Drawer */}
                <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
                    <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
                        {selectedCustomer && (() => {
                            const data = getCustomerData(selectedCustomer.id);
                            return (
                                <div className="flex flex-col h-full bg-card">
                                    <SheetHeader className="p-6 border-b space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 gap-2 font-bold text-muted-foreground hover:text-foreground"
                                                onClick={() => setSelectedCustomer(null)}
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                                Back
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="h-8 gap-2 font-bold shadow-sm"
                                                onClick={() => {
                                                    // Store customer data in localStorage for the opportunities page to pick up
                                                    localStorage.setItem('newOpportunityCustomer', JSON.stringify({
                                                        id: selectedCustomer.id,
                                                        name: selectedCustomer.name
                                                    }));
                                                    router.push('/admin/sales/opportunities');
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Create Opportunity
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <SheetTitle className="text-lg font-black text-foreground">{selectedCustomer.name}</SheetTitle>
                                                <p className="text-xs text-muted-foreground font-medium">{selectedCustomer.industry || 'General'}</p>
                                            </div>
                                        </div>
                                    </SheetHeader>

                                    <div className="flex-1 overflow-y-auto">
                                        <Tabs defaultValue="overview" className="w-full">
                                            <TabsList className="w-full rounded-none border-b bg-muted/30 h-10 p-0">
                                                <TabsTrigger key="overview" value="overview" className="flex-1 h-full text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none">Overview</TabsTrigger>
                                                <TabsTrigger key="comments" value="comments" className="flex-1 h-full text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none">Comments</TabsTrigger>
                                                <TabsTrigger key="transactions" value="transactions" className="flex-1 h-full text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none">Transactions</TabsTrigger>
                                                <TabsTrigger key="statement" value="statement" className="flex-1 h-full text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none">Statement</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                                                {/* Financial Summary */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3">
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Revenue</p>
                                                        <p className="text-lg font-black text-foreground">{fmt(data.totalRevenue)}</p>
                                                    </div>
                                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase">Pending</p>
                                                        <p className="text-lg font-black text-foreground">{fmt(data.pendingAmount)}</p>
                                                    </div>
                                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3">
                                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Total Paid</p>
                                                        <p className="text-lg font-black text-foreground">{fmt(data.totalPaid)}</p>
                                                    </div>
                                                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                                                        <p className="text-[10px] font-bold text-primary uppercase">Balance Due</p>
                                                        <p className="text-lg font-black text-foreground">{fmt(data.balance)}</p>
                                                    </div>
                                                </div>

                                                {/* Income Chart */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Income Overview (Last 6 Months)</h4>
                                                    <div className="h-32 flex items-end justify-between gap-2 px-2">
                                                        {data.monthlyIncome?.map((item, idx) => {
                                                            const maxAmount = Math.max(...data.monthlyIncome.map((m: any) => m.amount), 1);
                                                            const height = Math.max((item.amount / maxAmount) * 100, 4);
                                                            return (
                                                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                                                    <div
                                                                        className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                                                                        style={{ height: `${height}%` }}
                                                                        title={fmt(item.amount)}
                                                                    />
                                                                    <span className="text-[8px] text-muted-foreground">{item.month}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground text-center">Monthly revenue from paid invoices</p>
                                                </div>

                                                {/* Address */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Address</h4>
                                                    <div className="bg-muted/30 rounded-md p-3">
                                                        <p className="text-xs text-foreground">{(selectedCustomer as any).address || 'No address on file'}</p>
                                                    </div>
                                                </div>

                                                {/* Contact Information */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Contact Information</h4>
                                                    <div className="space-y-2">
                                                        <DetailRow icon={Phone} label="Phone" value={selectedCustomer.phone || '—'} />
                                                        <DetailRow icon={Globe} label="Website" value={selectedCustomer.website || '—'} />
                                                        <DetailRow icon={Briefcase} label="Industry" value={selectedCustomer.industry || '—'} />
                                                        <DetailRow icon={Mail} label="Email" value={(selectedCustomer as any).email || '—'} />
                                                    </div>
                                                </div>

                                                {/* Primary Contact */}
                                                {(selectedCustomer as any).primary_contact && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Primary Contact</h4>
                                                        <div className="space-y-2">
                                                            <DetailRow icon={User} label="Name" value={`${(selectedCustomer as any).primary_contact.first_name || ''} ${(selectedCustomer as any).primary_contact.last_name || ''}`.trim() || '—'} />
                                                            <DetailRow icon={Mail} label="Email" value={(selectedCustomer as any).primary_contact.email || '—'} />
                                                            <DetailRow icon={Briefcase} label="Title" value={(selectedCustomer as any).primary_contact.title || '—'} />
                                                            <DetailRow icon={Phone} label="Phone" value={(selectedCustomer as any).primary_contact.phone || '—'} />
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            {/* Comments Tab */}
                                            <TabsContent value="comments" className="p-6 space-y-4 mt-0">
                                                <div className="space-y-3">
                                                    <Textarea
                                                        placeholder="Add a note or internal comment..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        className="min-h-[80px] text-xs"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={handleAddComment}
                                                        disabled={!newComment.trim()}
                                                        className="w-full font-bold"
                                                    >
                                                        Add Comment
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {customerComments.length === 0 ? (
                                                        <div className="py-8 text-center text-muted-foreground">
                                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                            <p className="text-xs font-bold">No comments yet</p>
                                                        </div>
                                                    ) : (
                                                        customerComments.map(comment => (
                                                            <Card key={comment.id} className="border-border shadow-sm">
                                                                <CardContent className="p-3">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <div className="flex-1">
                                                                            <p className="text-xs text-foreground whitespace-pre-wrap">{comment.text}</p>
                                                                            <p className="text-[10px] text-muted-foreground mt-2">
                                                                                {comment.createdBy} • {new Date(comment.createdAt).toLocaleString()}
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                            onClick={() => handleDeleteComment(comment.id)}
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </Button>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>
                                            </TabsContent>

                                            {/* Transactions Tab */}
                                            <TabsContent value="transactions" className="p-6 space-y-6 mt-0">
                                                {/* Invoices */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-bold text-foreground uppercase">Invoices ({data.invoices.length})</h4>
                                                    </div>
                                                    {data.invoices.length === 0 ? (
                                                        <div className="py-6 text-center text-muted-foreground">
                                                            <Receipt className="h-6 w-6 mx-auto mb-2 opacity-40" />
                                                            <p className="text-xs">No invoices</p>
                                                        </div>
                                                    ) : (
                                                        data.invoices.map(inv => (
                                                            <Card key={inv.id} className="border-border shadow-sm">
                                                                <CardContent className="p-3 flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                                                                            <FileText size={14} className="text-blue-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-foreground">{inv.invoice_number}</p>
                                                                            <p className="text-[10px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-black text-foreground">{fmt(Number(inv.amount))}</p>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={cn("text-[9px] font-bold",
                                                                                inv.status === 'paid' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                                                                                inv.status === 'overdue' ? 'border-red-200 text-red-700 bg-red-50' :
                                                                                    'border-amber-200 text-amber-700 bg-amber-50'
                                                                            )}
                                                                        >
                                                                            {inv.status}
                                                                        </Badge>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Payments */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-foreground uppercase">Payments ({data.payments.length})</h4>
                                                    {data.payments.length === 0 ? (
                                                        <div className="py-6 text-center text-muted-foreground">
                                                            <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-40" />
                                                            <p className="text-xs">No payments</p>
                                                        </div>
                                                    ) : (
                                                        data.payments.map((pay: any) => (
                                                            <Card key={pay.id} className="border-border shadow-sm">
                                                                <CardContent className="p-3 flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center">
                                                                            <CreditCard size={14} className="text-emerald-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-foreground">{pay.invoice_number || pay.reference || 'Payment'}</p>
                                                                            <p className="text-[10px] text-muted-foreground">{new Date(pay.date || pay.payment_date).toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-black text-emerald-600">-{fmt(Number(pay.amount || pay.total || 0))}</p>
                                                                        <Badge variant="outline" className="text-[9px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50">
                                                                            {pay.method || 'Paid'}
                                                                        </Badge>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Sales Orders */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-foreground uppercase">Sales Orders ({data.salesOrders.length})</h4>
                                                    {data.salesOrders.length === 0 ? (
                                                        <div className="py-6 text-center text-muted-foreground">
                                                            <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                                                            <p className="text-xs">No sales orders</p>
                                                        </div>
                                                    ) : (
                                                        data.salesOrders.map((so: any) => (
                                                            <Card key={so.id} className="border-border shadow-sm">
                                                                <CardContent className="p-3 flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center">
                                                                            <FileText size={14} className="text-purple-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-foreground">{so.number || so.order_number}</p>
                                                                            <p className="text-[10px] text-muted-foreground">{new Date(so.date).toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-black text-foreground">{fmt(Number(so.total || so.amount || 0))}</p>
                                                                        <Badge variant="outline" className="text-[9px] font-bold">
                                                                            {so.status || 'Active'}
                                                                        </Badge>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>
                                            </TabsContent>

                                            {/* Statement Tab */}
                                            <TabsContent value="statement" className="p-6 space-y-4 mt-0">
                                                {/* Statement Summary */}
                                                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-xs font-bold text-foreground">Account Statement</h4>
                                                        <div className="flex gap-1">
                                                            <Button variant="outline" size="icon" className="h-7 w-7">
                                                                <Printer size={12} />
                                                            </Button>
                                                            <Button variant="outline" size="icon" className="h-7 w-7">
                                                                <Download size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3 text-center">
                                                        <div className="bg-background rounded p-2">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Invoiced</p>
                                                            <p className="text-sm font-black text-foreground">{fmt(data.totalInvoiced)}</p>
                                                        </div>
                                                        <div className="bg-background rounded p-2">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Paid</p>
                                                            <p className="text-sm font-black text-emerald-600">{fmt(data.totalPaid)}</p>
                                                        </div>
                                                        <div className="bg-background rounded p-2">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Balance Due</p>
                                                            <p className="text-sm font-black text-amber-600">{fmt(data.balance)}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground text-center">
                                                        As of {new Date().toLocaleDateString()}
                                                    </p>
                                                </div>

                                                {/* Transaction History Table */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Transaction History</h4>
                                                    <div className="border rounded-lg overflow-hidden">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-muted/50">
                                                                <tr>
                                                                    <th className="text-left p-2 font-bold">Date</th>
                                                                    <th className="text-left p-2 font-bold">Reference</th>
                                                                    <th className="text-right p-2 font-bold">Debit</th>
                                                                    <th className="text-right p-2 font-bold">Credit</th>
                                                                    <th className="text-right p-2 font-bold">Balance</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {/* Generate statement rows from invoices and payments */}
                                                                {(() => {
                                                                    const rows: any[] = [];
                                                                    let runningBalance = 0;

                                                                    // Add invoices (debit)
                                                                    data.invoices.forEach(inv => {
                                                                        runningBalance += Number(inv.amount || 0);
                                                                        rows.push({
                                                                            date: inv.created_at,
                                                                            reference: inv.invoice_number,
                                                                            type: 'invoice',
                                                                            debit: Number(inv.amount || 0),
                                                                            credit: 0,
                                                                            balance: runningBalance
                                                                        });
                                                                    });

                                                                    // Add payments (credit)
                                                                    data.payments.forEach((pay: any) => {
                                                                        runningBalance -= Number(pay.amount || pay.total || 0);
                                                                        rows.push({
                                                                            date: pay.date || pay.payment_date,
                                                                            reference: pay.reference || 'Payment',
                                                                            type: 'payment',
                                                                            debit: 0,
                                                                            credit: Number(pay.amount || pay.total || 0),
                                                                            balance: runningBalance
                                                                        });
                                                                    });

                                                                    // Sort by date
                                                                    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                                                    if (rows.length === 0) {
                                                                        return (
                                                                            <tr>
                                                                                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                                                                    No transactions
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    }

                                                                    return rows.map((row, idx) => (
                                                                        <tr key={idx} className="border-t">
                                                                            <td className="p-2">{new Date(row.date).toLocaleDateString()}</td>
                                                                            <td className="p-2 font-medium">{row.reference}</td>
                                                                            <td className="p-2 text-right">{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                                                                            <td className="p-2 text-right text-emerald-600">{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                                                                            <td className="p-2 text-right font-bold">{fmt(row.balance)}</td>
                                                                        </tr>
                                                                    ));
                                                                })()}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </div>
                            );
                        })()}
                    </SheetContent>
                </Sheet>
        </ModuleGuard>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                <Icon size={12} className="text-muted-foreground" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                <p className="text-xs font-medium text-foreground">{value}</p>
            </div>
        </div>
    );
}
