# Module Configuration - Enabled vs Disabled

## 🟢 ENABLED MODULES (7 Total)

Your tester has access to **ONLY these modules**:

### 1️⃣ **Procurement Module** ✅
- **Purchase Order** - `/admin/purchases/purchase-orders`
  - Create, edit, delete POs
  - Track vendor orders
  - Manage delivery schedules

- **Purchase Bill Entry** - `/admin/purchases/bills`
  - Enter vendor bills
  - Match against POs
  - Track payments

**Settings Used**: `tax_rate`, `company_name`

---

### 2️⃣ **Sales Module** ✅
- **Sales Quote** - `/admin/sales/quotes`
  - Create quotations
  - Send to customers
  - Convert to invoices

- **Sales Invoice** - `/admin/sales/invoices`
  - Generate invoices
  - Track payments
  - Email to customers

- **Delivery Note** - `/admin/sales/delivery-notes`
  - Create delivery notes
  - Link to invoices
  - Track shipments

- **Proforma Invoice** - `/admin/sales/proforma-invoices`
  - Create proforma invoices
  - For advance payments
  - Convert to final invoice

**Settings Used**: `tax_rate`, `tax_jurisdiction`, `company_*`

---

### 3️⃣ **HR Module** ✅
- **Payslip** - `/admin/hr/payslips`
  - Generate payslips
  - Track deductions
  - Email to employees

- **Timesheet Entry** - `/admin/hr/timesheets`
  - Submit timesheets
  - Approve hours
  - Calculate overtime

**Settings Used**: `company_name`, `email_*` (for payslip emails)

---

### 4️⃣ **Finance Module** ✅
- **Payment Voucher** - `/admin/finance/payment-vouchers`
  - Create payment records
  - Track outgoing payments
  - Approve payments

- **Receipt Voucher** - `/admin/finance/receipt-vouchers`
  - Create receipt records
  - Track incoming payments
  - Reconcile accounts

- **VAT Filing** - `/admin/finance/vat-filing`
  - Calculate VAT liabilities
  - Generate VAT reports
  - File returns

- **Corporate Tax Filing** - `/admin/finance/corporate-tax`
  - Prepare tax returns
  - Calculate tax liability
  - Track payments

**Settings Used**: `tax_rate`, `tax_jurisdiction`, `company_*`

---

### 5️⃣ **Reports Module** ✅
- **Financial Reports** - `/admin/reports/financial`
  - P&L statement
  - Balance sheet
  - Cash flow report

- **Audit Reports** - `/admin/reports/audit`
  - Audit trail
  - Transaction logs
  - Compliance reports

- **All Types of Reports** - `/admin/reports`
  - Custom reports
  - Export to PDF/Excel
  - Schedule delivery

**Settings Used**: `company_*`, `branding_*`

---

## 🔴 DISABLED MODULES (All Others)

These modules are **NOT available** to your tester:

### ❌ Manufacturing
- BOM (Bill of Materials)
- Production Orders
- Routing
- Work Orders
**Reason**: Not needed for current setup

### ❌ Inventory
- Stock Management
- Warehouse Operations
- Inventory Adjustments
- Stock Transfers
**Reason**: Not included in requirements

### ❌ CRM
- Leads
- Opportunities
- Customer Accounts
- Contacts
**Reason**: Not included in requirements

### ❌ Projects
- Project Management
- Task Management
- Resource Allocation
- Time Tracking (separate from HR timesheet)
**Reason**: Not included in requirements

### ❌ Operations
- Support Requests
- Meeting Requests
- Service Management
**Reason**: Not included in requirements

### ❌ Other Finance Features
- Journal Entries
- Bank Reconciliation
- Expense Management
**Reason**: Not needed for current setup

### ❌ Fixed Assets
- Asset Register
- Depreciation
- Asset Disposal
**Reason**: Not included in requirements

### ❌ Advanced Features
- Approval Engine
- Two-Factor Authentication
- Advanced Analytics
- Inventory Tracking
**Reason**: Can enable later if needed

---

## 📊 Module Access Table

| Module | Enabled | URL Path | Features |
|--------|---------|----------|----------|
| **Purchase Order** | ✅ | `/admin/purchases/purchase-orders` | Create, Edit, Delete, Email |
| **Purchase Bill** | ✅ | `/admin/purchases/bills` | Entry, Matching, Payment |
| **Sales Quote** | ✅ | `/admin/sales/quotes` | Create, Send, Convert |
| **Sales Invoice** | ✅ | `/admin/sales/invoices` | Generate, Track, Email |
| **Delivery Note** | ✅ | `/admin/sales/delivery-notes` | Create, Link, Track |
| **Proforma Invoice** | ✅ | `/admin/sales/proforma-invoices` | Create, Advance, Convert |
| **Payslip** | ✅ | `/admin/hr/payslips` | Generate, Track, Email |
| **Timesheet** | ✅ | `/admin/hr/timesheets` | Submit, Approve, Overtime |
| **Payment Voucher** | ✅ | `/admin/finance/payment-vouchers` | Create, Approve, Track |
| **Receipt Voucher** | ✅ | `/admin/finance/receipt-vouchers` | Create, Reconcile, Track |
| **VAT Filing** | ✅ | `/admin/finance/vat-filing` | Calculate, Report, File |
| **Corporate Tax** | ✅ | `/admin/finance/corporate-tax` | Prepare, Calculate, Track |
| **Financial Reports** | ✅ | `/admin/reports/financial` | P&L, Balance, Cash Flow |
| **Audit Reports** | ✅ | `/admin/reports/audit` | Trail, Logs, Compliance |
| **All Reports** | ✅ | `/admin/reports` | Custom, Export, Schedule |
| **Manufacturing** | ❌ | `/admin/manufacturing` | DISABLED |
| **Inventory** | ❌ | `/admin/inventory` | DISABLED |
| **CRM** | ❌ | `/admin/crm` | DISABLED |
| **Projects** | ❌ | `/admin/projects` | DISABLED |
| **Operations** | ❌ | `/admin/operations` | DISABLED |
| **Fixed Assets** | ❌ | `/admin/fixed-assets` | DISABLED |

