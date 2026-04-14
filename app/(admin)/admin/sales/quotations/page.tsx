'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Send, Check, X, FileText, Download, Eye, Edit, Loader2, Search, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateQuotationPDF } from '@/lib/pdf-generator';
import { LiveDocumentPreview } from '@/components/shared/layout/live-document-preview';
import { getSalesQuotations, createSalesQuotation, updateSalesQuotation, updateSalesQuotationStatus, deleteSalesQuotation } from '@/lib/services/business-documents-api';
import { getCustomers } from '@/lib/api';
import { SalesDocumentType, DocumentStatus, isApprovalRequired, getApproverRole, canApproveDocument, getStatusInfo } from '@/lib/sales-approval';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

interface QuotationItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface SalesQuotation {
    id: string;
    number: string;
    customerId: string;
    customerName: string;
    date: string;
    validUntil: string;
    items: QuotationItem[];
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

export default function QuotationsPage() {
    const { baseCurrency, taxRate, taxName } = useCompanySettings();
    const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Partial<SalesQuotation>>({
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
    const [quotationForReject, setQuotationForReject] = useState<SalesQuotation | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState('Employee');

    const documentType: SalesDocumentType = 'quotation';
    const approvalRequired = isApprovalRequired('sales', documentType);
    const approverRole = getApproverRole('sales', documentType);
    const canApprove = canApproveDocument('sales', documentType);

    const formatCurrencyValue = (amount: number) => {
        return formatCurrency(amount, baseCurrency);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUserRole(localStorage.getItem('user_role') || 'Employee');
        }
        loadQuotations();
        loadCustomers();
    }, []);

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q =>
            q.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [quotations, searchQuery]);

