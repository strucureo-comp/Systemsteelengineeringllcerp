# Settings Integration Guide

This guide explains how to use the centralized settings system to interconnect variables across modules in the BridgeBreak ERP.

## Overview

The settings system provides a global configuration store that can be:
- Managed through the Settings page (`/admin/settings/*`)
- Accessed from any module using `settingsApi`
- Synchronized across the application using the `useSettings` hook

## Architecture

### Settings Storage
- **Database Model**: `Settings` (key-value store)
- **API Routes**: `/api/settings/*` (GET, PUT)
- **Frontend API**: `lib/settings-api.ts`
- **React Hook**: `lib/hooks/use-settings.ts`

## Usage Patterns

### Pattern 1: Using `settingsApi` (Recommended for Non-React Code)

```typescript
// Get a single setting
import { settingsApi } from '@/lib/settings-api';

// Get company name
const companyName = await settingsApi.getCompany();

// Get branding settings
const branding = await settingsApi.getBranding();

// Get tax configuration
const taxes = await settingsApi.getTaxes();

// Update a setting
await settingsApi.saveCompany({ name: 'New Name' });
```

### Pattern 2: Using `useSettings` Hook (Recommended for React Components)

```typescript
'use client';

import { useSettings } from '@/lib/hooks/use-settings';

export function MyComponent() {
  const { settings, updateSetting, getSetting } = useSettings();

  // Get a setting with default value
  const companyName = getSetting('company_name', 'Default Company');

  // Update a setting
  const handleUpdate = async () => {
    try {
      await updateSetting('company_name', 'New Name');
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  return <div>{companyName}</div>;
}
```

## Available Settings

### Company Settings
- `company_name` - Company/organization name
- `company_email` - Company contact email
- `company_phone` - Company phone number
- `company_address` - Company address
- `company_website` - Company website URL

### Branding Settings
- `branding_logo` - Logo image URL
- `branding_primary_color` - Primary brand color (hex)
- `branding_secondary_color` - Secondary brand color (hex)
- `branding_favicon` - Favicon URL

### Email Settings
- `email_smtp_host` - SMTP server hostname
- `email_smtp_port` - SMTP port (usually 587 or 465)
- `email_smtp_user` - SMTP username
- `email_smtp_pass` - SMTP password
- `email_from_name` - Email sender name
- `email_from_address` - Email sender address

### Feature Flags
- `feature_two_factor` - Enable 2FA
- `feature_advanced_reports` - Enable advanced reports
- `feature_approval_engine` - Enable approval workflows
- `feature_inventory_tracking` - Enable inventory tracking

### Tax Settings
- `tax_enabled` - Enable tax calculations
- `tax_rate` - Tax rate percentage
- `tax_jurisdiction` - Tax jurisdiction code (AE, SA, US, etc.)

## Module Integration Examples

### Example 1: Invoice Module Using Tax Settings

```typescript
// In your invoice calculation component
import { settingsApi } from '@/lib/settings-api';

export async function calculateInvoiceTotal(subtotal: number) {
  const taxSettings = await settingsApi.getTaxes();
  const { enabled, rate } = taxSettings;

  if (!enabled) return subtotal;

  const taxAmount = subtotal * (rate / 100);
  return subtotal + taxAmount;
}
```

### Example 2: Email Notification Using Email Settings

```typescript
// In your notification service
import { settingsApi } from '@/lib/settings-api';

export async function sendEmailNotification(to: string, subject: string, body: string) {
  const emailConfig = await settingsApi.email.getAll();

  // Use emailConfig.smtpHost, emailConfig.fromAddress, etc.
  // Pass to your email service
  
  return sendEmail({
    from: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
    to,
    subject,
    body
  });
}
```

### Example 3: Company Profile in Reports

```typescript
// In your report generation module
import { settingsApi } from '@/lib/settings-api';

export async function generateReport(type: string) {
  const company = await settingsApi.company.getAll();
  
  // Use company info in report header
  const reportHeader = `
    ${company.name}
    ${company.address}
    ${company.phone} | ${company.email}
  `;

  return generatePDF({ header: reportHeader, data: {...} });
}
```

### Example 4: Dynamic Branding

