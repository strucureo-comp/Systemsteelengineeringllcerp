// Unified Approval System for All Modules
// Sales & CRM, Purchase, HR, Finance

import { toast } from 'sonner';

// ============= MODULE TYPES =============

export type AppModule = 'sales' | 'purchase' | 'hr' | 'finance';

// Sales & CRM Document Types
export type SalesDocumentType = 'quotation' | 'proformaInvoice' | 'salesInvoice' | 'deliveryNote';

// Purchase Document Types
export type PurchaseDocumentType = 'purchaseOrder' | 'purchaseBill';

// HR Document Types
export type HRDocumentType = 'payslip';

// Finance Document Types
export type FinanceDocumentType = 'paymentVoucher' | 'receiptVoucher';

// All document types union
export type DocumentType = SalesDocumentType | PurchaseDocumentType | HRDocumentType | FinanceDocumentType;

// Document Status
export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed';

// ============= MODULE CONFIGURATION =============

export const MODULE_CONFIG = {
    sales: {
        name: 'Sales & CRM',
        documents: {
            quotation: { name: 'Sales Quote', description: 'Create quotation for customer' },
            proformaInvoice: { name: 'Proforma Invoice', description: 'Used when advance payment is required before final invoice' },
            salesInvoice: { name: 'Sales Invoice', description: 'Final billing after confirmation' },
            deliveryNote: { name: 'Delivery Note', description: 'Product delivery record linked with invoice' },
        }
    },
    purchase: {
        name: 'Purchase',
        documents: {
            purchaseOrder: { name: 'Purchase Order', description: 'Order sent to supplier' },
            purchaseBill: { name: 'Purchase Bill Entry', description: 'Supplier invoice recording' },
        }
    },
    hr: {
        name: 'HR',
        documents: {
            payslip: { name: 'HR Payslip', description: 'Salary slip generation' },
        }
    },
    finance: {
        name: 'Finance',
        documents: {
            paymentVoucher: { name: 'Payment Voucher', description: 'Payment made to supplier/vendor' },
            receiptVoucher: { name: 'Receipt Voucher', description: 'Money received from customers' },
        }
    }
} as const;

// ============= APPROVAL CONFIG INTERFACES =============

export interface DocumentApprovalConfig {
    enabled: boolean;
    approverRole: string;
    threshold?: number;
}

export interface ModuleApprovalConfig {
    [key: string]: DocumentApprovalConfig;
}

export interface AllApprovalsConfig {
    sales: ModuleApprovalConfig;
    purchase: ModuleApprovalConfig;
    hr: ModuleApprovalConfig;
    finance: ModuleApprovalConfig;
}

// ============= APPROVAL HISTORY =============

export interface ApprovalHistoryEntry {
    step: number;
    role: string;
    action: 'approved' | 'rejected';
    user: string;
    timestamp: string;
    comment?: string;
}

// ============= GENERIC DOCUMENT INTERFACE =============

export interface ApprovalDocument {
    id: string;
    module: AppModule;
    type: DocumentType;
    number: string;
    name?: string; // Customer/Supplier/Employee name
    date: string;
    total: number;
    status: DocumentStatus;
    createdBy: string;
    createdAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectedReason?: string;
    approvalHistory?: ApprovalHistoryEntry[];
    submittedAt?: string;
    resubmittedAt?: string;
    completedAt?: string;
}

// ============= HELPER FUNCTIONS =============

// Get current user's role from auth context
export function getCurrentUserRole(): string {
    if (typeof window === 'undefined') return 'Employee';
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        return user.role || 'Employee';
    }
    return 'Employee';
}

// Check if current user is the creator of the document
export function isDocumentCreator(document: ApprovalDocument, _userId?: string): boolean {
    const user = getCurrentUser();
    // Use provided userId if available, otherwise check against current user's name/email
    if (_userId) return document.createdBy === _userId;
    // Assuming createdBy stores name or email
    return document.createdBy === user.name || document.createdBy === user.email || document.createdBy === 'Current User';
}

// Get current user info
export function getCurrentUser(): { name: string; email: string; role: string } {
    if (typeof window === 'undefined') return { name: 'User', email: '', role: 'Employee' };
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        return {
            name: user.full_name || user.name || 'User',
            email: user.email || '',
            role: user.role || 'Employee'
        };
    }
    return { name: 'User', email: '', role: 'Employee' };
}

