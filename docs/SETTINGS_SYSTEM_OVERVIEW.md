# Settings System - Comprehensive Overview

## What We've Created

A complete **settings interconnection system** that allows you to centralize configuration across all ERP modules and use it everywhere.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Settings Database                         │
│            (MongoDB - Settings Collection)                    │
│   - company_name, company_email, company_phone, etc.        │
│   - branding_logo, branding_primary_color, etc.             │
│   - email_smtp_host, email_smtp_user, email_smtp_pass      │
│   - feature_two_factor, feature_approval_engine, etc.       │
│   - tax_enabled, tax_rate, tax_jurisdiction, etc.           │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼──────┐        ┌──▼──────────┐
    │  Backend  │        │  Frontend    │
    │  API      │        │  Hooks       │
    └────┬──────┘        └──┬───────────┘
         │                  │
    ┌────▼──────────────────▼─────┐
    │   settingsApi (shared)       │
    │  - get(key, default)         │
    │  - set(key, value)           │
    │  - company.*()               │
    │  - branding.*()              │
    │  - email.*()                 │
    │  - features.*()              │
    │  - tax.*()                   │
    └────┬────────────────────────┘
         │
    ┌────▴─────────────────────────────────────┐
    │        All ERP Modules Use Settings      │
    ├──────────────────────────────────────────┤
    │ • Invoice Module (Tax calculations)      │
    │ • Email Service (SMTP configuration)     │
    │ • Report Generator (Company branding)    │
    │ • Dashboard (Feature flags)              │
    │ • Authentication (2FA settings)          │
    │ • Inventory (Tracking settings)          │
    └──────────────────────────────────────────┘