```typescript
// In your layout or root component
'use client';

import { useSettings } from '@/lib/hooks/use-settings';

export function RootLayout({ children }: { children: React.ReactNode }) {
  const { getSetting } = useSettings();

  const primaryColor = getSetting('branding_primary_color', '#2563eb');
  const logo = getSetting('branding_logo', '/default-logo.png');

  return (
    <html>
      <head>
        <style>
          {`
            :root {
              --primary-color: ${primaryColor};
            }
          `}
        </style>
      </head>
      <body>
        <header>
          <img src={logo} alt="Logo" />
        </header>
        {children}
      </body>
    </html>
  );
}
```

### Example 5: Feature Flag Based Rendering

```typescript
// In any component
'use client';

import { useSettings } from '@/lib/hooks/use-settings';

export function DashboardWidget() {
  const { getSetting } = useSettings();

  const showAdvancedReports = getSetting('feature_advanced_reports', false);
  const showApprovals = getSetting('feature_approval_engine', false);

  return (
    <div>
      {showAdvancedReports && <AdvancedReportsWidget />}
      {showApprovals && <ApprovalsWidget />}
    </div>
  );
}
```

## Backend Integration

### Using Settings in Node.js/Express

```javascript
// In your backend route
const Settings = require('../models/Settings');

router.get('/report', async (req, res) => {
  try {
    // Get company settings
    const companyName = await Settings.findOne({ key: 'company_name' });
    const taxSettings = await Settings.findOne({ key: 'tax_rate' });

    // Use in your logic
    const report = {
      company: companyName?.value,
      taxRate: taxSettings?.value
    };

    res.json({ data: report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Best Practices

1. **Use Helper Methods**: Instead of raw key strings, use the helper methods in `settingsApi`
   ```typescript
   // Good
   const rate = await settingsApi.tax.getRate();
   
   // Avoid
   const rate = await settingsApi.get('tax_rate');
   ```

2. **Provide Default Values**: Always provide sensible defaults
   ```typescript
   const companyName = getSetting('company_name', 'My Company');
   ```

3. **Cache in Production**: For frequently accessed settings, consider caching
   ```typescript
   let cachedSettings: any = null;
   
   export async function getSettings() {
     if (!cachedSettings) {
       cachedSettings = await settingsApi.getAll();
     }
     return cachedSettings;
   }
   ```

4. **Wrap with Error Handling**: Always handle potential errors
   ```typescript
   try {
     await updateSetting('key', value);
     toast.success('Updated');
   } catch (error) {
     toast.error('Failed to update');
   }
   ```

5. **Use Settings in Critical Paths**: Settings are ideal for configuration that affects business logic
   - Tax calculations
   - Email sending
   - Feature toggles
   - Branding/theming
   - Report generation

## Settings Management UI

Access the settings interface at:
- **Company**: `/admin/settings/company`
- **Branding**: `/admin/settings/branding`
- **Email**: Built into company settings
- **Feature Flags**: `/admin/settings/advanced`
- **Tax**: `/admin/settings/taxes`

## API Endpoints

### Get Setting
```bash
GET /api/settings/:key
Authorization: Bearer <token>
```

Response:
```json
{
  "data": "value"
}
```

### Update Setting
```bash
PUT /api/settings/:key
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "new_value"
}
```

Response:
```json
{
  "data": "new_value",
  "message": "Settings saved"
}
```

### Get All Settings
```bash
GET /api/settings
Authorization: Bearer <token>
```

Response:
```json
{
  "data": {
    "company_name": "BridgeBreak ERP",
    "company_email": "info@bridgebreak.ae",
    ...
  }
}
```

## Troubleshooting

### Settings not updating across app
- Ensure you're using the `SettingsProvider` wrapper in your layout
- Check browser console for API errors
- Verify authentication token is valid

### Settings returning null
- Check if setting key exists in database
- Provide default values in `getSetting()`
- Verify user has admin permission to view/edit

### Performance issues
- Implement caching for read-heavy settings
- Use `settingsApi.getAll()` once instead of multiple `get()` calls
- Consider moving frequently-used settings to environment variables

## Adding New Settings

1. Create a new setting in the Settings page UI
2. The setting is automatically saved to database with key-value pair
3. Access it using:
   ```typescript
   const value = await settingsApi.get('your_new_setting_key', defaultValue);
   ```
4. For typed settings, add a helper method to `settingsApi`

## Security Notes

- Settings API requires authentication (Bearer token)
- Admin-only settings are protected by `adminOnly` middleware
- Sensitive settings (passwords) are stored but should be handled carefully
- Settings can be updated only by admin users
