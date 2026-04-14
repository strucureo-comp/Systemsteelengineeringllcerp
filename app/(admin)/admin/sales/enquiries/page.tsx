'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getEnquiries, updateEnquiry, createLead } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Inbox, 
    Mail, 
    CheckCircle, 
    ArrowRight, 
    User as UserIcon, 
    LayoutGrid, 
    MessageSquare, 
    RefreshCcw, 
    Search, 
    ChevronRight, 
    Clock, 
    ShieldCheck,
    Send,
    Activity
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Enquiry } from '@/lib/db/types';

export default function AdminEnquiriesPage() {
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
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const stats = useMemo(() => ({
        total: enquiries.length,
        new: enquiries.filter(e => e.status === 'new').length,
        converted: enquiries.filter(e => e.status === 'converted').length,
        ratio: enquiries.length ? Math.round((enquiries.filter(e => e.status !== 'new').length / enquiries.length) * 100) : 0
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
                probability: 10
            });
            await updateEnquiry(enquiry.id, { status: 'converted' });
            toast.success('Converted to Lead');
            setSelectedEnquiry(null);
            fetchData();
        } catch { toast.error('Failed to convert'); }
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
                
                {/* Visual Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight text-foreground">Inbound Center</h1>
                        <p className="text-muted-foreground font-medium">Review and process incoming website enquiries.</p>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid gap-6 md:grid-cols-4">
                    <EnquiryKPI title="Total Inbound" value={stats.total} icon={Inbox} color="slate" />
                    <EnquiryKPI title="Needs Action" value={stats.new} icon={Clock} color="amber" />
                    <EnquiryKPI title="Lead Generation" value={stats.converted} icon={ShieldCheck} color="emerald" />
                    <EnquiryKPI title="Processing Rate" value={`${stats.ratio}%`} icon={Activity} color="blue" />
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-black text-foreground">Live Feed</h2>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search messages..." className="pl-10 rounded-2xl border-none bg-card shadow-sm w-[350px] h-11 font-medium" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredEnquiries.map(e => (
                            <Card key={e.id} onClick={() => setSelectedEnquiry(e)} className="rounded-[3rem] border-none shadow-sm bg-card overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-pointer p-10">
                                <div className="flex flex-col h-full justify-between">
                                    <div className="space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="h-16 w-16 rounded-[1.5rem] bg-muted flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-inner">
                                                <Mail size={32} />
                                            </div>
                                            <Badge className={cn(
                                                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                                                e.status === 'new' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                {e.status}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black text-foreground line-clamp-1 group-hover:text-primary transition-colors">{e.subject}</h3>
                                            <p className="text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed">{e.message}</p>
                                        </div>
                                    </div>
                                    <div className="mt-10 flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-black text-foreground">{e.name}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{new Date(e.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-200 transition-transform group-hover:translate-x-1 group-hover:text-slate-900" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {filteredEnquiries.length === 0 && (
                            <div className="col-span-full py-24 text-center bg-card rounded-[3rem] shadow-sm">
                                <Inbox size={48} className="mx-auto text-slate-100 mb-4" />
                                <p className="font-black text-slate-300 uppercase tracking-widest text-xs">No enquiries found</p>
                            </div>
                        )}
                    </div>
                </div>

                <Dialog open={!!selectedEnquiry} onOpenChange={o => !o && setSelectedEnquiry(null)}>
                    <DialogContent className="max-w-2xl rounded-[2.5rem] p-10">
                        {selectedEnquiry && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-3xl font-black tracking-tight">Message Details</h3>
                                    <Badge className="bg-slate-900 text-card-foreground rounded-full px-4 py-1 font-black text-[10px] uppercase">{selectedEnquiry.status}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-6 bg-muted p-6 rounded-[2rem]">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sender</p>
                                        <p className="text-lg font-black text-foreground">{selectedEnquiry.name}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Received</p>
                                        <p className="text-lg font-black text-foreground">{new Date(selectedEnquiry.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="col-span-2 space-y-1 pt-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email Address</p>
                                        <p className="text-lg font-bold text-primary">{selectedEnquiry.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">The Message</p>
                                    <div className="p-8 border-4 border-slate-50 rounded-[2rem] bg-card italic text-muted-foreground leading-relaxed font-medium">
                                        &ldquo;{selectedEnquiry.message}&rdquo;
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest" asChild>
                                        <a href={`mailto:${selectedEnquiry.email}?subject=Re: ${selectedEnquiry.subject}`}>
                                            <Send size={16} className="mr-2" /> Reply Directly
                                        </a>
                                    </Button>
                                    {selectedEnquiry.status !== 'converted' && (
                                        <Button onClick={() => handleConvertToLead(selectedEnquiry)} className="flex-1 h-14 rounded-2xl bg-slate-900 font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200">
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
        blue: "bg-blue-50 text-blue-600 shadow-blue-100/50",
        emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-100/50",
        amber: "bg-amber-50 text-amber-600 shadow-amber-100/50",
        slate: "bg-muted text-muted-foreground shadow-slate-100/50",
    };
    return (
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-8 group hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", variants[color])}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-black text-foreground tracking-tighter">{value}</h3>
        </Card>
    );
}