# BridgeBreak ERP - Modules Summary

## Quick Reference Guide

### Module Overview Table

| Module | Purpose | Key Features | Connects To | Business Types |
|--------|---------|--------------|-------------|-----------------|
| **Authentication** | User login & session | JWT tokens, role-based access | All modules | All |
| **Finance** | Financial management | Invoices, expenses, GL, journals | Inventory, HRMS, Receivables, Payables | All |
| **Inventory** | Stock management | FIFO costing, warehouses, movements | Finance, Procurement, Manufacturing, Sales | Manufacturing, Retail, Trading, Construction |
| **HRMS** | HR management | Employees, attendance, payroll, leaves | Finance, Projects, Operations | All |
| **Sales/CRM** | Customer management | Leads, opportunities, customers, orders | Finance, Inventory, Receivables, Projects | All |
| **Procurement** | Purchase management | POs, GRNs, vendor bills, payments | Inventory, Finance, Payables, Approval Engine | Manufacturing, Retail, Trading, Construction |
| **Manufacturing** | Production management | BOMs, production orders, shop floor | Inventory, Finance, Projects | Manufacturing |
| **Projects** | Project management | Projects, resources, timesheets, expenses | HRMS, Inventory, Finance, Operations | Construction, Service, Manufacturing |
| **Operations** | Operations management | Meetings, planning, support, resources | Projects, HRMS, Sales | All |
| **Receivables** | AR management | Customer invoices, payments, aging | Finance, Sales, Tax Center | All |
| **Payables** | AP management | Vendor bills, payments, aging | Finance, Procurement, Tax Center | All |
| **Tax Center** | Tax management | Jurisdictions, codes, filing periods | Finance, Receivables, Payables | All |
| **Approval Engine** | Workflow automation | Multi-level approvals, SoD rules | Finance, Procurement, HRMS, Projects | All |
| **Fixed Assets** | Asset management | Asset tracking, depreciation | Finance | All |
| **Stock Journal** | Inventory adjustments | Stock adjustments, write-offs | Inventory, Finance | All |

---

## Module Dependency Chain

```
TIER 1 (Foundation)
├─ Authentication (required by all)
└─ Tenant & Settings (determines active modules)

TIER 2 (Core Modules)
├─ Finance (invoices, expenses, GL)
├─ Inventory (stock management)
├─ HRMS (employee management)
└─ Sales/CRM (customer management)

TIER 3 (Specialized Modules)
├─ Procurement (POs, GRNs, vendor bills)
├─ Manufacturing (BOMs, production orders)
├─ Projects (project management)
└─ Operations (meetings, planning, support)

TIER 4 (Advanced Modules)
├─ Receivables (AR management)
├─ Payables (AP management)
├─ Tax Center (tax management)
├─ Approval Engine (workflow automation)
├─ Fixed Assets (asset management)
└─ Stock Journal (inventory adjustments)
```

---

## Data Flow Patterns

### Pattern 1: Transaction Creation → GL Posting
```
Module creates transaction
  ↓
Approval workflow triggered (if configured)
  ↓
Approved → Post to GL
  ↓
Finance GL accounts updated
  ↓
GL balances recalculated
```

**Examples**: Invoice, Expense, Vendor Bill, Payroll

### Pattern 2: Stock Movement → COGS Recognition
```
Inventory transaction created
  ↓
Stock balance updated
  ↓
FIFO cost layer consumed
  ↓
COGS calculated
  ↓
Finance GL entries created
  ↓
GL balances updated
```

**Examples**: GRN, Stock Issue, Sale, Production

### Pattern 3: Document Matching
```
Document 1 created (PO)
  ↓
Document 2 created (GRN)
  ↓
Document 3 created (Vendor Bill)
  ↓
System matches all three
  ↓
Discrepancies flagged
  ↓
Approved for payment
```

**Examples**: 3-way matching (PO → GRN → Bill)

### Pattern 4: Approval Workflow
```
Document created
  ↓
Approval workflow triggered
  ↓
Route to approver(s)
  ↓
Approver reviews
  ↓
Approve or Reject
  ↓
If approved → Post to GL
  ↓
If rejected → Return to creator
```

**Examples**: Expense, Leave, PO, Bill

---

## Key Integration Points

### Finance ↔ Inventory
- **Trigger**: Stock movements
- **Action**: COGS recognition
- **GL Impact**: Inventory GL ↔ COGS GL

