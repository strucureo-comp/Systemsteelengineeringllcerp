'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    TrendingUp, ChevronLeft, Search, Users, FileText,
    AlertTriangle, CheckCircle2, Clock, ArrowUpRight, DollarSign,
    ShieldAlert, Plus, Download, Filter, MoreHorizontal, UserPlus,
    CreditCard, Receipt, Undo2, Ban, LineChart, FileSpreadsheet, Eye
} from 'lucide-react';
import {
    getARCustomers, createARCustomer, updateARCustomer,
    getARInvoices, createARInvoice, postARInvoice,
    getARPayments, createARPayment,
    getARAgingReport,
    getAccounts
} from '@/lib/api';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { FinanceEmptyState } from '@/components/finance/FinancePageHeader';

// ── TYPES ──────────────────────────────────────────────────────────────────

interface Customer {
    id: string;
    _id: string;
    customer_id: string;
    legal_name: string;
    trade_name: string;
    tax_registration_no: string;
    credit_terms: string;
    default_currency: string;
    credit_limit: number;
    risk_rating: string;
    balance: number;
}

interface InvoiceLine {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    amount: number;
    tax_amount: number;
    total: number;
}

interface Invoice {
    id: string;
    _id: string;
    invoice_number: string;
    customer_name: string;
    customer_id: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    balance_due: number;
    status: string;
    lines: InvoiceLine[];
}
interface Payment {
    id: string; _id: string; receipt_number: string; customer_id: string;
    payment_date: string; amount_received: number; amount_applied: number;
    unapplied_balance: number; status: string;
}

const AGING_RATES = {
    current: 0.005, // 0.5% - configurable in future
    d30: 0.02, // 2% after 30 days
    d60: 0.05, // 5% after 60 days
    d90: 0.15, // 15% after 90 days
    d90Plus: 0.5, // 50% after 90+ days
} as const;

