const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    
    reference_type: {
        type: String,
        enum: ['employee', 'invoice', 'expense', 'purchase_order', 'grn', 'vendor', 'customer', 'quotation'],
        required: true
    },
    reference_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    
    document_type: String, // e.g. 'passport', 'visa', 'emirates_id', 'labor_card', 'invoice_pdf', 'receipt', 'po_document', 'delivery_note'
    
    original_name: String,         // original filename user uploaded
    stored_name: String,           // UUID filename on disk
    file_path: String,             // relative path from UPLOAD_ROOT
                                   // e.g. "tenant123/hr/employees/emp456/documents/uuid.pdf"
    file_size: Number,             // bytes
    mime_type: String,
    
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploaded_at: { type: Date, default: Date.now },
    
    expiry_date: Date,             // for passport, visa expiry tracking
    
    is_deleted: { type: Boolean, default: false },
    deleted_at: Date,
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes for efficient queries
attachmentSchema.index({ tenant_id: 1, reference_type: 1, reference_id: 1 });
attachmentSchema.index({ tenant_id: 1, document_type: 1, expiry_date: 1 });
attachmentSchema.index({ is_deleted: 1, deleted_at: 1 });

const Attachment = mongoose.models.Attachment || mongoose.model('Attachment', attachmentSchema);

module.exports = Attachment;
