'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, User, PenTool, Layers, Package, DollarSign, 
  CalendarClock, Factory, ShieldCheck, Zap, ChevronRight, 
  Activity, Target, ArrowUpRight, Clock, Users2, Users, Trophy, 
  AlertCircle, FileText, TrendingUp, BarChart3, ListTodo, 
  CheckCircle2, HardHat, Receipt, Maximize2, Filter, 
  Download, Share2, MoreVertical, LayoutDashboard,
  Box, History, MessageSquare, ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/lib/db/types';
import { NodeDetailSheet } from './node-detail-sheet';
import { useTenant } from '@/lib/tenant-context';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

// --- Sophisticated Mock Data ---
const performanceData = [
  { name: 'Week 1', budget: 4000, actual: 2400, productivity: 65 },
  { name: 'Week 2', budget: 3000, actual: 1398, productivity: 72 },
  { name: 'Week 3', budget: 2000, actual: 9800, productivity: 85 },
  { name: 'Week 4', budget: 2780, actual: 3908, productivity: 91 },
  { name: 'Week 5', budget: 1890, actual: 4800, productivity: 88 },
  { name: 'Week 6', budget: 2390, actual: 3800, productivity: 94 },
];

const distributionData = [
  { name: 'Materials', value: 45, color: '#3b82f6' },
  { name: 'Labor', value: 30, color: '#8b5cf6' },
  { name: 'Overheads', value: 15, color: '#f59e0b' },
  { name: 'Compliance', value: 10, color: '#10b981' },
];

