const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PaymentVoucher, ReceiptVoucher } = require('../models/BusinessDocuments');
const { JournalEntry, Account } = require('../models/Finance');

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

function buildCreatedBy(req) {
    return req.user?.full_name || req.user?.email || req.user?.id || 'System User';
}

function sanitizeLines(lines = []) {
    return lines.map((line) => ({
        description: String(line.description || '').trim(),
        accountCode: String(line.accountCode || '').trim(),
        amount: Number(line.amount || 0),
    }));
}

function totalAmount(lines = []) {
    return lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
}

async function lookupAccount(tenant_id, code) {
    if (!code) {
        return null;
    }

    return Account.findOne(accountLookupFilter(tenant_id, { code })).lean();
}

async function createJournalEntry({
    tenant_id,
    prefix,
    date,
    reference,
    description,
    lines,
    createdBy,
}) {
    const count = await JournalEntry.countDocuments(tenantScopedFilter(tenant_id));
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Voucher journal entry is not balanced');
    }

    const entry = new JournalEntry({
        tenant_id,
        entry_number: `${prefix}-${String(count + 1).padStart(6, '0')}`,
        date: date ? new Date(date) : new Date(),
        reference,
        description,
        lines,
        status: 'posted',
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: createdBy,
        posted_at: new Date(),
    });

    await entry.save();
    return entry;
}

async function approveVoucher(Model, req, res, label) {
    try {
        const tenant_id = tenantIdFromReq(req);
        const voucher = await Model.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!voucher) {
            return res.status(404).json({ error: `${label} not found` });
        }

        if (voucher.status === 'posted') {
            return res.status(400).json({ error: `${label} is already posted` });
        }

        voucher.status = 'approved';
        voucher.approvedBy = buildCreatedBy(req);
        voucher.approvedAt = new Date().toISOString();
        await voucher.save();

        return res.json(voucher);
    } catch (error) {
        return res.status(500).json({ error: `Failed to approve ${label.toLowerCase()}` });
    }
}

async function postVoucher(Model, req, res, config) {
    const { label, prefix, direction, counterpartyField, counterpartyLabel } = config;

    try {
        const tenant_id = tenantIdFromReq(req);
        const voucher = await Model.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!voucher) {
            return res.status(404).json({ error: `${label} not found` });
        }

        if (voucher.status !== 'approved') {
            return res.status(400).json({ error: `${label} must be approved before posting` });
        }

        if (voucher.journal_entry_id) {
            return res.status(400).json({ error: `${label} is already posted` });
        }

        const lines = sanitizeLines(voucher.lines);
        const total = totalAmount(lines);

        if (!lines.length || total <= 0) {
            return res.status(400).json({ error: `${label} requires at least one positive-value line` });
        }

        for (const line of lines) {
            if (!line.description || !line.accountCode || line.amount <= 0) {
                return res.status(400).json({ error: 'Each voucher line requires description, account code, and amount' });
            }
        }

        const settlementAccountCode = voucher.cashAccountCode || '1000';
        const settlementAccount = await lookupAccount(tenant_id, settlementAccountCode);

        if (!settlementAccount) {
            return res.status(400).json({ error: `Cash/Bank account ${settlementAccountCode} was not found` });
        }

        const journalLines = [];
        for (const line of lines) {
            const account = await lookupAccount(tenant_id, line.accountCode);

            if (!account) {
                return res.status(400).json({ error: `Account ${line.accountCode} was not found` });
            }

            journalLines.push({
                account_code: line.accountCode,
                account_name: account.name,
                debit: direction === 'outflow' ? line.amount : 0,
                credit: direction === 'inflow' ? line.amount : 0,
                description: line.description,
            });
        }

        journalLines.push({
            account_code: settlementAccountCode,
            account_name: settlementAccount.name,
            debit: direction === 'inflow' ? total : 0,
            credit: direction === 'outflow' ? total : 0,
            description: `${counterpartyLabel} settlement for ${voucher.voucherNumber}`,
        });

        const entry = await createJournalEntry({
            tenant_id,
            prefix,
            date: voucher.date,
            reference: voucher.voucherNumber,
            description: `${label} ${voucher.voucherNumber} - ${voucher[counterpartyField]}`,
            lines: journalLines,
            createdBy: buildCreatedBy(req),
        });

        voucher.status = 'posted';
        voucher.totalAmount = total;
        voucher.journal_entry_id = String(entry._id);
        voucher.postedAt = new Date().toISOString();
        await voucher.save();

        return res.json({ voucher, journal_entry: entry });
    } catch (error) {
        return res.status(500).json({ error: `Failed to post ${label.toLowerCase()}`, detail: error.message });
    }
}

router.get('/payment-vouchers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const vouchers = await PaymentVoucher.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payment vouchers' });
    }
});

