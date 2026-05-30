# Comprehensive Master Testing Plan: BridgeBreak ERP

This master document contains the complete testing strategy for the BridgeBreak ERP system. It is divided into two major phases:
*   **Phase 1: Isolated Module Testing (API & Backend Logic)** - Exhaustive testing of every route and schema.
*   **Phase 2: Persona-Driven End-to-End UI Flows (Click Testing)** - Realistic, role-based business cycles driven through the frontend.

---

# PHASE 1: Isolated Module Testing (Backend & Data Integrity)
*Goal: Ensure every database schema, validation rule, and standalone API route functions perfectly in isolation, typically tested via Postman, Swagger, or direct API calls.*

### 1. Settings, Branding & Global Config
*   **Company Profile:** `PUT /api/settings/company` - Verify updates to company details.
*   **Branding:** `POST /api/settings/branding/logo` - Verify image upload and URL resolution.
*   **Module Gating:** `PUT /api/modules/:id/toggle` - Disable a module and verify 403 Forbidden on its routes.
*   **Roles & Permissions:** `POST /api/settings/roles` - Create a role with permission objects: `[{ module: "finance", view: true, create: true, edit: true }]`. Verify `GET /api/settings/roles` includes the new role.

### 2. Approval Engine (Core Logic)
*   **Workflow Creation:** `POST /api/workflows` - Create a workflow with: `{ name: "PO Workflow", module: "procurement", document_type: "purchase_order", steps: [{ step_number: 1, name: "Manager Approval", approver_type: "role", approver_role: "Manager" }] }`.
*   **Execution:** Create an entity, then `POST /api/approval-engine/submit` with `{ documentType: "purchase_order", documentId: "..." }`.
*   **Actioning:** Test `POST /api/approval-engine/:id/approve` and `POST /api/approval-engine/:id/reject` routes. Verify audit logs.

### 3. Finance & Accounting
*   **Chart of Accounts (COA):** `POST /api/finance/accounts` - Create Assets, Liabilities, Equity, Revenue, Expense accounts.
*   **Manual Journals:** `POST /api/finance/journals` - Submit unbalanced entry (Debit != Credit). System MUST reject. Submit balanced entry.
*   **Fixed Assets:** `POST /api/fixed-assets` - Create asset. Trigger manual depreciation. Verify Journal Entry creation.
*   **Currency & Rates:** `PUT /api/currencies/rates` - Update exchange rate. Verify impact on next foreign currency invoice.

### 4. Tax Center
*   **Configuration:** `POST /api/tax-center/jurisdictions`, `POST /api/tax-center/codes` - Setup `type: "sales-tax"` or `"vat"`.
*   **Tax Adjustments:** `POST /api/tax-center/adjustments` - Create a manual tax adjustment.
*   **Return Generation:** `POST /api/tax-center/vat-returns` - Trigger auto-populate. Verify calculation matches underlying invoices.

### 5. HRMS (Human Resources)
*   **Employee CRUD:** `POST /api/hrms/employees` - Create employee with `status: "active"`. Verify required fields (name, department).
*   **Attendance & Leaves:** `POST /api/hrms/attendance/bulk`, `POST /api/hrms/leaves` with `status: "pending"`. Verify overlap validation.
*   **Payroll Calculation:** `POST /api/hrms/payrolls/generate` - Run calculation engine. Verify math: `(Base / 30 * days_worked) + Overtime - Unpaid Leave`.

### 6. CRM & Pre-Sales
*   **Lead Pipeline:** `POST /api/crm/leads` -> `PUT /api/crm/leads/:id` (Change status to `qualified`) -> `POST /convert-to-opportunity`.
*   **Activities:** `POST /api/crm/activities` - Log a call or meeting against a customer account.

### 7. Sales & Distribution
*   **Quotations:** `POST /api/sales-documents/quotations` - Create quote. Ensure `items` array includes `description`, `quantity`, `unit_price`. Verify PDF generation.
*   **Delivery Notes:** `POST /api/sales-documents/delivery-notes` - Create delivery with `status: "draft"`. Patch status to `"shipped"`.
*   **Invoicing:** `POST /api/sales-documents/invoices` - Create final invoice from delivery note with `status: "unpaid"`.

