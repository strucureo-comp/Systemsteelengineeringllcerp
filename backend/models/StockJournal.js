const mongoose = require('mongoose');

// ── STOCK JOURNAL ───────────────────────────────────────────────────────────
const stockJournalSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    type: {
        type: String,
        enum: ['adjustment', 'transfer', 'count', 'damage', 'obsolete', 'revaluation'],
        required: true
    },
    reference: String,
    reason: String,
    posting_status: { type: String, enum: ['draft', 'posted', 'voided'], default: 'draft' },
    total_value: { type: Number, default: 0 },
    valuation_method: {
        type: String,
        enum: ['fifo', 'lifo', 'weighted_average', 'standard_cost'],
        default: 'standard_cost'
    },
    lines: [{
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        from_location: String,
        to_location: String,
        quantity: { type: Number, required: true },
        unit_cost: { type: Number, required: true },
        total_cost: { type: Number, required: true }
    }],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
}, { timestamps: true });

const StockJournal = mongoose.models.StockJournal || mongoose.model('StockJournal', stockJournalSchema);

module.exports = {
    StockJournal
};
