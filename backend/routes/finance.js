const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Invoice, Expense, RecurringExpense, Account, JournalEntry } = require('../models/Finance');
const { auth } = require('../middleware/auth');
const approvalEngine = require('../services/approvalEngine');
const validate = require('../middleware/validate');
const {
    invoiceValidator,
    expenseValidator,
    accountValidator,
    journalEntryValidator,
    recurringExpenseValidator
} = require('../validators/financeValidators');

router.use(auth);

function tenantIdFromReq(req) {
    return req.user?.tenant_id || 'default';
}

function tenantScopedFilter(tenant_id, filter = {}) {
    if (tenant_id === 'default') {
        return {
            ...filter,
            $or: [{ tenant_id }, { tenant_id: { $exists: false } }],
        };
    }

    return { ...filter, tenant_id };
}

function accountLookupFilter(tenant_id, filter = {}) {
    if (tenant_id === 'default') {
        return tenantScopedFilter(tenant_id, filter);
    }

    return {
        ...filter,
        $or: [{ tenant_id }, { tenant_id: 'default' }, { tenant_id: { $exists: false } }],
    };
}

// =====================================
// RECURRING EXPENSES
// =====================================

router.get('/recurring-expenses', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const expenses = await RecurringExpense.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch recurring expenses' });
    }
});

router.post('/recurring-expenses', validate(recurringExpenseValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const expense = new RecurringExpense({ ...req.body, tenant_id });
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create recurring expense' });
    }
});

// =====================================
// FX RATES
// =====================================

