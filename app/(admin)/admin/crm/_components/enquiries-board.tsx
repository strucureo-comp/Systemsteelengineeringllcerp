'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createLead, getEnquiries, updateEnquiry } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Enquiry } from '@/lib/db/types';
import { Activity, ChevronRight, Clock, Inbox, Mail, Search, Send, ShieldCheck, RefreshCcw } from 'lucide-react';

export default function EnquiriesBoard() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (user?.role === 'admin') fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getEnquiries();
      setEnquiries(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: enquiries.length,
    new: enquiries.filter(e => e.status === 'new').length,
    converted: enquiries.filter(e => e.status === 'converted').length,
    ratio: enquiries.length ? Math.round((enquiries.filter(e => e.status !== 'new').length / enquiries.length) * 100) : 0,
  }), [enquiries]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [enquiries, searchQuery]);

  const handleConvertToLead = async (enquiry: Enquiry) => {
    try {
      await createLead({
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        status: 'new',
        source: 'Website Enquiry',
        notes: `Message: ${enquiry.message}`,
        potential_value: 0,
        probability: 10,
      });
      await updateEnquiry(enquiry.id, { status: 'converted' });
      toast.success('Converted to Lead');
      setSelectedEnquiry(null);
      fetchData();
    } catch {
      toast.error('Failed to convert');
    }
  };

  if (!isMounted) return null;

  if (loading) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCcw className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-foreground">Checking Inbox...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">CRM Enquiries</h1>
            <p className="text-sm text-muted-foreground">Review and process incoming website enquiries from CRM.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <EnquiryKPI title="Total Inbound" value={stats.total} icon={Inbox} color="slate" />
          <EnquiryKPI title="Needs Action" value={stats.new} icon={Clock} color="amber" />
          <EnquiryKPI title="Lead Generation" value={stats.converted} icon={ShieldCheck} color="emerald" />
          <EnquiryKPI title="Processing Rate" value={`${stats.ratio}%`} icon={Activity} color="blue" />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground uppercase">Live Feed</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-10 w-[350px] h-10 border-border bg-background" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEnquiries.map(e => (
              <Card key={e.id} onClick={() => setSelectedEnquiry(e)} className="border-border shadow-sm bg-card hover:border-primary/40 cursor-pointer transition-colors group overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-md border border-border bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <Mail size={18} />
                    </div>
                    <Badge className={cn(
                      'text-[10px] font-bold uppercase px-2 py-1 rounded-sm border',
                      e.status === 'new' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    )}>
                      {e.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{e.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{e.message}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">{e.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredEnquiries.length === 0 && (
              <div className="col-span-full py-16 text-center bg-card border border-border rounded-lg shadow-sm">
                <Inbox size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-bold text-sm text-muted-foreground uppercase tracking-widest">No enquiries found</p>
              </div>
            )}
          </div>
        </div>

        <Dialog open={!!selectedEnquiry} onOpenChange={o => !o && setSelectedEnquiry(null)}>
          <DialogContent className="max-w-2xl rounded-lg p-6 border-border">
            {selectedEnquiry && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Message Details</h3>
                  <Badge className="text-[10px] font-bold uppercase px-2 py-1 rounded-sm bg-muted text-muted-foreground border border-border">{selectedEnquiry.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border border-border">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sender</p>
                    <p className="text-sm font-bold text-foreground">{selectedEnquiry.name}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Received</p>
                    <p className="text-sm font-bold text-foreground">{new Date(selectedEnquiry.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2 space-y-1 pt-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-medium text-primary break-all">{selectedEnquiry.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">The Message</p>
                  <div className="p-4 border border-border rounded-md bg-card text-sm text-muted-foreground leading-relaxed">
                    &ldquo;{selectedEnquiry.message}&rdquo;
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-10 rounded-md font-bold uppercase text-xs tracking-widest" asChild>
                    <a href={`mailto:${selectedEnquiry.email}?subject=Re: ${selectedEnquiry.subject}`}>
                      <Send size={14} className="mr-2" /> Reply Directly
                    </a>
                  </Button>
                  {selectedEnquiry.status !== 'converted' && (
                    <Button onClick={() => handleConvertToLead(selectedEnquiry)} className="flex-1 h-10 rounded-md font-bold uppercase text-xs tracking-widest">
                      Convert to Lead
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}

function EnquiryKPI({ title, value, icon: Icon, color }: { title: string; value: any; icon: any; color: string }) {
  const variants: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    slate: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardContent className="p-4">
        <div className={cn('h-10 w-10 rounded-md flex items-center justify-center border mb-3', variants[color])}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
      </CardContent>
    </Card>
  );
}
