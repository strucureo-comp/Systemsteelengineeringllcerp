# BridgeBreak ERP

**Version:** 0.1.0  
**Status:** ✅ Production Ready  
**Last Updated:** May 5, 2026

---

## Quick Start

### For System Administrators

1. **Review Documentation**
   - See the system overview below for an understanding of the modules.

2. **Prepare Infrastructure**
   ```bash
   # Install prerequisites
   - Node.js 18 LTS
   - MongoDB 4.4+
   - Docker (optional)
   - Nginx (optional, for reverse proxy)
   ```

3. **Deploy**
   ```bash
   npm run dev  # Local development
   ```

4. **Configure**
   ```bash
   # Create .env with your settings
   # (Refer to backend/config/db.js for required variables)
   ```

5. **Verify**
   ```bash
   npm run build  # Frontend build
   ```

---

## System Overview

### What BridgeBreak ERP Does

**BridgeBreak** is a comprehensive enterprise resource planning system supporting 13+ business modules:

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **Finance** | GL, Invoices, Expenses | Chart of Accounts, GL Posting, Audit Trail |
| **Inventory** | Stock Management | FIFO Costing, Warehouse Operations |
| **HRMS** | HR & Payroll | Employees, Attendance, Payroll, Leaves |
| **Sales/CRM** | Customer Management | Leads, Opportunities, Sales Orders |
| **Procurement** | Purchase Management | POs, RFQs, GRNs, Vendor Bills |
| **Manufacturing** | Production | BOMs, Production Orders, Work Orders |
| **Projects** | Project Management | Project Tracking, Resources, Timesheets |
| **Receivables** | AR Management | Customer Invoices, Aging Reports |
| **Payables** | AP Management | Vendor Bills, Payment Tracking |
| **Tax** | Tax Management | Tax Codes, Configurations |
| **Approval Engine** | Workflow Automation | Multi-level Approvals, Audit Trail |
| **Operations** | Operations | Meetings, Planning, Support |
| **Fixed Assets** | Asset Tracking | Asset Management, Depreciation |

### Technology Stack

```
Frontend:     Next.js 13.5.1 + React 18 + TypeScript + Tailwind CSS
Backend:      Express.js + Node.js + MongoDB (Mongoose)
Auth:         JWT + bcryptjs (8-hour sessions + 30-day refresh)
UI:           Radix UI + 45+ custom components
Testing:      Jest + Supertest
Deployment:   Docker, Docker Compose, PM2, Nginx
```

---

## Starting the System

### Development
```bash
# Terminal 1 - Backend (port 4000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
npm run dev

# Open http://localhost:3000 in browser
```

---

## Initial Setup

### 1. User Creation

**Via UI:**
1. Navigate to http://localhost:3000
2. Click "Sign Up"
3. Enter: email, password, full name
4. Create admin account (first user)
5. Set role to "Admin"

### 2. Company Configuration

1. Login with admin account
2. Navigate to **Settings → Company**
3. Enter company details and default currency.

### 3. Module Configuration

1. Go to **Settings → Modules**
2. Enable/disable modules based on your needs.

---

## Monitoring & Maintenance

### Logs

Check the console output of the running processes for logs.

---

## Security Best Practices

- ✅ Change default admin password immediately
- ✅ Use strong passwords
- ✅ Enable HTTPS/SSL
- ✅ Configure firewall rules
- ✅ Regular security audits
- ✅ Keep Node.js and MongoDB updated
- ✅ Review user permissions quarterly
- ✅ Use separate credentials for each environment

---

**Status:** ✅ **PRODUCTION READY**

Ready for deployment, testing, and immediate use.