router.get('/fx-rates', async (req, res) => {
    try {
        // Return base rates — can be static for now or from DB
        const rates = { USD: 1, AED: 3.67, EUR: 0.92, GBP: 0.79, SAR: 3.75, INR: 82.50 };
        res.json({ success: true, rates });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================
// INVOICES CRUD
// =====================================

// GET all invoices
router.get('/invoices', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { status, type } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        const invoices = await Invoice.find(tenantScopedFilter(tenant_id, filter)).sort({ createdAt: -1 }).lean();
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// GET single invoice
router.get('/invoices/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const inv = await Invoice.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id })).lean();
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });
        res.json(inv);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// CREATE invoice
router.post('/invoices', validate(invoiceValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        // Auto-generate invoice number
        const count = await Invoice.countDocuments(tenantScopedFilter(tenant_id));
        const num = `INV-${String(count + 1001).padStart(5, '0')}`;

        const { items = [], ...rest } = req.body;
        const subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
        const tax_amount = items.reduce((s, i) => s + (Number(i.amount || 0) * Number(i.tax_rate || 0) / 100), 0);

        const invoice = new Invoice({
            ...rest,
            tenant_id,
            invoice_number: num,
            items,
            subtotal,
            tax_amount,
            total: subtotal + tax_amount,
        });
        await invoice.save();
        res.status(201).json(invoice);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create invoice', detail: err.message });
    }
});

// UPDATE invoice
router.put('/invoices/:id', validate(invoiceValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { items, ...rest } = req.body;
        const update = { ...rest };
        if (items) {
            update.items = items;
            update.subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
            update.tax_amount = items.reduce((s, i) => s + (Number(i.amount || 0) * Number(i.tax_rate || 0) / 100), 0);
            update.total = update.subtotal + update.tax_amount;
        }
        update.tenant_id = tenant_id;
        const inv = await Invoice.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            update,
            { new: true }
        );
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });
        res.json(inv);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

// DELETE invoice
router.delete('/invoices/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        await Invoice.findOneAndDelete(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

// =====================================
// EXPENSES CRUD
// =====================================

router.get('/expenses', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { status, category } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        const expenses = await Expense.find(tenantScopedFilter(tenant_id, filter)).sort({ createdAt: -1 }).lean();
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

router.get('/expenses/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const exp = await Expense.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id })).lean();
        if (!exp) return res.status(404).json({ error: 'Expense not found' });
        res.json(exp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch expense' });
    }
});

router.post('/expenses', validate(expenseValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await Expense.countDocuments(tenantScopedFilter(tenant_id));
        const expense = new Expense({
            ...req.body,
            tenant_id,
            expense_number: `EXP-${String(count + 1001).padStart(5, '0')}`,
        });
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create expense', detail: err.message });
    }
});

router.put('/expenses/:id', validate(expenseValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const exp = await Expense.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            { ...req.body, tenant_id },
            { new: true }
        );
        if (!exp) return res.status(404).json({ error: 'Expense not found' });
        res.json(exp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

router.delete('/expenses/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        await Expense.findOneAndDelete(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// =====================================
// CHART OF ACCOUNTS
// =====================================

router.get('/accounts', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { type } = req.query;
        const filter = {};
        if (type) filter.type = type;
        const accounts = await Account.find(accountLookupFilter(tenant_id, filter)).sort({ code: 1 }).lean();
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

router.post('/accounts', validate(accountValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const account = new Account({ ...req.body, tenant_id });
        await account.save();
        res.status(201).json(account);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create account', detail: err.message });
    }
});

router.put('/accounts/:id', validate(accountValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const acc = await Account.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            { ...req.body, tenant_id },
            { new: true }
        );
        if (!acc) return res.status(404).json({ error: 'Account not found' });
        res.json(acc);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update account' });
    }
});

router.delete('/accounts/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        await Account.findOneAndDelete(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// Seed default COA
router.post('/accounts/seed', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const existing = await Account.countDocuments(accountLookupFilter(tenant_id));
        if (existing > 0) return res.json({ message: 'COA already seeded', count: existing });

        const defaultAccounts = [
            { code: '1000', name: 'Cash & Bank', type: 'asset' },
            { code: '1100', name: 'Accounts Receivable', type: 'asset' },
            { code: '1200', name: 'Inventory', type: 'asset' },
            { code: '1300', name: 'Fixed Assets', type: 'asset' },
            { code: '1400', name: 'Prepaid Expenses', type: 'asset' },
            { code: '2000', name: 'Accounts Payable', type: 'liability' },
            { code: '2100', name: 'VAT Payable', type: 'liability' },
            { code: '2200', name: 'Accrued Liabilities', type: 'liability' },
            { code: '2300', name: 'Short-term Loans', type: 'liability' },
            { code: '3000', name: 'Owner Equity', type: 'equity' },
            { code: '3100', name: 'Retained Earnings', type: 'equity' },
            { code: '4000', name: 'Sales Revenue', type: 'revenue' },
            { code: '4100', name: 'Service Revenue', type: 'revenue' },
            { code: '4200', name: 'Other Income', type: 'revenue' },
            { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
            { code: '5100', name: 'Salaries & Wages', type: 'expense' },
            { code: '5200', name: 'Rent & Utilities', type: 'expense' },
            { code: '5300', name: 'Office Supplies', type: 'expense' },
            { code: '5400', name: 'Marketing & Advertising', type: 'expense' },
            { code: '5500', name: 'Travel & Transportation', type: 'expense' },
            { code: '5600', name: 'Depreciation', type: 'expense' },
            { code: '5700', name: 'Insurance', type: 'expense' },
            { code: '5800', name: 'Professional Fees', type: 'expense' },
            { code: '5900', name: 'Miscellaneous Expenses', type: 'expense' },
        ];

        await Account.insertMany(defaultAccounts.map((account) => ({ ...account, tenant_id })));
        res.json({ message: 'COA seeded', count: defaultAccounts.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to seed COA', detail: err.message });
    }
});

// =====================================
// JOURNAL ENTRIES
// =====================================

router.get('/journals', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const entries = await JournalEntry.find(tenantScopedFilter(tenant_id, filter)).sort({ date: -1 }).lean();
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
});

router.post('/journals', validate(journalEntryValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await JournalEntry.countDocuments(tenantScopedFilter(tenant_id));
        const { lines = [], ...rest } = req.body;

        const total_debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
        const total_credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

        if (Math.abs(total_debit - total_credit) > 0.01) {
            return res.status(400).json({ error: 'Debits must equal credits' });
        }

        const entry = new JournalEntry({
            ...rest,
            tenant_id,
            entry_number: `JE-${String(count + 1001).padStart(5, '0')}`,
            lines,
            total_debit,
            total_credit,
            status: 'draft', // Always start as draft
            posted_at: undefined,
        });
        await entry.save();
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create journal entry', detail: err.message });
    }
});

// Submit journal entry for approval
router.post('/journals/:id/submit', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const entry = await JournalEntry.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        
        if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
        
        if (entry.status !== 'draft') {
            return res.status(400).json({ 
                error: 'Only draft journal entries can be submitted for approval',
                currentStatus: entry.status
            });
        }

        // Validate double-entry before submission
        const total_debit = entry.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
        const total_credit = entry.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

        if (Math.abs(total_debit - total_credit) > 0.01) {
            return res.status(400).json({ error: 'Debits must equal credits before submission' });
        }

        // Submit for approval
        const approvalRequest = await approvalEngine.submitForApproval(
            'journal_entry',
            entry._id,
            tenant_id,
            req.user._id
        );

        entry.status = 'pending_approval';
        await entry.save();

        res.json({
            message: 'Journal entry submitted for approval',
            entry,
            approvalRequest
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit journal entry', detail: err.message });
    }
});

// Post approved journal entry (updates account balances)
router.post('/journals/:id/post', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const entry = await JournalEntry.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        
        if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
        
        if (entry.status !== 'approved') {
            return res.status(400).json({ 
                error: 'Only approved journal entries can be posted',
                currentStatus: entry.status
            });
        }

        // Update account balances for each line item
        for (const line of entry.lines) {
            await Account.findOneAndUpdate(
                { tenant_id, code: line.account_code },
                {
                    $inc: {
                        balance: line.debit_base - line.credit_base
                    }
                },
                { upsert: false }
            );
        }

        entry.status = 'posted';
        entry.posted_at = new Date();
        await entry.save();

        res.json({
            message: 'Journal entry posted successfully',
            entry
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to post journal entry', detail: err.message });
    }
});

router.delete('/journals/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const deleted = await JournalEntry.findOneAndDelete(
            tenantScopedFilter(tenant_id, { _id: req.params.id })
        );
        if (!deleted) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete journal entry' });
    }
});

