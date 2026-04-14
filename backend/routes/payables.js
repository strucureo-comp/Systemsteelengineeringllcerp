const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {
    Vendor,
    Bill,
    VendorPayment,
    BatchPayment,
    PaymentAllocationAP,
    DebitNote,
    RecurringBill,
} = require('../models/Payables');
const { JournalEntry } = require('../models/Finance');
const { PurchaseOrder, GRN } = require('../models/Procurement');
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

function normalizeBillStatus(status) {
    if (status === 'pending') {
        return 'pending_approval';
    }

    return status || 'draft';
}

async function findVendorRecord(req, vendorRef) {
    if (!vendorRef) {
        return null;
    }

    const tenant_id = tenantIdFromReq(req);
    const lookup = mongoose.Types.ObjectId.isValid(vendorRef)
        ? { $or: [{ _id: vendorRef }, { vendor_id: vendorRef }] }
        : { vendor_id: vendorRef };

    return Vendor.findOne(tenantScopedFilter(tenant_id, lookup));
}

router.get('/vendors', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const vendors = await Vendor.find(tenantScopedFilter(tenant_id)).sort({ legal_name: 1 }).lean();
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

router.post('/vendors', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await Vendor.countDocuments(tenantScopedFilter(tenant_id));
        const vendor_id = `VEN-${String(count + 1001).padStart(4, '0')}`;
        const vendor = new Vendor({ ...req.body, tenant_id, vendor_id });
        await vendor.save();
        res.status(201).json(vendor);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create vendor', detail: err.message });
    }
});

router.put('/vendors/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const vendor = await Vendor.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            { ...req.body, tenant_id },
            { new: true }
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json(vendor);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update vendor' });
    }
});

router.get('/recurring-bills', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const rbs = await RecurringBill.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(rbs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch recurring bills' });
    }
});

router.get('/batch-payments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const batches = await BatchPayment.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(batches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch batch payments' });
    }
});

router.get('/debit-notes', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const notes = await DebitNote.find(tenantScopedFilter(tenant_id))
            .sort({ createdAt: -1 })
            .lean();
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch debit notes' });
    }
});

router.get('/bills', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const bills = await Bill.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(bills);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

router.post('/bills', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await Bill.countDocuments(tenantScopedFilter(tenant_id));
        const bill_number = req.body.bill_number || `BILL-AP-${String(count + 1).padStart(6, '0')}`;
        const { lines = [], ...rest } = req.body;
        const vendor = await findVendorRecord(req, rest.vendor_id);

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const tax_total = lines.reduce((sum, line) => sum + Number(line.tax_amount || 0), 0);
        const total_amount = subtotal + tax_total;

        const bill = new Bill({
            ...rest,
            tenant_id,
            bill_number,
            vendor_id: String(rest.vendor_id),
            vendor_name: rest.vendor_name || vendor.legal_name,
            purchase_order_id: rest.purchase_order_id || undefined,
            lines,
            subtotal,
            tax_total,
            total_amount,
            balance_due: total_amount,
            status: normalizeBillStatus(rest.status),
        });

        await bill.save();
        res.status(201).json(bill);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create bill', detail: err.message });
    }
});

router.post('/bills/:id/post', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const bill = await Bill.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        if (bill.journal_entry_id) {
            return res.status(400).json({ error: 'Bill is already posted' });
        }

        if (!['draft', 'pending_approval'].includes(bill.status)) {
            return res.status(400).json({ error: 'Only draft or pending-approval bills can be posted' });
        }

        if (bill.purchase_order_id) {
            const po = await PurchaseOrder.findOne(
                tenantScopedFilter(tenant_id, { _id: bill.purchase_order_id })
            );

            if (po) {
                const grns = await GRN.find(tenantScopedFilter(tenant_id, { purchase_order_id: po._id }));

                if (grns.length === 0) {
                    return res.status(400).json({
                        error: '3-Way Match Failed: No Goods Receipt (GRN) found for this Purchase Order. Cannot bill unreceived items.',
                    });
                }

                const receivedQty = grns.reduce(
                    (sum, grn) => sum + grn.items.reduce((inner, item) => inner + Number(item.quantity_received || 0), 0),
                    0
                );
                const billQty = bill.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);

                if (billQty > receivedQty && receivedQty > 0) {
                    return res.status(400).json({
                        error: `3-Way Match Failed: Billed quantity (${billQty}) exceeds received quantity (${receivedQty}).`,
                    });
                }
            }
        }

        const vendor = await findVendorRecord(req, bill.vendor_id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const entryLines = bill.lines.map((line) => ({
            account_code: line.expense_gl_account || vendor.expense_gl_account || '5000',
            debit: Number(line.amount || 0),
            credit: 0,
            description: `Expense: ${line.description} for ${bill.bill_number}`,
        }));

        if (bill.tax_total > 0) {
            entryLines.push({
                account_code: '1400',
                debit: Number(bill.tax_total || 0),
                credit: 0,
                description: `Input VAT for ${bill.bill_number}`,
            });
        }

        entryLines.push({
            account_code: vendor.payable_gl_account || '2100',
            debit: 0,
            credit: Number(bill.total_amount || 0),
            description: `Payable for ${bill.bill_number}`,
        });

        const count = await JournalEntry.countDocuments(tenantScopedFilter(tenant_id));
        const createdBy = buildCreatedBy(req);
        const je = new JournalEntry({
            tenant_id,
            entry_number: `JE-AP-${String(count + 1).padStart(6, '0')}`,
            date: bill.posting_date || bill.bill_date || new Date(),
            reference: bill.bill_number,
            description: `Auto-generated JE for Bill ${bill.bill_number}`,
            lines: entryLines,
            status: 'posted',
            total_debit: Number(bill.total_amount || 0),
            total_credit: Number(bill.total_amount || 0),
            created_by: createdBy,
            posted_at: new Date(),
        });

        await je.save();

        bill.status = 'approved';
        bill.approval_status = 'approved';
        bill.approved_by = createdBy;
        bill.approved_at = new Date();
        bill.journal_entry_id = je._id;
        await bill.save();

        res.json({ success: true, journal_entry: je, bill });
    } catch (err) {
        res.status(500).json({ error: 'Posting failed', detail: err.message });
    }
});

