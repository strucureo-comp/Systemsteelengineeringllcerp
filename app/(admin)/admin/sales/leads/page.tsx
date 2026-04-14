'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getLeads, createLead, updateLead, deleteLead, createCustomer } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Target, Plus, DollarSign, Search, Zap, Mail, Phone, Building2, User, Trash2, Edit2,
    ArrowRightCircle, UserCheck, Globe, MapPin, Briefcase, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Lead } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

export default function AdminLeadsPage() {
    const { user } = useAuth();
    const { companyProfile } = useTenant();
    const { baseCurrency } = useCompanySettings();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

    const isRetail = companyProfile?.businessType === 'b2c_retail';
    const currency = baseCurrency;

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', company: '', phone: '',
        potential_value: 0, notes: '', website: '', industry: '', address: ''
    });

    useEffect(() => {
        if (user?.role === 'admin') fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getLeads();
            setLeads(data as any || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({
        totalValue: leads.reduce((s, l) => s + (l.potential_value || 0), 0),
        activeLeads: leads.filter(l => l.status !== 'converted' && l.status !== 'lost').length,
        newLeads: leads.filter(l => l.status === 'new').length,
        convertedLeads: leads.filter(l => l.status === 'converted').length,
    }), [leads]);

    const PIPELINE_STAGES = [
        { id: 'new', label: 'New/Inbound', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
        { id: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
        { id: 'converted', label: 'Converted', color: 'bg-emerald-500' },
        { id: 'lost', label: 'Lost', color: 'bg-red-500' },
    ];

    const getStageLeads = (stageId: string) => leads.filter(l =>
        l.status === stageId &&
        ((l.first_name + ' ' + l.last_name).toLowerCase().includes(searchQuery.toLowerCase()) || l.company?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSubmit = async () => {
        if (!formData.first_name || !formData.last_name || !formData.email) return toast.error('First Name, Last Name, and Email are required');
        try {
            if (editingId) {
                await updateLead(editingId, formData);
                toast.success('Lead updated successfully');
            } else {
                await createLead(formData);
                toast.success('Lead added to pipeline');
            }
            setIsCreateOpen(false);
            setEditingId(null);
            fetchData();
            setFormData({ first_name: '', last_name: '', email: '', company: '', phone: '', potential_value: 0, notes: '', website: '', industry: '', address: '' });
        } catch { toast.error(editingId ? 'Update failed' : 'Failed to create lead'); }
    };

    const handleEdit = (lead: Lead) => {
        setFormData({
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            company: lead.company || '',
            phone: lead.phone || '',
            potential_value: lead.potential_value || 0,
            notes: lead.notes || '',
            website: (lead as any).website || '',
            industry: (lead as any).industry || '',
            address: (lead as any).address || '',
        });
        setEditingId(lead.id);
        setIsCreateOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this lead?')) return;
        try {
            await deleteLead(id);
            toast.success('Lead deleted');
            fetchData();
        } catch { toast.error('Failed to delete lead'); }
    };

    const handleConvertToCustomer = async () => {
        if (!convertingLead) return;
        try {
            // Create a customer from lead data
            const customerData = {
                name: convertingLead.company || `${convertingLead.first_name} ${convertingLead.last_name}`,
                industry: (convertingLead as any).industry || '',
                website: (convertingLead as any).website || '',
                phone: convertingLead.phone || '',
                address: (convertingLead as any).address || '',
                primary_contact: {
                    first_name: convertingLead.first_name,
                    last_name: convertingLead.last_name,
                    email: convertingLead.email,
                    phone: convertingLead.phone || '',
                    title: ''
                }
            };

            await createCustomer(customerData);
            // Mark lead as converted  
            await updateLead(convertingLead.id, { status: 'converted' });

            toast.success(`Lead "${convertingLead.first_name} ${convertingLead.last_name}" converted to Customer!`);
            setConvertDialogOpen(false);
            setConvertingLead(null);
            setSelectedLead(null);
            fetchData();
        } catch {
            toast.error('Failed to convert lead to customer');
        }
    };

    if (loading) return null;

    if (isRetail) {
        return (
            <DashboardShell requireAdmin>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold">Not Applicable</h2>
                    <p className="text-muted-foreground mt-2">Leads management is disabled for Retail/B2C operations.</p>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-4xl pb-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                        <div>
                            <h1 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Lead Management</h1>
                            <p className="text-sm text-muted-foreground mt-2">Organize and track prospects. Convert qualified leads into customers.</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search records..." className="pl-9 h-10 w-64 border-border bg-background" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>

                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-10 gap-2 font-bold shadow-sm">
                                        <Plus className="h-4 w-4" /> New Lead
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl p-0 border-none shadow-2xl">
                                    <div className="bg-background">
                                        <div className="p-6 border-b border-border">
                                            <h3 className="text-xl font-bold tracking-tight text-foreground">{editingId ? 'Edit Lead' : 'Register Lead'}</h3>
                                            <p className="text-muted-foreground text-xs mt-0.5">{editingId ? 'Update lead details' : 'Add a new potential client — aligned with Customer structure.'}</p>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            {/* Contact Details */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Contact Information</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">First Name</Label>
                                                        <Input placeholder="John" className="h-10 bg-background" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Last Name</Label>
                                                        <Input placeholder="Doe" className="h-10 bg-background" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Email Address</Label>
                                                        <Input type="email" placeholder="email@example.com" className="h-10 bg-background" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Phone</Label>
                                                        <Input placeholder="+971 50..." className="h-10 bg-background" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Organization — aligned with Customer form */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Organization</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Company</Label>
                                                        <Input placeholder="Acme Corp" className="h-10 bg-background" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Industry</Label>
                                                        <Input placeholder="Construction, Tech..." className="h-10 bg-background" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Website</Label>
                                                        <Input placeholder="https://" className="h-10 bg-background" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold ml-1">Address</Label>
                                                        <Input placeholder="Office address" className="h-10 bg-background" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Commercial */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Commercial</h4>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold ml-1">Potential Value ({currency})</Label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                        <Input type="number" className="h-10 pl-8 bg-background" value={formData.potential_value || ''} onChange={e => setFormData({ ...formData, potential_value: parseInt(e.target.value) })} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold ml-1">Notes</Label>
                                                    <Textarea placeholder="What are they looking for?" className="bg-background min-h-[80px]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-border flex justify-end">
                                            <Button onClick={handleSubmit} className="h-10 px-8 font-bold">{editingId ? 'Update Lead' : 'Add Lead'}</Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* KPI Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-muted-foreground mb-1">Active Leads</p>
                                <p className="text-2xl font-black text-foreground">{stats.activeLeads}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-muted-foreground mb-1">Pipeline Value</p>
                                <p className="text-2xl font-black text-foreground">{fmt(stats.totalValue)}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border shadow-sm bg-blue-500/5">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-blue-600 mb-1">New This Period</p>
                                <p className="text-2xl font-black text-foreground">{stats.newLeads}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border shadow-sm bg-emerald-500/5">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-emerald-600 mb-1">Converted</p>
                                <p className="text-2xl font-black text-foreground">{stats.convertedLeads}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kanban Board */}
                    <div className="flex gap-6 overflow-x-auto pb-4">
                        {PIPELINE_STAGES.map(stage => {
                            const stageLeads = getStageLeads(stage.id);
                            return (
                                <div key={stage.id} className="w-[300px] flex-shrink-0 flex flex-col gap-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                                            <span className="font-bold text-sm text-foreground">{stage.label}</span>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                                    </div>

                                    <div className="flex flex-col gap-3 min-h-[200px]">
                                        {stageLeads.map(lead => (
                                            <Card
                                                key={lead.id}
                                                className="border-border shadow-sm bg-card hover:border-primary/40 cursor-pointer transition-colors group"
                                                onClick={() => setSelectedLead(lead)}
                                            >
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="space-y-1 w-full">
                                                        <h4 className="font-bold text-sm text-foreground truncate">{lead.first_name} {lead.last_name}</h4>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Building2 size={12} className="shrink-0" />
                                                            <span className="truncate">{lead.company || 'Private'}</span>
                                                        </p>
                                                        {lead.email && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Mail size={12} className="shrink-0" />
                                                                <span className="truncate">{lead.email}</span>
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t border-border mt-3">
                                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}>
                                                                <Edit2 size={12} className="text-muted-foreground hover:text-primary" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleDelete(lead.id, e)}>
                                                                <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                                                            </Button>
                                                            {lead.status !== 'converted' && lead.status !== 'lost' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    title="Convert to Customer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConvertingLead(lead);
                                                                        setConvertDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <ArrowRightCircle size={12} className="text-emerald-500 hover:text-emerald-700" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                        {(lead.potential_value ?? 0) > 0 && (
                                                            <span className="text-sm font-black text-foreground ml-auto">
                                                                {fmt(lead.potential_value ?? 0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {stageLeads.length === 0 && (
                                            <div className="h-24 border border-dashed border-border rounded-lg flex items-center justify-center bg-muted/20">
                                                <span className="text-xs text-muted-foreground">Empty</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>

                {/* Lead Detail Drawer */}
                <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
                    <SheetContent className="sm:max-w-md p-0 overflow-y-auto">
                        {selectedLead && (
                            <div className="flex flex-col h-full bg-card">
                                <SheetHeader className="p-6 border-b">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {selectedLead.first_name.charAt(0)}{selectedLead.last_name.charAt(0)}
                                        </div>
                                        <div>
                                            <SheetTitle className="text-lg font-black text-foreground">{selectedLead.first_name} {selectedLead.last_name}</SheetTitle>
                                            <p className="text-xs text-muted-foreground font-medium">{selectedLead.company || 'Individual'}</p>
                                        </div>
                                    </div>
                                </SheetHeader>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Status */}
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn(
                                            "text-xs font-bold",
                                            selectedLead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                selectedLead.status === 'contacted' ? 'bg-amber-100 text-amber-800' :
                                                    selectedLead.status === 'qualified' ? 'bg-indigo-100 text-indigo-800' :
                                                        selectedLead.status === 'converted' ? 'bg-emerald-100 text-emerald-800' :
                                                            'bg-red-100 text-red-800'
                                        )}>
                                            {selectedLead.status.charAt(0).toUpperCase() + selectedLead.status.slice(1)}
                                        </Badge>
                                        {(selectedLead.potential_value ?? 0) > 0 && (
                                            <Badge variant="outline" className="text-xs font-bold">
                                                {fmt(selectedLead.potential_value ?? 0)}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Contact Information */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Contact Information</h4>
                                        <div className="space-y-2">
                                            <DetailRow icon={Mail} label="Email" value={selectedLead.email || '—'} />
                                            <DetailRow icon={Phone} label="Phone" value={selectedLead.phone || '—'} />
                                        </div>
                                    </div>

                                    {/* Organization */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Organization</h4>
                                        <div className="space-y-2">
                                            <DetailRow icon={Building2} label="Company" value={selectedLead.company || '—'} />
                                            <DetailRow icon={Briefcase} label="Industry" value={(selectedLead as any).industry || '—'} />
                                            <DetailRow icon={Globe} label="Website" value={(selectedLead as any).website || '—'} />
                                            <DetailRow icon={MapPin} label="Address" value={(selectedLead as any).address || '—'} />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {selectedLead.notes && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2">Notes</h4>
                                            <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{selectedLead.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                {selectedLead.status !== 'converted' && selectedLead.status !== 'lost' && (
                                    <div className="border-t p-6 flex gap-3">
                                        <Button
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 font-bold text-xs gap-2"
                                            onClick={() => {
                                                setConvertingLead(selectedLead);
                                                setConvertDialogOpen(true);
                                            }}
                                        >
                                            <UserCheck className="h-4 w-4" /> Convert to Customer
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-10 font-bold text-xs"
                                            onClick={() => { handleEdit(selectedLead); setSelectedLead(null); }}
                                        >
                                            <Edit2 className="h-4 w-4 mr-1" /> Edit
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

                {/* Convert to Customer Confirmation Dialog */}
                <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Convert Lead to Customer</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                This will create a new Customer record from the lead data and mark the lead as converted.
                            </DialogDescription>
                        </DialogHeader>

                        {convertingLead && (
                            <div className="space-y-4">
                                <div className="bg-muted/30 rounded-md p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground">Lead</span>
                                        <ArrowRightCircle className="h-4 w-4 text-emerald-500" />
                                        <span className="text-xs font-bold text-muted-foreground">Customer</span>
                                    </div>
                                    <div className="border-t pt-2 space-y-1">
                                        <p className="text-sm font-bold text-foreground">{convertingLead.first_name} {convertingLead.last_name}</p>
                                        <p className="text-xs text-muted-foreground">{convertingLead.company || 'Individual'}</p>
                                        <p className="text-xs text-muted-foreground">{convertingLead.email}</p>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    <p><strong>Customer Name:</strong> {convertingLead.company || `${convertingLead.first_name} ${convertingLead.last_name}`}</p>
                                    <p className="mt-1"><strong>Primary Contact:</strong> {convertingLead.first_name} {convertingLead.last_name}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setConvertDialogOpen(false)} className="h-10 font-bold text-xs">Cancel</Button>
                            <Button onClick={handleConvertToCustomer} className="h-10 px-6 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 gap-2">
                                <UserCheck className="h-4 w-4" /> Confirm Conversion
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </ModuleGuard>
        </DashboardShell>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                <Icon size={12} className="text-muted-foreground" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                <p className="text-xs font-medium text-foreground">{value}</p>
            </div>
        </div>
    );
}