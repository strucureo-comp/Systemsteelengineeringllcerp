# Module 10: Tax Center, Receivables & Payables

## Overview
Advanced financial modules for tax management, accounts receivable, and accounts payable.

---

## TAX CENTER

### Overview
Comprehensive tax management including jurisdictions, tax codes, filing periods, and tax adjustments.

### Frontend Pages
- **Location**: `app/(admin)/admin/finance/taxes/`

### Backend Routes
- **Location**: `backend/routes/tax-center.js`
- **Endpoints**:
  - `GET /api/tax-center/jurisdictions` - List tax jurisdictions
  - `POST /api/tax-center/jurisdictions` - Create jurisdiction
  - `PUT /api/tax-center/jurisdictions/:id` - Update jurisdiction
  - `DELETE /api/tax-center/jurisdictions/:id` - Delete jurisdiction
  - `GET /api/tax-center/codes` - List tax codes
  - `POST /api/tax-center/codes` - Create tax code
  - `PUT /api/tax-center/codes/:id` - Update tax code
  - `DELETE /api/tax-center/codes/:id` - Delete tax code
  - `GET /api/tax-center/filing-periods` - List filing periods
  - `POST /api/tax-center/filing-periods` - Create filing period
  - `PUT /api/tax-center/filing-periods/:id` - Update filing period
  - `PATCH /api/tax-center/filing-periods/:id/status` - Toggle filing period status
  - `DELETE /api/tax-center/filing-periods/:id` - Delete filing period
  - `GET /api/tax-center/adjustments` - List tax adjustments
  - `POST /api/tax-center/adjustments` - Create tax adjustment
  - `PATCH /api/tax-center/adjustments/:id/post` - Post tax adjustment
  - `DELETE /api/tax-center/adjustments/:id` - Delete tax adjustment
  - `GET /api/tax-center/center-summary` - Tax center summary

### Data Models

#### TaxJurisdiction
```javascript
TaxJurisdiction {
  jurisdiction_id: String (unique)
  name: String
  country: String
  tax_system: String (e.g., 'VAT', 'GST', 'Sales Tax')
  is_active: Boolean
}
```

#### TaxCode
```javascript
TaxCode {
  code_id: String (unique)
  jurisdiction_id: ObjectId → TaxJurisdiction
  name: String
  rate: Number (percentage)
  category: String
  is_active: Boolean
}
```

#### FilingPeriod
```javascript
FilingPeriod {
  period_id: String (unique)
  jurisdiction_id: ObjectId → TaxJurisdiction
  period_name: String (e.g., 'Q1 2024')
  start_date: Date
  end_date: Date
  due_date: Date
  status: 'open' | 'closed' | 'filed'
  is_active: Boolean
}
```

#### TaxAdjustment
```javascript
TaxAdjustment {
  adjustment_id: String (unique)
  jurisdiction_id: ObjectId → TaxJurisdiction
  filing_period_id: ObjectId → FilingPeriod
  description: String
  amount: Number
  type: 'credit' | 'debit'
  status: 'draft' | 'posted'
  posted_date: Date (optional)
}
```

### API Functions (lib/api.ts)
```typescript
// Jurisdictions
getTaxJurisdictions() → TaxJurisdiction[]
createTaxJurisdiction(data) → TaxJurisdiction | null
updateTaxJurisdiction(id, data) → TaxJurisdiction | null
deleteTaxJurisdiction(id) → boolean

// Tax Codes
getTaxCodes(jurisdiction?) → TaxCode[]
createTaxCode(data) → TaxCode | null
updateTaxCode(id, data) → TaxCode | null
deleteTaxCode(id) → boolean

// Filing Periods
getFilingPeriods(jurisdiction?) → FilingPeriod[]
createFilingPeriod(data) → FilingPeriod | null
updateFilingPeriod(id, data) → FilingPeriod | null
toggleFilingPeriodStatus(id) → FilingPeriod | null
deleteFilingPeriod(id) → boolean

// Tax Adjustments
getTaxAdjustments() → TaxAdjustment[]
createTaxAdjustment(data) → TaxAdjustment | null
postTaxAdjustment(id) → TaxAdjustment | null
deleteTaxAdjustment(id) → boolean

// Summary
getTaxCenterSummary() → {jurisdictions, codes, openPeriods, totalLiability, adjustments}
```

### Connections to Other Modules
- **Finance**: Tax rates applied to invoices and expenses
- **Receivables**: Tax calculated on customer invoices
- **Payables**: Tax calculated on vendor bills

---

## RECEIVABLES (Accounts Receivable)

### Overview
Customer invoice management, payment tracking, and AR aging reports.

### Backend Routes
- **Location**: `backend/routes/receivables.js`
- **Endpoints**:
  - `GET /api/receivables/customers` - List AR customers
  - `POST /api/receivables/customers` - Create AR customer
  - `PUT /api/receivables/customers/:id` - Update AR customer
  - `GET /api/receivables/invoices` - List AR invoices
  - `POST /api/receivables/invoices` - Create AR invoice
  - `POST /api/receivables/invoices/:id/post` - Post invoice to GL
  - `GET /api/receivables/payments` - List AR payments
  - `POST /api/receivables/payments` - Create AR payment
  - `GET /api/receivables/aging-report` - AR aging report

