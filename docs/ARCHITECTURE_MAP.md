# BridgeBreak ERP - Complete Architecture Map

## Project Overview
**BridgeBreak** is a comprehensive Enterprise Resource Planning (ERP) system built with:
- **Frontend**: Next.js 13.5.1 (TypeScript/React) with Tailwind CSS
- **Backend**: Express.js with MongoDB/Mongoose
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcryptjs password hashing
- **UI Framework**: Radix UI components with custom styling

---

## 1. FRONTEND ARCHITECTURE

### 1.1 Page Structure (Next.js App Router)

```
app/
├── page.tsx                          # Root → redirects to /admin/dashboard
├── layout.tsx                        # Root layout with AuthProvider, TenantProvider
├── globals.css                       # Global styles
├── not-found.tsx                     # 404 page
├── login/
│   └── page.tsx                      # Login page
├── profile/
│   └── page.tsx                      # User profile page
├── site-records/                     # Empty (placeholder)
└── (admin)/
    └── admin/
        ├── page.tsx                  # Admin dashboard redirect
        ├── dashboard/
        │   ├── page.tsx              # Main dashboard
        │   └── profile/              # Dashboard profile section
        ├── finance/                  # Finance Module
        │   ├── page.tsx              # Finance hub
        │   ├── _components/          # Finance-specific components
        │   ├── invoices/             # Invoice management
        │   ├── expenses/             # Expense tracking
        │   ├── payables/             # Accounts payable
        │   ├── receivables/          # Accounts receivable
        │   ├── ledger/               # General ledger
        │   ├── reports/              # Financial reports
        │   ├── taxes/                # Tax management
        │   ├── assets/               # Fixed assets
        │   ├── banking/              # Bank reconciliation
        │   ├── stock-journal/        # Stock journal entries
        │   ├── approvals/            # Approval workflows
        │   ├── period-close/         # Period closing
        │   ├── multi-currency/       # Multi-currency support
        │   ├── intercompany/         # Intercompany transactions
        │   ├── quotations/           # Sales quotations
        │   └── settings/             # Finance settings
        ├── sales/                    # Sales/CRM Module
        │   ├── page.tsx              # Sales hub
        │   ├── layout.tsx            # Sales layout
        │   ├── _components/          # Sales components
        │   ├── leads/                # Lead management
        │   ├── opportunities/        # Opportunity pipeline
        │   ├── customers/            # Customer management
        │   ├── enquiries/            # Customer enquiries
        │   ├── partners/             # Partner management
        │   └── (more sub-modules)
        ├── hr/                       # HRMS Module
        │   ├── page.tsx              # HR hub
        │   ├── _components/          # HR components
        │   ├── _lib/                 # HR utilities
        │   ├── team/                 # Team management
        │   └── (more sub-modules)
        ├── inventory/                # Inventory Module
        │   ├── page.tsx              # Inventory hub
        │   ├── _components/          # Inventory components
        │   ├── _hooks/               # Inventory hooks
        │   ├── _lib/                 # Inventory utilities
        │   └── (more sub-modules)
        ├── manufacturing/            # Manufacturing Module
        │   ├── page.tsx              # Manufacturing hub
        │   ├── _components/          # Manufacturing components
        │   ├── production/           # Production orders
        │   └── (more sub-modules)
        ├── purchases/                # Procurement Module
        │   ├── page.tsx              # Purchases hub
        │   ├── _components/          # Purchase components
        │   ├── orders/               # Purchase orders
        │   ├── bills/                # Vendor bills
        │   ├── grns/                 # Goods receipt notes
        │   ├── payments/             # Vendor payments
        │   ├── new/                  # New purchase flow
        │   └── (more sub-modules)
        ├── projects/                 # Projects Module
        │   ├── page.tsx              # Projects hub
        │   ├── _components/          # Project components
        │   ├── [id]/                 # Project detail page
        │   └── (more sub-modules)
        ├── operations/               # Operations Module
        │   ├── page.tsx              # Operations hub
        │   ├── meetings/             # Meeting management
        │   ├── planning/             # Planning tools
        │   ├── plans/                # Plan management
        │   ├── support/              # Support operations
        │   └── (more sub-modules)
        ├── reports/                  # Reports Module
        │   ├── page.tsx              # Reports hub
        │   └── _components/          # Report components
        ├── masters/                  # Master Data Module
        │   └── page.tsx              # Master data hub
        └── settings/                 # Settings Module
            ├── page.tsx              # Settings hub
            └── _components/          # Settings components
```