    const loadQuotations = async () => {
        try {
            const data = await getSalesQuotations();
            const list = (Array.isArray(data) ? data : []).map((doc: any) => ({
                ...doc,
                id: String(doc._id || doc.id),
            }));
            setQuotations(list);
        } catch {
            setQuotations([]);
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

    const generateQuotationNumber = () => {
        const year = new Date().getFullYear();
        const count = quotations.length + 1;
        return `QT-${year}-${count.toString().padStart(4, '0')}`;
    };

    const calculateTotals = (quotation: Partial<SalesQuotation>) => {
        const subtotal = quotation.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
        const taxAmount = subtotal * (quotation.taxRate || 0) / 100;
        const total = subtotal + taxAmount;
        return { subtotal, taxAmount, total };
    };

    const handleAddItem = () => {
        const newItem: QuotationItem = { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 };
        setEditingQuotation(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleUpdateItem = (id: string, field: keyof QuotationItem, value: any) => {
        const updatedItems = editingQuotation.items?.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                updated.total = updated.quantity * updated.unitPrice;
                return updated;
            }
            return item;
        });
        setEditingQuotation(prev => ({
            ...prev,
            items: updatedItems,
            ...calculateTotals({ ...prev, items: updatedItems }),
        }));
    };

    const handleRemoveItem = (id: string) => {
        const updatedItems = editingQuotation.items?.filter(item => item.id !== id);
        setEditingQuotation(prev => ({
            ...prev,
            items: updatedItems,
            ...calculateTotals({ ...prev, items: updatedItems }),
        }));
    };

    const handleSave = async () => {
        if (!editingQuotation.customerName) { toast.error('Please select a customer'); return; }
        if (!editingQuotation.items?.length) { toast.error('Please add at least one item'); return; }

        const payload = {
            number: editingQuotation.number || generateQuotationNumber(),
            customerId: editingQuotation.customerId || '',
            customerName: editingQuotation.customerName || '',
            date: editingQuotation.date || new Date().toISOString().split('T')[0],
            validUntil: editingQuotation.validUntil || '',
            items: editingQuotation.items || [],
            taxRate: editingQuotation.taxRate || taxRate,
            notes: editingQuotation.notes || '',
            status: editingQuotation.status || 'draft',
            createdBy: editingQuotation.createdBy || 'Current User',
        };

        try {
            if (editingQuotation.id) {
                await updateSalesQuotation(editingQuotation.id, payload);
            } else {
                await createSalesQuotation(payload);
            }
            await loadQuotations();
            toast.success('Quotation saved');
            setDialogOpen(false);
            setEditingQuotation({
                items: [],
                subtotal: 0,
                taxRate: taxRate,
                taxAmount: 0,
                total: 0,
                status: 'draft',
            });
        } catch {
            toast.error('Failed to save quotation');
        }
    };

    const handleSubmitForApproval = async (quotation: SalesQuotation) => {
        try {
            await updateSalesQuotationStatus(quotation.id, 'pending_approval');
            await loadQuotations();
            toast.success('Submitted for approval');
        } catch {
            toast.error('Failed to submit quotation');
        }
    };

    const handleApprove = async (quotation: SalesQuotation) => {
        try {
            await updateSalesQuotationStatus(quotation.id, 'approved', { updatedBy: currentUserRole });
            await loadQuotations();
            toast.success('Approved');
        } catch {
            toast.error('Failed to approve quotation');
        }
    };

    const handleReject = async () => {
        if (!quotationForReject) return;
        try {
            await updateSalesQuotationStatus(quotationForReject.id, 'rejected', { updatedBy: currentUserRole, reason: rejectReason });
            await loadQuotations();
            toast.success('Rejected');
            setRejectDialogOpen(false);
            setRejectReason('');
            setQuotationForReject(null);
        } catch {
            toast.error('Failed to reject quotation');
        }
    };

    const handleResubmit = async (quotation: SalesQuotation) => {
        try {
            await updateSalesQuotationStatus(quotation.id, 'pending_approval');
            await loadQuotations();
            toast.success('Resubmitted for approval');
        } catch {
            toast.error('Failed to resubmit quotation');
        }
    };

    const handleComplete = async (quotation: SalesQuotation) => {
        try {
            await updateSalesQuotationStatus(quotation.id, 'completed');
            await loadQuotations();
            toast.success('Marked as completed');
        } catch {
            toast.error('Failed to complete quotation');
        }
    };

    const handleDelete = async (quotation: SalesQuotation) => {
        try {
            await deleteSalesQuotation(quotation.id);
            await loadQuotations();
            toast.success('Deleted');
        } catch {
            toast.error('Failed to delete quotation');
        }
    };

    const openEditDialog = (quotation?: SalesQuotation) => {
        setEditingQuotation(quotation ? quotation : {
            items: [],
            subtotal: 0,
            taxRate: taxRate,
            taxAmount: 0,
            total: 0,
            status: 'draft',
            number: generateQuotationNumber(),
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
                status === 'rejected' ? "bg-rose-50 text-rose-600 border-none" :
                    "bg-amber-50 text-amber-600 border-none"
            )}>
                {info.label}
            </Badge>
        );
    };

    const canEdit = (quotation: SalesQuotation) => quotation.status === 'draft' || quotation.status === 'rejected';
    const canSubmit = (quotation: SalesQuotation) => quotation.status === 'draft';
    const canApproveAction = (quotation: SalesQuotation) => approvalRequired && quotation.status === 'pending_approval' && canApprove;
    const canResubmit = (quotation: SalesQuotation) => quotation.status === 'rejected';
    const canComplete = (quotation: SalesQuotation) => quotation.status === 'approved';

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Quotations</h1>
                    <p className="text-muted-foreground mt-1">Sales quotations with approval workflow</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search quotations..."
                            className="pl-9 h-10 w-64 border-border bg-background"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Button onClick={() => openEditDialog()} size="sm" className="h-10 gap-2 font-bold shadow-sm">
                        <Plus className="h-4 w-4" />
                        New Quotation
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

