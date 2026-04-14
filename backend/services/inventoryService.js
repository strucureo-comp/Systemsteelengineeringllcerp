const mongoose = require('mongoose');
const { 
    StockBalance, 
    CostLayer, 
    InventoryTransaction,
    Item,
    ReorderAlert
} = require('../models/Inventory_updated');
const { JournalEntry, Account } = require('../models/Finance');
const { Notification } = require('../models/Notification');
const { getNextSequence } = require('../utils/sequence');

/**
 * FIFO Cost Layer Consumption
 * Consumes stock from oldest layers first and calculates COGS
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 * @param {Number} qty - Quantity to consume
 * @param {Object} session - MongoDB session for transaction
 * @returns {Object} { totalCOGS, layersConsumed: [{ layer_id, qty_consumed, unit_cost, cost_amount }] }
 */
async function consumeFIFO(tenant_id, item_id, warehouse_id, qty, session = null) {
    // 1. Check available stock
    const balance = await StockBalance.findOne({
        tenant_id,
        item_id,
        warehouse_id
    }).session(session);

    if (!balance || balance.available < qty) {
        const available = balance ? balance.available : 0;
        throw new Error(`Insufficient stock. Available: ${available}, Requested: ${qty}`);
    }

    // 2. Fetch cost layers sorted by received_date ASC (oldest first)
    const layers = await CostLayer.find({
        tenant_id,
        item_id,
        warehouse_id,
        is_exhausted: false,
        remaining_qty: { $gt: 0 }
    })
    .sort({ received_date: 1 })
    .session(session);

    if (layers.length === 0) {
        throw new Error('No cost layers found for FIFO consumption');
    }

    // 3. Consume from layers
    let remainingQty = qty;
    let totalCOGS = 0;
    const layersConsumed = [];

    for (const layer of layers) {
        if (remainingQty <= 0) break;

        const qtyToConsume = Math.min(layer.remaining_qty, remainingQty);
        const costAmount = qtyToConsume * layer.unit_cost;

        // Update layer
        layer.remaining_qty -= qtyToConsume;
        if (layer.remaining_qty === 0) {
            layer.is_exhausted = true;
        }
        await layer.save({ session });

        // Track consumption
        layersConsumed.push({
            layer_id: layer._id,
            qty_consumed: qtyToConsume,
            unit_cost: layer.unit_cost,
            cost_amount: costAmount
        });

        totalCOGS += costAmount;
        remainingQty -= qtyToConsume;
    }

    if (remainingQty > 0) {
        throw new Error(`Could not consume full quantity. Remaining: ${remainingQty}`);
    }

    return {
        totalCOGS,
        layersConsumed
    };
}

/**
 * Atomic Stock Balance Update
 * Uses findOneAndUpdate with $inc to prevent race conditions
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 * @param {Number} qtyDelta - Positive for IN, negative for OUT
 * @param {Number} allocatedDelta - Change in allocated quantity
 * @param {Object} session - MongoDB session for transaction
 * @returns {Object} Updated stock balance
 */
async function updateStockBalance(tenant_id, item_id, warehouse_id, qtyDelta, allocatedDelta = 0, session = null) {
    const update = {
        $inc: {
            on_hand: qtyDelta,
            allocated: allocatedDelta
        },
        $set: {
            last_updated: new Date()
        }
    };

    // Calculate available (on_hand - allocated) after update
    const balance = await StockBalance.findOneAndUpdate(
        { tenant_id, item_id, warehouse_id },
        update,
        { 
            upsert: true, 
            new: true,
            session,
            runValidators: true
        }
    );

    // Recalculate available
    balance.available = balance.on_hand - balance.allocated;
    await balance.save({ session });

    return balance;
}

/**
 * Recalculate Weighted Average Cost
 * Called after receiving new stock
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 * @param {Number} newQty
 * @param {Number} newUnitCost
 * @param {Object} session
 */
async function recalculateWAC(tenant_id, item_id, warehouse_id, newQty, newUnitCost, session = null) {
    const balance = await StockBalance.findOne({
        tenant_id,
        item_id,
        warehouse_id
    }).session(session);

    if (!balance) {
        // First receipt - WAC is just the new cost
        return newUnitCost;
    }

    const oldValue = balance.on_hand * balance.wac_cost;
    const newValue = newQty * newUnitCost;
    const totalQty = balance.on_hand + newQty;

    const newWAC = totalQty > 0 ? (oldValue + newValue) / totalQty : 0;

    balance.wac_cost = newWAC;
    balance.total_value = balance.on_hand * newWAC;
    await balance.save({ session });

    return newWAC;
}

