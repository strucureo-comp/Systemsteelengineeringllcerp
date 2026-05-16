# ERP Completion TODO List

## Phase 1: Assessment & Optimization
- [x] **Database Audit:** Review all Mongoose models (`backend/models/`) and add compound/single indexes for frequently queried fields (e.g., `tenant_id`, statuses, date ranges).
- [x] **Query Optimization:** Identify and refactor slow queries, particularly in `services/reportService.js` and list endpoints. Use `.lean()` where appropriate for read-only data.
- [x] **Frontend Performance:** Ensure parallel data fetching (`Promise.all`) and component memoization are used consistently across all module dashboards.

## Phase 2: Module Finalization (Iterative)
*For each module below, the workflow is: Audit Backend -> Audit Frontend -> Fix Gaps -> Test via Chrome MCP.*

- [x] **Finance & Accounting**
  - [x] Verify Ledger, Payables, Receivables, and Tax calculations.
  - [x] 🤖 *MCP Test:* Create invoices, process payments, check ledger balance.
- [x] **HRMS & Payroll**
  - [x] Verify employee lifecycle, attendance tracking, and payroll generation.
  - [x] 🤖 *MCP Test:* Add employee, mark attendance, generate payslip.
- [x] **CRM & Sales**
  - [x] Verify lead-to-opportunity flow, quotations, and sales orders.
  - [x] 🤖 *MCP Test:* Create lead, convert to quote, approve quote.
- [x] **Procurement & Inventory**
  - [x] Verify Purchase Orders, 3-way matching, and stock journals.
  - [x] 🤖 *MCP Test:* Create PO, receive goods, check stock levels.
- [x] **Manufacturing & Projects**
  - [x] Verify BOM, work orders, and project milestones.
  - [x] 🤖 *MCP Test:* Create BOM, start work order, update project task.

## Phase 3: System-Wide Features
- [x] **Approval Engine:** Ensure all critical actions (PO over $X, Payroll, etc.) trigger the approval workflow correctly.
- [x] **Reports & Analytics:** Verify all PDF and Excel exports are functioning and performant.

## Phase 4: UI/UX & Professional Polish
- [x] **Design Review:** Ensure consistent spacing, typography, and Radix UI component usage across all pages.
- [x] **Error Handling:** Implement robust error boundaries and user-friendly toast notifications for all API failures.

## Phase 5: Final Validation
- [x] Run full backend test suite (`npm test`).
- [x] Run full frontend build (`npm run build`).
