const mongoose = require('mongoose');

const ApprovalConfigSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    module: {
        type: String,
        required: true,
        enum: ['sales', 'purchase', 'hr', 'finance']
    },
    documentType: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        default: false
    },
    approverRole: {
        type: String,
        default: ''
    },
    threshold: {
        type: Number,
        default: 0
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for tenant + module + documentType uniqueness
ApprovalConfigSchema.index({ tenant_id: 1, module: 1, documentType: 1 }, { unique: true });

module.exports = mongoose.model('ApprovalConfig', ApprovalConfigSchema);