```

## Core Components

### 1. **Settings Database Model**
- **File**: `backend/models/Settings.js`
- **Type**: Key-value store
- **Fields**: `key`, `value`, `updated_by`, `timestamps`
- **Example**: `{ key: 'company_name', value: 'BridgeBreak ERP' }`

### 2. **API Routes**
- **File**: `backend/routes/settings.js`
- **Endpoints**:
  - `GET /api/settings/:key` - Get a setting
  - `PUT /api/settings/:key` - Update a setting
  - `GET /api/settings` - Get all settings

### 3. **Frontend API Utility**
- **File**: `lib/settings-api.ts`
- **Purpose**: Centralized settings access with helper methods
- **Features**:
  - Type-safe settings access
  - Grouped helpers (company, branding, email, features, tax)
  - Bulk operations

### 4. **React Hook**
- **File**: `lib/hooks/use-settings.ts`
- **Purpose**: React component integration
- **Features**:
  - Real-time settings context
  - Automatic state management
  - Error handling

### 5. **Settings UI Pages**
- **Location**: `/admin/settings/*`
- **Pages**:
  - `/admin/settings/company` - Company info
  - `/admin/settings/branding` - Logo, colors, favicon
  - `/admin/settings/taxes` - Tax configuration
  - `/admin/settings/roles` - User roles
  - `/admin/settings/advanced` - Feature flags

## Available Settings Categories

### 📋 Company Settings
```typescript
company_name        // Company/organization name
company_email       // Contact email
company_phone       // Phone number
company_address     // Full address
company_website     // Website URL
```

### 🎨 Branding Settings
```typescript
branding_logo              // Logo image URL
branding_primary_color     // Primary color (hex)
branding_secondary_color   // Secondary color (hex)
branding_favicon          // Favicon URL
```

### 📧 Email Settings
```typescript
email_smtp_host      // SMTP server
email_smtp_port      // SMTP port
email_smtp_user      // Username
email_smtp_pass      // Password
email_from_name      // Sender name
email_from_address   // Sender email
```

### ✨ Feature Flags
```typescript
feature_two_factor           // Enable 2FA
feature_advanced_reports     // Advanced analytics
feature_approval_engine      // Approval workflows
feature_inventory_tracking   // Inventory management
```

### 💰 Tax Settings
```typescript
tax_enabled      // Enable/disable tax
tax_rate         // Tax percentage
tax_jurisdiction // Region (AE, SA, US, etc.)
```

## Usage Examples

### Example 1: Get Settings in Any Component

```typescript
'use client';
import { useSettings } from '@/lib/hooks/use-settings';

export function MyComponent() {
  const { getSetting } = useSettings();
  
  const companyName = getSetting('company_name', 'Default');
  return <h1>{companyName}</h1>;
}
```

### Example 2: Update Settings

```typescript
'use client';
import { useSettings } from '@/lib/hooks/use-settings';

export function SettingsForm() {
  const { updateSetting } = useSettings();
  
  const handleSave = async () => {
    await updateSetting('company_name', 'New Name');
  };
  
  return <button onClick={handleSave}>Save</button>;
}
```

### Example 3: Backend Usage

```javascript
const { settingsApi } = require('@/lib/settings-api');

// Get settings in Node.js
async function sendEmail() {
  const emailConfig = await settingsApi.email.getAll();
  // Use emailConfig.smtpHost, etc.
}
```

### Example 4: Use in Express Routes

```javascript
const Settings = require('../models/Settings');

router.get('/report', async (req, res) => {
  const companyName = await Settings.findOne({ key: 'company_name' });
  res.json({ company: companyName?.value });
});
```

## Real-World Integration Examples

### Invoice Module
```typescript
// Use tax settings in invoice calculation
const taxSettings = await settingsApi.tax.getAll();
const taxAmount = subtotal * (taxSettings.rate / 100);
const total = subtotal + taxAmount;
```

### Email Notifications
```typescript
// Use company & email settings
const company = await settingsApi.company.getAll();
const emailConfig = await settingsApi.email.getAll();

await sendEmail({
  from: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
  to: recipient,
  subject: 'Invoice from ' + company.name
});
```

### Dashboard Branding
```typescript
// Apply branding based on settings
const branding = await settingsApi.branding.getAll();

const styles = `
  :root {
    --primary-color: ${branding.primaryColor};
    --secondary-color: ${branding.secondaryColor};
  }
`;
```

### Feature-Based UI
```typescript
// Show features based on settings
const features = await settingsApi.features.getAll();

if (features.approvalEngine) {
  // Show approval workflow UI
}
```

## File Structure

```
├── backend/
│   ├── models/
│   │   └── Settings.js              # Database model
│   ├── routes/
│   │   └── settings.js              # API endpoints
│   └── services/
│       └── email-notification.js    # Email service using settings
│
├── lib/
│   ├── settings-api.ts              # Centralized API utility
│   └── hooks/
│       └── use-settings.ts          # React hook
│
├── app/(admin)/admin/settings/
│   ├── company/page.tsx             # Company settings UI
│   ├── branding/page.tsx            # Branding settings UI
│   ├── taxes/page.tsx               # Tax settings UI
│   ├── advanced/page.tsx            # Feature flags UI
│   └── ...
│
├── components/examples/
│   ├── invoice-with-settings.tsx    # Invoice example
│   └── feature-flag-dashboard.tsx   # Feature flag example
│
└── docs/
    └── SETTINGS_INTEGRATION_GUIDE.md # Detailed guide
```

## How to Add New Settings

### Step 1: Create in UI
Go to Settings page and configure your new setting. The system automatically saves it to the database.

### Step 2: Access in Code
```typescript
const value = await settingsApi.get('your_new_setting_key');
```

### Step 3 (Optional): Add Helper
```typescript
// Add to settingsApi in lib/settings-api.ts
yourFeature: {
  async getValue(): Promise<string> {
    return settingsApi.get('your_new_setting_key');
  }
}
```

### Step 4: Use Everywhere
```typescript
const value = await settingsApi.yourFeature.getValue();
```

## Security Considerations

✅ **Protected by**:
- Authentication required (Bearer token)
- Admin-only access for PUT requests
- Middleware validation
- Database indexing for performance

⚠️ **Sensitive Data**:
- SMTP passwords are stored in database
- Ensure proper access controls
- Use environment variables for critical settings
- Audit logging recommended

## Performance Tips

1. **Cache frequently accessed settings**
```typescript
let cache = null;
export async function getCompanySettings() {
  if (!cache) cache = await settingsApi.company.getAll();
  return cache;
}
```

2. **Load all settings once**
```typescript
const allSettings = await settingsApi.getAll();
// Use allSettings.key instead of individual calls
```

3. **Use React hook for auto-updates**
```typescript
const { getSetting } = useSettings(); // Automatically synced
```

## Testing Settings

### In Browser Console
```javascript
// Get a setting
const result = await fetch('/api/settings/company_name', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('bb_token')}` }
});
console.log(await result.json());

// Update a setting
await fetch('/api/settings/company_name', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('bb_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ value: 'New Name' })
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Settings return null | Provide default value: `getSetting('key', 'default')` |
| Settings not updating | Clear browser cache, verify admin role |
| Permission denied | Check authentication token, verify admin access |
| Performance slow | Implement caching, use `getAll()` once |
| SMTP not working | Verify email settings in `/admin/settings/advanced` |

## Next Steps

1. ✅ Settings pages created
2. ✅ API integrated
3. ✅ React hooks ready
4. ✅ Documentation written
5. 📝 **Now**: Integrate into your modules
   - Use settings in invoice module
   - Connect email notifications
   - Add feature flags to dashboard
   - Implement branding dynamically

## Quick Reference

```typescript
// Get settings
const value = await settingsApi.get('key');
const company = await settingsApi.company.getAll();

// Update settings
await settingsApi.set('key', value);

// In React
const { getSetting, updateSetting } = useSettings();
const val = getSetting('key', default);
await updateSetting('key', newValue);

// Feature flags
const enabled = await settingsApi.features.isApprovalEngineEnabled();

// Tax
const { rate } = await settingsApi.tax.getAll();

// Email
const { smtpHost } = await settingsApi.email.getAll();
```

---

**Documentation**: See `docs/SETTINGS_INTEGRATION_GUIDE.md` for detailed integration guide.