/**
 * Record Inventory Transaction
 * Creates transaction record in the inventory ledger
 * 
 * @param {Object} data - Transaction data
 * @param {Object} session - MongoDB session
 * @returns {Object} Created transaction
 */
async function recordTransaction(data, session = null) {
    const {
        tenant_id,
        type,
        item_id,
        warehouse_id,
        destination_warehouse_id,
        qty,
        unit_cost,
        reference_type,
        reference_id,
        reference_number,
        posted_by,
        notes,
        fifo_layers_consumed = []
    } = data;

    // Generate transaction ID
    const transaction_id = await getNextSequence('inventory_transaction', tenant_id);

    const transaction = new InventoryTransaction({
        tenant_id,
        transaction_id,
        type,
        item_id,
        warehouse_id,
        destination_warehouse_id,
        qty,
        unit_cost,
        total_cost: Math.abs(qty) * unit_cost,
        cogs_amount: fifo_layers_consumed.reduce((sum, layer) => sum + layer.cost_amount, 0),
        reference_type,
        reference_id,
        reference_number,
        posting_date: new Date(),
        posted_by,
        notes,
        fifo_layers_consumed
    });

    await transaction.save({ session });
    return transaction;
}

/**
 * Allocate Stock for Sales Order
 * Reserves stock without removing it from on_hand
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 * @param {Number} qty
 * @param {Object} session
 */
async function allocateStock(tenant_id, item_id, warehouse_id, qty, session = null) {
    const balance = await StockBalance.findOne({
        tenant_id,
        item_id,
        warehouse_id
    }).session(session);

    if (!balance || balance.available < qty) {
        const available = balance ? balance.available : 0;
        throw new Error(`Cannot allocate. Available: ${available}, Requested: ${qty}`);
    }

    // Atomic update
    await StockBalance.findOneAndUpdate(
        { tenant_id, item_id, warehouse_id },
        {
            $inc: { allocated: qty },
            $set: { last_updated: new Date() }
        },
        { session }
    );

    // Update available
    balance.allocated += qty;
    balance.available = balance.on_hand - balance.allocated;
    await balance.save({ session });
}

/**
 * Release Stock Allocation
 * Unreserves stock (e.g., when sales order is cancelled)
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 * @param {Number} qty
 * @param {Object} session
 */
async function releaseAllocation(tenant_id, item_id, warehouse_id, qty, session = null) {
    await StockBalance.findOneAndUpdate(
        { tenant_id, item_id, warehouse_id },
        {
            $inc: { allocated: -qty },
            $set: { last_updated: new Date() }
        },
        { session }
    );
}

/**
 * Convert Allocation to Shipment
 * Reduces both allocated and on_hand when goods are shipped
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 * @param {Number} qty
 * @param {Object} session
 */
async function convertAllocationToShipment(tenant_id, item_id, warehouse_id, qty, session = null) {
    const balance = await StockBalance.findOne({
        tenant_id,
        item_id,
        warehouse_id
    }).session(session);

    if (!balance || balance.allocated < qty) {
        throw new Error(`Insufficient allocated stock. Allocated: ${balance?.allocated || 0}, Requested: ${qty}`);
    }

    // Atomic update - reduce both on_hand and allocated
    await StockBalance.findOneAndUpdate(
        { tenant_id, item_id, warehouse_id },
        {
            $inc: { 
                on_hand: -qty,
                allocated: -qty
            },
            $set: { last_updated: new Date() }
        },
        { session }
    );
}

/**
 * Check Reorder Point and Create Alert
 * Called after every stock OUT transaction
 * 
 * @param {String} tenant_id
 * @param {ObjectId} item_id
 * @param {ObjectId} warehouse_id
 */
