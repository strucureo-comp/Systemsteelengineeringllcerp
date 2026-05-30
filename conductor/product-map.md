# ERP Modules & Products Mapping

This document provides a comprehensive mapping of all functional modules in the BridgeBreak ERP system, including their associated data models (what data they process) and API routes (functions and functionalities).

## 1. Finance & Accounting
- **Purpose:** General ledger, accounts payable/receivable, taxes, financial reporting.
- **Data Models:**
  - `Finance.js`: `invoiceItemSchema`, `invoiceSchema`, `expenseSchema`, `recurringExpenseSchema`, `accountSchema`, `journalLineSchema`, `journalEntrySchema`
  - `Receivables.js`: `customerSchema`, `invoiceLineSchema`, `invoiceSchema`, `paymentAllocationSchema`, `paymentSchema`, `creditNoteSchema`, `writeOffSchema`, `provisionSchema`, `agingSnapshotSchema`
  - `Payables.js`: `vendorSchema`, `billLineSchema`, `billSchema`, `paymentAllocationAPSchema`, `vendorPaymentSchema`, `debitNoteSchema`, `vendorAgingSnapshotSchema`, `recurringBillSchema`, `batchPaymentSchema`
  - `TaxCenter.js`: `jurisdictionSchema`, `taxCodeSchema`, `filingPeriodSchema`, `taxAdjustmentSchema`, `vatReturnSchema`, `corporateTaxFilingSchema`
  - `Currency.js`: `currencySchema`
  - `ExchangeRate.js`: `exchangeRateSchema`
- **Key Functions & Functionalities (API Routes):**
  - **Receivables:** `GET/POST /customers`, `GET/POST/PATCH /invoices`, `POST /invoices/:id/post`, `GET/POST /payments`, `GET /aging-report`, `GET /customers/:id/statement`
  - **Payables:** `GET/POST/PUT /vendors`, `GET/POST/PUT /bills`, `POST /bills/:id/submit`, `POST /bills/:id/approve`, `POST /bills/:id/post`, `GET/POST /payments`, `GET /aging-report`
  - **Tax Center:** `GET/POST/PUT/DELETE /jurisdictions`, `/codes`, `/filing-periods`, `/adjustments`, `/vat-returns`, `/corporate-tax`, `/center-summary`

## 2. HR & Payroll (HRMS)
- **Purpose:** Employee management, payroll, leave requests, recruitment.
- **Data Models:**
  - `HRMS.js`: `employeeSchema`, `hrDepartmentSchema`, `hrRoleSchema`, `attendanceSchema`, `leaveSchema`, `payrollSchema`, `salaryStructureSchema`, `leaveTypeSchema`, `holidaySchema`, `jobOpeningSchema`, `applicantSchema`, `offerLetterSchema`, `shiftSchema`, `rosterSchema`, `overtimeLogSchema`, `timesheetEntrySchema`, etc.
- **Key Functions & Functionalities (API Routes):**
  - **Employees/Departments:** `GET/POST/PUT /employees`, `GET/POST/PUT/DELETE /departments`
  - **Attendance:** `GET/POST /attendance`, `POST /attendance/bulk`
  - **Leaves:** `GET/POST/PUT /leaves`, `POST /leaves/:id/submit`
  - **Payroll:** `GET /payrolls`, `POST /payrolls/preview`, `POST /payrolls/generate`, `POST /payrolls/:id/post`, `PATCH /payrolls/:id/status`, `/payrolls/:id/payslips/send-email-all`

## 3. CRM (Customer Relationship Management)
- **Purpose:** Customer interactions, leads, sales pipelines.
- **Data Models:**
  - `CRM.js`: `customerAccountSchema`, `contactSchema`, `leadSchema`, `opportunitySchema`, `activitySchema`, `salesOrderSchema`, `quotationSchema`
- **Key Functions & Functionalities:**
  - Lead and Opportunity tracking, contact management, task/activity generation.

## 4. Sales & Distribution
- **Purpose:** Sales orders, quotations, customer delivery.
- **Data Models:**
  - `BusinessDocuments.js`: `deliveryItemSchema`, `proformaInvoiceSchema`, `deliveryNoteSchema`, `salesInvoiceSchema`, `salesQuotationSchema`, `salesCreditNoteSchema`
