# Quotation System Implementation Guide

## Overview
A comprehensive quotation management system with approval workflows, PDF generation, and branding integration built for the ERP system.

## System Architecture

### Backend Components

#### 1. Database Models (`backend/models/CRM.js`)

**Quotation Schema** - Core quotation document structure:
```javascript
{
  quotation_number: String,        // Format: QT-YYYY-XXXX (e.g., QT-2026-0001)
  customer_type: 'registry' | 'manual',
  
  // Registry Customer (reference)
  customer_id: ObjectId,           // Reference to CustomerAccount
  
  // Manual Customer (embedded fields)
  customer_company_name: String,
  customer_contact_person: String,
  customer_email: String,
  customer_phone: String,
  customer_address: String,
  customer_city: String,
  customer_country: String,
  customer_tax_id: String,
  
  // Document dates
  quotation_date: Date,
  valid_until: Date,
  
  // Line items
  lines: [{
    description: String (required),
    quantity: Number (default: 1),
    unit_price: Number (default: 0),
    total: Number (auto-calculated: quantity * unit_price)
  }],
  
  // Financial calculations
  subtotal: Number,                // Auto-calculated: sum(lines.total)
  tax_mode: 'auto' | 'manual',
  tax_rate: Number (default: 5),  // Percentage for auto mode
  tax_amount: Number,              // Auto-calculated if tax_mode='auto'
  total_amount: Number,            // Auto-calculated: subtotal + tax_amount
  
  // Status workflow
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 
          'rejected' | 'sent' | 'accepted' | 'declined' | 'expired',
  
  // Approval workflow
  approval_config: {
    levels: [{
      level: Number,
      role: String,
      user_id: ObjectId,
      user_name: String,
      status: 'pending' | 'approved' | 'rejected',
      comments: String,
      actioned_at: Date
    }]
  },
  current_approval_level: Number,
  rejection_reason: String,
  
  // Additional fields
  notes: String,
  terms_and_conditions: String,
  created_by: ObjectId,
  created_by_name: String
}
```

**Pre-save Hooks**:
- Auto-calculates `subtotal` from line items
- Auto-calculates `tax_amount` if `tax_mode` is 'auto'
- Auto-calculates `total_amount` = subtotal + tax_amount

#### 2. API Endpoints (`backend/routes/crm.js`)

**Quotation CRUD Operations**:
- `GET /api/crm/quotations` - List all quotations with optional filters
  - Query params: `status`, `customer_id`
  - Populates customer and creator details
  
- `GET /api/crm/quotations/:id` - Get single quotation
  - Populates customer_id and created_by references
  
- `POST /api/crm/quotations` - Create new quotation
  - Auto-generates quotation_number (QT-{year}-{sequence})
  - Attaches created_by from authenticated user
  
- `PUT /api/crm/quotations/:id` - Update quotation
  - Only allowed for 'draft' status
  
- `DELETE /api/crm/quotations/:id` - Delete quotation
  - Only allowed for 'draft' status

**Approval Workflow Endpoints**:
- `POST /api/crm/quotations/:id/submit` - Submit for approval
  - Changes status from 'draft' to 'submitted' or 'pending_approval'
  - Initializes approval_config if provided
  - Sets current_approval_level = 1
  
- `POST /api/crm/quotations/:id/approve` - Approve current level
  - Updates approval_config.levels[currentLevel].status = 'approved'
  - Records user_id, user_name, comments, actioned_at
  - Advances to next level or marks fully approved
  
- `POST /api/crm/quotations/:id/reject` - Reject quotation
  - Updates level status to 'rejected'
  - Records rejection_reason and comments
  - Sets quotation status to 'rejected'

**Status Management**:
- `PATCH /api/crm/quotations/:id/status` - Update quotation status
  - Validates status transitions (approved→sent, sent→accepted/declined)

### Frontend Components

#### 1. Main Page (`app/(admin)/admin/sales/quotations/page.tsx`)

**Features**:
- Summary dashboard with 4 key metrics:
  - Total Quotations
  - Pending Approval
  - Approved Quotations
  - Total Value (sum of all quotation amounts)

- Quotations list with card-based layout
- Status badges with color coding:
  - Draft (gray, FileText icon)
  - Submitted (yellow, Clock icon)
  - Pending Approval (blue, Clock icon)
  - Approved (green, Check icon)
  - Rejected (red, X icon)
  - Sent (blue, Send icon)
  - Accepted (green, Check icon)
  - Declined (red, X icon)

