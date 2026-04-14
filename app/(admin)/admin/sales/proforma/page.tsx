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
import { generateProformaInvoicePDF } from '@/lib/pdf-generator';
import { LiveDocumentPreview } from '@/components/shared/layout/live-document-preview';
import { SalesDocumentType, DocumentStatus, isApprovalRequired, getApproverRole, canApproveDocument, getStatusInfo } from '@/lib/sales-approval';
import {
    getProformaInvoices,
    createProformaInvoice,
    updateProformaInvoice,
    deleteProformaInvoice,
} from '@/lib/services/business-documents-api';
import { getCustomers } from '@/lib/api';
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

interface ProformaInvoice {
    id: string;
    number: string;
    customerId: string;
    customerName: string;
    date: string;
    validUntil: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes: string;
    status: DocumentStatus;
    createdBy: string;
    createdAt: string;
}

export default function ProformaInvoicesPage() {
    const { baseCurrency, taxRate, taxName } = useCompanySettings();
    const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<ProformaInvoice>>({
        items: [],
        subtotal: 0,
        taxRate: taxRate,
        taxAmount: 0,
        total: 0,
        status: 'draft',
    });
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const documentType: SalesDocumentType = 'proformaInvoice';
    const approvalRequired = isApprovalRequired('sales', documentType);

    const normalizeInvoice = (doc: any): ProformaInvoice => ({
        ...doc,
        id: doc.id || doc._id,
    });

    useEffect(() => {
        void loadInvoices();
        loadCustomers();
    }, []);

    const loadInvoices = async () => {
        try {
            const data = await getProformaInvoices();
            setInvoices(Array.isArray(data) ? data.map(normalizeInvoice) : []);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load proforma invoices');
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
        return `PI-${year}-${count.toString().padStart(4, '0')}`;
    };

    const calculateTotals = (invoice: Partial<ProformaInvoice>) => {
        const subtotal = invoice.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
        const taxAmount = subtotal * (invoice.taxRate || 0) / 100;
        const total = subtotal + taxAmount;
        return { subtotal, taxAmount, total };
    };

    const handleAddItem = () => {
        const newItem: InvoiceItem = { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 };
        setEditingInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
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
        if (!editingInvoice.customerName) { toast.error('Please select a customer'); return; }
        if (!editingInvoice.items?.length) { toast.error('Please add at least one item'); return; }

        const totals = calculateTotals(editingInvoice);
        const invoice: ProformaInvoice = {
            id: editingInvoice.id || Date.now().toString(),
            number: editingInvoice.number || generateInvoiceNumber(),
            customerId: editingInvoice.customerId || '',
            customerName: editingInvoice.customerName || '',
            date: editingInvoice.date || new Date().toISOString().split('T')[0],
            validUntil: editingInvoice.validUntil || '',
            items: editingInvoice.items || [],
            subtotal: totals.subtotal,
            taxRate: editingInvoice.taxRate || taxRate,
            taxAmount: totals.taxAmount,
            total: totals.total,
            notes: editingInvoice.notes || '',
            status: (editingInvoice.status as DocumentStatus) || 'draft',
            createdBy: editingInvoice.createdBy || 'Current User',
            createdAt: editingInvoice.createdAt || new Date().toISOString(),
        };

        try {
            if (editingInvoice.id) {
                const updated = normalizeInvoice(await updateProformaInvoice(editingInvoice.id, invoice));
                setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? updated : i));
            } else {
                const created = normalizeInvoice(await createProformaInvoice(invoice));
                setInvoices(prev => [created, ...prev]);
            }
            toast.success('Proforma Invoice saved');
            setDialogOpen(false);
            setEditingInvoice({
                items: [],
                subtotal: 0,
                taxRate: taxRate,
                taxAmount: 0,
                total: 0,
                status: 'draft',
            });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save proforma invoice');
        }
    };

    const handleDelete = async (invoice: ProformaInvoice) => {
        try {
            await deleteProformaInvoice(invoice.id);
            setInvoices(prev => prev.filter(i => i.id !== invoice.id));
            toast.success('Deleted');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete proforma invoice');
        }
    };

    const openEditDialog = (invoice?: ProformaInvoice) => {
        setEditingInvoice(invoice ? invoice : {
            items: [],
            subtotal: 0,
            taxRate: taxRate,
            taxAmount: 0,
            total: 0,
            status: 'draft',
            number: generateInvoiceNumber(),
            date: new Date().toISOString().split('T')[0]
        });
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
                "bg-amber-50 text-amber-600 border-none"
            )}>
                {info.label}
            </Badge>
        );
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Proforma Invoices</h1>
                    <p className="text-muted-foreground mt-1">Manage proforma invoices</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9 h-10 w-64" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Button onClick={() => openEditDialog()} size="sm" className="h-10 gap-2 font-bold">
                        <Plus className="h-4 w-4" /> New Proforma
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-bold">No proforma invoices found</p>
                    </div>
                ) : (
                    filteredInvoices.map(invoice => (
                        <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                            <div className="flex items-center gap-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-bold">{invoice.number}</h3>
                                        {getStatusBadge(invoice.status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{invoice.customerName} • {invoice.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold">{formatCurrency(invoice.total, baseCurrency)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateProformaInvoicePDF(invoice)}>
                                        <Download size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(invoice)}>
                                        <Edit size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => handleDelete(invoice)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>{editingInvoice.id ? 'Edit' : 'Create'} Proforma Invoice</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>PI Number</Label><Input value={editingInvoice.number || ''} onChange={e => setEditingInvoice({ ...editingInvoice, number: e.target.value })} /></div>
                                <div className="space-y-2">
                                    <Label>Customer</Label>
                                    <Select value={editingInvoice.customerId} onValueChange={v => { const c = customers.find(c => c.id === v); setEditingInvoice({ ...editingInvoice, customerId: v, customerName: c?.name || '' }); }}>
                                        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Date</Label><Input type="date" value={editingInvoice.date || ''} onChange={e => setEditingInvoice({ ...editingInvoice, date: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={editingInvoice.validUntil || ''} onChange={e => setEditingInvoice({ ...editingInvoice, validUntil: e.target.value })} /></div>
                            </div>
                            <div className="space-y-2">
                                <Label>Items</Label>
                                {editingInvoice.items?.map(item => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <Input className="flex-1" placeholder="Description" value={item.description} onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} />
                                        <Input className="w-16" type="number" placeholder="Qty" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                                        <Input className="w-20" type="number" placeholder="Price" value={item.unitPrice} onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                        <Input className="w-20" value={formatCurrency(item.total, baseCurrency)} disabled />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>{taxName} Rate (%)</Label><Input type="number" value={editingInvoice.taxRate || taxRate} onChange={e => { const rate = parseFloat(e.target.value) || 0; setEditingInvoice(prev => ({ ...prev, taxRate: rate, ...calculateTotals({ ...prev, taxRate: rate }) })); }} /></div>
                                <div className="space-y-2"><Label>Notes</Label><Input value={editingInvoice.notes || ''} onChange={e => setEditingInvoice({ ...editingInvoice, notes: e.target.value })} /></div>
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(editingInvoice.subtotal || 0, baseCurrency)}</span></div>
                                <div className="flex justify-between"><span>{taxName}:</span><span>{formatCurrency(editingInvoice.taxAmount || 0, baseCurrency)}</span></div>
                                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{formatCurrency(editingInvoice.total || 0, baseCurrency)}</span></div>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                            <LiveDocumentPreview data={editingInvoice as any} type="proforma" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}
