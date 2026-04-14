'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getCustomers, createCustomer, deleteCustomer, updateCustomer, getLeads, getOpportunities, getInvoices } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users, Building2, Briefcase, Globe, Phone, Trash2, Edit2,
    Mail, MapPin, User, FileText, ArrowLeft, MessageSquare, CreditCard,
    Download, Printer, Save, X, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { CustomerAccount, Invoice } from '@/lib/db/types';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CustomerComment {
    id: string;
    text: string;
    createdAt: string;
    createdBy: string;
}

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { companyProfile } = useTenant();
    const { baseCurrency, email, phone, address } = useCompanySettings();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<CustomerAccount | null>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        website: '',
        phone: '',
        address: '',
        email: '',
        primary_contact: {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            title: ''
        }
    });

    const [comments, setComments] = useState<CustomerComment[]>([]);
    const [newComment, setNewComment] = useState('');

    const isRetail = companyProfile?.businessType === 'b2c_retail';
    const currency = baseCurrency;

    const fmt = (n: number) => formatCurrency(n, baseCurrency);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const allCustomersRaw: any[] = await getCustomers().catch(() => []) || [];
            const allCustomers: CustomerAccount[] = allCustomersRaw.map((c: any) => ({
                ...c,
                id: String(c._id || c.id),
            }));

            const [leadsData, oppsData, invsData] = await Promise.all([
                getLeads().catch(() => []),
                getOpportunities().catch(() => []),
                getInvoices().catch(() => []),
            ]);

            setLeads(leadsData || []);
            setOpportunities((oppsData as any) || []);
            setInvoices(invsData || []);

            if (customerId === 'new') {
                setIsCreating(true);
            } else {
                const foundCustomer = allCustomers.find(c => c.id === customerId);
                if (foundCustomer) {
                    setCustomer(foundCustomer);
                    setFormData({
                        name: foundCustomer.name || '',
                        industry: foundCustomer.industry || '',
                        website: foundCustomer.website || '',
                        phone: foundCustomer.phone || '',
                        address: (foundCustomer as any).address || '',
                        email: (foundCustomer as any).email || '',
                        primary_contact: (foundCustomer as any).primary_contact || {
                            first_name: '',
                            last_name: '',
                            email: '',
                            phone: '',
                            title: ''
                        }
                    });
                    const savedComments = localStorage.getItem(`customer_comments_${customerId}`);
                    if (savedComments) {
                        try {
                            setComments(JSON.parse(savedComments));
                        } catch {
                            setComments([]);
                        }
                    }
                } else {
                    toast.error('Customer not found');
                    router.push('/admin/sales/customers');
                }
            }
        } catch (e) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const customerData = useMemo(() => {
        if (!customerId || customerId === 'new') return null;

        const custInvoices = invoices.filter(i => i.client_id === customerId || i.customer_id === customerId);
        const custPayments = (() => {
            try {
                return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sales_payments') || '[]') : [];
            } catch {
                return [];
            }
        })().filter((p: any) => p.customerId === customerId || p.customer_id === customerId);
        const custSalesOrders = (() => {
            try {
                return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sales_orders') || '[]') : [];
            } catch {
                return [];
            }
        })().filter((o: any) => o.customerId === customerId || o.customer_id === customerId);
        const custOpps = opportunities.filter(o => o.account_id === customerId);

        const totalInvoiced = custInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
        const totalPaid = custPayments.reduce((s: any, p: any) => s + Number(p.amount || p.total || 0), 0);
        const totalRevenue = custInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);
        const pendingAmount = custInvoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount || 0), 0);
        const balance = totalInvoiced - totalPaid;

        const monthlyIncome: { month: string; amount: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = month.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthRevenue = custInvoices
                .filter(i => i.status === 'paid' && (i as any).paid_at)
                .filter(i => {
                    const paidDate = new Date((i as any).paid_at);
                    return paidDate >= monthStart && paidDate <= monthEnd;
                })
                .reduce((s, i) => s + Number(i.amount || 0), 0);

            monthlyIncome.push({ month: key, amount: monthRevenue });
        }

        return {
            invoices: custInvoices,
            payments: custPayments,
            salesOrders: custSalesOrders,
            opportunities: custOpps,
            totalInvoiced,
            totalPaid,
            totalRevenue,
            pendingAmount,
            balance,
            monthlyIncome,
            wonDeals: custOpps.filter(o => o.stage === 'won').length,
            pipelineValue: custOpps.filter(o => o.stage !== 'won' && o.stage !== 'lost').reduce((s, o) => s + Number(o.amount || 0), 0),
        };
    }, [customerId, invoices, opportunities]);

    const handleSave = async () => {
        if (!formData.name) return toast.error('Customer name is required');

        try {
            if (isCreating) {
                await createCustomer(formData);
                toast.success('Customer created successfully');
                router.push('/admin/sales/customers');
            } else if (customer) {
                await updateCustomer(customer.id, formData);
                setCustomer({ ...customer, ...formData } as CustomerAccount);
                setIsEditing(false);
                toast.success('Customer updated successfully');
            }
        } catch (e) {
            toast.error(isCreating ? 'Failed to create customer' : 'Failed to update customer');
        }
    };

    const handleDelete = async () => {
        if (!customer) return;
        if (!confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) return;

        try {
            await deleteCustomer(customer.id);
            toast.success('Customer deleted successfully');
            router.push('/admin/sales/customers');
        } catch (e) {
            toast.error('Failed to delete customer');
        }
    };

    const handleAddComment = () => {
        if (!newComment.trim() || !customer) return;

        const comment: CustomerComment = {
            id: Date.now().toString(),
            text: newComment.trim(),
            createdAt: new Date().toISOString(),
            createdBy: localStorage.getItem('user_name') || 'User'
        };

        const updatedComments = [...comments, comment];
        setComments(updatedComments);
        localStorage.setItem(`customer_comments_${customer.id}`, JSON.stringify(updatedComments));
        setNewComment('');
        toast.success('Comment added');
    };

    const handleDeleteComment = (commentId: string) => {
        if (!customer) return;
        const updatedComments = comments.filter(c => c.id !== commentId);
        setComments(updatedComments);
        localStorage.setItem(`customer_comments_${customer.id}`, JSON.stringify(updatedComments));
        toast.success('Comment deleted');
    };

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardShell>
        );
    }

    if (isCreating) {
        return (
            <DashboardShell requireAdmin>
                <ModuleGuard module="sales">
                    <div className="space-y-6 max-w-4xl mx-auto pb-12">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/sales/customers')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-black text-foreground">New Customer</h1>
                                <p className="text-muted-foreground">Create a new customer account</p>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-foreground uppercase border-b border-border pb-2">Organization Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Account Name *</Label>
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Prestige LLC"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Industry</Label>
                                            <Input
                                                value={formData.industry}
                                                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                                placeholder="Construction"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Email</Label>
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder={email || ''}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Phone</Label>
                                            <Input
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder={phone || ''}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Website</Label>
                                            <Input
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="https://company.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Address</Label>
                                            <Input
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder={address || ''}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-foreground uppercase border-b border-border pb-2">Primary Contact</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">First Name</Label>
                                            <Input
                                                value={formData.primary_contact.first_name}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    primary_contact: { ...formData.primary_contact, first_name: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Last Name</Label>
                                            <Input
                                                value={formData.primary_contact.last_name}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    primary_contact: { ...formData.primary_contact, last_name: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Email</Label>
                                            <Input
                                                type="email"
                                                value={formData.primary_contact.email}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    primary_contact: { ...formData.primary_contact, email: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Title</Label>
                                            <Input
                                                value={formData.primary_contact.title}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    primary_contact: { ...formData.primary_contact, title: e.target.value }
                                                })}
                                                placeholder="CEO, Manager..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <Button variant="outline" onClick={() => router.push('/admin/sales/customers')}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Create Customer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ModuleGuard>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-6xl mx-auto pb-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/sales')} title="Back to Sales">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    {isRetail ? <Users size={24} /> : <Building2 size={24} />}
                                </div>
                                <div>
                                    {isEditing ? (
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="text-xl font-black h-auto py-1"
                                        />
                                    ) : (
                                        <h1 className="text-2xl font-black text-foreground">{customer?.name}</h1>
                                    )}
                                    <p className="text-muted-foreground text-sm">
                                        {isEditing ? (
                                            <Input
                                                value={formData.industry}
                                                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                                className="h-auto py-0 text-sm"
                                                placeholder="Industry"
                                            />
                                        ) : (
                                            customer?.industry || 'No industry'
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button variant="outline" onClick={() => {
                                        setIsEditing(false);
                                        if (customer) {
                                            setFormData({
                                                name: customer.name || '',
                                                industry: customer.industry || '',
                                                website: customer.website || '',
                                                phone: customer.phone || '',
                                                address: (customer as any).address || '',
                                                email: (customer as any).email || '',
                                                primary_contact: (customer as any).primary_contact || {
                                                    first_name: '', last_name: '', email: '', phone: '', title: ''
                                                }
                                            });
                                        }
                                    }}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave}>
                                        <Check className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => router.push('/admin/sales')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to Sales
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button variant="destructive" onClick={handleDelete}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="w-full justify-start border-b bg-transparent h-10 p-0 rounded-none">
                            <TabsTrigger key="overview" value="overview" className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm">Overview</TabsTrigger>
                            <TabsTrigger key="comments" value="comments" className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm">Comments ({comments.length})</TabsTrigger>
                            <TabsTrigger key="transactions" value="transactions" className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm">Transactions</TabsTrigger>
                            <TabsTrigger key="statement" value="statement" className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm">Statement</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6 mt-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-emerald-500/5 border-emerald-500/20">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Revenue</p>
                                        <p className="text-xl font-black text-foreground">{fmt(customerData?.totalRevenue || 0)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-amber-500/5 border-amber-500/20">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] font-bold text-amber-600 uppercase">Pending</p>
                                        <p className="text-xl font-black text-foreground">{fmt(customerData?.pendingAmount || 0)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-blue-500/5 border-blue-500/20">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Total Paid</p>
                                        <p className="text-xl font-black text-foreground">{fmt(customerData?.totalPaid || 0)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] font-bold text-primary uppercase">Balance Due</p>
                                        <p className="text-xl font-black text-foreground">{fmt(customerData?.balance || 0)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {customerData && customerData.monthlyIncome.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold">Income Overview (Last 6 Months)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-40 flex items-end justify-between gap-4 px-4">
                                            {customerData.monthlyIncome.map((item, idx) => {
                                                const maxAmount = Math.max(...customerData.monthlyIncome.map(m => m.amount), 1);
                                                const height = Math.max((item.amount / maxAmount) * 100, 4);
                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                                        <div
                                                            className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                                                            style={{ height: `${height}%`, minHeight: '8px' }}
                                                            title={fmt(item.amount)}
                                                        />
                                                        <span className="text-xs text-muted-foreground">{item.month}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold">Contact Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Email</Label>
                                                    <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Phone</Label>
                                                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Website</Label>
                                                    <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Address</Label>
                                                    <Textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={3} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <DetailItem icon={Mail} label="Email" value={(customer as any)?.email || '—'} />
                                                <DetailItem icon={Phone} label="Phone" value={customer?.phone || '—'} />
                                                <DetailItem icon={Globe} label="Website" value={customer?.website || '—'} />
                                                <DetailItem icon={MapPin} label="Address" value={(customer as any)?.address || '—'} />
                                                <DetailItem icon={Briefcase} label="Industry" value={customer?.industry || '—'} />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold">Primary Contact</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold">First Name</Label>
                                                        <Input
                                                            value={formData.primary_contact.first_name}
                                                            onChange={e => setFormData({
                                                                ...formData,
                                                                primary_contact: { ...formData.primary_contact, first_name: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold">Last Name</Label>
                                                        <Input
                                                            value={formData.primary_contact.last_name}
                                                            onChange={e => setFormData({
                                                                ...formData,
                                                                primary_contact: { ...formData.primary_contact, last_name: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Email</Label>
                                                    <Input
                                                        value={formData.primary_contact.email}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            primary_contact: { ...formData.primary_contact, email: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Title</Label>
                                                    <Input
                                                        value={formData.primary_contact.title}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            primary_contact: { ...formData.primary_contact, title: e.target.value }
                                                        })}
                                                        placeholder="CEO, Manager..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <DetailItem
                                                    icon={User}
                                                    label="Name"
                                                    value={`${(customer as any)?.primary_contact?.first_name || ''} ${(customer as any)?.primary_contact?.last_name || ''}`.trim() || '—'}
                                                />
                                                <DetailItem icon={Mail} label="Email" value={(customer as any)?.primary_contact?.email || '—'} />
                                                <DetailItem icon={Briefcase} label="Title" value={(customer as any)?.primary_contact?.title || '—'} />
                                                <DetailItem icon={Phone} label="Phone" value={(customer as any)?.primary_contact?.phone || '—'} />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="comments" className="space-y-4 mt-6">
                            <Card>
                                <CardContent className="p-4 space-y-4">
                                    <Textarea
                                        placeholder="Add a note or internal comment..."
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        rows={3}
                                    />
                                    <Button onClick={handleAddComment} disabled={!newComment.trim()} className="w-full">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Add Comment
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                {comments.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                                            <p className="text-sm text-muted-foreground">No comments yet</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    comments.map(comment => (
                                        <Card key={comment.id}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.text}</p>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {comment.createdBy} • {new Date(comment.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="transactions" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">Invoices ({customerData?.invoices.length || 0})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(!customerData?.invoices.length) ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No invoices</p>
                                    ) : (
                                        customerData.invoices.map(inv => (
                                            <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                                                        <FileText size={14} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{inv.invoice_number}</p>
                                                        <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold">{fmt(Number(inv.amount))}</p>
                                                    <Badge className={cn("text-xs",
                                                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                    )}>
                                                        {inv.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">Payments ({customerData?.payments.length || 0})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(!customerData?.payments.length) ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No payments</p>
                                    ) : (
                                        customerData.payments.map((pay: any) => (
                                            <div key={pay.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center">
                                                        <CreditCard size={14} className="text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{pay.reference || 'Payment'}</p>
                                                        <p className="text-xs text-muted-foreground">{new Date(pay.date || pay.payment_date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600">-{fmt(Number(pay.amount || pay.total || 0))}</p>
                                                    <p className="text-xs text-muted-foreground">{pay.method || 'Paid'}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">Sales Orders ({customerData?.salesOrders.length || 0})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(!customerData?.salesOrders.length) ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No sales orders</p>
                                    ) : (
                                        customerData.salesOrders.map((so: any) => (
                                            <div key={so.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center">
                                                        <FileText size={14} className="text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{so.number || so.order_number}</p>
                                                        <p className="text-xs text-muted-foreground">{new Date(so.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold">{fmt(Number(so.total || so.amount || 0))}</p>
                                                    <Badge variant="outline" className="text-xs">{so.status || 'Active'}</Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="statement" className="space-y-6 mt-6">
                            <Card className="bg-muted/30">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold">Account Statement</h3>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <Printer className="h-4 w-4 mr-1" />
                                                Print
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <Download className="h-4 w-4 mr-1" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-background rounded-lg">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Total Invoiced</p>
                                            <p className="text-xl font-black">{fmt(customerData?.totalInvoiced || 0)}</p>
                                        </div>
                                        <div className="text-center p-4 bg-background rounded-lg">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Total Paid</p>
                                            <p className="text-xl font-black text-emerald-600">{fmt(customerData?.totalPaid || 0)}</p>
                                        </div>
                                        <div className="text-center p-4 bg-background rounded-lg">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Balance Due</p>
                                            <p className="text-xl font-black text-amber-600">{fmt(customerData?.balance || 0)}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center mt-4">
                                        As of {new Date().toLocaleDateString()}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">Transaction History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="text-left p-3 font-bold">Date</th>
                                                    <th className="text-left p-3 font-bold">Reference</th>
                                                    <th className="text-right p-3 font-bold">Debit</th>
                                                    <th className="text-right p-3 font-bold">Credit</th>
                                                    <th className="text-right p-3 font-bold">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const rows: any[] = [];
                                                    let runningBalance = 0;

                                                    customerData?.invoices.forEach(inv => {
                                                        runningBalance += Number(inv.amount || 0);
                                                        rows.push({
                                                            date: inv.created_at,
                                                            reference: inv.invoice_number,
                                                            type: 'invoice',
                                                            debit: Number(inv.amount || 0),
                                                            credit: 0,
                                                            balance: runningBalance
                                                        });
                                                    });

                                                    customerData?.payments.forEach((pay: any) => {
                                                        runningBalance -= Number(pay.amount || pay.total || 0);
                                                        rows.push({
                                                            date: pay.date || pay.payment_date,
                                                            reference: pay.reference || 'Payment',
                                                            type: 'payment',
                                                            debit: 0,
                                                            credit: Number(pay.amount || pay.total || 0),
                                                            balance: runningBalance
                                                        });
                                                    });

                                                    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                                    if (rows.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                                                    No transactions
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return rows.map((row, idx) => (
                                                        <tr key={idx} className="border-t">
                                                            <td className="p-3">{new Date(row.date).toLocaleDateString()}</td>
                                                            <td className="p-3 font-medium">{row.reference}</td>
                                                            <td className="p-3 text-right">{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                                                            <td className="p-3 text-right text-emerald-600">{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                                                            <td className="p-3 text-right font-bold">{fmt(row.balance)}</td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                <Icon size={14} className="text-muted-foreground" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
        </div>
    );
}