router.post('/payment-vouchers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await PaymentVoucher.countDocuments(tenantScopedFilter(tenant_id));
        const lines = sanitizeLines(req.body.lines || []);

        const voucher = new PaymentVoucher({
            ...req.body,
            tenant_id,
            lines,
            cashAccountCode: req.body.cashAccountCode || '1000',
            totalAmount: totalAmount(lines),
            date: req.body.date || new Date().toISOString().split('T')[0],
            voucherNumber: req.body.voucherNumber || `PV-${year}-${String(count + 1).padStart(4, '0')}`,
            createdBy: buildCreatedBy(req),
        });

        await voucher.save();
        res.status(201).json(voucher);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create payment voucher', detail: error.message });
    }
});

router.put('/payment-vouchers/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const current = await PaymentVoucher.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!current) {
            return res.status(404).json({ error: 'Payment voucher not found' });
        }

        if (current.status === 'posted') {
            return res.status(400).json({ error: 'Posted payment vouchers cannot be edited' });
        }

        const lines = sanitizeLines(req.body.lines || []);
        const voucher = await PaymentVoucher.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            {
                ...req.body,
                tenant_id,
                lines,
                cashAccountCode: req.body.cashAccountCode || current.cashAccountCode || '1000',
                totalAmount: totalAmount(lines),
            },
            { new: true }
        );

        res.json(voucher);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment voucher' });
    }
});

router.delete('/payment-vouchers/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const voucher = await PaymentVoucher.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!voucher) {
            return res.status(404).json({ error: 'Payment voucher not found' });
        }

        if (voucher.status === 'posted') {
            return res.status(400).json({ error: 'Posted payment vouchers cannot be deleted' });
        }

        await PaymentVoucher.deleteOne({ _id: voucher._id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete payment voucher' });
    }
});

router.post('/payment-vouchers/:id/approve', async (req, res) => {
    return approveVoucher(PaymentVoucher, req, res, 'Payment voucher');
});

router.post('/payment-vouchers/:id/post', async (req, res) => {
    return postVoucher(PaymentVoucher, req, res, {
        label: 'Payment voucher',
        prefix: 'JE-PV',
        direction: 'outflow',
        counterpartyField: 'payeeName',
        counterpartyLabel: 'Cash disbursement',
    });
});

router.get('/receipt-vouchers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const vouchers = await ReceiptVoucher.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch receipt vouchers' });
    }
});

router.post('/receipt-vouchers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await ReceiptVoucher.countDocuments(tenantScopedFilter(tenant_id));
        const lines = sanitizeLines(req.body.lines || []);

        const voucher = new ReceiptVoucher({
            ...req.body,
            tenant_id,
            lines,
            cashAccountCode: req.body.cashAccountCode || '1000',
            totalAmount: totalAmount(lines),
            date: req.body.date || new Date().toISOString().split('T')[0],
            voucherNumber: req.body.voucherNumber || `RV-${year}-${String(count + 1).padStart(4, '0')}`,
            createdBy: buildCreatedBy(req),
        });

        await voucher.save();
        res.status(201).json(voucher);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create receipt voucher', detail: error.message });
    }
});

router.put('/receipt-vouchers/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const current = await ReceiptVoucher.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!current) {
            return res.status(404).json({ error: 'Receipt voucher not found' });
        }

        if (current.status === 'posted') {
            return res.status(400).json({ error: 'Posted receipt vouchers cannot be edited' });
        }

        const lines = sanitizeLines(req.body.lines || []);
        const voucher = await ReceiptVoucher.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            {
                ...req.body,
                tenant_id,
                lines,
                cashAccountCode: req.body.cashAccountCode || current.cashAccountCode || '1000',
                totalAmount: totalAmount(lines),
            },
            { new: true }
        );

        res.json(voucher);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update receipt voucher' });
    }
});

router.delete('/receipt-vouchers/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const voucher = await ReceiptVoucher.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!voucher) {
            return res.status(404).json({ error: 'Receipt voucher not found' });
        }

        if (voucher.status === 'posted') {
            return res.status(400).json({ error: 'Posted receipt vouchers cannot be deleted' });
        }

        await ReceiptVoucher.deleteOne({ _id: voucher._id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete receipt voucher' });
    }
});

router.post('/receipt-vouchers/:id/approve', async (req, res) => {
    return approveVoucher(ReceiptVoucher, req, res, 'Receipt voucher');
});

router.post('/receipt-vouchers/:id/post', async (req, res) => {
    return postVoucher(ReceiptVoucher, req, res, {
        label: 'Receipt voucher',
        prefix: 'JE-RV',
        direction: 'inflow',
        counterpartyField: 'payerName',
        counterpartyLabel: 'Cash receipt',
    });
});

module.exports = router;