// Get module from document type
export function getModuleFromType(type: DocumentType): AppModule {
    const salesTypes: DocumentType[] = ['quotation', 'proformaInvoice', 'salesInvoice', 'deliveryNote'];
    const purchaseTypes: DocumentType[] = ['purchaseOrder', 'purchaseBill'];
    const hrTypes: DocumentType[] = ['payslip'];
    const financeTypes: DocumentType[] = ['paymentVoucher', 'receiptVoucher'];

    if (salesTypes.includes(type)) return 'sales';
    if (purchaseTypes.includes(type)) return 'purchase';
    if (hrTypes.includes(type)) return 'hr';
    if (financeTypes.includes(type)) return 'finance';
    return 'sales';
}

// Get all approvals config from localStorage
export function getApprovalsConfig(): AllApprovalsConfig {
    const defaultConfig: AllApprovalsConfig = {
        sales: {
            quotation: { enabled: false, approverRole: '', threshold: 0 },
            proformaInvoice: { enabled: false, approverRole: '', threshold: 0 },
            salesInvoice: { enabled: false, approverRole: '', threshold: 0 },
            deliveryNote: { enabled: false, approverRole: '', threshold: 0 },
        },
        purchase: {
            purchaseOrder: { enabled: false, approverRole: '', threshold: 0 },
            purchaseBill: { enabled: false, approverRole: '', threshold: 0 },
        },
        hr: {
            payslip: { enabled: false, approverRole: '', threshold: 0 },
        },
        finance: {
            paymentVoucher: { enabled: false, approverRole: '', threshold: 0 },
            receiptVoucher: { enabled: false, approverRole: '', threshold: 0 },
        },
    };

    if (typeof window === 'undefined') return defaultConfig;
    const saved = localStorage.getItem('module_approvals_config');
    if (saved) {
        try {
            return { ...defaultConfig, ...JSON.parse(saved) };
        } catch (e) {
            return defaultConfig;
        }
    }
    return defaultConfig;
}

// Get approval config for specific module and document type
export function getDocumentApprovalConfig(module: AppModule, documentType: DocumentType): DocumentApprovalConfig {
    const config = getApprovalsConfig();
    return config[module]?.[documentType] || { enabled: false, approverRole: '', threshold: 0 };
}

// Check if approval is required for a document type
export function isApprovalRequired(module: AppModule, documentType: DocumentType): boolean {
    const config = getDocumentApprovalConfig(module, documentType);
    return config.enabled;
}

// Get approver role for a document type
export function getApproverRole(module: AppModule, documentType: DocumentType): string {
    const config = getDocumentApprovalConfig(module, documentType);
    return config.approverRole || '';
}

// Check if threshold-based approval is required
export function isThresholdApprovalRequired(module: AppModule, documentType: DocumentType, amount: number): boolean {
    const config = getDocumentApprovalConfig(module, documentType);
    const threshold = config.threshold || 0;
    return amount > threshold && config.enabled;
}

// Check if current user can approve a document
export function canApproveDocument(module: AppModule, documentType: DocumentType): boolean {
    const currentRole = getCurrentUserRole();
    const approverRole = getApproverRole(module, documentType);
    return currentRole === approverRole && isApprovalRequired(module, documentType);
}

// ============= STATUS HELPERS =============

export function getStatusInfo(status: DocumentStatus): { label: string; color: string; icon: string } {
    switch (status) {
        case 'draft':
            return { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: '📝' };
        case 'pending_approval':
            return { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
        case 'approved':
            return { label: 'Approved', color: 'bg-green-100 text-green-800', icon: '✅' };
        case 'rejected':
            return { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: '❌' };
        case 'completed':
            return { label: 'Completed', color: 'bg-blue-100 text-blue-800', icon: '📋' };
        default:
            return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: '❓' };
    }
}

// Get document type label
export function getDocumentTypeLabel(type: DocumentType): string {
    const module = getModuleFromType(type);
    const moduleConfig = MODULE_CONFIG[module as keyof typeof MODULE_CONFIG];
    return (moduleConfig.documents as any)[type]?.name || type;
}

