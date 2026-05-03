# Module Control System - Deployment Checklist

## ✅ Pre-Deployment Verification

Run through this checklist before deploying to testers.

---

## 1️⃣ Database Setup

- [ ] MongoDB running and connected
- [ ] Settings collection created
- [ ] Run seed script:
  ```bash
  cd backend
  node scripts/seed-modules.js
  ```
- [ ] Verify output shows:
  ```
  [Settings Seed] ✅ Saved 28 module settings
  [Settings Seed] ENABLED MODULES:
    ✅ module_purchase_order
    ... (15 total)
  [Settings Seed] Module configuration complete!
  ```
- [ ] Check database has all settings:
  ```javascript
  db.settings.countDocuments({ key: { $regex: "^module_" } })
  // Should show: 28
  
  db.settings.countDocuments({ 
    key: { $regex: "^module_" }, 
    value: true 
  })
  // Should show: 15
  ```

---

## 2️⃣ Backend Verification

- [ ] Backend starts without errors:
  ```bash
  cd backend
  npm start
  ```
  Expected: `Express server listening on port 4000`

- [ ] API endpoints working:
  ```bash
  # Test getting a module setting
  curl http://localhost:4000/api/settings/module_purchase_order
  
  # Should return:
  # { "key": "module_purchase_order", "value": true }
  
  curl http://localhost:4000/api/settings/module_manufacturing_bom
  
  # Should return:
  # { "key": "module_manufacturing_bom", "value": false }
  ```

---

## 3️⃣ Frontend Verification

- [ ] Frontend dependencies installed:
  ```bash
  npm install
  ```

- [ ] Frontend builds without errors:
  ```bash
  npm run build
  ```

- [ ] Frontend starts without errors:
  ```bash
  npm run dev
  ```
  Expected: `Ready in X seconds`

- [ ] Can access `/admin/dashboard`

- [ ] Settings context loaded (check browser console):
  - Should NOT see errors about SettingsProvider

---

## 4️⃣ Module Guard Components

- [ ] File exists: `/lib/module-guard.tsx`
  ```bash
  ls -la lib/module-guard.tsx
  ```

- [ ] File contains all three exports:
  - [ ] `ModuleGuard` component
  - [ ] `ModuleConditional` component
  - [ ] `useModuleEnabled` hook

- [ ] No TypeScript errors:
  ```bash
  npx tsc --noEmit
  ```

---

## 5️⃣ Example Files

- [ ] File exists: `/components/examples/module-guard-examples.tsx`
- [ ] File contains examples for:
  - [ ] Protected page with ModuleGuard
  - [ ] Conditional sidebar menu
  - [ ] Dashboard widgets
  - [ ] useModuleEnabled hook usage

- [ ] Examples compile without errors

---

## 6️⃣ Documentation

- [ ] `/docs/MODULE_CONFIGURATION.md` exists
  - [ ] Lists all 15 enabled modules
  - [ ] Lists all disabled modules
  - [ ] Has test procedures
  - [ ] Has tester checklist

- [ ] `/docs/MODULE_CONTROL_SYSTEM_GUIDE.md` exists
  - [ ] Has implementation patterns
  - [ ] Has module names reference
  - [ ] Has troubleshooting guide

---

## 7️⃣ UI Testing

### Test Sidebar
- [ ] Sidebar shows ONLY enabled modules:
  - [ ] ✅ Procurement
  - [ ] ✅ Sales
  - [ ] ✅ HR
  - [ ] ✅ Finance
  - [ ] ✅ Reports

- [ ] Sidebar does NOT show disabled modules:
  - [ ] ❌ Manufacturing
  - [ ] ❌ Inventory
  - [ ] ❌ CRM
  - [ ] ❌ Projects
  - [ ] ❌ Operations

### Test Protected Routes
- [ ] Can access: `/admin/purchases/purchase-orders`
  - [ ] Page loads successfully

- [ ] Can access: `/admin/sales/invoices`
  - [ ] Page loads successfully

- [ ] Can access: `/admin/hr/payslips`
  - [ ] Page loads successfully

- [ ] Can access: `/admin/finance/payment-vouchers`
  - [ ] Page loads successfully

- [ ] Can access: `/admin/reports/financial`
  - [ ] Page loads successfully

- [ ] CANNOT access: `/admin/manufacturing/bom`
  - [ ] Redirects to `/admin/dashboard`

- [ ] CANNOT access: `/admin/inventory/stock`
  - [ ] Redirects to `/admin/dashboard`

