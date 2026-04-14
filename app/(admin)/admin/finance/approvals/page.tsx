'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    ShieldCheck, ChevronLeft, Plus, Lock, ArrowRight, FileText,
    CreditCard, ArrowRightLeft, BookOpen, Building2, Scale,
    Trash2, Edit2, AlertTriangle, Users
} from 'lucide-react';
import { useCurrency } from '@/lib/hooks/use-currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    getApprovalWorkflowsV2, createApprovalWorkflowV2, updateApprovalWorkflowV2,
    toggleApprovalWorkflowV2, deleteApprovalWorkflowV2,
    getSodRules as apiGetSodRules, createSodRule as apiCreateSodRule,
    toggleSodRule as apiToggleSodRule, deleteSodRule as apiDeleteSodRule,
} from '@/lib/api';

// ── REFERENCE CONSTANTS (system structure, not mock data) ──────────────────────
const DOCUMENT_TYPES = [
    { id: 'vendor_bill', label: 'Vendor Bill', icon: FileText },
    { id: 'payment_run', label: 'Payment Run', icon: CreditCard },
    { id: 'journal_entry', label: 'Journal Entry', icon: BookOpen },
    { id: 'credit_note', label: 'Credit Note', icon: ArrowRightLeft },
    { id: 'customer_refund', label: 'Customer Refund', icon: ArrowRightLeft },
    { id: 'asset_disposal', label: 'Asset Disposal', icon: Trash2 },
    { id: 'ic_journal', label: 'Intercompany Journal', icon: Building2 },
    { id: 'expense_claim', label: 'Expense Claim', icon: CreditCard },
    { id: 'tax_adjustment', label: 'Tax Adjustment', icon: Scale },
];

const ROLE_OPTIONS = [
    { id: 'ap_accountant', label: 'AP Accountant' },
    { id: 'ar_accountant', label: 'AR Accountant' },
    { id: 'tax_officer', label: 'Tax Officer' },
    { id: 'treasury_officer', label: 'Treasury Officer' },
    { id: 'cost_accountant', label: 'Cost Accountant' },
    { id: 'financial_controller', label: 'Financial Controller' },
    { id: 'cfo', label: 'CFO' },
    { id: 'bill_approver_l1', label: 'Bill Approver L1' },
    { id: 'bill_approver_l2', label: 'Bill Approver L2' },
    { id: 'payment_authorizer', label: 'Payment Authorizer' },
    { id: 'journal_reviewer', label: 'Journal Reviewer' },
    { id: 'ic_reviewer', label: 'IC Reviewer' },
    { id: 'executive_approver', label: 'Executive Approver' },
];

const CONDITION_FIELDS = [
    { id: 'amount', label: 'Amount', type: 'number' },
    { id: 'currency', label: 'Currency', type: 'select' },
    { id: 'entity', label: 'Entity / Company', type: 'select' },
    { id: 'department', label: 'Department', type: 'select' },
    { id: 'cost_center', label: 'Cost Center', type: 'select' },
    { id: 'gl_account_type', label: 'GL Account Type', type: 'select' },
    { id: 'vendor_risk', label: 'Vendor Risk Rating', type: 'select' },
    { id: 'payment_method', label: 'Payment Method', type: 'select' },
    { id: 'tax_impact', label: 'Tax Impact Flag', type: 'boolean' },
    { id: 'cross_border', label: 'Cross-Border Flag', type: 'boolean' },
];

const FUNCTIONAL_ROLES = [
    { id: 'ap_accountant', label: 'AP Accountant', scope: 'Accounts Payable', level: 'operational' },
    { id: 'ar_accountant', label: 'AR Accountant', scope: 'Accounts Receivable', level: 'operational' },
    { id: 'tax_officer', label: 'Tax Officer', scope: 'Tax Compliance', level: 'specialist' },
    { id: 'treasury_officer', label: 'Treasury Officer', scope: 'Cash & Banking', level: 'specialist' },
    { id: 'cost_accountant', label: 'Cost Accountant', scope: 'Inventory & COGS', level: 'specialist' },
    { id: 'financial_controller', label: 'Financial Controller', scope: 'All Finance', level: 'control' },
    { id: 'cfo', label: 'Chief Financial Officer', scope: 'Enterprise', level: 'executive' },
];

