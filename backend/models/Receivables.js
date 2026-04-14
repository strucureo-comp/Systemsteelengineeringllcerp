const mongoose = require('mongoose');

// ── CUSTOMER MASTER ──────────────────────────────────────────────────────────
const customerSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    customer_id: { type: String, required: true, unique: true },
    legal_name: { type: String, required: true },
    trade_name: { type: String },
    trade_license_no: { type: String },
    tax_registration_no: { type: String }, // VAT/TRN
    credit_terms: { type: String, default: 'Net 30' },
    default_currency: { type: String, default: 'AED' },
    credit_limit: { type: Number, default: 0 },
    risk_rating: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    risk_score: { type: Number, default: 0 }, // System calculated 0-100

    // Contact Info
    contact_person: { type: String },
    email: { type: String },
    phone: { type: String },

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
    receivable_gl_account: { type: String, default: '1100' }, // Accounts Receivable
    revenue_gl_account: { type: String, default: '4000' },    // Sales Revenue
    advance_gl_account: { type: String, default: '2200' },    // Unapplied Cash/Advances

    is_active: { type: Boolean, default: true },
    notes: String,
}, { timestamps: true });

// ── INVOICE ENGINE (Enterprise Standard) ──────────────────────────────────
const invoiceLineSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 0 },
    tax_code: { type: String }, // Reference to Tax Center
    revenue_gl_account: { type: String },
    project_id: { type: String },
    cost_center: { type: String },
    amount: { type: Number, required: true }, // Net amount before tax
    tax_amount: { type: Number, default: 0 },
    total: { type: Number, required: true },  // net + tax
});

const invoiceSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    invoice_number: { type: String, required: true, unique: true },
    customer_id: { type: String, required: true, index: true },
    customer_name: { type: String },

    invoice_date: { type: Date, default: Date.now },
    posting_date: { type: Date },
    due_date: { type: Date },

    // Multi-currency fields
    currency: { type: String, default: 'AED' },
    exchange_rate: { type: Number, default: 1 }, // Rate at time of invoice
    exchange_rate_date: { type: Date }, // Date rate was locked

    lines: [invoiceLineSchema],

    // Amounts in invoice currency
    subtotal: { type: Number, default: 0 },
    tax_total: { type: Number, default: 0 },
    discount_total: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    balance_due: { type: Number, default: 0 },

    // Base currency equivalents (for GL posting)
    subtotal_base: { type: Number, default: 0 },
    tax_total_base: { type: Number, default: 0 },
    total_amount_base: { type: Number, default: 0 },
    balance_due_base: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['draft', 'approved', 'sent', 'partial', 'paid', 'overdue', 'written_off', 'cancelled'],
        default: 'draft'
    },

    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: String,
    approved_at: Date,

    attachment_url: String,
    internal_notes: String,
    customer_notes: String,

    project_id: String,
    cost_center: String,

    journal_entry_id: String, // Link to posted Journal Entry
}, { timestamps: true });

// ── PAYMENT / RECEIPT ALLOCATION ──────────────────────────────────────────────
const paymentAllocationSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    payment_id: { type: String, required: true, index: true },
    invoice_id: { type: String, required: true, index: true },
    amount_allocated: { type: Number, required: true },
    allocation_date: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    receipt_number: { type: String, required: true, unique: true },
    customer_id: { type: String, required: true, index: true },
    payment_date: { type: Date, default: Date.now },
    payment_method: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'card'], default: 'bank_transfer' },
    reference_no: { type: String }, // GTN/Cheque No

    // Multi-currency fields
    currency: { type: String, default: 'AED' },
    exchange_rate: { type: Number, default: 1 }, // Rate at time of payment
    exchange_rate_date: { type: Date },
    
    // Amounts in payment currency
    amount_received: { type: Number, required: true },
    amount_applied: { type: Number, default: 0 },
    unapplied_balance: { type: Number, default: 0 },

    // Base currency equivalents
    amount_received_base: { type: Number, default: 0 },
    amount_applied_base: { type: Number, default: 0 },
    unapplied_balance_base: { type: Number, default: 0 },

    bank_account_id: { type: String }, // Link to Banking Module
    gl_account: { type: String, default: '1000' }, // Dr Bank/Cash

    status: { type: String, enum: ['draft', 'posted', 'cancelled'], default: 'draft' },
    journal_entry_id: String,
}, { timestamps: true });

// ── CREDIT NOTE ──────────────────────────────────────────────────────────────
const creditNoteSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    credit_note_number: { type: String, required: true, unique: true },
    customer_id: { type: String, required: true },
    original_invoice_id: { type: String }, // Linked invoice

    date: { type: Date, default: Date.now },
    reason_code: { type: String, enum: ['pricing_adjustment', 'return', 'service_issue', 'other'] },

    lines: [invoiceLineSchema],
    total_amount: { type: Number, required: true },

    status: { type: String, enum: ['draft', 'approved', 'applied', 'cancelled'], default: 'draft' },
    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

    journal_entry_id: String,
}, { timestamps: true });

// ── WRITE-OFF & PROVISIONS ──────────────────────────────────────────────────
const writeOffSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    writeoff_number: { type: String, unique: true },
    customer_id: { type: String, required: true },
    invoice_id: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: String,
    approved_by: String,
    status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    journal_entry_id: String,
}, { timestamps: true });

const provisionSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    period: { type: String, required: true }, // e.g. "2026-Q1"
    as_of_date: { type: Date, required: true },
    total_receivable: { type: Number },
    provision_amount: { type: Number },
    method: { type: String, enum: ['percentage', 'aging_matrix', 'specific'] },
    status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
    journal_entry_id: String,
}, { timestamps: true });

// ── AGING SNAPSHOT ──────────────────────────────────────────────────────────
const agingSnapshotSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    snapshot_date: { type: Date, default: Date.now },
    customer_id: { type: String },
    customer_name: { type: String },
    bucket_current: { type: Number, default: 0 },
    bucket_1_30: { type: Number, default: 0 },
    bucket_31_60: { type: Number, default: 0 },
    bucket_61_90: { type: Number, default: 0 },
    bucket_90_plus: { type: Number, default: 0 },
    total_balance: { type: Number, default: 0 },
    overdue_balance: { type: Number, default: 0 },
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const InvoiceAR = mongoose.models.InvoiceAR || mongoose.model('InvoiceAR', invoiceSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
const PaymentAllocation = mongoose.models.PaymentAllocation || mongoose.model('PaymentAllocation', paymentAllocationSchema);
const CreditNote = mongoose.models.CreditNote || mongoose.model('CreditNote', creditNoteSchema);
const WriteOff = mongoose.models.WriteOff || mongoose.model('WriteOff', writeOffSchema);
const Provision = mongoose.models.Provision || mongoose.model('Provision', provisionSchema);
const AgingSnapshot = mongoose.models.AgingSnapshot || mongoose.model('AgingSnapshot', agingSnapshotSchema);

module.exports = {
    Customer,
    InvoiceAR,
    Payment,
    PaymentAllocation,
    CreditNote,
    WriteOff,
    Provision,
    AgingSnapshot
};