### 1.2 Component Architecture

```
components/
├── ui/                               # Radix UI + Custom Components (45+ components)
│   ├── button.tsx, card.tsx, dialog.tsx, form.tsx
│   ├── table.tsx, tabs.tsx, input.tsx, select.tsx
│   ├── chart.tsx, calendar.tsx, pagination.tsx
│   └── (40+ more UI primitives)
├── finance/                          # Finance-specific components
│   ├── FinancePageHeader.tsx         # Standard finance page header
│   ├── KpiCard.tsx                   # KPI display card
│   └── (more finance components)
└── shared/                           # Shared components
    ├── layout/
    │   ├── dashboard-shell.tsx       # Main dashboard wrapper
    │   ├── sidebar.tsx               # Collapsible sidebar navigation
    │   ├── dashboard-nav.tsx         # Navigation menu
    │   ├── header.tsx                # Top header bar
    │   ├── mobile-nav.tsx            # Mobile bottom navigation
    │   └── module-guard.tsx          # Module access control
    └── common/
        ├── branded-document-preview.tsx
        ├── empty-state.tsx
        ├── file-uploader.tsx
        ├── stats-card.tsx
        └── term-help.tsx
```

### 1.3 Library & Utilities

```
lib/
├── auth/
│   ├── context.tsx                   # AuthProvider, useAuth hook
│   └── session.ts                    # Session management
├── db/
│   └── types.ts                      # TypeScript type definitions
├── services/
│   ├── email.ts                      # Email service
│   ├── tax-collection-init.ts        # Tax initialization
│   ├── tax-data-service.ts           # Tax data operations
│   └── tax-job.ts                    # Tax job processing
├── hooks/
│   └── use-currency.ts               # Currency hook
├── constants/
│   └── subscription-plans.ts         # Subscription tier definitions
├── api.ts                            # API client layer (750+ lines)
├── tenant-context.tsx                # TenantProvider, useTenant hook
├── module-gate.ts                    # Module access control logic
├── module-integration.ts             # Module integration utilities
├── pdf-generator.ts                  # PDF generation
├── currency.ts                       # Currency utilities
├── mock-data.ts                      # Mock data for development
├── session.ts                        # Session utilities
└── utils.ts                          # General utilities (cn, etc.)
```

---

## 2. BACKEND ARCHITECTURE

### 2.1 Server Structure

```
backend/
├── server.js                         # Express app entry point
├── package.json                      # Dependencies: express, mongoose, cors, jwt
├── seed.js                           # Database seeding script
├── .env                              # Environment variables
├── config/
│   └── db.js                         # MongoDB connection
├── middleware/
│   └── auth.js                       # JWT authentication middleware
├── models/                           # Mongoose schemas
│   ├── User.js                       # User authentication model
│   ├── Finance.js                    # Invoice, Expense, Account, JournalEntry
│   ├── HRMS.js                       # Employee, Department, Attendance, Leave, Payroll
│   ├── Inventory.js                  # Item, Warehouse, StockBalance, Transaction, CostLayer
│   ├── Manufacturing.js              # BOM, Production orders
│   ├── Procurement.js                # Purchase orders, GRN
│   ├── Project.js                    # Project management
│   ├── CRM.js                        # Leads, Opportunities, Customers
│   ├── Payables.js                   # Vendor bills, payments
│   ├── Receivables.js                # Customer invoices, payments
│   ├── ApprovalEngine.js             # Approval workflows
│   ├── ApprovalWorkflow.js           # Workflow definitions
│   ├── TaxCenter.js                  # Tax configuration
│   ├── FixedAssets.js                # Asset management
│   ├── StockJournal.js               # Stock adjustments
│   ├── SupportMeeting.js             # Support meetings
│   ├── ProjectOps.js                 # Project operations
│   ├── Misc.js                       # Miscellaneous data
│   └── Settings.js                   # System settings
└── routes/                           # API endpoints
    ├── auth.js                       # Authentication (signup, login, me)
    ├── finance.js                    # Finance CRUD (invoices, expenses, accounts, journals)
    ├── inventory.js                  # Inventory operations (items, warehouses, movements)
    ├── hrms.js                       # HR operations (employees, attendance, payroll)
    ├── crm.js                        # CRM operations (leads, opportunities, customers)
    ├── procurement.js                # Procurement (POs, GRNs, vendors)
    ├── manufacturing.js              # Manufacturing (BOMs, production orders)
    ├── projects.js                   # Project management
    ├── payables.js                   # Accounts payable
    ├── receivables.js                # Accounts receivable
    ├── approval-engine.js            # Approval workflows
    ├── fixed-assets.js               # Fixed asset management
    ├── stock-journal.js              # Stock journal entries
    ├── support-meetings.js           # Support meetings
    ├── project-ops.js                # Project operations
    ├── tax-center.js                 # Tax configuration
    ├── tax.js                        # Tax calculations
    ├── workflows.js                  # Workflow management
    ├── settings.js                   # System settings
    └── misc.js                       # Miscellaneous endpoints
```

