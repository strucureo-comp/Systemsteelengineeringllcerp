# Settings Module - Backend Implementation Guide

## Executive Summary

**Current Status:** All settings frontend pages are fully implemented and functional using localStorage. **ZERO backend integration exists** for settings persistence.

**Frontend Completion:** 8 settings pages (100% complete UI)
**Backend Completion:** 15% (only partial auth + generic settings key-value store)

**Priority:** HIGH - Settings data must persist across devices/sessions and be multi-tenant aware.

---

## Frontend Pages Inventory

### ✅ Implemented Frontend Pages
All pages located in: `/app/(admin)/admin/settings/`

| Page | Status | Data Storage | Backend Needed |
|------|--------|--------------|----------------|
| **Company** | ✅ Complete | localStorage | ✅ YES |
| **Branding** | ✅ Complete | localStorage | ✅ YES |
| **Currency** | ✅ Complete | localStorage | ✅ YES |
| **Taxes** | ✅ Complete | localStorage | ✅ YES |
| **Users** | ✅ Complete | localStorage | ✅ YES |
| **Roles** | ✅ Complete | localStorage | ✅ YES |
| **Modules** | ✅ Complete | localStorage | ✅ YES |
| **Approvals** | ✅ Complete | localStorage | ✅ YES |

---

## Backend API Requirements by Page

### 1. Company Settings

**Frontend:** `/app/(admin)/admin/settings/company/page.tsx`

**Data Structure:**
```typescript
interface CompanyProfile {
    companyName: string;
    businessType: 'manufacturing' | 'services' | 'retail' | 'construction' | 'consulting' | 'logistics';
    companySize: 'startup' | 'smb' | 'enterprise';
    country: string;  // ISO 2-letter code
    address: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    baseCurrency: string;
    fiscalYearStart: string;  // Month number (1-12)
    defaultTaxName: string;
    defaultTaxRate: number;
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/company` | Get company profile | Required | - |
| `PUT` | `/api/settings/company` | Update company profile | Admin only | CompanyProfile |

**Backend Schema Addition:**
```javascript
// Use existing Settings model with key = 'company_profile'
// OR create dedicated CompanyProfile model:
const CompanyProfileSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    companyName: String,
    businessType: String,
    companySize: String,
    country: String,
    address: String,
    phone: String,
    email: String,
    website: String,
    taxId: String,
    baseCurrency: String,
    fiscalYearStart: Number,
    defaultTaxName: String,
    defaultTaxRate: Number,
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
```

**Implementation Status:** ❌ Missing  
**Existing Infrastructure:** ✅ Generic `/api/settings/:key` exists but not used by frontend

---

### 2. Branding Settings

**Frontend:** `/app/(admin)/admin/settings/branding/page.tsx`

**Data Structure:**
```typescript
interface BrandingConfig {
    logo: string | null;  // Base64 data URL
    primaryColor: string;  // Hex color
    accentColor: string;  // Hex color
    footerText: string;
    favicon: string | null;  // Base64 data URL
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/branding` | Get branding config | Public (for login page) | - |
| `PUT` | `/api/settings/branding` | Update branding | Admin only | BrandingConfig |
| `POST` | `/api/settings/branding/upload-logo` | Upload logo file | Admin only | FormData (file) |
| `POST` | `/api/settings/branding/upload-favicon` | Upload favicon | Admin only | FormData (file) |

**Backend Schema Addition:**
```javascript
const BrandingSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    logo_url: String,  // S3/cloud storage URL
    logo_data: String,  // Base64 fallback
    primaryColor: { type: String, default: '#0F172A' },
    accentColor: { type: String, default: '#10B981' },
    footerText: String,
    favicon_url: String,
    favicon_data: String,
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
```

**Implementation Status:** ❌ Missing  
**Dependencies:** File upload handling (multer/S3), public access for branding on login page

---

### 3. Currency & Fiscal Settings

**Frontend:** `/app/(admin)/admin/settings/currency/page.tsx`

**Data Structure:**
```typescript
interface FinanceConfig {
    baseCurrency: string;  // ISO 3-letter code (AED, USD, EUR)
    fiscalYearStart: string;  // Month number
    accountingMethod: 'accrual' | 'cash';
    selectedCountry: string;  // ISO 2-letter code
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/finance-config` | Get fiscal/currency config | Required | - |
| `PUT` | `/api/settings/finance-config` | Update finance config | Admin only | FinanceConfig |