// Get module label
export function getModuleLabel(module: AppModule): string {
    return MODULE_CONFIG[module as keyof typeof MODULE_CONFIG]?.name || module;
}

// ============= ACTION HELPERS =============

// Get available actions based on document status and user role
export function getAvailableActions(
    document: ApprovalDocument
): { edit: boolean; delete: boolean; submit: boolean; approve: boolean; reject: boolean; resubmit: boolean; download: boolean; complete: boolean } {
    const userRole = getCurrentUserRole();
    const approverRole = getApproverRole(document.module, document.type);
    const isApprover = userRole === approverRole;
    const approvalRequired = isApprovalRequired(document.module, document.type);

    // If approval not required, allow all actions
    if (!approvalRequired) {
        return {
            edit: document.status === 'draft',
            delete: document.status === 'draft',
            submit: document.status === 'draft',
            approve: false,
            reject: false,
            resubmit: false,
            download: document.status !== 'draft',
            complete: document.status === 'approved' || document.status === 'draft',
        };
    }

    switch (document.status) {
        case 'draft':
            return {
                edit: true,
                delete: true,
                submit: true,
                approve: false,
                reject: false,
                resubmit: false,
                download: false,
                complete: false,
            };
        case 'pending_approval':
            return {
                edit: false,
                delete: false,
                submit: false,
                approve: isApprover,
                reject: isApprover,
                resubmit: false,
                download: false,
                complete: false,
            };
        case 'approved':
            return {
                edit: false,
                delete: false,
                submit: false,
                approve: false,
                reject: false,
                resubmit: false,
                download: true,
                complete: true,
            };
        case 'rejected':
            return {
                edit: true,
                delete: true,
                submit: false,
                approve: false,
                reject: false,
                resubmit: true,
                download: false,
                complete: false,
            };
        case 'completed':
            return {
                edit: false,
                delete: false,
                submit: false,
                approve: false,
                reject: false,
                resubmit: false,
                download: true,
                complete: false,
            };
        default:
            return {
                edit: false,
                delete: false,
                submit: false,
                approve: false,
                reject: false,
                resubmit: false,
                download: false,
                complete: false,
            };
    }
}

// ============= DOCUMENT STATE TRANSITIONS =============

// Submit document for approval
export function submitForApproval(document: ApprovalDocument): ApprovalDocument {
    return {
        ...document,
        status: 'pending_approval',
        submittedAt: new Date().toISOString(),
    };
}

// Approve document
export function approveDocument(document: ApprovalDocument, approvedBy: string, comment?: string): ApprovalDocument {
    const approvalHistory = document.approvalHistory || [];
    approvalHistory.push({
        step: approvalHistory.length,
        role: getCurrentUserRole(),
        action: 'approved',
        user: approvedBy,
        timestamp: new Date().toISOString(),
        comment,
    });

    return {
        ...document,
        status: 'approved',
        approvedBy: approvedBy,
        approvedAt: new Date().toISOString(),
        approvalHistory,
    };
}

// Reject document
export function rejectDocument(document: ApprovalDocument, rejectedBy: string, reason: string): ApprovalDocument {
    const approvalHistory = document.approvalHistory || [];
    approvalHistory.push({
        step: approvalHistory.length,
        role: getCurrentUserRole(),
        action: 'rejected',
        user: rejectedBy,
        timestamp: new Date().toISOString(),
        comment: reason,
    });

    return {
        ...document,
        status: 'rejected',
        rejectedBy: rejectedBy,
        rejectedAt: new Date().toISOString(),
        rejectedReason: reason,
        approvalHistory,
    };
}

// Resubmit rejected document
export function resubmitDocument(document: ApprovalDocument): ApprovalDocument {
    return {
        ...document,
        status: 'pending_approval',
        resubmittedAt: new Date().toISOString(),
        rejectedBy: undefined,
        rejectedAt: undefined,
        rejectedReason: undefined,
    };
}

// Complete approved document
export function completeDocument(document: ApprovalDocument): ApprovalDocument {
    return {
        ...document,
        status: 'completed',
        completedAt: new Date().toISOString(),
    };
}

// ============= STORAGE HELPERS =============

