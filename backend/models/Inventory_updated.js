const mongoose = require('mongoose');

// ── ITEM MASTER (SKU CATALOG) ────────────────────────────────────────────────
const itemSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    sku: { type: String, required: true },
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

    // Planning & Reorder
    reorder_point: { type: Number, default: 0 },  // Renamed from reorder_level for consistency
    reorder_qty: { type: Number, default: 0 },
    safety_stock: { type: Number, default: 0 },
    lead_time_days: { type: Number, default: 7 },
    min_stock: { type: Number, default: 0 },
    max_stock: { type: Number, default: 0 },
    preferred_vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

    // Physical
    barcode: String,
    qr_code: String,
    storage_location: String,
    is_serial_tracked: { type: Boolean, default: false },
    is_batch_tracked: { type: Boolean, default: false },

    // Financial Mapping (GL Accounts)
    inventory_account: { type: String, default: '1200' },  // Asset account
    cogs_account: { type: String, default: '5000' },       // Expense account
    revenue_account: { type: String, default: '4000' },    // Revenue account

    // Soft delete
    deleted: { type: Boolean, default: false },
    deleted_at: Date,
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound unique index for tenant + sku
itemSchema.index({ tenant_id: 1, sku: 1 }, { unique: true });
itemSchema.index({ tenant_id: 1, status: 1 });
itemSchema.index({ tenant_id: 1, category: 1 });

// ── WAREHOUSE & LOCATIONS ────────────────────────────────────────────────────
const warehouseSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['central', 'site', 'transit', 'vendor'], default: 'central' },
    address: String,
    is_active: { type: Boolean, default: true },
    locations: [{
        label: String,
        zone: String,
        capacity: Number
    }],
    
    // Soft delete
    deleted: { type: Boolean, default: false },
    deleted_at: Date,
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

warehouseSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
warehouseSchema.index({ tenant_id: 1, is_active: 1 });

// ── STOCK BALANCES (REAL-TIME SNAPSHOT) ──────────────────────────────────────
const stockBalanceSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    
    // Stock quantities
    on_hand: { type: Number, default: 0, min: 0 },        // Physical stock
    allocated: { type: Number, default: 0, min: 0 },      // Reserved for sales orders
    available: { type: Number, default: 0 },              // on_hand - allocated (can be negative if oversold)
    in_transit: { type: Number, default: 0, min: 0 },     // Stock being transferred
    
    // Costing
    wac_cost: { type: Number, default: 0 },               // Weighted Average Cost
    total_value: { type: Number, default: 0 },            // on_hand × wac_cost
    
    // Metadata
    last_updated: { type: Date, default: Date.now },
    last_transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' }
}, { timestamps: true });

// Compound unique index for tenant + item + warehouse
stockBalanceSchema.index({ tenant_id: 1, item_id: 1, warehouse_id: 1 }, { unique: true });
stockBalanceSchema.index({ tenant_id: 1, warehouse_id: 1 });
stockBalanceSchema.index({ tenant_id: 1, item_id: 1 });
stockBalanceSchema.index({ available: 1 }); // For low stock queries

// Virtual for available calculation (but we store it for performance)
stockBalanceSchema.pre('save', function(next) {
    this.available = this.on_hand - this.allocated;
    this.total_value = this.on_hand * this.wac_cost;
    next();
});

// ── INVENTORY TRANSACTIONS (THE LEDGER) ──────────────────────────────────────
const inventoryTransactionSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    transaction_id: { type: String, required: true },
    
    type: {
        type: String,
        enum: [
            'grn',                    // Goods Receipt Note (inbound from PO)
            'sales_issue',            // Outbound for sales
            'transfer',               // Between warehouses
            'adjustment',             // Stock count adjustment
            'return_to_vendor',       // Return to supplier
            'customer_return',        // Return from customer
            'production_issue',       // Issue to production
            'production_receipt',     // Receipt from production
            'waste',                  // Damaged/expired
            'sample'                  // Sample/demo
        ],
        required: true
    },
    
    // Item & Location
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    destination_warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // For transfers
    
    // Quantity & Costing
    qty: { type: Number, required: true },                // Positive for IN, negative for OUT
    unit_cost: { type: Number, required: true },
    total_cost: { type: Number, required: true },
    cogs_amount: { type: Number, default: 0 },            // For sales issues (from FIFO)
    
    // Reference
    reference_type: { 
        type: String, 
        enum: ['grn', 'sales_order', 'purchase_order', 'transfer', 'adjustment', 'manual'],
        required: true 
    },
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    reference_number: String,
    
    // Financial Integration
    journal_entry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    is_posted_to_finance: { type: Boolean, default: false },
    
    // Metadata
    posting_date: { type: Date, required: true, default: Date.now },
    posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String,
    
    // FIFO Layer Consumption (for sales issues)
    fifo_layers_consumed: [{
        layer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CostLayer' },
        qty_consumed: Number,
        unit_cost: Number,
        cost_amount: Number
    }]
}, { timestamps: true });

