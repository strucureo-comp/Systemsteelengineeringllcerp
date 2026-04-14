'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Send, Check, X, FileText, Download, Edit, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateSalesInvoicePDF } from '@/lib/pdf-generator';
import { LiveDocumentPreview } from '@/components/shared/layout/live-document-preview';
import { getSalesInvoices, createSalesInvoice, updateSalesInvoice, updateSalesInvoiceStatus, deleteSalesInvoice } from '@/lib/services/business-documents-api';
import { getCustomers } from '@/lib/api';
import {
    SalesDocumentType,
    DocumentStatus,
    isApprovalRequired,
    getApproverRole,
    canApproveDocument,
    getStatusInfo,
} from '@/lib/sales-approval';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface SalesInvoice {
    id: string;
    number: string;
    customerId: string;
    customerName: string;
    date: string;
    dueDate: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes: string;
    status: DocumentStatus;
    createdBy: string;
    createdAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectedReason?: string;
}

export default function SalesInvoicesPage() {
    const { baseCurrency, taxRate, taxName } = useCompanySettings();
    const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<SalesInvoice>>({
        items: [],
        subtotal: 0,
        taxRate: taxRate,
        taxAmount: 0,
        total: 0,
        status: 'draft',
    });
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [invoiceForReject, setInvoiceForReject] = useState<SalesInvoice | null>(null);

    const documentType: SalesDocumentType = 'salesInvoice';
    const approvalRequired = isApprovalRequired('sales', documentType);
    const approverRole = getApproverRole('sales', documentType);
    const [currentUserRole, setCurrentUserRole] = useState<string>('Employee');

    useEffect(() => {
        setCurrentUserRole(typeof window !== 'undefined' ? (localStorage.getItem('user_role') || 'Employee') : 'Employee');
    }, []);
    const canApprove = canApproveDocument('sales', documentType);

    useEffect(() => {
        loadInvoices();
        loadCustomers();
    }, []);

    const loadInvoices = async () => {
        try {
            const data = await getSalesInvoices();
            const list = (Array.isArray(data) ? data : []).map((doc: any) => ({
                ...doc,
                id: String(doc._id || doc.id),
            }));
            setInvoices(list);
        } catch {
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCustomers = async () => {
        try {
            const data = await getCustomers();
            const list = (Array.isArray(data) ? data : []).map((c: any) => ({
                id: String(c._id || c.id),
                name: c.name,
            }));
            setCustomers(list);
        } catch {
            setCustomers([]);
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(i =>
            i.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [invoices, searchQuery]);

    const generateInvoiceNumber = () => {
        const year = new Date().getFullYear();
        const count = invoices.length + 1;
        return `INV-${year}-${count.toString().padStart(4, '0')}`;
    };

    const calculateTotals = (invoice: Partial<SalesInvoice>) => {
        const subtotal = invoice.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
        const taxAmount = subtotal * (invoice.taxRate || 0) / 100;
        const total = subtotal + taxAmount;
        return { subtotal, taxAmount, total };
    };

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            id: Date.now().toString(),
            description: '',
            quantity: 1,
            unitPrice: 0,
            total: 0,
        };
        setEditingInvoice(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem],
        }));
    };

    const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        const updatedItems = editingInvoice.items?.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                updated.total = updated.quantity * updated.unitPrice;
                return updated;
            }
            return item;
        });
        setEditingInvoice(prev => ({
            ...prev,
            items: updatedItems,
            ...calculateTotals({ ...prev, items: updatedItems }),
        }));
    };

    const handleRemoveItem = (id: string) => {
        const updatedItems = editingInvoice.items?.filter(item => item.id !== id);
        setEditingInvoice(prev => ({
            ...prev,
            items: updatedItems,
            ...calculateTotals({ ...prev, items: updatedItems }),
        }));
    };

    const handleSave = async () => {
        if (!editingInvoice.customerName) {
            toast.error('Please select a customer');
            return;
        }
        if (!editingInvoice.items?.length) {
            toast.error('Please add at least one item');
            return;
        }

        const payload = {
            number: editingInvoice.number || generateInvoiceNumber(),
            customerId: editingInvoice.customerId || '',
            customerName: editingInvoice.customerName || '',
            date: editingInvoice.date || new Date().toISOString().split('T')[0],
            dueDate: editingInvoice.dueDate || '',
            items: editingInvoice.items || [],
            taxRate: editingInvoice.taxRate || taxRate,
            notes: editingInvoice.notes || '',
            status: editingInvoice.status || 'draft',
            createdBy: editingInvoice.createdBy || 'Current User',
        };

        try {
            if (editingInvoice.id) {
                await updateSalesInvoice(editingInvoice.id, payload);
            } else {
                await createSalesInvoice(payload);
            }
            await loadInvoices();
            toast.success('Invoice saved');
            setDialogOpen(false);
            setEditingInvoice({
                items: [],
                subtotal: 0,
                taxRate: taxRate,
                taxAmount: 0,
                total: 0,
                status: 'draft',
            });
        } catch {
            toast.error('Failed to save invoice');
        }
    };

    const handleSubmitForApproval = async (invoice: SalesInvoice) => {
        try {
            await updateSalesInvoiceStatus(invoice.id, 'pending_approval');
            await loadInvoices();
            toast.success('Invoice submitted for approval');
        } catch {
            toast.error('Failed to submit invoice');
        }
    };

    const handleApprove = async (invoice: SalesInvoice) => {
        try {
            await updateSalesInvoiceStatus(invoice.id, 'approved', { updatedBy: currentUserRole });
            await loadInvoices();
            toast.success('Invoice approved');
        } catch {
            toast.error('Failed to approve invoice');
        }
    };

    const handleReject = async () => {
        if (!invoiceForReject) return;
        try {
            await updateSalesInvoiceStatus(invoiceForReject.id, 'rejected', { updatedBy: currentUserRole, reason: rejectReason });
            await loadInvoices();
            toast.success('Invoice rejected');
            setRejectDialogOpen(false);
            setRejectReason('');
            setInvoiceForReject(null);
        } catch {
            toast.error('Failed to reject invoice');
        }
    };

    const handleResubmit = async (invoice: SalesInvoice) => {
        try {
            await updateSalesInvoiceStatus(invoice.id, 'pending_approval');
            await loadInvoices();
            toast.success('Invoice resubmitted for approval');
        } catch {
            toast.error('Failed to resubmit invoice');
        }
    };

    const handleComplete = async (invoice: SalesInvoice) => {
        try {
            await updateSalesInvoiceStatus(invoice.id, 'completed');
            await loadInvoices();
            toast.success('Invoice marked as completed');
        } catch {
            toast.error('Failed to complete invoice');
        }
    };

    const handleDelete = async (invoice: SalesInvoice) => {
        try {
            await deleteSalesInvoice(invoice.id);
            await loadInvoices();
            toast.success('Invoice deleted');
        } catch {
            toast.error('Failed to delete invoice');
        }
    };

    const openEditDialog = (invoice?: SalesInvoice) => {
        if (invoice) {
            setEditingInvoice(invoice);
        } else {
            setEditingInvoice({
                items: [],
                subtotal: 0,
                taxRate: taxRate,
                taxAmount: 0,
                total: 0,
                status: 'draft',
                number: generateInvoiceNumber(),
                date: new Date().toISOString().split('T')[0]
            });
        }
        setDialogOpen(true);
    };

    const getStatusBadge = (status: DocumentStatus) => {
        const info = getStatusInfo(status);
        return (
            <Badge variant="outline" className={cn(
                "text-[10px]",
                status === 'draft' ? "bg-gray-50 text-gray-600 border-none" :
                status === 'pending_approval' ? "bg-blue-50 text-blue-600 border-none" :
                status === 'approved' ? "bg-emerald-50 text-emerald-600 border-none" :
                status === 'rejected' ? "bg-rose-50 text-rose-600 border-none" :
                    "bg-amber-50 text-amber-600 border-none"
            )}>
                {info.label}
            </Badge>
        );
    };

    const canEdit = (invoice: SalesInvoice) => invoice.status === 'draft' || invoice.status === 'rejected';
    const canSubmit = (invoice: SalesInvoice) => invoice.status === 'draft';
    const canApproveAction = (invoice: SalesInvoice) => approvalRequired && invoice.status === 'pending_approval' && canApprove;
    const canResubmit = (invoice: SalesInvoice) => invoice.status === 'rejected';
    const canComplete = (invoice: SalesInvoice) => invoice.status === 'approved';

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Sales Invoices</h1>
                    <p className="text-muted-foreground mt-1">Manage sales invoices with approval workflow</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search invoices..."
                            className="pl-9 h-10 w-64 border-border bg-background"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Button onClick={() => openEditDialog()} size="sm" className="h-10 gap-2 font-bold shadow-sm">
                        <Plus className="h-4 w-4" />
                        New Invoice
                    </Button>
                </div>
            </div>

            {approvalRequired && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Approval Required:</strong> Approver Role = {approverRole || 'Not configured'}
                            {canApprove && <Badge className="ml-2 bg-blue-600">You can approve</Badge>}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Invoice List */}
            <div className="bg-card border border-border rounded-lg shadow-sm divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-bold text-foreground">No invoices found</p>
                        <p className="text-xs text-muted-foreground mt-1">Create a new invoice to get started.</p>
                    </div>
                ) : (
                    filteredInvoices.map(invoice => (
                        <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-bold text-foreground">{invoice.number}</h3>
                                        {getStatusBadge(invoice.status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {invoice.customerName || 'Customer'} • Due {invoice.dueDate || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">{formatCurrency(invoice.total, baseCurrency)}</p>
                                    <p className="text-[10px] text-muted-foreground">Total</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateSalesInvoicePDF(invoice)} title="Download PDF">
                                        <Download size={16} />
                                    </Button>
                                    {canEdit(invoice) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(invoice)}>
                                            <Edit size={16} />
                                        </Button>
                                    )}
                                    {canSubmit(invoice) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => handleSubmitForApproval(invoice)} title="Submit for approval">
                                            <Send size={16} />
                                        </Button>
                                    )}
                                    {canApproveAction(invoice) && (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600" onClick={() => handleApprove(invoice)} title="Approve">
                                                <Check size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => { setInvoiceForReject(invoice); setRejectDialogOpen(true); }} title="Reject">
                                                <X size={16} />
                                            </Button>
                                        </>
                                    )}
                                    {canResubmit(invoice) && (
                                        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleResubmit(invoice)}>Resubmit</Button>
                                    )}
                                    {canComplete(invoice) && (
                                        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleComplete(invoice)}>Complete</Button>
                                    )}
                                    {canEdit(invoice) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(invoice)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Dialog with Live Preview */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingInvoice.id ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Form */}
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Invoice Number</Label>
                                    <Input value={editingInvoice.number || ''} onChange={e => setEditingInvoice({ ...editingInvoice, number: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Customer</Label>
                                    <Select value={editingInvoice.customerId} onValueChange={v => { const c = customers.find(c => c.id === v); setEditingInvoice({ ...editingInvoice, customerId: v, customerName: c?.name || '' }); }}>
                                        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                        <SelectContent>
                                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" value={editingInvoice.date || ''} onChange={e => setEditingInvoice({ ...editingInvoice, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input type="date" value={editingInvoice.dueDate || ''} onChange={e => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Items</Label>
                                {editingInvoice.items?.map(item => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <Input className="flex-1" placeholder="Description" value={item.description} onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} />
                                        <Input className="w-20" type="number" placeholder="Qty" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                                        <Input className="w-24" type="number" placeholder="Price" value={item.unitPrice} onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                        <Input className="w-24" value={formatCurrency(item.total, baseCurrency)} disabled />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{taxName} Rate (%)</Label>
                                    <Input type="number" value={editingInvoice.taxRate || taxRate} onChange={e => { const rate = parseFloat(e.target.value) || 0; setEditingInvoice(prev => ({ ...prev, taxRate: rate, ...calculateTotals({ ...prev, taxRate: rate }) })); }} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Input value={editingInvoice.notes || ''} onChange={e => setEditingInvoice({ ...editingInvoice, notes: e.target.value })} />
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(editingInvoice.subtotal || 0, baseCurrency)}</span></div>
                                <div className="flex justify-between"><span>{taxName}:</span><span>{formatCurrency(editingInvoice.taxAmount || 0, baseCurrency)}</span></div>
                                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{formatCurrency(editingInvoice.total || 0, baseCurrency)}</span></div>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="border rounded-lg overflow-hidden">
                            <LiveDocumentPreview data={editingInvoice as any} type="invoice" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject Invoice</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Reason for rejection</Label>
                        <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setInvoiceForReject(null); }}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject}>Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}
