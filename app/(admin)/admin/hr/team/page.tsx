'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getUsers } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Users, 
    UserPlus, 
    Search, 
    Shield, 
    Mail, 
    Clock, 
    ChevronRight, 
    MoreHorizontal, 
    RefreshCcw,
    ShieldCheck,
    UserCheck,
    Lock,
    Settings2,
    Trash2,
    MoreVertical,
    Activity,
    ShieldAlert,
    Key
} from 'lucide-react';
import type { User } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (currentUser?.role === 'admin') fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Team Fetch Error:', error);
      toast.error('Failed to load access directory');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    totalUsers: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    clients: users.filter(u => u.role === 'client').length,
    activeThisWeek: users.filter(u => (u as any).status === 'active').length
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  if (!isMounted) return null;

  if (loading) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center shadow-inner">
            <RefreshCcw className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <p className="font-black text-foreground uppercase tracking-widest text-xs">Synchronizing Access Directory...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-6 max-w-4xl pb-20">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Access Directory</h1>
            <p className="text-sm text-muted-foreground mt-2">Manage administrative privileges and human resource registry.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={fetchData}>
              <RefreshCcw className={cn("h-3 w-3", loading && "animate-spin")} />
              Sync
            </Button>
            <Button className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest gap-2">
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Visual Stats Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <KpiCard label="TOTAL ACCOUNTS" value={stats.totalUsers.toString()} />
            <KpiCard label="ADMINS" value={stats.admins.toString()} />
            <KpiCard label="PORTALS" value={stats.clients.toString()} />
            <KpiCard label="ACTIVE" value={stats.activeThisWeek.toString()} />
        </div>

        {/* User Registry */}
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 border-b pb-2 flex-1">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Identity Registry</h2>
                    <Badge variant="outline" className="text-[9px] font-black tracking-widest">{filteredUsers.length} MEMBERS</Badge>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input 
                        placeholder="FILTER BY IDENTITY..." 
                        className="pl-9 h-9 w-64 rounded-lg border-border bg-card text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2">
                {filteredUsers.map(u => (
                    <Card 
                        key={u.id} 
                        onClick={() => setSelectedUser(u)}
                        className="rounded-xl border border-border shadow-sm bg-card overflow-hidden group hover:border-primary/50 transition-all cursor-pointer relative"
                    >
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                                    {u.full_name.charAt(0).toUpperCase()}
                                </div>
                                <Badge variant="secondary" className={cn(
                                    "rounded-md px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                                    u.role === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    {u.role}
                                </Badge>
                            </div>
                            
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{u.full_name}</h3>
                                <p className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-tight">{u.email}</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Access Policy</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        {/* User Detailed Sheet */}
        <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
            <SheetContent className="sm:max-w-xl p-0 border-none bg-muted">
                {selectedUser && (
                    <div className="flex flex-col h-full relative overflow-hidden">
                        {/* Header Section */}
                        <div className="p-8 pb-24 bg-slate-900 text-card-foreground relative">
                            <div className="flex items-center justify-between mb-8">
                                <Badge className="bg-indigo-600 text-card-foreground border-none font-black text-[10px] px-3 py-1 tracking-widest uppercase">
                                    {selectedUser.role} Account
                                </Badge>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="outline" className="rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-card-foreground">
                                        <Settings2 size={18} />
                                    </Button>
                                    <Button size="icon" variant="outline" className="rounded-xl border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500">
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-2xl">
                                    <div className="h-full w-full rounded-[1.4rem] bg-slate-900 flex items-center justify-center text-3xl font-black">
                                        {selectedUser.full_name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tight">{selectedUser.full_name}</h2>
                                    <p className="text-indigo-400 font-bold flex items-center gap-2">
                                        <Mail size={14} />
                                        {selectedUser.email}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Abstract bg element */}
                            <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
                                <ShieldCheck size={240} />
                            </div>
                        </div>

                        {/* Tabs Content */}
                        <div className="px-6 -mt-12 z-10 pb-12">
                            <Card className="rounded-[2rem] border-none shadow-2xl bg-card overflow-hidden">
                                <Tabs defaultValue="permissions" className="w-full">
                                    <TabsList className="w-full justify-start rounded-none bg-muted p-0 h-14 border-b">
                                        <TabsTrigger value="permissions" className="rounded-none h-full px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">Permissions</TabsTrigger>
                                        <TabsTrigger value="activity" className="rounded-none h-full px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">Security Log</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="permissions" className="p-8 space-y-8">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Module Access Control</h4>
                                            <div className="grid gap-4">
                                                <AccessItem icon={ShieldCheck} label="Global Administrative Rights" active={selectedUser.role === 'admin'} />
                                                <AccessItem icon={Users} label="Human Resources Management" active={true} />
                                                <AccessItem icon={Lock} label="Financial Systems Access" active={selectedUser.role === 'admin'} />
                                                <AccessItem icon={Activity} label="Project Monitoring" active={true} />
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-50">
                                            <Button className="w-full rounded-2xl h-12 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100">
                                                Update Security Policy
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="activity" className="p-8">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Recent Identity Events</h4>
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex gap-4 items-start">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                        <Key size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">Successful Login Attempt</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">Monday, 16 Feb 2026 • 10:42 AM • IP: 192.168.1.{i}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </Card>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
      </div>
    </DashboardShell>
  );
}

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


function AccessItem({ icon: Icon, label, active }: { icon: any, label: string, active: boolean }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
            <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", active ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-muted-foreground")}>
                    <Icon size={18} />
                </div>
                <span className="text-sm font-bold text-slate-700">{label}</span>
            </div>
            <div className={cn("h-2 w-10 rounded-full", active ? "bg-emerald-500 shadow-sm shadow-emerald-100" : "bg-slate-300")} />
        </div>
    );
}
