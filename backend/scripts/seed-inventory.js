require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Item, Warehouse, StockBalance, InventoryTransaction } = require('../models/Inventory');

const seedInventory = async () => {
    try {
        await connectDB();

        // Clear existing
        await Item.deleteMany({});
        await Warehouse.deleteMany({});
        await StockBalance.deleteMany({});
        await InventoryTransaction.deleteMany({});

        console.log('Clearing existing inventory data...');

        // 1. Warehouses
        const whs = await Warehouse.insertMany([
            { code: 'WH-CENTRAL', name: 'Central Distribution Center', type: 'central', address: 'Jebel Ali, Dubai' },
            { code: 'WH-SITE-01', name: 'Burj Khalifa Renovation Site', type: 'site', address: 'Downtown Dubai' },
            { code: 'WH-TRANSIT', name: 'Transit Hub', type: 'transit' }
        ]);

        console.log('Warehouses created.');

        // 2. Items
        const items = await Item.insertMany([
            {
                sku: 'STL-001',
                name: 'Carbon Steel Plate (6mm)',
                category: 'Raw Material',
                uom_base: 'pcs',
                valuation_method: 'FIFO',
                reorder_level: 50,
                safety_stock: 20,
                last_purchase_price: 185
            },
            {
                sku: 'STL-002',
                name: 'Galvanized Pipe (4")',
                category: 'Raw Material',
                uom_base: 'pcs',
                valuation_method: 'FIFO',
                reorder_level: 100,
                safety_stock: 40,
                last_purchase_price: 320
            },
            {
                sku: 'STL-003',
                name: 'Stainless Flange DN50',
                category: 'Components',
                uom_base: 'pcs',
                valuation_method: 'WAC',
                reorder_level: 30,
                safety_stock: 10,
                last_purchase_price: 95
            },
            {
                sku: 'FIN-001',
                name: 'Prefab Wall Panel A',
                category: 'Finished Goods',
                uom_base: 'pcs',
                valuation_method: 'Standard',
                standard_cost: 2200,
                reorder_level: 5,
                safety_stock: 2
            }
        ]);

        console.log('Items created.');

        // 3. Transactions & Balances
        for (const item of items) {
            const qty = Math.floor(Math.random() * 500) + 50;
            const tx = new InventoryTransaction({
                transaction_id: `TX-GEN-${Date.now()}-${item.sku}`,
                type: 'GRN',
                item_id: item._id,
                destination_warehouse: whs[0]._id,
                quantity: qty,
                unit_cost: item.last_purchase_price || item.standard_cost,
                total_value: (item.last_purchase_price || item.standard_cost) * qty,
                posted_by: 'System Seed'
            });
            await tx.save();

            await new StockBalance({
                item_id: item._id,
                warehouse_id: whs[0]._id,
                on_hand: qty,
                available: qty
            }).save();
        }

        console.log('Seed data successfully inserted.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding inventory:', err);
        process.exit(1);
    }
};

seedInventory();
