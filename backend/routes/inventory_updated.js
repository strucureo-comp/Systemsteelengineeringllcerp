const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {
    Item,
    Warehouse,
    StockBalance,
    InventoryTransaction,
    CostLayer,
    StockAdjustment,
    ReorderAlert
} = require('../models/Inventory_updated');
const { JournalEntry } = require('../models/Finance');
const { GRN } = require('../models/Procurement');
const { auth } = require('../middleware/auth');
const { getNextSequence } = require('../utils/sequence');
const {
    consumeFIFO,
    updateStockBalance,
    recalculateWAC,
    recordTransaction,
    allocateStock,
    releaseAllocation,
    convertAllocationToShipment,
    checkReorderPoint,
    postToFinance
} = require('../services/inventoryService');

router.use(auth);

function tenantIdFromReq(req) {
    return req.user?.tenant_id || 'default';
}

// ══════════════════════════════════════════════════════════════════════════════
// ITEM MASTER
// ══════════════════════════════════════════════════════════════════════════════

router.get('/items', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { status, category } = req.query;
        
        const filter = { tenant_id, deleted: false };
        if (status) filter.status = status;
        if (category) filter.category = category;
        
        const items = await Item.find(filter).sort({ sku: 1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch items', detail: err.message });
    }
});

router.get('/items/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const item = await Item.findOne({ _id: req.params.id, tenant_id, deleted: false });
        
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch item', detail: err.message });
    }
});

router.post('/items', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const item = new Item({
            ...req.body,
            tenant_id
        });
        
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'SKU already exists' });
        }
        res.status(400).json({ error: 'Failed to create item', detail: err.message });
    }
});

