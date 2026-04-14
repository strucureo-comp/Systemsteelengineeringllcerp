const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    tenant_id: { 
        type: String, 
        required: true,
        index: true,
        default: 'default'
    },
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true
    },
    type: { 
        type: String, 
        required: true,
        enum: [
            'approval_requested',
            'approval_approved',
            'approval_rejected',
            'approval_cancelled',
            'approval_escalated',
            'approval_reminder',
            'leave_approved',
            'leave_rejected',
            'payroll_processed',
            'invoice_overdue',
            'po_delivery_due',
            'document_expiring',
            'system_alert'
        ],
        index: true
    },
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    message: { 
        type: String, 
        required: true
    },
    reference_type: { 
        type: String,
        enum: [
            'approval_request',
            'purchase_order',
            'bill',
            'invoice',
            'leave',
            'payroll',
            'journal_entry',
            'quotation',
            'expense',
            'employee',
            'project'
        ]
    },
    reference_id: { 
        type: mongoose.Schema.Types.ObjectId 
    },
    reference_number: {
        type: String
    },
    action_url: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    },
    read: { 
        type: Boolean, 
        default: false,
        index: true
    },
    read_at: { 
        type: Date 
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

// Indexes
notificationSchema.index({ tenant_id: 1, createdAt: -1 });
notificationSchema.index({ tenant_id: 1, user_id: 1, read: 1 });
notificationSchema.index({ tenant_id: 1, user_id: 1, type: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

// Mark as read
notificationSchema.methods.markAsRead = async function() {
    this.read = true;
    this.read_at = new Date();
    return await this.save();
};

// Static method to mark multiple as read
notificationSchema.statics.markAllAsRead = async function(tenant_id, user_id) {
    return await this.updateMany(
        { tenant_id, user_id, read: false },
        { read: true, read_at: new Date() }
    );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(tenant_id, user_id) {
    return await this.countDocuments({ tenant_id, user_id, read: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