- [ ] CANNOT access: `/admin/crm/leads`
  - [ ] Redirects to `/admin/dashboard`

---

## 8️⃣ Settings Integration

- [ ] Company name in settings:
  ```bash
  curl http://localhost:4000/api/settings/company_name
  # Should return actual value
  ```

- [ ] Tax rate in settings:
  ```bash
  curl http://localhost:4000/api/settings/tax_rate
  # Should return percentage
  ```

- [ ] Email settings populated:
  ```bash
  curl http://localhost:4000/api/settings/email_smtp_host
  # Should return hostname
  ```

- [ ] Test module can read these settings:
  - [ ] Create invoice → shows company name
  - [ ] Calculate tax → uses tax_rate
  - [ ] Send email → uses SMTP settings

---

## 9️⃣ Performance Check

- [ ] Page load time under 2 seconds
  - [ ] Navigate to `/admin/dashboard`
  - [ ] Check network tab (DevTools)
  - [ ] Total time < 2s

- [ ] No console errors:
  - [ ] Open browser DevTools
  - [ ] Go to Console tab
  - [ ] Should see NO red errors

- [ ] No network errors:
  - [ ] Open DevTools → Network tab
  - [ ] All requests should be 200/201
  - [ ] No 404 or 500 errors

---

## 🔟 Authentication

- [ ] Can login with admin account:
  ```
  Email: cfo@bridgebreak.com
  Password: password123
  ```

- [ ] After login, can access admin pages

- [ ] Without login, cannot access admin pages:
  - [ ] Try accessing `/admin/dashboard` without auth
  - [ ] Should redirect to `/login`

---

## 1️⃣1️⃣ Tester Handoff Preparation

- [ ] Create test account for tester (optional):
  ```javascript
  // In backend MongoDB shell
  db.users.insertOne({
    email: "tester@bridgebreak.com",
    password: "hashed_password",
    role: "admin",
    createdAt: new Date()
  })
  ```

- [ ] Prepare test data:
  - [ ] Sample suppliers in database
  - [ ] Sample customers in database
  - [ ] Sample products in database

- [ ] Send tester these files:
  - [ ] `/docs/MODULE_CONFIGURATION.md`
  - [ ] `/docs/MODULE_CONTROL_SYSTEM_GUIDE.md`
  - [ ] Login credentials
  - [ ] URL: `http://localhost:3001`

- [ ] Give tester this checklist:
  ```
  ENABLED MODULES TO TEST:
  □ Purchase Orders
  □ Purchase Bills
  □ Sales Quotes
  □ Sales Invoices
  □ Delivery Notes
  □ Proforma Invoices
  □ Payslips
  □ Timesheets
  □ Payment Vouchers
  □ Receipt Vouchers
  □ VAT Filing
  □ Corporate Tax
  □ Financial Reports
  □ Audit Reports
  
  FOR EACH MODULE:
  □ Module appears in sidebar
  □ Can navigate to module
  □ Can create new entry
  □ Settings apply (tax, company name, etc)
  □ Can save changes
  
  VERIFY DISABLED:
  □ Manufacturing not in sidebar
  □ Inventory not in sidebar
  □ CRM not in sidebar
  □ Cannot access disabled module URLs
  ```

---

## ✨ Final Checks

- [ ] All code compiled without errors
- [ ] All routes accessible
- [ ] All settings in database
- [ ] No console errors
- [ ] No network errors
- [ ] Authentication working
- [ ] Sidebar shows correct modules
- [ ] Protected routes work
- [ ] Documentation complete
- [ ] Tester ready to test

---

## 🚀 Deployment Command

When everything is verified, deploy with:

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend (different terminal)
npm run dev

# Terminal 3: Run seed (one time)
cd backend
node scripts/seed-modules.js
```

---

## 📞 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Disabled module still visible | Run seed script again |
| ModuleGuard not redirecting | Check module name in code |
| Settings not applying | Verify settings in database |
| Page won't load | Check browser console for errors |
| Can't login | Run seed.js in backend folder |
| Port already in use | Kill process: `lsof -ti:3001 \| xargs kill` |

---

## 📊 Completion Status

When all boxes are checked:
```
✅ Database: Ready
✅ Backend: Running
✅ Frontend: Running
✅ Module Guard: Implemented
✅ Sidebar: Updated
✅ Protected Routes: Working
✅ Documentation: Complete
✅ Ready for Testing
```

**System Status: READY FOR DEPLOYMENT** 🎉
