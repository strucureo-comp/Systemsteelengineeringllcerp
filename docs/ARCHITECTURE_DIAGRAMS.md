# BridgeBreak ERP - Architecture Diagrams & Data Flow

## 1. SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Next.js 13.5.1 Frontend (React + TypeScript)               │  │
│  │  ├─ Pages (50+)                                             │  │
│  │  ├─ Components (45+ UI + Custom)                            │  │
│  │  ├─ Hooks & Context (Auth, Tenant, Module Gate)            │  │
│  │  └─ API Client Layer (lib/api.ts - 100+ functions)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
                    (JWT Token in Authorization Header)
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS BACKEND (Node.js)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  API Routes (20 route files, 100+ endpoints)                │  │
│  │  ├─ /api/auth          (Authentication)                     │  │
│  │  ├─ /api/finance       (Invoices, Expenses, GL)             │  │
│  │  ├─ /api/inventory     (Items, Warehouses, Movements)       │  │
│  │  ├─ /api/hrms          (Employees, Payroll, Attendance)     │  │
│  │  ├─ /api/crm           (Leads, Opportunities, Customers)    │  │
│  │  ├─ /api/procurement   (POs, GRNs, Vendors)                 │  │
│  │  ├─ /api/manufacturing (BOMs, Production Orders)            │  │
│  │  ├─ /api/projects      (Project Management)                 │  │
│  │  └─ (+ 12 more modules)                                     │  │
│  ├─ Middleware                                                  │  │
│  │  └─ auth.js (JWT validation)                                │  │
│  └─ Config                                                      │  │
│     └─ db.js (MongoDB connection)                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Mongoose ODM
┌─────────────────────────────────────────────────────────────────────┐
│                    MONGODB DATABASE                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Collections (20 Mongoose Models)                           │  │
│  │  ├─ users                                                   │  │
│  │  ├─ invoices, expenses, accounts, journalentries           │  │
│  │  ├─ employees, departments, attendance, leaves, payrolls    │  │
│  │  ├─ items, warehouses, stockbalances, transactions          │  │
│  │  ├─ leads, opportunities, customers, activities            │  │
│  │  ├─ purchaseorders, grns, vendors, bills                    │  │
│  │  ├─ projects, boms, productionorders                        │  │
│  │  └─ (+ more collections)                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. FRONTEND ARCHITECTURE LAYERS

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Pages (50+)                                            │   │
│  │  ├─ /admin/dashboard                                   │   │
│  │  ├─ /admin/finance/* (invoices, expenses, etc.)        │   │
│  │  ├─ /admin/sales/* (leads, opportunities, etc.)        │   │
│  │  ├─ /admin/hr/* (employees, payroll, etc.)             │   │
│  │  ├─ /admin/inventory/* (items, warehouses, etc.)       │   │
│  │  └─ (+ 8 more modules)                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layout Components                                      │   │
│  │  ├─ DashboardShell (main wrapper)                       │   │
│  │  ├─ Sidebar (navigation)                                │   │
│  │  ├─ Header (top bar)                                    │   │
│  │  └─ MobileNav (bottom nav)                              │   │
│  ├─ UI Components (45+)                                    │   │
│  │  ├─ Button, Card, Dialog, Form, Table, etc.            │   │
│  │  └─ (Radix UI + custom wrappers)                        │   │
│  ├─ Feature Components                                     │   │
│  │  ├─ FinancePageHeader                                   │   │
│  │  ├─ KpiCard                                             │   │
│  │  └─ (Module-specific components)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Context Providers                                      │   │
│  │  ├─ AuthProvider (useAuth hook)                         │   │
│  │  │  └─ Manages: user, token, login, logout             │   │
│  │  ├─ TenantProvider (useTenant hook)                     │   │
│  │  │  └─ Manages: company profile, modules, settings     │   │
│  │  └─ (Custom hooks for specific features)               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API CLIENT LAYER                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  lib/api.ts (100+ exported functions)                   │   │
│  │  ├─ getProjects, createProject, updateProject          │   │
│  │  ├─ getInvoices, createInvoice, updateInvoice          │   │
│  │  ├─ getEmployees, createEmployee, updateEmployee       │   │
│  │  ├─ getInventoryItems, createInventoryItem             │   │
│  │  ├─ getLeads, createLead, updateLead                   │   │
│  │  └─ (+ 90+ more functions)                             │   │
│  │                                                         │   │
│  │  Features:                                              │   │
│  │  ├─ Automatic auth header injection                     │   │
│  │  ├─ Error handling & logging                            │   │
│  │  ├─ Fallback to mock data                               │   │
│  │  └─ localStorage caching                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
                    (Authorization: Bearer {JWT})
```

---

## 3. BACKEND ARCHITECTURE LAYERS

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROUTE LAYER                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  20 Route Files (backend/routes/)                       │   │
│  │  ├─ auth.js          → POST /signup, /login, GET /me    │   │
│  │  ├─ finance.js       → CRUD /invoices, /expenses, etc.  │   │
│  │  ├─ inventory.js     → CRUD /items, /warehouses, /move  │   │
│  │  ├─ hrms.js          → CRUD /employees, /attendance     │   │
│  │  ├─ crm.js           → CRUD /leads, /opportunities      │   │
│  │  ├─ procurement.js   → CRUD /orders, /grns, /vendors    │   │
│  │  ├─ manufacturing.js → CRUD /boms, /production-orders   │   │
│  │  ├─ projects.js      → CRUD /projects                   │   │
│  │  └─ (+ 12 more route files)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  middleware/auth.js                                     │   │
│  │  ├─ Validates JWT token                                 │   │
│  │  ├─ Extracts user from token                            │   │
│  │  ├─ Attaches user to request                            │   │
│  │  └─ Returns 401 if invalid                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Route Handlers (in each route file)                    │   │
│  │  ├─ Validate request data                               │   │
│  │  ├─ Query/manipulate models                             │   │
│  │  ├─ Apply business rules                                │   │
│  │  ├─ Handle errors                                       │   │
│  │  └─ Return JSON response                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Mongoose Models (backend/models/)                      │   │
│  │  ├─ User.js                                             │   │
│  │  ├─ Finance.js (Invoice, Expense, Account, Journal)    │   │
│  │  ├─ HRMS.js (Employee, Attendance, Leave, Payroll)     │   │
│  │  ├─ Inventory.js (Item, Warehouse, Balance, Tx)        │   │
│  │  ├─ CRM.js (Lead, Opportunity, Customer)               │   │
│  │  ├─ Procurement.js (PO, GRN, Vendor)                   │   │
│  │  ├─ Manufacturing.js (BOM, ProductionOrder)            │   │
│  │  ├─ Project.js                                          │   │
│  │  └─ (+ 12 more models)                                  │   │
│  │                                                         │   │
│  │  Features:                                              │   │
│  │  ├─ Schema validation                                   │   │
│  │  ├─ Indexes for performance                             │   │
│  │  ├─ Pre/post hooks                                      │   │
│  │  └─ Methods & statics                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Mongoose ODM
```

---

## 4. DATA FLOW: CREATING AN INVOICE

```
USER INTERACTION
    ↓
[Frontend] User clicks "New Invoice" on /admin/finance/invoices
    ↓
[Component] FinancePageHeader + InvoiceForm rendered
    ↓
[Form] User fills: customer, items, tax, notes
    ↓
[Submit] Form calls createInvoice(data)
    ↓
[API Client] lib/api.ts → POST /api/finance/invoices
    ↓
[HTTP] Request with Authorization: Bearer {JWT}
    ↓
[Backend] Express receives POST /api/finance/invoices
    ↓
[Middleware] auth.js validates JWT, extracts user
    ↓
[Route Handler] finance.js POST /invoices handler
    ├─ Validate request body
    ├─ Auto-generate invoice_number (INV-00001)
    ├─ Calculate subtotal from items
    ├─ Calculate tax_amount
    ├─ Calculate total
    ├─ Create new Invoice document
    └─ Save to MongoDB
    ↓
[Database] MongoDB stores invoice
    ↓
[Response] Backend returns 201 + invoice object
    ↓
[Frontend] API client receives response
    ↓
[State] Component updates with new invoice
    ↓
[UI] Invoice appears in list, toast notification shown
    ↓
USER SEES: "Invoice created successfully"
```

---

## 5. DATA FLOW: INVENTORY STOCK MOVEMENT

```
WAREHOUSE RECEIVES GOODS (GRN)
    ↓
[Frontend] User creates GRN on /admin/inventory
    ├─ Selects item (SKU)
    ├─ Enters quantity
    ├─ Selects destination warehouse
    └─ Submits
    ↓
[API] createInventoryTransaction(data)
    ↓
[Backend] POST /api/inventory/move
    ├─ Validate item exists
    ├─ Validate warehouse exists
    ├─ Create InventoryTransaction document
    │  ├─ type: 'GRN'
    │  ├─ quantity: +100
    │  ├─ unit_cost: 50
    │  └─ total_value: 5000
    ├─ Update StockBalance
    │  ├─ on_hand: +100
    │  └─ available: +100
    ├─ Create CostLayer (FIFO)
    │  ├─ original_qty: 100
    │  ├─ remaining_qty: 100
    │  ├─ unit_cost: 50
    │  └─ received_date: now
    └─ [Optional] Create Journal Entry
       ├─ Debit: Inventory GL Account (1200) +5000
       └─ Credit: Accounts Payable (2000) +5000
    ↓
[Database] All documents saved
    ↓
[Response] Transaction ID returned
    ↓
[Frontend] UI updated with new stock balance
    ↓
LATER: GOODS ISSUED TO PRODUCTION
    ↓
[Frontend] User creates issue transaction
    ├─ Selects item
    ├─ Enters quantity: 30
    ├─ Selects source warehouse
    └─ Submits
    ↓
[Backend] POST /api/inventory/move
    ├─ Create InventoryTransaction
    │  ├─ type: 'issue_to_production'
    │  ├─ quantity: -30
    │  └─ total_value: 1500
    ├─ Update StockBalance
    │  ├─ on_hand: -30 (now 70)
    │  └─ available: -30 (now 70)
    ├─ Consume CostLayer (FIFO)
    │  ├─ remaining_qty: -30 (now 70)
    │  └─ [If exhausted] mark is_exhausted: true
    └─ Create Journal Entry
       ├─ Debit: COGS (5000) +1500
       └─ Credit: Inventory (1200) -1500
    ↓
[Database] All documents updated
   