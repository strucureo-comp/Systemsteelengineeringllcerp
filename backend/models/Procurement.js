const mongoose = require('mongoose');

// ── PURCHASE REQUEST ─────────────────────────────────────────────────────────
const purchaseRequestSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    item_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'pcs' },
    estimated_cost: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
        type: String,
        enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
        default: 'pending'
    },
    requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    project_id: { type: String }, // Optional link to project
    needed_by: Date,
    notes: String
}, { timestamps: true });

// ── PURCHASE ORDER ───────────────────────────────────────────────────────────
const purchaseOrderSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    po_number: { type: String, required: true, unique: true },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    total_amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'issued', 'partially_received', 'received', 'closed', 'cancelled'],
        default: 'pending'
    },
    delivery_address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zip: String
    },
    lines: [{
        description: String,
        quantity: Number,
        unit_price: Number,
        amount: Number,
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        delivery_date: Date,
        grn_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
        bill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }
    }],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    delivery_date: Date,
    terms: String,
    payment_terms: String,
    due_date: Date
}, { timestamps: true });

// ── RFQ (REQUEST FOR QUOTATION) ──────────────────────────────────────────────
const rfqSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    rfq_number: { type: String, required: true, unique: true },
    purchase_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest' },
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    status: {
        type: String,
        enum: ['draft', 'sent', 'received', 'closed', 'cancelled'],
        default: 'draft'
    },
    items: [{
        description: String,
        quantity: Number,
        unit: String
    }],
    expiry_date: Date,
    notes: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── GRN (GOODS RECEIVED NOTE) ────────────────────────────────────────────────
const grnSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    grn_number: { type: String, required: true, unique: true },
    purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    received_date: { type: Date, default: Date.now },
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity_received: Number,
        location_id: String // Warehouse location
    }],
    notes: String
}, { timestamps: true });

const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', purchaseRequestSchema);
const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);
const GRN = mongoose.models.GRN || mongoose.model('GRN', grnSchema);
const RFQ = mongoose.models.RFQ || mongoose.model('RFQ', rfqSchema);

module.exports = {
    PurchaseRequest,
    PurchaseOrder,
    GRN,
    RFQ
};
