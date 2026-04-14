'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getExpenses, createExpense, deleteExpense } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Receipt, Search, Loader2, Trash2, DollarSign, Clock,
    TrendingDown, CheckCircle2, XCircle, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/use-currency';

const EXPENSE_CATEGORIES = [
    'Office Supplies', 'Travel', 'Software & Subscriptions', 'Marketing',
    'Utilities', 'Rent', 'Professional Fees', 'Insurance',
    'Equipment', 'Meals & Entertainment', 'Miscellaneous'
];

export default function ExpensesPage() {
    const { user } = useAuth();
    const { format: fmtCurrency, symbol } = useCurrency();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (user?.role === 'admin') fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getExpenses();
            setExpenses(data || []);
        } catch (error) {
            console.error('Expenses Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        const ok = await deleteExpense(id);
        if (ok) {
            toast.success('Expense deleted');
            fetchData();
        } else {
            toast.error('Failed to delete');
        }
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e =>
            (e.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (e.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (e.vendor?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        );
    }, [expenses, searchQuery]);

    const totalSpend = expenses.filter(e => ['approved', 'paid'].includes(e.status)).reduce((s, e) => s + Number(e.total || 0), 0);
    const pendingCount = expenses.filter(e => e.status === 'pending').length;

    if (!isMounted) return null;

    if (loading) {
        return (
            <DashboardShell requireAdmin>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading expenses...</p>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-6 pb-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Expenses</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Track and manage company spending
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search expenses..."
                                className="pl-9 h-9 w-64 text-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                    <Plus className="h-3.5 w-3.5" /> New Expense
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <ExpenseForm onSuccess={() => { setIsDialogOpen(false); fetchData(); }} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-border shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Spend</p>
                                    <p className="text-2xl font-bold">{fmtCurrency(totalSpend)}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">Approved & paid expenses</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Approval</p>
                                    <p className="text-2xl font-bold">{pendingCount}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">Awaiting review</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Records</p>
                                    <p className="text-2xl font-bold">{expenses.length}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Receipt className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">All expense entries</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Expenses Table */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-[15px] font-bold flex items-center gap-2">
                            <Receipt className="h-4 w-4" /> Expense Records
                        </CardTitle>
                        <CardDescription className="text-[12px]">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y border-t">
                            {filteredExpenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                                    <Receipt className="h-10 w-10 text-muted-foreground/30" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">No expenses recorded</p>
                                        <p className="text-[11px] text-muted-foreground">Click &quot;New Expense&quot; to add your first entry.</p>
                                    </div>
                                </div>
                            ) : filteredExpenses.map(exp => (
                                <div key={exp._id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                            <Receipt className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{exp.description}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                <span>{exp.category}</span>
                                                {exp.vendor && <><span>·</span><span>{exp.vendor}</span></>}
                                                <span>·</span>
                                                <span>{new Date(exp.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-3">
                                        <span className="text-sm font-bold">{fmtCurrency(Number(exp.total))}</span>
                                        <Badge variant={exp.status === 'paid' ? 'default' : exp.status === 'approved' ? 'secondary' : exp.status === 'rejected' ? 'destructive' : 'outline'} className="text-[9px]">
                                            {exp.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                                            onClick={() => handleDelete(exp._id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}

// --- Expense Form ---
function ExpenseForm({ onSuccess }: { onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        category: '', vendor: '', description: '', amount: '', tax_amount: '0', payment_method: 'bank_transfer'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!formData.description || !formData.amount || !formData.category) {
            toast.error('Fill in required fields');
            return;
        }
        setSubmitting(true);
        try {
            const total = Number(formData.amount) + Number(formData.tax_amount || 0);
            await createExpense({ ...formData, amount: Number(formData.amount), tax_amount: Number(formData.tax_amount), total });
            toast.success('Expense recorded');
            onSuccess();
        } catch {
            toast.error('Failed to record expense');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold">New Expense</h3>
                <p className="text-sm text-muted-foreground">Record a company expense.</p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs">Category *</Label>
                    <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Description *</Label>
                    <Input placeholder="What was this expense for?" className="h-9" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Vendor</Label>
                    <Input placeholder="e.g. Amazon, FedEx" className="h-9" value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Amount *</Label>
                        <Input type="number" placeholder="0.00" className="h-9" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Tax Amount</Label>
                        <Input type="number" placeholder="0.00" className="h-9" value={formData.tax_amount} onChange={e => setFormData({ ...formData, tax_amount: e.target.value })} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? 'Saving...' : 'Record Expense'}
            </Button>
        </div>
    );
}