---

## 🔧 How to Initialize This Configuration

### Step 1: Run Seed Script
```bash
cd backend
node scripts/seed-modules.js
```

Expected output:
```
[Settings Seed] MongoDB connected
[Settings Seed] Initializing module configuration...
[Settings Seed] ✅ Saved 28 module settings

[Settings Seed] ENABLED MODULES:
  ✅ module_purchase_order
  ✅ module_purchase_bill_entry
  ✅ module_sales_quote
  ✅ module_sales_invoice
  ✅ module_delivery_note
  ✅ module_proforma_invoice
  ✅ module_hr_payslip
  ✅ module_hr_timesheet
  ✅ module_finance_payment_voucher
  ✅ module_finance_receipt_voucher
  ✅ module_finance_vat_filing
  ✅ module_finance_corporate_tax
  ✅ module_reports_financial
  ✅ module_reports_audit
  ✅ module_reports_all_types

[Settings Seed] DISABLED MODULES:
  ❌ module_manufacturing_bom
  ❌ module_manufacturing_production_order
  ... (all others)

[Settings Seed] Module configuration complete!
```

### Step 2: Verify in Database
```javascript
// In MongoDB shell
use bridgebreak
db.settings.find({ key: { $regex: "^module_" } })

// Should show 15 enabled, 13+ disabled
```

### Step 3: Access via UI
Go to `/admin/settings/modules` to see enabled/disabled status

---

## 📋 Testing Each Enabled Module

### Purchase Order Test
1. Go to `/admin/purchases/purchase-orders`
2. Click "Create PO"
3. Fill details → Tax should calculate (if tax enabled)
4. Save → Should appear in list

### Sales Invoice Test
1. Go to `/admin/sales/invoices`
2. Click "Create Invoice"
3. Add items → Tax calculates
4. Enter company details from settings
5. Generate PDF → Shows company branding

### Payslip Test
1. Go to `/admin/hr/payslips`
2. Create payslip for employee
3. Send email → Uses email settings
4. Verify email contains company name

### VAT Filing Test
1. Go to `/admin/finance/vat-filing`
2. Select period
3. System calculates using `tax_rate` setting
4. Generate report

### Reports Test
1. Go to `/admin/reports/financial`
2. Select date range
3. Generate → Shows company branding
4. Company name from settings in header

---

## 🚀 Quick Start for Tester

**Give your tester this checklist:**

```
ENABLED MODULES TO TEST:
□ Purchase Order (/admin/purchases/purchase-orders)
□ Purchase Bill (/admin/purchases/bills)
□ Sales Quote (/admin/sales/quotes)
□ Sales Invoice (/admin/sales/invoices)
□ Delivery Note (/admin/sales/delivery-notes)
□ Proforma Invoice (/admin/sales/proforma-invoices)
□ Payslip (/admin/hr/payslips)
□ Timesheet (/admin/hr/timesheets)
□ Payment Voucher (/admin/finance/payment-vouchers)
□ Receipt Voucher (/admin/finance/receipt-vouchers)
□ VAT Filing (/admin/finance/vat-filing)
□ Corporate Tax (/admin/finance/corporate-tax)
□ Financial Reports (/admin/reports/financial)
□ Audit Reports (/admin/reports/audit)
□ All Reports (/admin/reports)

VERIFY:
□ All enabled modules appear in sidebar
□ All disabled modules are hidden
□ Tax calculations work (using settings)
□ Email sends use company info (settings)
□ Reports include company branding (settings)
```

---

## 📝 Settings Connected to Enabled Modules

| Setting | Used By | Effect |
|---------|---------|--------|
| `tax_rate` | Purchase Order, Sales Invoice, VAT Filing | Tax amount calculation |
| `tax_jurisdiction` | VAT Filing, Corporate Tax | Compliance & filing rules |
| `company_name` | All modules | Appears in documents/emails |
| `company_address` | Reports, Invoices | Document headers |
| `company_email` | Payslip, Invoice emails | Sender address |
| `email_smtp_*` | Email sending (all modules) | Enable email functionality |
| `branding_logo` | Reports, Invoices | Document branding |
| `branding_primary_color` | Dashboard, Reports | UI theming |

---

## ⚙️ If You Need to Change Enabled Modules Later

Edit `backend/scripts/seed-modules.js` and modify:

```javascript
const enabledModules = {
  'module_purchase_order': true,  // Change to false to disable
  // ...
};
```

Then re-run:
```bash
node backend/scripts/seed-modules.js
```

---

## Summary

✅ **15 Modules ENABLED**
- Procurement (2)
- Sales (4)
- HR (2)
- Finance (4)
- Reports (3)

❌ **13+ Modules DISABLED**
- Manufacturing, Inventory, CRM, Projects, Operations, etc.

🧪 **Ready for testing** - Run seed script and start testing!
