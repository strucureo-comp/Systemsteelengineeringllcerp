# Module Control System - Quick Start (30 Seconds)

## 🚀 In 3 Commands

```bash
# 1. Initialize modules in database
cd backend && node scripts/seed-modules.js

# 2. Start backend (keep running)
npm start

# 3. Start frontend in new terminal (keep running)
npm run dev
```

Then open: `http://localhost:3001`

---

## ✅ What You Get

- **15 Modules ENABLED**: Procurement, Sales, HR, Finance, Reports
- **13+ Modules DISABLED**: Manufacturing, Inventory, CRM, Projects, etc.
- **Sidebar**: Only shows enabled modules
- **Protected Routes**: Disabled modules redirect to dashboard
- **Settings Integration**: Tax, company name, email, etc. applied to all enabled modules

---

## 📋 Enabled vs Disabled

### ✅ ENABLED (User Can Access)
```
Procurement:
  ✅ Purchase Order
  ✅ Purchase Bill Entry

Sales:
  ✅ Sales Quote
  ✅ Sales Invoice
  ✅ Delivery Note
  ✅ Proforma Invoice

HR:
  ✅ Payslip
  ✅ Timesheet Entry

Finance:
  ✅ Payment Voucher
  ✅ Receipt Voucher
  ✅ VAT Filing
  ✅ Corporate Tax Filing

Reports:
  ✅ Financial Reports
  ✅ Audit Reports
  ✅ All Types of Reports
```

### ❌ DISABLED (Hidden & Inaccessible)
```
Manufacturing, Inventory, CRM, Projects, Operations, 
Fixed Assets, and all advanced features
```

---

## 🧪 Quick Test

1. Go to: `http://localhost:3001/admin/dashboard`
2. Login: `cfo@bridgebreak.com` / `password123`
3. Check sidebar: See ONLY enabled modules?
4. Click "Sales Invoices": Page loads?
5. Try URL: `http://localhost:3001/admin/manufacturing/bom`
6. Redirects to dashboard?

**If all ✅, system is working!**

---

## 📚 Full Documentation

| File | Purpose |
|------|---------|
| `/docs/MODULE_CONFIGURATION.md` | Complete module list + test procedures |
| `/docs/MODULE_CONTROL_SYSTEM_GUIDE.md` | How the system works + implementation |
| `/docs/DEPLOYMENT_CHECKLIST.md` | Verification steps before going live |
| `/docs/SYSTEM_READY.md` | Everything summarized in one place |

---

## 🔧 Key Files Created

```
/backend/scripts/seed-modules.js     ← Initialize DB
/lib/module-guard.tsx                 ← Protect pages
/components/examples/...              ← Implementation examples
```

---

## 💡 How It Works

```
ModuleGuard
  └─ Checks if module enabled in database
     ├─ If YES → Shows page
     └─ If NO → Redirects to dashboard

ModuleConditional
  └─ Checks if module enabled
     ├─ If YES → Shows UI element
     └─ If NO → Hides element (sidebar, widgets, etc)
```

---

## ⚠️ Important

- **Run seed script ONCE:** `node backend/scripts/seed-modules.js`
- **Check database has settings:** `db.settings.countDocuments({ key: { $regex: "^module_" } })` → should show 28
- **Restart frontend after any changes:** Kill + `npm run dev`

---

## 🆘 Troubleshooting

| Problem | Fix |
|---------|-----|
| Disabled module still accessible | Wrap page with `<ModuleGuard moduleName="module_*">` |
| Sidebar shows disabled modules | Wrap menu items with `<ModuleConditional moduleName="module_*">` |
| Settings not applying | Verify settings exist in database |
| Port in use | `lsof -ti:3001 \| xargs kill` |
| Seed didn't run | Check for errors: `node backend/scripts/seed-modules.js 2>&1` |

---

## ✨ You're Done!

System is complete and ready. See `/docs/SYSTEM_READY.md` for full summary.

**Next step:** Run the 3 commands above! 🚀
