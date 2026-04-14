# Module 2: Finance Hub

## Overview
Comprehensive financial management including invoices, expenses, accounts, journal entries, and financial reporting.

## Frontend Pages
- **Location**: `app/(admin)/admin/finance/`
- **Sub-modules**:
  - `invoices/` - Invoice management
  - `expenses/` - Expense tracking
  - `payables/` - Accounts payable
  - `receivables/` - Accounts receivable
  - `ledger/` - General ledger
  - `reports/` - Financial reports
  - `taxes/` - Tax management
  - `assets/` - Fixed assets
  - `banking/` - Bank reconciliation
  - `stock-journal/` - Stock journal entries
  - `approvals/` - Approval workflows
  - `period-close/` - Period closing
  - `multi-currency/` - Multi-currency support
  - `intercompany/` - Intercompany transactions
  - `quotations/` - Sales quotations
  - `settings/` - Finance settings

## Backend Routes
- **Location**: `backend/routes/finance.js`
- **Endpoints**:
  - `GET /api/finance/invoices` - List invoices
  - `POST /api/finance/invoices` - Create invoice
  - `PUT /api/finance/invoices/:id` - Update invoice
  - `DELETE /api/finance/invoices/:id` - Delete invoice
  - `GET /api/finance/expenses` - List expenses
  - `POST /api/finance/expenses` - Create expense
  - `PUT /api/finance/expenses/:id` - Update expense
  - `DELETE /api/finance/expenses/:id` - Delete expense
  - `GET /api/finance/accounts` - List chart of accounts
  - `POST /api/finance/accounts` - Create account
  - `GET /api/finance/journals` - List journal entries
  - `POST /api/finance/journals` - Create journal entry
  - `GET /api/finance/summary` - Financial summary

## Data Models

### Invoice
```javascript
Invoice {
  invoice_number: String (unique, auto-generated)
  type: 'invoice' | 'credit_note' | 'debit_note'
  customer_name: String
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial'
  items: [{description, quantity, unit_price, tax_rate, amount}]
  subtotal: Number
  tax_amount: Number
  total: Number
  amount_paid: Number
  currency: String (default: 'AED')
  created_by: String
  createdAt, updatedAt: Date
}
```

### Expense
```javascript
Expense {
  expense_number: String (unique)
  category: String
  vendor: String
  amount: Number
  tax_amount: Number
  total: Number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  payment_method: String
  approved_by: String
  createdAt, updatedAt: Date
}
```

### Account (Chart of Accounts)
```javascript
Account {
  code: String (unique)
  name: String
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  balance: Number
  currency: String
  is_active: Boolean
}
```

### JournalEntry
```javascript
JournalEntry {
  entry_number: String (unique)
  date: Date
  lines: [{account_code, debit, credit, description}]
  status: 'draft' | 'posted' | 'reversed'
  total_debit: Number
  total_credit: Number (must equal total_debit)
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Invoices
getInvoices() → Invoice[]
getInvoice(id) → Invoice | null
createInvoice(data) → Invoice | null
updateInvoice(id, data) → boolean
deleteInvoice(id) → boolean

// Expenses
getExpenses() → Expense[]
createExpense(data) → Expense | null
updateExpense(id, data) → boolean
deleteExpense(id) → boolean

// Accounts
getAccounts() → Account[]
createAccount(data) → Account | null

// Journal Entries
getJournalEntries() → JournalEntry[]
createJournalEntry(data) → JournalEntry | null

// Summary
getFinanceSummary() → {revenue, expenses, netIncome, ...}
getFinanceHubSummary() → aggregated summary
```

## Connections to Other Modules

### ↔ Inventory Module
- **Trigger**: Stock movements (GRN, Issue, Sale, Waste)
- **Action**: Creates automatic journal entries for COGS recognition
- **Data Flow**: 
  - Inventory transaction → Finance GL account mapping
  - COGS recognized when stock issued
  - GL balances updated automatically

### ↔ HRMS Module
- **Trigger**: Payroll processing
- **Action**: Posts salary expenses to GL
- **Data Flow**:
  - Payroll month-end → Finance journal entry
  - Salary expense account debited
  - Payable/Bank account credited

### ↔ Procurement Module
- **Trigger**: Vendor bill creation
- **Action**: Records AP liability
- **Data Flow**:
  - PO → GRN → Vendor Bill
  - Bill posted to GL
  - AP account updated

### ↔ Receivables Module
- **Trigger**: Customer invoice creation
- **Action**: Records AR asset
- **Data Flow**:
  - Sales order → Invoice
  - Invoice posted to GL
  - AR account updated

### ↔ Tax Center Module
- **Trigger**: Tax calculation on transactions
- **Action**: Applies tax rates to invoices/expenses
- **Data Flow**:
  - Tax jurisdiction + code → tax rate
  - Applied to invoice items
  - Tax GL account updated

### ↔ Approval Engine Module
- **Trigger**: Expense/Invoice approval workflows
- **Action**: Controls posting to GL
- **Data Flow**:
  - Document created → Approval workflow
  - Approved → Posted to GL
  - Rejected → Remains draft

## Key Workflows

### Invoice Creation
1. User creates invoice with items
2. System auto-calculates subtotal, tax, total
3. Saves as draft
4. Can send, mark paid, or cancel
5. Generates PDF for download

### Expense Approval
1. Employee submits expense
2. Enters pending status
3. Manager reviews and approves
4. Moves to approved status
5. Finance posts to GL
6. Payment processed

### Journal Entry Posting
1. Accountant creates journal entry
2. Enters debit/credit lines
3. System validates debit = credit
4. Saves as draft
5. Posts to GL
6. Updates account balances

## Setup Stage
- Part of "finance_setup_complete" in tenant status
- Requires Chart of Accounts seeding
- Tax configuration needed for multi-currency

## Module Access
- **Default**: Enabled for all business types
- **Role**: Admin, Finance Manager
- **Setup**: Finance setup stage must be completed
