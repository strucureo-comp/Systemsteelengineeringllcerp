# Module Control System - Implementation Guide

## 🎯 Overview

Your ERP system now has a **Module Control System** that:
- ✅ Enables ONLY specified modules
- ✅ Disables all others automatically
- ✅ Hides disabled modules from UI (sidebar, menus)
- ✅ Blocks access to disabled module routes
- ✅ Reduces database load (unused modules not loaded)

---

## 📝 Recent Changes

- **HR module re-enabled (2026-05-04)**: The `hr` module was toggled to `true` in the modules configuration via the admin API. If you previously saw the "Module Suspended" message for HR, perform a browser hard-refresh or sign out/sign back in to reload tenant settings in the frontend.

Quick frontend refresh options:

1. Hard refresh the browser page (Cmd+Shift+R on macOS).
2. Sign out and sign back in to force tenant settings reload.
3. Alternatively, open DevTools -> Network and disable cache, then reload.


---

## 📦 What Was Created

### 1. Backend: Module Seed Script
**File**: `/backend/scripts/seed-modules.js`
- Initializes all module settings in MongoDB
- Marks 15 modules as ENABLED
- Marks 13+ modules as DISABLED
- Must run once after deployment

### 2. Frontend: Module Guard Utility
**File**: `/lib/module-guard.tsx`
- `<ModuleGuard>` - Protects entire pages
- `<ModuleConditional>` - Conditionally renders UI
- `useModuleEnabled()` - Check if module enabled in code
- No additional dependencies needed

### 3. Documentation
**File**: `/docs/MODULE_CONFIGURATION.md`
- Complete list of enabled/disabled modules
- Settings impact on each module
- Quick start for testers

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Module Seed Script
```bash
cd backend
node scripts/seed-modules.js
```

**Expected Output:**
```
[Settings Seed] MongoDB connected
[Settings Seed] ✅ Saved 28 module settings

[Settings Seed] ENABLED MODULES:
  ✅ module_purchase_order
  ✅ module_purchase_bill_entry
  ... (15 total)

[Settings Seed] DISABLED MODULES:
  ❌ module_manufacturing_bom
  ... (13+ total)

[Settings Seed] Module configuration complete!
```

✅ **Check in database:**
```javascript
// MongoDB shell
db.settings.countDocuments({ key: { $regex: "^module_" }, value: true })
// Should return: 15
```

### Step 2: Update Sidebar (See Examples Below)

### Step 3: Verify UI
- Login to `/admin/dashboard`
- Sidebar should show ONLY enabled modules
- Click disabled module → redirects to dashboard
- No disabled modules accessible

---

## 💻 Implementation Examples

### Pattern 1: Protect Entire Page

**Use Case:** Prevent access to disabled module pages

```typescript
// app/(admin)/admin/purchases/purchase-orders/page.tsx
'use client';

import { ModuleGuard } from '@/lib/module-guard';
import PurchaseOrdersList from '@/components/purchases/list';

export default function PurchaseOrdersPage() {
  return (
    <ModuleGuard moduleName="module_purchase_order">
      <div>
        <h1>Purchase Orders</h1>
        <PurchaseOrdersList />
      </div>
    </ModuleGuard>
  );
}

// If module disabled:
// - Page automatically redirects to /admin/dashboard
// - User can't access even if URL guessed
```

---

### Pattern 2: Conditional Sidebar Menu

**Use Case:** Hide disabled modules from sidebar navigation