### 2.2 API Endpoints Summary

**Authentication** (`/api/auth`)
- `POST /signup` - User registration
- `POST /login` - User login
- `GET /me` - Current user info
- `GET /users` - List all users

**Finance** (`/api/finance`)
- Invoices: GET, POST, PUT, DELETE `/invoices`
- Expenses: GET, POST, PUT, DELETE `/expenses`
- Accounts: GET, POST, PUT, DELETE `/accounts`
- Journal Entries: GET, POST `/journals`
- Summary: GET `/summary`

**Inventory** (`/api/inventory`)
- Items: GET, POST `/items`
- Warehouses: GET `/warehouses`
- Movements: POST `/move`
- Summary: GET `/summary`

**HRMS** (`/api/hrms`)
- Employees: GET, POST, PUT `/employees`
- Attendance: GET, POST `/attendance`
- Leaves: GET, POST `/leaves`
- Payroll: GET, POST `/payrolls`
- Departments: GET, POST `/departments`

**CRM** (`/api/crm`)
- Leads: GET, POST, PUT, DELETE `/leads`
- Opportunities: GET, POST, PUT, DELETE `/opportunities`
- Customers: GET, POST, PUT, DELETE `/customers`
- Activities: GET, POST `/activities`

**Procurement** (`/api/procurement`)
- Purchase Orders: GET, POST `/orders`
- Purchase Requests: GET, POST `/requests`
- GRNs: GET, POST `/grns`

**Other Modules**
- `/api/projects` - Project management
- `/api/manufacturing` - Manufacturing operations
- `/api/payables` - Accounts payable
- `/api/receivables` - Accounts receivable
- `/api/fixed-assets` - Asset management
- `/api/stock-journal` - Stock adjustments
- `/api/project-ops` - Project operations
- `/api/settings` - System settings
- `/api/workflows` - Workflow management

---

## 3. DATA MODELS & RELATIONSHIPS

### 3.1 Finance Module

**Invoice Schema**
```
Invoice {
  invoice_number: String (unique)
  type: 'invoice' | 'credit_note' | 'debit_note'
  customer_name: String
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial'
  items: [{description, quantity, unit_price, tax_rate, amount}]
  subtotal, tax_amount, total, amount_paid
  currency: String (default: 'AED')
  created_by: String
  timestamps
}
```

**Expense Schema**
```
Expense {
  expense_number: String (unique)
  category: String
  vendor: String
  amount, tax_amount, total
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  payment_method: String
  approved_by: String
  timestamps
}
```

**Account (Chart of Accounts)**
```
Account {
  code: String (unique)
  name: String
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  balance: Number
  currency: String
  is_active: Boolean
}
```

**Journal Entry**
```
JournalEntry {
  entry_number: String (unique)
  date: Date
  lines: [{account_code, debit, credit, description}]
  status: 'draft' | 'posted' | 'reversed'
  total_debit, total_credit (must balance)
  timestamps
}
```

### 3.2 HRMS Module

**Employee**
```
Employee {
  employee_id: String (unique)
  name, email, phone
  department_id: ObjectId → HRDepartment
  hr_role_id: ObjectId → HRRole
  employment_type: 'full-time' | 'contract' | 'part-time'
  joining_date: Date
  status: 'active' | 'inactive' | 'on-leave' | 'terminated'
  basic_salary, overtime_rate
  bank_details: {account_name, account_number, bank_name, iban}
  timestamps
}
```