router.put('/items/:id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const item = await Item.findOneAndUpdate(
            { _id: req.params.id, tenant_id, deleted: false },
            { ...req.body, tenant_id },
            { new: true, runValidators: true }
        );
        
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        res.json(item);
    } catch (err) {
        res.status(400).json({ error: 'Failed to update item', detail: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// WAREHOUSES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/warehouses', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const warehouses = await Warehouse.find({ tenant_id, deleted: false, is_active: true });
        res.json(warehouses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch warehouses', detail: err.message });
    }
});

router.post('/warehouses', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const warehouse = new Warehouse({
            ...req.body,
            tenant_id
        });
        
        await warehouse.save();
        res.status(201).json(warehouse);
    } catch (err) {
        res.status(400).json({ error: 'Failed to create warehouse', detail: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// STOCK BALANCES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/stock-balances', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { warehouse_id, item_id, low_stock } = req.query;
        
        const filter = { tenant_id };
        if (warehouse_id) filter.warehouse_id = warehouse_id;
        if (item_id) filter.item_id = item_id;
        if (low_stock === 'true') filter.available = { $lte: 0 };
        
        const balances = await StockBalance.find(filter)
            .populate('item_id', 'sku name uom_base reorder_point')
            .populate('warehouse_id', 'code name')
            .sort({ 'item_id.sku': 1 });
        
        res.json(balances);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stock balances', detail: err.message });
    }
});

router.get('/stock-balances/:item_id/:warehouse_id', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const balance = await StockBalance.findOne({
            tenant_id,
            item_id: req.params.item_id,
            warehouse_id: req.params.warehouse_id
        })
        .populate('item_id', 'sku name uom_base')
        .populate('warehouse_id', 'code name');
        
        if (!balance) {
            return res.json({
                on_hand: 0,
                allocated: 0,
                available: 0,
                wac_cost: 0
            });
        }
        
        res.json(balance);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stock balance', detail: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// GRN (GOODS RECEIPT NOTE) - STOCK IN
// ══════════════════════════════════════════════════════════════════════════════

router.post('/grn/:grn_id/post', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const tenant_id = tenantIdFromReq(req);
        const grn = await GRN.findOne({ _id: req.params.grn_id, tenant_id }).session(session);
        
        if (!grn) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'GRN not found' });
        }
        
        if (grn.status === 'posted') {
            await session.abortTransaction();
            return res.status(400).json({ error: 'GRN already posted' });
        }
        
        const transactions = [];
        const costLayers = [];
        
        // Process each line item
        for (const line of grn.items) {
            const item_id = line.item_id;
            const warehouse_id = grn.warehouse_id || req.body.warehouse_id;
            const qty = line.quantity_received;
            const unit_cost = line.unit_cost || 0;
            
            if (!item_id || !warehouse_id || qty <= 0) {
                continue; // Skip invalid lines
            }
            
            // 1. Create cost layer (FIFO)
            const costLayer = new CostLayer({
                tenant_id,
                item_id,
                warehouse_id,
                original_qty: qty,
                remaining_qty: qty,
                unit_cost,
                received_date: grn.received_date || new Date(),
                grn_id: grn._id
            });
            
            await costLayer.save({ session });
            costLayers.push(costLayer);
            
            // 2. Update stock balance (ATOMIC)
            await updateStockBalance(tenant_id, item_id, warehouse_id, qty, 0, session);
            
            // 3. Recalculate WAC
            await recalculateWAC(tenant_id, item_id, warehouse_id, qty, unit_cost, session);
            
            // 4. Record transaction
            const transaction = await recordTransaction({
                tenant_id,
                type: 'grn',
                item_id,
                warehouse_id,
                qty,
                unit_cost,
                reference_type: 'grn',
                reference_id: grn._id,
                reference_number: grn.grn_number,
                posted_by: req.user._id,
                notes: `GRN receipt: ${grn.grn_number}`
            }, session);
            
            transactions.push(transaction);
            
            // 5. Post to finance (optional - can be done in batch)
            if (req.body.post_to_finance) {
                await postToFinance(transaction, 'receipt', session);
            }
        }
        
        // Update GRN status
        grn.status = 'posted';
        grn.posted_at = new Date();
        grn.posted_by = req.user._id;
        await grn.save({ session });
        
        await session.commitTransaction();
        
        res.json({
            message: 'GRN posted successfully',
            grn,
            transactions,
            costLayers: costLayers.length
        });
        
    } catch (err) {
        await session.abortTransaction();
        console.error('[GRN POST ERROR]', err);
        res.status(500).json({ error: 'Failed to post GRN', detail: err.message });
    } finally {
        session.endSession();
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// SALES ISSUE - STOCK OUT (WITH FIFO COSTING)
// ══════════════════════════════════════════════════════════════════════════════

router.post('/issue', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const tenant_id = tenantIdFromReq(req);
        const {
            item_id,
            warehouse_id,
            qty,
            reference_type,
            reference_id,
            reference_number,
            notes
        } = req.body;
        
        if (!item_id || !warehouse_id || !qty || qty <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Invalid request data' });
        }
        
        // 1. Consume FIFO layers and calculate COGS
        const { totalCOGS, layersConsumed } = await consumeFIFO(
            tenant_id,
            item_id,
            warehouse_id,
            qty,
            session
        );
        
        // 2. Update stock balance (ATOMIC) - reduce on_hand
        await updateStockBalance(tenant_id, item_id, warehouse_id, -qty, 0, session);
        
        // 3. Record transaction with FIFO layer details
        const avgUnitCost = totalCOGS / qty;
        const transaction = await recordTransaction({
            tenant_id,
            type: 'sales_issue',
            item_id,
            warehouse_id,
            qty: -qty, // Negative for outbound
            unit_cost: avgUnitCost,
            reference_type,
            reference_id,
            reference_number,
            posted_by: req.user._id,
            notes,
            fifo_layers_consumed: layersConsumed
        }, session);
        
        // 4. Post COGS to finance
        const journalEntry = await postToFinance(transaction, 'cogs', session);
        
        // 5. Check reorder point (after transaction commits)
        await session.commitTransaction();
        
        // Check reorder point outside transaction
        await checkReorderPoint(tenant_id, item_id, warehouse_id);
        
        res.json({
            message: 'Stock issued successfully',
            transaction,
            totalCOGS,
            layersConsumed,
            journalEntry
        });
        
    } catch (err) {
        await session.abortTransaction();
        console.error('[STOCK ISSUE ERROR]', err);
        res.status(500).json({ error: 'Failed to issue stock', detail: err.message });
    } finally {
        session.endSession();
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// STOCK ALLOCATION (FOR SALES ORDERS)
// ══════════════════════════════════════════════════════════════════════════════

router.post('/allocate', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const tenant_id = tenantIdFromReq(req);
        const { item_id, warehouse_id, qty, sales_order_id } = req.body;
        
        if (!item_id || !warehouse_id || !qty || qty <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Invalid request data' });
        }
        
        await allocateStock(tenant_id, item_id, warehouse_id, qty, session);
        
        await session.commitTransaction();
        
        res.json({
            message: 'Stock allocated successfully',
            item_id,
            warehouse_id,
            qty,
            sales_order_id
        });
        
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to allocate stock', detail: err.message });
    } finally {
        session.endSession();
    }
});

router.post('/release-allocation', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const tenant_id = tenantIdFromReq(req);
        const { item_id, warehouse_id, qty } = req.body;
        
        await releaseAllocation(tenant_id, item_id, warehouse_id, qty, session);
        
        await session.commitTransaction();
        
        res.json({
            message: 'Allocation released successfully',
            item_id,
            warehouse_id,
            qty
        });
        
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to release allocation', detail: err.message });
    } finally {
        session.endSession();
    }
});

