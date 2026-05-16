# ERP Modules Documentation

This document outlines the various functional modules within the BridgeBreak ERP system, including their associated backend models and routes.

## Core Modules

### 1. Finance & Accounting
- **Purpose:** Manages the general ledger, accounts payable, accounts receivable, taxes, and financial reporting.
- **Backend Routes:** `/api/finance`, `/api/receivables`, `/api/payables`, `/api/vouchers`, `/api/financial-audit`
- **Models:** `Finance.js`, `Receivables.js`, `Payables.js`, `TaxCenter.js`, `Currency.js`, `ExchangeRate.js`
- **Key Features:** Chart of accounts, invoice tracking, automated tax calculation, multi-currency support.

### 2. HR & Payroll (HRMS)
- **Purpose:** Handles employee management, payroll, leave requests, and recruitment.
- **Backend Routes:** `/api/hrms`, `/api/hrms/uploads`
- **Models:** `HRMS.js`, `User.js`, `Role.js`
- **Key Features:** Employee profiles, payroll processing, leave management, role-based access control.

### 3. CRM (Customer Relationship Management)
- **Purpose:** Manages customer interactions, leads, and sales pipelines.
- **Backend Routes:** `/api/crm`
- **Models:** `CRM.js`
- **Key Features:** Lead tracking, contact management, sales funnel visualization.

### 4. Sales & Distribution
- **Purpose:** Manages sales orders, quotations, and customer delivery.
- **Backend Routes:** `/api/sales-documents`
- **Models:** `BusinessDocuments.js`
- **Key Features:** Quotation generation, order processing, shipping status.

### 5. Procurement (Purchases)
- **Purpose:** Manages supplier relationships, purchase orders, and material requests.
- **Backend Routes:** `/api/procurement`, `/api/procurement/uploads`
- **Models:** `Procurement.js`
- **Key Features:** Purchase requisitions, RFQs, vendor management.

### 6. Inventory & Warehouse
- **Purpose:** Tracks stock levels, inventory movements, and stock adjustments.
- **Backend Routes:** `/api/inventory`, `/api/stock-journal`
- **Models:** `Inventory.js`, `StockJournal.js`
- **Key Features:** SKU management, warehouse tracking, stock reconciliation.

### 7. Manufacturing
- **Purpose:** Manages production planning, Bill of Materials (BOM), and work orders.
- **Backend Routes:** `/api/manufacturing`
- **Models:** `Manufacturing.js`
- **Key Features:** BOM management, production scheduling, resource allocation.

### 8. Project Management
- **Purpose:** Tracks project progress, tasks, milestones, and resource utilization.
- **Backend Routes:** `/api/projects`, `/api/project-ops`
- **Models:** `Project.js`, `ProjectOps.js`
- **Key Features:** Task boards, milestone tracking, project budgeting.

## Support & Configuration Modules

### 9. Approval Engine
- **Purpose:** A centralized system for managing multi-level approval workflows across all modules.
- **Backend Routes:** `/api/approval-engine`, `/api/settings/approvals`
- **Models:** `ApprovalConfig.js`, `ApprovalEngine.js`, `ApprovalRequest.js`, `ApprovalWorkflow.js`
- **Key Features:** Dynamic approval chains, role-based approvals, audit logs.

### 10. Settings & Branding
- **Purpose:** Global system configuration, tenant management, and UI branding.
- **Backend Routes:** `/api/settings/*`, `/api/settings/branding`, `/api/settings/company`
- **Models:** `Settings.js`, `BrandingConfig.js`, `CompanyProfile.js`

### 11. Reports & Analytics
- **Purpose:** Generates PDF/Excel reports and provides dashboard visualizations.
- **Backend Routes:** `/api/reports`
- **Key Features:** Financial statements, inventory reports, HR analytics, PDF generation.
