const mongoose = require('mongoose');

const TaxConfigurationSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    taxId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    type: {
        type: String,
        enum: ['sales', 'purchase', 'both'],
        default: 'both'
    },
    enabled: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isCompound: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        trim: true
    },
    countryCode: {
        type: String,
        trim: true
    },
    isCustom: {
        type: Boolean,
        default: false
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for tenant + taxId uniqueness
TaxConfigurationSchema.index({ tenant_id: 1, taxId: 1 }, { unique: true });

module.exports = mongoose.model('TaxConfiguration', TaxConfigurationSchema);
