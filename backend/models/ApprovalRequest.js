const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
    step_number: { 
        type: Number, 
        required: true 
    },
    step_name: { 
        type: String, 
        required: true 
    },
    approver_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    approver_name: { 
        type: String 
    },
    approver_email: {
        type: String
    },
    status: { 
        type: String, 
        enum: ['waiting', 'pending', 'approved', 'rejected', 'skipped', 'escalated'],
        default: 'waiting',
        index: true
    },
    actioned_at: { 
        type: Date 
    },
    actioned_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    comments: { 
        type: String 
    },
    notified_at: { 
        type: Date 
    },
    reminder_sent_at: { 
        type: Date 
    },
    due_at: { 
        type: Date 
    }
}, { _id: false });

const approvalRequestSchema = new mongoose.Schema({
    tenant_id: { 
        type: String, 
        required: true,
        index: true,
        default: 'default'
    },
    document_type: { 
        type: String, 
        required: true,
        index: true
    },
    document_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        index: true
    },
    document_number: { 
        type: String,
        trim: true,
        index: true
    },
    document_data: {
        type: mongoose.Schema.Types.Mixed
    },
    requested_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true
    },
    requested_by_name: {
        type: String
    },
    workflow_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ApprovalWorkflow',
        required: true
    },
    workflow_name: {
        type: String
    },
    current_step: { 
        type: Number, 
        default: 1,
        min: 0
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
        default: 'pending',
        index: true
    },
    steps: [approvalStepSchema],
    final_actioned_at: { 
        type: Date 
    },
    final_actioned_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    rejection_reason: { 
        type: String 
    },
    cancellation_reason: {
        type: String
    },
    cancelled_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    cancelled_at: {
        type: Date
    },
    // Audit trail
    history: [{
        action: { 
            type: String, 
            enum: ['submitted', 'approved', 'rejected', 'cancelled', 'escalated', 'reminded']
        },
        step_number: Number,
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        user_name: String,
        comments: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Indexes
approvalRequestSchema.index({ tenant_id: 1, createdAt: -1 });
approvalRequestSchema.index({ tenant_id: 1, status: 1 });
approvalRequestSchema.index({ tenant_id: 1, document_type: 1, document_id: 1 });
approvalRequestSchema.index({ tenant_id: 1, requested_by: 1, status: 1 });
approvalRequestSchema.index({ 'steps.approver_id': 1, 'steps.status': 1 });

// Get current step details
approvalRequestSchema.methods.getCurrentStep = function() {
    return this.steps.find(s => s.step_number === this.current_step);
};

// Get pending approvers
approvalRequestSchema.methods.getPendingApprovers = function() {
    return this.steps
        .filter(s => s.status === 'pending' || s.status === 'waiting')
        .map(s => s.approver_id);
};

// Check if user can approve current step
approvalRequestSchema.methods.canUserApprove = function(userId) {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return false;
    
    return currentStep.approver_id.toString() === userId.toString() && 
           currentStep.status === 'pending';
};

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
