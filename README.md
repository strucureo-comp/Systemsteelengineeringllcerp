# 🏗️ BridgeBreak ERP
### Next-Generation Enterprise Resource Planning System

[![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=flat-square)](https://github.com/systemsteel/erp)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)](https://github.com/systemsteel/erp)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20|%20Express%20|%20MongoDB-61dafb?style=flat-square)](https://github.com/systemsteel/erp)

BridgeBreak is a comprehensive, modular, and ultra-fast ERP solution designed for modern enterprises. Built with a decoupled architecture, it offers seamless management of finance, human resources, supply chain, and manufacturing operations.

---

## 📚 Documentation Wiki
For detailed guides on every aspect of the system, please refer to our internal wiki:
- **[🏗️ System Architecture](docs/architecture.md)**
- **[📦 ERP Modules Guide](docs/modules.md)**
- **[🚀 Backend Development](docs/backend.md)**
- **[🎨 Frontend Development](docs/frontend.md)**
- **[🧪 Testing & Quality Assurance](docs/testing.md)**

---

## 💎 Key Business Modules

| Module | Core Functionality |
| :--- | :--- |
| **💰 Finance** | General Ledger, Multi-currency, VAT/Tax Filing, Vouchers, and Financial Auditing. |
| **👥 HRMS** | Employee Lifecycle, Attendance Tracking, Payroll (with LOP), and Document Management. |
| **📈 CRM & Sales** | Lead Pipelines, Interactive Quotations (PDF), Proforma Invoices, and Customer Statements. |
| **📦 Supply Chain** | Purchase Orders, 3-way Matching, Inventory Stock Journals, and Warehouse Management. |
| **🏭 Manufacturing** | Bill of Materials (BOM), Work Orders, and Production Scheduling. |
| **🛠️ Project Ops** | Task Boards, Milestone Tracking, and Resource Utilization. |
| **🛡️ Approval Engine** | Multi-level, role-based workflows for critical business documents. |

---

## 🚀 Performance & Technical Excellence
The system is optimized for enterprise-grade speed and reliability:
- **Ultra-Fast Interaction:** Sub-250ms page loads using Next.js App Router and optimized tree-shaking.
- **Native DB Speed:** MongoDB Aggregation Pipelines for heavy calculations (Revenue, COGS, LOP).
- **Scalable Middleware:** Built-in payload compression (Gzip) and intelligent client-side caching for lookup data.
- **Data Integrity:** Strict MongoDB Transactions for all financial double-entry postings.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 13+ (App Router), TypeScript, Tailwind CSS, Radix UI.
- **Backend:** Node.js, Express.js, Mongoose.
- **Database:** MongoDB (Document-oriented, optimized for flexibility).
- **Infrastructure:** Docker, GitHub Actions CI/CD, Helmet Security.

---

## 🚦 Getting Started

### 1. Prerequisites
- **Node.js:** 18.x or higher (LTS recommended)
- **Database:** MongoDB 6.0+
- **Package Manager:** npm or yarn

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/systemsteel/erp.git
cd erp

# Install dependencies for both frontend and backend
npm install
cd backend && npm install && cd ..

# Setup Environment
cp .env.example .env
# Edit .env with your MONGODB_URI and JWT_SECRET
```

### 3. Database Initialization
```bash
# Clear database and seed standard test accounts
node backend/scripts/seed.js
```
*Standard test credentials can be found in `TEST_ACCOUNTS.md`.*

### 4. Running the Development Environment
```bash
# Start Backend (Port 4000)
npm run dev:backend

# Start Frontend (Port 3000)
npm run dev
```

---

## 🔒 Security
- **Authentication:** Stateless JWT with secure cookie/header handling.
- **Isolation:** Robust `tenantGuard` middleware ensuring multi-tenant data privacy.
- **Sanitization:** Integrated NoSQL injection prevention and XSS cleaning.
- **Audit Logs:** Full traceability for all financial and administrative actions.

---

## 🤝 Contribution & Maintenance
- **Testing:** Always run `npm run typecheck` and `npm test` before contributing.
- **Style:** Adhere to the established Tailwind/Radix UI patterns.
- **Branching:** Follow the `feature/name` or `fix/name` naming convention.

---

**Status:** ✅ **PRODUCTION READY** | Managed by Strucureo Technologies.