**Backend Schema Addition:**
```javascript
const FinanceConfigSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, unique: true },
    baseCurrency: { type: String, default: 'USD' },
    fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
    accountingMethod: { type: String, enum: ['accrual', 'cash'], default: 'accrual' },
    selectedCountry: String,
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
```

**Implementation Status:** ❌ Missing  
**Sync Required:** Must sync with company profile country selection

---

### 4. Tax Configuration

**Frontend:** `/app/(admin)/admin/settings/taxes/page.tsx`

**Data Structure:**
```typescript
interface Tax {
    id: string;
    name: string;  // "VAT", "GST", "IGST", etc.
    rate: number;
    type: 'sales' | 'purchase' | 'both';
    enabled: boolean;
    isDefault?: boolean;
    isCompound?: boolean;  // For India GST (CGST+SGST)
    description?: string;
}

interface TaxConfig {
    selectedCountry: string;
    customTaxes: Tax[];  // User-created taxes
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/taxes` | Get all enabled taxes | Required | - |
| `POST` | `/api/settings/taxes` | Create custom tax | Admin only | Tax |
| `PUT` | `/api/settings/taxes/:id` | Update tax | Admin only | Tax |
| `DELETE` | `/api/settings/taxes/:id` | Delete custom tax | Admin only | - |
| `PUT` | `/api/settings/taxes/:id/toggle` | Enable/disable tax | Admin only | { enabled: boolean } |

**Backend Schema Addition:**
```javascript
const TaxConfigurationSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    taxId: { type: String, required: true, unique: true },  // Custom ID
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    type: { type: String, enum: ['sales', 'purchase', 'both'], default: 'both' },
    enabled: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isCompound: { type: Boolean, default: false },
    description: String,
    countryCode: String,
    isCustom: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
```

**Implementation Status:** ❌ Missing  
**Existing Infrastructure:** ⚠️ `/api/tax-center` exists but for **filing/reporting**, not configuration  
**Note:** TaxCenter is for compliance (filing periods, jurisdictions). This is for **operational tax rates** used in invoices.

---

### 5. User Management

**Frontend:** `/app/(admin)/admin/settings/users/page.tsx`

**Data Structure:**
```typescript
interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'pending' | 'disabled';
    invitedBy?: string;
    invitedAt?: string;
    lastLogin?: string;
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/auth/users` | List all users | Admin only | - |
| `POST` | `/api/auth/users/invite` | Invite user via email | Admin only | { email, role } |
| `PUT` | `/api/auth/users/:id` | Update user details | Admin only | { name, role, status } |
| `DELETE` | `/api/auth/users/:id` | Delete user | Admin only | - |
| `PUT` | `/api/auth/users/:id/toggle-status` | Enable/disable user | Admin only | { status } |
| `POST` | `/api/auth/users/:id/reset-password` | Send password reset | Admin only | - |
| `PUT` | `/api/auth/users/:id/change-role` | Update user role | Admin only | { role } |

**Implementation Status:** ⚠️ **Partial**  
**Existing:** `GET /api/auth/users` exists (returns all users)  
**Missing:** Create, Update, Delete, Invite, Status toggle, Password reset

**Backend Enhancement Required:**
```javascript
// Add to User model:
status: { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' },
invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
invited_at: Date,
last_login: Date,
password_reset_token: String,
password_reset_expires: Date,
invitation_token: String,
invitation_expires: Date,
```

---

### 6. Roles & Permissions

**Frontend:** `/app/(admin)/admin/settings/roles/page.tsx`

**Data Structure:**
```typescript
interface Permission {
    module: string;  // "Sales CRM", "Finance Hub", etc.
    view: boolean;
    create: boolean;
    edit: boolean;
    approve: boolean;
}

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    isDefault?: boolean;
    isCustom?: boolean;
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/roles` | List all roles | Admin only | - |
| `POST` | `/api/settings/roles` | Create custom role | Admin only | Role |
| `PUT` | `/api/settings/roles/:id` | Update role permissions | Admin only | Role |
| `DELETE` | `/api/settings/roles/:id` | Delete custom role | Admin only | - |
| `GET` | `/api/settings/roles/check-permission` | Check if user has permission | Required | { module, action } |