// Get storage key for document type
export function getStorageKey(module: AppModule, type: DocumentType): string {
    return `${module}_${type}s`;
}

// Get documents from localStorage
export function getDocuments(module: AppModule, type: DocumentType): ApprovalDocument[] {
    if (typeof window === 'undefined') return [];
    const key = getStorageKey(module, type);
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
}

// Save document to localStorage
export function saveDocument(document: ApprovalDocument): void {
    if (typeof window === 'undefined') return;
    const key = getStorageKey(document.module, document.type);
    const saved = localStorage.getItem(key);
    let documents: ApprovalDocument[] = saved ? JSON.parse(saved) : [];

    const existingIndex = documents.findIndex(d => d.id === document.id);
    if (existingIndex >= 0) {
        documents[existingIndex] = document;
    } else {
        documents.push(document);
    }

    localStorage.setItem(key, JSON.stringify(documents));
}

// Delete document from localStorage
export function deleteDocument(document: ApprovalDocument): void {
    if (typeof window === 'undefined') return;
    const key = getStorageKey(document.module, document.type);
    const saved = localStorage.getItem(key);
    if (saved) {
        let documents: ApprovalDocument[] = JSON.parse(saved);
        documents = documents.filter(d => d.id !== document.id);
        localStorage.setItem(key, JSON.stringify(documents));
    }
}

// Get all pending approvals for current user's role
export function getPendingApprovalsForRole(): ApprovalDocument[] {
    const userRole = getCurrentUserRole();
    const config = getApprovalsConfig();
    const pendingDocs: ApprovalDocument[] = [];

    // Check each module
    Object.entries(config).forEach(([module, moduleConfig]) => {
        Object.entries(moduleConfig as ModuleApprovalConfig).forEach(([docType, docConfig]) => {
            if (docConfig.enabled && docConfig.approverRole === userRole) {
                const docs = getDocuments(module as AppModule, docType as DocumentType);
                const pending = docs.filter(d => d.status === 'pending_approval');
                pendingDocs.push(...pending);
            }
        });
    });

    return pendingDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get pending approval counts by module
export function getPendingApprovalCounts(): Record<AppModule, number> {
    const counts: Record<AppModule, number> = {
        sales: 0,
        purchase: 0,
        hr: 0,
        finance: 0,
    };

    const userRole = getCurrentUserRole();
    const config = getApprovalsConfig();

    Object.entries(config).forEach(([module, moduleConfig]) => {
        Object.entries(moduleConfig as ModuleApprovalConfig).forEach(([docType, docConfig]) => {
            if (docConfig.enabled && docConfig.approverRole === userRole) {
                const docs = getDocuments(module as AppModule, docType as DocumentType);
                const pending = docs.filter(d => d.status === 'pending_approval');
                counts[module as AppModule] += pending.length;
            }
        });
    });

    return counts;
}

// ============= WORKFLOW HELPERS =============

// Alias to get all configurations
export function getApprovalWorkflows(): AllApprovalsConfig {
    return getApprovalsConfig();
}

// Multi-step check (currently single-step, but for backward compatibility)
export function hasMultiStepApproval(module: AppModule, type: DocumentType): boolean {
    return false;
}

// Get approval steps (currently single-step)
export function getApprovalSteps(module: AppModule, type: DocumentType): Array<{ step: number; role: string }> {
    const config = getDocumentApprovalConfig(module, type);
    if (!config.enabled) return [];
    return [{ step: 0, role: config.approverRole }];
}

// Get current step
export function getCurrentApprovalStep(document: ApprovalDocument): number {
    return 0;
}

// Is final step
export function isFinalApprovalStep(document: ApprovalDocument): boolean {
    return true;
}

// Generic update for backward compatibility
export function updateDocumentApproval(document: ApprovalDocument, update: Partial<ApprovalDocument>): ApprovalDocument {
    return { ...document, ...update };
}

// ============= LEGACY COMPATIBILITY =============

// For backward compatibility with existing sales-approval imports
export type SalesDocument = ApprovalDocument;
export type SalesApprovalConfig = ModuleApprovalConfig;

export function getSalesApprovalConfig(): SalesApprovalConfig {
    const config = getApprovalsConfig();
    return config.sales;
}