export function ProjectNodeView({ project, onRefresh }: { project: Project, onRefresh: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('performance');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { tenantStatus } = useTenant();
  const businessType = tenantStatus?.business_type || 'service';
  const { baseCurrency } = useCompanySettings();

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);

  const handleAction = (id: string) => {
    setSelectedNode(id);
    setIsSheetOpen(true);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied", description: "Project link copied to clipboard" });
  };

  const handleGenerateReport = () => {
    toast({ title: "Generating report...", description: "Your report will download shortly" });
    router.push(`/admin/reports?project=${project.id}`);
  };

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9]/50 rounded-[2.5rem] border border-slate-200/60 overflow-hidden flex flex-col shadow-2xl shadow-slate-200/50">
      
      {/* 1. GLOBAL COMMAND STRIP */}
      <header className="bg-card border-b border-border px-10 py-6 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200 ring-4 ring-slate-50">
              <Briefcase className="h-7 w-7 text-card-foreground" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                  {businessType} OPERATION
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                    <Activity size={12} className="text-emerald-500" />
                    Live System Sync
                </div>
              </div>
              <h1 className="text-3xl font-black text-foreground tracking-tight leading-none">{project.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <KPIItem label="Health Score" value="94/100" trend="Stable" icon={Zap} color="text-amber-500" />
            <div className="h-10 w-[1px] bg-muted hidden md:block" />
            <KPIItem label="Budget" value={formatCurrency(Number(project.estimated_cost), baseCurrency, { compact: true })} trend="-2.4%" icon={DollarSign} color="text-emerald-500" />
            <div className="h-10 w-[1px] bg-muted hidden md:block" />
            <KPIItem label="Completion" value="78.2%" trend="+5.0%" icon={Target} color="text-blue-500" />
            <div className="flex gap-2 ml-4">
                <Button 
                    variant="outline" 
                    className="rounded-xl border-2 font-bold h-12 px-4 hover:bg-slate-50"
                    onClick={handleShare}
                >
                    <Share2 size={18} className="text-muted-foreground" />
                </Button>
                <Button 
                    className="rounded-xl font-black h-12 px-8 bg-slate-900 hover:bg-slate-800 text-card-foreground shadow-lg shadow-slate-200"
                    onClick={handleGenerateReport}
                >
                    Generate Report
                </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN HUB CONTENT */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-8 grid grid-cols-12 gap-8 overflow-hidden">
        
        {/* LEFT AREA: Analytical Engine */}
        <div className="col-span-12 lg:col-span-9 flex flex-col space-y-8">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
            <div className="flex items-center justify-between">
                <TabsList className="bg-slate-200/50 p-1 rounded-2xl h-auto border border-slate-200/50">
                    <TabsTrigger value="performance" className="rounded-xl text-xs font-black uppercase tracking-widest px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Performance
                    </TabsTrigger>
                    <TabsTrigger value="execution" className="rounded-xl text-xs font-black uppercase tracking-widest px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Workflow
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="rounded-xl text-xs font-black uppercase tracking-widest px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Resources
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="rounded-xl text-xs font-black uppercase tracking-widest px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Ledger
                    </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="rounded-lg font-bold text-muted-foreground hover:text-slate-900">
                        <Filter size={14} className="mr-2" /> Filters
                    </Button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* PERFORMANCE TAB */}
                    <TabsContent value="performance" className="m-0 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="md:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <CardTitle className="text-xl font-black text-foreground">Velocity Tracking</CardTitle>
                                        <CardDescription className="font-bold text-muted-foreground">Project productivity vs budget expenditure</CardDescription>
                                    </div>
                                    <Badge className="bg-primary text-card-foreground border-none font-black text-[10px] px-3">REAL-TIME</Badge>
                                </div>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData}>
                                            <defs>
                                                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                            />
                                            <Area type="monotone" dataKey="productivity" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorProd)" />
                                            <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <Card className="rounded-[2.5rem] border-none shadow-sm bg-slate-900 text-card-foreground p-8 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black uppercase tracking-widest text-primary">Mission Progress</h3>
                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">Phase 3: Operational Scaling is currently 85% complete with minor friction in logistics.</p>
                                </div>
                                <div className="py-8">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-muted-foreground">Current Lifecycle</span>
                                        <span className="text-2xl font-black">78%</span>
                                    </div>
                                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: '78%' }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                                <Button 
                                    className="w-full rounded-2xl h-14 bg-card text-foreground font-black uppercase tracking-widest text-xs hover:bg-slate-100"
                                    onClick={() => toast({ title: "Coming Soon", description: "Workflow optimization is under development" })}
                                >
                                    Optimize Workflow
                                </Button>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatWidget label="Hours Logged" value="1,240" sub="On-site Experts" icon={Clock} color="blue" />
                            <StatWidget label="Safety Audits" value="12/12" sub="100% Compliance" icon={ShieldCheck} color="emerald" />
                            <StatWidget label="Material Lead" value="4.2d" sub="Supply Chain Avg" icon={Truck} color="amber" />
                            <StatWidget label="Deviations" value="02" sub="Minor Flags" icon={ShieldAlert} color="rose" />
                        </div>
                    </TabsContent>

                    {/* EXECUTION TAB */}
                    <TabsContent value="execution" className="m-0">
                        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card overflow-hidden">
                            <CardHeader className="p-8 border-b border-border bg-slate-50/30">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black">Strategic Roadmap</CardTitle>
                                        <CardDescription className="font-bold text-muted-foreground uppercase tracking-tighter text-[10px]">Phase Control & Milestone Tracking</CardDescription>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="rounded-xl font-bold text-xs h-10 border-2"
                                        onClick={() => toast({ title: "Coming Soon", description: "Full Gantt view is under development" })}
                                    >
                                        Full Gantt View
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Milestone</TableHead>
                                            <TableHead className="px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Owner</TableHead>
                                            <TableHead className="px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Health</TableHead>
                                            <TableHead className="px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Progress</TableHead>
                                            <TableHead className="px-8 text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">Due Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <ExecutionRow title="Requirement Finalization" owner="Sarah K." status="completed" progress={100} date="Oct 12" />
                                        <ExecutionRow title="Structural Design Approval" owner="David L." status="completed" progress={100} date="Nov 05" />
                                        <ExecutionRow title="Resource Mobilization" owner="Internal" status="active" progress={85} date="Dec 20" />
                                        <ExecutionRow title="Initial Fabrication" owner="Workshop" status="active" progress={42} date="Jan 15" />
                                        <ExecutionRow title="Final QC & Handover" owner="Admin" status="pending" progress={0} date="Mar 30" />
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* RESOURCES TAB */}
                    <TabsContent value="resources" className="m-0 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ResourceModule title="Team & Expertise" icon={Users2} color="violet" onClick={() => handleAction('labour')} />
                            <ResourceModule title="Materials & Parts" icon={Package} color="blue" onClick={() => handleAction('inventory')} />
                        </div>
                    </TabsContent>

                    {/* FINANCE TAB */}
                    <TabsContent value="finance" className="m-0">
                        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                                <h3 className="text-xl font-black flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <DollarSign size={20} />
                                    </div>
                                    Budgetary Breakdown
                                </h3>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        className="rounded-xl h-10 font-bold text-xs border-2"
                                        onClick={() => router.push(`/admin/purchases/expenses/new?project=${project.id}`)}
                                    >
                                        Record Expense
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="rounded-xl h-10 font-bold text-xs border-2"
                                        onClick={() => router.push(`/admin/sales/invoices?project=${project.id}`)}
                                    >
                                        Billing View
                                    </Button>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="value">
                                                {distributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col justify-center space-y-6">
                                    {distributionData.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-sm font-black text-slate-700">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-muted-foreground">{item.value}%</span>
                                        </div>
                                    ))}
                                    <div className="pt-6 border-t border-border">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Project ROI Forecast</span>
                                            <span className="text-lg font-black text-emerald-600">+22.4%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* RIGHT AREA: Project Pulse Sidebar */}
        <aside className="col-span-12 lg:col-span-3 space-y-8">
          
          {/* Stakeholders */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-card overflow-hidden">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Users size={14} className="text-primary" />
                    Key Personnel
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
                <ContactCard name="John Doe (Client)" role="Global Steel Corp" type="External" />
                <ContactCard name="Aathish Kumar" role="Project Director" type="Internal" />
                <ContactCard name="Mohammed Ali" role="Accountant" type="Finance" />
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-card overflow-hidden flex flex-col">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Activity size={14} className="text-blue-500" />
                    Live Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex-1">
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-6">
                        <ActivityItem user="Admin" action="Updated Budget" time="2m ago" />
                        <ActivityItem user="Aathish" action="Approved Design" time="1h ago" />
                        <ActivityItem user="System" action="Low Stock Alert" time="3h ago" variant="rose" />
                        <ActivityItem user="Mo Ali" action="Generated Invoice" time="1d ago" />
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Files */}
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-blue-600 p-8 text-card-foreground relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-blue-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <FileText size={80} />
            </div>
            <div className="relative z-10">
                <h4 className="font-black text-xl mb-2">Project Repository</h4>
                <p className="text-xs font-medium text-blue-100 mb-6 opacity-80">14 Active Documents (CAD, Specs, Contracts)</p>
                <Button 
                    className="w-full rounded-xl bg-card text-blue-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100"
                    onClick={() => toast({ title: "Coming Soon", description: "Document vault is under development" })}
                >
                    Access Vault
                </Button>
            </div>
          </Card>
        </aside>
      </main>

      <NodeDetailSheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        type={selectedNode}
        project={project}
        onUpdate={onRefresh}
      />
    </div>
  );
}

