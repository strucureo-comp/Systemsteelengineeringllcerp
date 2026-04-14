'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, getCustomers, convertLeadToCustomer } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Briefcase, Search, Plus, DollarSign, Calendar, Target, ChevronRight, Edit2, Trash2, AlertCircle, Clock, ArrowRightCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import type { Opportunity, CustomerAccount, FollowUp, OpportunityStage } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Skeleton } from '@/components/ui/skeleton';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

function isOverdue(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    return d < today && d.toDateString() !== today.toDateString();
}

function isToday(dateStr: string) {
    return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isClosingSoon(dateStr: string) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
}

export default function SalesOpportunitiesPage() {
    const { user } = useAuth();
    const { companyProfile } = useTenant();
    const { baseCurrency } = useCompanySettings();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [customers, setCustomers] = useState<CustomerAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const isRetail = companyProfile?.businessType === 'b2c_retail';

    const [formData, setFormData] = useState({
        name: '', account_id: '', amount: 0, stage: 'new_lead' as OpportunityStage, probability: 10, close_date: '',
        followUps: [] as FollowUp[]
    });

    const [newFollowUp, setNewFollowUp] = useState({
        type: 'Call' as 'Call' | 'Email' | 'Meeting' | 'Site Visit',
        scheduledAt: '',
        status: 'Pending' as 'Pending' | 'Completed' | 'Missed',
        notes: '',
        priority: 'Medium' as 'Low' | 'Medium' | 'High'
    });

    useEffect(() => {
        if (user?.role === 'admin') fetchData();
    }, [user]);

    // Check for customer data from localStorage (when creating opportunity from customer details)
    useEffect(() => {
        const customerData = localStorage.getItem('newOpportunityCustomer');
        if (customerData) {
            try {
                const customer = JSON.parse(customerData);
                setFormData(prev => ({
                    ...prev,
                    name: `New Deal - ${customer.name}`,
                    account_id: customer.id
                }));
                setIsCreateOpen(true);
                localStorage.removeItem('newOpportunityCustomer');
            } catch (e) {
                console.error('Failed to parse customer data:', e);
            }
        }
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [opps, custs] = await Promise.all([getOpportunities(), getCustomers()]);
            // Auto mark missed logic could be put here before setting state
            const mappedOpps = (opps || []).map((o: any) => {
                if (o.followUps) {
                    o.followUps = o.followUps.map((f: FollowUp) => {
                        if (f.status === 'Pending' && isOverdue(f.scheduledAt)) {
                            return { ...f, status: 'Missed' };
                        }
                        return f;
                    });
                }
                return o;
            });
            setOpportunities(mappedOpps as any);
            setCustomers(custs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const STAGES = [
        { id: 'new_lead', label: 'New Lead', color: 'bg-zinc-400' },
        { id: 'contacted', label: 'Contacted', color: 'bg-blue-400' },
        { id: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
        { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-primary/70' },
        { id: 'negotiation', label: 'Negotiation', color: 'bg-primary' },
        { id: 'won', label: 'Won', color: 'bg-emerald-500' },
        { id: 'lost', label: 'Lost', color: 'bg-red-500' },
    ];

    const filteredOpportunities = useMemo(() => {
        return opportunities.filter(o =>
            o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.account?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [opportunities, searchQuery]);

    const kpiStats = useMemo(() => {
        let totalVal = 0;
        let weightedVal = 0;
        let closingThisMonth = 0;

        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();

        filteredOpportunities.forEach(o => {
            if (o.stage !== 'lost') {
                totalVal += Number(o.amount) || 0;
                weightedVal += (Number(o.amount) || 0) * ((o.probability || 0) / 100);
                if (o.close_date) {
                    const cd = new Date(o.close_date);
                    if (cd.getMonth() === thisMonth && cd.getFullYear() === thisYear) {
                        closingThisMonth++;
                    }
                }
            }
        });

        return { totalVal, weightedVal, closingThisMonth };
    }, [filteredOpportunities]);

    const handleSubmit = async () => {
        if (!formData.name) return toast.error('Name is required');
        // Account is optional - if not provided, it's treated as a lead
        try {
            if (editingId) {
                await updateOpportunity(editingId, formData);
                toast.success('Deal updated');
            } else {
                await createOpportunity(formData);
                toast.success('Deal created');
            }
            setIsCreateOpen(false);
            setEditingId(null);
            fetchData();
            setFormData({ name: '', account_id: '', amount: 0, stage: 'new_lead', probability: 10, close_date: '', followUps: [] });
        } catch { toast.error(editingId ? 'Failed to update deal' : 'Failed to create deal'); }
    };

    const handleEdit = (opp: Opportunity) => {
        setFormData({
            name: opp.name,
            account_id: opp.account_id || '',
            amount: Number(opp.amount) || 0,
            stage: opp.stage,
            probability: opp.probability || 10,
            close_date: opp.close_date || '',
            followUps: [...(opp.followUps || [])]
        });
        setEditingId(opp.id);
        setIsCreateOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this deal?')) return;
        try {
            await deleteOpportunity(id);
            toast.success('Deal deleted');
            fetchData();
        } catch { toast.error('Failed to delete deal'); }
    };

    const handleConvertToCustomer = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Move this lead to the next stage (Contacted)?')) return;
        try {
            // Find the opportunity
            const opp = opportunities.find(o => o.id === id);
            if (!opp) return;

            // Move to next stage (from new_lead to contacted)
            const nextStage = opp.stage === 'new_lead' ? 'contacted' : opp.stage;
            const updatedProbability = nextStage === 'contacted' ? 20 : opp.probability;

            await updateOpportunity(id, { 
                ...opp, 
                stage: nextStage,
                probability: updatedProbability 
            });
            toast.success('Lead moved to next stage successfully!');
            fetchData();
        } catch (err) {
            console.error('Move stage error:', err);
            toast.error('Failed to move lead to next stage');
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsCreateOpen(open);
        if (!open) {
            setEditingId(null);
            setFormData({ name: '', account_id: '', amount: 0, stage: 'new_lead', probability: 10, close_date: '', followUps: [] });
            setNewFollowUp({ type: 'Call', scheduledAt: '', status: 'Pending', notes: '', priority: 'Medium' });
        }
    };

    const addFollowUp = () => {
        if (!newFollowUp.scheduledAt || !newFollowUp.type) return toast.error('Type and Date required');
        setFormData(prev => ({
            ...prev,
            followUps: [...prev.followUps, { ...newFollowUp, id: generateRef('FUP') }]
        }));
        setNewFollowUp({ type: 'Call', scheduledAt: '', status: 'Pending', notes: '', priority: 'Medium' });
    };

    const removeFollowUp = (id: string) => {
        setFormData(prev => ({
            ...prev,
            followUps: prev.followUps.filter(f => f.id !== id)
        }));
    };

    const getStageOpps = (stageId: string) => filteredOpportunities.filter(o => o.stage === stageId);

    const formatCurrencyValue = (n: number) => {
        return formatCurrency(n, baseCurrency, { compact: true });
    };

    if (loading) {
        return (
            <DashboardShell requireAdmin>
                <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
                    <div className="flex justify-between items-center border-b pb-6">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48 bg-muted" />
                            <Skeleton className="h-3 w-32 bg-muted" />
                        </div>
                        <Skeleton className="h-10 w-40 bg-muted" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="border-border shadow-sm">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-2 w-full">
                                        <Skeleton className="h-3 w-24 bg-muted" />
                                        <Skeleton className="h-8 w-32 bg-muted" />
                                    </div>
                                    <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-[320px] flex-shrink-0 space-y-4">
                                <Skeleton className="h-16 w-full bg-muted rounded-md" />
                                <Skeleton className="h-40 w-full bg-muted rounded-md" />
                                <Skeleton className="h-40 w-full bg-muted rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </DashboardShell>
        );
    }

    if (isRetail) {
        return (
            <DashboardShell requireAdmin>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold">Not Applicable</h2>
                    <p className="text-muted-foreground mt-2">Opportunities pipeline is disabled for Retail/B2C operations.</p>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-7xl mx-auto pb-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">Opportunities & Leads</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Sales Pipeline</span>
                                <Badge variant="secondary" className="hidden sm:inline-flex font-bold uppercase text-[9px] tracking-widest bg-slate-100 text-slate-600">
                                    Lead to Deal
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search deals..." className="pl-9 h-10 w-64 border-border bg-background" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>

                            {/* Single Create Opportunity Button */}
                            <Dialog open={isCreateOpen} onOpenChange={handleOpenChange}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-10 gap-2 font-bold shadow-sm">
                                        <Plus className="h-4 w-4" /> New Opportunity
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                    <DialogHeader className="sr-only">
                                        <DialogTitle>{editingId ? 'Edit Deal' : 'Create Opportunity'}</DialogTitle>
                                        <DialogDescription>{editingId ? 'Update deal details and follow-ups' : 'Add a new opportunity to the pipeline (with or without linked customer)'}</DialogDescription>
                                    </DialogHeader>
                                    <div className="bg-background flex-1 overflow-y-auto w-full flex flex-col">
                                        <div className="p-6 border-b border-border shrink-0">
                                            <h3 className="text-xl font-bold tracking-tight text-foreground">{editingId ? 'Edit Deal' : 'Create Opportunity'}</h3>
                                            <p className="text-muted-foreground text-xs mt-0.5">{editingId ? 'Update deal details and follow-ups' : 'Add a new opportunity to the pipeline'}</p>
                                        </div>
                                        <div className="p-6 space-y-6 flex-1">

                                            {/* DEAL DETAILS SECTION */}
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-sm text-foreground flex items-center border-b border-border pb-2">Deal Information</h4>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold">Opportunity Name</Label>
                                                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-10 bg-background" placeholder="Q3 License Deal" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">Customer Account <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                                                        <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                                                            <SelectTrigger className="h-10 bg-background text-sm">
                                                                <SelectValue placeholder="Select Account or Leave Empty for Lead" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {customers.map(c => (
                                                                    <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">Pipeline Stage</Label>
                                                        <Select value={formData.stage} onValueChange={v => setFormData({ ...formData, stage: v as OpportunityStage })}>
                                                            <SelectTrigger className="h-10 bg-background text-sm">
                                                                <SelectValue placeholder="Select Stage" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {STAGES.map(s => (
                                                                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">Amount ({baseCurrency})</Label>
                                                        <Input type="number" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="h-10 bg-background" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">Probability (%)</Label>
                                                        <Input type="number" value={formData.probability || ''} onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })} className="h-10 bg-background" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">Close Date</Label>
                                                        <Input type="date" value={formData.close_date} onChange={e => setFormData({ ...formData, close_date: e.target.value })} className="h-10 bg-background" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FOLLOW-UP TIMELINE SECTION */}
                                            <div className="space-y-4 pt-4 border-t border-border">
                                                <h4 className="font-bold text-sm text-foreground flex items-center border-b border-border pb-2">Follow-Up Workflow</h4>

                                                {/* Pending Add Form */}
                                                <div className="bg-muted/30 p-3 rounded-md border border-border flex items-end gap-2">
                                                    <div className="space-y-1.5 flex-1">
                                                        <Label className="text-xs font-bold">Type</Label>
                                                        <Select value={newFollowUp.type} onValueChange={v => setNewFollowUp({ ...newFollowUp, type: v as any })}>
                                                            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {['Call', 'Email', 'Meeting', 'Site Visit'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <Label className="text-xs font-bold">Date/Time</Label>
                                                        <Input type="datetime-local" className="h-8 text-xs bg-background" value={newFollowUp.scheduledAt} onChange={e => setNewFollowUp({ ...newFollowUp, scheduledAt: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1 w-full max-w-[200px]">
                                                        <Label className="text-xs font-bold">Notes</Label>
                                                        <Input placeholder="Short note..." className="h-8 text-xs bg-background" value={newFollowUp.notes} onChange={e => setNewFollowUp({ ...newFollowUp, notes: e.target.value })} />
                                                    </div>
                                                    <Button size="sm" onClick={addFollowUp} className="h-8 font-bold whitespace-nowrap shadow-sm text-xs px-3 bg-foreground text-background hover:bg-foreground/80">Add Follow-up</Button>
                                                </div>

                                                {/* Timeline */}
                                                <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto">
                                                    {formData.followUps.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground italic">No follow-ups recorded.</p>
                                                    ) : (
                                                        [...formData.followUps].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map(f => (
                                                            <div key={f.id} className="flex items-center justify-between bg-card border border-border p-2 rounded-sm text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                                        f.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                                                                            f.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                                                    )}>
                                                                        {f.status}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-bold text-foreground">{f.type}</span>
                                                                        <span className="text-muted-foreground">{new Date(f.scheduledAt).toLocaleString()}</span>
                                                                    </div>
                                                                    {f.notes && <span className="text-muted-foreground truncate max-w-[150px]">— {f.notes}</span>}
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFollowUp(f.id)}>
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                            </div>

                                        </div>
                                        <div className="p-6 border-t border-border flex justify-end shrink-0">
                                            <Button onClick={handleSubmit} className="h-10 px-8 font-bold text-sm">{editingId ? 'Save Deal Changes' : 'Create Deal'}</Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* KPI Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Pipeline Value</p>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(kpiStats.totalVal)}</p>
                                </div>
                                <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Weighted Pipeline</p>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{formatCurrencyValue(kpiStats.weightedVal)}</p>
                                </div>
                                <div className="h-10 w-10 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                                    <Target className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Deals Closing This Month</p>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{kpiStats.closingThisMonth}</p>
                                </div>
                                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kanban Board */}
                    <div className="flex gap-6 overflow-x-auto pb-6">
                        {STAGES.map(stage => {
                            const stageOpps = getStageOpps(stage.id);
                            const totalValue = stageOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0);

                            // Determine column header styling
                            const isLost = stage.id === 'lost';
                            const isWon = stage.id === 'won';

                            return (
                                <div key={stage.id} className="w-[320px] flex-shrink-0 flex flex-col gap-4">
                                    <div className={cn(
                                        "flex flex-col gap-2 p-3 rounded-md border",
                                        isWon ? "bg-emerald-500/5 border-emerald-500/20" :
                                            isLost ? "bg-red-500/5 border-red-500/20" : "bg-muted/10 border-border"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
                                                <span className="font-bold text-xs text-foreground uppercase tracking-widest">{stage.label}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] font-bold bg-background">{stageOpps.length}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center pt-1 mt-1 border-t border-border/50">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pipeline Val</span>
                                            <span className={cn(
                                                "text-xs font-bold",
                                                isWon ? "text-emerald-600 dark:text-emerald-400" :
                                                    isLost ? "text-red-600 dark:text-red-400" : "text-foreground"
                                            )}>{formatCurrencyValue(totalValue)}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 min-h-[300px]">
                                        {stageOpps.map((opp, idx) => {

                                            const closingSoon = isClosingSoon(opp.close_date || '');

                                            // Handle Follow Up Badge logic
                                            let pendingFollowUp = null;
                                            if (opp.followUps && opp.followUps.length > 0) {
                                                const pendings = opp.followUps.filter(f => f.status === 'Pending' || f.status === 'Missed');
                                                if (pendings.length > 0) {
                                                    // Get nearest
                                                    pendingFollowUp = pendings.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
                                                }
                                            }

                                            let badgeColor = "bg-muted text-muted-foreground";
                                            let badgeLabel = "No Action Set";

                                            if (pendingFollowUp) {
                                                if (pendingFollowUp.status === 'Missed' || isOverdue(pendingFollowUp.scheduledAt)) {
                                                    badgeColor = "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20";
                                                    badgeLabel = "Overdue Action";
                                                } else if (isToday(pendingFollowUp.scheduledAt)) {
                                                    badgeColor = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20";
                                                    badgeLabel = "Action Today";
                                                } else {
                                                    badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
                                                    badgeLabel = `Action on ${new Date(pendingFollowUp.scheduledAt).toLocaleDateString()}`;
                                                }
                                            }

                                            const isCardOverdue = pendingFollowUp && (pendingFollowUp.status === 'Missed' || isOverdue(pendingFollowUp.scheduledAt));

                                            return (
                                                <Card
                                                    key={opp.id}
                                                    className={cn(
                                                        "border-border shadow-sm bg-card transition-all group overflow-hidden",
                                                        isCardOverdue ? "border-red-500/50 hover:border-red-500" : "hover:border-primary/40"
                                                    )}
                                                >
                                                    {isCardOverdue && <div className="h-1 w-full bg-red-500" />}
                                                    <CardContent className="p-4 space-y-4">

                                                        {/* Top Row: Name and Closing Warning */}
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="space-y-1 w-full">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-sm text-foreground leading-tight">{opp.name}</h4>
                                                                    {(opp as any).is_lead && (
                                                                        <Badge variant="secondary" className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                            LEAD
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                                    <Briefcase size={10} className="shrink-0" />
                                                                    <span className="truncate">
                                                                        {(opp as any).is_lead
                                                                            ? `${(opp as any).first_name || ''} ${(opp as any).last_name || ''} ${(opp as any).company ? `- ${(opp as any).company}` : ''}`.trim()
                                                                            : opp.account?.name || 'Unknown Account'
                                                                        }
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            {closingSoon && !isWon && !isLost && (
                                                                <div className="flex-shrink-0 bg-amber-500/10 p-1.5 rounded-full" title="Closing inside 3 days">
                                                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(opp as any).is_lead && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px]"
                                                                onClick={(e) => handleConvertToCustomer(opp.id, e)}
                                                                title="Move to next stage"
                                                            >
                                                                <ArrowRightCircle size={12} className="mr-1" />
                                                                Next Stage
                                                            </Button>
                                                        )}

                                                        {/* Follow-up Badge */}
                                                        <div className="flex items-center">
                                                            <div className={cn("text-[10px] px-2 py-0.5 rounded-sm font-bold flex items-center gap-1.5", badgeColor)}>
                                                                <Clock className="h-3 w-3" />
                                                                {badgeLabel}
                                                            </div>
                                                        </div>

                                                        {/* Bottom Stats & Actions */}
                                                        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-3">
                                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm bg-muted/40 hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleEdit(opp); }}>
                                                                    <Edit2 size={12} className="text-muted-foreground hover:text-primary" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm bg-muted/40 hover:bg-muted" onClick={(e) => handleDelete(opp.id, e)}>
                                                                    <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-auto text-right">
                                                                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-transparent border-border text-muted-foreground">{opp.probability}%</Badge>
                                                                <span className="text-sm font-bold text-foreground">{formatCurrencyValue(Number(opp.amount))}</span>
                                                            </div>
                                                        </div>

                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                        {stageOpps.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/5">
                                                <p className="text-lg font-medium">No records found</p>
                                                <p className="text-sm mt-1">Records will appear here once added</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}
