const express = require('express');
const router = express.Router();
const {
    Item,
    Warehouse,
    StockBalance,
    InventoryTransaction,
    CostLayer
} = require('../models/Inventory_updated');
const { JournalEntry, Account } = require('../models/Finance');
const { auth } = require('../middleware/auth');

function tenantIdFromReq(req) {
    return req.user?.tenant_id || 'default';
}

router.use(auth);

// ── ITEM MASTER ──────────────────────────────────────────────────────────────
router.get('/items', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const items = await Item.find({ tenant_id });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/items', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const item = new Item({ ...req.body, tenant_id });
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── WAREHOUSES ──────────────────────────────────────────────────────────────
router.get('/warehouses', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const warehouses = await Warehouse.find({ tenant_id });
        res.json(warehouses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/warehouses', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const warehouse = new Warehouse({ ...req.body, tenant_id });
        await warehouse.save();
        res.status(201).json(warehouse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── TRANSACTIONS & MOVEMENTS ─────────────────────────────────────────────────

/**
 * Perform Stock Movement (GRN, Issue, Sale, etc.)
 */
router.post('/move', async (req, res) => {
    const {
        type,
        item_id,
        source_warehouse_id,
        dest_warehouse_id,
        quantity,
        unit_cost,
        reference_no
    } = req.body;

    const tenant_id = tenantIdFromReq(req);

    try {
        const item = await Item.findOne({ _id: item_id, tenant_id });
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const tx_id = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 1. Record Transaction
        const tx = new InventoryTransaction({
            tenant_id,
            transaction_id: tx_id,
            type,
            item_id,
            source_warehouse: source_warehouse_id,
            destination_warehouse: dest_warehouse_id,
            quantity,
            unit_cost: unit_cost || item.last_purchase_price,
            total_value: (unit_cost || item.last_purchase_price) * quantity,
            reference_no,
            posted_by: req.user._id
        });

        // 2. Update Balances
        if (source_warehouse_id) {
            await updateBalance(tenant_id, item_id, source_warehouse_id, -quantity);
        }
        if (dest_warehouse_id) {
            await updateBalance(tenant_id, item_id, dest_warehouse_id, quantity);
        }

        // 3. FIFO / Cost Layer Logic (Simplified for now)
        if (type === 'GRN' && dest_warehouse_id) {
            const layer = new CostLayer({
                tenant_id,
                item_id,
                warehouse_id: dest_warehouse_id,
                original_qty: quantity,
                remaining_qty: quantity,
                unit_cost: unit_cost || item.last_purchase_price,
                received_date: new Date(),
                transaction_id: tx._id
            });
            await layer.save();
        }

        await tx.save();
        res.status(201).json(tx);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper to update balance
async function updateBalance(tenant_id, item_id, warehouse_id, qtyDelta) {
    const balance = await StockBalance.findOneAndUpdate(
        { tenant_id, item_id, warehouse_id },
        { $inc: { on_hand: qtyDelta, available: qtyDelta } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return balance;
}

// Dashboard Summary
router.get('/summary', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const skus = await Item.countDocuments({ tenant_id });
        const transactions = await InventoryTransaction.find({ tenant_id }).sort({ createdAt: -1 }).limit(5);
        
        const balances = await StockBalance.find({ tenant_id });
        const totalValue = balances.reduce((sum, b) => sum + (b.on_hand * b.wac_cost), 0);

        res.json({
            total_skus: skus,
            recent_transactions: transactions,
            total_value: totalValue
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
