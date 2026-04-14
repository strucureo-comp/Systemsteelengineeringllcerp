# Settings Module - Backend Summary

## Quick Overview

**Status:** 🟡 **15% Complete** (Partial Auth + Generic Key-Value Store Only)

**Frontend:** ✅ **100% Complete** (8 settings pages fully functional with localStorage)  
**Backend:** ❌ **0% Integration** (No API calls from frontend to backend)

---

## What Works Today

### Existing Backend Infrastructure

| Component | Status | Endpoints Available |
|-----------|--------|---------------------|
| **Authentication** | ✅ Partial | `POST /signup`, `POST /login`, `GET /me`, `GET /users` |
| **Generic Settings** | ✅ Working | `GET/PUT /settings/:key`, `GET /settings` |
| **Approval Engine** | ✅ Complete | 20+ workflow endpoints |
| **Tax Center** | ✅ Complete | Filing/reporting (NOT config) |

### Frontend Pages (All Using localStorage)

1. ✅ **Company Settings** - Company profile, country, tax ID, contact info
2. ✅ **Branding** - Logo, colors, favicon (base64 storage)
3. ✅ **Currency & Fiscal** - Base currency, fiscal year start, accounting method
4. ✅ **Taxes** - Country tax models, custom tax creation
5. ✅ **Users** - User list, invite, enable/disable
6. ✅ **Roles** - Role CRUD, permissions matrix
7. ✅ **Modules** - Enable/disable system modules
8. ✅ **Approvals** - Per-document approval workflow config

---

## What's Missing (Critical)

### Backend APIs Needed

| Priority | API | Frontend Page | Impact |
|----------|-----|---------------|--------|
| 🔴 **P0** | `/api/settings/company` | Company | Tenant identity |
| 🔴 **P0** | `/api/settings/modules` | Modules | Sidebar visibility |
| 🔴 **P0** | `/api/auth/users` (full CRUD) | Users | Multi-user support |
| 🔴 **P0** | `/api/settings/roles` | Roles | Permission system |
| 🟠 **P1** | `/api/settings/branding` | Branding | Login page theme |
| 🟠 **P1** | `/api/settings/finance-config` | Currency | Financial transactions |
| 🟠 **P1** | `/api/settings/taxes` | Taxes | Invoice generation |
| 🟡 **P2** | `/api/settings/approvals` | Approvals | Workflow automation |

---

## Current Architecture

### Data Flow (Today)

```
Frontend Settings Page
         ↓
   localStorage
         ↓
   Browser Only
```

**Problem:** Settings not shared across devices, no persistence, no audit trail.

### Target Architecture

```
Frontend Settings Page
         ↓
   API Call (/api/settings/*)
         ↓
   Express Route
         ↓
   MongoDB Model
         ↓
   Multi-Tenant Database
```

**Benefits:** Cross-device sync, audit trail, role-based access, multi-tenant isolation.

---

## Missing Backend Components

### 1. Models (0/7 created)

- [ ] `CompanyProfile` - Company identity
- [ ] `BrandingConfig` - Theme/logos
- [ ] `FinanceConfig` - Currency/fiscal
- [ ] `TaxConfiguration` - Tax rates
- [ ] `Role` - Roles & permissions
- [ ] `ModulesConfig` - Enabled modules
- [ ] `ApprovalConfig` - Approval rules

### 2. Routes (0/8 files created)

- [ ] `/backend/routes/company-profile.js`
- [ ] `/backend/routes/branding.js`
- [ ] `/backend/routes/finance-config.js`
- [ ] `/backend/routes/roles.js`
- [ ] `/backend/routes/modules.js`
- [ ] `/backend/routes/approval-config.js`
- [ ] Enhance `/backend/routes/auth.js` (add user CRUD)

### 3. Middleware (0/3 created)

- [ ] Tenant isolation middleware
- [ ] Permission check middleware
- [ ] File upload middleware (logo/favicon)

### 4. Services (0/3 created)

- [ ] `SettingsService.js` - Centralized settings logic
- [ ] `UserService.js` - User management
- [ ] `PermissionService.js` - Permission checks

---

## Frontend Integration Needed

### Replace localStorage with API calls

**Before:**
```typescript
localStorage.setItem('company_settings', JSON.stringify(data));
const saved = localStorage.getItem('company_settings');
```

**After:**
```typescript
await fetch('/api/settings/company', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

const res = await fetch('/api/settings/company');
const data = await res.json();
```

### Add to 8 settings pages:
- [ ] Company settings page
- [ ] Branding settings page
- [ ] Currency settings page
- [ ] Tax settings page
- [ ] Users settings page
- [ ] Roles settings page
- [ ] Modules settings page
- [ ] Approvals settings page

---