**Backend Schema Addition:**
```javascript
const RoleSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    permissions: [{
        module: String,
        view: Boolean,
        create: Boolean,
        edit: Boolean,
        approve: Boolean,
    }],
    isDefault: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Add compound index
RoleSchema.index({ tenant_id: 1, name: 1 }, { unique: true });
```

**Implementation Status:** ❌ Missing  
**Integration Required:** User model must reference Role, permission checks in middleware

---

### 7. Modules Configuration

**Frontend:** `/app/(admin)/admin/settings/modules/page.tsx`

**Data Structure:**
```typescript
interface Module {
    id: string;  // 'finance', 'sales', 'hr', 'inventory', etc.
    name: string;
    description: string;
    enabled: boolean;
    required: boolean;
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/modules` | Get enabled modules | Required | - |
| `PUT` | `/api/settings/modules/:id/toggle` | Enable/disable module | Admin only | { enabled: boolean } |

**Backend Schema Addition:**
```javascript
const ModulesConfigSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, unique: true },
    modules: {
        finance: { type: Boolean, default: true },
        sales: { type: Boolean, default: true },
        operations: { type: Boolean, default: false },
        hr: { type: Boolean, default: false },
        inventory: { type: Boolean, default: true },
        projects: { type: Boolean, default: false },
        manufacturing: { type: Boolean, default: false },
        procurement: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        compliance: { type: Boolean, default: false },
    },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
```

**Implementation Status:** ❌ Missing  
**Integration Required:** Frontend sidebar must fetch from backend, not localStorage

---

### 8. Approval Workflows Configuration

**Frontend:** `/app/(admin)/admin/settings/approvals/page.tsx`

**Data Structure:**
```typescript
interface DocumentApprovalConfig {
    enabled: boolean;
    approverRole: string;
    threshold?: number;
}

interface ModuleApprovalConfig {
    [documentType: string]: DocumentApprovalConfig;
}

interface AllApprovalsConfig {
    sales: ModuleApprovalConfig;  // quotation, proformaInvoice, salesInvoice, deliveryNote
    purchase: ModuleApprovalConfig;  // purchaseOrder, purchaseBill
    hr: ModuleApprovalConfig;  // payslip
    finance: ModuleApprovalConfig;  // paymentVoucher, receiptVoucher
}
```

**Required Backend Endpoints:**

| Method | Endpoint | Description | Auth | Payload |
|--------|----------|-------------|------|---------|
| `GET` | `/api/settings/approvals` | Get approval config for all modules | Admin only | - |
| `PUT` | `/api/settings/approvals` | Update approval config | Admin only | AllApprovalsConfig |
| `GET` | `/api/settings/approvals/:module/:docType` | Get specific doc approval config | Required | - |

**Backend Schema Addition:**
```javascript
const ApprovalConfigSchema = new mongoose.Schema({
    tenant_id: { type: String, required: true, index: true },
    module: { type: String, required: true },  // 'sales', 'purchase', 'hr', 'finance'
    documentType: { type: String, required: true },  // 'quotation', 'salesInvoice', etc.
    enabled: { type: Boolean, default: false },
    approverRole: String,
    threshold: Number,
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Compound unique index
ApprovalConfigSchema.index({ tenant_id: 1, module: 1, documentType: 1 }, { unique: true });
```

**Implementation Status:** ❌ Missing  
**Existing Infrastructure:** ⚠️ `/api/approval-engine` exists for **runtime approval workflows**, not configuration  
**Note:** ApprovalEngine handles actual approval requests/history. This is for **configuring which documents need approval**.

---

## Backend Architecture Recommendations

### Multi-Tenancy Strategy

All settings must be **tenant-aware**:

```javascript
// Middleware to inject tenant_id
const tenantMiddleware = (req, res, next) => {
    req.tenant_id = req.user?.tenant_id || 'default';
    next();
};

// Apply to all settings routes
router.use('/api/settings/*', auth, tenantMiddleware);
```

### Settings Service Layer

Create centralized settings service:

```javascript
// backend/services/SettingsService.js
class SettingsService {
    async getCompanyProfile(tenant_id) { ... }
    async updateCompanyProfile(tenant_id, data, user_id) { ... }
    async getBranding(tenant_id) { ... }
    async getFinanceConfig(tenant_id) { ... }
    async getAllSettings(tenant_id) { ... }
    
    // Bulk initialization for new tenants
    async initializeDefaultSettings(tenant_id, countryCode) {
        // Auto-setup tax rates, fiscal year, currency based on country
    }
}
```

