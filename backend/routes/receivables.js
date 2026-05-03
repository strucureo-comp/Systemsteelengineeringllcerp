const express = require('express');
const router = express.Router();
const {
    Customer,
    InvoiceAR,
    Payment,
    PaymentAllocation,
    CreditNote,
    WriteOff,
    Provision,
    AgingSnapshot,
} = require('../models/Receivables');
const { JournalEntry } = require('../models/Finance');
const { auth } = require('../middleware/auth');

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

function buildCreatedBy(req) {
    return req.user?.full_name || req.user?.email || req.user?.id || 'system';
}

async function findCustomerRecord(req, customerId) {
    if (!customerId) {
        return null;
    }

    const tenant_id = tenantIdFromReq(req);
    return Customer.findOne(tenantScopedFilter(tenant_id, { customer_id: customerId }));
}

router.get('/customers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const customers = await Customer.find(tenantScopedFilter(tenant_id)).sort({ legal_name: 1 }).lean();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

router.post('/customers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await Customer.countDocuments(tenantScopedFilter(tenant_id));
        const customer_id = `CUST-${String(count + 1001).padStart(4, '0')}`;
        const customer = new Customer({ ...req.body, tenant_id, customer_id });
        await customer.save();
        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create customer', detail: err.message });
    }
});

router.put('/customers/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const customer = await Customer.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            { ...req.body, tenant_id },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

router.get('/invoices', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const invoices = await InvoiceAR.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

router.post('/invoices', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { lines = [], ...rest } = req.body;
        const customer = await findCustomerRecord(req, rest.customer_id);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const count = await InvoiceAR.countDocuments(tenantScopedFilter(tenant_id));
        const invoice_number = rest.invoice_number || `INV-AR-${String(count + 1).padStart(6, '0')}`;
        const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const tax_total = lines.reduce((sum, line) => sum + Number(line.tax_amount || 0), 0);
        const discount_total = lines.reduce((sum, line) => sum + Number(line.discount || 0), 0);
        const total_amount = subtotal + tax_total;

        const invoice = new InvoiceAR({
            ...rest,
            tenant_id,
            invoice_number,
            customer_name: rest.customer_name || customer.legal_name,
            lines,
            subtotal,
            tax_total,
            discount_total,
            total_amount,
            balance_due: total_amount,
        });

        await invoice.save();
        res.status(201).json(invoice);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create invoice', detail: err.message });
    }
});

router.post('/invoices/:id/post', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const inv = await InvoiceAR.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!inv) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        if (inv.journal_entry_id) {
            return res.status(400).json({ error: 'Invoice is already posted' });
        }

        if (inv.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft invoices can be posted' });
        }

        const customer = await findCustomerRecord(req, inv.customer_id);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const lines = [
            {
                account_code: customer.receivable_gl_account || '1100',
                debit: Number(inv.total_amount || 0),
                credit: 0,
                description: `Receivable for ${inv.invoice_number}`,
            },
            {
                account_code: customer.revenue_gl_account || '4000',
                debit: 0,
                credit: Number(inv.subtotal || 0),
                description: `Revenue for ${inv.invoice_number}`,
            },
        ];

        if (inv.tax_total > 0) {
            lines.push({
                account_code: '2100',
                debit: 0,
                credit: Number(inv.tax_total || 0),
                description: `VAT for ${inv.invoice_number}`,
            });
        }

        const count = await JournalEntry.countDocuments(tenantScopedFilter(tenant_id));
        const je = new JournalEntry({
            tenant_id,
            entry_number: `JE-AR-${String(count + 1).padStart(6, '0')}`,
            date: inv.posting_date || new Date(),
            reference: inv.invoice_number,
            description: `Auto-generated JE for Invoice ${inv.invoice_number}`,
            lines,
            status: 'posted',
            total_debit: Number(inv.total_amount || 0),
            total_credit: Number(inv.total_amount || 0),
            created_by: buildCreatedBy(req),
            posted_at: new Date(),
        });

        await je.save();

        inv.status = 'sent';
        inv.approval_status = 'approved';
        inv.approved_by = buildCreatedBy(req);
        inv.approved_at = new Date();
        inv.journal_entry_id = je._id;
        await inv.save();

        res.json({ success: true, journal_entry: je, invoice: inv });
    } catch (err) {
        res.status(500).json({ error: 'Posting failed', detail: err.message });
    }
});

