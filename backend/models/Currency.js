const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════
// CURRENCY MODEL
// ═══════════════════════════════════════════════════════════════════════════

const currencySchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    code: { 
        type: String, 
        required: true, 
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 3
    }, // 'USD', 'EUR', 'AED', 'GBP', etc.
    name: { 
        type: String, 
        required: true 
    }, // 'US Dollar', 'Euro', 'UAE Dirham'
    symbol: { 
        type: String, 
        required: true 
    }, // '$', '€', 'AED', '£'
    decimal_places: { 
        type: Number, 
        default: 2,
        min: 0,
        max: 4
    },
    is_base_currency: { 
        type: Boolean, 
        default: false 
    },
    is_active: { 
        type: Boolean, 
        default: true 
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Compound index to ensure unique currency codes per tenant
currencySchema.index({ tenant_id: 1, code: 1 }, { unique: true });

// Ensure only one base currency per tenant
currencySchema.pre('save', async function(next) {
    if (this.is_base_currency && this.isModified('is_base_currency')) {
        // Unset other base currencies for this tenant
        await this.constructor.updateMany(
            { 
                tenant_id: this.tenant_id, 
                _id: { $ne: this._id },
                is_base_currency: true 
            },
            { is_base_currency: false }
        );
    }
    next();
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);

module.exports = Currency;
