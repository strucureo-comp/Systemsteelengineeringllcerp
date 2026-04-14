# BridgeBreak ERP - Data Flow Diagrams

## 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 13.5.1)                                      │
│  ├─ 50+ Pages                                                   │
│  ├─ 45+ UI Components                                           │
│  ├─ Auth & Tenant Context                                       │
│  └─ 100+ API Functions (lib/api.ts)                             │
└─────────────────────────────────────────────────────────────────┘
                    ↓ HTTP/REST + JWT
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Express.js)                                           │
│  ├─ 20 Route Files (100+ endpoints)                             │
│  ├─ Auth Middleware (JWT validation)                            │
│  └─ Business Logic Handlers                                     │
└─────────────────────────────────────────────────────────────────┘
                    ↓ Mongoose ODM
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE (MongoDB)                                             │
│  ├─ 20 Collections (Mongoose Models)                            │
│  ├─ Indexes & Relationships                                     │
│  └─ Transactions & Validation                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. INVOICE CREATION FLOW

```
User Input (Form)
    ↓
createInvoice(data)
    ↓
POST /api/finance/invoices
    ↓
[Backend] Validate + Auto-generate invoice_number
    ↓
Calculate: subtotal, tax_amount, total
    ↓
Save Invoice to MongoDB
    ↓
Return 201 + invoice object
    ↓
Frontend updates UI + shows toast
```

## 3. INVENTORY STOCK MOVEMENT

```
GRN Received:
  Item +100 units → Warehouse A
    ↓
  Create InventoryTransaction (type: GRN)
    ↓
  Update StockBalance (on_hand +100)
    ↓
  Create CostLayer (FIFO tracking)
    ↓
  [Optional] Create Journal Entry (Inventory GL)

Stock Issued:
  Item -30 units → Production
    ↓
  Create InventoryTransaction (type: issue_to_production)
    ↓
  Update StockBalance (on_hand -30)
    ↓
  Consume CostLayer (FIFO)
    ↓
  Create Journal Entry (COGS recognition)
```

## 4. PAYROLL PROCESSING

```
Month End:
  Generate Payroll for month
    ↓
  Fetch all active employees
    ↓
  Calculate: basic + overtime + allowances - deductions
    ↓
  Create Payroll document (status: draft)
    ↓
  HR Manager approves
    ↓
  Finance posts to GL
    ↓
  Journal Entry created:
    Debit: Salary Expense
    Credit: Payable/Bank
```

## 5. MODULE INTEGRATION MAP

```
Finance ←→ Inventory
  └─ COGS recognition on stock movements

Finance ←→ HRMS
  └─ Payroll posting to GL

Finance ←→ Procurement
  └─ Vendor bill matching

Inventory ←→ Procurement
  └─ GRN receipt, stock updates

Inventory ←→ Manufacturing
  └─ BOM consumption, production output

Inventory ←→ Sales
  └─ COGS on sales orders

HRMS ←→ Projects
  └─ Employee allocation, timesheets

Sales ←→ Finance
  └─ Invoice generation, AR tracking

Procurement ←→ Finance
  └─ Vendor bill, AP tracking

Projects ←→ Operations
  └─ Resource planning, scheduling
```

## 6. AUTHENTICATION FLOW

```
User enters credentials
    ↓
POST /api/auth/login
    ↓
Backend validates email + password
    ↓
Generate JWT token (7 day expiry)
    ↓
Return token + user object
    ↓
Frontend stores token in localStorage (bb_token)
    ↓
All subsequent requests include:
  Authorization: Bearer {token}
    ↓
Middleware validates token
    ↓
Request proceeds or returns 401
```

## 7. TENANT & MODULE ACCESS

```
User logs in
    ↓
TenantProvider loads:
  ├─ Tenant status
  ├─ Company profile
  ├─ Active modules
  └─ Branding config
    ↓
Module Gate checks access:
  ├─ Is module enabled?
  ├─ Does user have role?
  └─ Is setup complete?
    ↓
Sidebar renders available modules
    ↓
User can only access permitted modules
```

## 8. API REQUEST LIFECYCLE

```
Frontend Component
    ↓
Calls API function (e.g., getInvoices())
    ↓
lib/api.ts prepares request:
  ├─ URL: http://localhost:4000/api/finance/invoices
  ├─ Headers: {Authorization: Bearer {token}}
  └─ Method: GET
    ↓
HTTP Request sent
    ↓
Backend receives request
    ↓
auth.js middleware validates JWT
    ↓
Route handler processes request
    ↓
Query MongoDB via Mongoose
    ↓
Return JSON response
    ↓
Frontend receives response
    ↓
Update component state
    ↓
UI re-renders with data
```

## 9. BUSINESS TYPE MAPPING

```
Manufacturing:
  ├─ Inventory (Raw Materials)
  ├─ Manufacturing (Shop Floor)
  ├─ Projects (Build Jobs)
  └─ Purchases (Supply Chain)

Construction:
  ├─ Projects (Site Records)
  ├─ Inventory (Material Store)
  ├─ Operations (Site Operations)
  └─ Purchases (Procurement)

Retail:
  ├─ Sales (POS Terminal)
  ├─ Inventory (Store Stock)
  └─ Manufacturing (Custom Orders)

Service:
  ├─ Projects (Client Projects)
  ├─ Sales (Service CRM)
  └─ Operations (Task Management)
```

## 10. KEY DATA RELATIONSHIPS

```
User
  ├─ 1:1 → Employee (optional)
  └─ 1:N → Created documents

Employee
  ├─ N:1 → Department
  ├─ N:1 → HRRole
  ├─ 1:N → Attendance
  ├─ 1:N → Leave
  └─ 1:N → Payroll lines

Invoice
  ├─ 1:N → Items
  └─ 1:1 → Customer

Item (SKU)
  ├─ 1:N → StockBalance (per warehouse)
  ├─ 1:N → InventoryTransaction
  └─ 1:N → CostLayer (FIFO)

StockBalance
  ├─ N:1 → Item
  └─ N:1 → Warehouse

InventoryTransaction
  ├─ N:1 → Item
  ├─ N:1 → Source Warehouse
  ├─ N:1 → Destination Warehouse
  └─ 1:1 → Journal Entry (optional)

JournalEntry
  ├─ 1:N → Lines
  └─ N:1 → Account (per line)

Account (COA)
  ├─ 1:N → JournalEntry lines
  └─ 1:N → InventoryTransaction (GL mapping)
```

---

**Document Generated**: Data flow and integration diagrams for BridgeBreak ERP
