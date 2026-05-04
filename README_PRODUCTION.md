# BridgeBreak ERP - Production README

**Version:** 0.1.0  
**Status:** ✅ Production Ready  
**Last Updated:** May 5, 2026

---

## Quick Start

### For System Administrators

1. **Review Documentation**
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - How to deploy
   - [ERP_TESTING_REPORT.md](ERP_TESTING_REPORT.md) - How to test
   - [CRITICAL_FIXES_APPLIED.md](CRITICAL_FIXES_APPLIED.md) - What was fixed

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
   # See DEPLOYMENT_GUIDE.md for detailed instructions
   docker-compose up -d  # Or: npm run dev (local)
   ```

4. **Configure**
   ```bash
   # Create .env with your settings
   cp .env.example .env
   nano .env  # Edit with your values
   ```

5. **Verify**
   ```bash
   ./verify-completion.sh
   npm test  # Backend tests
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

### Production (Docker)
```bash
docker-compose up -d
# Services available at:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:4000
# - API: http://localhost:4000/api
```

### Production (PM2)
```bash
pm2 start ecosystem.config.js --env production
pm2 logs
pm2 monit
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

**Via API:**
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "Admin@Pass123",
    "full_name": "Administrator"
  }'
```

### 2. Company Configuration

1. Login with admin account
2. Navigate to **Settings → Company**
3. Enter:
   - Company name
   - Company address
   - Contact information
   - Default currency

### 3. Module Configuration

1. Go to **Settings → Modules**
2. Enable/disable modules based on your needs
3. Enabled modules appear in sidebar

### 4. Chart of Accounts Setup

1. Go to **Finance → Chart of Accounts**
2. Create GL accounts:
   - Assets (1000-1999)
   - Liabilities (2000-2999)
   - Equity (3000-3999)
   - Revenue (4000-4999)
   - Expenses (5000-5999)

### 5. Create Additional Users

1. Go to **Settings → Users**
2. Click "Add User"
3. Enter email and assign role
4. User will receive invitation email
5. User accepts invitation and sets password

---

## Daily Operations

### Finance Tasks

**Create Invoice:**
1. Finance → Invoices → New
2. Select customer
3. Add line items (description, qty, price)
4. Set tax rate
5. Click "Post to GL"
6. Invoice posts to Receivables

**Record Expense:**
1. Finance → Expenses → New
2. Select category and vendor
3. Enter amount
4. Upload receipt (optional)
5. Click "Submit for Approval"
6. Once approved, posts to GL

**View GL Report:**
1. Finance → Reports → General Ledger
2. Select date range
3. View trial balance (debits = credits)
4. Export to PDF if needed

### Procurement Tasks

**Create Purchase Order:**
1. Purchases → Orders → New
2. Select vendor
3. Add line items
4. Set payment terms
5. Submit for approval
6. Once approved, send to vendor

**Receive Goods:**
1. Purchases → GRNs → New
2. Link to PO
3. Enter received quantities
4. Click "Create GRN"
5. Inventory updated automatically

**Pay Vendor:**
1. Purchases → Payments → New
2. Select vendor and bill
3. Enter amount
4. Click "Post Payment"
5. Payables and GL updated

### HR Tasks

**Onboard Employee:**
1. HR → Team → New Employee
2. Enter personal details
3. Set salary and benefits
4. Upload documents
5. Employee activated

**Record Attendance:**
1. HR → Attendance → Daily
2. Mark present/absent for each employee
3. System auto-calculates leave balance
4. Submit for month-end

**Run Payroll:**
1. HR → Payroll → New Run
2. Select month
3. Review salary calculations
4. Approve
5. System generates payslips
6. Posting to GL (salary expense + bank)

---

## Monitoring & Maintenance

### Health Checks

**Daily:**
```bash
# Check API
curl http://your-server:4000/api/health

# Check database
mongosh --eval "db.adminCommand('ping')"

# Check disk space
df -h
```

**Weekly:**
- Review error logs
- Check backup status
- Verify all modules accessible
- Test approval workflows

**Monthly:**
- Database maintenance (reindex)
- Password policy review
- Role permission audit
- System performance analysis

### Backup & Recovery

**Backup Database:**
```bash
mongodump --db bridgebreak --out ./backup/$(date +%Y%m%d)
```

**Restore Database:**
```bash
mongorestore --db bridgebreak ./backup/20260505/bridgebreak
```