## Implementation Roadmap

### Phase 1: Core Identity (Week 1-2)
- Company profile API
- Modules configuration API
- User management CRUD
- Roles & permissions API

### Phase 2: Financial Config (Week 3-4)
- Branding API + file uploads
- Finance/currency config API
- Tax configuration API

### Phase 3: Workflows (Week 5-6)
- Approval configuration API
- Frontend integration for all pages
- Testing & bug fixes

---

## Quick Start for Developers

### To Implement a New Settings API:

1. **Create Model:** `/backend/models/YourSetting.js`
   ```javascript
   const YourSettingSchema = new mongoose.Schema({
       tenant_id: { type: String, required: true },
       // ... your fields
   });
   ```

2. **Create Route:** `/backend/routes/your-setting.js`
   ```javascript
   router.get('/', auth, async (req, res) => { ... });
   router.put('/', auth, adminOnly, async (req, res) => { ... });
   ```

3. **Register Route:** `/backend/server.js`
   ```javascript
   app.use('/api/settings/your-setting', require('./routes/your-setting'));
   ```

4. **Update Frontend:** Replace localStorage with API calls

5. **Test:** Verify multi-tenant isolation, permissions, CRUD

---

## Key Decisions Made

### Multi-Tenancy
- All settings are **tenant-scoped** (isolated by `tenant_id`)
- Middleware automatically injects tenant context from JWT
- No cross-tenant data leakage

### Permissions
- Most settings require **admin role**
- Public access only for branding (login page)
- Audit trail logs all changes

### Storage
- Text settings in **MongoDB**
- Files (logo/favicon) in **S3/Cloud Storage** (URLs in MongoDB)
- Temporary base64 fallback until file upload implemented

### Backward Compatibility
- Generic `/api/settings/:key` remains for flexibility
- Dedicated endpoints for typed, validated settings
- Migration script to move localStorage → MongoDB

---

## Metrics

### Lines of Code Estimate
- Backend: ~3,500 LOC (models + routes + services + tests)
- Frontend: ~1,200 LOC (API client + updates to 8 pages)
- Total: ~4,700 LOC

### Endpoints to Create
- 25+ new endpoints across 7 route files
- 7 new database models
- 3 middleware functions
- 8 frontend pages to update

### Estimated Time
- Backend development: 7-10 days
- Frontend integration: 4-5 days
- Testing + documentation: 3-4 days
- **Total: 14-19 days**

---

## Success Criteria

### Backend ✅
- All settings APIs functional
- Multi-tenant isolation verified
- Permission checks enforced
- Audit trail working
- Tests passing (>80% coverage)

### Frontend ✅
- Zero localStorage for settings
- All pages load from backend
- Optimistic updates working
- Cross-device sync verified
- No console errors

### DevOps ✅
- MongoDB indexes optimized
- Redis caching implemented
- File uploads to S3 working
- API documentation complete

---

## Related Documents

- **Full Implementation Guide:** [SETTINGS_MODULE_BACKEND_IMPLEMENTATION_GUIDE.md](./SETTINGS_MODULE_BACKEND_IMPLEMENTATION_GUIDE.md)
- **Existing Backend:** [MODULE_01_AUTHENTICATION.md](./MODULE_01_AUTHENTICATION.md)
- **Approval Engine:** [MODULE_11_APPROVAL_ENGINE.md](./MODULE_11_APPROVAL_ENGINE.md)

---

## Quick Reference: Existing vs Needed

| Feature | Exists? | Endpoint | Status |
|---------|---------|----------|--------|
| User signup | ✅ | `POST /api/auth/signup` | Working |
| User login | ✅ | `POST /api/auth/login` | Working |
| Get current user | ✅ | `GET /api/auth/me` | Working |
| List users | ✅ | `GET /api/auth/users` | Working |
| Create/update user | ❌ | `POST/PUT /api/auth/users/:id` | **Missing** |
| Delete user | ❌ | `DELETE /api/auth/users/:id` | **Missing** |
| Invite user | ❌ | `POST /api/auth/users/invite` | **Missing** |
| Company profile | ❌ | `GET/PUT /api/settings/company` | **Missing** |
| Branding | ❌ | `GET/PUT /api/settings/branding` | **Missing** |
| Tax config | ❌ | `GET/POST/PUT /api/settings/taxes` | **Missing** |
| Roles CRUD | ❌ | `/api/settings/roles/*` | **Missing** |
| Modules config | ❌ | `GET/PUT /api/settings/modules` | **Missing** |
| Approval config | ❌ | `GET/PUT /api/settings/approvals` | **Missing** |

---

**Last Updated:** 2026-01-07  
**Status:** Ready for implementation  
**Next Step:** Create Phase 1 backend models and routes
