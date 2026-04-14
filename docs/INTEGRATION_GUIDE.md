# BridgeBreak ERP - Complete Integration Guide

## Overview
This document shows how all modules connect and communicate with each other.

---

## SYSTEM LAYERS

### Layer 1: Frontend (Next.js)
- **Entry Point**: `app/page.tsx` → redirects to `/admin/dashboard`
- **Root Layout**: `app/layout.tsx` → wraps with `AuthProvider` + `TenantProvider`
- **Pages**: 50+ pages organized by module
- **Components**: 45+ UI components + feature-specific components
- **State Management**: React Context (Auth, Tenant)
- **HTTP Client**: `lib/api.ts` (100+ API functions)

### Layer 2: Backend (Express.js)
- **Entry Point**: `backend/server.js`
- **Routes**: 20 route files (100+ endpoints)
- **Middleware**: JWT authentication
- **Database**: MongoDB with Mongoose

### Layer 3: Database (MongoDB)
- **Collections**: 20 Mongoose models
- **Relationships**: Foreign keys via ObjectId
- **Transactions**: Multi-document ACID transactions

---

## AUTHENTICATION & AUTHORIZATION FLOW

```
User Login
  ↓
POST /api/auth/login
  ↓
Backend validates credentials
  ↓
Generate JWT token (7-day expiry)
  ↓
Return token + user object
  ↓
Frontend stores token in localStorage (bb_token)
  ↓
AuthProvider sets user state
  ↓
TenantProvider loads company profile
  ↓
Module Gate checks module access
  ↓
User can access permitted modules
```

### Key Components
- **AuthProvider** (`lib/auth/context.tsx`): Manages user state and authentication
- **TenantProvider** (`lib/tenant-context.tsx`): Manages company profile and module access
- **Module Gate** (`lib/module-gate.ts`): Checks module accessibility
- **Auth Middleware** (`backend/middleware/auth.js`): Validates JWT on protected routes

---

## MODULE DEPENDENCY GRAPH

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                            │
│  (Required by all modules)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    TENANT & SETTINGS                         │
│  (Determines active modules and configuration)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
    ┌────────┐          ┌────────┐         ┌────────┐
    │ FINANCE│          │INVENTORY│        │ HRMS   │
    └────────┘          └────────┘         └────────┘
        ↓                   ↓                   ↓
        ├─────────────────┬─┴─────────────────┤
        ↓                 ↓                   ↓
    ┌────────┐        ┌────────┐         ┌────────┐
    │RECEIVABLES│      │PROCUREMENT│      │PROJECTS│
    └────────┘        └────────┘         └────────┘
        ↓                 ↓                   ↓
        ├─────────────────┼───────────────────┤
        ↓                 ↓                   ↓
    ┌────────┐        ┌────────┐         ┌────────┐
    │PAYABLES│        │MANUFACTURING│    │OPERATIONS│
    └────────┘        └────────┘         └────────┘
        ↓                 ↓                   ↓
        └─────────────────┼───────────────────┘
                          ↓
                    ┌────────────┐
                    │TAX CENTER  │
                    │APPROVAL    │
                    │ENGINE      │
                    └────────────┘
```

---

## CROSS-MODULE DATA FLOWS

### 1. SALES → FINANCE → INVENTORY

**Scenario**: Customer places order, invoice created, goods shipped

```
Sales Module
  ├─ Create Sales Order
  │   └─ Customer + Items + Quantities
  │
  ├─ Confirm Sales Order
  │   └─ Allocate inventory
  │
  └─ Create Invoice
      └─ POST /api/finance/invoices
          ↓
Finance Module
  ├─ Create Invoice
  │   └─ Customer + Items + Tax
  │
  ├─ Calculate totals
  │   └─ Subtotal + Tax = Total
  │
  └─ Post to GL
      └─ Debit: AR Account
         Credit: Revenue Account
          ↓
Inventory Module
  ├─ Issue goods to customer
  │   └─ POST /api/inventory/move
  │
  ├─ Update stock balance
  │   └─ on_hand - quantity
  │
  ├─ Consume FIFO cost layer
  │   └─ Calculate COGS
  │
  └─ Create inventory transaction
      └─ Triggers Finance COGS posting
          ↓