**Attendance**
```
Attendance {
  employee_id: ObjectId → Employee
  date: Date
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'half-day'
  check_in, check_out: String
  overtime_hours: Number
  project_id: String (optional)
  unique index: (employee_id, date)
}
```

**Leave**
```
Leave {
  employee_id: ObjectId → Employee
  leave_type: String
  from_date, to_date: Date
  days: Number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by: String
}
```

**Payroll**
```
Payroll {
  month: String (YYYY-MM)
  status: 'draft' | 'processed' | 'posted' | 'paid'
  total_gross, total_deductions, total_net
  lines: [{employee_id, basic_pay, overtime_pay, allowances, deductions, net_pay}]
}
```

### 3.3 Inventory Module

**Item (SKU Master)**
```
Item {
  sku: String (unique)
  name, description, category
  status: 'active' | 'discontinued' | 'planning'
  uom_base: String (default: 'pcs')
  valuation_method: 'FIFO' | 'WAC' | 'Standard'
  standard_cost, last_purchase_price
  reorder_level, safety_stock, lead_time_days
  is_serial_tracked, is_batch_tracked: Boolean
  inventory_gl_account, cogs_gl_account, revenue_gl_account
}
```

**Warehouse**
```
Warehouse {
  code: String (unique)
  name: String
  type: 'central' | 'site' | 'transit' | 'vendor'
  locations: [{label, zone, capacity}]
  is_active: Boolean
}
```

**Stock Balance (Real-time Snapshot)**
```
StockBalance {
  item_id: ObjectId → Item
  warehouse_id: ObjectId → Warehouse
  on_hand: Number
  allocated: Number
  available: Number (on_hand - allocated)
  reserved: Number
  wac_cost: Number
}
```

**Inventory Transaction (Ledger)**
```
InventoryTransaction {
  transaction_id: String (unique)
  type: 'GRN' | 'issue_to_site' | 'issue_to_production' | 'transfer' | 'adjustment' | 'waste' | 'sale' | 'return_to_vendor' | 'return_from_customer'
  item_id: ObjectId → Item
  source_warehouse, destination_warehouse: ObjectId → Warehouse
  quantity: Number (positive for inflow, negative for outflow)
  unit_cost, total_value: Number
  is_cogs_recognized: Boolean
  journal_entry_id: String (links to Finance)
  posted_by, posted_at
}
```

**Cost Layer (FIFO)**
```
CostLayer {
  item_id: ObjectId → Item
  warehouse_id: ObjectId → Warehouse
  original_qty, remaining_qty: Number
  unit_cost: Number
  received_date: Date
  transaction_id: ObjectId → InventoryTransaction
  is_exhausted: Boolean
}
```

---

## 4. DATA FLOW & INTEGRATION

### 4.1 Frontend → Backend Communication

**Authentication Flow**
```
1. User enters credentials on /login
2. Frontend calls POST /api/auth/login
3. Backend validates, returns JWT token + user object
4. Frontend stores token in localStorage (bb_token)
5. AuthProvider sets user state
6. All subsequent requests include Authorization: Bearer {token}
```

**API Client Layer** (`lib/api.ts`)
- Centralized fetch wrapper with auth headers
- Fallback to mock data if backend unavailable
- localStorage caching for offline support
- 100+ exported functions for all modules

**Example: Creating an Invoice**
```
Frontend (React Component)
  ↓ calls createInvoice(data)
  ↓ (lib/api.ts)
  ↓ POST /api/finance/invoices
  ↓ (backend/routes/finance.js)
  ↓ Creates Invoice document in MongoDB
  ↓ Auto-generates invoice_number
  ↓ Returns created invoice
  ↓ Frontend updates UI
```

### 4.2 Module Integration Points

**Finance ↔ Inventory**
- When inventory transaction occurs (GRN, Sale, Waste)
- Triggers COGS recognition in Finance
- Creates automatic journal entry
- Updates GL accounts

**Finance ↔ HRMS**
- Payroll processing creates journal entries
- Salary expenses posted to GL
- Bank payments recorded

