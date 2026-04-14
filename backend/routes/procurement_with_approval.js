const express = require('express');
const router = express.Router();
const { PurchaseRequest, PurchaseOrder, GRN, RFQ } = require('../models/Procurement');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { tenantGuard, ensureTenantFilter, attachTenantId } = require('../middleware/tenantGuard');
const { submitForApproval } = require('../services/approvalEngine');
const { getNextNumber } = require('../utils/sequence');

// ============================================================================
// PURCHASE ORDERS WITH APPROVAL WORKFLOW
// ============================================================================

/**
 * GET /api/procurement/orders
 * List all purchase orders
 */
router.get('/orders', 
    auth, 
    requirePermission('procurement', 'view'),
    ensureTenantFilter,
    async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || 'default';
            const { status } = req.query;
            
            const query = { tenant_id };
            if (status) query.status = status;
            
            const orders = await PurchaseOrder.find(query)
                .populate('vendor_id', 'legal_name contact_person email')
                .populate('created_by', 'full_name email')
                .sort({ createdAt: -1 })
                .limit(100);
            
            res.json({
                success: true,
                data: orders,
                count: orders.length
            });
            
        } catch (error) {
            console.error('[Procurement API] Get orders error:', error);
            res.status(500).json({ 
                error: 'Failed to fetch purchase orders' 
            });
        }
    }
);

/**
 * GET /api/procurement/orders/:id
 * Get single purchase order
 */
router.get('/orders/:id', 
    auth, 
    requirePermission('procurement', 'view'),
    tenantGuard(PurchaseOrder),
    async (req, res) => {
        try {
            const order = await PurchaseOrder.findById(req.params.id)
                .populate('vendor_id', 'legal_name contact_person email phone address')
                .populate('created_by', 'full_name email')
                .populate('lines.item_id', 'sku name');
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            res.json({
                success: true,
                data: order
            });
            
        } catch (error) {
            console.error('[Procurement API] Get order error:', error);
            res.status(500).json({ 
                error: 'Failed to fetch purchase order' 
            });
        }
    }
);

/**
 * POST /api/procurement/orders
 * Create new purchase order (draft)
 */
router.post('/orders', 
    auth, 
    requirePermission('procurement', 'create'),
    attachTenantId,
    async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || 'default';
            
            // Generate PO number
            const po_number = await getNextNumber(
                tenant_id,
                'purchase_order',
                'PO',
                4,
                true
            );
            
            // Create PO in draft status
            const po = await PurchaseOrder.create({
                ...req.body,
                tenant_id,
                po_number,
                status: 'draft',
                created_by: req.user._id
            });
            
            res.status(201).json({
                success: true,
                data: po,
                message: 'Purchase order created in draft'
            });
            
        } catch (error) {
            console.error('[Procurement API] Create order error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to create purchase order' 
            });
        }
    }
);

/**
 * PUT /api/procurement/orders/:id
 * Update purchase order (only if draft)
 */
router.put('/orders/:id', 
    auth, 
    requirePermission('procurement', 'edit'),
    tenantGuard(PurchaseOrder),
    async (req, res) => {
        try {
            const order = await PurchaseOrder.findById(req.params.id);
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            if (order.status !== 'draft') {
                return res.status(400).json({ 
                    error: `Cannot edit PO in ${order.status} status. Only draft POs can be edited.` 
                });
            }
            
            // Update fields
            Object.assign(order, req.body);
            await order.save();
            
            res.json({
                success: true,
                data: order,
                message: 'Purchase order updated'
            });
            
        } catch (error) {
            console.error('[Procurement API] Update order error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to update purchase order' 
            });
        }
    }
);

/**
 * POST /api/procurement/orders/:id/submit
 * Submit purchase order for approval
 */
router.post('/orders/:id/submit', 
    auth, 
    requirePermission('procurement', 'create'),
    tenantGuard(PurchaseOrder),
    async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || 'default';
            const order = await PurchaseOrder.findById(req.params.id);
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            if (order.status !== 'draft') {
                return res.status(400).json({ 
                    error: `Cannot submit PO in ${order.status} status` 
                });
            }
            
            // Validate PO has required data
            if (!order.vendor_id || !order.lines || order.lines.length === 0) {
                return res.status(400).json({ 
                    error: 'PO must have vendor and at least one line item' 
                });
            }
            
            // Submit for approval
            const approvalResult = await submitForApproval(
                'purchase_order',
                order._id,
                {
                    document_number: order.po_number,
                    total_amount: order.total_amount,
                    currency: 'AED',
                    vendor_name: order.vendor_id?.legal_name,
                    description: `Purchase Order ${order.po_number}`
                },
                tenant_id,
                req.user._id
            );
            
            if (approvalResult.auto_approved) {
                // No workflow configured - auto approve
                order.status = 'approved';
                await order.save();
                
                return res.json({
                    success: true,
                    auto_approved: true,
                    message: approvalResult.message,
                    data: order
                });
            }
            
            // Update PO status to pending_approval
            order.status = 'pending_approval';
            await order.save();
            
            res.json({
                success: true,
                message: 'Purchase order submitted for approval',
                approval_request: approvalResult.approval_request,
                data: order
            });
            
        } catch (error) {
            console.error('[Procurement API] Submit order error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to submit purchase order' 
            });
        }
    }
);

/**
 * POST /api/procurement/orders/:id/approve
 * Approve purchase order (after approval workflow completes)
 * This is called by approval engine or manually by admin
 */