router.get('/payments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const payments = await VendorPayment.find(tenantScopedFilter(tenant_id)).sort({ createdAt: -1 }).lean();
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

router.post('/payments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { allocations = [], ...rest } = req.body;
        const vendor = await findVendorRecord(req, rest.vendor_id);
        const amount_paid = Number(rest.amount_paid ?? rest.amount ?? 0);

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        if (amount_paid <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than zero' });
        }

        const count = await VendorPayment.countDocuments(tenantScopedFilter(tenant_id));
        const payment_number = rest.payment_number || `V-PAY-${String(count + 1).padStart(6, '0')}`;
        const amount_applied = allocations.reduce((sum, allocation) => sum + Number(allocation.amount_allocated || 0), 0);

        const payment = new VendorPayment({
            ...rest,
            tenant_id,
            payment_number,
            vendor_id: String(rest.vendor_id),
            amount_paid,
            amount_applied,
            unapplied_balance: amount_paid - amount_applied,
            status: 'posted',
        });

        await payment.save();

        for (const allocation of allocations) {
            const pa = new PaymentAllocationAP({
                tenant_id,
                payment_id: payment._id,
                bill_id: allocation.bill_id,
                amount_allocated: Number(allocation.amount_allocated || 0),
            });
            await pa.save();

            const bill = await Bill.findOne(tenantScopedFilter(tenant_id, { _id: allocation.bill_id }));
            if (bill) {
                bill.balance_due = Math.max(0, Number(bill.balance_due || 0) - Number(allocation.amount_allocated || 0));

                if (bill.balance_due <= 0) {
                    bill.status = 'paid';
                    bill.payment_status = 'paid';
                } else if (bill.balance_due < Number(bill.total_amount || 0)) {
                    bill.status = 'partial';
                    bill.payment_status = 'partial';
                }

                await bill.save();
            }
        }

        const jeCount = await JournalEntry.countDocuments(tenantScopedFilter(tenant_id));
        const je = new JournalEntry({
            tenant_id,
            entry_number: `JE-V-PAY-${String(jeCount + 1).padStart(6, '0')}`,
            date: payment.payment_date,
            reference: payment_number,
            description: `Payment to ${vendor.legal_name || payment.vendor_id}`,
            lines: [
                {
                    account_code: vendor.payable_gl_account || '2100',
                    debit: amount_paid,
                    credit: 0,
                    description: `Settlement of balance`,
                },
                {
                    account_code: payment.gl_account || '1000',
                    debit: 0,
                    credit: amount_paid,
                    description: `Cash/Bank Disbursement ${payment_number}`,
                },
            ],
            status: 'posted',
            total_debit: amount_paid,
            total_credit: amount_paid,
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
        const bills = await Bill.find(
            tenantScopedFilter(tenant_id, {
                balance_due: { $gt: 0 },
                status: { $nin: ['draft', 'cancelled'] },
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

        bills.forEach((bill) => {
            const dueDate = bill.due_date ? new Date(bill.due_date) : today;
            const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) aging.current += Number(bill.balance_due || 0);
            else if (diffDays <= 30) aging.d30 += Number(bill.balance_due || 0);
            else if (diffDays <= 60) aging.d60 += Number(bill.balance_due || 0);
            else if (diffDays <= 90) aging.d90 += Number(bill.balance_due || 0);
            else aging.d90Plus += Number(bill.balance_due || 0);

            aging.total += Number(bill.balance_due || 0);
        });

        res.json(aging);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate aging' });
    }
});

module.exports = router;
