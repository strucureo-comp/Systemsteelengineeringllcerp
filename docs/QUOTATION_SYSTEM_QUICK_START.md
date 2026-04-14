# Quotation System Quick Setup & Testing Guide

## Prerequisites
- Backend server running on port 4000
- Frontend development server running on port 3000
- MongoDB connected and running
- User authenticated with admin privileges

## Setup Steps

### 1. Configure Branding Settings (Optional but Recommended)

Using the Settings API or MongoDB directly, create these settings:

```javascript
// branding_config
{
  key: "branding_config",
  value: {
    logo_url: "https://your-logo-url.com/logo.png",
    primary_color: "#1e40af",  // Blue
    accent_color: "#3b82f6"    // Light blue
  }
}

// company_profile
{
  key: "company_profile",
  value: {
    name: "SYSTEM STEEL ENGINEERING LLC",
    tagline: "Global Engineering Solutions",
    address: "Warehouse 4, Al Quoz Industrial Area, Dubai, UAE",
    trn: "100123456789003",
    phone: "+971 4 XXX XXXX",
    email: "info@systemsteel.ae"
  }
}
```

**Manual setup via MongoDB**:
```javascript
// Connect to MongoDB
db.settings.insertOne({
  key: "branding_config",
  value: {
    logo_url: "https://via.placeholder.com/200x60?text=Company+Logo",
    primary_color: "#1e40af",
    accent_color: "#3b82f6"
  },
  created_at: new Date(),
  updated_at: new Date()
});

db.settings.insertOne({
  key: "company_profile",
  value: {
    name: "SYSTEM STEEL ENGINEERING LLC",
    tagline: "Global Engineering Solutions",
    address: "Warehouse 4, Al Quoz Industrial Area, Dubai, UAE",
    trn: "100123456789003",
    phone: "+971 4 XXX XXXX",
    email: "info@systemsteel.ae"
  },
  created_at: new Date(),
  updated_at: new Date()
});
```

**Via API** (requires admin authentication):
```bash
# Set branding config
curl -X PUT http://localhost:4000/api/settings/branding_config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "logo_url": "https://via.placeholder.com/200x60?text=Company+Logo",
      "primary_color": "#1e40af",
      "accent_color": "#3b82f6"
    }
  }'

# Set company profile
curl -X PUT http://localhost:4000/api/settings/company_profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "name": "SYSTEM STEEL ENGINEERING LLC",
      "tagline": "Global Engineering Solutions",
      "address": "Warehouse 4, Al Quoz Industrial Area, Dubai, UAE",
      "trn": "100123456789003",
      "phone": "+971 4 XXX XXXX",
      "email": "info@systemsteel.ae"
    }
  }'
```

### 2. Ensure Customer Data Exists

The quotation system supports two customer modes:
- **Registry**: Select from existing customers in the database
- **Manual**: Enter customer details on-the-fly

To test registry mode, ensure you have at least one customer:

```javascript
// Sample customer in MongoDB
db.customeraccounts.insertOne({
  name: "ABC Trading LLC",
  contact_person: "John Smith",
  email: "john@abctrading.ae",
  phone: "+971 50 XXX XXXX",
  address: "Business Bay, Dubai, UAE",
  tax_id: "100987654321001",
  status: "active",
  created_at: new Date()
});
```

### 3. Navigate to Quotations Module

Frontend URL: `http://localhost:3000/admin/sales/quotations`

**Expected UI**:
- Summary cards showing metrics (Total, Pending, Approved, Total Value)
- "+ New Quotation" button at top
- List of existing quotations (empty if fresh install)

## Testing Scenarios

### Test 1: Create a Basic Quotation (Manual Customer)

1. Click "+ New Quotation"
2. Select "Manual" customer type
3. Fill in customer details:
   - Company Name: "XYZ Corporation"
   - Contact Person: "Jane Doe"
   - Email: "jane@xyzcorp.com"
   - Phone: "+971 4 123 4567"
   - Address: "123 Business St"
   - City: "Dubai"
   - Country: "UAE"
4. Set dates (or use defaults)
5. Add line item:
   - Description: "Steel Pipes ASTM A53"
   - Quantity: 100
   - Unit Price: 50
   - Total: 5000 (auto-calculated)
6. Select Tax Mode: "Auto"
7. Enter Tax Rate: 5
8. Observe totals:
   - Subtotal: 5000
   - Tax (5%): 250
   - Total: 5250
9. Add Notes: "Special bulk discount applied"
10. Click "Create Quotation"

**Expected Results**:
- Success message appears
- New quotation appears in list
- Quotation number format: QT-2026-0001
- Status badge: "Draft" (gray)
- Total amount: 5250

### Test 2: Create with Registry Customer

1. Click "+ New Quotation"
2. Select "Registry" customer type
3. Select customer from dropdown (e.g., "ABC Trading LLC")
4. Add multiple line items:
   - Item 1: "Welding Services" | Qty: 20 | Price: 150 | Total: 3000
   - Item 2: "Material Supply" | Qty: 1 | Price: 2500 | Total: 2500
