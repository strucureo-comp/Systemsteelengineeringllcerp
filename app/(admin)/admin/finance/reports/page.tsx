'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { useCurrency } from '@/lib/hooks/use-currency';
import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/finance/KpiCard';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { toast } from 'sonner';
import { getAccounts, getInvoices, getExpenses } from '@/lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportRow = { name: string; value: number };

function toISODate(date: Date) {
    return date.toISOString().split('T')[0];
}

function getCurrentMonthRange() {
    const today = new Date();
    return {
        start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: toISODate(today),
    };
}

function parseDate(value: any) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value: any, start: string, end: string) {
    const date = parseDate(value);
    if (!date) return false;
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!startDate || !endDate) return true;
    return date >= startDate && date <= endDate;
}

function expenseAmount(expense: any) {
    return Number(expense.total || expense.amount || 0);
}

function invoiceAmount(invoice: any) {
    return Number(invoice.total || invoice.amount || 0);
}

function expenseDate(expense: any) {
    return expense.date || expense.createdAt;
}

function invoiceDate(invoice: any) {
    return invoice.issue_date || invoice.date || invoice.createdAt;
}

function isDirectCost(expense: any) {
    const text = `${expense.category || ''} ${expense.description || ''}`.toLowerCase();
    return [
        'cogs',
        'cost of goods',
        'material',
        'materials',
        'inventory',
        'production',
        'subcontract',
        'project cost',
        'direct cost',
    ].some((keyword) => text.includes(keyword));
}

