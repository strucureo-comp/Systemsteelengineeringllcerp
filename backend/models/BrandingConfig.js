const mongoose = require('mongoose');

const BrandingConfigSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    logo: {
        type: String,  // Base64 data URL or S3 URL
        default: null
    },
    primaryColor: {
        type: String,
        default: '#0F172A'
    },
    accentColor: {
        type: String,
        default: '#10B981'
    },
    footerText: {
        type: String,
        default: ''
    },
    favicon: {
        type: String,  // Base64 data URL or S3 URL
        default: null
    },
    authorizedSignature: {
        type: String,  // Base64 data URL
        default: null
    },
    acknowledgementTitle: {
        type: String,
        default: 'RECEIVER ACKNOWLEDGEMENT'
    },
    acknowledgementSignatureLabel: {
        type: String,
        default: 'SIGNATURE / COMPANY STAMP'
    },
    acknowledgementNameLabel: {
        type: String,
        default: 'NAME'
    },
    acknowledgementDateLabel: {
        type: String,
        default: 'DATE & TIME'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for tenant uniqueness
BrandingConfigSchema.index({ tenant_id: 1 }, { unique: true });

module.exports = mongoose.model('BrandingConfig', BrandingConfigSchema);
