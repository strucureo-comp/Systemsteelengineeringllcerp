'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, ClipboardCheck, ArrowRight, Clock, FileText, User, Receipt, Truck, Bell, FileSignature, ShoppingCart, DollarSign, CreditCard, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSettings } from '@/lib/settings-context';
import {
    AppModule,
    DocumentType,
    MODULE_CONFIG,
    getApprovalsConfig,
    getDocuments,
    getDocumentTypeLabel,
    getCurrentUser,
} from '@/lib/approval-system';

// Document type icons
const DOC_ICONS: Record<string, any> = {
    // Sales
    quotation: FileText,
    proformaInvoice: Receipt,
    salesInvoice: FileSignature,
    deliveryNote: Truck,
    // Purchase
    purchaseOrder: ShoppingCart,
    purchaseBill: Receipt,
    // HR
    payslip: DollarSign,
    // Finance
    paymentVoucher: CreditCard,
    receiptVoucher: Receipt,
};

// Module icons
const MODULE_ICONS: Record<AppModule, any> = {
    sales: Receipt,
    purchase: ShoppingCart,
    hr: Users,
    finance: CreditCard,
};

// Route paths for document types
const DOC_PATHS: Record<string, string> = {
    // Sales
    quotation: '/admin/sales/quotations',
    proformaInvoice: '/admin/sales/proforma',
    salesInvoice: '/admin/sales/invoices',
    deliveryNote: '/admin/sales/delivery-notes',
    // Purchase
    purchaseOrder: '/admin/purchase/orders',
    purchaseBill: '/admin/purchase/bills',
    // HR
    payslip: '/admin/hr/payslips',
    // Finance
    paymentVoucher: '/admin/finance/payment-vouchers',
    receiptVoucher: '/admin/finance/receipt-vouchers',
};

interface PendingDocument {
    id: string;
    module: AppModule;
    docType: DocumentType;
    number: string;
    title: string;
    amount: number;
    date: string;
    status: string;
    name?: string; // Customer/Supplier/Employee name
}