### 8. Procurement
*   **Purchase Orders:** `POST /api/procurement/orders` - Create PO with required `lines`: `[{ description: "Raw Material", quantity: 10, unit_price: 100, amount: 100, total_amount: 105 }]`.
*   **PO Lifecycle:** `POST /api/procurement/orders/:id/submit`, `POST /api/procurement/orders/:id/issue`.
*   **Goods Receipt:** `POST /api/procurement/grns` - Receive items against PO using `lines` array. Verify stock increase.

### 9. Inventory & Warehouse
*   **Item Master:** `POST /api/inventory/items` - Create Raw Material and Finished Good.
*   **Stock Movement:** `POST /api/inventory/move` - Transfer stock Warehouse A -> Warehouse B.
*   **Valuation:** Query `GET /api/inventory/cost-layers`. Verify moving average or FIFO cost updates after receiving goods at a new price.

### 10. Manufacturing
*   **BOM Logic:** `POST /api/manufacturing/boms` - Create BOM. Attempt to create a circular dependency (A requires B, B requires A). System MUST reject.
*   **Production:** `POST /api/manufacturing/production-orders` -> `POST /start` -> `POST /complete`. Verify Finished Goods increase, Raw Materials decrease.

---

# PHASE 2: Persona-Driven End-to-End UI Flows (Click Testing)
*Goal: Execute real business scenarios through the Frontend UI, strictly adhering to Role-Based Access Control (RBAC). The tester MUST log in and out as the specified persona.*

## Prerequisites: Test Personas
Admin must pre-create these users with strict role assignments:
*   `User_Sales` (Sales Rep)
*   `User_SalesMgr` (Sales Manager)
*   `User_Buyer` (Purchasing Agent)
*   `User_Warehouse` (Warehouse Staff)
*   `User_Factory` (Machine Operator)
*   `User_Finance` (Finance Manager)
*   `User_HR` (HR Manager)
*   `User_Vendor` (External Vendor Portal User)

---

## Flow 1: Order-to-Cash (Sales, Fulfillment, Invoicing)

**Step 1.1: Quoting (Persona: `User_Sales`)**
1. **[Login]** as `User_Sales`. Navigate to `/admin/sales/quotations`.
2. **[Click]** "New Quotation". Select a Customer and a Finished Good item.
3. **[Click]** "Submit for Approval". (UI state changes to Pending).
4. **[Logout]**.

**Step 1.2: Approval & Ordering (Persona: `User_SalesMgr`)**
1. **[Login]** as `User_SalesMgr`. Navigate to Dashboard -> Notifications.
2. **[Click]** on the pending quotation. **[Click]** "Approve".
3. **[Click]** "Convert to Sales Order". Save.
4. **[Logout]**.

**Step 1.3: Fulfillment (Persona: `User_Warehouse`)**
1. **[Login]** as `User_Warehouse`.
   *   *Validation:* Attempt to navigate to `/admin/finance` directly in the URL bar. Verify 403 Forbidden.
2. Navigate to `/admin/inventory/deliveries`. View the approved Sales Order.
3. **[Click]** "Create Delivery Note".
4. **[Click]** "Issue Stock" and then **[Click]** "Mark Shipped".
   *   *Validation:* Navigate to Inventory overview. Verify stock count for the item decreased.
5. **[Logout]**.

**Step 1.4: Invoicing & Collection (Persona: `User_Finance`)**
1. **[Login]** as `User_Finance`. Navigate to `/admin/finance/receivables/invoices`.
2. **[Click]** "Create from Delivery Note". Select the shipped note. Apply Tax Code.
3. **[Click]** "Post Invoice". (Validates GL Accounts Receivable).
4. Navigate to Payments. **[Click]** "Record Receipt Voucher". Apply to the invoice.
   *   *Validation:* Invoice status -> Paid. Check Trial Balance report -> Bank balance increased.