export default function AccountsReceivableUpgrade() {
    const { baseCurrency, taxRate, taxName } = useCompanySettings();
    const fmt = (amount: number, options?: { compact?: boolean }) => formatCurrency(amount, baseCurrency, options);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handler = () => window.location.reload();
        window.addEventListener('erp_company_settings_changed', handler);
        return () => window.removeEventListener('erp_company_settings_changed', handler);
    }, []);

    // Data States
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [aging, setAging] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);

    // UI States
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeForm, setActiveForm] = useState<'customer' | 'invoice' | 'payment' | 'credit_note' | null>(null);

    // Initial Fetch
    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [c, i, p, a, accs] = await Promise.all([
                getARCustomers(),
                getARInvoices(),
                getARPayments(),
                getARAgingReport(),
                getAccounts()
            ]);
            setCustomers(c);
            setInvoices(i);
            setPayments(p);
            setAging(a);
            setAccounts(accs);
        } catch (err) {
            toast.error('Failed to load AR data');
        } finally {
            setLoading(false);
        }
    }

    const totals = useMemo(() => {
        const receivable = invoices.reduce((s, inv) => s + (inv.balance_due || 0), 0);
        const overdue = invoices.filter(inv => inv.status === 'overdue').reduce((s, inv) => s + (inv.balance_due || 0), 0);
        const unapplied = payments.reduce((s, p) => s + (p.unapplied_balance || 0), 0);
        return { receivable, overdue, unapplied };
    }, [invoices, payments]);
    const requiredProvision =
        ((aging?.current ?? 0) * AGING_RATES.current) +
        ((aging?.d30 ?? 0) * AGING_RATES.d30) +
        ((aging?.d60 ?? 0) * AGING_RATES.d60) +
        ((aging?.d90 ?? 0) * AGING_RATES.d90) +
        ((aging?.d90Plus ?? 0) * AGING_RATES.d90Plus);

    if (loading) {
        return (
            <DashboardShell requireAdmin>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex items-center justify-between border-b border-border pb-5">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/finance">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Accounts Receivable</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">AR Management Hub</span>
                                <Badge variant="secondary" className="hidden sm:inline-flex font-bold uppercase text-[9px] tracking-widest bg-slate-100 text-slate-600">
                                    IFRS Compliant
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs font-semibold hover:border-red-200 hover:text-red-600">
                            <Download className="mr-2 h-3.5 w-3.5" /> Export
                        </Button>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DropdownAction onAction={(type) => { setActiveForm(type); setDialogOpen(true); }} />
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-red-600">
                                        {activeForm === 'customer' && 'New Customer Master'}
                                        {activeForm === 'invoice' && 'Create Revenue Invoice'}
                                        {activeForm === 'payment' && 'Record Receipt & Allocation'}
                                        {activeForm === 'credit_note' && 'Create Credit Note'}
                                    </DialogTitle>
                                </DialogHeader>
                                {activeForm === 'customer' && <CustomerForm onSuccess={() => { setDialogOpen(false); loadData(); }} />}
                                {activeForm === 'invoice' && <InvoiceForm customers={customers} onSuccess={() => { setDialogOpen(false); loadData(); }} />}
                                {activeForm === 'payment' && <PaymentForm customers={customers} invoices={invoices} onSuccess={() => { setDialogOpen(false); loadData(); }} />}
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <KPICard label="Total Outstanding" value={fmt(totals.receivable)} sub="Current AR Balance" icon={<DollarSign className="h-4 w-4" />} />
                    <KPICard label="Total Overdue" value={fmt(totals.overdue)} sub="Action Required" alert icon={<AlertTriangle className="h-4 w-4" />} />
                    <KPICard label="Unapplied Cash" value={fmt(totals.unapplied)} sub="Advances & Deposits" warn icon={<Clock className="h-4 w-4" />} />
                    <KPICard label="DSO (Days Sales)" value="42 Days" sub="Avg Collection Period" icon={<LineChart className="h-4 w-4" />} />
                </div>

                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="bg-slate-100/50 border border-slate-200 h-10 p-0.5 rounded-xl">
                        <TabsTrigger value="overview" className="text-[11px] font-bold h-full data-[state=active]:bg-white data-[state=active]:text-red-600 rounded-lg">Overview</TabsTrigger>
                        <TabsTrigger value="customers" className="text-[11px] font-bold h-full data-[state=active]:bg-white data-[state=active]:text-red-600 rounded-lg">Customers</TabsTrigger>
                        <TabsTrigger value="invoices" className="text-[11px] font-bold h-full data-[state=active]:bg-white data-[state=active]:text-red-600 rounded-lg">Invoice Manager</TabsTrigger>
                        <TabsTrigger value="creditnotes" className="text-[11px] font-bold h-full data-[state=active]:bg-white data-[state=active]:text-red-600 rounded-lg">Credit Notes</TabsTrigger>
                        <TabsTrigger value="aging" className="text-[11px] font-bold h-full data-[state=active]:bg-white data-[state=active]:text-red-600 rounded-lg">Aging & ECL</TabsTrigger>
                        <TabsTrigger value="history" className="text-[11px] font-bold h-full data-[state=active]:bg-white data-[state=active]:text-red-600 rounded-lg">Ledger History</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="mt-6 space-y-6">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 hover:border-red-100 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><LineChart className="h-4 w-4" /></div>
                                            Collection Workflow Progress
                                        </CardTitle>
                                        <Badge variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-100 uppercase tracking-widest font-bold">Month-to-Date</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[200px] flex items-end justify-between gap-4 px-2 pt-4 border-b border-slate-100">
                                        {[
                                            { label: 'Invoiced', val: 450000, color: 'bg-slate-200' },
                                            { label: 'Collected', val: 320000, color: 'bg-red-500' },
                                            { label: 'Overdue', val: 80000, color: 'bg-red-900' },
                                            { label: 'Adv. Receipt', val: 45000, color: 'bg-emerald-500' }
                                        ].map(item => (
                                            <div key={item.label} className="flex-1 group relative flex flex-col items-center">
                                                <div className={cn("w-full rounded-t-lg transition-all duration-500 hover:brightness-110", item.color)}
                                                    style={{ height: `${(item.val / 450000) * 100}%` }} />
                                                <div className="mt-2 text-center">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{item.label}</p>
                                                    <p className="text-[11px] font-black text-slate-900">{fmt(item.val, { compact: true })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold">Risk Concentration</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <RiskItem label="Low Risk (Standard)" value={65} color="bg-emerald-500" />
                                    <RiskItem label="Medium Risk (Moderate)" value={25} color="bg-amber-500" />
                                    <RiskItem label="High Risk (Critical)" value={10} color="bg-red-600" />
                                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
                                        <span className="text-slate-500">Total Exposure</span>
                                        <span className="text-slate-900">{fmt(totals.receivable)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* CUSTOMER MASTER TAB */}
                    <TabsContent value="customers" className="mt-6">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-sm font-bold">Active Customer Registry</CardTitle>
                                    <CardDescription className="text-[10px]">Manage legal entities, credit limits, and GL mapping.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filter by name, TRN, or ID..."
                                        className="pl-9 h-9 text-xs"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b">
                                            <tr>
                                                <th className="px-6 py-3">Customer ID</th>
                                                <th className="px-6 py-3">Legal Name</th>
                                                <th className="px-6 py-3">Terms</th>
                                                <th className="px-6 py-3 text-right">Credit Limit</th>
                                                <th className="px-6 py-3 text-right">Balance</th>
                                                <th className="px-6 py-3 text-center">Risk</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customers.filter(c => c.legal_name.toLowerCase().includes(search.toLowerCase())).map(c => (
                                                <tr key={c._id} className="hover:bg-red-50/30 transition-colors group">
                                                    <td className="px-6 py-4 font-mono text-[11px] text-red-600 font-bold">{c.customer_id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-900">{c.legal_name}</div>
                                                        <div className="text-[10px] text-slate-500">TRN: {c.tax_registration_no || 'Pending'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="outline" className="text-[9px] font-bold h-5">{c.credit_terms}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs">{fmt(c.credit_limit)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{fmt(c.balance || 0)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <RiskRating rating={c.risk_rating} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 group-hover:text-red-600"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* INVOICE ENGINE TAB */}
                    <TabsContent value="invoices" className="mt-6">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0 text-white bg-slate-900 rounded-t-lg">
                                <div>
                                    <CardTitle className="text-sm font-bold">Revenue Document Ledger</CardTitle>
                                    <CardDescription className="text-[10px] text-slate-400">Postings, Approvals, and Recognition Workflow.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="border-red-600 text-red-500 font-bold">FY26 PERIOD 02</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b">
                                            <tr>
                                                <th className="px-6 py-3">Doc #</th>
                                                <th className="px-6 py-3">Customer</th>
                                                <th className="px-6 py-3">Due Date</th>
                                                <th className="px-6 py-3 text-right">Total</th>
                                                <th className="px-6 py-3 text-right">Balance</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Post</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {invoices.map(inv => (
                                                <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-red-600 text-xs">{inv.invoice_number}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold">{inv.customer_name}</div>
                                                        <div className="text-[10px] text-slate-500">Date: {new Date(inv.invoice_date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs">{fmt(inv.total_amount)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{fmt(inv.balance_due)}</td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={inv.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {inv.status === 'draft' ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-[10px] bg-red-600 hover:bg-red-700"
                                                                onClick={async () => {
                                                                    try {
                                                                        await postARInvoice(inv._id);
                                                                        toast.success('Invoice posted successfully');
                                                                        loadData();
                                                                    } catch {
                                                                        toast.error('Posting failed');
                                                                    }
                                                                }}
                                                            >
                                                                POST JE
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* CREDIT NOTES TAB */}
                    <TabsContent value="creditnotes" className="mt-6">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold">Credit Note Engine</CardTitle>
                                    <CardDescription className="text-[10px]">Returns, Rebates, and Adjustments Ledger.</CardDescription>
                                </div>
                                <Button className="h-8 text-[11px] font-bold bg-slate-900 border-red-600 border shadow-sm">
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Issue Credit Note
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <FinanceEmptyState
                                    icon={Ban}
                                    title="No Credit Notes Found"
                                    description="Issued credit notes and returns will appear here."
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* HISTORY TAB */}
                    <TabsContent value="history" className="mt-6">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold">Comprehensive AR Ledger History</CardTitle>
                                <CardDescription className="text-[10px]">Unfiltered audit trail of all AR-related postings.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y border-t">
                                    <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        <span className="col-span-2">Date</span>
                                        <span className="col-span-2">Type</span>
                                        <span className="col-span-4">Reference</span>
                                        <span className="col-span-2 text-right">Debit</span>
                                        <span className="col-span-2 text-right">Credit</span>
                                    </div>
                                    <div className="px-6 py-8 text-center text-slate-400 italic text-xs">
                                        End of ledger. All transactions reconciled.
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* AGING TAB */}
                    <TabsContent value="aging" className="mt-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="md:col-span-2 shadow-sm border-slate-200 bg-white">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-bold">Aging Bucket Analysis</CardTitle>
                                            <CardDescription className="text-[10px]">IFRS 9 Expected Credit Loss (ECL) Calculation bases.</CardDescription>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-red-600 hover:bg-red-50">RECALCULATE</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="grid grid-cols-5 gap-3 text-center mb-8">
                                        <AgingBucket label="Current" value={aging?.current || 0} total={aging?.total || 1} color="bg-emerald-500" />
                                        <AgingBucket label="1-30 Days" value={aging?.d30 || 0} total={aging?.total || 1} color="bg-blue-500" />
                                        <AgingBucket label="31-60 Days" value={aging?.d60 || 0} total={aging?.total || 1} color="bg-amber-500" />
                                        <AgingBucket label="61-90 Days" value={aging?.d90 || 0} total={aging?.total || 1} color="bg-orange-500" />
                                        <AgingBucket label="90+ Overdue" value={aging?.d90Plus || 0} total={aging?.total || 1} color="bg-red-600" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 border-b pb-2">
                                            <span className="col-span-6">Aging Bucket</span>
                                            <span className="col-span-3 text-right">Amount</span>
                                            <span className="col-span-3 text-right">ECL Provision</span>
                                        </div>
                                        <AgingRow label="Current (Good Standing)" amount={aging?.current || 0} rate={AGING_RATES.current} />
                                        <AgingRow label="1 - 30 Days (Minor Delays)" amount={aging?.d30 || 0} rate={AGING_RATES.d30} />
                                        <AgingRow label="31 - 60 Days (Watchlist)" amount={aging?.d60 || 0} rate={AGING_RATES.d60} />
                                        <AgingRow label="61 - 90 Days (Critical Watch)" amount={aging?.d90 || 0} rate={AGING_RATES.d90} />
                                        <AgingRow label="90+ Days (Default Risk)" amount={aging?.d90Plus || 0} rate={AGING_RATES.d90Plus} highlight />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">Bad Debt Provisioning</CardTitle>
                                    <CardDescription className="text-[10px]">Monthly ECL Posting Summary</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Required Provision</span>
                                        <span className="text-2xl font-black text-red-600 font-mono tracking-tighter">
                                            {formatCurrency(requiredProvision, baseCurrency)}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-xs h-9 font-bold">
                                            <FileText className="mr-2 h-3.5 w-3.5" /> Post Provision JE
                                        </Button>
                                        <Button variant="outline" className="w-full text-xs h-9 font-bold border-red-100 hover:text-red-600">
                                            <Ban className="mr-2 h-3.5 w-3.5" /> Write-Off Review (15)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardShell>
    );
}

// ── SUBCOMPONENTS ──────────────────────────────────────────────────────────

function KPICard({ label, value, sub, alert, warn, icon }: { label: string; value: string; sub?: string; alert?: boolean; warn?: boolean; icon: React.ReactNode }) {
    return (
        <Card className={cn(
            "shadow-sm border-slate-200 relative overflow-hidden transition-all group hover:border-red-500/50",
            alert && "bg-red-50/20 border-red-200",
            warn && "border-amber-200"
        )}>
            <div className={cn("absolute top-0 right-0 p-2 text-slate-200 group-hover:text-red-500/20", alert && "text-red-200")}>{icon}</div>
            <CardContent className="p-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <p className={cn("text-xl font-black tracking-tight font-mono", alert && "text-red-600", warn && "text-amber-600")}>{value}</p>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>
            </CardContent>
        </Card>
    );
}

function DropdownAction({ onAction }: { onAction: (type: any) => void }) {
    return (
        <div className="flex gap-2">
            <Button onClick={() => onAction('invoice')} className="h-8 text-[11px] font-bold bg-red-600 hover:bg-red-700 shadow-sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Invoice
            </Button>
            <Button variant="outline" onClick={() => onAction('payment')} className="h-8 text-[11px] font-bold border-slate-300 hover:border-red-200 hover:text-red-600">
                <Receipt className="mr-1.5 h-3.5 w-3.5" /> Record Receipt
            </Button>
            <Button variant="outline" onClick={() => onAction('customer')} className="h-8 text-[11px] font-bold border-slate-300 hover:bg-slate-50">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Customer
            </Button>
        </div>
    );
}

function RiskItem({ label, value, color }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-900">{value}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

function RiskRating({ rating }: { rating: string }) {
    const s = {
        low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        medium: 'bg-amber-50 text-amber-700 border-amber-100',
        high: 'bg-red-50 text-red-700 border-red-100'
    };
    return (
        <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-5", s[rating as keyof typeof s])}>
            {rating}
        </Badge>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s: any = {
        draft: 'bg-slate-100 text-slate-500 border-slate-200',
        sent: 'bg-blue-50 text-blue-600 border-blue-100',
        partial: 'bg-amber-50 text-amber-600 border-amber-100',
        paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        overdue: 'bg-red-50 text-red-600 border-red-100'
    };
    return (
        <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-5", s[status])}>
            {status}
        </Badge>
    );
}

function AgingBucket({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const { baseCurrency } = useCompanySettings();
    const pct = (value / total) * 100;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="text-[9px] font-black uppercase text-slate-400">{label}</div>
            <div className="relative h-20 w-3 rounded-full bg-slate-100 overflow-hidden flex flex-col justify-end">
                <div className={cn("w-full rounded-full transition-all duration-1000", color)} style={{ height: `${pct}%` }} />
            </div>
            <div className="text-[10px] font-bold text-slate-900">{formatCurrency(value, baseCurrency)}</div>
        </div>
    );
}

function AgingRow({ label, amount, rate, highlight }: { label: string; amount: number; rate: number; highlight?: boolean }) {
    const { baseCurrency } = useCompanySettings();
    const provision = amount * rate;
    return (
        <div className={cn("grid grid-cols-12 px-4 py-2.5 items-center rounded-lg text-[11px] transition-colors", highlight ? "bg-red-50 text-red-900 border border-red-100" : "hover:bg-slate-50 border border-transparent")}>
            <span className="col-span-6 font-bold">{label}</span>
            <span className="col-span-3 text-right font-mono font-bold">{formatCurrency(amount, baseCurrency)}</span>
            <span className="col-span-3 text-right font-mono text-red-600 font-black">{formatCurrency(provision, baseCurrency)}</span>
        </div>
    );
}

// ── FORMS ──────────────────────────────────────────────────────────────

function CustomerForm({ onSuccess }: { onSuccess: () => void }) {
    const { baseCurrency } = useCompanySettings();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        legal_name: '', trade_license_no: '', tax_registration_no: '',
        credit_limit: 0, credit_terms: 'Net 30'
    });

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createARCustomer({ ...formData, risk_rating: 'low' });
            toast.success('Customer Master Created');
            onSuccess();
        } catch {
            toast.error('Failed to create customer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal Business Name*</Label>
                    <Input required placeholder="Ex: Adroit Design India Pvt Ltd" className="h-9 text-sm" value={formData.legal_name} onChange={e => setFormData({ ...formData, legal_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade License No</Label>
                    <Input placeholder="TL-000000X" className="h-9 text-sm" value={formData.trade_license_no} onChange={e => setFormData({ ...formData, trade_license_no: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">VAT / TRN No</Label>
                    <Input placeholder="100XXXXXXXXXXXX" className="h-9 text-sm" value={formData.tax_registration_no} onChange={e => setFormData({ ...formData, tax_registration_no: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Credit Limit ({baseCurrency})</Label>
                    <Input type="number" className="h-9 text-sm font-mono" value={formData.credit_limit} onChange={e => setFormData({ ...formData, credit_limit: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Credit Terms</Label>
                    <Select value={formData.credit_terms} onValueChange={(v) => setFormData({ ...formData, credit_terms: v })}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 h-10 font-bold">
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Confirm Customer Master Data
            </Button>
        </form>
    );
}

function InvoiceForm({ customers, onSuccess }: { customers: any[], onSuccess: () => void }) {
    const { baseCurrency, taxRate, taxName } = useCompanySettings();
    const [loading, setLoading] = useState(false);
    const [lines, setLines] = useState<any[]>([{ description: '', quantity: 1, unit_price: 0, tax_rate: taxRate, amount: 0, tax_amount: 0, total: 0 }]);
    const [customerId, setCustomerId] = useState('');
    const [dueDate, setDueDate] = useState('');

    const calc = (q: number, p: number, t: number) => {
        const amt = q * p;
        const tax = amt * (t / 100);
        return { amt, tax, tot: amt + tax };
    };

    const updateLine = (idx: number, field: string, val: any) => {
        const newLines = [...lines];
        newLines[idx][field] = val;
        const { amt, tax, tot } = calc(newLines[idx].quantity, newLines[idx].unit_price, newLines[idx].tax_rate);
        newLines[idx].amount = amt;
        newLines[idx].tax_amount = tax;
        newLines[idx].total = tot;
        setLines(newLines);
    };

    const sub = lines.reduce((s, l) => s + l.amount, 0);
    const tax = lines.reduce((s, l) => s + l.tax_amount, 0);
    const total = sub + tax;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!customerId) return toast.error('Select customer');
        setLoading(true);
        try {
            const cust = customers.find(c => c.customer_id === customerId);
            await createARInvoice({
                customer_id: customerId,
                customer_name: cust?.legal_name,
                invoice_date: new Date(),
                due_date: dueDate || new Date(Date.now() + 30 * 86400000),
                lines,
                status: 'draft'
            });
            toast.success('Invoice Created');
            onSuccess();
        } catch {
            toast.error('Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Select Customer Master</Label>
                    <Select onValueChange={setCustomerId}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Search Account..." /></SelectTrigger>
                        <SelectContent>
                            {customers.map(c => <SelectItem key={c.customer_id} value={c.customer_id}>{c.legal_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Payment Due Date</Label>
                    <Input type="date" className="h-9 text-xs" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-500 border-b">
                        <tr>
                            <th className="px-4 py-2 text-left">Description</th>
                            <th className="px-4 py-2 text-center w-20">Qty</th>
                            <th className="px-4 py-2 text-right w-32">Unit Price</th>
                            <th className="px-4 py-2 text-right w-24">{taxName} %</th>
                            <th className="px-4 py-2 text-right w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {lines.map((l, i) => (
                            <tr key={i}>
                                <td className="p-2"><Input value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} className="h-8 text-xs border-0 bg-transparent" /></td>
                                <td className="p-2 text-center"><Input type="number" value={l.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} className="h-8 text-xs text-center border-0" /></td>
                                <td className="p-2 text-right"><Input type="number" value={l.unit_price} onChange={e => updateLine(i, 'unit_price', Number(e.target.value))} className="h-8 text-xs text-right border-0 font-mono" /></td>
                                <td className="p-2 text-right font-mono text-slate-500">{taxRate}%</td>
                                <td className="p-2 text-right font-bold text-slate-900 px-4">{formatCurrency(l.total, baseCurrency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-2 border-t">
                <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500"><span>Subtotal (Net)</span><span className="font-mono">{formatCurrency(sub, baseCurrency)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>{taxName} ({taxRate}%)</span><span className="font-mono">{formatCurrency(tax, baseCurrency)}</span></div>
                    <div className="flex justify-between text-lg font-black pt-2 border-t border-slate-900 border-double">
                        <span className="text-red-600">Total Due</span>
                        <span className="font-mono">{formatCurrency(total, baseCurrency)}</span>
                    </div>
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-red-600 h-10 font-bold transition-all">
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate & Route Invoice for Approval
            </Button>
        </form>
    );
}

function PaymentForm({ customers, invoices, onSuccess }: { customers: any[], invoices: any[], onSuccess: () => void }) {
    const { baseCurrency } = useCompanySettings();
    const [loading, setLoading] = useState(false);
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState(0);
    const [ref, setRef] = useState('');

    const filteredInvoices = invoices.filter(i => i.customer_id === customerId && i.balance_due > 0);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!customerId || amount <= 0) return toast.error('Enter valid details');
        setLoading(true);
        try {
            // Very simple auto-allocation for demo
            let remaining = amount;
            const allocations = [];
            for (const inv of filteredInvoices) {
                if (remaining <= 0) break;
                const payAmt = Math.min(inv.balance_due, remaining);
                allocations.push({ invoice_id: inv._id, amount_allocated: payAmt });
                remaining -= payAmt;
            }

            await createARPayment({
                customer_id: customerId,
                amount_received: amount,
                reference_no: ref,
                allocations,
                payment_date: new Date()
            });
            toast.success('Payment Received & Allocated');
            onSuccess();
        } catch {
            toast.error('Payment processing failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Select Payer Customer</Label>
                    <Select onValueChange={setCustomerId}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Search Registry..." /></SelectTrigger>
                        <SelectContent>
                            {customers.map(c => <SelectItem key={c.customer_id} value={c.customer_id}>{c.legal_name} (Bal: {formatCurrency(c.balance || 0, baseCurrency)})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Amount Received (Receipt Value)</Label>
                    <Input type="number" required placeholder="0.00" className="h-10 text-lg font-black font-mono" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Reference / Transaction ID</Label>
                    <Input placeholder="E.g. Bank Ref #, Cheque #" className="h-10 text-sm" value={ref} onChange={e => setRef(e.target.value)} />
                </div>
            </div>

            {filteredInvoices.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Auto-Allocation Preview</h4>
                    <div className="space-y-2">
                        {filteredInvoices.slice(0, 3).map(inv => (
                            <div key={inv._id} className="flex justify-between items-center bg-white p-2 rounded-lg text-[11px] border shadow-xs">
                                <div><span className="font-bold text-red-600">{inv.invoice_number}</span> · Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                                <div className="font-black text-slate-900">{formatCurrency(inv.balance_due, baseCurrency)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 font-bold">
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Receipt className="mr-2 h-4 w-4" />}
                Confirm Receipt & Post Collection
            </Button>
        </form>
    );
}
