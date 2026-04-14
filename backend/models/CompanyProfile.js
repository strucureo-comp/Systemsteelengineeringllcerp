const mongoose = require('mongoose');

const CompanyProfileSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    businessType: {
        type: String,
        enum: ['manufacturing', 'services', 'retail', 'construction', 'consulting', 'logistics'],
        default: 'services'
    },
    companySize: {
        type: String,
        enum: ['startup', 'smb', 'enterprise'],
        default: 'startup'
    },
    country: {
        type: String,
        required: true,
        default: 'US'
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    website: {
        type: String,
        trim: true
    },
    taxId: {
        type: String,
        trim: true
    },
    baseCurrency: {
        type: String,
        default: 'USD'
    },
    fiscalYearStart: {
        type: String,
        default: '1'
    },
    defaultTaxName: {
        type: String,
        default: 'Sales Tax'
    },
    defaultTaxRate: {
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

// Compound index for tenant uniqueness
CompanyProfileSchema.index({ tenant_id: 1 }, { unique: true });

module.exports = mongoose.model('CompanyProfile', CompanyProfileSchema);
