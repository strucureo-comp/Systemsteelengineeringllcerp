# Module 11: Approval Engine & Workflows

## Overview
Workflow automation and approval management for documents across all modules.

## Backend Routes
- **Location**: `backend/routes/approval-engine.js`
- **Endpoints**:
  - `GET /api/approval-engine/workflows` - List approval workflows
  - `POST /api/approval-engine/workflows` - Create workflow
  - `PUT /api/approval-engine/workflows/:id` - Update workflow
  - `PATCH /api/approval-engine/workflows/:id/toggle` - Toggle workflow status
  - `DELETE /api/approval-engine/workflows/:id` - Delete workflow
  - `GET /api/approval-engine/sod-rules` - List SoD rules
  - `POST /api/approval-engine/sod-rules` - Create SoD rule
  - `PATCH /api/approval-engine/sod-rules/:id/toggle` - Toggle SoD rule
  - `DELETE /api/approval-engine/sod-rules/:id` - Delete SoD rule
  - `GET /api/approval-engine/summary` - Approval engine summary

## Backend Routes (Workflows)
- **Location**: `backend/routes/workflows.js`
- **Endpoints**:
  - `GET /api/workflows` - List workflows
  - `POST /api/workflows` - Create workflow
  - `PUT /api/workflows/:id` - Update workflow
  - `DELETE /api/workflows/:id` - Delete workflow

## Data Models

### ApprovalWorkflow
```javascript
ApprovalWorkflow {
  workflow_id: String (unique)
  name: String
  description: String
  document_type: String (e.g., 'invoice', 'expense', 'po', 'bill')
  status: 'active' | 'inactive'
  approval_levels: [{
    level: Number
    approver_role: String
    approver_email: String (optional)
    required_approvals: Number
    auto_approve_threshold: Number (optional)
  }]
  conditions: [{
    field: String
    operator: String (e.g., '>', '<', '=', 'contains')
    value: any
  }]
  createdAt, updatedAt: Date
}
```

### ApprovalRequest
```javascript
ApprovalRequest {
  request_id: String (unique)
  workflow_id: ObjectId → ApprovalWorkflow
  document_type: String
  document_id: ObjectId
  current_level: Number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approvals: [{
    level: Number
    approver: String
    action: 'approved' | 'rejected'
    comments: String
    timestamp: Date
  }]
  createdAt, updatedAt: Date
}
```

### SeparationOfDuties (SoD) Rule
```javascript
SoDRule {
  rule_id: String (unique)
  name: String
  description: String
  role1: String
  role2: String
  conflict_type: String (e.g., 'cannot_both_approve')
  status: 'active' | 'inactive'
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Workflows
getApprovalWorkflows() → ApprovalWorkflow[]
createApprovalWorkflow(data) → ApprovalWorkflow | null
updateApprovalWorkflow(id, data) → ApprovalWorkflow | null
deleteApprovalWorkflow(id) → boolean

getApprovalWorkflowsV2(docType?) → ApprovalWorkflow[]
createApprovalWorkflowV2(data) → ApprovalWorkflow | null
updateApprovalWorkflowV2(id, data) → ApprovalWorkflow | null
toggleApprovalWorkflowV2(id) → ApprovalWorkflow | null
deleteApprovalWorkflowV2(id) → boolean

// SoD Rules
getSodRules() → SoDRule[]
createSodRule(data) → SoDRule | null
toggleSodRule(id) → SoDRule | null
deleteSodRule(id) → boolean

// Summary
getApprovalEngineSummary() → {totalWorkflows, activeWorkflows, sodRules}
```

## Connections to Other Modules

### ↔ Finance Module
- **Trigger**: Expense and invoice approval workflows
- **Action**: Controls posting to GL
- **Data Flow**:
  - Expense created → Approval workflow triggered
  - Approved → Posted to GL
  - Rejected → Remains draft

### ↔ Procurement Module
- **Trigger**: PO and bill approval workflows
- **Action**: Controls posting to GL
- **Data Flow**:
  - PO created → Approval workflow
  - Approved → Can be sent to vendor
  - Bill created → Approval workflow
  - Approved → Posted to GL

### ↔ HRMS Module
- **Trigger**: Leave and expense approval workflows
- **Action**: Controls leave approval and expense posting
- **Data Flow**:
  - Leave applied → Approval workflow
  - Approved → Leave deducted
  - Expense submitted → Approval workflow
  - Approved → Posted to GL

### ↔ Projects Module
- **Trigger**: Timesheet and expense approval workflows
- **Action**: Controls project cost tracking
- **Data Flow**:
  - Timesheet submitted → Approval workflow
  - Approved → Used for billing
  - Expense submitted → Approval workflow
  - Approved → Added to project cost

## Key Workflows

### Approval Workflow Setup
1. Define document type (invoice, expense, PO, bill)
2. Create approval levels
3. Specify approver roles or individuals
4. Set auto-approval thresholds
5. Define conditions (e.g., amount > 10000)
6. Activate workflow

### Document Approval Process
1. Document created (expense, invoice, PO, bill)
2. Approval workflow triggered
3. Document sent to first-level approver
4. Approver reviews and approves/rejects
5. If approved, moves to next level
6. If rejected, returned to creator
7. Final approval → Document posted to GL
8. Rejected → Document remains draft

### Separation of Duties (SoD)
1. Define conflicting roles
2. System prevents same person from:
   - Creating and approving document
   - Approving at multiple levels
   - Performing conflicting operations
3. Enforced during approval assignment

### Auto-Approval
1. Document created
2. Amount below auto-approval threshold
3. Document automatically approved
4. Posted to GL immediately
5. Notification sent to approver

## Module Access
- **Default**: Enabled for all business types
- **Role**: Finance Manager, Compliance Officer
- **Setup**: Workflow definitions required

## Real-time Features
- Multi-level approval workflows
- Conditional approval routing
- Auto-approval thresholds
- Separation of duties enforcement
- Approval notifications
- Audit trail

## Integration Points
- Finance for expense and invoice approval
- Procurement for PO and bill approval
- HRMS for leave and expense approval
- Projects for timesheet and expense approval
- All modules for document approval control
