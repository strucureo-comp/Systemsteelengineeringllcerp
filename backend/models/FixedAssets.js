const mongoose = require('mongoose');

// ── FIXED ASSET ─────────────────────────────────────────────────────────────
const fixedAssetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    asset_number: { type: String, required: true, unique: true },
    purchase_date: { type: Date, required: true },
    purchase_cost: { type: Number, required: true },
    salvage_value: { type: Number, default: 0 },
    useful_life_years: { type: Number, required: true },
    accumulated_depreciation: { type: Number, default: 0 },
    current_book_value: { type: Number, required: true },
    status: {
        type: String,
        enum: ['active', 'disposed', 'written_off'],
        default: 'active'
    },
    location: String,
    serial_number: String,
    asset_account_id: String,
    depreciation_account_id: String,
    expense_account_id: String
}, { timestamps: true });

const FixedAsset = mongoose.models.FixedAsset || mongoose.model('FixedAsset', fixedAssetSchema);

module.exports = {
    FixedAsset
};