router.post('/orders/:id/approve', 
    auth, 
    requirePermission('procurement', 'approve'),
    tenantGuard(PurchaseOrder),
    async (req, res) => {
        try {
            const order = await PurchaseOrder.findById(req.params.id);
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            if (order.status !== 'pending_approval') {
                return res.status(400).json({ 
                    error: `Cannot approve PO in ${order.status} status` 
                });
            }
            
            order.status = 'approved';
            await order.save();
            
            res.json({
                success: true,
                message: 'Purchase order approved',
                data: order
            });
            
        } catch (error) {
            console.error('[Procurement API] Approve order error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to approve purchase order' 
            });
        }
    }
);

/**
 * POST /api/procurement/orders/:id/send-to-vendor
 * Send approved PO to vendor
 */
router.post('/orders/:id/send-to-vendor', 
    auth, 
    requirePermission('procurement', 'edit'),
    tenantGuard(PurchaseOrder),
    async (req, res) => {
        try {
            const order = await PurchaseOrder.findById(req.params.id);
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            if (order.status !== 'approved') {
                return res.status(400).json({ 
                    error: 'Only approved POs can be sent to vendor' 
                });
            }
            
            order.status = 'issued';
            await order.save();
            
            // Send email to vendor with PO PDF
            try {
                const emailService = require('../services/emailService');
                const vendor = await Vendor.findById(order.vendor_id);
                if (vendor && vendor.email) {
                    await emailService.sendPurchaseOrderToVendor({
                        to: vendor.email,
                        vendorName: vendor.legal_name,
                        poNumber: order.po_number,
                        poDate: order.createdAt.toISOString().split('T')[0],
                        totalAmount: `${order.currency || 'AED'} ${order.total_amount.toFixed(2)}`,
                        pdfAttachment: null // TODO: Generate PDF attachment
                    });
                }
            } catch (emailError) {
                console.error('[PO] Failed to send vendor email:', emailError.message);
            }
            
            res.json({
                success: true,
                message: 'Purchase order sent to vendor',
                data: order
            });
            
        } catch (error) {
            console.error('[Procurement API] Send to vendor error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to send purchase order' 
            });
        }
    }
);

/**
 * POST /api/procurement/orders/:id/cancel
 * Cancel purchase order
 */
router.post('/orders/:id/cancel', 
    auth, 
    requirePermission('procurement', 'approve'),
    tenantGuard(PurchaseOrder),
    async (req, res) => {
        try {
            const { reason } = req.body;
            const order = await PurchaseOrder.findById(req.params.id);
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            if (['received', 'closed', 'cancelled'].includes(order.status)) {
                return res.status(400).json({ 
                    error: `Cannot cancel PO in ${order.status} status` 
                });
            }
            
            order.status = 'cancelled';
            order.cancellation_reason = reason;
            await order.save();
            
            res.json({
                success: true,
                message: 'Purchase order cancelled',
                data: order
            });
            
        } catch (error) {
            console.error('[Procurement API] Cancel order error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to cancel purchase order' 
            });
        }
    }
);

// ============================================================================
// GRN (GOODS RECEIVED NOTE) - Only for approved POs
// ============================================================================

/**
 * POST /api/procurement/grn
 * Create GRN against approved PO
 */
router.post('/grn', 
    auth, 
    requirePermission('procurement', 'create'),
    attachTenantId,
    async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || 'default';
            const { purchase_order_id } = req.body;
            
            // Validate PO is approved
            const po = await PurchaseOrder.findById(purchase_order_id);
            if (!po) {
                return res.status(404).json({ 
                    error: 'Purchase order not found' 
                });
            }
            
            if (!['approved', 'issued', 'partially_received'].includes(po.status)) {
                return res.status(400).json({ 
                    error: 'GRN can only be created for approved/issued POs' 
                });
            }
            
            // Generate GRN number
            const grn_number = await getNextNumber(
                tenant_id,
                'grn',
                'GRN',
                4,
                true
            );
            
            // Create GRN
            const grn = await GRN.create({
                ...req.body,
                tenant_id,
                grn_number,
                received_by: req.user._id
            });
            
            // Update PO status
            po.status = 'partially_received';
            await po.save();
            
            // Create inventory transactions for received items
            const { InventoryTransaction, StockBalance } = require('../models/Inventory');
            const transactionPromises = grn.items.map(async (item) => {
                // Create inventory transaction
                const transactionId = `GRN-${grn.grn_number}-${Date.now()}`;
                await InventoryTransaction.create({
                    tenant_id: req.user.tenant_id,
                    transaction_id: transactionId,
                    type: 'GRN',
                    reference_no: grn.grn_number,
                    item_id: item.item_id,
                    destination_warehouse: item.location_id,
                    quantity: item.quantity_received,
                    uom: 'pcs',
                    unit_cost: 0, // Get from PO line
                    total_value: 0,
                    currency: po.currency || 'AED',
                    posted_by: req.user.full_name,
                    posted_at: new Date()
                });
                
                // Update stock balance
                await StockBalance.findOneAndUpdate(
                    {
                        tenant_id: req.user.tenant_id,
                        item_id: item.item_id,
                        warehouse_id: item.location_id
                    },
                    {
                        $inc: { on_hand: item.quantity_received }
                    },
                    { upsert: true }
                );
            });
            
            await Promise.all(transactionPromises);
            
            res.status(201).json({
                success: true,
                data: grn,
                message: 'GRN created successfully'
            });
            
        } catch (error) {
            console.error('[Procurement API] Create GRN error:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to create GRN' 
            });
        }
    }
);

module.exports = router;
