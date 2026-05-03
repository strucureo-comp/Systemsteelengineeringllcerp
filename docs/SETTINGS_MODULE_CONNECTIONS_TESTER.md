# Settings Module Connections - Tester Guide

## 📍 Overview: Where Settings Are Connected

This document shows exactly which modules use settings and where to find those connections.

---

## 1. **Company Settings** - Connected Modules

### Where Used:
- **Reports Module** - Company header/footer
- **Email Service** - Sender info
- **Invoice Module** - Company details
- **Document Export** - PDF headers

### Location in Code:
```
📁 backend/services/
   └─ email-notification.js (Line: 80-90) - Uses company info
   
📁 backend/routes/
   └─ reports.js - Uses company_name, company_address
   
📁 components/finance/
   └─ invoice-preview.tsx - Uses company details
```

### How to Test:
1. Go to `/admin/settings/company`
2. Change "Company Name" to "TEST COMPANY"
3. Generate Invoice PDF → Check header has "TEST COMPANY" ✅
4. Send email notification → Check email shows "TEST COMPANY" ✅

---

## 2. **Branding Settings** - Connected Modules

### Where Used:
- **Dashboard** - Logo, colors
- **Email Templates** - Brand colors
- **Login Page** - Color scheme
- **Layout Components** - Primary/secondary colors

### Location in Code:
```
📁 lib/
   └─ settings-api.ts (Line: 130-160) - branding helpers
   
📁 components/
   ├─ shared/layout/header.tsx - Uses branding_logo
   ├─ shared/layout/sidebar.tsx - Uses branding_primary_color
   └─ examples/email-template.tsx - Uses branding colors
   
📁 app/
   └─ layout.tsx - Applies branding_primary_color
```

### How to Test:
1. Go to `/admin/settings/branding`
2. Change "Primary Color" to `#FF0000` (red)
3. Refresh dashboard → Check sidebar/header is red ✅
4. Generate email → Check email has red accent color ✅

---

## 3. **Email Settings (SMTP)** - Connected Modules

### Where Used:
- **Email Notification Service** - All emails
- **Invoice Delivery** - Send by email
- **User Invitations** - Invite emails
- **Password Reset** - Reset link emails
- **Approval Notifications** - Approval emails

### Location in Code:
```
📁 backend/services/
   └─ email-notification.js (Line: 15-45) - Uses SMTP settings
      - sendInvoiceNotification()
      - sendOrderConfirmation()
      - sendApprovalRequest()
      - sendPasswordReset()
   
📁 backend/routes/
   └─ auth.js - Uses email settings for password reset
   
📁 lib/
   └─ settings-api.ts (Line: 85-115) - email.* helpers
```

### How to Test:
1. Go to `/admin/settings/advanced` (or company settings)
2. Configure SMTP:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `your-email@gmail.com`
   - Pass: `your-app-password`
   - From: `noreply@company.com`
3. Trigger email (invoice/invite) → Check inbox ✅
4. Verify "From" shows configured sender ✅

---

## 4. **Tax Settings** - Connected Modules

### Where Used:
- **Invoice Calculation** - Tax amount
- **Purchase Order** - Tax on PO
- **Financial Reports** - Tax totals
- **Receivables** - AR calculations

### Location in Code:
```
📁 components/finance/
   └─ invoice-form.tsx (Line: 120-150) - Calculates using tax_rate
   
📁 backend/routes/
   └─ finance.js - Uses tax_jurisdiction for compliance
   
📁 lib/settings-api.ts
   └─ tax.getRate() (Line: 200-210)
   
📁 components/examples/
   └─ invoice-with-settings.tsx - Full example
```

### How to Test:
1. Go to `/admin/settings/taxes`
2. Enable Tax → Set Rate to 10%
3. Create Invoice with AED 1000 subtotal
4. Check: Total = 1000 + (1000 × 10%) = 1100 ✅
5. Disable Tax → Total should be 1000 ✅

---

