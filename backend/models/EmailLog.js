const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL LOG MODEL
// Tracks all emails sent from the system for audit and debugging
// ═══════════════════════════════════════════════════════════════════════════

const emailLogSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    to: { type: String, required: true }, // Recipient email(s)
    cc: { type: String }, // CC recipients
    bcc: { type: String }, // BCC recipients
    subject: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['sent', 'failed', 'pending'], 
        default: 'pending',
        index: true
    },
    message_id: { type: String }, // SMTP message ID
    error: { type: String }, // Error message if failed
    
    // Reference to source document
    reference_type: { type: String }, // 'invoice', 'leave', 'payroll', etc.
    reference_id: { type: mongoose.Schema.Types.ObjectId }, // Document ID
    
    sent_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sent_at: { type: Date, default: Date.now, index: true },
    
    // Retry tracking
    retry_count: { type: Number, default: 0 },
    last_retry_at: { type: Date },
}, { timestamps: true });

// Compound indexes for efficient queries
emailLogSchema.index({ tenant_id: 1, sent_at: -1 });
emailLogSchema.index({ tenant_id: 1, status: 1, sent_at: -1 });
emailLogSchema.index({ tenant_id: 1, reference_type: 1, reference_id: 1 });

const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