### Finance ↔ HRMS
- **Trigger**: Payroll processing
- **Action**: Salary expense posting
- **GL Impact**: Salary Expense GL ↔ Payable GL

### Finance ↔ Procurement
- **Trigger**: Vendor bill posting
- **Action**: AP liability recording
- **GL Impact**: Expense GL ↔ AP GL

### Finance ↔ Receivables
- **Trigger**: Customer invoice posting
- **Action**: AR asset recording
- **GL Impact**: AR GL ↔ Revenue GL

### Inventory ↔ Procurement
- **Trigger**: GRN receipt
- **Action**: Stock balance update
- **Data**: PO → GRN → Stock Balance

### Inventory ↔ Manufacturing
- **Trigger**: Production order execution
- **Action**: Material consumption & finished goods receipt
- **Data**: BOM → Production Order → Stock Balance

### Inventory ↔ Sales
- **Trigger**: Sales order fulfillment
- **Action**: Stock allocation & issue
- **Data**: Sales Order → Stock Issue → COGS

### HRMS ↔ Projects
- **Trigger**: Resource allocation
- **Action**: Employee assignment to project
- **Data**: Resource Booking → Timesheet → Project Cost

### Projects ↔ Finance
- **Trigger**: Timesheet & expense approval
- **Action**: Project cost tracking
- **Data**: Timesheet → Labor Cost, Expense → Project Cost

### Approval Engine ↔ All Modules
- **Trigger**: Document creation
- **Action**: Route to approver
- **Data**: Document → Approval Workflow → Posted

### Tax Center ↔ Finance/Receivables/Payables
- **Trigger**: Transaction creation
- **Action**: Tax calculation
- **Data**: Tax Code → Tax Rate → Tax Amount

---

## API Endpoint Organization

### Authentication (`/api/auth`)
- POST /signup
- POST /login
- GET /me
- GET /users

### Finance (`/api/finance`)
- GET/POST /invoices
- GET/POST /expenses
- GET/POST /accounts
- GET/POST /journals
- GET /summary

### Inventory (`/api/inventory`)
- GET/POST /items
- GET /warehouses
- POST /move
- GET /summary

### HRMS (`/api/hrms`)
- GET/POST /employees
- GET/POST /attendance
- GET/POST /leaves
- GET/POST /payrolls
- GET/POST /departments

### Sales/CRM (`/api/crm`)
- GET/POST /leads
- GET/POST /opportunities
- GET/POST /customers
- GET/POST /activities
- GET/POST /sales-orders

### Procurement (`/api/procurement`)
- GET/POST /orders
- GET/POST /requests
- GET/POST /grns

### Payables (`/api/payables`)
- GET/POST /vendors
- GET/POST /bills
- GET/POST /payments
- GET /aging-report

### Receivables (`/api/receivables`)
- GET/POST /customers
- GET/POST /invoices
- GET/POST /payments
- GET /aging-report

### Manufacturing (`/api/manufacturing`)
- GET/POST /boms
- GET/POST /production-orders

### Projects (`/api/projects`)
- GET/POST /projects
- GET /projects/:id

### Project Operations (`/api/project-ops`)
- POST /timesheets
- GET/POST /resource-bookings

### Tax Center (`/api/tax-center`)
- GET/POST /jurisdictions
- GET/POST /codes
- GET/POST /filing-periods
- GET/POST /adjustments
- GET /center-summary

### Approval Engine (`/api/approval-engine`)
- GET/POST /workflows
- GET/POST /sod-rules
- GET /summary

### Fixed Assets (`/api/fixed-assets`)
- GET/POST /assets

### Stock Journal (`/api/stock-journal`)
- GET/POST /journals
- PATCH /:id/post

### Operations (`/api/support-meetings`)
- GET/POST /meetings
- GET/POST /support

### Miscellaneous (`/api/misc`)
- GET/POST /planning-notes
- GET/POST /enquiries

---

## Frontend Page Structure

```
app/
├── page.tsx (redirects to /admin/dashboard)
├── layout.tsx (root layout with providers)
├── login/ (login page)
├── profile/ (user profile)
└── (admin)/admin/
    ├── dashboard/ (main dashboard)
    ├── finance/ (finance module)
    ├── sales/ (sales/CRM module)
    ├── hr/ (HRMS module)
    ├── inventory/ (inventory module)
    ├── manufacturing/ (manufacturing module)
    ├── purchases/ (procurement module)
    ├── projects/ (projects module)
    ├── operations/ (operations module)
    ├── reports/ (reports module)
    ├── masters/ (master data module)
    └── settings/ (settings module)
```

