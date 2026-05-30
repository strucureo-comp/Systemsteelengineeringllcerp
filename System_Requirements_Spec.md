# System Requirements Specification

## 1. Overview
This document outlines the feature requirements and structural modifications for the platform, based on recent development directives.

## 2. Settings Module Consolidation
The "Ninth Module" is to be fully integrated into the Settings page. This central hub must include:
* **Company Details & Taxation:** Comprehensive settings for company profile and tax management.
* **Module Configuration:** Controls for activating/deactivating system modules.
* **Branding:** Customization options for platform branding.
* **User & Approval Flows:** Dedicated sub-sections for managing system-wide workflow approvals.

## 3. Workflow & Approval Processes

### 3.1 Payroll & Financial Approvals
* HR teams manage payroll creation.
* A formal approval chain must be implemented for financial actions, requiring sign-off from top-level management (MD/CEO) or Finance heads.
* Approved payrolls must automatically reflect in the system.

### 3.2 Operational/Project Approval
* Employees submit requests for material requirements or address shortages.
* Requests are routed to the relevant manager for approval.
* Upon approval, inventory levels must be updated, and physical/digital movement of goods is initiated.

## 4. Core Modules Requirements
* **Project Management:** Lightweight focus on tracking project commencement, financial quotations, and document archival.
* **Purchasing:** Settlement capability for operational bills (e.g., utility bills).
* **Sales:** Tracking of financial inflows/outflows, and automated generation of invoices and quotations.
* **CRM:** Standardized entry for company and customer relationship management data.

## 5. Status of "Manufacturing" Module
This module is currently set to **Hidden**. It is reserved for potential future integration and expansion upon project maturity.
