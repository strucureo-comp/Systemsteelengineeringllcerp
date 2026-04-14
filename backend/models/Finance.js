const mongoose = require('mongoose');

// ===== INVOICE SCHEMA =====
const invoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, required: true },
    tax_rate: { type: Number, default: 0 },
    amount: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    invoice_number: { type: String, required: true, unique: true },
    type: { type: String, enum: ['invoice', 'credit_note', 'debit_note'], default: 'invoice' },
    customer_name: { type: String, required: true },
    customer_email: { type: String },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partial'], default: 'draft' },
    issue_date: { type: Date, default: Date.now },
    due_date: { type: Date },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    currency: { type: String, default: 'AED' },
    notes: String,
    payment_terms: String,
    created_by: String,
}, { timestamps: true });

// ===== EXPENSE SCHEMA =====
const expenseSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    expense_number: { type: String, unique: true },
    category: { type: String, required: true },
    vendor_id: { type: String }, // Link to Vendor
    vendor: { type: String },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    tax_amount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
    date: { type: Date, default: Date.now },
    payment_method: { type: String },
    receipt_url: String,
    currency: { type: String, default: 'AED' },
    is_recurring: { type: Boolean, default: false },
    recurrence_period: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'] },
    approved_by: String,
    created_by: String,
}, { timestamps: true });

// ===== RECURRING EXPENSE SCHEMA =====
const recurringExpenseSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    category: { type: String, required: true },
    vendor_id: { type: String },
    vendor: { type: String },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    next_date: { type: Date },
    is_active: { type: Boolean, default: true },
    created_by: String,
}, { timestamps: true });

// ===== ACCOUNT (COA) SCHEMA =====
const accountSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], required: true },
    parent_code: String,
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'AED' },
    is_active: { type: Boolean, default: true },
    description: String,
}, { timestamps: true });

// ===== JOURNAL ENTRY SCHEMA =====
const journalLineSchema = new mongoose.Schema({
    account_code: { type: String, required: true },
    account_name: String,
    debit: { type: Number, default: 0 }, // In transaction currency
    credit: { type: Number, default: 0 }, // In transaction currency
    currency: { type: String, default: 'AED' },
    exchange_rate: { type: Number, default: 1 },
    debit_base: { type: Number, default: 0 }, // In base currency (AED)
    credit_base: { type: Number, default: 0 }, // In base currency (AED)
    description: String,
});

const journalEntrySchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    entry_number: { type: String, unique: true },
    date: { type: Date, default: Date.now },
    reference: String,
    description: { type: String, required: true },
    lines: [journalLineSchema],
    status: { type: String, enum: ['draft', 'posted', 'pending_approval', 'approved', 'rejected', 'reversed'], default: 'draft' },
    total_debit: { type: Number, default: 0 }, // Base currency
    total_credit: { type: Number, default: 0 }, // Base currency
    created_by: String,
    posted_at: Date,
}, { timestamps: true });

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const RecurringExpense = mongoose.models.RecurringExpense || mongoose.model('RecurringExpense', recurringExpenseSchema);
const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
const JournalEntry = mongoose.models.JournalEntry || mongoose.model('JournalEntry', journalEntrySchema);

module.exports = { Invoice, Expense, RecurringExpense, Account, JournalEntry };