// =====================================
// DASHBOARD SUMMARY
// =====================================

router.get('/summary', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const [invoices, expenses, accounts, arInvoices, apBills] = await Promise.all([
            Invoice.find(tenantScopedFilter(tenant_id)).lean(),
            Expense.find(tenantScopedFilter(tenant_id)).lean(),
            Account.find(accountLookupFilter(tenant_id)).lean(),
            mongoose.models.InvoiceAR ? mongoose.models.InvoiceAR.find(tenantScopedFilter(tenant_id)).lean() : Promise.resolve([]),
            mongoose.models.Bill ? mongoose.models.Bill.find(tenantScopedFilter(tenant_id)).lean() : Promise.resolve([])
        ]);

        const totalRevenue = invoices
            .filter(i => i.status === 'paid')
            .reduce((s, i) => s + Number(i.total || 0), 0) +
            arInvoices
                .filter(i => i.status === 'paid' || i.status === 'sent' || i.status === 'partial')
                .reduce((s, i) => s + Number(i.total_amount || 0), 0);

        const totalReceivable = invoices
            .filter(i => ['sent', 'overdue', 'partial'].includes(i.status))
            .reduce((s, i) => s + (Number(i.total || 0) - Number(i.amount_paid || 0)), 0) +
            arInvoices
                .reduce((s, i) => s + (Number(i.balance_due || 0)), 0);

        const totalExpenses = expenses
            .filter(e => ['approved', 'paid'].includes(e.status))
            .reduce((s, e) => s + Number(e.total || 0), 0) +
            apBills
                .filter(b => ['approved', 'paid', 'partial'].includes(b.status))
                .reduce((s, b) => s + Number(b.total_amount || 0), 0);

        const totalPayable = expenses
            .filter(e => e.status === 'approved')
            .reduce((s, e) => s + Number(e.total || 0), 0) +
            apBills
                .reduce((s, b) => s + Number(b.balance_due || 0), 0);

        const taxCollected = invoices
            .filter(i => i.status === 'paid')
            .reduce((s, i) => s + Number(i.tax_amount || 0), 0);

        const invoicesByStatus = {};
        invoices.forEach(i => {
            invoicesByStatus[i.status] = (invoicesByStatus[i.status] || 0) + 1;
        });

        const expensesByCategory = {};
        expenses.forEach(e => {
            expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.total || 0);
        });

        res.json({
            totalRevenue,
            totalReceivable,
            totalExpenses,
            totalPayable,
            taxCollected,
            netIncome: totalRevenue - totalExpenses,
            invoiceCount: invoices.length,
            expenseCount: expenses.length,
            accountCount: accounts.length,
            invoicesByStatus,
            expensesByCategory,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

module.exports = router;
