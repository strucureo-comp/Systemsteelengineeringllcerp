'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getProject } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import Link from 'next/link';

import {
  AlertTriangle, Calendar, CheckCircle2, ChevronRight, Clock,
  Download, FileText, HardHat, AlertCircle, Building2, MapPin,
  DollarSign, Activity, ArrowUpRight, ArrowDownRight,
  Search, Filter, Package, Users, TrendingUp, ShieldAlert,
  Pencil, Plus, Loader2, ArrowLeft, Check
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/db/types';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency';

// --- INITIAL STATE ---
const INITIAL_DATA = {
  code: 'PROJ-2026-A10',
  client: 'Emaar Properties',
  location: 'Dubai Marina, UAE',
  contractValue: 12500000,
  startDate: '2025-06-01',
  expectedCompletion: '2026-12-31',
  daysRemaining: 312,
  currentPhase: 'Structural Framework',
  status: 'In Progress',
  finances: {
    budgetUsed: 4200000,
    budgetUsedPct: 34,
    committedBudget: 1500000,
    remainingBudget: 6800000,
    approvedBudget: 12500000,
    actualSpent: 4200000,
  },
  counters: {
    pendingApprovals: 8,
    openMaterialRequests: 12,
    workforceActiveToday: 245
  },
  health: {
    budget: 'Risk',
    schedule: 'Good',
    approval: 'Critical'
  },
  snapshot: {
    phaseCompletionPct: 45
  },
  milestones: [
    { id: 'm1', name: 'Foundation', completedPct: 100, status: 'Completed', targetDate: '2025-09-01' },
    { id: 'm2', name: 'Structural', completedPct: 45, status: 'In Progress', targetDate: '2026-03-15' },
    { id: 'm3', name: 'Finishing', completedPct: 0, status: 'Pending', targetDate: '2026-09-01' },
    { id: 'm4', name: 'Handover', completedPct: 0, status: 'Pending', targetDate: '2026-12-31' },
  ],
  materials: [
    { id: 'mat1', name: 'Structural Steel H-Beams', req: 5000, del: 2000, pen: 3000, eta: '2026-03-01', status: 'On Track' },
    { id: 'mat2', name: 'High-Strength Concrete', req: 10000, del: 4000, pen: 6000, eta: '2026-02-28', status: 'Delayed' },
    { id: 'mat3', name: 'Welding Rods', req: 500, del: 100, pen: 400, eta: '2026-02-25', status: 'Under-Stock' }
  ],
  workforce: {
    engineers: 12,
    supervisors: 18,
    workers: 220,
    attendanceTodayPct: 88,
    overtimeCount: 45
  },
  risks: [
    { id: 1, title: 'Late delivery of M50 Concrete', severity: 'High', owner: 'Procurement', status: 'Open' },
    { id: 2, title: 'Design clash in structural node C2', severity: 'Medium', owner: 'Engineering', status: 'Open' }
  ],
  logs: [
    { id: 'l1', user: 'Ahmed Mansoor', action: 'Approved Variation Order #3', entity: 'VO-003', time: '2 hours ago', impact: '+45,000' },
    { id: 'l2', user: 'Sarah Ali', action: 'Requested Material Delivery', entity: 'Steel Batch 4', time: '5 hours ago', impact: '' },
    { id: 'l3', user: 'Rajesh Kumar', action: 'Logged Daily Site Report', entity: 'DSR-Feb21', time: '1 day ago', impact: '' }
  ],
  approvals: [
    { id: 'a1', title: 'Variation Order VO-004', requestedBy: 'Site Engineer', amount: 120000, status: 'Pending', routedTo: 'Finance' },
    { id: 'a2', title: 'Material Request (M50 Concrete)', requestedBy: 'Site Engineer', amount: 45000, status: 'Pending', routedTo: 'Project Manager' },
  ],
  documents: [
    { id: 'd1', name: 'Structural_Drawings_v2.pdf', type: 'PDF', size: '4.2 MB', uploadedBy: 'Ahmed Mansoor', date: '2 days ago' },
    { id: 'd2', name: 'Site_Safety_Protocol.docx', type: 'Word', size: '1.1 MB', uploadedBy: 'Sarah Ali', date: '1 week ago' },
    { id: 'd3', name: 'Concrete_Mix_Design.pdf', type: 'PDF', size: '2.5 MB', uploadedBy: 'Vendor', date: '3 weeks ago' }
  ]
};

export default function AdminProjectDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { baseCurrency } = useCompanySettings();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  const [data, setData] = useState(INITIAL_DATA);
  const [userRole, setUserRole] = useState<'Site Engineer' | 'Project Manager' | 'Finance'>('Project Manager');

  const formatCurrency = (val: number) => formatCurrencyUtil(val, baseCurrency);

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);

  useEffect(() => {
    const fetchProject = async () => {
      const p = await getProject(params.id);
      if (p) {
        setProject(p);
        setData(prev => ({
          ...prev,
          // @ts-ignore
          name: p.title,
          client: p.client?.name || prev.client
        }));
      }
      setLoading(false);
    };

    if (user?.role === 'admin') {
      fetchProject();
    }
  }, [user, params.id]);

  // SETTINGS MATRICES & PERMISSION MAPPING
  const canEditMilestones = userRole === 'Project Manager' || userRole === 'Site Engineer';
  const canAddLogs = userRole === 'Site Engineer' || userRole === 'Project Manager';
  const canEditFinance = userRole === 'Finance' || userRole === 'Project Manager';
  const canApproveFinance = userRole === 'Finance' || userRole === 'Project Manager';
  const canRequestMaterial = userRole === 'Site Engineer' || userRole === 'Project Manager';

  const logAudit = (action: string, entity: string, impact: string = '') => {
    const newLog = {
      id: `l${Date.now()}`,
      user: userRole,
      action,
      entity,
      time: 'Just now',
      impact
    };
    setData(prev => ({ ...prev, logs: [newLog, ...prev.logs] }));
    toast.success(`${action} logged successfully.`);
  };

  const handleUpdateMilestone = (id: string, updates: any) => {
    setData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
    logAudit('Updated Milestone Progress', updates.name ? 'Renamed' : 'Progress Adjusted');
  };

  const handleMaterialRequest = (e: React.FormEvent) => {
    e.preventDefault();
    logAudit('Material Request Sent', 'Pending Procurement');
    setData(prev => ({
      ...prev,
      counters: { ...prev.counters, openMaterialRequests: prev.counters.openMaterialRequests + 1 }
    }));
  };

  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    logAudit('Logged Expense', 'Finance Ledger Updated', '-' + formatCurrency(5000));
    setData(prev => ({
      ...prev,
      finances: {
        ...prev.finances,
        actualSpent: prev.finances.actualSpent + 5000,
        remainingBudget: prev.finances.remainingBudget - 5000
      }
    }));
  };

  const handleApprove = (id: string) => {
    setData(prev => ({
      ...prev,
      approvals: prev.approvals.filter(a => a.id !== id),
      counters: { ...prev.counters, pendingApprovals: Math.max(0, prev.counters.pendingApprovals - 1) }
    }));
    logAudit('Approved Request', id);
  };

  const handleSaveAssignments = async () => {
    // Mock API call to PATCH /api/projects/${id}/assignments
    toast.success('Project assignments updated successfully');
    setAssignOpen(false);
    logAudit('Modified Assignments', 'Team updated');
  };

  const getHealthColor = (h: string) => h === 'Good' ? 'bg-emerald-100 text-emerald-800' : h === 'Risk' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';

  if (loading) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!project) return null;

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-6 pb-12 font-sans -mx-4 md:-mx-8 -mt-4 md:-mt-8 text-foreground min-h-screen">

        {/* STICKY TOP BAR */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm px-4 md:px-8 py-4">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto overflow-hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hidden md:flex" asChild>
                <Link href="/admin/projects"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-md hidden md:flex items-center justify-center">
                <Building2 className="text-primary h-5 w-5" />
              </div>
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-foreground truncate">{project.title}</h1>
                  <Badge className="text-[10px] uppercase font-bold tracking-widest">{data.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono">{data.code}</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span className={cn("px-1.5 py-0 rounded-sm font-bold text-[10px]", getHealthColor(data.health.budget))}>CST: {data.health.budget}</span>
                  <span className={cn("px-1.5 py-0 rounded-sm font-bold text-[10px]", getHealthColor(data.health.schedule))}>SCH: {data.health.schedule}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto shrink-0 overflow-x-auto pb-2 md:pb-0">
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border shrink-0">
                <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground mr-1">Simulate Role</Badge>
                <Select value={userRole} onValueChange={(val: any) => setUserRole(val)}>
                  <SelectTrigger className="h-7 text-xs w-[140px] font-bold border-none shadow-none bg-transparent p-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                    <SelectItem value="Project Manager">Project Manager</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6">
          <Tabs defaultValue="overview" className="space-y-6">

            {/* TABS MENU */}
            <TabsList className="bg-background border-border/50 border overflow-x-auto justify-start h-10 w-full rounded-md px-1 flex-nowrap mb-4 shadow-sm">
              <TabsTrigger value="overview" className="text-xs font-bold">Overview</TabsTrigger>
              <TabsTrigger value="execution" className="text-xs font-bold">Execution</TabsTrigger>
              <TabsTrigger value="materials" className="text-xs font-bold">Materials</TabsTrigger>
              <TabsTrigger value="workforce" className="text-xs font-bold">Workforce</TabsTrigger>
              <TabsTrigger value="financials" className="text-xs font-bold">Financials</TabsTrigger>
              <TabsTrigger value="approvals" className="text-xs font-bold">Approvals {data.counters.pendingApprovals > 0 && <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary">{data.counters.pendingApprovals}</Badge>}</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-bold">Documents</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs font-bold">Audit Log</TabsTrigger>
            </TabsList>

            {/* TAB: OVERVIEW (STRICTLY READ ONLY) */}
            <TabsContent value="overview" className="m-0 border-none p-0 outline-none">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-8 flex flex-col gap-6">
                  {/* READ ONLY KPI GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Card className="shadow-xs border-border/60">
                      <CardContent className="p-4">
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Overall Progress</p>
                        <span className="text-2xl font-black text-foreground">{data.snapshot?.phaseCompletionPct || 45}%</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-xs border-border/60">
                      <CardContent className="p-4">
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Approved Budget</p>
                        <span className="text-2xl font-black text-foreground">{formatCurrency(data.finances.approvedBudget)}</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-xs border-border/60">
                      <CardContent className="p-4">
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Actual Spent</p>
                        <span className="text-2xl font-black text-foreground">{formatCurrency(data.finances.actualSpent)}</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-xs border-border/60">
                      <CardContent className="p-4">
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Remaining Budget</p>
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{formatCurrency(data.finances.remainingBudget)}</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-xs border-border/60">
                      <CardContent className="p-4">
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Pending Approvals</p>
                        <span className="text-2xl font-black text-primary">{data.counters.pendingApprovals}</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-xs border-border/60">
                      <CardContent className="p-4">
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Active Workforce</p>
                        <span className="text-2xl font-black text-foreground">{data.counters.workforceActiveToday}</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* READ ONLY MILESTONES */}
                  <Card className="shadow-xs border-border/60">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Project Milestones</h3>
                    </div>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-[11px] font-bold uppercase w-[40%]">Phase</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase w-[40%]">Progress</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-right w-[20%]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.milestones.map((m) => (
                            <TableRow key={'ro' + m.id}>
                              <TableCell className="py-3">
                                <span className="font-bold text-sm block">{m.name}</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" /> Due: {m.targetDate}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <Progress value={m.completedPct} className="h-1.5 w-[80%] bg-muted/80" />
                                  <span className="text-xs font-bold w-6">{m.completedPct}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <Badge variant="outline" className={cn(
                                  "text-[10px] font-bold px-1.5 py-0",
                                  m.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    m.status === 'In Progress' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                      "bg-muted/30 text-muted-foreground border-border"
                                )}>
                                  {m.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-6">
                  {/* READ ONLY PROJECT BRIEF */}
                  <Card className="shadow-xs border-border/60 bg-muted/5 border-none">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center justify-between">
                        Project Brief
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Client</span>
                        <span className="font-bold">{data.client}</span>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-bold">{data.location}</span>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Timeline</span>
                        <div className="text-right">
                          <span className="font-bold block">{data.startDate}</span>
                          <span className="font-bold text-muted-foreground block text-xs">to {data.expectedCompletion}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* READ ONLY RISKS */}
                  <Card className="shadow-xs border border-rose-100 dark:border-rose-900 overflow-hidden">
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-4 border-b border-rose-100 dark:border-rose-900 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-rose-800 dark:text-rose-500 flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Risks Summary</h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {data.risks.map(r => (
                        <div key={'ro-r' + r.id} className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold leading-tight">{r.title}</p>
                            <Badge variant="outline" className={cn(
                              "text-[9px] px-1 py-0 h-4 font-black flex items-center ml-2 border-0 shrink-0",
                              r.severity === 'High' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                            )}>{r.severity}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB: EXECUTION (EDITABLE) */}
            <TabsContent value="execution" className="m-0 border-none p-0 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-xs border-border/60">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Manage Milestones</h3>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[11px] font-bold uppercase w-[40%]">Phase</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase w-[30%]">Progress</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase text-right w-[30%]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.milestones.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="py-3 font-bold text-sm">{m.name}</TableCell>
                          <TableCell className="py-3 text-sm font-medium">{m.completedPct}%</TableCell>
                          <TableCell className="py-3 text-right">
                            {canEditMilestones ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 text-xs font-bold">Update</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm p-6 shadow-2xl border-border">
                                  <DialogHeader className="mb-4">
                                    <DialogTitle>Update {m.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold">Progress (%)</Label>
                                      <Input type="number" defaultValue={m.completedPct} onChange={(e) => m.completedPct = Number(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold">Status</Label>
                                      <Select defaultValue={m.status} onValueChange={(val) => m.status = val}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Pending">Pending</SelectItem>
                                          <SelectItem value="In Progress">In Progress</SelectItem>
                                          <SelectItem value="Completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter className="mt-6">
                                    <DialogTrigger asChild>
                                      <Button className="w-full text-xs font-bold" onClick={() => handleUpdateMilestone(m.id, m)}>Save Changes</Button>
                                    </DialogTrigger>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">LOCKED</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                <Card className="shadow-xs border-border/60 h-[400px] flex flex-col">
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /> Daily Execution Logs</h3>
                    {canAddLogs && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="h-7 text-[10px] font-bold gap-1"><Plus className="h-3 w-3" /> Add Entry</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md p-6 shadow-xl border-border">
                          <DialogHeader className="mb-4">
                            <DialogTitle>Post Daily Execution Log</DialogTitle>
                          </DialogHeader>
                          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); logAudit('Sumbitted Report', 'Daily Log'); }}>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">Summary</Label>
                              <Input required placeholder="E.g. Concrete poured at node C1" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">Inspection Status</Label>
                              <Select defaultValue="Cleared">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Cleared">Cleared</SelectItem>
                                  <SelectItem value="Pending">Pending Review</SelectItem>
                                  <SelectItem value="Failed">Failed (Needs Action)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">Notes / Delays (Optional)</Label>
                              <Textarea placeholder="Explain any blockers..." className="h-20" />
                            </div>
                            <DialogFooter className="mt-6">
                              <DialogTrigger asChild>
                                <Button type="submit" className="w-full text-xs font-bold">Submit to Execution Table</Button>
                              </DialogTrigger>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="divide-y divide-border">
                      {data.logs.map((log) => (
                        <div key={'ex-l' + log.id} className="p-4 flex gap-3 text-sm">
                          <Avatar className="h-8 w-8 rounded-md bg-primary/10 items-center justify-center font-bold text-xs text-primary mt-0.5"><AvatarFallback className="bg-transparent">{log.user.charAt(0)}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-bold text-foreground">{log.user} <span className="font-normal text-muted-foreground">{log.action}</span></p>
                            <p className="text-xs text-muted-foreground tracking-tight mt-0.5">{log.time} • Ref: {log.entity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </TabsContent>

            {/* TAB: MATERIALS (EDITABLE) */}
            <TabsContent value="materials" className="m-0 border-none p-0 outline-none">
              <Card className="shadow-xs border-border/60">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Materials & Procurement Hub</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Connects to global procurement queue. Approval triggers automatically if &gt; {formatCurrency(10000)}.</p>
                  </div>
                  {canRequestMaterial && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-8 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> Create Request</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md p-6">
                        <DialogHeader className="mb-4">
                          <DialogTitle>Raise Material Request</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleMaterialRequest} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Material Definition</Label>
                            <Input placeholder="E.g. Steel beams, cement..." required />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">Quantity Needed</Label>
                              <Input type="number" placeholder="0" required />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">Est Unit Cost ({baseCurrency})</Label>
                              <Input type="number" placeholder="0" required />
                            </div>
                          </div>
                          <DialogFooter className="mt-6">
                            <DialogTrigger asChild>
                              <Button type="submit" className="w-full text-xs font-bold">Push to Procurement</Button>
                            </DialogTrigger>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase w-[30%]">Material</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Required</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Pending</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Status</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.materials.map(mat => (
                      <TableRow key={mat.id}>
                        <TableCell className="py-3 font-bold text-sm">{mat.name}</TableCell>
                        <TableCell className="py-3 text-sm">{mat.req}</TableCell>
                        <TableCell className="py-3 text-sm text-amber-600 font-bold">{mat.pen}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] bg-muted/30">{mat.status}</Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-primary">Mark Rcvd</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* TAB: WORKFORCE (EDITABLE) */}
            <TabsContent value="workforce" className="m-0 border-none p-0 outline-none">
              <Card className="shadow-xs border-border/60">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Site Workforce Management</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Syncs live records with Central HR matrix.</p>
                  </div>
                  {userRole === 'Project Manager' && (
                    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold">Modify Assignments</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md p-6">
                        <DialogHeader className="mb-4">
                          <DialogTitle>Modify Project Team</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold">Assigned Members</Label>
                            <ScrollArea className="h-[200px] border rounded-md p-2">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">AM</AvatarFallback></Avatar>
                                    <span className="text-sm font-medium">Ahmed Mansoor</span>
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500"><AlertCircle className="h-3 w-3" /></Button>
                                </div>
                                <div className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">SA</AvatarFallback></Avatar>
                                    <span className="text-sm font-medium">Sarah Ali</span>
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500"><AlertCircle className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Add Member</Label>
                            <div className="flex gap-2">
                              <Input placeholder="Enter name or email..." className="text-xs h-9" />
                              <Button size="sm" className="h-9 px-3">Add</Button>
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button variant="outline" onClick={() => setAssignOpen(false)} className="text-xs font-bold">Cancel</Button>
                          <Button onClick={handleSaveAssignments} className="text-xs font-bold">Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="border border-border/50 bg-muted/10 p-4 rounded-xl flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2 tracking-widest">Engineers</p>
                      <span className="text-4xl font-black">{data.workforce.engineers}</span>
                    </div>
                    <div className="border border-border/50 bg-muted/10 p-4 rounded-xl flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2 tracking-widest">Supervisors</p>
                      <span className="text-4xl font-black">{data.workforce.supervisors}</span>
                    </div>
                    <div className="border border-border/50 bg-muted/10 p-4 rounded-xl flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2 tracking-widest">Workers</p>
                      <span className="text-4xl font-black">{data.workforce.workers}</span>
                    </div>
                    <div className="border border-border/50 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase mb-2 tracking-widest">Attendance</p>
                      <span className="text-4xl font-black text-amber-700 dark:text-amber-500">{data.workforce.attendanceTodayPct}%</span>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button className="h-8 text-xs font-bold"><Check className="h-3.5 w-3.5 mr-1" /> Request HR Backup</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: FINANCIALS (EDITABLE) */}
            <TabsContent value="financials" className="m-0 border-none p-0 outline-none">
              <Card className="shadow-xs border-border/60">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> Financial Ledger</h3>
                  {canEditFinance && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-8 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> Log Direct Expense</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm p-6">
                        <DialogHeader className="mb-4">
                          <DialogTitle>Push Ledger Expense</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleLogExpense} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Amount ({baseCurrency})</Label>
                            <Input type="number" required placeholder="0.00" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Reason/Entity</Label>
                            <Input required placeholder="Site logistics delay charges..." />
                          </div>
                          <DialogFooter className="mt-6">
                            <DialogTrigger asChild>
                              <Button type="submit" className="w-full text-xs font-bold">Commit to Journal</Button>
                            </DialogTrigger>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-bold text-foreground">Ledger Active</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">All entries injected here are immediately routed through Finance and reflected globally in Trial Balances.</p>
                </div>
              </Card>
            </TabsContent>

            {/* TAB: APPROVALS (CONTROLLED BY SETTINGS) */}
            <TabsContent value="approvals" className="m-0 border-none p-0 outline-none">
              <Card className="shadow-xs border-border/60">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Routing & Approval Inbox</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Controlled strictly by settings module hierarchies.</p>
                  </div>
                </div>
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase w-[30%]">Item Request</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Requested By</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Routed To</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Impact</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.approvals.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground font-medium">Inbox fully cleared.</TableCell></TableRow>
                    )}
                    {data.approvals.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="py-3 font-bold text-sm">{a.title}</TableCell>
                        <TableCell className="py-3 text-xs">{a.requestedBy}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[9px] font-bold">{a.routedTo}</Badge>
                        </TableCell>
                        <TableCell className="py-3 font-bold text-xs">{formatCurrency(a.amount)}</TableCell>
                        <TableCell className="py-3 text-right">
                          {userRole === a.routedTo ? (
                            <Button size="sm" className="h-7 text-xs font-bold" onClick={() => handleApprove(a.id)}>Approve</Button>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground text-[10px]">AWAITING</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="m-0 border-none p-0 outline-none">
              <Card className="shadow-xs border-border/60">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Document Vault</h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold"><Filter className="h-3.5 w-3.5 mr-1" /> Filter</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-8 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> Upload File</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm p-6">
                        <DialogHeader className="mb-4">
                          <DialogTitle>Upload Document</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          logAudit('Uploaded Document', 'New File');
                        }} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">File Selection</Label>
                            <Input type="file" required className="text-xs" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Folder / Category</Label>
                            <Select defaultValue="Drawings">
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Drawings">Drawings & Blueprints</SelectItem>
                                <SelectItem value="Contracts">Contracts</SelectItem>
                                <SelectItem value="Reports">Reports & Logs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter className="mt-6">
                            <DialogTrigger asChild>
                              <Button type="submit" className="w-full text-xs font-bold">Upload to Vault</Button>
                            </DialogTrigger>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase w-[40%]">Document Name</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Uploaded By</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Size</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase">Date</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.documents.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-bold text-sm truncate block max-w-[200px]">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs">{doc.uploadedBy}</TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">{doc.size}</TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">{doc.date}</TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"><AlertTriangle className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* TAB: AUDIT LOG (READ ONLY) */}
            <TabsContent value="audit" className="m-0 border-none p-0 outline-none">
              <Card className="shadow-xs border-border/60">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Complete Project Audit Trail</h3>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-border">
                    {data.logs.map((log) => (
                      <div key={'audit-' + log.id} className="p-4 flex gap-3 text-sm hover:bg-muted/10 transition-colors">
                        <Avatar className="h-8 w-8 rounded-md bg-secondary items-center justify-center font-bold text-xs"><AvatarFallback className="bg-transparent">{log.user.charAt(0)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="font-bold text-foreground">{log.user} <span className="font-normal text-muted-foreground">{log.action}</span></p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-medium">{log.time}</span>
                            <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded-sm">{log.entity}</span>
                          </div>
                        </div>
                        {log.impact && (
                          <div className="shrink-0 flex items-center">
                            <Badge variant="outline" className="text-[10px] font-black">{log.impact}</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </DashboardShell>
  );
}