// Sales Approval - Re-exports from unified approval system for backward compatibility
// This file maintains backward compatibility with existing imports

export {
    // Types
    type SalesDocumentType,
    type DocumentStatus,
    type SalesApprovalConfig,
    type SalesDocument,
    type ApprovalHistoryEntry,

    // Config functions
    getCurrentUserRole,
    getSalesApprovalConfig,
    isApprovalRequired,
    getApproverRole,
    canApproveDocument,
    isDocumentCreator,

    // Status helpers
    getStatusInfo,
    getAvailableActions,

    // Document actions
    submitForApproval,
    approveDocument,
    rejectDocument,
    resubmitDocument,
    completeDocument,

    // Document helpers
    getDocumentTypeLabel,
    getDocuments,
    saveDocument,
    deleteDocument,

    // Workflow helpers
    getApprovalWorkflows,
    hasMultiStepApproval,
    getApprovalSteps,
    isThresholdApprovalRequired,
    getCurrentApprovalStep,
    isFinalApprovalStep,
    updateDocumentApproval,
} from './approval-system';

// Re-export new module types for convenience
export {
    type AppModule,
    type DocumentType,
    type PurchaseDocumentType,
    type HRDocumentType,
    type FinanceDocumentType,
    type DocumentApprovalConfig,
    type ModuleApprovalConfig,
    type AllApprovalsConfig,
    type ApprovalDocument,
    MODULE_CONFIG,
    getApprovalsConfig,
    getDocumentApprovalConfig,
    getModuleFromType,
    getModuleLabel,
    getStorageKey,
    getPendingApprovalsForRole,
    getPendingApprovalCounts,
    getCurrentUser,
} from './approval-system';