5. Select Tax Mode: "Manual"
6. Enter Tax Amount: 300
7. Observe totals:
   - Subtotal: 5500
   - Tax (Manual): 300
   - Total: 5800
8. Add Terms & Conditions
9. Click "Create Quotation"

**Expected Results**:
- Quotation created with customer_id reference
- Customer details auto-populated from registry
- Tax amount uses manual entry (300)

### Test 3: Submit for Approval

1. Click "View" on a draft quotation
2. Review all details
3. Look for status badge: "Draft"
4. *(If approval workflow not implemented yet, skip to Test 5)*

**Manual MongoDB Update** (to test approval workflow):
```javascript
// Update quotation to pending approval
db.quotations.updateOne(
  { quotation_number: "QT-2026-0001" },
  {
    $set: {
      status: "pending_approval",
      approval_config: {
        levels: [
          {
            level: 1,
            role: "Manager",
            status: "pending",
            user_id: null,
            user_name: null
          },
          {
            level: 2,
            role: "Director",
            status: "pending",
            user_id: null,
            user_name: null
          }
        ]
      },
      current_approval_level: 1
    }
  }
);
```

### Test 4: Approve Quotation

1. Refresh quotations page
2. Note status changed to "Pending Approval"
3. Click "View" on pending quotation
4. Scroll to "Approval Workflow" section
5. See approval levels displayed
6. Enter comments (optional): "Approved by manager"
7. Click "Approve" button

**Expected Results**:
- Success message
- Approval level 1 marked as "Approved"
- User name and timestamp recorded
- current_approval_level advances to 2
- Status remains "Pending Approval" (waiting for level 2)

