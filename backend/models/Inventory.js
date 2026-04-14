const mongoose = require('mongoose');

// ── ITEM MASTER (SKU CATALOG) ────────────────────────────────────────────────
const itemSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    category: String,
    status: { type: String, enum: ['active', 'discontinued', 'planning'], default: 'active' },

    // UOM (Unit of Measure)
    uom_base: { type: String, required: true, default: 'pcs' },
    uom_alternate: String,
    conversion_factor: { type: Number, default: 1 },

    // Costing & Valuation
    valuation_method: { type: String, enum: ['FIFO', 'WAC', 'Standard'], default: 'FIFO' },
    standard_cost: { type: Number, default: 0 },
    last_purchase_price: { type: Number, default: 0 },

    // Planning
    reorder_level: { type: Number, default: 0 },
    safety_stock: { type: Number, default: 0 },
    lead_time_days: { type: Number, default: 7 },
    min_stock: { type: Number, default: 0 },
    max_stock: { type: Number, default: 0 },
    preferred_vendor: String,

    // Physical
    barcode: String,
    qr_code: String,
    storage_location: String, // Default location
    is_serial_tracked: { type: Boolean, default: false },
    is_batch_tracked: { type: Boolean, default: false },

    // Financial Mapping
    inventory_gl_account: String,
    cogs_gl_account: String,
    revenue_gl_account: String,
}, { timestamps: true });

// ── WAREHOUSE & LOCATIONS ────────────────────────────────────────────────────
const warehouseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['central', 'site', 'transit', 'vendor'], default: 'central' },
    address: String,
    is_active: { type: Boolean, default: true },
    locations: [{
        label: String, // Bin / Rack
        zone: String,
        capacity: Number
    }]
}, { timestamps: true });

// ── STOCK BALANCES (REAL-TIME SNAPSHOT) ──────────────────────────────────────
const stockBalanceSchema = new mongoose.Schema({
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    on_hand: { type: Number, default: 0 },
    allocated: { type: Number, default: 0 },
    available: { type: Number, default: 0 }, // on_hand - allocated
    reserved: { type: Number, default: 0 },
    wac_cost: { type: Number, default: 0 }, // Weighted Average Cost for this warehouse
}, { timestamps: true });

// ── INVENTORY TRANSACTIONS (THE LEDGER) ──────────────────────────────────────
const inventoryTransactionSchema = new mongoose.Schema({
    transaction_id: { type: String, required: true, unique: true },
    type: {
        type: String,
        enum: ['GRN', 'issue_to_site', 'issue_to_production', 'transfer', 'adjustment', 'waste', 'sale', 'return_to_vendor', 'return_from_customer'],
        required: true
    },
    reference_no: String, // Invoice #, PO #, etc.
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },

    source_warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    destination_warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

    quantity: { type: Number, required: true }, // Positive for inflow, negative for outflow
    uom: String,

    // Financials at time of transaction
    unit_cost: { type: Number, required: true },
    total_value: { type: Number, required: true },
    currency: { type: String, default: 'AED' },

    // COGS Data
    is_cogs_recognized: { type: Boolean, default: false },
    journal_entry_id: String,

    posted_by: String,
    posted_at: { type: Date, default: Date.now },
    metadata: Object // Serial numbers, Batch numbers, etc.
}, { timestamps: true });

// ── COST LAYERS (FOR FIFO) ───────────────────────────────────────────────────
const costLayerSchema = new mongoose.Schema({
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    original_qty: { type: Number, required: true },
    remaining_qty: { type: Number, required: true },
    unit_cost: { type: Number, required: true },
    received_date: { type: Date, required: true },
    transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' },
    is_exhausted: { type: Boolean, default: false }
}, { timestamps: true });

// ── MODULAR EXPORTS ──────────────────────────────────────────────────────────
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
const StockBalance = mongoose.models.StockBalance || mongoose.model('StockBalance', stockBalanceSchema);
const InventoryTransaction = mongoose.models.InventoryTransaction || mongoose.model('InventoryTransaction', inventoryTransactionSchema);
const CostLayer = mongoose.models.CostLayer || mongoose.model('CostLayer', costLayerSchema);

module.exports = {
    Item,
    Warehouse,
    StockBalance,
    InventoryTransaction,
    CostLayer
};