Finance Module (COGS Recognition)
  ├─ Create Journal Entry
  │   └─ Debit: COGS Account
  │      Credit: Inventory Account
  │
  └─ Update GL balances
```

### 2. PROCUREMENT → INVENTORY → FINANCE

**Scenario**: Purchase order created, goods received, vendor bill paid

```
Procurement Module
  ├─ Create Purchase Order
  │   └─ Vendor + Items + Quantities + Prices
  │
  ├─ Send to vendor
  │   └─ PO status: sent
  │
  └─ Receive GRN
      └─ POST /api/procurement/grns
          ↓
Inventory Module
  ├─ Create GRN
  │   └─ Items + Quantities Received
  │
  ├─ Update stock balance
  │   └─ on_hand + quantity
  │
  ├─ Create FIFO cost layer
  │   └─ Unit cost + Quantity
  │
  └─ Create inventory transaction
      └─ Triggers Finance posting
          ↓
Finance Module (Inventory Posting)
  ├─ Create Journal Entry
  │   └─ Debit: Inventory Account
  │      Credit: Payable Account
  │
  └─ Update GL balances
          ↓
Procurement Module (Vendor Bill)
  ├─ Create Vendor Bill
  │   └─ Linked to GRN (3-way match)
  │
  ├─ Match with PO and GRN
  │   └─ Verify quantities and prices
  │
  └─ Post Bill to GL
      └─ POST /api/payables/bills/:id/post
          ↓
Finance Module (AP Posting)
  ├─ Create Journal Entry
  │   └─ Debit: Expense/COGS Account
  │      Credit: AP Account
  │
  └─ Update GL balances
          ↓
Procurement Module (Vendor Payment)
  ├─ Create Payment
  │   └─ Amount + Payment Method
  │
  └─ Process Payment
      └─ POST /api/payables/payments
          ↓
Finance Module (Payment Posting)
  ├─ Create Journal Entry
  │   └─ Debit: AP Account
  │      Credit: Bank Account
  │
  └─ Update GL balances
```

### 3. MANUFACTURING → INVENTORY → FINANCE

**Scenario**: Production order created, materials issued, goods produced

```
Manufacturing Module
  ├─ Create Production Order
  │   └─ BOM + Quantity to Produce
  │
  ├─ Start Production
  │   └─ Issue materials from inventory
  │
  └─ Complete Production
      └─ Receive finished goods
          ↓
Inventory Module (Material Consumption)
  ├─ Issue materials
  │   └─ POST /api/inventory/move
  │
  ├─ Update stock balance
  │   └─ on_hand - quantity
  │
  ├─ Consume FIFO cost layer
  │   └─ Calculate material cost
  │
  └─ Create inventory transaction
      └─ Triggers Finance COGS posting
          ↓
Finance Module (COGS Recognition)
  ├─ Create Journal Entry
  │   └─ Debit: COGS Account
  │      Credit: Inventory Account
  │
  └─ Update GL balances
          ↓
Inventory Module (Finished Goods Receipt)
  ├─ Receive finished goods
  │   └─ POST /api/inventory/move
  │
  ├─ Update stock balance
  │   └─ on_hand + quantity
  │
  ├─ Create cost layer
  │   └─ Total production cost
  │
  └─ Create inventory transaction
      └─ Triggers Finance posting
          ↓
Finance Module (Inventory Posting)
  ├─ Create Journal Entry
  │   └─ Debit: Inventory Account
  │      Credit: COGS Account
  │
  └─ Update GL balances
```

### 4. HRMS → FINANCE

**Scenario**: Payroll processing, salary expenses posted

```
HRMS Module
  ├─ Mark Attendance
  │   └─ Daily attendance for all employees
  │
  ├─ Calculate Overtime
  │   └─ Hours beyond standard
  │
  ├─ Generate Payroll
  │   └─ POST /api/hrms/payrolls
  │
  ├─ Calculate Salary
  │   └─ Basic + Overtime + Allowances - Deductions
  │
  ├─ Create Payroll Document
  │   └─ Status: draft
  │
  ├─ Approve Payroll
  │   └─ HR Manager approval
  │
  └─ Post to Finance
      └─ POST /api/hrms/payrolls/:id/post
          ↓