### Frontend Integration Plan

**Step 1:** Replace localStorage calls with API calls
```typescript
// Before (localStorage):
localStorage.setItem('company_settings', JSON.stringify(company));

// After (API):
await fetch('/api/settings/company', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
});
```

**Step 2:** Add loading/error states
```typescript
const [company, setCompany] = useState<CompanyProfile | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
    fetch('/api/settings/company')
        .then(r => r.json())
        .then(data => setCompany(data))
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
}, []);
```

**Step 3:** Add optimistic updates with SWR/React Query

---

## Implementation Priority

### Phase 1: Critical (Week 1-2)

| Priority | Endpoint | Reason |
|----------|----------|--------|
| 🔴 **P0** | `/api/settings/company` | Core tenant identity, used everywhere |
| 🔴 **P0** | `/api/settings/modules` | Must control sidebar visibility |
| 🔴 **P0** | `/api/auth/users` (CRUD) | User management critical for multi-user |
| 🔴 **P0** | `/api/settings/roles` | Permission system foundation |

### Phase 2: High Priority (Week 3-4)

| Priority | Endpoint | Reason |
|----------|----------|--------|
| 🟠 **P1** | `/api/settings/branding` | Login page branding |
| 🟠 **P1** | `/api/settings/finance-config` | Impacts all financial transactions |
| 🟠 **P1** | `/api/settings/taxes` | Needed for invoice generation |

### Phase 3: Medium Priority (Week 5-6)

| Priority | Endpoint | Reason |
|----------|----------|--------|
| 🟡 **P2** | `/api/settings/approvals` | Workflow automation |
| 🟡 **P2** | File upload endpoints | Logo/favicon (can use base64 temporarily) |

---

## Database Migration Plan

### Migration Script: `backend/migrations/001_settings_initialization.js`

```javascript
// Auto-migrate localStorage data to MongoDB for existing tenants

const migrateLocalStorageToBackend = async () => {
    const tenants = await Tenant.find();
    
    for (const tenant of tenants) {
        // Create default company profile
        await CompanyProfile.create({
            tenant_id: tenant._id,
            companyName: tenant.name || 'Company Name',
            country: 'US',
            baseCurrency: 'USD',
            fiscalYearStart: 1,
            // ... defaults
        });
        
        // Create default roles
        const defaultRoles = ['Administrator', 'Finance Manager', 'Employee', 'Viewer'];
        for (const roleName of defaultRoles) {
            await Role.create({
                tenant_id: tenant._id,
                name: roleName,
                permissions: getDefaultPermissions(roleName),
                isDefault: true,
            });
        }
        
        // Enable default modules
        await ModulesConfig.create({
            tenant_id: tenant._id,
            modules: {
                finance: true,
                sales: true,
                inventory: true,
                procurement: true,
                reports: true,
            }
        });
    }
};
```

---

## API Response Formats

### Success Response
```json
{
    "success": true,
    "data": { ... },
    "message": "Company profile updated successfully"
}
```

### Error Response
```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Company name is required",
        "field": "companyName"
    }
}
```

### Bulk Settings Response (for initial load)
```json
{
    "success": true,
    "data": {
        "company": { ... },
        "branding": { ... },
        "financeConfig": { ... },
        "modules": { ... },
        "roles": [ ... ],
        "taxes": [ ... ]
    }
}
```

---

## Existing Backend Audit

### ✅ What Already Exists

| Route | Endpoint | Status | Notes |
|-------|----------|--------|-------|
| Auth | `POST /api/auth/signup` | ✅ Working | Creates user with bcrypt |
| Auth | `POST /api/auth/login` | ✅ Working | Returns JWT token |
| Auth | `GET /api/auth/me` | ✅ Working | Get current user |
| Auth | `GET /api/auth/users` | ✅ Working | List users |
| Settings | `GET /api/settings/:key` | ✅ Working | Generic key-value store |
| Settings | `PUT /api/settings/:key` | ✅ Working | Upsert setting |
| Settings | `GET /api/settings` | ✅ Working | Get all settings |
| Approvals | `/api/approval-engine/*` | ✅ Working | 20+ endpoints for workflows |
| Tax Center | `/api/tax-center/*` | ✅ Working | Filing/reporting (NOT config) |

