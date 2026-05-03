const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { ProformaInvoice, DeliveryNote, SalesInvoice, SalesQuotation, SalesCreditNote } = require('../models/BusinessDocuments');
const { JournalEntry } = require('../models/Finance');
const { CustomerAccount } = require('../models/CRM');
const approvalEngine = require('../services/approvalEngine');
const { sendEmail } = require('../services/emailService');
const validate = require('../middleware/validate');
const {
    proformaValidator,
    salesInvoiceValidator,
    salesQuotationValidator,
    deliveryNoteValidator,
    paymentRecordValidator,
    emailValidator,
} = require('../validators/businessDocumentsValidators');

router.use(auth);

function tenantIdFromReq(req) {
    return req.user?.tenant_id || 'default';
}

function proformaNumber(year, sequence) {
    return `PI-${year}-${String(sequence).padStart(4, '0')}`;
}

function deliveryNumber(year, sequence) {
    return `DN-${year}-${String(sequence).padStart(4, '0')}`;
}

function calculateProformaTotals(items = [], taxRate = 5) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const taxAmount = subtotal * (Number(taxRate || 0) / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
}

function withProformaBalances(payload) {
    const total = Number(payload.total || 0);
    const advancePaid = Math.max(0, Number(payload.advancePaid || 0));
    const balanceRemaining = Math.max(0, total - advancePaid);
    return { ...payload, advancePaid, balanceRemaining };
}

router.get('/proforma-invoices', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const docs = await ProformaInvoice.find({ tenant_id }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch proforma invoices' });
    }
});

router.post('/proforma-invoices', validate(proformaValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await ProformaInvoice.countDocuments({ tenant_id });
        const items = req.body.items || [];
        const { subtotal, taxAmount, total } = calculateProformaTotals(items, req.body.taxRate ?? 5);

        const doc = new ProformaInvoice(withProformaBalances({
            ...req.body,
            tenant_id,
            number: req.body.number || proformaNumber(year, count + 1),
            date: req.body.date || new Date().toISOString().split('T')[0],
            subtotal,
            taxAmount,
            total,
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        }));

        await doc.save();
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create proforma invoice', detail: error.message });
    }
});

router.put('/proforma-invoices/:id', validate(proformaValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const items = req.body.items || [];
        const { subtotal, taxAmount, total } = calculateProformaTotals(items, req.body.taxRate ?? 5);

        const doc = await ProformaInvoice.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            withProformaBalances({
                ...req.body,
                subtotal,
                taxAmount,
                total,
                updatedBy: req.user?.full_name || req.user?.email || 'System User'
            }),
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ error: 'Proforma invoice not found' });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update proforma invoice' });
    }
});

router.delete('/proforma-invoices/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const result = await ProformaInvoice.findOneAndDelete({ _id: req.params.id, tenant_id });
        if (!result) {
            return res.status(404).json({ error: 'Proforma invoice not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete proforma invoice' });
    }
});

router.post('/proforma-invoices/:id/record-payment', validate(paymentRecordValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const amount = Number(req.body.amount || 0);
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid payment amount is required' });
        }

        const doc = await ProformaInvoice.findOne({ _id: req.params.id, tenant_id });
        if (!doc) return res.status(404).json({ error: 'Proforma invoice not found' });

        doc.advancePaid = Number(doc.advancePaid || 0) + amount;
        doc.balanceRemaining = Math.max(0, Number(doc.total || 0) - Number(doc.advancePaid || 0));
        if (doc.balanceRemaining <= 0) {
            doc.status = 'paid';
        } else if (doc.advancePaid > 0) {
            doc.status = 'partial';
        }
        doc.updatedBy = req.user?.full_name || req.user?.email || 'System User';
        await doc.save();
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to record proforma payment', detail: error.message });
    }
});

