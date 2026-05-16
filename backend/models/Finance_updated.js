const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

// ===== INVOICE SCHEMA =====
const invoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit_price: { type: Number, required: true, min: 0 },
    tax_rate: { type: Number, default: 0, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0 },
});

const invoiceSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true },
    invoice_number: { type: String, required: true },
    type: { type: String, enum: ['invoice', 'credit_note', 'debit_note'], default: 'invoice', index: true },
    customer_name: { type: String, required: true, trim: true },
    customer_email: { type: String, lowercase: true, trim: true },
    status: { 
        type: String, 
        enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partial'], 
        default: 'draft',
        index: true
    },
    issue_date: { type: Date, default: Date.now, index: true },
    due_date: { type: Date, index: true },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    tax_amount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    amount_paid: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'AED' },
    notes: String,
    payment_terms: String,
    created_by: String,
}, { timestamps: true });

// Indexes
invoiceSchema.index({ tenant_id: 1, createdAt: -1 });
invoiceSchema.index({ tenant_id: 1, invoice_number: 1 }, { unique: true });
invoiceSchema.index({ tenant_id: 1, status: 1 });
invoiceSchema.index({ tenant_id: 1, due_date: 1 });
invoiceSchema.index({ tenant_id: 1, customer_name: 1 });
invoiceSchema.index({ tenant_id: 1, issue_date: -1 });

// NOTE: Invoices should NEVER be hard deleted - use status: 'cancelled' instead
// Soft delete plugin NOT applied intentionally

// ===== EXPENSE SCHEMA =====
const expenseSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true },
    expense_number: { type: String },
    category: { type: String, required: true, trim: true, index: true },
    vendor_id: { type: String },
    vendor: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    tax_amount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0.01 },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'paid', 'rejected'], 
        default: 'pending',
        index: true
    },
    date: { type: Date, default: Date.now, index: true },
    payment_method: { type: String },
    receipt_url: String,
    currency: { type: String, default: 'AED' },
    is_recurring: { type: Boolean, default: false, index: true },
    recurrence_period: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'] },
    approved_by: String,
    created_by: String,
}, { timestamps: true });

// Indexes
expenseSchema.index({ tenant_id: 1, createdAt: -1 });
expenseSchema.index({ tenant_id: 1, expense_number: 1 }, { unique: true, sparse: true });
expenseSchema.index({ tenant_id: 1, status: 1 });
expenseSchema.index({ tenant_id: 1, category: 1 });
expenseSchema.index({ tenant_id: 1, date: -1 });
expenseSchema.plugin(softDeletePlugin);

// ===== RECURRING EXPENSE SCHEMA =====
const recurringExpenseSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true },
    category: { type: String, required: true, trim: true },
    vendor_id: { type: String },
    vendor: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    next_date: { type: Date, index: true },
    is_active: { type: Boolean, default: true, index: true },
    created_by: String,
}, { timestamps: true });

// Validation: end_date >= start_date
recurringExpenseSchema.pre('validate', function(next) {
    if (this.start_date && this.end_date && new Date(this.end_date) < new Date(this.start_date)) {
        return next(new Error('end_date must be greater than or equal to start_date'));
    }
    next();
});

// Indexes
recurringExpenseSchema.index({ tenant_id: 1, createdAt: -1 });
recurringExpenseSchema.index({ tenant_id: 1, is_active: 1, next_date: 1 });
recurringExpenseSchema.plugin(softDeletePlugin);

// ===== ACCOUNT (COA) SCHEMA =====
const accountSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    type: { 
        type: String, 
        enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], 
        required: true,
        index: true
    },
    parent_code: { type: String, trim: true, uppercase: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'AED' },
    is_active: { type: Boolean, default: true, index: true },
    description: String,
}, { timestamps: true });

// Indexes
accountSchema.index({ tenant_id: 1, createdAt: -1 });
accountSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
accountSchema.index({ tenant_id: 1, type: 1 });
accountSchema.index({ tenant_id: 1, parent_code: 1 });
accountSchema.plugin(softDeletePlugin);

// ===== JOURNAL ENTRY SCHEMA =====
const journalLineSchema = new mongoose.Schema({
    account_code: { type: String, required: true, trim: true, uppercase: true },
    account_name: String,
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    description: String,
});

const journalEntrySchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true },
    entry_number: { type: String },
    date: { type: Date, default: Date.now, index: true },
    posting_date: { type: Date, index: true },
    reference: String,
    description: { type: String, required: true, trim: true },
    lines: [journalLineSchema],
    status: { 
        type: String, 
        enum: ['draft', 'posted', 'reversed'], 
        default: 'draft',
        index: true
    },
    total_debit: { type: Number, default: 0, min: 0 },
    total_credit: { type: Number, default: 0, min: 0 },
    created_by: String,
    posted_at: Date,
    posted_by: String,
}, { timestamps: true });

// Validation: debits must equal credits
journalEntrySchema.pre('validate', function(next) {
    if (this.status === 'posted') {
        const totalDebit = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return next(new Error('Total debits must equal total credits'));
        }
        
        this.total_debit = totalDebit;
        this.total_credit = totalCredit;
    }
    next();
});

// Indexes
journalEntrySchema.index({ tenant_id: 1, createdAt: -1 });
journalEntrySchema.index({ tenant_id: 1, entry_number: 1 }, { unique: true, sparse: true });
journalEntrySchema.index({ tenant_id: 1, status: 1 });
journalEntrySchema.index({ tenant_id: 1, posting_date: -1 });
journalEntrySchema.index({ tenant_id: 1, date: -1 });

// NOTE: Journal Entries should NEVER be hard deleted - use status: 'reversed' instead
// Soft delete plugin NOT applied intentionally

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const RecurringExpense = mongoose.models.RecurringExpense || mongoose.model('RecurringExpense', recurringExpenseSchema);
const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
const JournalEntry = mongoose.models.JournalEntry || mongoose.model('JournalEntry', journalEntrySchema);

module.exports = { Invoice, Expense, RecurringExpense, Account, JournalEntry };