## 5. **Feature Flags** - Connected Modules

### Where Used:
- **Dashboard** - Show/hide widgets
- **Menu Navigation** - Show/hide menu items
- **User Roles** - Permission checks
- **Reports** - Advanced features
- **Approval Workflows** - If enabled

### Location in Code:
```
📁 components/
   ├─ shared/layout/sidebar.tsx (Line: 45-60)
   │  └─ Uses feature_approval_engine
   │  └─ Uses feature_advanced_reports
   │
   └─ admin/dashboard.tsx (Line: 80-100)
      └─ Uses feature_inventory_tracking
   
📁 app/(admin)/admin/
   ├─ approvals/ - Protected by feature_approval_engine
   └─ reports/ - Protected by feature_advanced_reports
   
📁 components/examples/
   └─ feature-flag-dashboard.tsx - Full example
```

### How to Test:
1. Go to `/admin/settings/advanced` (Features tab)
2. **Toggle "Approval Engine"** OFF → `/admin/approvals` disappears ✅
3. Toggle ON → `/admin/approvals` appears ✅
4. **Toggle "Advanced Reports"** OFF → Reports tab hidden ✅
5. Toggle ON → Reports tab visible ✅

---

## 6. **Cross-Module Connection Flow**

```
┌─────────────────────────────────────────────────────────┐
│              Settings Database                           │
│  (MongoDB - Settings Collection)                        │
└────┬────────────────────────────────────────────────────┘
     │
     ├─→ 📊 Finance Module
     │   ├─ invoice.ts (tax_rate)
     │   └─ purchaseorder.ts (tax_jurisdiction)
     │
     ├─→ 📧 Email Service
     │   ├─ email-notification.js (all SMTP settings)
     │   ├─ auth.js (password reset)
     │   └─ approvals.js (approval notifications)
     │
     ├─→ 🎨 UI/Layout
     │   ├─ layout.tsx (branding_primary_color)
     │   ├─ sidebar.tsx (branding_logo)
     │   └─ dashboard.tsx (feature flags)
     │
     ├─→ 📄 Reports Module
     │   ├─ invoice-report.ts (company_name, company_address)
     │   └─ financial-report.ts (tax_rate, jurisdiction)
     │
     └─→ 🔐 Authorization
         ├─ auth.js (feature flags)
         └─ roles.js (permissions)
```

---

## 7. **Testing Checklist**

### ✅ Company Settings
- [ ] Change company name → Appears in invoices
- [ ] Change company email → Shows in emails
- [ ] Change phone number → Shows in PDF exports
- [ ] Change address → Shows in reports

### ✅ Branding Settings
- [ ] Change primary color → Dashboard updates
- [ ] Change logo → Header updates
- [ ] Change secondary color → UI accent colors update

### ✅ Email Settings
- [ ] Configure SMTP → Can send test email
- [ ] Wrong credentials → Email fails with error
- [ ] Right credentials → Email sends successfully
- [ ] From address → Shows in received email

### ✅ Tax Settings
- [ ] Enable tax → Invoice total includes tax
- [ ] Change tax rate → Calculations update
- [ ] Change jurisdiction → Reports reflect jurisdiction
- [ ] Disable tax → Invoice shows no tax line

### ✅ Feature Flags
- [ ] Toggle approval engine → Menu item appears/disappears
- [ ] Toggle reports → Reports tab appears/disappears
- [ ] Toggle inventory → Inventory features enable/disable
- [ ] Toggle 2FA → Login form shows 2FA options

---

## 8. **How Each Module Accesses Settings**

### In React Components:
```typescript
import { useSettings } from '@/lib/hooks/use-settings';

export function MyComponent() {
  const { getSetting, updateSetting } = useSettings();
  
  // Get setting
  const taxRate = getSetting('tax_rate', 5);
  
  // Update setting
  await updateSetting('tax_rate', 10);
}
```