```typescript
// components/shared/layout/sidebar.tsx
'use client';

import { ModuleConditional } from '@/lib/module-guard';
import Link from 'next/link';

export function Sidebar() {
  return (
    <nav className="space-y-4">
      
      {/* Procurement Section */}
      <ModuleConditional moduleName="module_purchase_order">
        <div>
          <h3>Procurement</h3>
          <Link href="/admin/purchases/purchase-orders">
            Purchase Orders
          </Link>
          <ModuleConditional moduleName="module_purchase_bill_entry">
            <Link href="/admin/purchases/bills">
              Purchase Bills
            </Link>
          </ModuleConditional>
        </div>
      </ModuleConditional>

      {/* Sales Section */}
      <ModuleConditional moduleName="module_sales_invoice">
        <div>
          <h3>Sales</h3>
          <Link href="/admin/sales/invoices">Invoices</Link>
          <ModuleConditional moduleName="module_sales_quote">
            <Link href="/admin/sales/quotes">Quotes</Link>
          </ModuleConditional>
          <ModuleConditional moduleName="module_delivery_note">
            <Link href="/admin/sales/delivery-notes">Delivery Notes</Link>
          </ModuleConditional>
        </div>
      </ModuleConditional>

      {/* HR Section */}
      <ModuleConditional moduleName="module_hr_payslip">
        <div>
          <h3>Human Resources</h3>
          <Link href="/admin/hr/payslips">Payslips</Link>
          <ModuleConditional moduleName="module_hr_timesheet">
            <Link href="/admin/hr/timesheets">Timesheets</Link>
          </ModuleConditional>
        </div>
      </ModuleConditional>

      {/* Finance Section */}
      <ModuleConditional moduleName="module_finance_payment_voucher">
        <div>
          <h3>Finance</h3>
          <Link href="/admin/finance/payment-vouchers">Payment Vouchers</Link>
          <ModuleConditional moduleName="module_finance_receipt_voucher">
            <Link href="/admin/finance/receipt-vouchers">Receipt Vouchers</Link>
          </ModuleConditional>
          <ModuleConditional moduleName="module_finance_vat_filing">
            <Link href="/admin/finance/vat-filing">VAT Filing</Link>
          </ModuleConditional>
          <ModuleConditional moduleName="module_finance_corporate_tax">
            <Link href="/admin/finance/corporate-tax">Corporate Tax</Link>
          </ModuleConditional>
        </div>
      </ModuleConditional>

      {/* Reports Section */}
      <ModuleConditional moduleName="module_reports_financial">
        <div>
          <h3>Reports</h3>
          <Link href="/admin/reports/financial">Financial Reports</Link>
          <ModuleConditional moduleName="module_reports_audit">
            <Link href="/admin/reports/audit">Audit Reports</Link>
          </ModuleConditional>
        </div>
      </ModuleConditional>

    </nav>
  );
}
```

**Result:**
- Sidebar shows ONLY enabled modules
- Disabled modules completely hidden
- No broken links
- Dynamic (auto-updates if settings change)

---

### Pattern 3: Conditional Dashboard Widgets

**Use Case:** Show relevant widgets based on enabled modules

```typescript
// components/admin/dashboard.tsx
'use client';

import { ModuleConditional } from '@/lib/module-guard';
import { Card } from '@/components/ui/card';

export function Dashboard() {
  return (
    <div className="grid gap-6">
      
      {/* Purchase Order Stats - Only if enabled */}
      <ModuleConditional moduleName="module_purchase_order">
        <Card className="p-6">
          <h2>Recent Purchase Orders</h2>
          <div className="text-3xl font-bold">42</div>
          <p className="text-sm text-gray-500">This month</p>
        </Card>
      </ModuleConditional>

      {/* Sales Invoice Stats - Only if enabled */}
      <ModuleConditional moduleName="module_sales_invoice">
        <Card className="p-6">
          <h2>Invoice Status</h2>
          <div className="text-3xl font-bold">$125,000</div>
          <p className="text-sm text-gray-500">Pending payment</p>
        </Card>
      </ModuleConditional>

      {/* Payroll Stats - Only if enabled */}
      <ModuleConditional moduleName="module_hr_payslip">
        <Card className="p-6">
          <h2>Payroll</h2>
          <div className="text-3xl font-bold">48</div>
          <p className="text-sm text-gray-500">Employees paid</p>
        </Card>
      </ModuleConditional>

      {/* Finance Summary - Only if enabled */}
      <ModuleConditional moduleName="module_finance_payment_voucher">
        <Card className="p-6">
          <h2>Payment Summary</h2>
          <div className="text-3xl font-bold">$89,500</div>
          <p className="text-sm text-gray-500">Total payments</p>
        </Card>
      </ModuleConditional>

    </div>
  );
}
```

---

### Pattern 4: Hook for Custom Logic

**Use Case:** Complex conditional logic in code

```typescript
'use client';

import { useModuleEnabled } from '@/lib/module-guard';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const canCreatePO = useModuleEnabled('module_purchase_order');
  const canCreateInvoice = useModuleEnabled('module_sales_invoice');
  const canCreatePayslip = useModuleEnabled('module_hr_payslip');
  const canFileVat = useModuleEnabled('module_finance_vat_filing');

  return (
    <div className="flex gap-2">
      {canCreatePO && (
        <Button onClick={() => createPO()}>
          Create PO
        </Button>
      )}
      
      {canCreateInvoice && (
        <Button onClick={() => createInvoice()}>
          Create Invoice
        </Button>
      )}
      
      {canCreatePayslip && (
        <Button onClick={() => createPayslip()}>
          Create Payslip
        </Button>
      )}
      
      {canFileVat && (
        <Button onClick={() => fileVat()}>
          File VAT
        </Button>
      )}
    </div>
  );
}
```