- Action buttons:
  - View - Opens quotation viewer
  - PDF - Opens PDF preview/download dialog

**State Management**:
```typescript
quotations: Quotation[]          // List of all quotations
loading: boolean                 // Loading state
creatorOpen: boolean             // Create dialog open state
selectedQuotation: Quotation     // Currently selected quotation
viewerOpen: boolean              // Viewer dialog open state
pdfPreviewOpen: boolean          // PDF preview dialog open state
```

#### 2. Quotation Creator (`_components/quotation-creator.tsx`)

**Customer Selection**:
- Radio button toggle: Registry vs Manual entry
- **Registry mode**: Dropdown select from existing customers
- **Manual mode**: 8-field form
  - Company Name
  - Contact Person
  - Email
  - Phone
  - Address
  - City
  - Country
  - Tax ID

**Date Fields**:
- Quotation Date (default: today)
- Valid Until (default: +30 days)

**Line Items Management**:
- Dynamic array with add/remove functionality
- Grid layout: 5-2-2-2-1 columns (description/qty/price/total/delete)
- Real-time calculation: `total = quantity × unit_price`
- Subtotal auto-calculation: sum of all line totals

**Tax Calculation**:
- Radio toggle: Auto vs Manual mode
- **Auto mode**: Enter tax_rate (%), auto-calculates tax_amount
- **Manual mode**: Enter tax_amount directly
- Total = subtotal + tax_amount (real-time updates)

**Additional Fields**:
- Notes (customer-visible)
- Terms & Conditions (editable text)

**Validation**:
- Customer selection required
- All line items must have description
- Quantity and prices must be valid numbers

#### 3. Quotation Viewer (`_components/quotation-viewer.tsx`)

**Display Sections**:
1. **Customer Information Card**
   - Company name, contact person, email, phone
   - 4-column grid layout

2. **Line Items Table**
   - Columns: Description, Quantity, Unit Price, Total
   - 12-column grid (6-2-2-2)

3. **Totals Card**
   - Subtotal
   - Tax (with mode indicator: "5%" or "Manual")
   - Total Amount (highlighted)

4. **Approval Workflow Display**
   - Shows all approval levels
   - Status badges for each level (pending/approved/rejected)
   - User name, timestamp, comments for completed levels

**Approval Actions** (if status = 'pending_approval'):
- Comments textarea (optional)
- Approve button → `POST /quotations/:id/approve`
- Reject button → Opens rejection dialog

**Rejection Dialog**:
- Reason textarea (required)
- Confirm/Cancel buttons
- Submits to `POST /quotations/:id/reject`

#### 4. PDF Generator (`_components/quotation-pdf.tsx`)

**Features**:
- Professional A4-sized PDF layout
- Dynamic branding integration
- Print-optimized styling
- Download capability

**Data Loading**:
- Fetches quotation details via `/api/crm/quotations/:id`
- Loads branding settings from `/api/settings/branding_config`
  - Logo URL
  - Primary color
  - Accent color
- Loads company profile from `/api/settings/company_profile`
  - Company name, tagline, address, TRN, phone, email

**PDF Layout Structure**:

1. **Header Section** (with primary color border):
   - Company logo (if available)
   - Company name and tagline
   - Company address and TRN
   - Document title "QUOTATION"
   - Quotation number and dates

2. **Bill To Section**:
   - Customer company name
   - Contact person
   - Address (with city/country)
   - Phone and email
   - Tax ID (if available)

3. **Items Table**:
   - Header row with primary color background
   - Columns: Description, Quantity, Unit Price, Total
   - Dynamic rows with alternating background

4. **Totals Section**:
   - Subtotal
   - Tax (with mode indicator)
   - Total Amount (highlighted with primary color)

5. **Notes & Terms**:
   - Customer-facing notes
   - Terms & Conditions (pre-formatted text)

6. **Signature Section**:
   - Authorized Signature (company)
   - Client Acceptance (customer)
   - Agreement text

7. **Footer**:
   - Contact information
   - Legal disclaimer

**Print Functionality**:
- Print button triggers browser print dialog
- Download button uses print-to-PDF
- Custom print styles in `globals.css`:
  - Hides dialog controls
  - Shows only PDF content
  - A4 page size optimization
  - Page break controls

### Settings Integration

#### Required Settings Keys