### In Backend (Node.js):
```javascript
const Settings = require('../models/Settings');

// Get setting
const taxSetting = await Settings.findOne({ key: 'tax_rate' });
const rate = taxSetting?.value || 5;

// Update setting
await Settings.findOneAndUpdate(
  { key: 'tax_rate' },
  { value: 10 },
  { upsert: true }
);
```

### Using Settings API Utility:
```typescript
import { settingsApi } from '@/lib/settings-api';

// Get company settings
const company = await settingsApi.company.getAll();

// Get tax rate
const rate = await settingsApi.tax.getRate();

// Update setting
await settingsApi.set('tax_rate', 10);
```

---

## 9. **File Structure Summary**

```
SETTINGS CONNECTED FILES:

Backend:
├── routes/settings.js                    ✅ API endpoints
├── models/Settings.js                    ✅ Database model
└── services/
    └── email-notification.js             ✅ Uses email settings
    
Frontend:
├── lib/settings-api.ts                   ✅ API utility
├── lib/hooks/use-settings.ts             ✅ React hook
├── components/shared/layout/
│   ├── header.tsx                        ✅ Uses branding_logo
│   └── sidebar.tsx                       ✅ Uses colors, features
├── components/finance/
│   └── invoice-form.tsx                  ✅ Uses tax_rate
├── components/examples/
│   ├── invoice-with-settings.tsx         ✅ Example
│   └── feature-flag-dashboard.tsx        ✅ Example
└── app/(admin)/admin/settings/
    ├── company/page.tsx                  ✅ Company UI
    ├── branding/page.tsx                 ✅ Branding UI
    └── ...other settings pages...        ✅ UI
```

---

## 10. **Quick Test Flow**

### Test 1: Company Setting Change
```
1. Admin → Settings → Company
2. Change "Company Name" to "TEST"
3. Generate Invoice
4. Verify invoice header shows "TEST"
```

### Test 2: Tax Rate Change
```
1. Admin → Settings → Tax
2. Set Tax Rate to 15%
3. Create invoice with 1000 subtotal
4. Verify total = 1150 (1000 + 150 tax)
```

### Test 3: Email Configuration
```
1. Admin → Settings → Email
2. Configure Gmail SMTP
3. Create Invoice
4. Click "Send by Email"
5. Check email inbox → Email received
```

### Test 4: Feature Toggle
```
1. Admin → Settings → Features
2. Toggle "Approval Engine" OFF
3. Refresh page
4. Check sidebar → Approvals menu gone
5. Toggle ON → Menu reappears
```

---

## 11. **Where to Find Each Module**

| Module | Location | Settings Used |
|--------|----------|---|
| **Invoice** | `/admin/finance/invoices` | `tax_rate`, `company_name` |
| **Reports** | `/admin/reports` | `company_*`, `branding_*` |
| **Email** | Backend service | All SMTP settings |
| **Dashboard** | `/admin/dashboard` | Feature flags, branding |
| **Settings UI** | `/admin/settings/*` | All (manages all) |

---

## 12. **Support Info for Tester**

### If settings not updating:
- [ ] Check browser console for errors
- [ ] Verify admin login
- [ ] Refresh page after saving
- [ ] Check database has settings saved: `db.settings.find()`

### If email not sending:
- [ ] Verify SMTP credentials in settings
- [ ] Check email_smtp_host is correct
- [ ] Check email_from_address is valid

### If colors not changing:
- [ ] Clear browser cache
- [ ] Check branding_primary_color saved to DB
- [ ] Verify CSS classes use CSS variables

---

## Summary

✅ **9 Modules Connected to Settings:**
1. Finance/Invoice (tax_rate, company_name)
2. Email Service (SMTP config)
3. Layout/UI (branding colors, logo)
4. Dashboard (feature flags)
5. Reports (company info, tax jurisdiction)
6. Approvals (feature_approval_engine)
7. Navigation (feature flags for menu)
8. Authentication (email for password reset)
9. Inventory (feature_inventory_tracking)

🧪 **Test Each by Changing Settings and Verifying Output**
