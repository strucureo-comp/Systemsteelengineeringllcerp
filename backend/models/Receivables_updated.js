const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

// ── CUSTOMER MASTER ──────────────────────────────────────────────────────────
const customerSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default', required: true },
    customer_id: { type: String, required: true, trim: true, uppercase: true },
    legal_name: { type: String, required: true, trim: true },
    trade_name: { type: String, trim: true },
    trade_license_no: { type: String, trim: true },
    tax_registration_no: { type: String, trim: true },
    credit_terms: { type: String, default: 'Net 30' },
    default_currency: { type: String, default: 'AED' },
    credit_limit: { type: Number, default: 0, min: 0 },
    risk_rating: { type: String, enum: ['low', 'medium', 'high'], default: 'low', index: true },
    risk_score: { type: Number, default: 0, min: 0, max: 100 },

    // Contact Info
    contact_person: { type: String, trim: true },
    email: { 
        type: String, 
        lowercase: true, 
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Invalid email format']
    },
    phone: { 
        type: String, 
        trim: true,
        match: [/^[+]?[\d\s-]{7,15}$/, 'Invalid phone number']
    },

    // Addresses
    billing_address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zip: String
    },
    shipping_address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zip: String
    },

    // GL Mapping
    receivable_gl_account: { type: String, default: '1100' },
    revenue_gl_account: { type: String, default: '4000' },
    advance_gl_account: { type: String, default: '2200' },

    is_active: { type: Boolean, default: true, index: true },
    notes: String,
}, { timestamps: true });

// Indexes
customerSchema.index({ tenant_id: 1, createdAt: -1 });
customerSchema.index({ tenant_id: 1, customer_id: 1 }, { unique: true });
customerSchema.index({ tenant_id: 1, legal_name: 1 });
customerSchema.index({ tenant_id: 1, is_active: 1 });
customerSchema.index({ tenant_id: 1, risk_rating: 1 });
customerSchema.plugin(softDeletePlugin);

// ── INVOICE ENGINE (Enterprise Standard) ──────────────────────────────────
const invoiceLineSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit_price: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax_rate: { type: Number, default: 0, min: 0, max: 100 },
    tax_code: { type: String },
    revenue_gl_account: { type: String },
    project_id: { type: String },
    cost_center: { type: String },
    amount: { type: Number, required: true, min: 0 },
    tax_amount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
});

const invoiceSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default', required: true },
    invoice_number: { type: String, required: true },
    customer_id: { type: String, required: true, index: true },
    customer_name: { type: String, trim: true },

    invoice_date: { type: Date, default: Date.now, index: true },
    posting_date: { type: Date, index: true },
    due_date: { type: Date, index: true },

    currency: { type: String, default: 'AED' },
    exchange_rate: { type: Number, default: 1, min: 0 },

    lines: [invoiceLineSchema],

    subtotal: { type: Number, default: 0, min: 0 },
    tax_total: { type: Number, default: 0, min: 0 },
    discount_total: { type: Number, default: 0, min: 0 },
    total_amount: { type: Number, default: 0, min: 0 },
    balance_due: { type: Number, default: 0, min: 0 },

    status: {
        type: String,
        enum: ['draft', 'approved', 'sent', 'partial', 'paid', 'overdue', 'written_off', 'cancelled'],
        default: 'draft',
        index: true
    },

    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: String,
    approved_at: Date,

    attachment_url: String,
    internal_notes: String,
    customer_notes: String,

    project_id: String,
    cost_center: String,

    journal_entry_id: String,
}, { timestamps: true });

// Indexes
invoiceSchema.index({ tenant_id: 1, createdAt: -1 });
invoiceSchema.index({ tenant_id: 1, invoice_number: 1 }, { unique: true });
invoiceSchema.index({ tenant_id: 1, customer_id: 1, status: 1 });
invoiceSchema.index({ tenant_id: 1, status: 1 });
invoiceSchema.index({ tenant_id: 1, due_date: 1 });
invoiceSchema.index({ tenant_id: 1, invoice_date: -1 });

// NOTE: Invoices should NEVER be hard deleted - use status: 'cancelled' instead

// ── PAYMENT / RECEIPT ALLOCATION ──────────────────────────────────────────────
const paymentAllocationSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default', required: true },
    payment_id: { type: String, required: true, index: true },
    invoice_id: { type: String, required: true, index: true },
    amount_allocated: { type: Number, required: true, min: 0.01 },
    allocation_date: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// Indexes
paymentAllocationSchema.index({ tenant_id: 1, payment_id: 1, invoice_id: 1 }, { unique: true });
paymentAllocationSchema.index({ tenant_id: 1, createdAt: -1 });

const paymentSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default', required: true },
    receipt_number: { type: String, required: true },
    customer_id: { type: String, required: true, index: true },
    payment_date: { type: Date, default: Date.now, index: true },
    payment_method: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'card'], default: 'bank_transfer' },
    reference_no: { type: String, trim: true },

    currency: { type: String, default: 'AED' },
    amount_received: { type: Number, required: true, min: 0.01 },
    amount_applied: { type: Number, default: 0, min: 0 },
    unapplied_balance: { type: Number, default: 0, min: 0 },

    bank_account_id: { type: String },
    gl_account: { type: String, default: '1000' },

    status: { type: String, enum: ['draft', 'posted', 'cancelled'], default: 'draft', index: true },
    journal_entry_id: String,
}, { timestamps: true });

// Indexes
paymentSchema.index({ tenant_id: 1, createdAt: -1 });
paymentSchema.index({ tenant_id: 1, receipt_number: 1 }, { unique: true });
paymentSchema.index({ tenant_id: 1, customer_id: 1 });
paymentSchema.index({ tenant_id: 1, status: 1 });
paymentSchema.index({ tenant_id: 1, payment_date: -1 });

// NOTE: Payments should NEVER be hard deleted - use status: 'cancelled' instead

// ── CREDIT NOTE ──────────────────────────────────────────────────────────────
const creditNoteSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default', required: true },
    credit_note_number: { type: String, required: true },
    customer_id: { type: String, required: true, index: true },
    original_invoice_id: { type: String },

    date: { type: Date, default: Date.now, index: true },
    reason_code: { type: String, enum: ['pricing_adjustment', 'return', 'service_issue', 'other'] },

    lines: [invoiceLineSchema],
    total_amount: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ['draft', 'approved', 'applied', 'cancelled'], default: 'draft', index: true },
    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

    journal_entry_id: String,
}, { timestamps: true });

// Indexes
creditNoteSchema.index({ tenant_id: 1, createdAt: -1 });
creditNoteSchema.index({ tenant_id: 1, credit_note_number: 1 }, { unique: true });
creditNoteSchema.index({ tenant_id: 1, customer_id: 1 });
creditNoteSchema.index({ tenant_id: 1, status: 1 });

// NOTE: Credit Notes should NEVER be hard deleted - use status: 'cancelled' instead

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const InvoiceAR = mongoose.models.InvoiceAR || mongoose.model('InvoiceAR', invoiceSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
const PaymentAllocation = mongoose.models.PaymentAllocation || mongoose.model('PaymentAllocation', paymentAllocationSchema);
const CreditNote = mongoose.models.CreditNote || mongoose.model('CreditNote', creditNoteSchema);

module.exports = {
    Customer,
    InvoiceAR,
    Payment,
    PaymentAllocation,
    CreditNote
};