1. **branding_config** (Object):
```json
{
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#1e40af",
  "accent_color": "#3b82f6"
}
```

2. **company_profile** (Object):
```json
{
  "name": "SYSTEM STEEL ENGINEERING LLC",
  "tagline": "Global Engineering Solutions",
  "address": "Warehouse 4, Al Quoz Industrial Area",
  "trn": "100123456789003",
  "phone": "+971 4 XXX XXXX",
  "email": "info@example.com"
}
```

**API Access**:
- `GET /api/settings/branding_config` - Public endpoint
- `GET /api/settings/company_profile` - Public endpoint
- `PUT /api/settings/:key` - Requires auth + admin role

## User Workflows

### 1. Create Quotation
1. Navigate to Sales → Quotations
2. Click "+ New Quotation" button
3. **Select customer**:
   - Choose "Registry" and select from dropdown, OR
   - Choose "Manual" and fill in customer details
4. **Enter dates**:
   - Quotation Date (defaults to today)
   - Valid Until (defaults to +30 days)
5. **Add line items**:
   - Click "+ Add Item"
   - Enter description, quantity, unit price
   - Total auto-calculates
   - Add more items as needed
6. **Configure tax**:
   - Choose "Auto" mode and enter tax rate (%), OR
   - Choose "Manual" mode and enter exact tax amount
7. **Add notes and terms** (optional)
8. Click "Create Quotation"
9. Quotation saved with status = 'draft'

### 2. Submit for Approval
1. Open quotation (click "View")
2. Review all details
3. Click "Submit for Approval"
4. Optionally configure approval levels:
   - Level 1: Manager
   - Level 2: Director
   - Level 3: CEO
5. Status changes to 'pending_approval'
6. Email notifications sent to approvers (if configured)

### 3. Approve/Reject Quotation
1. Approver receives notification
2. Opens quotation viewer
3. Reviews customer info, line items, totals
4. **To Approve**:
   - Add comments (optional)
   - Click "Approve"
   - Advances to next approval level
5. **To Reject**:
   - Click "Reject"
   - Enter rejection reason (required)
   - Add comments (optional)
   - Click "Confirm Rejection"
   - Status changes to 'rejected'

### 4. Generate PDF
1. From quotations list, click "PDF" button
2. PDF preview dialog opens
3. Review PDF layout
4. **Options**:
   - Click "Print" → Opens browser print dialog
   - Click "Download PDF" → Triggers print dialog, save as PDF
5. PDF includes:
   - Company branding (logo + colors)
   - Customer details
   - Line items table
   - Calculated totals
   - Terms & conditions
   - Signature section

### 5. Send to Customer
1. After approval, status = 'approved'
2. Click "PDF" to generate document
3. Download PDF
4. Send via email/other channel
5. Update status:
   - Click status dropdown → "Sent"
6. Await customer response:
   - If accepted → Update status to "Accepted"
   - If declined → Update status to "Declined"

## Technical Implementation Details

### Quotation Number Generation
```javascript
// Backend logic in POST /api/crm/quotations
const year = new Date().getFullYear();
const count = await Quotation.countDocuments({
  quotation_number: new RegExp(`^QT-${year}-`)
});
const quotation_number = `QT-${year}-${String(count + 1).padStart(4, '0')}`;
// Result: QT-2026-0001, QT-2026-0002, etc.
```

### Auto-Calculation Logic
```javascript
// Pre-save hook in Quotation schema
quotationSchema.pre('save', function(next) {
  // Calculate subtotal from line items
  this.subtotal = this.lines.reduce((sum, line) => sum + (line.total || 0), 0);
  
  // Calculate tax if auto mode
  if (this.tax_mode === 'auto' && this.tax_rate) {
    this.tax_amount = (this.subtotal * this.tax_rate) / 100;
  }
  
  // Calculate total
  this.total_amount = this.subtotal + (this.tax_amount || 0);
  
  next();
});
```

### Approval Workflow State Machine
```
draft
  ↓ [submit]
submitted (if no approval_config)
  or
pending_approval (if approval_config provided)
  ↓ [approve level 1]
pending_approval (current_approval_level = 2)
  ↓ [approve level N]
approved (all levels completed)
  ↓ [manual status change]
sent
  ↓ [customer response]
accepted or declined

[reject at any level]
  ↓
rejected
```

