'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getUsers } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
    Users, 
    Search, 
    RefreshCcw, 
    ChevronRight, 
    Mail, 
    Phone, 
    Calendar,
    ShieldCheck,
    Star,
    ArrowUpRight,
    UserPlus,
    LayoutGrid
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/db/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (user?.role === 'admin') fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setClients(data.filter((u) => u.role === 'client') || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  const stats = useMemo(() => ({
    total: clients.length,
    newThisMonth: clients.filter(c => {
        const d = new Date(c.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    activeSites: 0
  }), [clients]);

  if (!isMounted) return null;

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8 pb-12">
        {/* Visual Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground">Client Desk</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Manage your verified clients and enterprise partners.
            </p>
          </div>
          <Button className="rounded-2xl bg-slate-900 h-12 px-8 font-bold shadow-xl shadow-slate-200 hover:scale-[1.02] transition-transform">
            <UserPlus className="h-5 w-5 mr-2" /> Invite Client
          </Button>
        </div>

        {/* Global KPI Strip */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-[2.5rem]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
              <ClientKPI title="Total Partners" value={stats.total} icon={Users} color="blue" trend="Verified" />
              <ClientKPI title="New Inbound" value={stats.newThisMonth} icon={Star} color="emerald" trend="This month" />
              <ClientKPI title="Engagement" value="High" icon={ShieldCheck} color="indigo" trend="System status" />
          </div>
        )}

        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-foreground">Partner Directory</h2>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or email..." 
                        className="pl-10 rounded-2xl border-none bg-card shadow-sm w-[350px] h-11 font-medium"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[300px] w-full rounded-[3rem]" />
                ))}
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClients.map(client => (
                      <Card key={client.id} className="rounded-[3rem] border-none shadow-sm bg-card overflow-hidden group hover:shadow-2xl transition-all duration-500 cursor-pointer">
                          <CardContent className="p-10">
                              <div className="flex items-start justify-between mb-8">
                                  <Avatar className="h-20 w-20 rounded-[2rem] border-4 border-slate-50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                      <AvatarFallback className="bg-slate-900 text-card-foreground font-black text-xl">
                                          {client.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                      </AvatarFallback>
                                  </Avatar>
                                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">Active Partner</Badge>
                              </div>
                              <div className="space-y-4">
                                  <div className="space-y-1">
                                      <h3 className="text-2xl font-black text-foreground line-clamp-1">{client.full_name}</h3>
                                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                          <Mail size={14} className="text-primary" />
                                          <span className="truncate">{client.email}</span>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                                      <div className="space-y-1">
                                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Joined</p>
                                          <p className="text-xs font-black text-foreground">{new Date(client.created_at).toLocaleDateString()}</p>
                                      </div>
                                      <div className="text-right">
                                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                              <ChevronRight size={20} />
                                          </Button>
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
                  {filteredClients.length === 0 && (
                      <div className="col-span-full py-24 text-center bg-card rounded-[3rem] shadow-sm">
                          <Users size={48} className="mx-auto text-slate-100 mb-4" />
                          <p className="font-black text-slate-300 uppercase tracking-widest text-xs">No partners identified</p>
                      </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </DashboardShell>
  );
}

function ClientKPI({ title, value, icon: Icon, color, trend }: { title: string; value: any; icon: any; color: string; trend: string }) {
    const variants: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 shadow-blue-100/50",
        emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-100/50",
        indigo: "bg-indigo-50 text-indigo-600 shadow-indigo-100/50",
    };
    return (
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8 group hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", variants[color])}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</p>
            <h3 className="text-3xl font-black text-foreground tracking-tighter">{value}</h3>
        </Card>
    );
}