async function checkReorderPoint(tenant_id, item_id, warehouse_id) {
    const balance = await StockBalance.findOne({
        tenant_id,
        item_id,
        warehouse_id
    }).populate('item_id');

    if (!balance || !balance.item_id) return;

    const item = balance.item_id;

    // Check if below reorder point
    if (balance.available <= item.reorder_point) {
        // Check if alert already exists
        const existingAlert = await ReorderAlert.findOne({
            tenant_id,
            item_id,
            warehouse_id,
            status: { $in: ['active', 'acknowledged', 'po_created'] }
        });

        if (existingAlert) {
            // Update existing alert
            existingAlert.current_qty = balance.available;
            await existingAlert.save();
            return;
        }

        // Create new alert
        const alert = new ReorderAlert({
            tenant_id,
            item_id,
            warehouse_id,
            current_qty: balance.available,
            reorder_point: item.reorder_point,
            reorder_qty: item.reorder_qty || item.reorder_point * 2,
            status: 'active'
        });

        await alert.save();

        // Create notification for procurement team
        // Find procurement managers (users with procurement module access)
        const Role = require('../models/Role');
        const User = require('../models/User');
        
        const procurementRoles = await Role.find({
            tenant_id,
            'permissions': {
                $elemMatch: {
                    module: 'procurement',
                    create: true
                }
            }
        });
        
        const roleNames = procurementRoles.map(r => r.name);
        const procurementUsers = await User.find({
            tenant_id,
            role: { $in: roleNames },
            is_active: true
        });
        
        const message = `Item ${item.sku} - ${item.name} in warehouse is below reorder point. Available: ${balance.available}. Reorder qty: ${alert.reorder_qty}`;

        // Create notification for each procurement user
        const notificationPromises = procurementUsers.map(user => 
            Notification.create({
                tenant_id,
                user_id: user._id,
                type: 'warning',
                priority: 'high',
            title: 'Low Stock Alert',
            message,
            reference_type: 'reorder_alert',
            reference_id: alert._id
        });

        console.log(`[REORDER ALERT] ${message}`);
    }
}

/**
 * Post Inventory Transaction to Finance
 * Creates journal entry for inventory value changes
 * 
 * @param {Object} transaction - InventoryTransaction
 * @param {String} journalType - 'cogs' | 'adjustment' | 'receipt'
 * @param {Object} session
 */
async function postToFinance(transaction, journalType, session = null) {
    const item = await Item.findById(transaction.item_id).session(session);
    if (!item) throw new Error('Item not found');

    let lines = [];
    let description = '';

    switch (journalType) {
        case 'cogs':
            // Sales issue - recognize COGS
            // DR: COGS, CR: Inventory Asset
            description = `COGS for ${item.name} - ${transaction.reference_number}`;
            lines = [
                {
                    account_code: item.cogs_account || '5000',
                    debit: transaction.cogs_amount,
                    credit: 0,
                    description
                },
                {
                    account_code: item.inventory_account || '1200',
                    debit: 0,
                    credit: transaction.cogs_amount,
                    description
                }
            ];
            break;

        case 'receipt':
            // GRN - increase inventory asset
            // DR: Inventory Asset, CR: GRN Clearing / Accounts Payable
            description = `Inventory receipt - ${item.name} - ${transaction.reference_number}`;
            lines = [
                {
                    account_code: item.inventory_account || '1200',
                    debit: transaction.total_cost,
                    credit: 0,
                    description
                },
                {
                    account_code: '2000', // Accounts Payable
                    debit: 0,
                    credit: transaction.total_cost,
                    description
                }
            ];
            break;

        case 'adjustment':
            // Stock adjustment
            if (transaction.qty > 0) {
                // Positive adjustment: DR Inventory, CR Adjustment Income
                description = `Inventory adjustment (increase) - ${item.name}`;
                lines = [
                    {
                        account_code: item.inventory_account || '1200',
                        debit: transaction.total_cost,
                        credit: 0,
                        description
                    },
                    {
                        account_code: '4200', // Other Income
                        debit: 0,
                        credit: transaction.total_cost,
                        description
                    }
                ];
            } else {
                // Negative adjustment: DR Adjustment Expense, CR Inventory
                description = `Inventory adjustment (decrease) - ${item.name}`;
                lines = [
                    {
                        account_code: '5900', // Miscellaneous Expense
                        debit: transaction.total_cost,
                        credit: 0,
                        description
                    },
                    {
                        account_code: item.inventory_account || '1200',
                        debit: 0,
                        credit: transaction.total_cost,
                        description
                    }
                ];
            }
            break;

        default:
            throw new Error(`Unknown journal type: ${journalType}`);
    }

    // Create journal entry
    const entryNumber = await getNextSequence('journal_entry', transaction.tenant_id);
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    const journalEntry = new JournalEntry({
        tenant_id: transaction.tenant_id,
        entry_number: entryNumber,
        date: transaction.posting_date,
        reference: transaction.reference_number,
        description,
        lines,
        status: 'posted',
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: transaction.posted_by
    });

    await journalEntry.save({ session });

    // Link journal entry to transaction
    transaction.journal_entry_id = journalEntry._id;
    transaction.is_posted_to_finance = true;
    await transaction.save({ session });

    return journalEntry;
}

module.exports = {
    consumeFIFO,
    updateStockBalance,
    recalculateWAC,
    recordTransaction,
    allocateStock,
    releaseAllocation,
    convertAllocationToShipment,
    checkReorderPoint,
    postToFinance
};
