const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const connectDB = require('../config/db');

async function seed() {
    try {
        await connectDB();
        console.log('Connected to MongoDB.');

        const tenantId = 'tenant_1';

        // 1. Create Roles
        console.log('Creating Phase 2 roles...');
        
        const rolesData = [
            {
                name: 'Sales Rep',
                permissions: [
                    { module: 'sales', view: true, create: true, edit: false },
                    { module: 'crm', view: true, create: true, edit: true },
                    { module: 'inventory', view: true, create: false, edit: false }
                ]
            },
            {
                name: 'Sales Manager',
                permissions: [
                    { module: 'sales', view: true, create: true, edit: true },
                    { module: 'crm', view: true, create: true, edit: true },
                    { module: 'inventory', view: true, create: false, edit: false }
                ]
            },
            {
                name: 'Purchasing Agent',
                permissions: [
                    { module: 'procurement', view: true, create: true, edit: true },
                    { module: 'inventory', view: true, create: false, edit: false }
                ]
            },
            {
                name: 'Warehouse Staff',
                permissions: [
                    { module: 'inventory', view: true, create: true, edit: true },
                    { module: 'procurement', view: true, create: false, edit: false },
                    { module: 'sales', view: true, create: false, edit: false }
                ]
            },
            {
                name: 'Machine Operator',
                permissions: [
                    { module: 'manufacturing', view: true, create: true, edit: true },
                    { module: 'inventory', view: true, create: false, edit: false }
                ]
            },
            {
                name: 'Finance Manager',
                permissions: [
                    { module: 'finance', view: true, create: true, edit: true },
                    { module: 'sales', view: true, create: true, edit: true },
                    { module: 'procurement', view: true, create: true, edit: true },
                    { module: 'settings', view: true, create: false, edit: false }
                ]
            },
            {
                name: 'HR Manager',
                permissions: [
                    { module: 'hrms', view: true, create: true, edit: true }
                ]
            },
            {
                name: 'Vendor',
                permissions: [
                    { module: 'procurement', view: true, create: false, edit: false }
                ]
            }
        ];

        for (const rd of rolesData) {
            await Role.findOneAndUpdate(
                { tenant_id: tenantId, name: rd.name },
                { ...rd, tenant_id: tenantId, isCustom: true },
                { upsert: true, new: true }
            );
        }

        // 2. Create Users
        console.log('Creating Phase 2 users...');
        const usersData = [
            { email: 'sales@systemsteel.com', full_name: 'User_Sales', role: 'Sales Rep' },
            { email: 'salesmgr@systemsteel.com', full_name: 'User_SalesMgr', role: 'Sales Manager' },
            { email: 'buyer@systemsteel.com', full_name: 'User_Buyer', role: 'Purchasing Agent' },
            { email: 'warehouse@systemsteel.com', full_name: 'User_Warehouse', role: 'Warehouse Staff' },
            { email: 'factory@systemsteel.com', full_name: 'User_Factory', role: 'Machine Operator' },
            { email: 'finance@systemsteel.com', full_name: 'User_Finance', role: 'Finance Manager' },
            { email: 'hr@systemsteel.com', full_name: 'User_HR', role: 'HR Manager' },
            { email: 'vendor@systemsteel.com', full_name: 'User_Vendor', role: 'Vendor' }
        ];

        for (const ud of usersData) {
            const existingUser = await User.findOne({ email: ud.email });
            if (existingUser) {
                existingUser.role = ud.role;
                existingUser.full_name = ud.full_name;
                existingUser.password = 'password123'; // This will be hashed by pre-save hook
                await existingUser.save();
            } else {
                await User.create({
                    ...ud,
                    tenant_id: tenantId,
                    password: 'password123',
                    status: 'active'
                });
            }
        }

        console.log('Phase 2 seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
