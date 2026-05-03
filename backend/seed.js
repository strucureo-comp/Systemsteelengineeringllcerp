const Project = require('./models/Project');
const User = require('./models/User');
const { Invoice, Expense, Account, JournalEntry } = require('./models/Finance');
const { Vendor, Bill } = require('./models/Payables');
const { Customer, InvoiceAR } = require('./models/Receivables');
const { Item, Warehouse } = require('./models/Inventory');
const { TaxJurisdiction, TaxCode } = require('./models/TaxCenter');
const { ApprovalWorkflowV2 } = require('./models/ApprovalEngine');
const ApprovalWorkflow = require('./models/ApprovalWorkflow');
const Settings = require('./models/Settings');
const { HRDepartment, Employee, HRRole } = require('./models/HRMS');
const { Lead, Opportunity, CustomerAccount } = require('./models/CRM');
const { BOM, ProductionOrder } = require('./models/Manufacturing');
const { SupportRequest, MeetingRequest } = require('./models/SupportMeeting');
const { FixedAsset } = require('./models/FixedAssets');

async function seedCompleteData() {
    try {
        console.log('[Seed] Checking if database needs seeding...');

        // Only seed if we don't have core users or data (prevents duplicate seeds in dev if not using drop)
        const userCount = await User.countDocuments();
        // 1. Clear existing data to ensure clean seed
        console.log('[Seed] Cleaning existing data...');
        await Promise.all([
            User.deleteMany({}),
            Account.deleteMany({}),
            Project.deleteMany({}),
            Item.deleteMany({}),
            Warehouse.deleteMany({}),
            Customer.deleteMany({}),
            Vendor.deleteMany({}),
            TaxJurisdiction.deleteMany({}),
            TaxCode.deleteMany({}),
            ApprovalWorkflow.deleteMany({}),
            HRDepartment.deleteMany({}),
            HRRole.deleteMany({}),
            Employee.deleteMany({}),
            BOM.deleteMany({}),
            ProductionOrder.deleteMany({}),
            FixedAsset.deleteMany({}),
            CustomerAccount.deleteMany({}),
            Lead.deleteMany({}),
            Opportunity.deleteMany({}),
            SupportRequest.deleteMany({}),
            MeetingRequest.deleteMany({})
        ]);

        console.log('[Seed] Starting Global ERP Seed...');

        // 2. Seed Users (Admin accounts)
        const users = await Promise.all([
            User.create({ full_name: 'Strategic Lead (CFO)', email: 'cfo@bridgebreak.com', password: 'password123', role: 'admin' }),
            User.create({ full_name: 'Group Controller', email: 'controller@bridgebreak.com', password: 'password123', role: 'admin' }),
            User.create({ full_name: 'Execution Handler', email: 'handler@bridgebreak.com', password: 'password123', role: 'user' }),
            User.create({ full_name: 'Audit Viewer', email: 'auditor@bridgebreak.com', password: 'password123', role: 'user' })
        ]);

        // 2. Seed Accounts (COA)
        const accounts = await Account.insertMany([
            { code: '1000', name: 'Cash & Bank', type: 'asset' },
            { code: '1100', name: 'Accounts Receivable', type: 'asset' },
            { code: '1200', name: 'Raw Material Inventory', type: 'asset' },
            { code: '1300', name: 'Fixed Assets - Machinery', type: 'asset' },
            { code: '1400', name: 'Input VAT Receivable', type: 'asset' },
            { code: '2000', name: 'Accounts Payable', type: 'liability' },
            { code: '2100', name: 'Output VAT Payable', type: 'liability' },
            { code: '4000', name: 'Project Revenue', type: 'revenue' },
            { code: '5000', name: 'Direct Project Costs', type: 'expense' },
            { code: '6000', name: 'Admin Expenses', type: 'expense' }
        ]);

        // 3. Seed Projects
        await Project.insertMany([
            { id: 'PRJ-0001', title: 'Main Bridge Structure Construction', description: 'Heavy steel fabrication for Bridge A-1', status: 'in_progress', progress: 35 },
            { id: 'PRJ-0002', title: 'Industrial Warehouse Phase 2', description: 'Roofing and structural reinforcement', status: 'accepted', progress: 10 },
            { id: 'PRJ-0003', title: 'Residential Handrail Fabrication', description: 'SS316 Handrails for Marina Complex', status: 'completed', progress: 100 }
        ]);

        // 4. Seed Inventory Catalog & Warehouses
        const wh = await Warehouse.create({ code: 'DXB-WH-01', name: 'Dubai Steel Hub', type: 'central' });
        const items = await Item.insertMany([
            { sku: 'STL-BEAM-H', name: 'H-Beam 200x200mm', category: 'Steel', uom_base: 'mtr', standard_cost: 450 },
            { sku: 'STL-PLT-10', name: 'Mild Steel Plate 10mm', category: 'Steel', uom_base: 'sqm', standard_cost: 120 },
            { sku: 'WLD-RD-ST', name: 'Welding Rod Standard', category: 'Consumables', uom_base: 'pkt', standard_cost: 15 }
        ]);

        // 5. Seed CRM (Core Entities)
        await Customer.create({
            customer_id: 'CUST-0001',
            legal_name: 'Emaar Properties PJSC',
            email: 'procurement@emaar.ae',
            receivable_gl_account: '1100'
        });
        await Vendor.create({
            vendor_id: 'VEND-0001',
            legal_name: 'Emirates Steel Industries',
            email: 'sales@emiratessteel.com',
            payable_gl_account: '2000'
        });

        const custAcc = await CustomerAccount.create({ name: 'Emaar Properties', industry: 'Real Estate', website: 'emaar.com' });
        await Lead.create({ first_name: 'John', last_name: 'Doe', company: 'Nakheel', status: 'new', potential_value: 500000 });
        await Opportunity.create({ account_id: custAcc._id, name: 'Dubai Mall Extension Phase 4', amount: 1200000, stage: 'qualified' });

        // 6. Seed HRMS
        const dept = await HRDepartment.create({ code: 'ENG', name: 'Engineering', description: 'Core project execution team' });
        const role = await HRRole.create({ code: 'SR-ENG', title: 'Senior Engineer', grade: 'E4', min_salary: 15000, max_salary: 25000 });
        await Employee.create({
            employee_id: 'EMP-001',
            name: 'Ali Ahmed',
            email: 'ali.ahmed@bridgebreak.com',
            department_id: dept._id,
            hr_role_id: role._id,
            basic_salary: 18000,
            status: 'active'
        });

        // 7. Seed Manufacturing
        const bom = await BOM.create({
            code: 'BOM-BR-GIRDER',
            product_id: items[0]._id, // H-Beam
            description: 'Main Support Girder assembly',
            components: [
                { item_id: items[1]._id, quantity: 10 } // Plates
            ],
            total_cost: 5000
        });
        await ProductionOrder.create({
            order_number: 'MO-2026-0001',
            bom_id: bom._id,
            quantity: 5,
            status: 'planned'
        });

        // 8. Seed Tax Config (UAE VAT Example)
        await TaxJurisdiction.create({ code: 'AE', country: 'United Arab Emirates', system: 'vat', reportingPeriod: 'quarterly' });
        await TaxCode.insertMany([
            { code: 'VAT-OUT-5', description: 'Standard Rate Output Tax', jurisdiction: 'AE', type: 'output', rate: 5, glPayable: '2100' },
            { code: 'VAT-INP-5', description: 'Standard Rate Input Tax', jurisdiction: 'AE', type: 'input', rate: 5, glReceivable: '1400' }
        ]);

        // 9. Seed Active Workflows
        await ApprovalWorkflow.create({
            name: 'Procurement Approval Rule',
            module: 'procurement',
            document_type: 'purchase_order',
            title: 'Procurement Approval Rule',
            status: 'Active',
            threshold: '> 10000',
            flow: [{ role: 'admin', action: 'APPROVE' }]
        });
        // Default workflows for production readiness
        await ApprovalWorkflow.create({
            name: 'Purchase Bill Approval',
            module: 'procurement',
            document_type: 'bill',
            title: 'Purchase Bill Approval',
            description: 'Finance approval for supplier bills before posting',
            is_active: true,
            steps: [
                { step_number: 1, name: 'Finance Approval', approver_type: 'role', approver_role: 'FinanceManager' }
            ]
        });

        await ApprovalWorkflow.create({
            name: 'Sales Invoice Approval',
            module: 'sales',
            document_type: 'invoice',
            title: 'Sales Invoice Approval',
            description: 'Approval for high-value sales invoices',
            is_active: true,
            steps: [
                { step_number: 1, name: 'Finance Approval', approver_type: 'role', approver_role: 'FinanceManager' }
            ]
        });

        await ApprovalWorkflow.create({
            name: 'Payment Voucher Approval',
            module: 'finance',
            document_type: 'payment_voucher',
            title: 'Payment Voucher Approval',
            description: 'Finance approval for outgoing payments',
            is_active: true,
            steps: [
                { step_number: 1, name: 'Finance Approval', approver_type: 'role', approver_role: 'FinanceManager' }
            ]
        });

        // 10. Seed Fixed Assets
        await FixedAsset.create({
            name: 'Hydraulic Press HP-200',
            asset_number: 'AST-001',
            purchase_date: new Date('2025-01-15'),
            purchase_cost: 150000,
            useful_life_years: 10,
            current_book_value: 135000,
            status: 'active'
        });

        // 11. Seed Approval Requests
        const { ApprovalRequest } = require('./models/ApprovalEngine');
        await ApprovalRequest.deleteMany({});
        await ApprovalRequest.insertMany([
            {
                reqId: 'REQ-HR-1042',
                type: 'Payroll Run',
                department: 'Human Resources',
                requester: 'Sarah Jenkins',
                requesterRole: 'HR Director',
                amount: 'AED 142,500.00',
                priority: 'high',
                status: 'pending',
                description: 'Monthly payroll run for Q1 FY24 (March). Includes performance bonuses for the Sales division.',
                metadata: [
                    { label: 'Pay Period', value: 'March 1 - 31, 2024' },
                    { label: 'Total Employees', value: '114' },
                    { label: 'Overtime', value: 'AED 4,200.00' }
                ],
                documents: ['Payroll_Register_MAR24.pdf'],
                history: [
                    { action: 'Submitted', user: 'Sarah Jenkins', time: '10:00 AM, Today' },
                    { action: 'L1 Approved', user: 'Michael Scott (Finance)', time: '11:30 AM, Today', notes: 'Budget limits verified.' }
                ]
            },
            {
                reqId: 'REQ-PO-9921',
                type: 'Purchase Order',
                department: 'Operations',
                requester: 'Mike Ross',
                requesterRole: 'Operations Manager',
                amount: 'AED 45,000.00',
                priority: 'medium',
                status: 'pending',
                description: 'Procurement of new warehouse racking systems and safety barriers for logistics center expansion.',
                metadata: [
                    { label: 'Vendor', value: 'Global Store-Tech LLC' },
                    { label: 'Budget Code', value: 'CAPEX-24-WH' }
                ],
                documents: ['Vendor_Quote_Rev2.pdf'],
                history: [
                    { action: 'Submitted', user: 'Mike Ross', time: '08:15 AM, Today' }
                ]
            }
        ]);

        // 12. Global System State
        await Settings.findOneAndUpdate(
            { key: 'tenant_status' },
            {
                value: {
                    setup_stage: 'completed',
                    company_setup_complete: true,
                    finance_setup_complete: true,
                    roles_setup_complete: true,
                    module_finance: true,
                    module_sales: true,
                    module_operations: true,
                    module_hr: true
                }
            },
            { upsert: true }
        );

        console.log('[Seed] Global ERP Seed Completed Successfully.');
    } catch (err) {
        console.error('[Seed] Error during seeding:', err);
    }
}

module.exports = seedCompleteData;

// Execute seed if run directly
if (require.main === module) {
    const mongoose = require('mongoose');
    require('dotenv').config();

    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bridgebreak';

    mongoose.connect(MONGODB_URI)
        .then(async () => {
            console.log('[Seed] Connected to MongoDB');
            await seedCompleteData();
            await mongoose.connection.close();
            console.log('[Seed] Database connection closed');
            process.exit(0);
        })
        .catch(err => {
            console.error('[Seed] MongoDB connection error:', err);
            process.exit(1);
        });
}