---

## 📋 Module Names Reference

### Enabled (Use These in ModuleGuard/ModuleConditional)

```typescript
// Procurement
'module_purchase_order'
'module_purchase_bill_entry'

// Sales
'module_sales_quote'
'module_sales_invoice'
'module_delivery_note'
'module_proforma_invoice'

// HR
'module_hr_payslip'
'module_hr_timesheet'

// Finance
'module_finance_payment_voucher'
'module_finance_receipt_voucher'
'module_finance_vat_filing'
'module_finance_corporate_tax'

// Reports
'module_reports_financial'
'module_reports_audit'
'module_reports_all_types'
```

### Disabled (Not Available)

```typescript
// Manufacturing
'module_manufacturing_bom'
'module_manufacturing_production_order'
'module_manufacturing_routing'

// Inventory
'module_inventory_stock'
'module_inventory_warehouse'
'module_inventory_adjustment'

// CRM
'module_crm_lead'
'module_crm_opportunity'
'module_crm_customer'

// ... and others (see MODULE_CONFIGURATION.md for full list)
```

---

## 🔄 How It Works

### User visits disabled module
```
1. User tries: /admin/manufacturing/bom
2. ModuleGuard checks: getSetting('module_manufacturing_bom')
3. Returns: false (disabled)
4. ModuleGuard redirects → /admin/dashboard
5. User sees: Dashboard (can't access manufacturing)
```

### Sidebar renders
```
1. Sidebar loads
2. For each menu section:
   - <ModuleConditional moduleName="...">
   - Check: getSetting(moduleName)
   - If true → show menu item
   - If false → don't render
3. Result: Only enabled modules visible
```

### Dashboard widgets
```
1. Dashboard loads
2. <ModuleConditional moduleName="module_sales_invoice">
3. Only renders if module enabled
4. Widget doesn't appear if disabled
5. Cleaner UI, fewer distractions
```

---

## 🛠️ Updating Module Status

If you need to **enable/disable modules later**:

### Step 1: Edit Configuration
```bash
# Edit backend/scripts/seed-modules.js

enabledModules = {
  'module_manufacturing_bom': true,  // Change to enable
  'module_sales_invoice': false,     // Change to disable
  // ...
};
```

### Step 2: Re-run Seed
```bash
cd backend
node scripts/seed-modules.js
```

### Step 3: Restart Application
```bash
npm start  # backend
npm run dev  # frontend
```

Changes take effect immediately!

---

## ⚡ Performance Benefits

By disabling unused modules:
- **Faster UI:** Less menu items to render
- **Smaller codebase:** Can code-split unused modules
- **Database:** No queries for disabled module data
- **Cleaner UX:** No confusing disabled menu items
- **Easier testing:** Fewer features to test

---

## 🧪 Testing Each Module

See `/docs/MODULE_CONFIGURATION.md` → **Quick Start for Tester** section

For each enabled module:
1. Navigate to its URL
2. Create test data
3. Verify settings apply (tax, company info, email)
4. Verify disabled modules don't appear in sidebar

---

## 📞 Troubleshooting

### Module appears even though I disabled it
**Solution:** Make sure seed script ran
```bash
node backend/scripts/seed-modules.js
```
Check database:
```javascript
db.settings.findOne({ key: 'module_sales_invoice' })
// Should show: value: false
```

### Sidebar still shows disabled modules
**Solution:** Sidebar component needs updating to use `<ModuleConditional>`
See Pattern 2 example above.

### ModuleGuard not redirecting
**Solution:** 
- Check browser console for errors
- Verify module setting exists in DB
- Check module name spelling matches exactly

---

## 📝 Summary

| Component | Purpose | File |
|-----------|---------|------|
| Seed Script | Initialize module settings | `/backend/scripts/seed-modules.js` |
| ModuleGuard | Protect pages from access | `/lib/module-guard.tsx` |
| ModuleConditional | Hide UI elements | `/lib/module-guard.tsx` |
| useModuleEnabled | Check in code | `/lib/module-guard.tsx` |
| Examples | Implementation patterns | `/components/examples/module-guard-examples.tsx` |
| Config Doc | Reference guide | `/docs/MODULE_CONFIGURATION.md` |

✅ **System ready to deploy!**