router.get('/payments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const payments = await Payment.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

router.post('/payments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { allocations = [], ...rest } = req.body;
        const customer = await findCustomerRecord(req, rest.customer_id);
        const amount_received = Number(rest.amount_received ?? rest.amount ?? 0);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        if (amount_received <= 0) {
            return res.status(400).json({ error: 'Receipt amount must be greater than zero' });
        }

        const count = await Payment.countDocuments(tenantScopedFilter(tenant_id));
        const receipt_number = rest.receipt_number || `PAY-${String(count + 1).padStart(6, '0')}`;
        const amount_applied = allocations.reduce((sum, allocation) => sum + Number(allocation.amount_allocated || 0), 0);

        const payment = new Payment({
            ...rest,
            tenant_id,
            receipt_number,
            amount_received,
            amount_applied,
            unapplied_balance: amount_received - amount_applied,
            status: 'posted',
        });

        await payment.save();

        for (const allocation of allocations) {
            const pa = new PaymentAllocation({
                tenant_id,
                payment_id: payment._id,
                invoice_id: allocation.invoice_id,
                amount_allocated: Number(allocation.amount_allocated || 0),
            });
            await pa.save();

            const inv = await InvoiceAR.findOne(tenantScopedFilter(tenant_id, { _id: allocation.invoice_id }));
            if (inv) {
                inv.balance_due = Math.max(0, Number(inv.balance_due || 0) - Number(allocation.amount_allocated || 0));

                if (inv.balance_due <= 0) {
                    inv.status = 'paid';
                } else {
                    inv.status = 'partial';
                }

                await inv.save();
            }
        }

        const jeCount = await JournalEntry.countDocuments(tenantScopedFilter(tenant_id));
        const je = new JournalEntry({
            tenant_id,
            entry_number: `JE-PAY-${String(jeCount + 1).padStart(6, '0')}`,
            date: payment.payment_date,
            reference: receipt_number,
            description: `Payment from ${customer.legal_name || payment.customer_id}`,
            lines: [
                {
                    account_code: payment.gl_account || '1000',
                    debit: amount_received,
                    credit: 0,
                    description: `Cash/Bank Receipt ${receipt_number}`,
                },
                {
                    account_code: customer.receivable_gl_account || '1100',
                    debit: 0,
                    credit: amount_received,
                    description: `Payment Application ${receipt_number}`,
                },
            ],
            status: 'posted',
            total_debit: amount_received,
            total_credit: amount_received,
            created_by: buildCreatedBy(req),
            posted_at: new Date(),
        });

        await je.save();
        payment.journal_entry_id = je._id;
        await payment.save();

        res.status(201).json(payment);
    } catch (err) {
        res.status(500).json({ error: 'Payment failed', detail: err.message });
    }
});

router.get('/aging-report', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const today = new Date();
        const invoices = await InvoiceAR.find(
            tenantScopedFilter(tenant_id, {
                balance_due: { $gt: 0 },
                status: { $ne: 'draft' },
            })
        ).lean();

        const aging = {
            current: 0,
            d30: 0,
            d60: 0,
            d90: 0,
            d90Plus: 0,
            total: 0,
        };

        invoices.forEach((inv) => {
            const dueDate = inv.due_date ? new Date(inv.due_date) : today;
            const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) aging.current += Number(inv.balance_due || 0);
            else if (diffDays <= 30) aging.d30 += Number(inv.balance_due || 0);
            else if (diffDays <= 60) aging.d60 += Number(inv.balance_due || 0);
            else if (diffDays <= 90) aging.d90 += Number(inv.balance_due || 0);
            else aging.d90Plus += Number(inv.balance_due || 0);

            aging.total += Number(inv.balance_due || 0);
        });

        res.json(aging);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate aging' });
    }
});

router.get('/customers/:id/statement', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const customerRef = req.params.id;
        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;

        const customer = await Customer.findOne(
            tenantScopedFilter(tenant_id, {
                $or: [{ _id: customerRef }, { customer_id: customerRef }],
            })
        ).lean();
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const customerKeys = [String(customer._id), String(customer.customer_id), customerRef];
        const invoiceFilter = tenantScopedFilter(tenant_id, {
            customer_id: { $in: customerKeys },
        });

        if (from || to) {
            invoiceFilter.invoice_date = {};
            if (from) invoiceFilter.invoice_date.$gte = from;
            if (to) invoiceFilter.invoice_date.$lte = to;
        }

        const invoices = await InvoiceAR.find(invoiceFilter).sort({ invoice_date: 1, createdAt: 1 }).lean();
        const invoiceIds = invoices.map((inv) => String(inv._id));

        const allocations = invoiceIds.length
            ? await PaymentAllocation.find(
                tenantScopedFilter(tenant_id, { invoice_id: { $in: invoiceIds } })
            ).lean()
            : [];

        const paymentIds = Array.from(new Set(allocations.map((a) => String(a.payment_id))));
        const payments = paymentIds.length
            ? await Payment.find(tenantScopedFilter(tenant_id, { _id: { $in: paymentIds } })).lean()
            : [];

        const paidByInvoice = new Map();
        allocations.forEach((allocation) => {
            const invoiceId = String(allocation.invoice_id);
            paidByInvoice.set(
                invoiceId,
                Number(paidByInvoice.get(invoiceId) || 0) + Number(allocation.amount_allocated || 0)
            );
        });

        const statementLines = invoices.map((invoice) => {
            const paid = Number(paidByInvoice.get(String(invoice._id)) || 0);
            const billed = Number(invoice.total_amount || 0);
            return {
                type: 'invoice',
                invoice_id: String(invoice._id),
                date: invoice.invoice_date || invoice.createdAt,
                reference: invoice.invoice_number,
                debit: billed,
                credit: paid,
                balance: Math.max(0, billed - paid),
                status: invoice.status,
            };
        });

        const totalBilled = statementLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
        const totalPaid = statementLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
        const outstanding = Math.max(0, totalBilled - totalPaid);

        res.json({
            customer: {
                id: String(customer._id),
                customer_id: customer.customer_id,
                legal_name: customer.legal_name,
                email: customer.email,
            },
            period: { from, to },
            lines: statementLines,
            summary: {
                total_billed: totalBilled,
                total_paid: totalPaid,
                outstanding,
                invoices_count: statementLines.length,
            },
            payments: payments.map((payment) => ({
                id: String(payment._id),
                receipt_number: payment.receipt_number,
                payment_date: payment.payment_date,
                amount_received: payment.amount_received,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate customer statement', detail: err.message });
    }
});

module.exports = router;