router.post('/proforma-invoices/:id/convert-to-invoice', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const proforma = await ProformaInvoice.findOne({ _id: req.params.id, tenant_id });
        if (!proforma) return res.status(404).json({ error: 'Proforma invoice not found' });

        const year = new Date().getFullYear();
        const count = await SalesInvoice.countDocuments({ tenant_id });
        const salesInvoice = new SalesInvoice({
            tenant_id,
            number: `INV-${year}-${String(count + 1).padStart(4, '0')}`,
            customerId: proforma.customerId || '',
            customerName: proforma.customerName,
            date: new Date().toISOString().split('T')[0],
            dueDate: req.body.dueDate || '',
            items: proforma.items || [],
            taxRate: proforma.taxRate || 5,
            subtotal: proforma.subtotal || 0,
            taxAmount: proforma.taxAmount || 0,
            total: proforma.total || 0,
            notes: proforma.notes || '',
            status: 'draft',
            sourceProformaId: String(proforma._id),
            sourceProformaNumber: proforma.number,
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });
        await salesInvoice.save();

        proforma.convertedToInvoiceId = String(salesInvoice._id);
        proforma.convertedToInvoiceNumber = salesInvoice.number;
        proforma.convertedAt = new Date().toISOString();
        proforma.status = 'converted';
        await proforma.save();

        res.json({ invoice: salesInvoice, proforma });
    } catch (error) {
        res.status(500).json({ error: 'Failed to convert proforma to invoice', detail: error.message });
    }
});

router.get('/delivery-notes', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const docs = await DeliveryNote.find({ tenant_id }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delivery notes' });
    }
});

router.post('/delivery-notes', validate(deliveryNoteValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await DeliveryNote.countDocuments({ tenant_id });

        const doc = new DeliveryNote({
            ...req.body,
            tenant_id,
            number: req.body.number || deliveryNumber(year, count + 1),
            date: req.body.date || new Date().toISOString().split('T')[0],
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });

        await doc.save();
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create delivery note', detail: error.message });
    }
});

router.put('/delivery-notes/:id', validate(deliveryNoteValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const doc = await DeliveryNote.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            { ...req.body, updatedBy: req.user?.full_name || req.user?.email || 'System User' },
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ error: 'Delivery note not found' });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update delivery note' });
    }
});

router.delete('/delivery-notes/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const result = await DeliveryNote.findOneAndDelete({ _id: req.params.id, tenant_id });
        if (!result) {
            return res.status(404).json({ error: 'Delivery note not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete delivery note' });
    }
});

// ── SALES INVOICES ───────────────────────────────────────────────────────────

function calculateDocTotals(items = [], taxRate = 5) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const taxAmount = subtotal * (Number(taxRate || 0) / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
}

async function sendSalesDocEmail({ tenant_id, to, subject, html, reference_type, reference_id, sent_by }) {
    const result = await sendEmail({
        tenant_id,
        to,
        subject,
        html,
        reference_type,
        reference_id,
        sent_by
    });
    if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
    }
    return result;
}

router.get('/invoices', async (req, res) => {
    try {
        const docs = await SalesInvoice.find({ tenant_id: tenantIdFromReq(req) }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales invoices' });
    }
});

router.post('/invoices', validate(salesInvoiceValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await SalesInvoice.countDocuments({ tenant_id });
        const { subtotal, taxAmount, total } = calculateDocTotals(req.body.items, req.body.taxRate ?? 5);
        const doc = new SalesInvoice({
            ...req.body,
            tenant_id,
            number: req.body.number || `INV-${year}-${String(count + 1).padStart(4, '0')}`,
            date: req.body.date || new Date().toISOString().split('T')[0],
            subtotal, taxAmount, total,
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });
        await doc.save();
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create sales invoice', detail: error.message });
    }
});

router.put('/invoices/:id', validate(salesInvoiceValidator), async (req, res) => {
    try {
        const { subtotal, taxAmount, total } = calculateDocTotals(req.body.items, req.body.taxRate ?? 5);
        const doc = await SalesInvoice.findOneAndUpdate(
            { _id: req.params.id, tenant_id: tenantIdFromReq(req) },
            { ...req.body, subtotal, taxAmount, total, updatedBy: req.user?.full_name || req.user?.email || 'System User' },
            { new: true }
        );
        if (!doc) return res.status(404).json({ error: 'Sales invoice not found' });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update sales invoice' });
    }
});