Finance Module
  ├─ Create Journal Entry
  │   └─ Debit: Salary Expense Account
  │      Credit: Payable/Bank Account
  │
  ├─ Calculate totals
  │   └─ Sum of all employee salaries
  │
  └─ Update GL balances
          ↓
HRMS Module
  ├─ Mark Payroll as Posted
  │   └─ Status: posted
  │
  └─ Process Payments
      └─ Transfer to employee bank accounts
```

### 5. PROJECTS → HRMS, INVENTORY, FINANCE

**Scenario**: Project created, resources allocated, materials issued, costs tracked

```
Projects Module
  ├─ Create Project
  │   └─ Name + Budget + Timeline
  │
  ├─ Allocate Resources
  │   └─ POST /api/project-ops/resource-bookings
  │
  ├─ Issue Materials
  │   └─ Allocate inventory to project
  │
  ├─ Track Timesheets
  │   └─ POST /api/project-ops/timesheets
  │
  └─ Track Expenses
      └─ POST /api/project-ops/expenses
          ↓
HRMS Module (Resource Allocation)
  ├─ Check Employee Availability
  │   └─ Leave calendar + Current allocation
  │
  ├─ Create Resource Booking
  │   └─ Employee + Project + Dates
  │
  └─ Mark Attendance with Project
      └─ Attendance.project_id = project_id
          ↓
Inventory Module (Material Allocation)
  ├─ Issue Materials to Project
  │   └─ POST /api/inventory/move
  │
  ├─ Update Stock Balance
  │   └─ on_hand - quantity
  │
  └─ Create Inventory Transaction
      └─ Linked to project
          ↓
Finance Module (Cost Tracking)
  ├─ Track Labor Costs
  │   └─ Timesheet hours × hourly rate
  │
  ├─ Track Material Costs
  │   └─ Inventory issued cost
  │
  ├─ Track Expense Costs
  │   └─ Project expenses
  │
  └─ Calculate Project Profitability
      └─ Revenue - Total Costs
```

### 6. APPROVAL ENGINE → ALL MODULES

**Scenario**: Document approval workflow

```
Any Module (Finance, Procurement, HRMS, Projects)
  ├─ Create Document
  │   └─ Expense, Invoice, PO, Bill, Leave, Timesheet
  │
  └─ Trigger Approval Workflow
      └─ POST /api/approval-engine/workflows
          ↓
Approval Engine Module
  ├─ Check Approval Workflow
  │   └─ Document type + Amount
  │
  ├─ Route to Approver
  │   └─ Based on role or individual
  │
  ├─ Approver Reviews
  │   └─ Approve or Reject
  │
  ├─ Check SoD Rules
  │   └─ Prevent conflicting approvals
  │
  └─ Final Approval
      └─ Document approved
          ↓
Originating Module
  ├─ Post Document to GL
  │   └─ If Finance-related
  │
  ├─ Update Status
  │   └─ From draft to posted
  │
  └─ Trigger Downstream Actions
      └─ Update related modules
```

### 7. TAX CENTER → FINANCE, RECEIVABLES, PAYABLES

**Scenario**: Tax calculation and filing

```
Tax Center Module
  ├─ Define Tax Jurisdiction
  │   └─ Country + Tax System (VAT, GST, etc.)
  │
  ├─ Create Tax Codes
  │   └─ Tax rate + Category
  │
  ├─ Create Filing Period
  │   └─ Start date + End date + Due date
  │
  └─ Track Tax Liability
      └─ Aggregate from transactions
          ↓
Finance Module (Tax Application)
  ├─ Apply Tax to Invoice
  │   └─ Items × Tax Rate
  │
  ├─ Apply Tax to Expense
  │   └─ Amount × Tax Rate
  │
  └─ Post Tax GL Entries
      └─ Tax Payable Account
          ↓
Receivables Module (Customer Invoice Tax)
  ├─ Calculate Tax on Invoice
  │   └─ Items × Tax Rate
  │
  └─ Post to GL
      └─ Tax Payable Account
          ↓
Payables Module (Vendor Bill Tax)
  ├─ Calculate Tax on Bill
  │   └─ Items × Tax Rate
  │
  └─ Post to GL
      └─ Tax Payable Account
          ↓
