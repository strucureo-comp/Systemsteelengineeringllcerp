'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Send, Check, X, FileText, Download, Eye, Edit, Loader2, Search, Truck, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/lib/tenant-context';
import { cn } from '@/lib/utils';
import { generateDeliveryNotePDF } from '@/lib/pdf-generator';
import { LiveDocumentPreview } from '@/components/shared/layout/live-document-preview';
import { SalesDocumentType, DocumentStatus, isApprovalRequired, getApproverRole, canApproveDocument, getStatusInfo } from '@/lib/sales-approval';
import {
    getDeliveryNotes,
    createDeliveryNote,
    updateDeliveryNote,
    deleteDeliveryNote,
} from '@/lib/services/business-documents-api';
import { getCustomers } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

interface DeliveryItem {
    id: string;
    sku: string;
    description: string;
    quantity: number;
    unit: string;
    weight?: string;
    size?: string;
}

interface DeliveryNote {
    id: string;
    number: string;
    date: string;
    
    // Seller 
    sellerName: string;
    sellerAddress: string;
    sellerTaxId: string;
    sellerContact: string;

    // Buyer
    customerId: string;
    customerName: string;
    customerAddress: string;
    customerContact: string;
    
    // Document info
    invoiceRef: string;
    orderRef: string;
    
    // Delivery info
    shipmentDate: string;
    deliveryDate: string;
    deliveryMethod: string;
    courierName: string;
    vehicleDetails: string;
    warehouseOrigin: string;
    
    // Package info
    parcelCount: number;
    totalWeight: string;
    dimensions: string;
    
    items: DeliveryItem[];
    specialInstructions: string;
    notes: string;
    
    // Acknowledgement
    receiverName: string;
    receivedAt?: string;

    status: DocumentStatus;
    createdBy: string;
    createdAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectedReason?: string;
}

const DEFAULT_NOTE: Partial<DeliveryNote> = {
    items: [],
    status: 'draft',
};