router.patch('/invoices/:id/status', async (req, res) => {
    try {
        const { status, updatedBy, reason } = req.body;
        const tenant_id = tenantIdFromReq(req);
        const update = { status, updatedBy: updatedBy || req.user?.full_name || req.user?.email || 'System User' };
        
        if (status === 'approved') { 
            update.approvedBy = updatedBy || req.user?.full_name || req.user?.email || 'System User'; 
            update.approvedAt = new Date().toISOString(); 
        }
        if (status === 'rejected') { 
            update.rejectedBy = updatedBy || req.user?.full_name || req.user?.email || 'System User'; 
            update.rejectedAt = new Date().toISOString(); 
            update.rejectedReason = reason; 
        }

        const doc = await SalesInvoice.findOne({ _id: req.params.id, tenant_id });
        if (!doc) return res.status(404).json({ error: 'Sales invoice not found' });

        // If approving or completing and not yet posted, create Journal Entry
        if (['approved', 'completed'].includes(status) && !doc.journal_entry_id) {
            const customer = await CustomerAccount.findById(doc.customerId);
            
            const lines = [
                {
                    account_code: customer?.receivable_gl_account || '1100',
                    account_name: 'Accounts Receivable',
                    debit: Number(doc.total || 0),
                    credit: 0,
                    description: `Receivable for Invoice ${doc.number}`,
                },
                {
                    account_code: customer?.revenue_gl_account || '4000',
                    account_name: 'Sales Revenue',
                    debit: 0,
                    credit: Number(doc.subtotal || 0),
                    description: `Revenue for Invoice ${doc.number}`,
                },
            ];

            if (doc.taxAmount > 0) {
                lines.push({
                    account_code: '2100',
                    account_name: 'VAT Output',
                    debit: 0,
                    credit: Number(doc.taxAmount || 0),
                    description: `VAT for Invoice ${doc.number}`,
                });
            }

            const count = await JournalEntry.countDocuments({ tenant_id });
            const je = new JournalEntry({
                tenant_id,
                entry_number: `JE-INV-${String(count + 1).padStart(6, '0')}`,
                date: doc.date || new Date(),
                reference: doc.number,
                description: `Auto-generated JE for Invoice ${doc.number}`,
                lines,
                status: 'posted',
                total_debit: Number(doc.total || 0),
                total_credit: Number(doc.total || 0),
                created_by: req.user?.full_name || 'System',
                posted_at: new Date(),
            });

            await je.save();
            update.journal_entry_id = je._id;
        }

        const updatedDoc = await SalesInvoice.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            update, { new: true }
        );

        res.json(updatedDoc);
    } catch (error) {
        console.error('Invoice Status Update Error:', error);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
});

router.delete('/invoices/:id', async (req, res) => {
    try {
        const result = await SalesInvoice.findOneAndDelete({ _id: req.params.id, tenant_id: tenantIdFromReq(req) });
        if (!result) return res.status(404).json({ error: 'Sales invoice not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete sales invoice' });
    }
});

router.post('/invoices/:id/send-email', validate(emailValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const invoice = await SalesInvoice.findOne({ _id: req.params.id, tenant_id }).lean();
        if (!invoice) return res.status(404).json({ error: 'Sales invoice not found' });

        const to = req.body.to;
        if (!to) return res.status(400).json({ error: 'Recipient email is required' });

        await sendSalesDocEmail({
            tenant_id,
            to,
            subject: `Sales Invoice ${invoice.number}`,
            html: `<p>Please find your invoice <strong>${invoice.number}</strong>.</p><p>Total: ${invoice.total || 0}</p>`,
            reference_type: 'sales_invoice',
            reference_id: String(invoice._id),
            sent_by: req.user?._id
        });
        res.json({ success: true, message: 'Invoice email sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send invoice email', detail: error.message });
    }
});