inventoryTransactionSchema.index({ tenant_id: 1, transaction_id: 1 }, { unique: true });
inventoryTransactionSchema.index({ tenant_id: 1, item_id: 1, posting_date: -1 });
inventoryTransactionSchema.index({ tenant_id: 1, warehouse_id: 1, posting_date: -1 });
inventoryTransactionSchema.index({ tenant_id: 1, type: 1, posting_date: -1 });
inventoryTransactionSchema.index({ reference_type: 1, reference_id: 1 });

// ── COST LAYERS (FOR FIFO) ───────────────────────────────────────────────────
const costLayerSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    
    // Quantities
    original_qty: { type: Number, required: true },
    remaining_qty: { type: Number, required: true },
    
    // Costing
    unit_cost: { type: Number, required: true },
    
    // Tracking
    received_date: { type: Date, required: true },
    grn_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
    transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' },
    
    // Status
    is_exhausted: { type: Boolean, default: false }
}, { timestamps: true });

costLayerSchema.index({ tenant_id: 1, item_id: 1, warehouse_id: 1, received_date: 1 });
costLayerSchema.index({ tenant_id: 1, item_id: 1, warehouse_id: 1, is_exhausted: 1 });
costLayerSchema.index({ is_exhausted: 1, remaining_qty: 1 });

// ── STOCK ADJUSTMENT ─────────────────────────────────────────────────────────
const stockAdjustmentSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    adjustment_number: { type: String, required: true },
    
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    
    // Adjustment details
    adjustment_qty: { type: Number, required: true },     // Can be positive or negative
    reason_code: { 
        type: String, 
        enum: ['damaged', 'expired', 'found', 'lost', 'opening_balance', 'count_correction', 'sample', 'other'],
        required: true 
    },
    reason_detail: String,
    
    // Before/After snapshot
    before_qty: { type: Number, required: true },
    after_qty: { type: Number, required: true },
    
    // Costing
    unit_cost: { type: Number, required: true },
    total_value_change: { type: Number, required: true },
    
    // Approval workflow
    status: { 
        type: String, 
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'posted'],
        default: 'draft'
    },
    requires_approval: { type: Boolean, default: false },
    approval_threshold: { type: Number, default: 0 },
    
    // Tracking
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: Date,
    posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posted_at: Date,
    
    // Financial Integration
    transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' },
    journal_entry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' }
}, { timestamps: true });

stockAdjustmentSchema.index({ tenant_id: 1, adjustment_number: 1 }, { unique: true });
stockAdjustmentSchema.index({ tenant_id: 1, status: 1 });
stockAdjustmentSchema.index({ tenant_id: 1, item_id: 1, createdAt: -1 });

// ── REORDER ALERT ────────────────────────────────────────────────────────────
const reorderAlertSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    
    // Alert details
    current_qty: { type: Number, required: true },
    reorder_point: { type: Number, required: true },
    reorder_qty: { type: Number, required: true },
    
    // Status
    status: { 
        type: String, 
        enum: ['active', 'acknowledged', 'po_created', 'resolved'],
        default: 'active'
    },
    
    // Linked PO
    purchase_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest' },
    purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    
    // Tracking
    acknowledged_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledged_at: Date,
    resolved_at: Date
}, { timestamps: true });

reorderAlertSchema.index({ tenant_id: 1, item_id: 1, warehouse_id: 1, status: 1 });
reorderAlertSchema.index({ tenant_id: 1, status: 1, createdAt: -1 });

// ── MODULAR EXPORTS ──────────────────────────────────────────────────────────
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
const StockBalance = mongoose.models.StockBalance || mongoose.model('StockBalance', stockBalanceSchema);
const InventoryTransaction = mongoose.models.InventoryTransaction || mongoose.model('InventoryTransaction', inventoryTransactionSchema);
const CostLayer = mongoose.models.CostLayer || mongoose.model('CostLayer', costLayerSchema);
const StockAdjustment = mongoose.models.StockAdjustment || mongoose.model('StockAdjustment', stockAdjustmentSchema);
const ReorderAlert = mongoose.models.ReorderAlert || mongoose.model('ReorderAlert', reorderAlertSchema);

module.exports = {
    Item,
    Warehouse,
    StockBalance,
    InventoryTransaction,
    CostLayer,
    StockAdjustment,
    ReorderAlert
};
