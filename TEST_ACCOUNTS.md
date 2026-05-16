# Test Accounts

This file contains the standard accounts used for testing the BridgeBreak ERP system. 
The database has been seeded with a single tenant (`tenant_1`) and three primary roles.

## Common Credentials
- **Password for all accounts:** `password123`
- **Tenant ID (internal):** `tenant_1`

## Accounts

| Role | Email | Permissions | Purpose |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `admin@systemsteel.com` | Full access (View, Create, Edit) across all modules. | Testing global settings, overriding approvals, and configuring the system. |
| **Manager** | `manager@systemsteel.com` | View and Create access across modules. | Testing standard managerial workflows, creating POs, assigning tasks. |
| **Employee** | `employee@systemsteel.com` | Read-only access across modules. | Testing visibility restrictions, applying for leave, viewing payslips. |

*Note: Use the Chrome DevTools MCP to log in with these credentials when performing autonomous tests.*
