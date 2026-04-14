const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

const workflowStepSchema = new mongoose.Schema({
    step_number: { 
        type: Number, 
        required: true,
        min: 1
    },
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    approver_type: { 
        type: String, 
        enum: ['role', 'specific_user', 'department_head', 'reporting_manager'],
        required: true
    },
    approver_role: { 
        type: String,
        trim: true
    },
    approver_user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    condition: {
        field: { type: String },
        operator: { 
            type: String, 
            enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'ne']
        },
        value: { type: mongoose.Schema.Types.Mixed }
    },
    can_reject: { 
        type: Boolean, 
        default: true 
    },
    timeout_hours: { 
        type: Number, 
        default: 48,
        min: 0
    },
    timeout_action: { 
        type: String, 
        enum: ['escalate', 'auto_approve', 'auto_reject'],
        default: 'escalate'
    },
    escalate_to_user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }
}, { _id: false });

const approvalWorkflowSchema = new mongoose.Schema({
    tenant_id: { 
        type: String, 
        required: true,
        index: true,
        default: 'default'
    },
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    module: { 
        type: String, 
        required: true,
        enum: ['procurement', 'hr', 'finance', 'sales', 'inventory', 'projects'],
        index: true
    },
    document_type: { 
        type: String, 
        required: true,
        enum: [
            'purchase_order', 
            'bill', 
            'expense',
            'leave', 
            'payroll',
            'overtime',
            'journal_entry', 
            'quotation',
            'sales_order',
            'invoice',
            'payment_voucher',
            'receipt_voucher',
            'stock_adjustment',
            'project_budget'
        ],
        index: true
    },
    is_active: { 
        type: Boolean, 
        default: true,
        index: true
    },
    steps: [workflowStepSchema],
    created_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    updated_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }
}, { timestamps: true });

// Indexes
approvalWorkflowSchema.index({ tenant_id: 1, createdAt: -1 });
approvalWorkflowSchema.index({ tenant_id: 1, module: 1, document_type: 1 });
approvalWorkflowSchema.index({ tenant_id: 1, is_active: 1 });

// Validation: steps must be in sequential order
approvalWorkflowSchema.pre('validate', function(next) {
    if (this.steps && this.steps.length > 0) {
        const stepNumbers = this.steps.map(s => s.step_number).sort((a, b) => a - b);
        for (let i = 0; i < stepNumbers.length; i++) {
            if (stepNumbers[i] !== i + 1) {
                return next(new Error('Step numbers must be sequential starting from 1'));
            }
        }
    }
    next();
});

// Apply soft delete plugin
approvalWorkflowSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