---

## Backend Route Structure

```
backend/
├── server.js (Express app entry point)
├── routes/
│   ├── auth.js (authentication)
│   ├── finance.js (finance)
│   ├── inventory.js (inventory)
│   ├── hrms.js (HRMS)
│   ├── crm.js (sales/CRM)
│   ├── procurement.js (procurement)
│   ├── payables.js (payables)
│   ├── receivables.js (receivables)
│   ├── manufacturing.js (manufacturing)
│   ├── projects.js (projects)
│   ├── project-ops.js (project operations)
│   ├── tax-center.js (tax center)
│   ├── approval-engine.js (approval engine)
│   ├── fixed-assets.js (fixed assets)
│   ├── stock-journal.js (stock journal)
│   ├── support-meetings.js (operations)
│   ├── workflows.js (workflows)
│   ├── tax.js (tax calculations)
│   ├── settings.js (settings)
│   └── misc.js (miscellaneous)
├── models/ (Mongoose schemas)
├── middleware/ (auth middleware)
└── config/ (database config)
```

---

## Component Structure

```
components/
├── ui/ (45+ Radix UI components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   └── ... (40+ more)
├── finance/ (finance-specific)
│   ├── FinancePageHeader.tsx
│   ├── KpiCard.tsx
│   └── ...
└── shared/ (shared components)
    ├── layout/
    │   ├── dashboard-shell.tsx
    │   ├── sidebar.tsx
    │   ├── header.tsx
    │   └── ...
    └── common/
        ├── empty-state.tsx
        ├── file-uploader.tsx
        └── ...
```

---

## Library Structure

```
lib/
├── auth/
│   └── context.tsx (AuthProvider, useAuth)
├── api.ts (100+ API functions)
├── tenant-context.tsx (TenantProvider, useTenant)
├── module-gate.ts (module access control)
├── services/ (business logic)
├── hooks/ (custom hooks)
├── constants/ (constants)
└── utils.ts (utilities)
```

---

## Setup Stages

1. **Company Setup** - Basic company information
2. **Finance Setup** - Chart of accounts, GL configuration
3. **Roles Setup** - User roles and permissions
4. **Module Setup** - Enable/disable modules
5. **Master Data Setup** - Items, customers, vendors, employees
6. **Workflow Setup** - Approval workflows, SoD rules
7. **Tax Setup** - Tax jurisdictions and codes

---

## Business Type Defaults

### Manufacturing
- **Enabled**: Finance, Sales, HR, Inventory, Manufacturing, Procurement, Projects, Operations
- **Disabled**: Hospitality-specific features

### Construction
- **Enabled**: Finance, Sales, HR, Inventory, Projects, Operations, Procurement
- **Disabled**: Manufacturing, Hospitality-specific features

### Retail
- **Enabled**: Finance, Sales, HR, Inventory, Operations
- **Disabled**: Manufacturing, Projects, Hospitality-specific features

### Service
- **Enabled**: Finance, Sales, HR, Projects, Operations
- **Disabled**: Inventory, Manufacturing, Hospitality-specific features

### Trading
- **Enabled**: Finance, Sales, HR, Inventory, Operations, Procurement
- **Disabled**: Manufacturing, Projects, Hospitality-specific features

### Hospitality
- **Enabled**: Finance, Sales, HR, Inventory, Operations
- **Disabled**: Manufacturing, Projects, Trading-specific features

---

## Key Takeaways

1. **Modular Design**: Each module operates independently with clear integration points
2. **API-First**: All communication through REST APIs
3. **GL-Centric**: Finance GL is the source of truth for all transactions
4. **Approval-Driven**: Workflows control document posting
5. **Multi-Tenant**: Tenant context determines active modules
6. **Scalable**: Can be extended with new modules without affecting existing ones
7. **Secure**: JWT authentication, role-based access control
8. **Resilient**: Fallback to mock data if backend unavailable

---

## Next Steps

1. Review specific module documentation (MODULE_*.md files)
2. Study the integration guide (INTEGRATION_GUIDE.md)
3. Examine the architecture map (ARCHITECTURE_MAP.md)
4. Review data flow diagrams (DATA_FLOW_DIAGRAMS.md)
5. Check the quick start guide (QUICK_START_GUIDE.md)