### Print-to-PDF Implementation
```css
/* globals.css */
@media print {
  /* Hide everything except PDF content */
  [data-pdf-content], [data-pdf-content] * {
    visibility: visible;
  }
  
  /* A4 page size */
  @page {
    size: A4;
    margin: 1cm;
  }
  
  /* Prevent breaking inside tables */
  table, tr, img {
    page-break-inside: avoid;
  }
}
```

## API Reference

### List Quotations
```http
GET /api/crm/quotations
Authorization: Bearer <token>

Query Parameters:
  - status: string (optional) - Filter by status
  - customer_id: string (optional) - Filter by customer

Response: 200 OK
[
  {
    "_id": "...",
    "quotation_number": "QT-2026-0001",
    "customer_company_name": "XYZ Corp",
    "total_amount": 15000,
    "status": "approved",
    "quotation_date": "2026-01-15",
    "created_by_name": "John Doe"
  }
]
```

### Create Quotation
```http
POST /api/crm/quotations
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_type": "manual",
  "customer_company_name": "XYZ Corp",
  "customer_email": "contact@xyz.com",
  "quotation_date": "2026-01-15",
  "valid_until": "2026-02-15",
  "lines": [
    {
      "description": "Product A",
      "quantity": 10,
      "unit_price": 100,
      "total": 1000
    }
  ],
  "tax_mode": "auto",
  "tax_rate": 5,
  "notes": "Special discount applied"
}

Response: 201 Created
{
  "_id": "...",
  "quotation_number": "QT-2026-0001",
  "status": "draft",
  ...
}
```

### Submit for Approval
```http
POST /api/crm/quotations/:id/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "approval_config": {
    "levels": [
      { "level": 1, "role": "Manager" },
      { "level": 2, "role": "Director" }
    ]
  }
}

Response: 200 OK
{
  "message": "Quotation submitted for approval",
  "data": { ... }
}
```

### Approve Quotation
```http
POST /api/crm/quotations/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "comments": "Approved. Looks good."
}

Response: 200 OK
{
  "message": "Quotation approved",
  "data": { ... }
}
```

### Reject Quotation
```http
POST /api/crm/quotations/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Pricing too high",
  "comments": "Please revise pricing"
}

Response: 200 OK
{
  "message": "Quotation rejected",
  "data": { ... }
}
```

## Next Steps

### Recommended Enhancements
1. **Email Integration**
   - Auto-send PDF to customer email
   - Approval notification emails
   - Status change notifications

2. **Version Control**
   - Track quotation revisions
   - Compare versions
   - Restore previous versions

3. **Templates**
   - Pre-defined line item templates
   - Terms & conditions templates
   - Industry-specific layouts

4. **Analytics Dashboard**
   - Quotation conversion rates
   - Average approval time
   - Revenue forecasting

5. **E-signature Integration**
   - Customer digital signature
   - Timestamp verification
   - Audit trail

6. **Multi-currency Support**
   - Currency selection
   - Exchange rate integration
   - Multi-currency reporting

## Troubleshooting

### PDF not displaying logo
- Check `/api/settings/branding_config` returns valid `logo_url`
- Verify logo URL is accessible (CORS policy)
- Check browser console for image loading errors

### Approval workflow not advancing
- Verify `current_approval_level` increments correctly
- Check `approval_config.levels` structure matches expected format
- Ensure user has proper permissions

### Quotation number duplicates
- Check database index on `quotation_number` field
- Verify year extraction in number generation logic
- Consider using MongoDB transactions for concurrent creates

### Tax calculation incorrect
- Verify `tax_mode` is set correctly ('auto' or 'manual')
- Check `tax_rate` value (should be percentage, e.g., 5 for 5%)
- Ensure pre-save hook is executing (check logs)

## File Locations

**Backend**:
- `/backend/models/CRM.js` - Quotation schema definition
- `/backend/routes/crm.js` - Quotation API endpoints
- `/backend/routes/settings.js` - Settings API (branding/company)

**Frontend**:
- `/app/(admin)/admin/sales/quotations/page.tsx` - Main page
- `/app/(admin)/admin/sales/quotations/_components/quotation-creator.tsx` - Creation form
- `/app/(admin)/admin/sales/quotations/_components/quotation-viewer.tsx` - Viewer with approval
- `/app/(admin)/admin/sales/quotations/_components/quotation-pdf.tsx` - PDF generator

**Styles**:
- `/app/globals.css` - Print styles for PDF generation

**Documentation**:
- `/docs/QUOTATION_SYSTEM_IMPLEMENTATION.md` - This file
