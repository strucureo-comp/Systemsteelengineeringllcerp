const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const connectDB = require('../config/db');

// List of all models to clear
const modelsToClear = [
    'ApprovalConfig', 'ApprovalEngine', 'ApprovalRequest', 'ApprovalWorkflow',
    'Attachment', 'BrandingConfig', 'BusinessDocuments', 'CompanyProfile',
    'CRM', 'Currency', 'EmailLog', 'ExchangeRate', 'Finance', 'FinanceConfig',
    'FixedAssets', 'HRMS', 'Inventory', 'InviteToken', 'Manufacturing',
    'Misc', 'ModulesConfig', 'Notification', 'PasswordResetToken', 'Payables',
    'Procurement', 'Project', 'ProjectOps', 'Receivables', 'RefreshToken',
    'Role', 'Sequence', 'Settings', 'StockJournal', 'SupportMeeting',
    'TaxCenter', 'TaxConfiguration', 'User'
];

async function seed() {
    try {
        await connectDB();
        console.log('Connected to MongoDB.');

        console.log('Clearing database...');
        for (const modelName of modelsToClear) {
            try {
                if (mongoose.models[modelName]) {
                    await mongoose.models[modelName].deleteMany({});
                } else {
                     const modelPath = path.join(__dirname, '../models', `${modelName}.js`);
                     try {
                         const Model = require(modelPath);
                         await Model.deleteMany({});
                     } catch (e) {
                         // Some files might be suffixed with _updated, ignore for now in seed script
                     }
                }
            } catch (err) {
                console.warn(`Could not clear ${modelName}:`, err.message);
            }
        }
        
        // Also clear updated models
        try {
            require('../models/Finance_updated').deleteMany({});
            require('../models/HRMS_updated').deleteMany({});
            require('../models/Inventory_updated').deleteMany({});
            require('../models/Receivables_updated').deleteMany({});
        } catch(e){}

        console.log('Database cleared.');

        const tenantId = 'tenant_1';

        // 1. Create Roles
        console.log('Creating roles...');
        const modules = ['finance', 'hrms', 'crm', 'sales', 'procurement', 'inventory', 'manufacturing', 'projects', 'settings'];
        
        const superAdminPermissions = modules.map(m => ({ module: m, view: true, create: true, edit: true }));
        const managerPermissions = modules.map(m => ({ module: m, view: true, create: true, edit: false }));
        const employeePermissions = modules.map(m => ({ module: m, view: true, create: false, edit: false }));

        const superAdminRole = await Role.create({
            tenant_id: tenantId,
            name: 'SuperAdmin',
            description: 'Full access to all modules',
            permissions: superAdminPermissions,
            isDefault: true
        });

        const managerRole = await Role.create({
            tenant_id: tenantId,
            name: 'Manager',
            description: 'Can view and create records',
            permissions: managerPermissions,
            isDefault: true
        });

        const employeeRole = await Role.create({
            tenant_id: tenantId,
            name: 'Employee',
            description: 'Read-only access',
            permissions: employeePermissions,
            isDefault: true
        });

        // 2. Create Users
        console.log('Creating users...');
        const passwordHash = await bcrypt.hash('password123', 12);

        await User.create([
            {
                tenant_id: tenantId,
                email: 'admin@systemsteel.com',
                password: 'password123',
                full_name: 'Admin User',
                role: 'SuperAdmin',
                status: 'active'
            },
            {
                tenant_id: tenantId,
                email: 'manager@systemsteel.com',
                password: 'password123',
                full_name: 'Manager User',
                role: 'Manager',
                status: 'active'
            },
            {
                tenant_id: tenantId,
                email: 'employee@systemsteel.com',
                password: 'password123',
                full_name: 'Regular Employee',
                role: 'Employee',
                status: 'active'
            }
        ]);


        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