// ── TYPES ──────────────────────────────────────────────────────────────────────
interface Condition { field: string; operator: string; value: string; }
interface Stage { order: number; role: string; mode: 'sequential' | 'parallel'; escalateAfterHrs: number; }
interface Workflow {
    id: string; name: string; docType: string; enabled: boolean;
    conditions: Condition[]; stages: Stage[];
    autoReject: boolean; autoRejectDays: number;
}
interface SodRule {
    id: string; rule: string; applies: string; risk: 'critical' | 'high' | 'medium';
    enforced: boolean;
}

// ── PAGE ───────────────────────────────────────────────────────────────────────
export default function ApprovalsPage() {
    const { format: fmt } = useCurrency();
    const [tab, setTab] = useState('workflows');
    const [selectedDocType, setSelectedDocType] = useState<string>('vendor_bill');

    // ── STATE ──
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [sodRules, setSodRules] = useState<SodRule[]>([]);

    // ── DIALOGS ──
    const [wfDialogOpen, setWfDialogOpen] = useState(false);
    const [sodDialogOpen, setSodDialogOpen] = useState(false);
    const [editingWf, setEditingWf] = useState<Workflow | null>(null);
    const [editingSod, setEditingSod] = useState<SodRule | null>(null);

    // ── LOAD FROM BACKEND ──
    const normalize = (item: any): any => ({ ...item, id: item._id || item.id });
    const loadAll = useCallback(async () => {
        const [wfs, rules] = await Promise.all([getApprovalWorkflowsV2(), apiGetSodRules()]);
        setWorkflows(wfs.map(normalize));
        setSodRules(rules.map(normalize));
    }, []);
    useEffect(() => { loadAll(); }, [loadAll]);

    // ── COMPUTED ──
    const filteredWorkflows = workflows.filter(w => w.docType === selectedDocType);
    const allEnabled = workflows.filter(w => w.enabled).length;

    // ── WORKFLOW CRUD ──
    const openAddWf = () => {
        setEditingWf({
            id: '', name: '', docType: selectedDocType, enabled: true,
            conditions: [], stages: [{ order: 1, role: '', mode: 'sequential', escalateAfterHrs: 0 }],
            autoReject: false, autoRejectDays: 0,
        });
        setWfDialogOpen(true);
    };
    const openEditWf = (wf: Workflow) => { setEditingWf({ ...wf, conditions: [...wf.conditions.map(c => ({ ...c }))], stages: [...wf.stages.map(s => ({ ...s }))] }); setWfDialogOpen(true); };
    const saveWf = async () => {
        if (!editingWf || !editingWf.name) { toast.error('Workflow name is required'); return; }
        if (editingWf.stages.some(s => !s.role)) { toast.error('All stages require a role'); return; }
        try {
            if (editingWf.id) { await updateApprovalWorkflowV2(editingWf.id, editingWf); }
            else { await createApprovalWorkflowV2(editingWf); }
            await loadAll();
            setWfDialogOpen(false);
            toast.success('Workflow saved');
        } catch { toast.error('Failed to save workflow'); }
    };
    const deleteWf = async (id: string) => {
        try { await deleteApprovalWorkflowV2(id); await loadAll(); toast.success('Workflow deleted'); }
        catch { toast.error('Failed to delete workflow'); }
    };
    const toggleWf = async (id: string) => {
        try { await toggleApprovalWorkflowV2(id); await loadAll(); }
        catch { toast.error('Failed to toggle workflow'); }
    };

    // ── CONDITION HELPERS (inside dialog) ──
    const addCondition = () => {
        if (!editingWf) return;
        setEditingWf({ ...editingWf, conditions: [...editingWf.conditions, { field: 'amount', operator: '>=', value: '' }] });
    };
    const updateCondition = (idx: number, patch: Partial<Condition>) => {
        if (!editingWf) return;
        const conds = [...editingWf.conditions];
        conds[idx] = { ...conds[idx], ...patch };
        setEditingWf({ ...editingWf, conditions: conds });
    };
    const removeCondition = (idx: number) => {
        if (!editingWf) return;
        setEditingWf({ ...editingWf, conditions: editingWf.conditions.filter((_, i) => i !== idx) });
    };

    // ── STAGE HELPERS (inside dialog) ──
    const addStage = () => {
        if (!editingWf) return;
        setEditingWf({ ...editingWf, stages: [...editingWf.stages, { order: editingWf.stages.length + 1, role: '', mode: 'sequential', escalateAfterHrs: 0 }] });
    };
    const updateStage = (idx: number, patch: Partial<Stage>) => {
        if (!editingWf) return;
        const stgs = [...editingWf.stages];
        stgs[idx] = { ...stgs[idx], ...patch };
        setEditingWf({ ...editingWf, stages: stgs });
    };
    const removeStage = (idx: number) => {
        if (!editingWf) return;
        const stgs = editingWf.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
        setEditingWf({ ...editingWf, stages: stgs });
    };

    // ── SOD CRUD ──
    const openAddSod = () => {
        setEditingSod({ id: '', rule: '', applies: '', risk: 'high', enforced: true });
        setSodDialogOpen(true);
    };
    const saveSod = async () => {
        if (!editingSod || !editingSod.rule) { toast.error('Rule description is required'); return; }
        try {
            await apiCreateSodRule(editingSod);
            await loadAll();
            setSodDialogOpen(false);
            toast.success('SoD rule saved');
        } catch { toast.error('Failed to save SoD rule'); }
    };
    const deleteSod = async (id: string) => {
        try { await apiDeleteSodRule(id); await loadAll(); toast.success('SoD rule removed'); }
        catch { toast.error('Failed to delete SoD rule'); }
    };
    const toggleSod = async (id: string) => {
        try { await apiToggleSodRule(id); await loadAll(); }
        catch { toast.error('Failed to toggle SoD rule'); }
    };

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-6 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-5">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/finance"><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button></Link>
                        <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Approval Engine</h1>
                            <p className="text-[11px] text-muted-foreground">Document Workflows · Conditional Logic · Segregation of Duties</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {allEnabled > 0 && <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-600">{allEnabled} Active</Badge>}
                        {sodRules.length > 0 && <Badge variant="outline" className="text-[9px] border-red-300 text-red-600">{sodRules.filter(r => r.enforced).length} SoD</Badge>}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                    <Kpi label="Active Workflows" value={String(allEnabled)} />
                    <Kpi label="Total Workflows" value={String(workflows.length)} />
                    <Kpi label="Document Types" value={String(DOCUMENT_TYPES.length)} />
                    <Kpi label="Available Roles" value={String(ROLE_OPTIONS.length)} />
                    <Kpi label="SoD Rules" value={String(sodRules.length)} alert={sodRules.length > 0} />
                </div>

                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="bg-muted/50 border h-9 p-0.5">
                        <TabsTrigger value="workflows" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Workflows</TabsTrigger>
                        <TabsTrigger value="roles" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Roles & Permissions</TabsTrigger>
                        <TabsTrigger value="sod" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Segregation of Duties</TabsTrigger>
                        <TabsTrigger value="conditions" className="text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Condition Fields</TabsTrigger>
                    </TabsList>

                    {/* ── WORKFLOWS ── */}
                    <TabsContent value="workflows" className="mt-6 space-y-4">
                        {/* Document Type Selector */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {DOCUMENT_TYPES.map(dt => (
                                <Button key={dt.id} variant={selectedDocType === dt.id ? 'default' : 'outline'} size="sm"
                                    className={cn("text-[11px] gap-1.5 h-7", selectedDocType === dt.id && "bg-red-600 hover:bg-red-700")}
                                    onClick={() => setSelectedDocType(dt.id)}>
                                    <dt.icon className="h-3 w-3" />{dt.label}
                                </Button>
                            ))}
                        </div>

                        {/* Add Workflow button */}
                        <div className="flex justify-end">
                            <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700" onClick={openAddWf}><Plus className="h-3.5 w-3.5" /> Add Workflow</Button>
                        </div>

                        {/* Workflow list */}
                        {filteredWorkflows.length === 0 ? (
                            <Card className="border-border shadow-sm">
                                <CardContent className="p-12 text-center">
                                    <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">No workflows for {DOCUMENT_TYPES.find(d => d.id === selectedDocType)?.label}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Add a workflow to define approval conditions and stages</p>
                                    <Button size="sm" className="mt-4 gap-2" onClick={openAddWf}><Plus className="h-3.5 w-3.5" /> Add Workflow</Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {filteredWorkflows.map(wf => (
                                    <Card key={wf.id} className="border-border shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-xs text-red-600">{wf.id}</span>
                                                        <h3 className="text-sm font-bold">{wf.name}</h3>
                                                        {wf.enabled && <Badge variant="default" className="text-[8px] h-4 px-1 bg-emerald-600">Active</Badge>}
                                                        {!wf.enabled && <Badge variant="secondary" className="text-[8px] h-4 px-1">Disabled</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditWf(wf)}><Edit2 className="h-3 w-3" /></Button>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteWf(wf.id)}><Trash2 className="h-3 w-3" /></Button>
                                                    <Switch checked={wf.enabled} onCheckedChange={() => toggleWf(wf.id)} />
                                                </div>
                                            </div>

                                            {/* Conditions */}
                                            {wf.conditions.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Conditions (IF)</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {wf.conditions.map((c, i) => (
                                                            <Badge key={i} variant="outline" className="text-[10px] px-2 py-1 font-mono gap-1">
                                                                <span className="text-muted-foreground">{CONDITION_FIELDS.find(f => f.id === c.field)?.label ?? c.field}</span>
                                                                <span className="text-red-600 font-bold">{c.operator}</span>
                                                                <span className="font-bold">{c.value}</span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stages */}
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Approval Stages (THEN)</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {wf.stages.map((s, i) => {
                                                        const roleName = ROLE_OPTIONS.find(r => r.id === s.role)?.label ?? s.role;
                                                        return (
                                                            <div key={i} className="flex items-center gap-1.5">
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/80 border border-border">
                                                                    <span className="text-[9px] font-bold text-red-600">S{s.order}</span>
                                                                    <span className="text-[11px] font-medium">{roleName}</span>
                                                                    <Badge variant="secondary" className="text-[7px] h-3 px-1">{s.mode === 'parallel' ? 'PAR' : 'SEQ'}</Badge>
                                                                    {s.escalateAfterHrs > 0 && <span className="text-[8px] text-amber-600">⏱ {s.escalateAfterHrs}h</span>}
                                                                </div>
                                                                {i < wf.stages.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {wf.autoReject && (
                                                <div className="mt-3 flex items-center gap-1.5">
                                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                    <span className="text-[10px] text-amber-600 font-medium">Auto-reject after {wf.autoRejectDays} days</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── ROLES ── */}
                    <TabsContent value="roles" className="mt-6 space-y-6">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Functional Roles (System Scope)</p>
                            <Card className="border-border shadow-sm">
                                <CardContent className="p-0">
                                    <div className="divide-y border-t">
                                        <div className="grid grid-cols-12 px-6 py-2.5 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            <span className="col-span-3">Role</span><span className="col-span-4">Scope</span>
                                            <span className="col-span-2">Level</span><span className="col-span-3">Permissions</span>
                                        </div>
                                        {FUNCTIONAL_ROLES.map(r => (
                                            <div key={r.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-muted/30 transition-colors text-sm">
                                                <span className="col-span-3 text-xs font-medium flex items-center gap-2"><Users className="h-3 w-3 text-red-600" /> {r.label}</span>
                                                <span className="col-span-4 text-xs text-muted-foreground">{r.scope}</span>
                                                <span className="col-span-2"><LevelBadge level={r.level} /></span>
                                                <span className="col-span-3 text-[10px] text-muted-foreground">View, Create, Edit, Post within scope</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ── SEGREGATION OF DUTIES ── */}
                    <TabsContent value="sod" className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm font-bold">Segregation of Duties — Hard Rules</p><p className="text-[11px] text-muted-foreground">These rules are enforced by the system to prevent compliance violations</p></div>
                            <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700" onClick={openAddSod}><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
                        </div>
                        {sodRules.length === 0 ? (
                            <Card className="border-border shadow-sm"><CardContent className="p-12 text-center"><Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No SoD rules configured</p><p className="text-[11px] text-muted-foreground mt-1">Add rules like &quot;Maker cannot approve own document&quot;</p><Button size="sm" className="mt-4 gap-2" onClick={openAddSod}><Plus className="h-3.5 w-3.5" /> Add Rule</Button></CardContent></Card>
                        ) : (
                            <Card className="border-border shadow-sm">
                                <CardContent className="p-0">
                                    <div className="divide-y border-t">
                                        {sodRules.map(r => (
                                            <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                                        r.risk === 'critical' ? 'bg-red-100 text-red-600' : r.risk === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600')}>
                                                        <Lock className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[10px] text-red-600">{r.id}</span>
                                                            <p className="text-sm font-medium">{r.rule}</p>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">Applies to: {r.applies}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant={r.risk === 'critical' ? 'destructive' : r.risk === 'high' ? 'default' : 'secondary'} className="text-[8px] h-4 px-1">{r.risk}</Badge>
                                                    <Switch checked={r.enforced} onCheckedChange={() => toggleSod(r.id)} />
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSod(r.id)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ── CONDITION FIELDS (Reference) ── */}
                    <TabsContent value="conditions" className="mt-6">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Available Condition Dimensions</CardTitle>
                                <CardDescription className="text-[11px]">These fields can be used in workflow conditions to drive multi-dimensional approval logic.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y border-t">
                                    <div className="grid grid-cols-12 px-6 py-2.5 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <span className="col-span-3">Field</span><span className="col-span-2">Type</span>
                                        <span className="col-span-3">Operators</span><span className="col-span-4">Description</span>
                                    </div>
                                    {CONDITION_FIELDS.map(f => (
                                        <div key={f.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-muted/30 transition-colors text-sm">
                                            <span className="col-span-3 text-xs font-medium font-mono">{f.id}</span>
                                            <span className="col-span-2"><Badge variant="outline" className="text-[8px] h-4 px-1">{f.type}</Badge></span>
                                            <span className="col-span-3 text-[10px] text-muted-foreground font-mono">
                                                {f.type === 'number' ? '==, !=, >, <, >=, <=' : f.type === 'boolean' ? '==, !=' : '==, !=, in'}
                                            </span>
                                            <span className="col-span-4 text-[10px] text-muted-foreground">{f.label} matching for approval routing</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ── WORKFLOW DIALOG ── */}
                <Dialog open={wfDialogOpen} onOpenChange={setWfDialogOpen}>
                    <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingWf?.id ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
                            <DialogDescription className="text-xs">Define conditions and approval stages for {DOCUMENT_TYPES.find(d => d.id === editingWf?.docType)?.label}</DialogDescription>
                        </DialogHeader>
                        {editingWf && (
                            <div className="space-y-5 py-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Workflow Name</Label>
                                        <Input value={editingWf.name} onChange={e => setEditingWf({ ...editingWf, name: e.target.value })} placeholder="e.g. High-Value Vendor Bill" className="h-9 text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Document Type</Label>
                                        <Select value={editingWf.docType} onValueChange={v => setEditingWf({ ...editingWf, docType: v })}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{DOCUMENT_TYPES.map(dt => <SelectItem key={dt.id} value={dt.id}>{dt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Conditions */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-xs font-bold">Conditions (IF)</Label>
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={addCondition}><Plus className="h-2.5 w-2.5" /> Add</Button>
                                    </div>
                                    {editingWf.conditions.length === 0 && <p className="text-[10px] text-muted-foreground italic">No conditions — applies to all documents of this type</p>}
                                    <div className="space-y-2">
                                        {editingWf.conditions.map((c, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <Select value={c.field} onValueChange={v => updateCondition(i, { field: v })}>
                                                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{CONDITION_FIELDS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <Select value={c.operator} onValueChange={v => updateCondition(i, { operator: v })}>
                                                    <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="==">==</SelectItem><SelectItem value="!=">!=</SelectItem>
                                                        <SelectItem value=">">&gt;</SelectItem><SelectItem value="<">&lt;</SelectItem>
                                                        <SelectItem value=">=">&gt;=</SelectItem><SelectItem value="<=">&lt;=</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input value={c.value} onChange={e => updateCondition(i, { value: e.target.value })} className="h-8 text-xs flex-1" placeholder="Value" />
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => removeCondition(i)}><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stages */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-xs font-bold">Approval Stages (THEN)</Label>
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={addStage}><Plus className="h-2.5 w-2.5" /> Add Stage</Button>
                                    </div>
                                    <div className="space-y-2">
                                        {editingWf.stages.map((s, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                                                <span className="text-[10px] font-bold text-red-600 w-6 shrink-0">S{s.order}</span>
                                                <Select value={s.role} onValueChange={v => updateStage(i, { role: v })}>
                                                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                                                    <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <Select value={s.mode} onValueChange={v => updateStage(i, { mode: v as 'sequential' | 'parallel' })}>
                                                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sequential">Sequential</SelectItem>
                                                        <SelectItem value="parallel">Parallel</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Input type="number" value={s.escalateAfterHrs || ''} onChange={e => updateStage(i, { escalateAfterHrs: Number(e.target.value) })} className="h-8 text-xs w-14" placeholder="hrs" />
                                                    <span className="text-[9px] text-muted-foreground">esc</span>
                                                </div>
                                                {editingWf.stages.length > 1 && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => removeStage(i)}><Trash2 className="h-3 w-3" /></Button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Auto-reject */}
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                    <div><p className="text-xs font-medium">Auto-Reject</p><p className="text-[10px] text-muted-foreground">Reject if not approved within N days</p></div>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" value={editingWf.autoRejectDays || ''} onChange={e => setEditingWf({ ...editingWf, autoRejectDays: Number(e.target.value), autoReject: Number(e.target.value) > 0 })} className="h-8 text-xs w-16" placeholder="days" />
                                        <Switch checked={editingWf.autoReject} onCheckedChange={v => setEditingWf({ ...editingWf, autoReject: v })} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setWfDialogOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={saveWf}>Save Workflow</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── SOD DIALOG ── */}
                <Dialog open={sodDialogOpen} onOpenChange={setSodDialogOpen}>
                    <DialogContent className="sm:max-w-[460px]">
                        <DialogHeader>
                            <DialogTitle>Add SoD Rule</DialogTitle>
                            <DialogDescription className="text-xs">Define a segregation of duties rule to enforce compliance.</DialogDescription>
                        </DialogHeader>
                        {editingSod && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label className="text-xs">Rule Description</Label><Input value={editingSod.rule} onChange={e => setEditingSod({ ...editingSod, rule: e.target.value })} placeholder="e.g. Maker cannot approve own document" className="h-9 text-xs" /></div>
                                <div className="space-y-2"><Label className="text-xs">Applies To</Label><Input value={editingSod.applies} onChange={e => setEditingSod({ ...editingSod, applies: e.target.value })} placeholder="e.g. All documents, Vendor Bill → Payment Run" className="h-9 text-xs" /></div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Risk Level</Label>
                                    <Select value={editingSod.risk} onValueChange={v => setEditingSod({ ...editingSod, risk: v as SodRule['risk'] })}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="critical">Critical</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setSodDialogOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={saveSod}>Save Rule</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
    return (<Card className={cn("border-border shadow-sm", alert && "border-red-200")}><CardContent className="p-3"><p className="text-[10px] text-muted-foreground font-medium mb-1">{label}</p><p className={cn("text-lg font-bold tracking-tight", alert && "text-red-600")}>{value}</p></CardContent></Card>);
}
function LevelBadge({ level }: { level: string }) {
    const c: Record<string, string> = { operational: 'bg-blue-50 text-blue-700', specialist: 'bg-violet-50 text-violet-700', control: 'bg-amber-50 text-amber-700', executive: 'bg-red-50 text-red-700' };
    return <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", c[level] ?? 'bg-muted')}>{level}</span>;
}