### ❌ What's Missing

**User Management:**
- `POST /api/auth/users/invite` - Send invitation email
- `PUT /api/auth/users/:id` - Update user
- `DELETE /api/auth/users/:id` - Delete user
- `PUT /api/auth/users/:id/toggle-status` - Enable/disable
- `POST /api/auth/users/:id/reset-password` - Password reset
- `PUT /api/auth/users/:id/change-role` - Change role

**Roles & Permissions:**
- `GET /api/settings/roles` - List roles
- `POST /api/settings/roles` - Create role
- `PUT /api/settings/roles/:id` - Update role
- `DELETE /api/settings/roles/:id` - Delete role
- `GET /api/settings/roles/check-permission` - Permission check

**Settings Dedicated Endpoints:**
- `GET/PUT /api/settings/company` - Company profile
- `GET/PUT /api/settings/branding` - Branding config
- `POST /api/settings/branding/upload-logo` - Logo upload
- `GET/PUT /api/settings/finance-config` - Fiscal/currency
- `GET/POST/PUT/DELETE /api/settings/taxes` - Tax config
- `GET/PUT /api/settings/modules` - Modules enable/disable
- `GET/PUT /api/settings/approvals` - Approval config

---

## Development Checklist

### Backend Tasks

- [ ] **Create Models:**
  - [ ] CompanyProfile
  - [ ] BrandingConfig
  - [ ] FinanceConfig
  - [ ] TaxConfiguration
  - [ ] Role
  - [ ] ModulesConfig
  - [ ] ApprovalConfig

- [ ] **Create Routes:**
  - [ ] `/backend/routes/company-profile.js`
  - [ ] `/backend/routes/branding.js`
  - [ ] `/backend/routes/finance-config.js`
  - [ ] `/backend/routes/roles.js`
  - [ ] `/backend/routes/modules.js`
  - [ ] `/backend/routes/approval-config.js`
  - [ ] Enhance `/backend/routes/auth.js` with user CRUD

- [ ] **Create Service Layer:**
  - [ ] `/backend/services/SettingsService.js`
  - [ ] `/backend/services/UserService.js`
  - [ ] `/backend/services/PermissionService.js`

- [ ] **Middleware:**
  - [ ] Tenant isolation middleware
  - [ ] Permission check middleware
  - [ ] File upload middleware (multer)

- [ ] **Utilities:**
  - [ ] Email service for invitations
  - [ ] File upload to S3/cloud storage
  - [ ] Default settings initializer

- [ ] **Testing:**
  - [ ] Unit tests for services
  - [ ] API integration tests
  - [ ] Permission middleware tests

### Frontend Tasks

- [ ] **Create API Client:**
  - [ ] `/lib/api-client/settings.ts`
  - [ ] `/lib/api-client/users.ts`
  - [ ] `/lib/api-client/roles.ts`

- [ ] **Replace localStorage:**
  - [ ] Update company settings page
  - [ ] Update branding settings page
  - [ ] Update currency settings page
  - [ ] Update tax settings page
  - [ ] Update users settings page
  - [ ] Update roles settings page
  - [ ] Update modules settings page
  - [ ] Update approvals settings page

- [ ] **Add Loading/Error States:**
  - [ ] Loading skeletons
  - [ ] Error boundaries
  - [ ] Retry logic

- [ ] **Add Optimistic Updates:**
  - [ ] Install SWR or React Query
  - [ ] Implement optimistic mutations
  - [ ] Add success/error toasts

---

## Security Considerations

### Authentication & Authorization

1. **All settings endpoints require authentication** (JWT token)
2. **Most settings require admin role** (except read-only access for some)
3. **Tenant isolation enforced** in middleware
4. **Audit trail** for all settings changes (who changed what when)

### Input Validation

```javascript
// Example validation schema (Joi)
const companyProfileSchema = Joi.object({
    companyName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    taxId: Joi.string().max(50),
    country: Joi.string().length(2).required(),
    // ...
});
```

### File Upload Security

- Max file size: 2MB for logos, 512KB for favicons
- Allowed MIME types: `image/png`, `image/jpeg`, `image/svg+xml`, `image/x-icon`
- Virus scanning before storage
- CDN with access control

---

## Performance Optimization

### Caching Strategy