// --- High-Performance Sub-Components ---

function KPIItem({ label, value, trend, icon: Icon, color }: any) {
    return (
        <div className="flex items-center gap-4 px-4">
            <div className={cn("h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border shadow-sm", color)}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-foreground tracking-tighter">{value}</span>
                    <span className={cn("text-[9px] font-black", trend.includes('-') ? "text-rose-500" : "text-emerald-500")}>{trend}</span>
                </div>
            </div>
        </div>
    );
}

function StatWidget({ label, value, sub, icon: Icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <Card className="rounded-3xl border-none shadow-sm bg-card p-6 hover:translate-y-[-4px] transition-transform">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4 border", colors[color])}>
                <Icon size={20} />
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
            <h4 className="text-xl font-black text-foreground tracking-tight">{value}</h4>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">{sub}</p>
        </Card>
    );
}

function ExecutionRow({ title, owner, status, progress, date }: any) {
    return (
        <TableRow className="hover:bg-slate-50/50 transition-colors group">
            <TableCell className="px-8 py-6">
                <div className="flex items-center gap-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full", 
                        status === 'completed' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : 
                        status === 'active' ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-slate-200"
                    )} />
                    <span className="text-sm font-black text-foreground">{title}</span>
                </div>
            </TableCell>
            <TableCell className="px-8 font-bold text-xs text-muted-foreground">{owner}</TableCell>
            <TableCell className="px-8">
                <Badge variant="outline" className={cn("rounded-lg text-[9px] font-black uppercase tracking-widest border-none px-2", 
                    status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                    status === 'active' ? "bg-blue-50 text-blue-600" : "bg-muted text-muted-foreground"
                )}>
                    {status}
                </Badge>
            </TableCell>
            <TableCell className="px-8 w-48">
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                        <span>Load</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-muted" />
                </div>
            </TableCell>
            <TableCell className="px-8 text-right font-black text-xs text-muted-foreground uppercase">{date}</TableCell>
        </TableRow>
    );
}

function ResourceModule({ title, icon: Icon, color, onClick }: any) {
    const colors: any = {
        violet: "bg-violet-50 text-violet-600 shadow-violet-100",
        blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    };
    return (
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8 group hover:shadow-xl hover:shadow-slate-200 transition-all cursor-pointer overflow-hidden relative" onClick={onClick}>
            <div className="flex items-center justify-between relative z-10">
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg", colors[color])}>
                    <Icon size={28} />
                </div>
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Maximize2 size={18} />
                </div>
            </div>
            <div className="mt-8 relative z-10">
                <h4 className="text-2xl font-black text-foreground tracking-tighter">{title}</h4>
                <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-tight">Access complete database</p>
            </div>
            {/* Abstract Background Design */}
            <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-muted rounded-full opacity-50 group-hover:scale-150 transition-transform duration-1000" />
        </Card>
    );
}

function ContactCard({ name, role, type }: any) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    {name.split(' ').map((n:any) => n[0]).join('')}
                </div>
                <div>
                    <p className="text-[11px] font-black text-foreground">{name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{role}</p>
                </div>
            </div>
            <Badge variant="outline" className="rounded-lg text-xs font-semibold tracking-widest border-border text-muted-foreground px-1.5 h-5">{type}</Badge>
        </div>
    );
}

function ActivityItem({ user, action, time, variant }: any) {
    return (
        <div className="flex gap-4 group">
            <div className="relative">
                <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0 z-10 relative", variant === 'rose' ? "bg-rose-500" : "bg-blue-500")} />
                <div className="absolute top-3 bottom-[-24px] left-[3.5px] w-[1px] bg-muted last:hidden" />
            </div>
            <div className="pb-6">
                <p className="text-[11px] font-black text-foreground leading-none">
                    <span className="text-primary">{user}</span> {action}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{time}</p>
            </div>
        </div>
    );
}

function Truck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-5h-7v7" />
            <path d="M13 9h4" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
        </svg>
    )
}
