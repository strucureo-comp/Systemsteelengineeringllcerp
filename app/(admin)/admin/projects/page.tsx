'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useTenant } from '@/lib/tenant-context';
import { getProjects, updateProject, getUsers, createProject } from '@/lib/api';
import { ProjectsContent } from './_components/projects-content';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  Activity,
  ChevronRight,
  Box,
  Clock,
  CheckCircle2,
  RefreshCcw,
  LayoutGrid,
  FolderKanban,
  Calendar,
  Target,
  Layers,
  ArrowUpRight,
  MapPin,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import type { Project, User } from '@/lib/db/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

type ProjectMode = 'registry' | 'operations' | 'live' | 'archived';

export default function AdminProjectsPage() {
  const router = useRouter();
  const { getModuleLabel } = useTenant();
  const [activeMode, setActiveMode] = useState<ProjectMode>('registry');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Project State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', client_id: '' });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to sync site records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => ['accepted', 'in_progress', 'testing'].includes(p.status)).length,
    pending: projects.filter(p => p.status === 'pending').length,
    completed: projects.filter(p => p.status === 'completed').length
  }), [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeMode === 'live') return ['accepted', 'in_progress', 'testing'].includes(p.status);
      if (activeMode === 'archived') return p.status === 'completed' || p.status === 'cancelled';
      return true;
    });
  }, [projects, searchQuery, activeMode]);

  const handleOpenCreate = async () => {
    setIsCreateOpen(true);
    if (clients.length === 0) {
      const users = await getUsers().catch(() => []);
      setClients(users.filter(u => u.role === 'client'));
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.client_id) return toast.error('Required fields missing');
    setCreating(true);
    try {
      await createProject(newProject);
      toast.success('Enterprise Project Dispatched');
      setIsCreateOpen(false);
      setNewProject({ title: '', description: '', client_id: '' });
      fetchAll();
    } catch { toast.error('Initialization failed'); }
    finally { setCreating(false); }
  };

  if (loading) {
    return (
      <ModuleGuard module="projects">
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
    <ModuleGuard module="projects">
      <div className="space-y-6 max-w-4xl">
        {/* Unified Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{getModuleLabel('projects')}</h1>
            <p className="text-muted-foreground">Manage your deployments, active jobs, and project registry.</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={activeMode} onValueChange={(v) => setActiveMode(v as ProjectMode)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registry">Master Registry</SelectItem>
                <SelectItem value="live">Live Deployments</SelectItem>
                <SelectItem value="operations">Ops Planning</SelectItem>
                <SelectItem value="archived">Archived Sites</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                  <Button onClick={handleOpenCreate} className="h-10 px-6 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" /> Launch Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-md">
                  <div className="p-6 bg-foreground text-card-foreground">
                    <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 mb-6">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight uppercase">Initialize Deployment</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">Configure Site Metadata & Client Linkage</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Target Client Account</Label>
                        <Select value={newProject.client_id} onValueChange={(val) => setNewProject({ ...newProject, client_id: val })}>
                          <SelectTrigger className="h-10 border-border font-bold text-xs uppercase"><SelectValue placeholder="Select Client Profile..." /></SelectTrigger>
                          <SelectContent>
                            {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">{c.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Project Title / Site Name</Label>
                        <Input placeholder="e.g. Structure Bridge A-10" className="h-10 border-border font-bold text-xs uppercase" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Deployment Specifications</Label>
                        <Textarea placeholder="Scope of works..." className="min-h-[100px] border-border text-xs resize-none" value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-muted border-t border-border">
                    <Button onClick={handleCreateProject} disabled={creating} className="w-full h-12 bg-primary font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                      {creating ? "Initializing..." : "Commit Site Record"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatsTile title="Total Footprint" value={stats.total} icon={Layers} label="Operational Units" />
            <StatsTile title="Active Deploy" value={stats.active} icon={Activity} label="Live Site Progress" highlight />
            <StatsTile title="New Requisitions" value={stats.pending} icon={Clock} label="Awaiting Approval" />
            <StatsTile title="Archived Work" value={stats.completed} icon={CheckCircle2} label="Closed Out Sites" />
          </div>

          {/* Main Content Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                  {activeMode === 'registry' ? 'Master Site Registry' :
                    activeMode === 'live' ? 'Live Deployment Monitor' :
                      activeMode === 'operations' ? 'Project Operations Hub' : 'Archived Project Data'}
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  {filteredProjects.length} Records synchronized in this view
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="SEARCH SITE RECORDS..."
                  className="pl-9 h-9 border-border text-[10px] font-bold uppercase w-64 rounded-md"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {activeMode === 'operations' ? (
              <div className="animate-in fade-in duration-500">
                <ProjectsContent />
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-500">
                {filteredProjects.map(p => (
                  <ProjectVisualCard
                    key={p.id}
                    project={p}
                    onClick={() => router.push(`/admin/projects/${p.id}`)}
                  />
                ))}
                {filteredProjects.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-md bg-muted">
                    <Box className="h-10 w-10 text-zinc-200 mx-auto mb-2" />
                    <p className="text-muted-foreground">No Projects found in this mode</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ModuleGuard>
  );
}

function ProjectVisualCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const progress = project.status === 'completed' ? 100 : project.status === 'accepted' ? 25 : project.status === 'in_progress' ? 65 : 10;

  return (
    <Card onClick={onClick} className="border border-border shadow-sm rounded-md bg-card overflow-hidden hover:border-primary/50 transition-colors group cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300">
            <Briefcase size={20} />
          </div>
          <Badge variant="outline" className={cn(
            "text-xs font-semibold tracking-widest px-2 py-0.5 rounded-full border-none",
            project.status === 'completed' ? "bg-emerald-50 text-emerald-700" :
              project.status === 'pending' ? "bg-amber-50 text-amber-700" : "bg-primary/5 text-primary"
          )}>
            {project.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-1 mb-6">
          <h3 className="text-sm font-black text-foreground uppercase tracking-tight line-clamp-1">{project.title}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin size={10} className="text-primary" />
            <p className="text-[9px] font-bold uppercase truncate">Site Deployment Record</p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs font-semibold tracking-widest">
            <span className="text-muted-foreground">Project Integrity</span>
            <span className="text-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-1000", progress === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-muted-foreground/60" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {new Date(project.created_at).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground/60 group-hover:bg-zinc-50 group-hover:text-primary transition-all">
            <ChevronRight size={14} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsTile({ title, value, icon: Icon, label, highlight }: { title: string; value: any; icon: any; label: string; highlight?: boolean }) {
  return (
    <Card className={cn(
      "border border-border shadow-sm rounded-md bg-card p-5 relative overflow-hidden",
      highlight && "border-primary/20 bg-primary/5"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center border transition-colors",
          highlight ? "bg-primary text-card-foreground border-primary" : "bg-muted border-border text-muted-foreground"
        )}>
          <Icon size={16} />
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
        <h3 className="text-xl font-black text-foreground tracking-tight">{value}</h3>
        <p className={cn("text-xs font-semibold tracking-tighter", highlight ? "text-primary" : "text-muted-foreground")}>{label}</p>
      </div>
    </Card>
  );
}
