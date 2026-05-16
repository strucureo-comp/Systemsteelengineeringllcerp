// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useTenant } from '@/lib/tenant-context';
import {
    getPurchaseOrders, 
    getVendors, 
    getPurchaseRequests, 
    getGRNs, 
    getVendorBills, 
    getVendorPayments, 
    getProjects,
    getExpenses,
    getRFQs,
    getRecurringBills,
    getRecurringExpenses,
    getVendorCredits,
    getBatchPayments
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
    ShoppingCart,
    Plus,
    Search,
    RefreshCcw,
    ChevronRight,
    Clock,
    Store,
    TrendingUp,
    ClipboardList,
    FileText,
    ArrowUpRight,
    ArrowDownLeft,
    Truck,
    Receipt,
    CreditCard,
    MoreHorizontal,
    UserPlus,
    FileCheck,
    Repeat,
    DollarSign,
    Layers,
    ChevronDown,
    Package,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import type { 
    PurchaseOrder, 
    Vendor, 
    PurchaseRequest, 
    GRN, 
    VendorBill, 
    VendorPayment, 
    Project,
    RFQ,
    Expense,
    RecurringBill,
    RecurringExpense,
    BatchPayment,
    DebitNote
} from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { MaterialRequestForm } from './_components/material-request-form';
import { VendorForm } from './_components/vendor-form';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { PurchasesNav } from './_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function PurchasesPage() {
    const { getModuleLabel } = useTenant();
    const { baseCurrency } = useCompanySettings();
    const router = useRouter();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [grns, setGrns] = useState<GRN[]>([]);
    const [bills, setBills] = useState<VendorBill[]>([]);
    const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
    const [vendorCredits, setVendorCredits] = useState<DebitNote[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [payments, setPayments] = useState<VendorPayment[]>([]);
    const [batchPayments, setBatchPayments] = useState<BatchPayment[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMRFormOpen, setIsMROpen] = useState(false);
    const [isVendorFormOpen, setIsVendorOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [baseCurrency]); // Reload if currency changes

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [
                orderData, vendorData, requestData, rfqData, grnData, 
                billData, recBillData, creditData, 
                expenseData, recExpenseData, 
                paymentData, batchData, projectData
            ] = await Promise.all([
                getPurchaseOrders().catch(() => []),
                getVendors().catch(() => []),
                getPurchaseRequests().catch(() => []),
                getRFQs().catch(() => []),
                getGRNs().catch(() => []),
                getVendorBills().catch(() => []),
                getRecurringBills().catch(() => []),
                getVendorCredits().catch(() => []),
                getExpenses().catch(() => []),
                getRecurringExpenses().catch(() => []),
                getVendorPayments().catch(() => []),
                getBatchPayments().catch(() => []),
                getProjects().catch(() => [])
            ]);
            
            setOrders((orderData as PurchaseOrder[]) || []);
            setVendors((vendorData as Vendor[]) || []);
            setRequests((requestData as PurchaseRequest[]) || []);
            setRfqs((rfqData as RFQ[]) || []);
            setGrns(grnData || []);
            setBills(billData || []);
            setRecurringBills(recBillData || []);
            setVendorCredits(creditData || []);
            setExpenses(expenseData || []);
            setRecurringExpenses(recExpenseData || []);
            setPayments(paymentData || []);
            setBatchPayments(batchData || []);
            setProjects((projectData as Project[]) || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({
        totalSpent: orders.filter(o => ['received', 'billed', 'paid'].includes(o.status)).reduce((sum, o) => sum + Number(o.total_amount), 0),
        activeOrders: orders.filter(o => o.status === 'ordered' || o.status === 'approved').length,
        vendorsCount: vendors.length,
        pendingMRs: requests.filter(r => r.status === 'pending').length,
        ordersIssued: orders.filter(o => ['issued', 'ordered'].includes(o.status)).length,
        billsProcessed: bills.length,
        rfqsClosed: rfqs.filter(r => r.status === 'closed').length,
        totalPayables: bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + Number(b.total_amount), 0),
        newVendors: vendors.filter(v => new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        newItems: 12, 
        avgLeadTime: '4.2 Days'
    }), [orders, vendors, requests, bills, rfqs]);

    const spendByVendor = useMemo(() => {
        const data: Record<string, number> = {};
        orders.forEach(o => {
            const vName = vendors.find(v => v.id === o.vendor_id)?.name || 'Unknown';
            data[vName] = (data[vName] || 0) + Number(o.total_amount);
        });
        return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [orders, vendors]);

    const recentActivity = useMemo(() => {
        const combined = [
            ...orders.map(o => ({ type: 'order', date: o.created_at, title: `Order ${o.po_number}`, amount: o.total_amount })),
            ...bills.map(b => ({ type: 'bill', date: b.created_at, title: `Bill ${b.bill_number}`, amount: b.total_amount })),
            ...payments.map(p => ({ type: 'payment', date: p.created_at, title: `Payment recorded`, amount: p.amount })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        return combined;
    }, [orders, bills, payments]);

    if (loading) {
        return (
            <ModuleGuard module="purchases">
                <div className="space-y-6 max-w-4xl animate-pulse">
                    <div>
                        <div className="h-8 w-48 bg-muted rounded mb-2" />
                        <div className="h-4 w-64 bg-muted rounded" />
                    </div>
                    <div className="h-[400px] bg-muted rounded-xl w-full" />
                </div>
            </ModuleGuard>
        );
    }

    return (
        <ModuleGuard module="purchases">
            <div className="space-y-6 max-w-4xl">
                {/* Header Area */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold leading-none tracking-tight">{getModuleLabel('purchases')}</h1>
                        <p className="text-sm text-muted-foreground mt-2">Manage vendors, procurement pipelines, and purchase orders.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Dialog open={isVendorFormOpen} onOpenChange={setIsVendorOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2 font-bold uppercase text-[10px] tracking-widest px-4">
                                    <UserPlus className="h-3 w-4" /> Add Vendor
                                </Button>
                            </DialogTrigger>
                                <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-md">
                                    <VendorForm onSuccess={() => { setIsVendorOpen(false); fetchData(); }} />
                                </DialogContent>
                            </Dialog>

                            <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest px-4" onClick={() => router.push('/admin/purchases/new')}>
                                <Plus className="h-3 w-4" /> Issue PO
                            </Button>
                        </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatsTile title="COMMITTED SPEND" value={fmt(stats.totalSpent)} icon={ShoppingCart} label="Value" />
                        <StatsTile title="TOTAL PAYABLES" value={fmt(stats.totalPayables)} icon={DollarSign} label="AP" highlight={stats.totalPayables > 100000} />
                        <StatsTile title="AVG LEAD TIME" value={stats.avgLeadTime} icon={Clock} label="Order Cycle" />
                        <StatsTile title="NEW ITEMS" value={stats.newItems.toString()} icon={Package} label="SKUs Added" />
                        <StatsTile title="RFQS CLOSED" value={stats.rfqsClosed.toString()} icon={Layers} label="Efficiency" />
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Procurement Board</h2>
                            <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase">Verified Supply Chain</Badge>
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => router.push('/admin/purchases/vendors')}>
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-3 space-y-0">
                                    <div className="h-8 w-8 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                                        <Store className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">Vendors</CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Manage supply network</p>
                                </CardContent>
                            </Card>

                            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => router.push('/admin/purchases/material-requests')}>
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-3 space-y-0">
                                    <div className="h-8 w-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                        <Layers className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">Inventory Logic</CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Requests and requisitions</p>
                                </CardContent>
                            </Card>

                            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => router.push('/admin/purchases/bills')}>
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-3 space-y-0">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                                        <Receipt className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">Accounts Payable</CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Vendor bills and verification</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Analytics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                        <Card className="md:col-span-2 border shadow-sm rounded-md bg-card">
                            <CardHeader className="border-b py-3 px-5">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-foreground">Vendor Spend Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={spendByVendor}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#71717a' }} dy={10} />
                                            <YAxis hide />
                                            <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '4px', border: '1px solid #e4e4e7', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                            <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="border shadow-sm rounded-md bg-card">
                                <CardHeader className="border-b py-3 px-5">
                                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-foreground">Supply Insights</CardTitle>
                                </CardHeader>
                                <CardContent className="p-5">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Order Efficiency</span>
                                                <span className="text-xs font-black text-primary">94%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full" style={{ width: '94%' }} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase leading-relaxed">
                                            Tracking {orders.length} orders across {vendors.length} vendors. Avg lead time: {stats.avgLeadTime}.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm rounded-md bg-card">
                                <CardHeader className="border-b py-3 px-5">
                                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-foreground">Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {recentActivity.map((act, i) => (
                                            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                <div>
                                                    <p className="text-[10px] font-bold text-foreground uppercase">{act.title}</p>
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase">{new Date(act.date).toLocaleDateString()}</p>
                                                </div>
                                                <p className="text-[10px] font-black text-foreground">{fmt(act.amount ?? 0)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </ModuleGuard>
    );
}

function StatsTile({ title, value, icon: Icon, label, highlight }: { title: string; value: any; icon: any; label: string; highlight?: boolean }) {
    return (
        <Card className={cn(
            "border border-border shadow-sm rounded-md bg-card transition-all hover:border-primary/20",
            highlight && "border-primary/20 bg-primary/5"
        )}>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="text-lg font-black text-foreground tracking-tight">{value}</div>
                <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">
                    {label}
                </p>
            </CardContent>
        </Card>
    );
}
