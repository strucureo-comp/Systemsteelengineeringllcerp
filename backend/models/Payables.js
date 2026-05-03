const mongoose = require('mongoose');

// ── VENDOR MASTER ──────────────────────────────────────────────────────────
const vendorSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    vendor_id: { type: String, required: true, unique: true },
    legal_name: { type: String, required: true },
    trade_name: { type: String },
    trade_license_no: { type: String },
    tax_registration_no: { type: String }, // VAT/TRN
    payment_terms: { type: String, default: 'Net 30' },
    default_currency: { type: String, default: 'AED' },
    credit_limit: { type: Number, default: 0 },
    risk_rating: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },

    // Contact Info
    contact_person: { type: String },
    email: { type: String },
    phone: { type: String },
    website: { type: String },

    // Address
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zip: String
    },
    multiple_addresses: [{
        label: String, // Billing, Shipping, etc.
        street: String,
        city: String,
        state: String,
        country: String,
        zip: String
    }],

    // Bank Details (for remittances)
    bank_details: {
        bank_name: String,
        account_name: String,
        account_number: String,
        iban: String,
        swift_code: String,
    },

    // GL Mapping
    payable_gl_account: { type: String, default: '2100' }, // Accounts Payable (Control)
    expense_gl_account: { type: String, default: '5000' }, // Default Expense/COGS
    advance_gl_account: { type: String, default: '1400' }, // Prepayments/Advances to Vendor

    is_active: { type: Boolean, default: true },
    is_approved: { type: Boolean, default: false }, // Vendor onboarding workflow
    notes: String,
    created_by: String,
    updated_by: String,
}, { timestamps: true });

// ── BILL ENGINE (Enterprise Standard) ──────────────────────────────────
const billLineSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 0 },
    tax_code: { type: String }, // Reference to Tax Center
    expense_gl_account: { type: String },
    project_id: { type: String },
    cost_center: { type: String },
    amount: { type: Number, required: true }, // Net amount before tax
    tax_amount: { type: Number, default: 0 },
    total: { type: Number, required: true },  // net + tax
});

const billSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    bill_number: { type: String, required: true, unique: true }, // Internal unique ID
    vendor_bill_reference: { type: String }, // Vendor's invoice number
    vendor_id: { type: String, required: true, index: true },
    vendor_name: { type: String },
    purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },

    bill_date: { type: Date, default: Date.now },
    posting_date: { type: Date },
    due_date: { type: Date },

    // Multi-currency fields
    currency: { type: String, default: 'AED' },
    exchange_rate: { type: Number, default: 1 }, // Rate at time of bill
    exchange_rate_date: { type: Date },

    lines: [billLineSchema],

    // Amounts in bill currency
    subtotal: { type: Number, default: 0 },
    tax_total: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    balance_due: { type: Number, default: 0 },

    // Base currency equivalents (for GL posting)
    subtotal_base: { type: Number, default: 0 },
    tax_total_base: { type: Number, default: 0 },
    total_amount_base: { type: Number, default: 0 },
    balance_due_base: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'partial', 'paid', 'overdue', 'cancelled'],
        default: 'draft'
    },

    payment_status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },

    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: String,
    approved_at: Date,

    attachment_url: String, // Scanned bill
    internal_notes: String,

    project_id: String,
    cost_center: String,

    journal_entry_id: String, // Link to posted Journal Entry
    created_by: String,
    updated_by: String,
}, { timestamps: true });

// ── VENDOR PAYMENT (Outgoing Cash) ──────────────────────────────────────────────
const paymentAllocationAPSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    payment_id: { type: String, required: true, index: true },
    bill_id: { type: String, required: true, index: true },
    amount_allocated: { type: Number, required: true },
    allocation_date: { type: Date, default: Date.now },
});

const vendorPaymentSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    payment_number: { type: String, required: true, unique: true },
    vendor_id: { type: String, required: true, index: true },
    payment_date: { type: Date, default: Date.now },
    payment_method: { type: String, enum: ['bank_transfer', 'cheque', 'cash', 'card'], default: 'bank_transfer' },
    reference_no: { type: String }, // Transaction ID/Cheque No

    // Multi-currency fields
    currency: { type: String, default: 'AED' },
    exchange_rate: { type: Number, default: 1 }, // Rate at time of payment
    exchange_rate_date: { type: Date },
    
    // Amounts in payment currency
    amount_paid: { type: Number, required: true },
    amount_applied: { type: Number, default: 0 },
    unapplied_balance: { type: Number, default: 0 }, // Advance payment

    // Base currency equivalents
    amount_paid_base: { type: Number, default: 0 },
    amount_applied_base: { type: Number, default: 0 },
    unapplied_balance_base: { type: Number, default: 0 },

    bank_account_id: { type: String }, // From Banking Module
    gl_account: { type: String, default: '1000' }, // Cr Bank/Cash

    status: { type: String, enum: ['draft', 'posted', 'cleared', 'void'], default: 'draft' },
    journal_entry_id: String,
}, { timestamps: true });

// ── DEBIT NOTE (Returns/Price Adjustments) ──────────────────────────────────
const debitNoteSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    debit_note_number: { type: String, required: true, unique: true },
    vendor_id: { type: String, required: true, index: true },
    original_bill_id: { type: String }, // Linked bill

    date: { type: Date, default: Date.now },
    reason: String,

    lines: [billLineSchema],
    total_amount: { type: Number, required: true },

    status: { type: String, enum: ['draft', 'approved', 'applied', 'void'], default: 'draft' },
    journal_entry_id: String,
}, { timestamps: true });

// ── VENDOR AGING SNAPSHOT ──────────────────────────────────────────────────
const vendorAgingSnapshotSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    snapshot_date: { type: Date, default: Date.now },
    vendor_id: { type: String },
    vendor_name: { type: String },
    bucket_current: { type: Number, default: 0 },
    bucket_1_30: { type: Number, default: 0 },
    bucket_31_60: { type: Number, default: 0 },
    bucket_61_90: { type: Number, default: 0 },
    bucket_90_plus: { type: Number, default: 0 },
    total_payable: { type: Number, default: 0 },
    overdue_payable: { type: Number, default: 0 },
});

// ── RECURRING BILL (Automation) ──────────────────────────────────────────
const recurringBillSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    vendor_id: { type: String, required: true },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    next_bill_date: { type: Date },
    lines: [billLineSchema],
    total_amount: { type: Number, required: true },
    is_active: { type: Boolean, default: true },
    created_by: String,
}, { timestamps: true });

// ── BATCH PAYMENT ───────────────────────────────────────────────────────────
const batchPaymentSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    batch_number: { type: String, required: true, unique: true },
    payment_date: { type: Date, default: Date.now },
    total_amount: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'processed', 'failed'], default: 'draft' },
    payment_method: { type: String },
    vendor_count: { type: Number, default: 0 },
    bill_count: { type: Number, default: 0 },
    payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorPayment' }],
    created_by: String,
}, { timestamps: true });

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);
const RecurringBill = mongoose.models.RecurringBill || mongoose.model('RecurringBill', recurringBillSchema);
const VendorPayment = mongoose.models.VendorPayment || mongoose.model('VendorPayment', vendorPaymentSchema);
const BatchPayment = mongoose.models.BatchPayment || mongoose.model('BatchPayment', batchPaymentSchema);
const PaymentAllocationAP = mongoose.models.PaymentAllocationAP || mongoose.model('PaymentAllocationAP', paymentAllocationAPSchema);
const DebitNote = mongoose.models.DebitNote || mongoose.model('DebitNote', debitNoteSchema);
const VendorCredit = mongoose.models.DebitNote; // Alias for Procurement Standard
const VendorAgingSnapshot = mongoose.models.VendorAgingSnapshot || mongoose.model('VendorAgingSnapshot', vendorAgingSnapshotSchema);

module.exports = {
    Vendor,
    Bill,
    RecurringBill,
    VendorPayment,
    BatchPayment,
    PaymentAllocationAP,
    DebitNote,
    VendorCredit,
    VendorAgingSnapshot
};