export default function DeliveryNotesPage() {
    const [notes, setNotes] = useState<DeliveryNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Partial<DeliveryNote>>(DEFAULT_NOTE);
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingNote, setViewingNote] = useState<DeliveryNote | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const { companyProfile } = useTenant();

    const documentType: SalesDocumentType = 'deliveryNote';
    const approvalRequired = isApprovalRequired('sales', documentType);
    const approverRole = getApproverRole('sales', documentType);
    const [currentUserRole, setCurrentUserRole] = useState<string>('Employee');

    useEffect(() => {
        setCurrentUserRole(typeof window !== 'undefined' ? (localStorage.getItem('user_role') || 'Employee') : 'Employee');
    }, []);

    const canApprove = canApproveDocument('sales', documentType);

    const normalizeNote = (doc: any): DeliveryNote => ({
        ...doc,
        id: doc.id || doc._id,
    });

    useEffect(() => {
        void loadNotes();
        loadCustomers();
    }, []);

    const filteredNotes = useMemo(() => {
        return notes.filter(n =>
            n.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [notes, searchQuery]);

    const loadNotes = async () => {
        try {
            const data = await getDeliveryNotes();
            setNotes(Array.isArray(data) ? data.map(normalizeNote) : []);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load delivery notes');
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

    const generateNoteNumber = () => {
        return generateRef('DN');
    };

    const handleAddItem = () => {
        const newItem: DeliveryItem = { 
            id: Date.now().toString(), 
            sku: '',
            description: '', 
            quantity: 1, 
            unit: 'pcs',
            weight: '',
            size: ''
        };
        setEditingNote(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleUpdateItem = (id: string, field: keyof DeliveryItem, value: any) => {
        const updatedItems = editingNote.items?.map(item => item.id === id ? { ...item, [field]: value } : item);
        setEditingNote(prev => ({ ...prev, items: updatedItems }));
    };

    const handleRemoveItem = (id: string) => {
        const updatedItems = editingNote.items?.filter(item => item.id !== id);
        setEditingNote(prev => ({ ...prev, items: updatedItems }));
    };

    const handleSave = async () => {
        if (!editingNote.customerName) { toast.error('Please select a customer'); return; }
        if (!editingNote.items?.length) { toast.error('Please add at least one item'); return; }

        const note: DeliveryNote = {
            id: editingNote.id || Date.now().toString(),
            number: editingNote.number || generateNoteNumber(),
            date: editingNote.date || new Date().toISOString().split('T')[0],
            
            sellerName: editingNote.sellerName || companyProfile?.companyName || '',
            sellerAddress: editingNote.sellerAddress || companyProfile?.address || '',
            sellerTaxId: editingNote.sellerTaxId || companyProfile?.taxId || '',
            sellerContact: editingNote.sellerContact || '',

            customerId: editingNote.customerId || '',
            customerName: editingNote.customerName || '',
            customerAddress: editingNote.customerAddress || '',
            customerContact: editingNote.customerContact || '',
            
            invoiceRef: editingNote.invoiceRef || '',
            orderRef: editingNote.orderRef || '',
            
            shipmentDate: editingNote.shipmentDate || '',
            deliveryDate: editingNote.deliveryDate || '',
            deliveryMethod: editingNote.deliveryMethod || 'vehicle',
            courierName: editingNote.courierName || '',
            vehicleDetails: editingNote.vehicleDetails || '',
            warehouseOrigin: editingNote.warehouseOrigin || '',
            
            parcelCount: editingNote.parcelCount || 1,
            totalWeight: editingNote.totalWeight || '',
            dimensions: editingNote.dimensions || '',
            
            items: editingNote.items || [],
            specialInstructions: editingNote.specialInstructions || '',
            notes: editingNote.notes || '',
            
            receiverName: editingNote.receiverName || '',
            receivedAt: editingNote.receivedAt || new Date().toISOString(),
            
            status: (editingNote.status as DocumentStatus) || 'draft',
            createdBy: editingNote.createdBy || 'Current User',
            createdAt: editingNote.createdAt || new Date().toISOString(),
        };

        try {
            if (editingNote.id) {
                const updated = normalizeNote(await updateDeliveryNote(editingNote.id, note));
                setNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n));
            } else {
                const created = normalizeNote(await createDeliveryNote(note));
                setNotes(prev => [created, ...prev]);
            }
            toast.success('Delivery Note saved');
            setDialogOpen(false);
            setEditingNote(DEFAULT_NOTE);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save delivery note');
        }
    };

    const handleSubmitForApproval = async (note: DeliveryNote) => {
        try {
            const updated = normalizeNote(await updateDeliveryNote(note.id, { ...note, status: 'pending_approval' as DocumentStatus }));
            setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
            toast.success('Submitted for approval');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to submit for approval');
        }
    };

    const handleApprove = async (note: DeliveryNote) => {
        try {
            const updated = normalizeNote(await updateDeliveryNote(note.id, {
                ...note,
                status: 'approved' as DocumentStatus,
                approvedBy: currentUserRole,
                approvedAt: new Date().toISOString(),
            }));
            setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
            toast.success('Approved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to approve delivery note');
        }
    };

    const handleReject = async (note: DeliveryNote) => {
        try {
            const updated = normalizeNote(await updateDeliveryNote(note.id, {
                ...note,
                status: 'rejected' as DocumentStatus,
                rejectedBy: currentUserRole,
                rejectedAt: new Date().toISOString(),
                rejectedReason: rejectReason,
            }));
            setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
            toast.success('Rejected');
            setRejectDialogOpen(false);
            setRejectReason('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to reject delivery note');
        }
    };

    const handleResubmit = async (note: DeliveryNote) => {
        try {
            const updated = normalizeNote(await updateDeliveryNote(note.id, { ...note, status: 'pending_approval' as DocumentStatus }));
            setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
            toast.success('Resubmitted for approval');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to resubmit delivery note');
        }
    };

    const handleComplete = async (note: DeliveryNote) => {
        try {
            const updated = normalizeNote(await updateDeliveryNote(note.id, { ...note, status: 'completed' as DocumentStatus }));
            setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
            toast.success('Marked as completed');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to complete delivery note');
        }
    };

    const handleDelete = async (note: DeliveryNote) => {
        try {
            await deleteDeliveryNote(note.id);
            setNotes(prev => prev.filter(n => n.id !== note.id));
            toast.success('Deleted');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete delivery note');
        }
    };

    const openEditDialog = (note?: DeliveryNote) => {
        setEditingNote(note ? note : { 
            ...DEFAULT_NOTE, 
            number: generateNoteNumber(), 
            date: new Date().toISOString().split('T')[0],
            sellerName: companyProfile?.companyName || '',
            sellerAddress: companyProfile?.address || '',
            sellerTaxId: companyProfile?.taxId || '',
            receivedAt: new Date().toISOString().slice(0, 16), // datetime-local format
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

    const canEdit = (note: DeliveryNote) => note.status === 'draft' || note.status === 'rejected';
    const canSubmit = (note: DeliveryNote) => note.status === 'draft';
    const canApproveAction = (note: DeliveryNote) => approvalRequired && note.status === 'pending_approval' && canApprove;
    const canResubmit = (note: DeliveryNote) => note.status === 'rejected';
    const canComplete = (note: DeliveryNote) => note.status === 'approved';

    if (loading) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
                <div className="flex justify-between items-center border-b pb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48 bg-muted" />
                        <Skeleton className="h-4 w-32 bg-muted" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-64 bg-muted rounded-md" />
                        <Skeleton className="h-10 w-40 bg-muted rounded-md" />
                    </div>
                </div>
                <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden divide-y divide-border">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <Skeleton className="h-10 w-10 rounded-lg bg-muted" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24 bg-muted" />
                                    <Skeleton className="h-3 w-48 bg-muted" />
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="space-y-2 text-right">
                                    <Skeleton className="h-4 w-16 bg-muted ml-auto" />
                                    <Skeleton className="h-3 w-20 bg-muted ml-auto" />
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-8 w-8 bg-muted rounded-md" />
                                    <Skeleton className="h-8 w-8 bg-muted rounded-md" />
                                    <Skeleton className="h-8 w-8 bg-muted rounded-md" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <DashboardShell requireAdmin>
            <ModuleGuard module="sales">
                <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Delivery Notes</h1>
                    <p className="text-muted-foreground mt-1">Manage delivery notes with approval workflow</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search delivery notes..."
                            className="pl-9 h-10 w-64 border-border bg-background"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Button onClick={() => openEditDialog()} size="sm" className="h-10 gap-2 font-bold shadow-sm">
                        <Plus className="h-4 w-4" />
                        New Delivery Note
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

            {/* Delivery Notes List */}
            <div className="bg-card border border-border rounded-lg shadow-sm divide-y divide-border">
                {filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <p className="text-lg font-medium">No records found</p>
                        <p className="text-sm mt-1">Records will appear here once added</p>
                    </div>
                ) : (
                    filteredNotes.map(note => (
                        <div key={note.id} className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-bold text-foreground">{note.number}</h3>
                                        {getStatusBadge(note.status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {note.customerName || 'Customer'} • {note.invoiceRef ? `Ref: ${note.invoiceRef}` : 'No invoice ref'} • {note.date}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">{note.items?.length || 0} items</p>
                                    <p className="text-[10px] text-muted-foreground">{note.vehicleDetails || 'Standard'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setViewingNote(note); setViewDialogOpen(true); }}>
                                        <Eye size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateDeliveryNotePDF(note)} title="Download PDF">
                                        <Download size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateDeliveryNotePDF(note)} title="Download PDF">
                                        <Download size={16} />
                                    </Button>
                                    {canEdit(note) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(note)}>
                                            <Edit size={16} />
                                        </Button>
                                    )}
                                    {canSubmit(note) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => handleSubmitForApproval(note)}>
                                            <Send size={16} />
                                        </Button>
                                    )}
                                    {canApproveAction(note) && (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600" onClick={() => handleApprove(note)}>
                                                <Check size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => { setViewingNote(note); setRejectDialogOpen(true); }}>
                                                <X size={16} />
                                            </Button>
                                        </>
                                    )}
                                    {canResubmit(note) && (
                                        <Button variant="ghost" size="sm" onClick={() => handleResubmit(note)}>Resubmit</Button>
                                    )}
                                    {canComplete(note) && (
                                        <Button variant="ghost" size="sm" onClick={() => handleComplete(note)}>Complete</Button>
                                    )}
                                    {canEdit(note) && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(note)}>
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
                    <DialogHeader><DialogTitle>{editingNote.id ? 'Edit' : 'Create'} Delivery Note</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Form */}
                        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 scrollbar-thin">
                            {/* 1. Document & Seller Details */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">1. Document & Seller</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>DN Number</Label><Input value={editingNote.number || ''} onChange={e => setEditingNote({ ...editingNote, number: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Date</Label><Input type="date" value={editingNote.date || ''} onChange={e => setEditingNote({ ...editingNote, date: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Seller Name</Label><Input value={editingNote.sellerName || ''} onChange={e => setEditingNote({ ...editingNote, sellerName: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Seller Tax ID</Label><Input value={editingNote.sellerTaxId || ''} onChange={e => setEditingNote({ ...editingNote, sellerTaxId: e.target.value })} /></div>
                                    <div className="col-span-2 space-y-2"><Label>Seller Address</Label><Input value={editingNote.sellerAddress || ''} onChange={e => setEditingNote({ ...editingNote, sellerAddress: e.target.value })} /></div>
                                </div>
                            </div>

                            {/* 2. Customer & Recipient */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">2. Recipient Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Customer</Label>
                                        <Select value={editingNote.customerId} onValueChange={v => { const c = customers.find(c => c.id === v); setEditingNote({ ...editingNote, customerId: v, customerName: c?.name || '' }); }}>
                                            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                            <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label>Contact Person</Label><Input value={editingNote.customerContact || ''} onChange={e => setEditingNote({ ...editingNote, customerContact: e.target.value })} /></div>
                                    <div className="col-span-2 space-y-2"><Label>Delivery Address</Label><Input value={editingNote.customerAddress || ''} onChange={e => setEditingNote({ ...editingNote, customerAddress: e.target.value })} /></div>
                                </div>
                            </div>

                            {/* 3. Shipment Logistics */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">3. Shipment Logistics</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Shipment Date</Label><Input type="date" value={editingNote.shipmentDate || ''} onChange={e => setEditingNote({ ...editingNote, shipmentDate: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Est. Delivery Date</Label><Input type="date" value={editingNote.deliveryDate || ''} onChange={e => setEditingNote({ ...editingNote, deliveryDate: e.target.value })} /></div>
                                    <div className="space-y-2">
                                        <Label>Delivery Method</Label>
                                        <Select value={editingNote.deliveryMethod} onValueChange={v => setEditingNote({ ...editingNote, deliveryMethod: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="vehicle">Company Vehicle</SelectItem>
                                                <SelectItem value="courier">Courier Service</SelectItem>
                                                <SelectItem value="pickup">Customer Pickup</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label>Vehicle/Courier Details</Label><Input value={editingNote.vehicleDetails || ''} onChange={e => setEditingNote({ ...editingNote, vehicleDetails: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Warehouse Origin</Label><Input value={editingNote.warehouseOrigin || ''} onChange={e => setEditingNote({ ...editingNote, warehouseOrigin: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Order/PO Ref</Label><Input value={editingNote.orderRef || ''} onChange={e => setEditingNote({ ...editingNote, orderRef: e.target.value })} /></div>
                                </div>
                            </div>

                            {/* 4. Item Details */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">4. Items Delivered</h3>
                                <div className="space-y-3">
                                    {editingNote.items?.map(item => (
                                        <div key={item.id} className="p-4 border rounded-xl space-y-3 bg-muted/20 relative group">
                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </Button>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div className="col-span-2 space-y-1.5"><Label className="text-[10px] uppercase font-bold">Description</Label><Input value={item.description} onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">SKU</Label><Input value={item.sku} onChange={e => handleUpdateItem(item.id, 'sku', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Qty</Label><Input type="number" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Unit</Label><Input value={item.unit} onChange={e => handleUpdateItem(item.id, 'unit', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Weight (optional)</Label><Input value={item.weight} onChange={e => handleUpdateItem(item.id, 'weight', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Size (optional)</Label><Input value={item.size} onChange={e => handleUpdateItem(item.id, 'size', e.target.value)} /></div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={handleAddItem} className="w-full border-dashed"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
                                </div>
                            </div>

                            {/* 5. Packaging & Instructions */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">5. Package info & Instructions</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>No. of Parcels</Label><Input type="number" value={editingNote.parcelCount || 1} onChange={e => setEditingNote({ ...editingNote, parcelCount: parseInt(e.target.value) || 1 })} /></div>
                                    <div className="space-y-2"><Label>Total Weight</Label><Input value={editingNote.totalWeight || ''} onChange={e => setEditingNote({ ...editingNote, totalWeight: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Dimensions</Label><Input value={editingNote.dimensions || ''} onChange={e => setEditingNote({ ...editingNote, dimensions: e.target.value })} /></div>
                                </div>
                                <div className="space-y-2"><Label>Special Instructions</Label><Input value={editingNote.specialInstructions || ''} onChange={e => setEditingNote({ ...editingNote, specialInstructions: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Internal Notes</Label><Input value={editingNote.notes || ''} onChange={e => setEditingNote({ ...editingNote, notes: e.target.value })} /></div>
                            </div>

                            {/* 6. Receiver Acknowledgement */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">6. Receiver Acknowledgement</h3>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Receiver Name</Label>
                                        <Input 
                                            value={editingNote.receiverName || ''} 
                                            onChange={e => setEditingNote({ ...editingNote, receiverName: e.target.value })} 
                                            placeholder="Enter person name"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Note: Date & Time will be automatically recorded upon receipt/completion.</p>
                                </div>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="border rounded-lg overflow-hidden">
                            <LiveDocumentPreview data={editingNote as any} type="delivery" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Dialog - Print-friendly Delivery Note Preview */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Delivery Note {viewingNote?.number}</DialogTitle>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                                <Printer className="h-4 w-4 mr-2" /> Print
                            </Button>
                        </div>
                    </DialogHeader>
                    {viewingNote && (
                        <div className="space-y-8 p-8 border rounded-lg bg-white print:border-0 print:p-0 text-[12px]" id="delivery-note-print">
                            {/* Header: Seller vs Document Info */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 max-w-[50%]">
                                    <h3 className="text-lg font-black tracking-tight">{viewingNote.sellerName}</h3>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{viewingNote.sellerAddress}</p>
                                    {viewingNote.sellerTaxId && <p className="font-bold">Tax ID: {viewingNote.sellerTaxId}</p>}
                                    {viewingNote.sellerContact && <p>{viewingNote.sellerContact}</p>}
                                </div>
                                <div className="text-right space-y-1">
                                    <h2 className="text-3xl font-black text-primary tracking-tighter">DELIVERY NOTE</h2>
                                    <p className="text-lg font-bold text-muted-foreground">{viewingNote.number}</p>
                                    <div className="pt-2">
                                        <p><span className="text-muted-foreground uppercase font-bold text-[10px] mr-2">Issue Date:</span> {viewingNote.date}</p>
                                        {viewingNote.orderRef && <p><span className="text-muted-foreground uppercase font-bold text-[10px] mr-2">Order Ref:</span> {viewingNote.orderRef}</p>}
                                        {viewingNote.invoiceRef && <p><span className="text-muted-foreground uppercase font-bold text-[10px] mr-2">Invoice Ref:</span> {viewingNote.invoiceRef}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Recipient & Shipment Grid */}
                            <div className="grid grid-cols-2 gap-8 border-y py-6 bg-muted/5">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-1">SHIP TO / RECIPIENT</h4>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black">{viewingNote.customerName}</p>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{viewingNote.customerAddress || 'No address provided'}</p>
                                        {viewingNote.customerContact && <p className="font-bold pt-1">Contact: {viewingNote.customerContact}</p>}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-1">SHIPMENT DETAILS</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        <div><Label className="text-[9px] uppercase opacity-60">Shipment Date</Label><p className="font-bold">{viewingNote.shipmentDate || viewingNote.date}</p></div>
                                        <div><Label className="text-[9px] uppercase opacity-60">Method</Label><p className="font-bold capitalize">{viewingNote.deliveryMethod}</p></div>
                                        <div><Label className="text-[9px] uppercase opacity-60">Courier/Vehicle</Label><p className="font-bold">{viewingNote.vehicleDetails || 'Standard'}</p></div>
                                        <div><Label className="text-[9px] uppercase opacity-60">Origin</Label><p className="font-bold">{viewingNote.warehouseOrigin || 'Default Warehouse'}</p></div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted hover:bg-muted font-bold">
                                            <TableHead className="w-24">SKU</TableHead>
                                            <TableHead>DESCRIPTION</TableHead>
                                            <TableHead className="text-center">QTY</TableHead>
                                            <TableHead className="text-center">UNIT</TableHead>
                                            <TableHead className="text-right">WEIGHT/DIM</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewingNote.items?.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-mono font-bold">{item.sku || 'N/A'}</TableCell>
                                                <TableCell className="font-bold text-foreground">{item.description}</TableCell>
                                                <TableCell className="text-center font-black">{item.quantity}</TableCell>
                                                <TableCell className="text-center">{item.unit}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {item.weight && <span>{item.weight}</span>}
                                                    {item.weight && item.size && <span> • </span>}
                                                    {item.size && <span>{item.size}</span>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Bottom Info Grid */}
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-xl bg-muted/10">
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2">Package Information</h4>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div><p className="text-[9px] uppercase opacity-60">Parcels</p><p className="font-bold">{viewingNote.parcelCount}</p></div>
                                            <div><p className="text-[9px] uppercase opacity-60">Total Weight</p><p className="font-bold">{viewingNote.totalWeight || '-'}</p></div>
                                            <div><p className="text-[9px] uppercase opacity-60">Dimensions</p><p className="font-bold">{viewingNote.dimensions || '-'}</p></div>
                                        </div>
                                    </div>
                                    {viewingNote.specialInstructions && (
                                        <div className="space-y-1">
                                            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Special Instructions</h4>
                                            <p className="p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-100 italic">{viewingNote.specialInstructions}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    {/* Acknowledgement Block */}
                                    <div className="border-2 border-dashed rounded-2xl p-6 space-y-6">
                                        <h4 className="text-center text-[10px] font-black uppercase tracking-widest border-b pb-2">RECEIVER ACKNOWLEDGEMENT</h4>
                                        <div className="space-y-8">
                                            <div className="border-b border-muted py-2 flex justify-between">
                                                <span className="text-[10px] uppercase font-bold opacity-40 italic">Signature / Stamp</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="border-b border-muted py-1 flex flex-col">
                                                    <span className="text-[8px] uppercase opacity-40">Receiver Name</span>
                                                    <span className="h-4"></span>
                                                </div>
                                                <div className="border-b border-muted py-1 flex flex-col">
                                                    <span className="text-[8px] uppercase opacity-40">Date & Time</span>
                                                    <span className="h-4"></span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[8px] text-center text-muted-foreground italic">Declared goods received in perfect condition unless noted otherwise.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject Delivery Note</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Reason for rejection</Label>
                        <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => viewingNote && handleReject(viewingNote)}>Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                </div>
            </ModuleGuard>
        </DashboardShell>
    );
}
