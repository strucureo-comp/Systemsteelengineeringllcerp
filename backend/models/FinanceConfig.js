const mongoose = require('mongoose');

const FinanceConfigSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    baseCurrency: {
        type: String,
        required: true,
        default: 'USD'
    },
    fiscalYearStart: {
        type: String,
        required: true,
        default: '1'
    },
    accountingMethod: {
        type: String,
        enum: ['accrual', 'cash'],
        default: 'accrual'
    },
    selectedCountry: {
        type: String,
        required: true,
        default: 'US'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for tenant uniqueness
FinanceConfigSchema.index({ tenant_id: 1 }, { unique: true });

module.exports = mongoose.model('FinanceConfig', FinanceConfigSchema);