### Data Models

#### ARCustomer
```javascript
ARCustomer {
  customer_id: String (unique)
  name: String
  email: String
  phone: String
  billing_address: String
  credit_limit: Number
  payment_terms: String
  status: 'active' | 'inactive' | 'suspended'
}
```

#### ARInvoice
```javascript
ARInvoice {
  invoice_id: String (unique)
  customer_id: ObjectId → ARCustomer
  invoice_number: String
  items: [{description, quantity, unit_price, tax_rate, amount}]
  subtotal: Number
  tax_amount: Number
  total: Number
  amount_paid: Number
  status: 'draft' | 'posted' | 'partial' | 'paid' | 'overdue'
  invoice_date: Date
  due_date: Date
  posted_date: Date (optional)
}
```

#### ARPayment
```javascript
ARPayment {
  payment_id: String (unique)
  invoice_id: ObjectId → ARInvoice
  customer_id: ObjectId → ARCustomer
  amount: Number
  payment_date: Date
  payment_method: String
  reference: String
  status: 'pending' | 'cleared'
}
```

### API Functions (lib/api.ts)
```typescript
// AR Customers
getARCustomers() → ARCustomer[]
createARCustomer(data) → ARCustomer | null
updateARCustomer(id, data) → ARCustomer | null

// AR Invoices
getARInvoices() → ARInvoice[]
createARInvoice(data) → ARInvoice | null
postARInvoice(id) → ARInvoice | null

// AR Payments
getARPayments() → ARPayment[]
createARPayment(data) → ARPayment | null

// Reports
getARAgingReport() → {current, d30, d60, d90, d90Plus, total}
```

### Connections to Other Modules
- **Finance**: Invoices posted to GL, AR account updated
- **Sales**: Sales orders converted to invoices
- **Tax Center**: Tax rates applied to invoices

---

## PAYABLES (Accounts Payable)

### Overview
Vendor bill management, payment tracking, and AP aging reports.

### Backend Routes
- **Location**: `backend/routes/payables.js`
- **Endpoints**:
  - `GET /api/payables/vendors` - List AP vendors
  - `POST /api/payables/vendors` - Create AP vendor
  - `PUT /api/payables/vendors/:id` - Update AP vendor
  - `GET /api/payables/bills` - List AP bills
  - `POST /api/payables/bills` - Create AP bill
  - `POST /api/payables/bills/:id/post` - Post bill to GL
  - `GET /api/payables/payments` - List AP payments
  - `POST /api/payables/payments` - Create AP payment
  - `GET /api/payables/aging-report` - AP aging report

### Data Models

#### APVendor
```javascript
APVendor {
  vendor_id: String (unique)
  name: String
  email: String
  phone: String
  address: String
  tax_id: String
  payment_terms: String
  credit_limit: Number
  status: 'active' | 'inactive' | 'suspended'
}
```

#### APBill
```javascript
APBill {
  bill_id: String (unique)
  vendor_id: ObjectId → APVendor
  bill_number: String
  items: [{description, quantity, unit_price, tax_rate, amount}]
  subtotal: Number
  tax_amount: Number
  total: Number
  amount_paid: Number
  status: 'draft' | 'received' | 'matched' | 'posted' | 'paid'
  bill_date: Date
  due_date: Date
  posted_date: Date (optional)
}
```

#### APPayment
```javascript
APPayment {
  payment_id: String (unique)
  bill_id: ObjectId → APBill
  vendor_id: ObjectId → APVendor
  amount: Number
  payment_date: Date
  payment_method: String
  reference: String
  status: 'draft' | 'processed' | 'cleared'
}
```

### API Functions (lib/api.ts)
```typescript
// AP Vendors
getAPVendors() → APVendor[]
createAPVendor(data) → APVendor | null
updateAPVendor(id, data) → APVendor | null

// AP Bills
getAPBills() → APBill[]
createAPBill(data) → APBill | null
postAPBill(id) → APBill | null

// AP Payments
getAPPayments() → APPayment[]
createAPPayment(data) → APPayment | null

// Reports
getAPAgingReport() → {current, d30, d60, d90, d90Plus, total}
```

### Connections to Other Modules
- **Finance**: Bills posted to GL, AP account updated
- **Procurement**: Vendor bills matched to GRNs
- **Tax Center**: Tax rates applied to bills

---

## KEY WORKFLOWS

### Tax Filing
1. Define tax jurisdiction
2. Create tax codes with rates
3. Create filing period
4. Transactions automatically categorized
5. Tax liability calculated
6. Filing period closed
7. Tax return filed

### AR Invoice to Payment
1. Sales order confirmed
2. AR invoice created
3. Invoice posted to GL
4. Customer receives invoice
5. Customer makes payment
6. AR payment recorded
7. Invoice marked as paid
8. GL updated

### AP Bill to Payment
1. GRN received
2. Vendor bill created
3. Bill matched to GRN (3-way match)
4. Bill posted to GL
5. Payment scheduled
6. AP payment processed
7. Bill marked as paid
8. GL updated

---

## MODULE ACCESS
- **Default**: Enabled for all business types
- **Role**: Finance Manager, Accountant
- **Setup**: Tax jurisdiction and codes setup required
