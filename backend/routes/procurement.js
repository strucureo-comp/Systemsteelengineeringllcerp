const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { PurchaseRequest, PurchaseOrder, GRN, RFQ } = require('../models/Procurement');
const { auth } = require('../middleware/auth');
const approvalEngine = require('../services/approvalEngine');
const { sendEmail } = require('../services/emailService');
const validate = require('../middleware/validate');
const { purchaseOrderValidator } = require('../validators/prodReadinessValidators');
const inventoryService = require('../services/inventoryService');
const { Item: InventoryItem } = require('../models/Inventory_updated');

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

router.get('/requests', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const requests = await PurchaseRequest.find(tenantScopedFilter(tenant_id))
            .populate('requested_by', 'full_name')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch purchase requests' });
    }
});

router.post('/requests', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const request = new PurchaseRequest({
            ...req.body,
            tenant_id,
            requested_by: req.user.id,
        });
        await request.save();
        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create purchase request' });
    }
});

// Approve Purchase Request (Material Request)
router.post('/requests/:id/approve', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const request = await PurchaseRequest.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        
        if (!request) return res.status(404).json({ error: 'Request not found' });
        
        if (request.status !== 'pending') {
            return res.status(400).json({ 
                error: 'Only pending requests can be approved',
                currentStatus: request.status
            });
        }

        request.status = 'approved';
        request.approved_by = req.user.id;
        request.approved_at = new Date();
        await request.save();

        // Requirement 3.2: Upon approval, inventory levels must be updated
        // If it's a material request and we have a warehouse, record a movement
        if (request.type === 'material_request' && request.warehouse_id) {
            // Try to find a matching item in inventory by name
            const item = await InventoryItem.findOne(tenantScopedFilter(tenant_id, { 
                name: new RegExp(`^${request.item_name}$`, 'i') 
            }));

            if (item) {
                // Record transaction in inventory
                // Note: This is an internal issue, so type is 'site_issue'
                await inventoryService.updateStockBalance(
                    tenant_id,
                    item._id,
                    request.warehouse_id,
                    -request.quantity, // Negative for issue
                    0, // No allocation change
                    null // No session
                );

                await inventoryService.recordTransaction({
                    tenant_id,
                    type: 'site_issue',
                    item_id: item._id,
                    warehouse_id: request.warehouse_id,
                    qty: -request.quantity,
                    unit_cost: item.last_purchase_price || 0,
                    reference_type: 'material_request',
                    reference_id: request._id,
                    reference_number: request.number || request._id.toString(),
                    posted_by: req.user._id
                });
                
                request.notes = (request.notes || '') + '\n[System] Inventory updated and transaction recorded automatically upon approval.';
                await request.save();
            } else {
                request.notes = (request.notes || '') + '\n[System] Warning: No matching item found in inventory catalog. Manual stock adjustment required.';
                await request.save();
            }
        }

        res.json({
            success: true,
            message: 'Material request approved',
            request
        });
    } catch (err) {
        console.error('Error approving request:', err);
        res.status(500).json({ error: 'Failed to approve request', detail: err.message });
    }
});

router.get('/rfqs', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const rfqs = await RFQ.find(tenantScopedFilter(tenant_id))
            .populate('purchase_request_id')
            .populate('vendors', 'legal_name')
            .populate('created_by', 'full_name')
            .sort({ createdAt: -1 });
        res.json(rfqs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch RFQs' });
    }
});

