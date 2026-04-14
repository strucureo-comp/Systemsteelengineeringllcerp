const express = require('express');
const router = express.Router();
const {
    Item,
    Warehouse,
    StockBalance,
    InventoryTransaction,
    CostLayer
} = require('../models/Inventory');
const { JournalEntry, Account } = require('../models/Finance');
const { auth } = require('../middleware/auth');

router.use(auth);

// ── ITEM MASTER ──────────────────────────────────────────────────────────────
router.get('/items', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/items', async (req, res) => {
    try {
        const item = new Item(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── WAREHOUSES ──────────────────────────────────────────────────────────────
router.get('/warehouses', async (req, res) => {
    try {
        const warehouses = await Warehouse.find();
        res.json(warehouses);
    } catch (err) {
        res.status(500).json({ message: err.message });
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
        reference_no,
        user
    } = req.body;

    try {
        const item = await Item.findById(item_id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const tx_id = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 1. Record Transaction
        const tx = new InventoryTransaction({
            transaction_id: tx_id,
            type,
            item_id,
            source_warehouse: source_warehouse_id,
            destination_warehouse: dest_warehouse_id,
            quantity,
            unit_cost: unit_cost || item.last_purchase_price,
            total_value: (unit_cost || item.last_purchase_price) * quantity,
            reference_no,
            posted_by: user
        });

        // 2. Update Balances
        if (source_warehouse_id) {
            await updateBalance(item_id, source_warehouse_id, -quantity);
        }
        if (dest_warehouse_id) {
            await updateBalance(item_id, dest_warehouse_id, quantity);
        }

        // 3. FIFO / Cost Layer Logic (Simplified for now)
        if (type === 'GRN') {
            const layer = new CostLayer({
                item_id,
                warehouse_id: dest_warehouse_id,
                original_qty: quantity,
                remaining_qty: quantity,
                unit_cost: unit_cost,
                received_date: new Date(),
                transaction_id: tx._id
            });
            await layer.save();
        }

        await tx.save();

        // 4. Trigger Journal Entry (Optional - if Finance enabled)
        if (['sale', 'issue_to_site', 'waste'].includes(type)) {
            // Recognize COGS
            // Generate Journal Entry logic here...
        }

        res.status(201).json(tx);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── UTILITIES ────────────────────────────────────────────────────────────────
async function updateBalance(itemId, warehouseId, qtyDelta) {
    const balance = await StockBalance.findOne({ item_id: itemId, warehouse_id: warehouseId });
    if (balance) {
        balance.on_hand += qtyDelta;
        balance.available = balance.on_hand - balance.allocated;
        await balance.save();
    } else {
        const newBalance = new StockBalance({
            item_id: itemId,
            warehouse_id: warehouseId,
            on_hand: qtyDelta,
            available: qtyDelta
        });
        await newBalance.save();
    }
}

// ── SUMMARY & ANALYTICS ──────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
    try {
        const skus = await Item.countDocuments();
        const transactions = await InventoryTransaction.find().limit(10).sort({ createdAt: -1 });

        // Aggregate total value
        const balances = await StockBalance.find();
        // Calculate total inventory value using aggregation
        const totalValue = await StockBalance.aggregate([
            { $match: { tenant_id } },
            {
                $lookup: {
                    from: 'items',
                    localField: 'item_id',
                    foreignField: '_id',
                    as: 'item'
                }
            },
            { $unwind: '$item' },
            {
                $project: {
                    value: { $multiply: ['$on_hand', '$wac_cost'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$value' }
                }
            }
        ]);
        const inventoryValue = totalValue.length > 0 ? totalValue[0].total : 0;

        res.json({
            totalValue: inventoryValue,
            total_skus: skus,
            recent_transactions: transactions,
            total_value: totalValue
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
