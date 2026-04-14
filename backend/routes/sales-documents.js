const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { ProformaInvoice, DeliveryNote, SalesInvoice, SalesQuotation } = require('../models/BusinessDocuments');
const approvalEngine = require('../services/approvalEngine');

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

router.get('/proforma-invoices', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const docs = await ProformaInvoice.find({ tenant_id }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch proforma invoices' });
    }
});

router.post('/proforma-invoices', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const year = new Date().getFullYear();
        const count = await ProformaInvoice.countDocuments({ tenant_id });
        const items = req.body.items || [];
        const { subtotal, taxAmount, total } = calculateProformaTotals(items, req.body.taxRate ?? 5);

        const doc = new ProformaInvoice({
            ...req.body,
            tenant_id,
            number: req.body.number || proformaNumber(year, count + 1),
            date: req.body.date || new Date().toISOString().split('T')[0],
            subtotal,
            taxAmount,
            total,
            createdBy: req.user?.full_name || req.user?.email || 'System User'
        });

        await doc.save();
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create proforma invoice', detail: error.message });
    }
});

router.put('/proforma-invoices/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const items = req.body.items || [];
        const { subtotal, taxAmount, total } = calculateProformaTotals(items, req.body.taxRate ?? 5);

        const doc = await ProformaInvoice.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            { ...req.body, subtotal, taxAmount, total },
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

router.get('/delivery-notes', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const docs = await DeliveryNote.find({ tenant_id }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delivery notes' });
    }
});

router.post('/delivery-notes', async (req, res) => {
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

router.put('/delivery-notes/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const doc = await DeliveryNote.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            req.body,
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

router.get('/invoices', async (req, res) => {
    try {
        const docs = await SalesInvoice.find({ tenant_id: tenantIdFromReq(req) }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales invoices' });
    }
});

router.post('/invoices', async (req, res) => {
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

router.put('/invoices/:id', async (req, res) => {
    try {
        const { subtotal, taxAmount, total } = calculateDocTotals(req.body.items, req.body.taxRate ?? 5);
        const doc = await SalesInvoice.findOneAndUpdate(
            { _id: req.params.id, tenant_id: tenantIdFromReq(req) },
            { ...req.body, subtotal, taxAmount, total },
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
        const update = { status };
        if (status === 'approved') { update.approvedBy = updatedBy; update.approvedAt = new Date().toISOString(); }
        if (status === 'rejected') { update.rejectedBy = updatedBy; update.rejectedAt = new Date().toISOString(); update.rejectedReason = reason; }
        const doc = await SalesInvoice.findOneAndUpdate(
            { _id: req.params.id, tenant_id: tenantIdFromReq(req) },
            update, { new: true }
        );
        if (!doc) return res.status(404).json({ error: 'Sales invoice not found' });
        res.json(doc);
    } catch (error) {
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

// ── SALES QUOTATIONS ─────────────────────────────────────────────────────────

router.get('/quotations', async (req, res) => {
    try {
        const docs = await SalesQuotation.find({ tenant_id: tenantIdFromReq(req) }).sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales quotations' });
    }
});

router.post('/quotations', async (req, res) => {
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

router.put('/quotations/:id', async (req, res) => {
    try {
        const { subtotal, taxAmount, total } = calculateDocTotals(req.body.items, req.body.taxRate ?? 5);
        const doc = await SalesQuotation.findOneAndUpdate(
            { _id: req.params.id, tenant_id: tenantIdFromReq(req) },
            { ...req.body, subtotal, taxAmount, total },
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
        const update = { status };
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

module.exports = router;