router.post('/invoices/:id/create-credit-note', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const invoice = await SalesInvoice.findOne({ _id: req.params.id, tenant_id });
        if (!invoice) return res.status(404).json({ error: 'Sales invoice not found' });

        const year = new Date().getFullYear();
        const count = await SalesCreditNote.countDocuments({ tenant_id });
        const ratioRaw = Number(req.body.ratio ?? 1);
        const ratio = Math.max(0.01, Math.min(1, ratioRaw));
        const reason = String(req.body.reason || 'Credit note against sales invoice');

        const items = (invoice.items || []).map((item) => ({
            ...item,
            quantity: Number(item.quantity || 0) * ratio,
            total: Number(item.total || 0) * ratio,
        }));
        const subtotal = Number(invoice.subtotal || 0) * ratio;
        const taxAmount = Number(invoice.taxAmount || 0) * ratio;
        const total = Number(invoice.total || 0) * ratio;

        const note = new SalesCreditNote({
            tenant_id,
            number: `CN-${year}-${String(count + 1).padStart(4, '0')}`,
            sourceInvoiceId: String(invoice._id),
            sourceInvoiceNumber: invoice.number,
            customerId: invoice.customerId || '',
            customerName: invoice.customerName || '',
            date: new Date().toISOString().split('T')[0],
            reason,
            items,
            subtotal,
            taxRate: invoice.taxRate || 5,
            taxAmount,
            total,
            status: 'issued',
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });
        await note.save();

        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create credit note', detail: error.message });
    }
});

router.get('/credit-notes', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const docs = await SalesCreditNote.find({ tenant_id }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch credit notes' });
    }
});

// ── SALES QUOTATIONS ─────────────────────────────────────────────────────────

router.get('/quotations', async (req, res) => {
    try {
        const docs = await SalesQuotation.find({ tenant_id: tenantIdFromReq(req) }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales quotations' });
    }
});

router.post('/quotations', validate(salesQuotationValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await SalesQuotation.countDocuments({ tenant_id });
        const { subtotal, taxAmount, total } = calculateDocTotals(req.body.items, req.body.taxRate ?? 5);
        const doc = new SalesQuotation({
            ...req.body,
            tenant_id,
            number: req.body.number || `QT-${year}-${String(count + 1).padStart(4, '0')}`,
            date: req.body.date || new Date().toISOString().split('T')[0],
            status: 'draft', // Always start as draft
            subtotal, taxAmount, total,
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });
        await doc.save();
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create sales quotation', detail: error.message });
    }
});

// Submit quotation for approval
router.post('/quotations/:id/submit', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const quotation = await SalesQuotation.findOne({ _id: req.params.id, tenant_id });
        
        if (!quotation) return res.status(404).json({ error: 'Sales quotation not found' });
        
        if (quotation.status !== 'draft') {
            return res.status(400).json({ 
                error: 'Only draft quotations can be submitted for approval',
                currentStatus: quotation.status
            });
        }

        // Submit for approval
        const approvalRequest = await approvalEngine.submitForApproval(
            'quotation',
            quotation._id,
            tenant_id,
            req.user._id
        );

        quotation.status = 'pending_approval';
        await quotation.save();

        res.json({
            message: 'Quotation submitted for approval',
            quotation,
            approvalRequest
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit quotation', detail: error.message });
    }
});

router.put('/quotations/:id', validate(salesQuotationValidator), async (req, res) => {
    try {
        const { subtotal, taxAmount, total } = calculateDocTotals(req.body.items, req.body.taxRate ?? 5);
        const doc = await SalesQuotation.findOneAndUpdate(
            { _id: req.params.id, tenant_id: tenantIdFromReq(req) },
            { ...req.body, subtotal, taxAmount, total, updatedBy: req.user?.full_name || req.user?.email || 'System User' },
            { new: true }
        );
        if (!doc) return res.status(404).json({ error: 'Sales quotation not found' });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update sales quotation' });
    }
});