**Backup Frequency:**
- ✅ Daily (automated)
- ✅ Weekly (full + incremental)
- ✅ Monthly (archive to offline storage)

### Logs

**View Logs:**
```bash
# Frontend
docker logs bridgebreak-frontend

# Backend
docker logs bridgebreak-backend

# MongoDB
docker logs bridgebreak-mongodb
```

**Log Retention:**
- 7 days (production)
- 14 days (staging)
- Archive older logs monthly

---

## Security

### Required Actions

1. **Change Default Secrets**
   ```bash
   # Edit .env
   JWT_SECRET=<generate-strong-random-32-char-string>
   SMTP_PASS=<your-actual-smtp-password>
   ```

2. **Enable HTTPS**
   ```bash
   # Install SSL certificate (Let's Encrypt)
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Configure Nginx to use certificate
   # See DEPLOYMENT_GUIDE.md for Nginx config
   ```

3. **Configure CORS**
   ```bash
   # Edit .env
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Set Up Email**
   ```bash
   # Configure SMTP in .env
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=erp@yourdomain.com
   SMTP_PASS=your-password
   ```

### Best Practices

- ✅ Change default admin password immediately
- ✅ Use strong passwords (min 8 chars, mixed case, numbers, special)
- ✅ Enable HTTPS/SSL
- ✅ Configure firewall rules
- ✅ Regular security audits
- ✅ Keep Node.js and MongoDB updated
- ✅ Review user permissions quarterly
- ✅ Use separate credentials for each environment

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker logs bridgebreak-backend
docker logs bridgebreak-frontend

# Check port availability
lsof -i :3000
lsof -i :4000

# Clear and restart
docker-compose down
docker-compose up -d
```

### Database Connection Failed

```bash
# Verify MongoDB is running
docker ps | grep mongo

# Test connection
mongosh "mongodb://localhost:27017/bridgebreak"

# Check connection string in .env
cat .env | grep MONGODB_URI
```

### High CPU/Memory Usage

```bash
# Check resource usage
docker stats

# Check slow queries (MongoDB)
mongosh
> use bridgebreak
> db.currentOp()

# Restart services if needed
docker-compose restart backend
```

### Users Can't Login

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Check user exists in database
mongosh
> use bridgebreak
> db.users.find({"email": "user@example.com"})

# Reset password
# 1. Send forgot-password email
# 2. User follows reset link
# 3. User sets new password
```

---

## Getting Help

### Documentation Files

1. **DEPLOYMENT_GUIDE.md** - How to deploy
2. **ERP_TESTING_REPORT.md** - Testing procedures and workflows
3. **CRITICAL_FIXES_APPLIED.md** - What was fixed
4. **COMPLETION_SUMMARY.md** - Project completion details
5. **docs/** - Module-specific documentation

### Common Tasks

- **Setup:** See DEPLOYMENT_GUIDE.md → Local Development
- **Testing:** See ERP_TESTING_REPORT.md → Demo Test Cases
- **Workflows:** See ERP_TESTING_REPORT.md → Full Workflows to Test
- **API:** See backend/config/swagger.js for API documentation

---

## System Requirements

### Minimum
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB
- Bandwidth: 10 Mbps

### Recommended
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB
- Bandwidth: 50 Mbps

### Scalable To
- CPU: 16+ cores
- RAM: 32+ GB
- Storage: 1+ TB
- Multi-region deployment

---

## Support

**For Issues:**
1. Check logs: `docker logs <service>`
2. Review documentation
3. Run diagnostics: `./verify-completion.sh`
4. Contact support with:
   - Error message
   - System version
   - Steps to reproduce
   - Environment details

**For Features:**
1. Review module documentation in ERP_TESTING_REPORT.md
2. Check module status in Settings → Modules
3. Follow workflow in ERP_TESTING_REPORT.md → Workflows

---

## Version & Support

| Component | Version | Support |
|-----------|---------|---------|
| BridgeBreak ERP | 0.1.0 | Active |
| Node.js | 18 LTS | Active |
| MongoDB | 5.0+ | Active |
| Next.js | 13.5.1 | Active |
| Express | 4.18 | Active |

---

**Status:** ✅ **PRODUCTION READY**

Ready for deployment, testing, and immediate use.

For detailed deployment steps, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)  
For testing procedures, see [ERP_TESTING_REPORT.md](ERP_TESTING_REPORT.md)  
For fixes applied, see [CRITICAL_FIXES_APPLIED.md](CRITICAL_FIXES_APPLIED.md)