router.post('/ship-allocated', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const tenant_id = tenantIdFromReq(req);
        const {
            item_id,
            warehouse_id,
            qty,
            reference_type,
            reference_id,
            reference_number
        } = req.body;
        
        // 1. Consume FIFO and calculate COGS
        const { totalCOGS, layersConsumed } = await consumeFIFO(
            tenant_id,
            item_id,
            warehouse_id,
            qty,
            session
        );
        
        // 2. Convert allocation to shipment (reduces both allocated and on_hand)
        await convertAllocationToShipment(tenant_id, item_id, warehouse_id, qty, session);
        
        // 3. Record transaction
        const avgUnitCost = totalCOGS / qty;
        const transaction = await recordTransaction({
            tenant_id,
            type: 'sales_issue',
            item_id,
            warehouse_id,
            qty: -qty,
            unit_cost: avgUnitCost,
            reference_type,
            reference_id,
            reference_number,
            posted_by: req.user._id,
            notes: 'Shipment from allocated stock',
            fifo_layers_consumed: layersConsumed
        }, session);
        
        // 4. Post COGS to finance
        const journalEntry = await postToFinance(transaction, 'cogs', session);
        
        await session.commitTransaction();
        
        // Check reorder point
        await checkReorderPoint(tenant_id, item_id, warehouse_id);
        
        res.json({
            message: 'Allocated stock shipped successfully',
            transaction,
            totalCOGS,
            journalEntry
        });
        
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to ship allocated stock', detail: err.message });
    } finally {
        session.endSession();
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT
// ══════════════════════════════════════════════════════════════════════════════

router.get('/adjustments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { status } = req.query;
        
        const filter = { tenant_id };
        if (status) filter.status = status;
        
        const adjustments = await StockAdjustment.find(filter)
            .populate('item_id', 'sku name')
            .populate('warehouse_id', 'code name')
            .populate('created_by', 'full_name email')
            .sort({ createdAt: -1 });
        
        res.json(adjustments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch adjustments', detail: err.message });
    }
});

router.post('/adjustments', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const {
            item_id,
            warehouse_id,
            adjustment_qty,
            reason_code,
            reason_detail,
            unit_cost
        } = req.body;
        
        if (!item_id || !warehouse_id || adjustment_qty === 0) {
            return res.status(400).json({ error: 'Invalid adjustment data' });
        }
        
        // Get current balance
        const balance = await StockBalance.findOne({ tenant_id, item_id, warehouse_id });
        const before_qty = balance ? balance.on_hand : 0;
        const after_qty = before_qty + adjustment_qty;
        
        // Get item for costing
        const item = await Item.findById(item_id);
        const adjustmentUnitCost = unit_cost || balance?.wac_cost || item?.standard_cost || 0;
        const total_value_change = Math.abs(adjustment_qty) * adjustmentUnitCost;
        
        // Generate adjustment number
        const adjustment_number = await getNextSequence('stock_adjustment', tenant_id);
        
        // Check if approval required (configurable threshold)
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ 
            tenant_id: req.user.tenant_id, 
            key: 'inventory_adjustment_approval_threshold' 
        });
        const approval_threshold = settings?.value || 100;
        const requires_approval = Math.abs(adjustment_qty) > approval_threshold;
        
        const adjustment = new StockAdjustment({
            tenant_id,
            adjustment_number,
            item_id,
            warehouse_id,
            adjustment_qty,
            reason_code,
            reason_detail,
            before_qty,
            after_qty,
            unit_cost: adjustmentUnitCost,
            total_value_change,
            status: requires_approval ? 'pending_approval' : 'approved',
            requires_approval,
            approval_threshold,
            created_by: req.user._id
        });
        
        await adjustment.save();
        
        // If no approval required, post immediately
        if (!requires_approval) {
            await postAdjustment(adjustment, req.user._id);
        }
        
        res.status(201).json(adjustment);
        
    } catch (err) {
        res.status(400).json({ error: 'Failed to create adjustment', detail: err.message });
    }
});

router.post('/adjustments/:id/approve', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const adjustment = await StockAdjustment.findOne({
            _id: req.params.id,
            tenant_id
        });
        
        if (!adjustment) {
            return res.status(404).json({ error: 'Adjustment not found' });
        }
        
        if (adjustment.status !== 'pending_approval') {
            return res.status(400).json({ error: 'Adjustment not pending approval' });
        }
        
        adjustment.status = 'approved';
        adjustment.approved_by = req.user._id;
        adjustment.approved_at = new Date();
        await adjustment.save();
        
        // Post the adjustment
        await postAdjustment(adjustment, req.user._id);
        
        res.json({
            message: 'Adjustment approved and posted',
            adjustment
        });
        
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve adjustment', detail: err.message });
    }
});