Tax Center Module (Tax Filing)
  ├─ Aggregate Tax Liability
  │   └─ Sum of all tax transactions
  │
  ├─ Create Tax Adjustment
  │   └─ If needed
  │
  └─ File Tax Return
      └─ Close filing period
```

---

## API LAYER ARCHITECTURE

### Central Hub: `lib/api.ts`
- **100+ API functions** organized by module
- **Centralized fetch wrapper** with auth headers
- **Fallback to mock data** if backend unavailable
- **localStorage caching** for offline support

### API Function Pattern
```typescript
export async function getModule() {
  try {
    const res = await fetch(`${API_BASE}/module/endpoint`, {
      headers: authHeaders()
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] error:', e);
  }
  return []; // fallback
}
```

### Authentication Headers
```typescript
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('bb_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
```

---

## TENANT & MODULE ACCESS CONTROL

### TenantProvider Flow
```
User logs in
  ↓
AuthProvider sets user state
  ↓
TenantProvider loads:
  ├─ Tenant status (setup stage, business type)
  ├─ Company profile (name, currency, active modules)
  └─ Branding config (logo, colors)
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

### Business Type Mapping
```javascript
Manufacturing → Inventory, Manufacturing, Projects, Purchases
Construction → Projects, Inventory, Operations, Purchases
Retail → Sales, Inventory, Operations
Service → Projects, Sales, Operations
Trading → Inventory, Operations, Purchases
Hospitality → Inventory, Sales, Operations
```

### Module Labels (Sector-Specific)
```javascript
Manufacturing:
  - inventory: "Raw Materials"
  - manufacturing: "Shop Floor"
  - operations: "Production Control"
  - projects: "Build Jobs"

Construction:
  - projects: "Site Records"
  - inventory: "Material Store"
  - operations: "Site Operations"
```

---

## ERROR HANDLING & FALLBACKS

### API Error Handling
```typescript
try {
  const res = await fetch(url, options);
  if (res.ok) return res.json();
} catch (e) {
  console.warn('[API] error:', e);
}
return fallbackData; // mock data or empty array
```

### Backend Error Handling
```javascript
try {
  // Process request
  res.json(result);
} catch (err) {
  res.status(500).json({ error: err.message });
}
```

### Offline Support
- API functions return mock data if backend unavailable
- Settings cached in localStorage
- User can continue working offline
- Changes synced when backend available

---

## PERFORMANCE OPTIMIZATION

### Frontend
- React.memo for expensive components
- Pagination for large lists
- localStorage caching
- Lazy loading routes
- Image optimization

### Backend
- Database indexes on frequently queried fields
- Lean queries for read-only operations
- Connection pooling
- Rate limiting

### Database
- Indexes on foreign keys
- Compound indexes for common queries
- Archive old data periodically
- Monitor query performance

---

## SECURITY CONSIDERATIONS

✅ **Implemented**
- JWT authentication
- Password hashing (bcryptjs)
- CORS configured
- Role-based access control
- Protected API routes

⚠️ **To Implement**
- Rate limiting
- Input validation/sanitization
- CSRF protection
- Audit logging
- Data encryption at rest
- API key management

---

## DEPLOYMENT ARCHITECTURE

### Frontend (Netlify)
- Next.js build
- Static export
- Environment variables
- CORS configured

### Backend (Node.js)
- Express server
- MongoDB connection
- JWT secret
- CORS origin

### Database (MongoDB)
- Atlas or self-hosted
- Connection pooling
- Backup strategy
- Monitoring

---

## SUMMARY

The BridgeBreak ERP system is built with a modular architecture where:

1. **Authentication** is the foundation (AuthProvider)
2. **Tenant & Settings** determine active modules (TenantProvider)
3. **Core Modules** (Finance, Inventory, HRMS, Sales) operate independently
4. **Integration Points** connect modules via API calls
5. **Approval Engine** controls document workflows
6. **Tax Center** manages tax compliance
7. **API Layer** centralizes all backend communication
8. **Error Handling** provides graceful fallbacks

Each module can be developed, tested, and deployed independently while maintaining data consistency through well-defined integration points.