export function ApprovalsInbox() {
    const router = useRouter();
    const { user } = useAuth();
    const { settings } = useSettings();
    const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
    const [apiApprovals, setApiApprovals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const getCurrentUserRole = (): string => {
        if (typeof window === 'undefined') return 'Employee';
        const role = localStorage.getItem('user_role');
        if (role) return role;
        return user?.role || 'Employee';
    };

    // Load all pending approvals from all modules
    useEffect(() => {
        const userRole = getCurrentUserRole();
        const config = getApprovalsConfig();
        const allPending: PendingDocument[] = [];

        // Check each module and document type
        Object.entries(config).forEach(([module, moduleConfig]) => {
            Object.entries(moduleConfig as Record<string, { enabled: boolean; approverRole: string }>).forEach(([docType, docConfig]) => {
                if (!docConfig.enabled || docConfig.approverRole !== userRole) return;

                // Get documents for this type
                const docs = getDocuments(module as AppModule, docType as DocumentType);
                docs.forEach((doc: any) => {
                    if (doc.status === 'pending_approval') {
                        allPending.push({
                            id: doc.id,
                            module: module as AppModule,
                            docType: docType as DocumentType,
                            number: doc.number || doc.id,
                            title: `${getDocumentTypeLabel(docType as DocumentType)} - ${doc.name || doc.customerName || 'Unknown'}`,
                            amount: doc.total || 0,
                            date: doc.date || doc.createdAt,
                            status: doc.status,
                            name: doc.name || doc.customerName,
                        });
                    }
                });
            });
        });

        // Sort by date descending
        allPending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPendingDocs(allPending);
    }, [user]);

    // Load API-based approvals
    useEffect(() => {
        const fetchApprovals = async () => {
            setIsLoading(true);
            try {
                if (typeof window === 'undefined') return;
                const token = localStorage.getItem('token');
                if (!token || !user?.role) return;

                const response = await fetch(`http://localhost:4000/api/approval-engine/requests/pending?role=${user.role}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setApiApprovals(data.map((item: any) => ({ ...item, id: item.reqId })));
                }
            } catch (error) {
                console.error("Failed to fetch pending approvals", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApprovals();

        const interval = setInterval(fetchApprovals, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const [selectedRequest, setSelectedRequest] = useState<PendingDocument | any>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [notes, setNotes] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleActionClick = (req: any, type: 'approve' | 'reject') => {
        setSelectedRequest(req);
        setActionType(type);
        setNotes('');
        setIsDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedRequest) return;

        // Handle module-based approval (localStorage)
        if (selectedRequest.module) {
            await handleModuleApprovalAction(selectedRequest, actionType!);
            setIsDialogOpen(false);
            return;
        }

        // Handle API-based approval
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:4000/api/approval-engine/requests/${selectedRequest.id}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: actionType, notes: notes })
            });

            if (response.ok) {
                setApiApprovals(apiApprovals.filter(a => a.id !== selectedRequest.id));
                if (actionType === 'approve') {
                    toast.success(`Request Approved Successfully`);
                } else {
                    toast.error(`Request Rejected`);
                }
            }
        } catch (error) {
            console.error("Failed to process approval", error);
            toast.error("Failed to process approval");
        }

        setIsDialogOpen(false);
    };

    const handleModuleApprovalAction = async (doc: PendingDocument, action: 'approve' | 'reject') => {
        const storageKey = `${doc.module}_${doc.docType}s`;
        const saved = localStorage.getItem(storageKey);
        if (!saved) return;

        let documents = JSON.parse(saved);
        const docIndex = documents.findIndex((d: any) => d.id === doc.id);
        if (docIndex < 0) return;

        const currentUser = getCurrentUser();

        if (action === 'approve') {
            documents[docIndex].status = 'approved';
            documents[docIndex].approvedBy = currentUser.name;
            documents[docIndex].approvedAt = new Date().toISOString();
            toast.success(`${getDocumentTypeLabel(doc.docType)} Approved`);
        } else {
            documents[docIndex].status = 'rejected';
            documents[docIndex].rejectedBy = currentUser.name;
            documents[docIndex].rejectedAt = new Date().toISOString();
            documents[docIndex].rejectedReason = notes;
            toast.error(`${getDocumentTypeLabel(doc.docType)} Rejected`);
        }

        localStorage.setItem(storageKey, JSON.stringify(documents));
        setPendingDocs(pendingDocs.filter(d => d.id !== doc.id));
    };

    const pendingCount = pendingDocs.length + apiApprovals.length;

    // Group pending docs by module
    const groupedDocs = pendingDocs.reduce((acc, doc) => {
        if (!acc[doc.module]) acc[doc.module] = [];
        acc[doc.module].push(doc);
        return acc;
    }, {} as Record<AppModule, PendingDocument[]>);

    const navigateToDocument = (req: any) => {
        if (req.module && req.docType) {
            const path = DOC_PATHS[req.docType];
            if (path) {
                router.push(path);
            }
        } else {
            router.push(`/admin/inbox/${req.id}`);
        }
    };

    const formatDocCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.currency,
        }).format(amount);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-lg hover:bg-accent">
                        <Bell className="h-5 w-5" />
                        {pendingCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Approvals</span>
                        {pendingCount > 0 && (
                            <Badge variant="destructive" className="text-xs">{pendingCount} Pending</Badge>
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <ScrollArea className="h-[400px]">
                        {/* Module-based approvals grouped by module */}
                        {Object.entries(groupedDocs).map(([module, docs]) => {
                            const moduleConfig = MODULE_CONFIG[module as AppModule];
                            const ModuleIcon = MODULE_ICONS[module as AppModule] || FileText;
                            return (
                                <div key={module}>
                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                        <ModuleIcon className="h-3 w-3" />
                                        {moduleConfig?.name || module}
                                    </div>
                                    {docs.map((doc) => {
                                        const DocIcon = DOC_ICONS[doc.docType] || FileText;
                                        return (
                                            <DropdownMenuItem key={doc.id} onClick={() => navigateToDocument(doc)} className="flex items-start gap-3 p-3 cursor-pointer">
                                                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                                    <DocIcon className="h-4 w-4 text-yellow-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{doc.title}</p>
                                                    <p className="text-xs text-muted-foreground">{doc.number} • {formatDocCurrency(doc.amount || 0)}</p>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleActionClick(doc, 'approve'); }}>
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleActionClick(doc, 'reject'); }}>
                                                        <X className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                    <DropdownMenuSeparator />
                                </div>
                            );
                        })}

                        {/* API-based approvals */}
                        {apiApprovals.length > 0 && (
                            <>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <ClipboardCheck className="h-3 w-3" />
                                    System Approvals
                                </div>
                                {apiApprovals.map((req) => (
                                    <DropdownMenuItem key={req.id} onClick={() => navigateToDocument(req)} className="flex items-start gap-3 p-3 cursor-pointer">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <ClipboardCheck className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{req.title || req.type}</p>
                                            <p className="text-xs text-muted-foreground">{req.requestedBy} • {new Date(req.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleActionClick(req, 'approve'); }}>
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleActionClick(req, 'reject'); }}>
                                                <X className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}

                        {pendingCount === 0 && (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                No pending approvals
                            </div>
                        )}
                    </ScrollArea>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin/inbox')} className="justify-center text-primary">
                        View All Approvals
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve' : 'Reject'} {selectedRequest?.docType ? getDocumentTypeLabel(selectedRequest.docType) : 'Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedRequest?.title || selectedRequest?.type}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Notes (optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Add notes...'}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant={actionType === 'approve' ? 'default' : 'destructive'}
                            onClick={handleConfirmAction}
                        >
                            {actionType === 'approve' ? 'Approve' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}