```javascript
// Redis cache for frequently accessed settings
const getCompanyProfile = async (tenant_id) => {
    const cached = await redis.get(`company:${tenant_id}`);
    if (cached) return JSON.parse(cached);
    
    const profile = await CompanyProfile.findOne({ tenant_id });
    await redis.setex(`company:${tenant_id}`, 3600, JSON.stringify(profile));
    return profile;
};
```

### Bulk Loading

```javascript
// Single endpoint for initial settings load
GET /api/settings/bulk
Returns: {
    company, branding, financeConfig, modules, roles, taxes
}
```

---

## Testing Strategy

### Backend Tests

```javascript
// Example: Company Profile Tests
describe('Company Profile API', () => {
    it('should create company profile for new tenant', async () => { ... });
    it('should update company profile', async () => { ... });
    it('should enforce tenant isolation', async () => { ... });
    it('should require admin role for updates', async () => { ... });
    it('should auto-configure tax/fiscal based on country', async () => { ... });
});
```

### Frontend Tests

```javascript
// Example: Settings Page Tests
describe('Company Settings Page', () => {
    it('should load company profile on mount', async () => { ... });
    it('should show loading state', () => { ... });
    it('should save changes and show success toast', async () => { ... });
    it('should handle API errors gracefully', async () => { ... });
});
```

---

## Documentation Requirements

- [ ] **API Documentation:** Swagger/OpenAPI spec for all settings endpoints
- [ ] **Developer Guide:** How to add new settings
- [ ] **User Guide:** How to configure system settings
- [ ] **Migration Guide:** Moving from localStorage to backend

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Models + Routes + Basic CRUD | 3-4 days |
| **Phase 2** | Service layer + Middleware | 2-3 days |
| **Phase 3** | Frontend integration | 4-5 days |
| **Phase 4** | File uploads + Email | 2-3 days |
| **Phase 5** | Testing + Documentation | 3-4 days |
| **Total** | | **14-19 days** |

---

## Success Criteria

### Backend Complete When:
✅ All 8 settings pages can CRUD via API  
✅ Multi-tenant isolation working  
✅ Permission checks enforced  
✅ Audit trail for all changes  
✅ File uploads functional  
✅ Email invitations working  
✅ Tests passing (>80% coverage)

### Frontend Complete When:
✅ Zero localStorage usage for settings  
✅ All pages load from backend  
✅ Optimistic updates working  
✅ Loading/error states polished  
✅ Cross-device sync working  
✅ No console errors

---

## Appendix: Example API Implementations

### Example 1: Company Profile Route

```javascript
// backend/routes/company-profile.js
const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const CompanyProfile = require('../models/CompanyProfile');

// GET company profile
router.get('/', auth, async (req, res) => {
    try {
        const profile = await CompanyProfile.findOne({ tenant_id: req.tenant_id });
        if (!profile) {
            return res.status(404).json({ success: false, error: 'Company profile not found' });
        }
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT company profile (create or update)
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const profile = await CompanyProfile.findOneAndUpdate(
            { tenant_id: req.tenant_id },
            { ...req.body, updated_by: req.user._id },
            { new: true, upsert: true, runValidators: true }
        );
        
        // Invalidate cache
        await redis.del(`company:${req.tenant_id}`);
        
        res.json({ success: true, data: profile, message: 'Company profile updated' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### Example 2: Frontend API Client

```typescript
// lib/api-client/settings.ts
export const settingsAPI = {
    // Company
    getCompanyProfile: async (): Promise<CompanyProfile> => {
        const res = await fetch('/api/settings/company', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },
    
    updateCompanyProfile: async (profile: CompanyProfile): Promise<void> => {
        const res = await fetch('/api/settings/company', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profile),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
    },
    
    // Branding
    getBranding: async (): Promise<BrandingConfig> => { ... },
    updateBranding: async (config: BrandingConfig): Promise<void> => { ... },
    uploadLogo: async (file: File): Promise<string> => { ... },
    
    // ... other settings endpoints
};
```

---

## Contact

**Document Author:** GitHub Copilot  
**Date Created:** 2026-01-07  
**Last Updated:** 2026-01-07  
**Version:** 1.0

For questions or clarifications, refer to:
- `/backend/routes/settings.js` - Existing generic settings
- `/backend/routes/auth.js` - Existing auth routes
- `/app/(admin)/admin/settings/` - All frontend settings pages