8. Click "Approve" again (if you're also Director)

**Expected Results**:
- All levels approved
- Status changes to "Approved"
- Green badge appears
- Quotation ready for sending

### Test 5: Reject Quotation

1. View a pending approval quotation
2. Click "Reject" button
3. Rejection dialog appears
4. Enter reason: "Pricing needs revision"
5. Add comments: "Please reduce by 10%"
6. Click "Confirm Rejection"

**Expected Results**:
- Status changes to "Rejected"
- Red badge appears
- Rejection reason stored
- Approval workflow stopped

### Test 6: Generate PDF

1. View any quotation (draft, approved, etc.)
2. From the list, click "PDF" button
3. PDF preview dialog opens

**Expected Results**:
- Header displays company name/logo
- Primary color applied to borders
- Customer details shown in "Bill To" section
- Line items table properly formatted
- Totals calculated correctly
- Terms & conditions displayed
- Signature section at bottom
- Footer with contact info

4. Click "Print" button
5. Browser print dialog opens

**Expected Results**:
- Only PDF content visible (no dialog controls)
- A4 page size selected
- Professional layout maintained

6. Select "Save as PDF" destination
7. Click "Save"

**Expected Results**:
- PDF file downloaded
- File name: (browser default, e.g., "Quotation.pdf")
- Open PDF → should match preview exactly

### Test 7: Multi-Item Quotation

1. Create quotation with 10+ line items
2. Test subtotal calculation with various quantities and prices
3. Generate PDF

**Expected Results**:
- PDF automatically expands to multiple pages if needed
- Header/footer repeat on each page (verify in print preview)
- No items cut off mid-row

### Test 8: Validation Testing

**Test invalid data**:
1. Try creating quotation without customer selection
   - Should show validation error
2. Try adding line item with empty description
   - Should prevent submission or show error
3. Try entering negative quantity/price
   - Should validate or auto-correct
4. Try approving without proper permissions
   - Should show authorization error

## Verifying Backend Endpoints

### Using curl or Postman

**1. List Quotations**
```bash
curl http://localhost:4000/api/crm/quotations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Get Single Quotation**
```bash
curl http://localhost:4000/api/crm/quotations/QUOTATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3. Create Quotation**
```bash
curl -X POST http://localhost:4000/api/crm/quotations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_type": "manual",
    "customer_company_name": "Test Corp",
    "customer_email": "test@test.com",
    "customer_phone": "+971 4 111 1111",
    "quotation_date": "2026-01-20",
    "valid_until": "2026-02-20",
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
    "notes": "Test quotation"
  }'
```

**4. Submit for Approval**
```bash
curl -X POST http://localhost:4000/api/crm/quotations/QUOTATION_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_config": {
      "levels": [
        { "level": 1, "role": "Manager" },
        { "level": 2, "role": "Director" }
      ]
    }
  }'
```

**5. Approve**
```bash
curl -X POST http://localhost:4000/api/crm/quotations/QUOTATION_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Looks good"
  }'
```

## Troubleshooting

### Issue: Cannot see quotations page

**Check**:
1. Is frontend running? (`npm run dev` in root folder)
2. Navigate to correct URL: `/admin/sales/quotations`
3. Check browser console for errors
4. Verify you're logged in as admin user

### Issue: API returns 401 Unauthorized

**Solution**:
1. Check authentication token is valid
2. Verify token is being sent in Authorization header
3. Check `authHeaders()` function in `lib/api.ts`
4. Try logging in again

### Issue: PDF preview shows default company info

**Cause**: Settings not configured in database

**Solution**:
1. Use setup steps above to create branding_config and company_profile
2. Verify settings exist: 
   ```bash
   curl http://localhost:4000/api/settings/company_profile
   ```
3. Refresh PDF preview

### Issue: Logo not showing in PDF

**Check**:
1. Is `logo_url` set in branding_config?
2. Is URL accessible? Test in browser
3. Check for CORS errors in browser console
4. Try using a different image hosting service

### Issue: Quotation number duplicates

**Solution**:
1. Ensure unique index on quotation_number:
   ```javascript
   db.quotations.createIndex({ quotation_number: 1 }, { unique: true })
   ```
2. Check server logs for errors during creation
3. Verify sequential number generation logic

### Issue: Approval workflow stuck

**Debug**:
1. Check MongoDB document:
   ```javascript
   db.quotations.findOne({ quotation_number: "QT-2026-0001" })
   ```
2. Verify `current_approval_level` matches expected
3. Check `approval_config.levels` structure
4. Review backend logs for approval endpoint hits

### Issue: Tax calculation wrong

**Verify**:
1. Tax mode set correctly ('auto' vs 'manual')
2. For auto: tax_rate is percentage (5 = 5%)
3. For manual: tax_amount is absolute value
4. Check pre-save hook is executing (backend logs)

## Next Steps After Testing

1. **Integrate with Email System**
   - Send quotation PDFs via email
   - Approval notifications
   - Status change alerts

2. **Add Quotation Templates**
   - Pre-defined line items
   - Industry-specific terms
   - Quick create from template

3. **Implement Invoice System**
   - Similar structure to quotations
   - Payment tracking
   - Invoice-to-payment workflow

4. **Enhance PDF Generation**
   - Custom header/footer per tenant
   - Multi-page support with repeated branding
   - Watermarks for draft/approved status

5. **Analytics Dashboard**
   - Conversion rates
   - Average approval time
   - Revenue forecasting

## Support & Documentation

- **Full Documentation**: `/docs/QUOTATION_SYSTEM_IMPLEMENTATION.md`
- **API Reference**: See "API Reference" section in main documentation
- **Database Schema**: See "Database Models" section in main documentation

## Sample Data for Quick Testing

Run this in MongoDB to create sample data:

```javascript
// Sample Customer
db.customeraccounts.insertOne({
  name: "ABC Trading LLC",
  contact_person: "John Smith",
  email: "john@abctrading.ae",
  phone: "+971 50 123 4567",
  address: "Office 123, Building A, Business Bay",
  city: "Dubai",
  country: "UAE",
  tax_id: "100987654321001",
  status: "active",
  created_at: new Date(),
  updated_at: new Date()
});

// Sample Branding Config
db.settings.insertOne({
  key: "branding_config",
  value: {
    logo_url: "https://via.placeholder.com/200x60/1e40af/ffffff?text=COMPANY+LOGO",
    primary_color: "#1e40af",
    accent_color: "#3b82f6"
  },
  created_at: new Date(),
  updated_at: new Date()
});

// Sample Company Profile
db.settings.insertOne({
  key: "company_profile",
  value: {
    name: "SYSTEM STEEL ENGINEERING LLC",
    tagline: "Global Engineering Solutions",
    address: "Warehouse 4, Al Quoz Industrial Area, Dubai, UAE",
    trn: "100123456789003",
    phone: "+971 4 XXX XXXX",
    email: "info@systemsteel.ae",
    website: "www.systemsteel.ae"
  },
  created_at: new Date(),
  updated_at: new Date()
});

// Sample Quotation
db.quotations.insertOne({
  quotation_number: "QT-2026-0001",
  customer_type: "manual",
  customer_company_name: "XYZ Corporation",
  customer_contact_person: "Jane Doe",
  customer_email: "jane@xyzcorp.com",
  customer_phone: "+971 4 555 5555",
  customer_address: "123 Business Street, Downtown",
  customer_city: "Dubai",
  customer_country: "UAE",
  quotation_date: new Date(),
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
  lines: [
    {
      description: "Steel Pipes ASTM A53 Grade B",
      quantity: 100,
      unit_price: 50,
      total: 5000
    },
    {
      description: "Welding Services",
      quantity: 20,
      unit_price: 150,
      total: 3000
    }
  ],
  subtotal: 8000,
  tax_mode: "auto",
  tax_rate: 5,
  tax_amount: 400,
  total_amount: 8400,
  status: "draft",
  notes: "Special project discount applied",
  terms_and_conditions: "Payment terms: 50% advance, 50% on delivery\nDelivery: 15 working days\nValidity: 30 days from quotation date",
  created_by: ObjectId("YOUR_USER_ID"),
  created_by_name: "Admin User",
  created_at: new Date(),
  updated_at: new Date()
});
```

Replace `YOUR_USER_ID` with an actual user ID from your users collection.