**Inventory ↔ Procurement**
- PO creates inventory expectation
- GRN receives goods into inventory
- Vendor bill matched to GRN (3-way match)

**Projects ↔ HRMS**
- Employee allocation to projects
- Timesheet tracking
- Project-based attendance

**Sales ↔ Finance**
- Sales order → Invoice
- Invoice payment → AR reconciliation
- Revenue recognition

### 4.3 Tenant & Module Access Control

**TenantProvider** (`lib/tenant-context.tsx`)
- Loads tenant status and company profile
- Determines active modules based on business type
- Provides module labels (sector-specific terminology)
- Manages setup progress tracking

**Module Gate** (`lib/module-gate.ts`)
- Checks module accessibility
- Role-based access control
- Business type-specific defaults
- Setup stage validation

**Business Type Mapping**
```
Manufacturing → Inventory, Manufacturing, Projects, Purchases
Construction → Projects, Inventory, Operations, Purchases
Retail → Sales, Inventory, Operations
Service → Projects, Sales, Operations
Trading → Inventory, Operations, Purchases
Hospitality → Inventory, Sales, Operations
```

---

## 5. AUTHENTICATION & SECURITY

### 5.1 Authentication Flow

**User Model**
```javascript
{
  email: String (unique, lowercase)
  password: String (bcrypt hashed, min 6 chars)
  full_name: String
  role: 'admin' | 'user' | 'superadmin'
  avatar_url: String
  is_active: Boolean
  timestamps
}
```

**JWT Token**
- Payload: `{userId, role}`
- Secret: `process.env.JWT_SECRET`
- Expiry: 7 days
- Stored in localStorage as `bb_token`

**Middleware**
- `auth.js` middleware validates JWT on protected routes
- Extracts user from token
- Attaches to request object

### 5.2 Password Security
- Hashed with bcryptjs (12 rounds)
- Minimum 6 characters
- Compared using bcrypt.compare()
- Never returned in API responses

---

## 6. CONFIGURATION & ENVIRONMENT

### 6.1 Frontend Configuration

**Environment Variables** (`.env`)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Next.js Config** (`next.config.js`)
- ESLint ignored during builds
- TypeScript errors ignored
- Unoptimized images (for Netlify)
- Server actions enabled

**TypeScript Config** (`tsconfig.json`)
- Path alias: `@/*` → root
- Strict mode enabled
- Module: esnext
- Target: es2017

### 6.2 Backend Configuration

