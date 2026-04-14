# Module 6: Procurement & Purchasing

## Overview
Purchase order management, vendor management, goods receipt, and vendor bill processing.

## Frontend Pages
- **Location**: `app/(admin)/admin/purchases/`
- **Sub-modules**:
  - `orders/` - Purchase order management
  - `requests/` - Purchase requests
  - `grns/` - Goods receipt notes
  - `bills/` - Vendor bills
  - `payments/` - Vendor payments
  - `vendors/` - Vendor management
  - `new/` - New purchase flow

## Backend Routes
- **Location**: `backend/routes/procurement.js`
- **Endpoints**:
  - `GET /api/procurement/orders` - List purchase orders
  - `POST /api/procurement/orders` - Create purchase order
  - `GET /api/procurement/requests` - List purchase requests
  - `POST /api/procurement/requests` - Create purchase request
  - `GET /api/procurement/grns` - List GRNs
  - `POST /api/procurement/grns` - Create GRN

## Backend Routes (Payables)
- **Location**: `backend/routes/payables.js`
- **Endpoints**:
  - `GET /api/payables/vendors` - List vendors
  - `POST /api/payables/vendors` - Create vendor
  - `PUT /api/payables/vendors/:id` - Update vendor
  - `GET /api/payables/bills` - List vendor bills
  - `POST /api/payables/bills` - Create vendor bill
  - `POST /api/payables/bills/:id/post` - Post bill to GL
  - `GET /api/payables/payments` - List vendor payments
  - `POST /api/payables/payments` - Create vendor payment
  - `GET /api/payables/aging-report` - AP aging report

## Data Models

### PurchaseRequest
```javascript
PurchaseRequest {
  request_number: String (unique)
  requester: String (user email)
  items: [{sku, quantity, uom, estimated_cost}]
  total_estimated_cost: Number
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered'
  approval_date: Date
  approved_by: String
  createdAt, updatedAt: Date
}
```

### PurchaseOrder
```javascript
PurchaseOrder {
  po_number: String (unique)
  vendor_id: ObjectId → Vendor
  request_id: ObjectId → PurchaseRequest (optional)
  items: [{sku, quantity, unit_price, tax_rate, amount}]
  subtotal: Number
  tax_amount: Number
  total: Number
  delivery_date: Date
  status: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'received' | 'cancelled'
  notes: String
  createdAt, updatedAt: Date
}
```

### GRN (Goods Receipt Note)
```javascript
GRN {
  grn_number: String (unique)
  po_id: ObjectId → PurchaseOrder
  items: [{sku, quantity_ordered, quantity_received, unit_cost}]
  received_date: Date
  received_by: String
  status: 'draft' | 'posted'
  notes: String
  createdAt, updatedAt: Date
}
```

### Vendor
```javascript
Vendor {
  vendor_id: String (unique)
  name: String
  email: String
  phone: String
  address: String
  tax_id: String
  payment_terms: String
  credit_limit: Number
  status: 'active' | 'inactive' | 'suspended'
  bank_details: {
    account_name: String
    account_number: String
    bank_name: String
    iban: String
  }
  createdAt, updatedAt: Date
}
```

### VendorBill
```javascript
VendorBill {
  bill_number: String (unique)
  vendor_id: ObjectId → Vendor
  grn_id: ObjectId → GRN (optional, for 3-way match)
  po_id: ObjectId → PurchaseOrder
  items: [{sku, quantity, unit_price, tax_rate, amount}]
  subtotal: Number
  tax_amount: Number
  total: Number
  bill_date: Date
  due_date: Date
  status: 'draft' | 'received' | 'matched' | 'posted' | 'paid' | 'cancelled'
  notes: String
  createdAt, updatedAt: Date
}
```