            {/* Quotations List */}
            <div className="bg-card border border-border rounded-lg shadow-sm divide-y divide-border">
                {filteredQuotations.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-bold text-foreground">No quotations found</p>
                        <p className="text-xs text-muted-foreground mt-1">Create a new quotation to get started.</p>
                    </div>
                ) : (
                    filteredQuotations.map(quotation => (
                        <div key={quotation.id} className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-bold text-foreground">{quotation.number}</h3>
                                        {getStatusBadge(quotation.status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {quotation.customerName || 'Customer'} • Valid until {quotation.validUntil || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">{formatCurrencyValue(quotation.total)}</p>
                                    <p className="text-[10px] text-muted-foreground">Total</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateQuotationPDF(quotation)} title="Download PDF">
                                        <Download size={16} />
                                    </Button>
                                    {canEdit(quotation) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(quotation)}>
                                            <Edit size={16} />
                                        </Button>
                                    )}
                                    {canSubmit(quotation) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => handleSubmitForApproval(quotation)}>
                                            <Send size={16} />
                                        </Button>
                                    )}
                                    {canApproveAction(quotation) && (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600" onClick={() => handleApprove(quotation)}>
                                                <Check size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => { setQuotationForReject(quotation); setRejectDialogOpen(true); }}>
                                                <X size={16} />
                                            </Button>
                                        </>
                                    )}
                                    {canResubmit(quotation) && (
                                        <Button variant="ghost" size="sm" onClick={() => handleResubmit(quotation)}>Resubmit</Button>
                                    )}
                                    {canComplete(quotation) && (
                                        <Button variant="ghost" size="sm" onClick={() => handleComplete(quotation)}>Complete</Button>
                                    )}
                                    {canEdit(quotation) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(quotation)}>
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
                        <DialogTitle>{editingQuotation.id ? 'Edit' : 'Create'} Quotation</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Form */}
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Quotation Number</Label><Input value={editingQuotation.number || ''} onChange={e => setEditingQuotation({ ...editingQuotation, number: e.target.value })} /></div>
                                <div className="space-y-2">
                                    <Label>Customer</Label>
                                    <Select value={editingQuotation.customerId} onValueChange={v => { const c = customers.find(c => c.id === v); setEditingQuotation({ ...editingQuotation, customerId: v, customerName: c?.name || '' }); }}>
                                        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Date</Label><Input type="date" value={editingQuotation.date || ''} onChange={e => setEditingQuotation({ ...editingQuotation, date: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={editingQuotation.validUntil || ''} onChange={e => setEditingQuotation({ ...editingQuotation, validUntil: e.target.value })} /></div>
                            </div>
                            <div className="space-y-2">
                                <Label>Items</Label>
                                {editingQuotation.items?.map(item => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <Input className="flex-1" placeholder="Description" value={item.description} onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} />
                                        <Input className="w-16" type="number" placeholder="Qty" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                                        <Input className="w-24" type="number" placeholder="Price" value={item.unitPrice} onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                        <div className="w-32">
                                            <Input className="w-full" type="number" value={item.total || 0} disabled />
                                            <p className="mt-1 text-[10px] font-semibold text-right text-muted-foreground">
                                                {formatCurrencyValue(item.total || 0)}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>{taxName} Rate (%)</Label><Input type="number" value={editingQuotation.taxRate || taxRate} onChange={e => { const rate = parseFloat(e.target.value) || 0; setEditingQuotation(prev => ({ ...prev, taxRate: rate, ...calculateTotals({ ...prev, taxRate: rate }) })); }} /></div>
                                <div className="space-y-2"><Label>Notes</Label><Input value={editingQuotation.notes || ''} onChange={e => setEditingQuotation({ ...editingQuotation, notes: e.target.value })} /></div>
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrencyValue(editingQuotation.subtotal || 0)}</span></div>
                                <div className="flex justify-between"><span>Tax:</span><span>{formatCurrencyValue(editingQuotation.taxAmount || 0)}</span></div>
                                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{formatCurrencyValue(editingQuotation.total || 0)}</span></div>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="border rounded-lg overflow-hidden">
                            <LiveDocumentPreview data={editingQuotation as any} type="quotation" />
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
                    <DialogHeader><DialogTitle>Reject Quotation</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Reason for rejection</Label>
                        <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setQuotationForReject(null); }}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject}>Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}