async function postAdjustment(adjustment, posted_by) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const tenant_id = adjustment.tenant_id;
        
        // 1. Update stock balance (ATOMIC)
        await updateStockBalance(
            tenant_id,
            adjustment.item_id,
            adjustment.warehouse_id,
            adjustment.adjustment_qty,
            0,
            session
        );
        
        // 2. Record transaction
        const transaction = await recordTransaction({
            tenant_id,
            type: 'adjustment',
            item_id: adjustment.item_id,
            warehouse_id: adjustment.warehouse_id,
            qty: adjustment.adjustment_qty,
            unit_cost: adjustment.unit_cost,
            reference_type: 'adjustment',
            reference_id: adjustment._id,
            reference_number: adjustment.adjustment_number,
            posted_by,
            notes: `${adjustment.reason_code}: ${adjustment.reason_detail || ''}`
        }, session);
        
        // 3. Post to finance
        const journalEntry = await postToFinance(transaction, 'adjustment', session);
        
        // 4. Update adjustment
        adjustment.status = 'posted';
        adjustment.posted_by = posted_by;
        adjustment.posted_at = new Date();
        adjustment.transaction_id = transaction._id;
        adjustment.journal_entry_id = journalEntry._id;
        await adjustment.save({ session });
        
        await session.commitTransaction();
        
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// REORDER ALERTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reorder-alerts', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { status } = req.query;
        
        const filter = { tenant_id };
        if (status) filter.status = status;
        
        const alerts = await ReorderAlert.find(filter)
            .populate('item_id', 'sku name reorder_point reorder_qty')
            .populate('warehouse_id', 'code name')
            .sort({ createdAt: -1 });
        
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reorder alerts', detail: err.message });
    }
});

router.patch('/reorder-alerts/:id/acknowledge', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const alert = await ReorderAlert.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            {
                status: 'acknowledged',
                acknowledged_by: req.user._id,
                acknowledged_at: new Date()
            },
            { new: true }
        );
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json(alert);
    } catch (err) {
        res.status(500).json({ error: 'Failed to acknowledge alert', detail: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY TRANSACTIONS (LEDGER)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/transactions', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { item_id, warehouse_id, type, start_date, end_date } = req.query;
        
        const filter = { tenant_id };
        if (item_id) filter.item_id = item_id;
        if (warehouse_id) filter.warehouse_id = warehouse_id;
        if (type) filter.type = type;
        if (start_date || end_date) {
            filter.posting_date = {};
            if (start_date) filter.posting_date.$gte = new Date(start_date);
            if (end_date) filter.posting_date.$lte = new Date(end_date);
        }
        
        const transactions = await InventoryTransaction.find(filter)
            .populate('item_id', 'sku name')
            .populate('warehouse_id', 'code name')
            .populate('posted_by', 'full_name email')
            .sort({ posting_date: -1 })
            .limit(100);
        
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions', detail: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// COST LAYERS (FIFO)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/cost-layers', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { item_id, warehouse_id, active_only } = req.query;
        
        const filter = { tenant_id };
        if (item_id) filter.item_id = item_id;
        if (warehouse_id) filter.warehouse_id = warehouse_id;
        if (active_only === 'true') {
            filter.is_exhausted = false;
            filter.remaining_qty = { $gt: 0 };
        }
        
        const layers = await CostLayer.find(filter)
            .populate('item_id', 'sku name')
            .populate('warehouse_id', 'code name')
            .sort({ received_date: 1 });
        
        res.json(layers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cost layers', detail: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/summary', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const [
            totalItems,
            totalWarehouses,
            lowStockCount,
            reorderAlertsCount,
            totalInventoryValue
        ] = await Promise.all([
            Item.countDocuments({ tenant_id, deleted: false, status: 'active' }),
            Warehouse.countDocuments({ tenant_id, deleted: false, is_active: true }),
            StockBalance.countDocuments({ tenant_id, available: { $lte: 0 } }),
            ReorderAlert.countDocuments({ tenant_id, status: 'active' }),
            StockBalance.aggregate([
                { $match: { tenant_id } },
                { $group: { _id: null, total: { $sum: '$total_value' } } }
            ])
        ]);
        
        res.json({
            totalItems,
            totalWarehouses,
            lowStockCount,
            reorderAlertsCount,
            totalInventoryValue: totalInventoryValue[0]?.total || 0
        });
        
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch summary', detail: err.message });
    }
});

module.exports = router;