### VendorPayment
```javascript
VendorPayment {
  payment_number: String (unique)
  vendor_id: ObjectId → Vendor
  bill_id: ObjectId → VendorBill
  amount: Number
  payment_date: Date
  payment_method: String
  reference: String
  status: 'draft' | 'processed' | 'cleared'
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Purchase Requests
getPurchaseRequests() → PurchaseRequest[]
createPurchaseRequest(data) → PurchaseRequest | null

// Purchase Orders
getPurchaseOrders() → PurchaseOrder[]
getPurchaseOrder(id) → PurchaseOrder | null
createPurchaseOrder(data) → PurchaseOrder | null

// GRNs
getGRNs() → GRN[]
createGRN(data) → GRN | null
createGRNs(data) → GRN | null

// Vendors
getVendors() → Vendor[]
createVendor(data) → Vendor | null
getAPVendors() → Vendor[]
createAPVendor(data) → Vendor | null
updateAPVendor(id, data) → Vendor | null

// Vendor Bills
getVendorBills() → VendorBill[]
createVendorBill(data) → VendorBill | null
getAPBills() → VendorBill[]
createAPBill(data) → VendorBill | null
postAPBill(id) → VendorBill | null

// Vendor Payments
getVendorPayments() → VendorPayment[]
createVendorPayment(data) → VendorPayment | null
getAPPayments() → VendorPayment[]
createAPPayment(data) → VendorPayment | null

// Reports
getAPAgingReport() → {current, d30, d60, d90, d90Plus, total}
```

## Connections to Other Modules

### ↔ Inventory Module
- **Trigger**: GRN creation
- **Action**: Updates stock balance and creates cost layer
- **Data Flow**:
  - PO created → Inventory expectation
  - GRN received → Stock balance updated
  - Cost layer created for FIFO tracking
  - Inventory transaction recorded

### ↔ Finance Module
- **Trigger**: Vendor bill posting
- **Action**: Records AP liability and COGS
- **Data Flow**:
  - Vendor bill created
  - Bill posted to GL
  - AP account updated
  - COGS recognized (if inventory-related)
  - Journal entry created

### ↔ Approval Engine Module
- **Trigger**: PO and bill approval workflows
- **Action**: Controls posting to GL
- **Data Flow**:
  - PO created → Approval workflow
  - Approved → Can be sent to vendor
  - Bill created → Approval workflow
  - Approved → Posted to GL

## Key Workflows

### Purchase Request
1. Department submits purchase request
2. Specifies items and quantities
3. Estimated cost calculated
4. Submitted for approval
5. Manager approves/rejects
6. Approved requests converted to PO

### Purchase Order Creation
1. Create PO from purchase request or manually
2. Select vendor
3. Add items with quantities and prices
4. Calculate subtotal, tax, total
5. Set delivery date
6. Save as draft
7. Send to vendor
8. Vendor confirms

### Goods Receipt (GRN)
1. Goods arrive at warehouse
2. Create GRN linked to PO
3. Verify items and quantities
4. Record received quantities
5. Post GRN
6. Stock balance updated
7. Cost layer created
8. Inventory transaction recorded

### 3-Way Matching
1. PO created with quantities and prices
2. GRN received with actual quantities
3. Vendor bill received with invoice amounts
4. System matches all three documents
5. Discrepancies flagged
6. Approved for payment

### Vendor Bill Processing
1. Vendor bill received
2. Create bill linked to PO and GRN
3. Verify items, quantities, prices
4. Match with GRN (3-way match)
5. Approve bill
6. Post to GL
7. AP account updated
8. Payment scheduled

### Vendor Payment
1. Bill due date approaches
2. Payment created
3. Amount and payment method specified
4. Payment processed
5. Bill marked as paid
6. GL updated

## Module Access
- **Default**: Enabled for Manufacturing, Retail, Trading, Construction
- **Role**: Procurement Manager, Vendor Manager
- **Setup**: Vendor master setup required

## Real-time Features
- PO tracking
- GRN receipt confirmation
- 3-way matching
- AP aging report
- Vendor performance tracking
- Payment scheduling

## Integration Points
- Inventory for stock receipt
- Finance for AP posting
- Approval Engine for workflow control
- Projects for project-based procurement