export default function FinancialReportingPage() {
    const { format: fmt, currencyCode } = useCurrency();
    const [tab, setTab] = useState('bs');
    const defaultRange = useMemo(() => getCurrentMonthRange(), []);
    const [draftStartDate, setDraftStartDate] = useState(defaultRange.start);
    const [draftEndDate, setDraftEndDate] = useState(defaultRange.end);
    const [reportRange, setReportRange] = useState(defaultRange);
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);

    useEffect(() => {
        let active = true;

        async function fetchData() {
            setLoading(true);
            try {
                const [accountsData, invoicesData, expensesData] = await Promise.all([
                    getAccounts().catch(() => []),
                    getInvoices().catch(() => []),
                    getExpenses().catch(() => []),
                ]);

                if (!active) return;
                setAccounts(accountsData || []);
                setInvoices(invoicesData || []);
                setExpenses(expensesData || []);
            } catch (error) {
                console.error('Failed to fetch financial data:', error);
                toast.error('Failed to load financial report data');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void fetchData();

        return () => {
            active = false;
        };
    }, []);

    const runReport = () => {
        if (!draftStartDate || !draftEndDate) {
            toast.error('Select a start and end date');
            return;
        }

        if (draftStartDate > draftEndDate) {
            toast.error('Start date cannot be after end date');
            return;
        }

        setReportRange({ start: draftStartDate, end: draftEndDate });
    };

    const filteredInvoices = useMemo(
        () => invoices.filter((invoice) => inRange(invoiceDate(invoice), reportRange.start, reportRange.end)),
        [invoices, reportRange]
    );

    const filteredExpenses = useMemo(
        () => expenses.filter((expense) => inRange(expenseDate(expense), reportRange.start, reportRange.end)),
        [expenses, reportRange]
    );

    const financialData = useMemo(() => {
        const assets = accounts.filter((account: any) => account.type === 'asset');
        const liabilities = accounts.filter((account: any) => account.type === 'liability');
        const equity = accounts.filter((account: any) => account.type === 'equity');

        const directCosts = filteredExpenses.filter(isDirectCost);
        const operatingExpenses = filteredExpenses.filter((expense) => !isDirectCost(expense));

        const totalAssets = assets.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0);
        const totalLiabilities = liabilities.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0);
        const totalEquity = equity.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0);
        const totalRevenue = filteredInvoices.reduce((sum: number, invoice: any) => sum + invoiceAmount(invoice), 0);
        const directCostTotal = directCosts.reduce((sum: number, expense: any) => sum + expenseAmount(expense), 0);
        const operatingExpenseTotal = operatingExpenses.reduce((sum: number, expense: any) => sum + expenseAmount(expense), 0);
        const totalExpenses = directCostTotal + operatingExpenseTotal;
        const grossProfit = totalRevenue - directCostTotal;
        const operatingIncome = grossProfit - operatingExpenseTotal;
        const operatingCash = totalRevenue - totalExpenses;

        return {
            assets: assets.map((account: any) => ({ name: account.name, value: Number(account.balance || 0) })),
            liabilities: liabilities.map((account: any) => ({ name: account.name, value: Number(account.balance || 0) })),
            equity: equity.map((account: any) => ({ name: account.name, value: Number(account.balance || 0) })),
            directCosts,
            operatingExpenses,
            totalAssets,
            totalLiabilities,
            totalEquity,
            totalRevenue,
            directCostTotal,
            operatingExpenseTotal,
            totalExpenses,
            grossProfit,
            operatingIncome,
            netIncome: operatingIncome,
            operatingCash,
        };
    }, [accounts, filteredExpenses, filteredInvoices]);

    const {
        assets,
        liabilities,
        equity,
        directCosts,
        operatingExpenses,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue,
        directCostTotal,
        operatingExpenseTotal,
        grossProfit,
        netIncome,
        operatingCash,
    } = financialData;

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`Financial Report: ${tab.toUpperCase()}`, 14, 22);
            doc.setFontSize(10);
            doc.text(`Period: ${reportRange.start} to ${reportRange.end}`, 14, 28);
            doc.text(`Currency: ${currencyCode}`, 14, 34);

            let head: string[][] = [];
            let body: string[][] = [];

            if (tab === 'bs') {
                head = [['Category', 'Account', 'Balance']];
                assets.forEach((row: ReportRow) => body.push(['Asset', row.name, fmt(row.value)]));
                liabilities.forEach((row: ReportRow) => body.push(['Liability', row.name, fmt(row.value)]));
                equity.forEach((row: ReportRow) => body.push(['Equity', row.name, fmt(row.value)]));
            } else if (tab === 'is') {
                head = [['Category', 'Description', 'Amount']];
                filteredInvoices.forEach((invoice: any) => body.push(['Revenue', invoice.customer_name || invoice.customerName || 'Invoice', fmt(invoiceAmount(invoice))]));
                directCosts.forEach((expense: any) => body.push(['Direct Cost', expense.description || expense.category || 'Expense', fmt(expenseAmount(expense))]));
                operatingExpenses.forEach((expense: any) => body.push(['Operating Expense', expense.description || expense.category || 'Expense', fmt(expenseAmount(expense))]));
                body.push(['', 'Net Income', fmt(netIncome)]);
            } else if (tab === 'cf') {
                head = [['Activity Type', 'Description', 'Amount']];
                body.push(['Operating Inflows', 'Revenue billed in period', fmt(totalRevenue)]);
                body.push(['Operating Outflows', 'Expense outflows in period', fmt(-1 * (directCostTotal + operatingExpenseTotal))]);
                body.push(['', 'Net Operating Cash', fmt(operatingCash)]);
            } else {
                head = [['Section', 'Notes']];
                body.push(['Budget Controls', 'Budget controls are not configured from source data in this workspace.']);
            }

            autoTable(doc, {
                startY: 40,
                head,
                body,
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38] },
            });

            doc.save(`Financial_Report_${tab}_${reportRange.end}.pdf`);
            toast.success('PDF export downloaded');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <FinancePageHeader
                title="Financial Reporting"
                subtitle="Balance Sheet · P&L · Cash Movement · Budget Controls"
                icon={BarChart3}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-[10px] h-8"
                        onClick={handleExportPDF}
                        disabled={exporting || loading}
                    >
                        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {exporting ? 'Generating...' : 'Export PDF'}
                    </Button>
                }
            />

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <Card className="border-border shadow-sm w-full md:w-auto shrink-0 bg-muted/30">
                    <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-end gap-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Start Date</Label>
                            <Input type="date" value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">End Date</Label>
                            <Input type="date" value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)} className="h-8 text-xs font-mono" />
                        </div>
                        <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700" onClick={runReport} disabled={loading}>
                            Apply Report
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 w-full">
                    <KpiCard label="Total Assets" value={fmt(totalAssets)} />
                    <KpiCard label="Gross Profit" value={fmt(grossProfit)} />
                    <KpiCard label="Net Income" value={fmt(netIncome)} positive={netIncome >= 0} />
                    <KpiCard label="Operating Cash" value={fmt(operatingCash)} positive={operatingCash >= 0} />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="bg-muted/50 border h-9 p-0.5">
                        <TabsTrigger value="bs" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Balance Sheet</TabsTrigger>
                        <TabsTrigger value="is" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Income Statement</TabsTrigger>
                        <TabsTrigger value="cf" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Cash Movement</TabsTrigger>
                        <TabsTrigger value="bva" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Budget Controls</TabsTrigger>
                    </TabsList>

                    <TabsContent value="bs" className="mt-6">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2 border-b">
                                <CardTitle className="text-sm">Statement of Financial Position</CardTitle>
                                <CardDescription className="text-[11px]">As at {new Date(reportRange.end).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    <SectionHeader title="ASSETS" />
                                    {assets.map((row: ReportRow) => <LineItem key={row.name} name={row.name} value={fmt(row.value)} />)}
                                    <TotalLine label="Total Assets" value={fmt(totalAssets)} />

                                    <SectionHeader title="LIABILITIES" />
                                    {liabilities.map((row: ReportRow) => <LineItem key={row.name} name={row.name} value={fmt(row.value)} />)}
                                    <TotalLine label="Total Liabilities" value={fmt(totalLiabilities)} />

                                    <SectionHeader title="EQUITY" />
                                    {equity.map((row: ReportRow) => <LineItem key={row.name} name={row.name} value={fmt(row.value)} />)}
                                    <TotalLine label="Total Equity" value={fmt(totalEquity)} />

                                    <TotalLine label="Liabilities + Equity" value={fmt(totalLiabilities + totalEquity)} highlight />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="is" className="mt-6">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2 border-b">
                                <CardTitle className="text-sm">Income Statement</CardTitle>
                                <CardDescription className="text-[11px]">For the period {new Date(reportRange.start).toLocaleDateString()} to {new Date(reportRange.end).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    <SectionHeader title="REVENUE" />
                                    {filteredInvoices.length > 0 ? filteredInvoices.map((invoice: any) => (
                                        <LineItem
                                            key={invoice._id || invoice.id}
                                            name={invoice.customer_name || invoice.customerName || invoice.description || 'Sales'}
                                            value={fmt(invoiceAmount(invoice))}
                                        />
                                    )) : <EmptySection label="No revenue recorded in the selected period" />}
                                    <TotalLine label="Total Revenue" value={fmt(totalRevenue)} />

                                    <SectionHeader title="DIRECT COSTS" />
                                    {directCosts.length > 0 ? directCosts.map((expense: any) => (
                                        <LineItem
                                            key={expense._id || expense.id}
                                            name={expense.description || expense.category || 'Direct Cost'}
                                            value={`(${fmt(expenseAmount(expense))})`}
                                            negative
                                        />
                                    )) : <EmptySection label="No direct costs identified in the selected period" />}
                                    <TotalLine label="Gross Profit" value={fmt(grossProfit)} highlight />

                                    <SectionHeader title="OPERATING EXPENSES" />
                                    {operatingExpenses.length > 0 ? operatingExpenses.map((expense: any) => (
                                        <LineItem
                                            key={expense._id || expense.id}
                                            name={expense.description || expense.category || 'Expense'}
                                            value={`(${fmt(expenseAmount(expense))})`}
                                            negative
                                        />
                                    )) : <EmptySection label="No operating expenses recorded in the selected period" />}
                                    <TotalLine label="Operating Income" value={fmt(grossProfit - operatingExpenseTotal)} />
                                    <TotalLine label="Net Income" value={fmt(netIncome)} highlight />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cf" className="mt-6">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2 border-b">
                                <CardTitle className="text-sm">Cash Movement Summary</CardTitle>
                                <CardDescription className="text-[11px]">Derived from billed revenue and recorded expenses for the selected period</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    <SectionHeader title="OPERATING INFLOWS" />
                                    <LineItem name="Revenue billed during period" value={fmt(totalRevenue)} />

                                    <SectionHeader title="OPERATING OUTFLOWS" />
                                    <LineItem name="Direct cost outflows" value={`(${fmt(directCostTotal)})`} negative />
                                    <LineItem name="Operating expense outflows" value={`(${fmt(operatingExpenseTotal)})`} negative />

                                    <TotalLine label="Net Operating Cash" value={fmt(operatingCash)} highlight />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="bva" className="mt-6">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2 border-b">
                                <CardTitle className="text-sm">Budget Controls</CardTitle>
                                <CardDescription className="text-[11px]">Budget variance requires configured budget baselines</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    Budget controls are not configured from source data in this workspace, so the system will not invent budget numbers.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Once department or account budgets are configured, this tab can show budget vs actual with real variances.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="px-6 py-2 bg-muted/30 border-y">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
        </div>
    );
}

function EmptySection({ label }: { label: string }) {
    return <div className="px-6 py-3 text-xs text-muted-foreground">{label}</div>;
}

function LineItem({ name, value, negative }: { name: string; value: string; negative?: boolean }) {
    return (
        <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
            <span className="text-xs text-muted-foreground">{name}</span>
            <span className={cn('text-xs font-medium tracking-tight', negative && 'text-red-600 font-bold')}>{value}</span>
        </div>
    );
}

function TotalLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={cn('flex items-center justify-between px-6 py-3', highlight ? 'bg-red-50 border-t border-red-200' : 'bg-muted/10 border-t')}>
            <span className={cn('text-xs font-bold uppercase tracking-wider', highlight && 'text-red-700')}>{label}</span>
            <span className={cn('text-sm font-bold tracking-tight', highlight && 'text-red-600')}>{value}</span>
        </div>
    );
}