5. **[Logout]**.

---

## Flow 2: Procure-to-Pay (Purchasing, Receiving, Settling)

**Step 2.1: Sourcing (Persona: `User_Buyer`)**
1. **[Login]** as `User_Buyer`. Navigate to `/admin/purchases/orders`.
2. **[Click]** "New Purchase Order". Add Raw Materials.
3. **[Click]** "Issue PO".
4. **[Logout]**.

**Step 2.2: Vendor Interaction (Persona: `User_Vendor`)**
1. **[Login]** as `User_Vendor` via the vendor portal (`/vendor`).
2. **[Click]** into the new PO. **[Click]** "Acknowledge".
3. **[Logout]**.

**Step 2.3: Receiving Goods (Persona: `User_Warehouse`)**
1. **[Login]** as `User_Warehouse`. Navigate to `/admin/purchases/grn`.
2. **[Click]** "Receive Goods" against the acknowledged PO. Enter received quantity.
3. **[Click]** "Post GRN".
   *   *Validation:* Verify stock balance for Raw Materials increased.
4. **[Logout]**.

**Step 2.4: Bill Settlement (Persona: `User_Finance`)**
1. **[Login]** as `User_Finance`. Navigate to `/admin/finance/payables/bills`.
2. **[Click]** "Convert GRN to Bill".
3. **[Click]** "Post Bill".
4. **[Click]** "Record Payment".
   *   *Validation:* Verify Bank GL decreased and Accounts Payable liability cleared.
5. **[Logout]**.

---

## Flow 3: Make-to-Stock (Manufacturing Cycle)

**Step 3.1: Production Setup (Persona: `User_Factory`)**
1. **[Login]** as `User_Factory`. Navigate to `/admin/manufacturing/production-orders`.
2. **[Click]** "New Order". Select a BOM (which uses the Raw Material from Flow 2).
3. **[Click]** "Start Production".
4. **[Click]** "Issue Materials".
   *   *Validation:* Raw material stock drops.
5. Navigate to Work Orders. **[Click]** "Log Time" (e.g., 4 hours).
6. **[Click]** "Complete Order".
   *   *Validation:* Finished Good stock increases. Cost of Finished Good should equal (Raw Material Cost + Work Order Labor Cost).
7. **[Logout]**.

---

## Flow 4: Hire-to-Retire (HR & Payroll Automation)

**Step 4.1: HR Actions (Persona: `User_Factory` & `User_HR`)**
1. **[Login]** as `User_Factory`. Navigate to Self-Service.
2. **[Click]** "Clock In" and "Clock Out" for the day.
3. **[Click]** "Request Leave". Submit for a future date.
4. **[Logout]**.
5. **[Login]** as `User_HR`. Navigate to `/admin/hr/leaves`.
6. **[Click]** "Approve Leave".

**Step 4.2: Payroll & Ledger (Persona: `User_HR` & `User_Finance`)**
1. (Still `User_HR`) Navigate to `/admin/hr/payroll`.
2. **[Click]** "Generate Payroll". Verify system fetched attendance and leave data.
3. **[Click]** "Post Payroll".
4. **[Logout]**.
5. **[Login]** as `User_Finance`. Navigate to General Ledger.
   *   *Validation:* Verify automatic journal entries exist for Payroll Expense (Debit) and Wages Payable (Credit).

---

## Flow 5: Period End & Compliance (Finance)

**Step 5.1: Month End Adjustments (Persona: `User_Finance`)**
1. **[Login]** as `User_Finance`. Navigate to `/admin/finance/journals`.
2. **[Click]** "New Journal Entry". Record manual depreciation expense. Post.
3. Navigate to `/admin/settings/tax-center`.
4. **[Click]** "Generate VAT Return". Verify the Sales (Flow 1) and Purchases (Flow 2) populate the return automatically.
5. **[Click]** "File Return".
6. Navigate to `/admin/reports`. **[Click]** "Generate Balance Sheet" and "Generate P&L". 
   *   *Validation:* Click **[Export PDF]** and ensure the downloaded document renders correctly.