router.post('/rfqs', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await RFQ.countDocuments(tenantScopedFilter(tenant_id));
        const rfq = new RFQ({
            ...req.body,
            tenant_id,
            rfq_number: req.body.rfq_number || `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
            created_by: req.user.id,
            updated_by: req.user.id,
        });
        await rfq.save();
        res.status(201).json(rfq);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create RFQ' });
    }
});

router.get('/orders', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const orders = await PurchaseOrder.find(tenantScopedFilter(tenant_id))
            .populate('vendor_id', 'name legal_name address phone email vat_no tax_id')
            .populate('created_by', 'full_name')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
});

router.post('/orders', auth, validate(purchaseOrderValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const count = await PurchaseOrder.countDocuments(tenantScopedFilter(tenant_id));
        const po = new PurchaseOrder({
            ...req.body,
            tenant_id,
            po_number: req.body.po_number || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
            status: 'draft', // Always start as draft
            created_by: req.user.id,
            updated_by: req.user.id,
        });
        await po.save();
        res.status(201).json(po);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create purchase order' });
    }
});

// Submit PO for approval
router.post('/orders/:id/submit', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const po = await PurchaseOrder.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        
        if (!po) return res.status(404).json({ error: 'Purchase order not found' });
        
        if (po.status !== 'draft') {
            return res.status(400).json({ 
                error: 'Only draft purchase orders can be submitted for approval',
                currentStatus: po.status
            });
        }

        // Submit for approval
        const approvalRequest = await approvalEngine.submitForApproval(
            'purchase_order',
            po._id,
            tenant_id,
            req.user._id
        );

        po.status = 'pending_approval';
        await po.save();

        res.json({
            message: 'Purchase order submitted for approval',
            purchaseOrder: po,
            approvalRequest
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit purchase order', detail: err.message });
    }
});

// Issue approved PO to vendor
router.post('/orders/:id/issue', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const po = await PurchaseOrder.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        
        if (!po) return res.status(404).json({ error: 'Purchase order not found' });
        
        if (po.status !== 'approved') {
            return res.status(400).json({ 
                error: 'Only approved purchase orders can be issued',
                currentStatus: po.status
            });
        }

        po.status = 'issued';
        po.issued_at = new Date();
        await po.save();

        res.json({
            message: 'Purchase order issued to vendor',
            purchaseOrder: po
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to issue purchase order', detail: err.message });
    }
});

router.get('/orders/:id', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const order = await PurchaseOrder.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }))
            .populate('vendor_id', 'legal_name')
            .populate('created_by', 'full_name')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
});

router.put('/orders/:id', auth, validate(purchaseOrderValidator), async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const order = await PurchaseOrder.findOneAndUpdate(
            tenantScopedFilter(tenant_id, { _id: req.params.id }),
            { ...req.body, tenant_id, updated_by: req.user.id },
            { new: true }
        ).populate('vendor_id', 'legal_name');

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update purchase order' });
    }
});

router.post('/orders/:id/cancel', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const po = await PurchaseOrder.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }));
        if (!po) return res.status(404).json({ error: 'Purchase order not found' });

        if (['received', 'closed', 'cancelled'].includes(po.status)) {
            return res.status(400).json({ error: `Cannot cancel purchase order in ${po.status} status` });
        }

        po.status = 'cancelled';
        await po.save();
        res.json({ success: true, message: 'Purchase order cancelled', purchaseOrder: po });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel purchase order', detail: err.message });
    }
});

router.post('/orders/:id/send-email', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const po = await PurchaseOrder.findOne(tenantScopedFilter(tenant_id, { _id: req.params.id }))
            .populate('vendor_id', 'legal_name email')
            .lean();
        if (!po) return res.status(404).json({ error: 'Purchase order not found' });

        const to = req.body.to || po.vendor_id?.email;
        if (!to) return res.status(400).json({ error: 'Recipient email is required' });

        const result = await sendEmail({
            tenant_id,
            to,
            subject: `Purchase Order ${po.po_number}`,
            html: `<p>Please find Purchase Order <strong>${po.po_number}</strong>.</p><p>Total Amount: ${po.total_amount || 0}</p>`,
            reference_type: 'purchase_order',
            reference_id: String(po._id),
            sent_by: req.user?._id
        });

        if (!result.success) {
            return res.status(500).json({ error: 'Failed to send purchase order email', detail: result.error });
        }

        res.json({ success: true, message: 'Purchase order email sent' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send purchase order email', detail: err.message });
    }
});

router.get('/grns', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const grns = await GRN.find(tenantScopedFilter(tenant_id))
            .populate('purchase_order_id', 'po_number')
            .populate('received_by', 'full_name')
            .sort({ createdAt: -1 });
        res.json(grns);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch GRNs' });
    }
});

router.post('/grns', auth, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const purchaseOrder = await PurchaseOrder.findOne(
            tenantScopedFilter(tenant_id, { _id: req.body.purchase_order_id })
        );

        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        // Only allow GRN for approved/issued POs
        if (!['approved', 'issued', 'partially_received'].includes(purchaseOrder.status)) {
            return res.status(400).json({ 
                error: 'GRN can only be created for approved or issued purchase orders',
                currentStatus: purchaseOrder.status
            });
        }

        const payloadItems = Array.isArray(req.body.lines) ? req.body.lines : [];
        const items = payloadItems.map((line) => ({
            ...(mongoose.Types.ObjectId.isValid(line.variant_id) ? { item_id: line.variant_id } : {}),
            quantity_received: Number(line.quantity || 0),
            location_id: line.location_id || '',
        }));

        const grn = new GRN({
            tenant_id,
            grn_number: req.body.grn_number,
            purchase_order_id: req.body.purchase_order_id,
            received_date: req.body.received_date || new Date(),
            received_by: req.user.id,
            items,
            notes: req.body.notes || '',
        });

        await grn.save();

        // Update PO status based on received quantities
        const totalOrdered = purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const totalReceived = items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
        
        if (totalReceived >= totalOrdered) {
            purchaseOrder.status = 'received';
        } else {
            purchaseOrder.status = 'partially_received';
        }
        
        await purchaseOrder.save();

        res.status(201).json(grn);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create GRN', detail: err.message });
    }
});

module.exports = router;
