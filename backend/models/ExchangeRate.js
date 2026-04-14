const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════
// EXCHANGE RATE MODEL
// ═══════════════════════════════════════════════════════════════════════════

const exchangeRateSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    from_currency: { 
        type: String, 
        required: true,
        uppercase: true,
        trim: true
    }, // Always the base currency (e.g., 'AED')
    to_currency: { 
        type: String, 
        required: true,
        uppercase: true,
        trim: true
    }, // Target currency (e.g., 'USD', 'EUR')
    rate: { 
        type: Number, 
        required: true,
        min: 0.000001
    }, // How many to_currency units = 1 from_currency unit
    effective_date: { 
        type: Date, 
        required: true,
        index: true
    }, // Date this rate becomes effective
    source: { 
        type: String, 
        default: 'manual',
        enum: ['manual', 'api', 'import']
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
}, { timestamps: true });

// Compound indexes for efficient lookups
exchangeRateSchema.index({ tenant_id: 1, to_currency: 1, effective_date: -1 });
exchangeRateSchema.index({ tenant_id: 1, from_currency: 1, to_currency: 1, effective_date: -1 });

// Prevent duplicate rates for same currency pair on same date
exchangeRateSchema.index(
    { tenant_id: 1, from_currency: 1, to_currency: 1, effective_date: 1 }, 
    { unique: true }
);

// Validation: Cannot set rate for same currency
exchangeRateSchema.pre('save', function(next) {
    if (this.from_currency === this.to_currency) {
        return next(new Error('Cannot set exchange rate for same currency'));
    }
    next();
});

const ExchangeRate = mongoose.models.ExchangeRate || mongoose.model('ExchangeRate', exchangeRateSchema);

module.exports = ExchangeRate;