router.patch('/quotations/:id/status', async (req, res) => {
    try {
        const { status, updatedBy, reason } = req.body;
        const update = { status, updatedBy: updatedBy || req.user?.full_name || req.user?.email || 'System User' };
        if (status === 'approved') { update.approvedBy = updatedBy; update.approvedAt = new Date().toISOString(); }
        if (status === 'rejected') { update.rejectedBy = updatedBy; update.rejectedAt = new Date().toISOString(); update.rejectedReason = reason; }
        const doc = await SalesQuotation.findOneAndUpdate(
            { _id: req.params.id, tenant_id: tenantIdFromReq(req) },
            update, { new: true }
        );
        if (!doc) return res.status(404).json({ error: 'Sales quotation not found' });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quotation status' });
    }
});

router.delete('/quotations/:id', async (req, res) => {
    try {
        const result = await SalesQuotation.findOneAndDelete({ _id: req.params.id, tenant_id: tenantIdFromReq(req) });
        if (!result) return res.status(404).json({ error: 'Sales quotation not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete sales quotation' });
    }
});

router.post('/quotations/:id/convert-to-invoice', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const quotation = await SalesQuotation.findOne({ _id: req.params.id, tenant_id });
        if (!quotation) return res.status(404).json({ error: 'Sales quotation not found' });

        const year = new Date().getFullYear();
        const count = await SalesInvoice.countDocuments({ tenant_id });
        const invoice = new SalesInvoice({
            tenant_id,
            number: `INV-${year}-${String(count + 1).padStart(4, '0')}`,
            customerId: quotation.customerId || '',
            customerName: quotation.customerName || '',
            date: new Date().toISOString().split('T')[0],
            dueDate: req.body.dueDate || '',
            items: quotation.items || [],
            taxRate: quotation.taxRate || 5,
            subtotal: quotation.subtotal || 0,
            taxAmount: quotation.taxAmount || 0,
            total: quotation.total || 0,
            notes: quotation.notes || '',
            status: 'draft',
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });

        await invoice.save();
        quotation.status = 'completed';
        await quotation.save();

        res.json({ success: true, invoice, quotation });
    } catch (error) {
        res.status(500).json({ error: 'Failed to convert quotation to invoice', detail: error.message });
    }
});

router.post('/quotations/:id/send-email', validate(emailValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const quotation = await SalesQuotation.findOne({ _id: req.params.id, tenant_id }).lean();
        if (!quotation) return res.status(404).json({ error: 'Sales quotation not found' });

        const to = req.body.to;
        if (!to) return res.status(400).json({ error: 'Recipient email is required' });

        await sendSalesDocEmail({
            tenant_id,
            to,
            subject: `Sales Quotation ${quotation.number}`,
            html: `<p>Please find your quotation <strong>${quotation.number}</strong>.</p><p>Total: ${quotation.total || 0}</p><p>Valid Until: ${quotation.validUntil || '-'}</p>`,
            reference_type: 'sales_quotation',
            reference_id: String(quotation._id),
            sent_by: req.user?._id
        });
        res.json({ success: true, message: 'Quotation email sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send quotation email', detail: error.message });
    }
});

router.post('/proforma-invoices/:id/send-email', validate(emailValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const proforma = await ProformaInvoice.findOne({ _id: req.params.id, tenant_id });
        if (!proforma) return res.status(404).json({ error: 'Proforma invoice not found' });

        const to = req.body.to;
        if (!to) return res.status(400).json({ error: 'Recipient email is required' });

        await sendSalesDocEmail({
            tenant_id,
            to,
            subject: `Proforma Invoice ${proforma.number}`,
            html: `<p>Please find your proforma invoice <strong>${proforma.number}</strong>.</p><p>Total: ${proforma.total || 0}</p><p>Advance Paid: ${proforma.advancePaid || 0} | Balance: ${proforma.balanceRemaining || proforma.total || 0}</p>`,
            reference_type: 'proforma_invoice',
            reference_id: String(proforma._id),
            sent_by: req.user?._id
        });
        if (proforma.status === 'draft') {
            proforma.status = 'sent';
            proforma.updatedBy = req.user?.full_name || req.user?.email || 'System User';
            await proforma.save();
        }
        res.json({ success: true, message: 'Proforma email sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send proforma email', detail: error.message });
    }
});

module.exports = router;