- **Key Functions & Functionalities (API Routes):**
  - **Sales Documents:** `GET/POST/PUT/DELETE /proforma-invoices`, `POST /proforma-invoices/:id/convert-to-invoice`
  - **Delivery:** `GET/POST/PUT/DELETE /delivery-notes`
  - **Invoices/Quotations:** `GET/POST/PUT/DELETE /invoices`, `GET/POST/PUT/DELETE /quotations`, `POST /quotations/:id/submit`, `POST /quotations/:id/convert-to-invoice`

## 5. Procurement (Purchases)
- **Purpose:** Supplier relationships, purchase orders, material requests.
- **Data Models:**
  - `Procurement.js`: `purchaseRequestSchema`, `purchaseOrderSchema`, `rfqSchema`, `grnSchema`
- **Key Functions & Functionalities (API Routes):**
  - **Procurement:** `GET/POST /requests`, `GET/POST /rfqs`, `GET/POST/PUT /orders`, `POST /orders/:id/submit`, `POST /orders/:id/issue`, `POST /orders/:id/cancel`, `GET/POST /grns`

## 6. Inventory & Warehouse
- **Purpose:** Stock levels, inventory movements, stock adjustments.
- **Data Models:**
  - `Inventory_updated.js` & `Inventory.js`: `itemSchema`, `warehouseSchema`, `stockBalanceSchema`, `inventoryTransactionSchema`, `costLayerSchema`, `stockAdjustmentSchema`, `reorderAlertSchema`
- **Key Functions & Functionalities (API Routes):**
  - **Inventory:** `GET/POST/PUT /items`, `GET/POST /warehouses`, `GET /stock-balances`
  - **Movements/Adjustments:** `POST /move`, `POST /issue`, `POST /allocate`, `POST /ship-allocated`, `GET/POST /adjustments`, `POST /adjustments/:id/approve`
  - **Reporting:** `GET /transactions`, `GET /cost-layers`, `GET /summary`, `GET /reorder-alerts`

## 7. Manufacturing
- **Purpose:** Production planning, Bill of Materials (BOM), work orders.
- **Data Models:**
  - `Manufacturing.js`: `bomSchema`, `workCenterSchema`, `routingSchema`, `productionOrderSchema`, `workOrderSchema`, `qualityInspectionSchema`, `materialIssueSchema`, `productionScrapSchema`
- **Key Functions & Functionalities (API Routes):**
  - **Setup:** `GET/POST/PUT/DELETE /work-centers`, `GET/POST/PUT/DELETE /boms`, `GET/POST /routings`
  - **Production:** `GET/POST/PUT /production-orders`, `POST /production-orders/:id/start`, `POST /production-orders/:id/complete`
  - **Operations:** `GET/POST /work-orders`, `POST /work-orders/:id/log-time`, `GET/POST /quality-inspections`, `GET/POST /material-issues`, `GET/POST /scrap`
  - **MRP & Analytics:** `POST /mrp/calculate`, `POST /mrp/generate-requisitions`, `GET /analytics/oee`, `GET /analytics/efficiency`, `GET /analytics/quality`

## 8. Project Management
- **Purpose:** Tracks project progress, tasks, milestones, and resources.
- **Data Models:**
  - `Project.js`: `projectSchema`
  - `ProjectOps.js`: `timesheetSchema`, `resourceBookingSchema`
- **Key Functions & Functionalities (API Routes):**
  - **Projects:** `GET/POST/PUT /projects`, `GET/POST /upload-files`
  - **Operations:** `GET/POST /timesheets`, `GET /resource-bookings`

## 9. Support & Configuration Modules
- **Approval Engine:** 
  - `ApprovalConfig.js`, `ApprovalEngine.js`, `ApprovalRequest.js`, `ApprovalWorkflow.js`
  - Dynamic multi-level approval chains and role-based approvals.
- **Settings & Branding:** 
  - `Settings.js`, `BrandingConfig.js`, `CompanyProfile.js`
  - System configuration and UI branding overrides.
- **Reports & Analytics:** 
  - Generates comprehensive PDF/Excel reports spanning financial statements, HR analytics, inventory valuation, etc. (`/api/reports/...`)