**Environment Variables** (`backend/.env`)
```
PORT=4000
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

**Dependencies**
- express: Web framework
- mongoose: MongoDB ODM
- cors: Cross-origin support
- jsonwebtoken: JWT auth
- bcryptjs: Password hashing
- dotenv: Environment variables

---

## 7. STYLING & THEMING

**Tailwind CSS** (`tailwind.config.ts`)
- Custom color palette
- Extended spacing
- Animation utilities
- Dark mode support

**Component Library**
- Radix UI primitives
- Custom wrapper components
- Consistent design system
- Accessibility built-in

**Global Styles** (`app/globals.css`)
- CSS variables for theming
- Utility classes
- Animation definitions
- Responsive breakpoints

---

## 8. KEY FEATURES & WORKFLOWS

### 8.1 Finance Module Workflows

**Invoice Creation**
```
1. User navigates to Finance → Invoices
2. Clicks "New Invoice"
3. Fills customer, items, tax details
4. System auto-calculates totals
5. Saves as draft
6. Can send, mark paid, or cancel
7. Generates PDF for download
```

**Expense Approval**
```
1. Employee submits expense
2. Expense enters "pending" status
3. Manager reviews and approves
4. Moves to "approved" status
5. Finance posts to GL
6. Payment processed
```

**Journal Entry Posting**
```
1. Accountant creates journal entry
2. Enters debit/credit lines
3. System validates debit = credit
4. Saves as draft
5. Posts to GL
6. Updates account balances
```

### 8.2 Inventory Module Workflows

**Stock Receipt (GRN)**
```
1. PO received from Procurement
2. Goods arrive at warehouse
3. Create GRN with items and quantities
4. System creates FIFO cost layer
5. Updates stock balance (on_hand)
6. Creates inventory transaction
7. Triggers COGS journal entry
```

**Stock Issue**
```
1. Production/Site requests materials
2. Create issue transaction
3. Select source warehouse
4. Specify quantity and destination
5. System updates balances
6. FIFO layer consumed
7. COGS recognized in Finance
```

### 8.3 HRMS Module Workflows

**Employee Onboarding**
```
1. Create employee record
2. Assign department and role
3. Set salary structure
4. Link to user account (optional)
5. Mark as active
6. Employee can log in
```

**Payroll Processing**
```
1. Mark attendance for month
2. Calculate overtime
3. Generate payroll for month
4. Review and approve
5. Post to Finance (salary expense)
6. Process payments
7. Archive payroll
```

---

## 9. DEPLOYMENT & INFRASTRUCTURE

**Frontend Deployment**
- Netlify (via `netlify.toml`)
- Next.js build optimization
- Static export capable
- Environment variables configured

**Backend Deployment**
- Node.js server
- MongoDB Atlas or self-hosted
- Environment-based configuration
- CORS configured for frontend URL

**Database**
- MongoDB (NoSQL)
- Mongoose for schema validation
- Indexes on frequently queried fields
- Transactions for multi-document operations

---

## 10. PROJECT STATISTICS

**Frontend**
- 13 major modules (Finance, Sales, HR, Inventory, etc.)
- 45+ UI components
- 100+ API functions
- 10+ context providers
- 50+ pages

**Backend**
- 20 Mongoose models
- 20 route files
- 100+ API endpoints
- 1 middleware (auth)
- 1 database config

**Total**
- ~5000+ lines of TypeScript/JavaScript
- ~2000+ lines of configuration
- ~1000+ lines of styles
- Comprehensive ERP system

---

## 11. DEVELOPMENT WORKFLOW

**Running Locally**

Frontend:
```bash
npm install
npm run dev
# Runs on http://localhost:3000
```

Backend:
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:4000
```

**Building for Production**

Frontend:
```bash
npm run build
npm start
```

Backend:
```bash
cd backend
npm start
```

---

## 12. KEY INTEGRATION POINTS

| Module | Integrates With | Data Flow |
|--------|-----------------|-----------|
| Finance | Inventory | COGS recognition on stock movements |
| Finance | HRMS | Payroll posting to GL |
| Finance | Procurement | Vendor bill matching |
| Inventory | Procurement | GRN receipt, stock updates |
| Inventory | Manufacturing | BOM consumption, production output |
| Inventory | Sales | COGS on sales orders |
| HRMS | Projects | Employee allocation, timesheets |
| Sales | Finance | Invoice generation, AR tracking |
| Procurement | Finance | Vendor bill, AP tracking |
| Projects | Operations | Resource planning, scheduling |

---

## 13. SECURITY CONSIDERATIONS

✅ **Implemented**
- JWT authentication
- Password hashing (bcryptjs)
- CORS configured
- Role-based access control
- Protected API routes

⚠️ **To Implement**
- Rate limiting
- Input validation/sanitization
- SQL injection prevention (N/A - MongoDB)
- CSRF protection
- Audit logging
- Data encryption at rest
- API key management

---

## 14. SCALABILITY NOTES

**Current Architecture**
- Single backend instance
- MongoDB single/replica set
- Frontend static deployment
- No caching layer

**Scaling Recommendations**
- Add Redis for caching
- Implement API rate limiting
- Database indexing optimization
- Horizontal scaling with load balancer
- CDN for static assets
- Message queue for async jobs (Bull, RabbitMQ)
- Microservices for large modules

---

## 15. QUICK REFERENCE

**Key Files to Modify**
- Frontend pages: `app/(admin)/admin/[module]/page.tsx`
- Backend routes: `backend/routes/[module].js`
- Data models: `backend/models/[Module].js`
- API functions: `lib/api.ts`
- Components: `components/[category]/[Component].tsx`

**Common Tasks**
- Add new page: Create folder in `app/(admin)/admin/`
- Add new API: Create route in `backend/routes/`
- Add new model: Create schema in `backend/models/`
- Add new component: Create in `components/`
- Add new API function: Export from `lib/api.ts`

---

**Document Generated**: Comprehensive architecture analysis of BridgeBreak ERP system
**Last Updated**: 2024
**Status**: Complete and ready for development
