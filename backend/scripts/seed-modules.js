/**
 * Settings Seed - Initialize Enabled/Disabled Modules
 * 
 * Run this to set up which modules are enabled/disabled
 * Place in backend/scripts/ and run: node backend/scripts/seed-modules.js
 */

const Settings = require('../models/Settings');
const mongoose = require('mongoose');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedModuleSettings() {
  try {
    console.log('[Settings Seed] Initializing module configuration...');

    // ============================================================
    // ENABLED MODULES (User specified)
    // ============================================================
    const enabledModules = {
      // Procurement Module
      'module_purchase_order': true,
      'module_purchase_bill_entry': true,

      // Sales Module
      'module_sales_quote': true,
      'module_sales_invoice': true,
      'module_delivery_note': true,
      'module_proforma_invoice': true,

      // HR Module
      'module_hr_payslip': true,
      'module_hr_timesheet': true,

      // Finance Module
      'module_finance_payment_voucher': true,
      'module_finance_receipt_voucher': true,
      'module_finance_vat_filing': true,
      'module_finance_corporate_tax': true,

      // Reports Module
      'module_reports_financial': true,
      'module_reports_audit': true,
      'module_reports_all_types': true,
    };

    // ============================================================
    // DISABLED MODULES (All others)
    // ============================================================
    const disabledModules = {
      // Manufacturing (Disabled)
      'module_manufacturing_bom': false,
      'module_manufacturing_production_order': false,
      'module_manufacturing_routing': false,

      // Inventory (Disabled)
      'module_inventory_stock': false,
      'module_inventory_warehouse': false,
      'module_inventory_adjustment': false,
      'module_inventory_transfer': false,

      // CRM (Disabled)
      'module_crm_lead': false,
      'module_crm_opportunity': false,
      'module_crm_customer': false,

      // Projects (Disabled)
      'module_projects_management': false,
      'module_projects_tasks': false,
      'module_projects_resources': false,

      // Operations (Disabled)
      'module_operations_support': false,
      'module_operations_meetings': false,

      // Other Finance (Disabled)
      'module_finance_journal_entry': false,
      'module_finance_bank_reconciliation': false,

      // Fixed Assets (Disabled)
      'module_fixed_assets': false,

      // Approval Engine (Disabled)
      'module_approval_engine': false,

      // Advanced Features (Disabled)
      'feature_two_factor': false,
      'feature_advanced_reports': false,
      'feature_approval_engine': false,
      'feature_inventory_tracking': false,
    };

    // Merge all settings
    const allModuleSettings = { ...enabledModules, ...disabledModules };

    // Save each setting
    let savedCount = 0;
    for (const [key, value] of Object.entries(allModuleSettings)) {
      await Settings.findOneAndUpdate(
        { key },
        { value, updated_by: null },
        { upsert: true, new: true }
      );
      savedCount++;
    }

    console.log(`[Settings Seed] ✅ Saved ${savedCount} module settings`);
    console.log('\n[Settings Seed] ENABLED MODULES:');
    Object.entries(enabledModules).forEach(([key, value]) => {
      if (value) console.log(`  ✅ ${key}`);
    });

    console.log('\n[Settings Seed] DISABLED MODULES:');
    Object.entries(disabledModules).forEach(([key, value]) => {
      if (!value) console.log(`  ❌ ${key}`);
    });

    console.log('\n[Settings Seed] Module configuration complete!');
    process.exit(0);
  } catch (error) {
    console.error('[Settings Seed] Error:', error);
    process.exit(1);
  }
}

// Connect and seed
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error('[Settings Seed] ERROR: MONGODB_URI not found in .env file');
    process.exit(1);
  }
  
  console.log('[Settings Seed] Connecting to MongoDB...');
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('[Settings Seed] MongoDB connected');
      return seedModuleSettings();
    })
    .catch((err) => {
      console.error('[Settings Seed] Connection error:', err);
      process.exit(1);
    });
}

module.exports = seedModuleSettings;
