import { getSettings } from '@/lib/api';

export type DocumentType = 'quotation' | 'invoice';

export interface DocumentApprovalSettings {
    enabled: boolean;
    requiredRole: string;
    threshold?: number;
    allowSelfApproval: boolean;
}

export interface DocumentApprovalConfig {
    quotationApproval: DocumentApprovalSettings;
    invoiceApproval: DocumentApprovalSettings;
}

export interface ApprovalRequirement {
    requiresApproval: boolean;
    approvalRole: string;
    threshold?: number;
    allowSelfApproval: boolean;
}

/**
 * Check if a document requires approval based on settings
 */
export async function checkApprovalRequired(
    documentType: DocumentType,
    totalAmount: number
): Promise<ApprovalRequirement> {
    try {
        const config = await getSettings<DocumentApprovalConfig>('document_approval_config');
        
        if (!config) {
            return {
                requiresApproval: false,
                approvalRole: '',
                threshold: undefined,
                allowSelfApproval: false
            };
        }

        const approvalSettings = documentType === 'quotation' 
            ? config.quotationApproval 
            : config.invoiceApproval;

        if (!approvalSettings.enabled) {
            return {
                requiresApproval: false,
                approvalRole: '',
                threshold: undefined,
                allowSelfApproval: false
            };
        }

        // Check if threshold is set and amount is below it
        if (approvalSettings.threshold !== undefined && totalAmount < approvalSettings.threshold) {
            return {
                requiresApproval: false,
                approvalRole: approvalSettings.requiredRole,
                threshold: approvalSettings.threshold,
                allowSelfApproval: approvalSettings.allowSelfApproval
            };
        }

        return {
            requiresApproval: true,
            approvalRole: approvalSettings.requiredRole,
            threshold: approvalSettings.threshold,
            allowSelfApproval: approvalSettings.allowSelfApproval
        };
    } catch (error) {
        console.error('Error checking approval requirement:', error);
        return {
            requiresApproval: false,
            approvalRole: '',
            threshold: undefined,
            allowSelfApproval: false
        };
    }
}

/**
 * Check if a user has permission to approve a document
 */
export function canApproveDocument(
    userRole: string,
    requiredRole: string,
    isCreator: boolean,
    allowSelfApproval: boolean
): boolean {
    // If user is the creator and self-approval is not allowed
    if (isCreator && !allowSelfApproval) {
        return false;
    }

    // Current auth model uses admin/client roles; admin is treated as a super-approver.
    if (userRole === 'admin') {
        return true;
    }

    // Check if user has the required role
    return userRole === requiredRole;
}

/**
 * Get approval status badge info
 */
export function getApprovalStatusBadge(status: string): {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    color: string;
} {
    switch (status) {
        case 'pending_approval':
            return {
                label: 'Pending Approval',
                variant: 'secondary',
                color: 'text-yellow-600'
            };
        case 'approved':
            return {
                label: 'Approved',
                variant: 'default',
                color: 'text-green-600'
            };
        case 'rejected':
            return {
                label: 'Rejected',
                variant: 'destructive',
                color: 'text-red-600'
            };
        default:
            return {
                label: status,
                variant: 'outline',
                color: 'text-slate-600'
            };
    }
}
