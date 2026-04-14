# Quick Start Guide - File Upload System

## 🚀 Getting Started in 5 Minutes

### Step 1: Verify Installation

```bash
# Check if dependencies are installed
cd backend
npm list multer sharp uuid

# If not installed, run:
npm install multer sharp uuid
```

### Step 2: Start the Backend Server

```bash
# From backend directory
npm run dev

# Or from root directory
cd backend && npm run dev
```

You should see:
```
[Server] Created uploads directory: /path/to/uploads
[Server] MongoDB connected, starting Express...
[Server] BridgeBreak API running on http://localhost:4000
```

### Step 3: Test the Upload System

```bash
# Run the test script
node backend/test-upload.js
```

Expected output:
```
✅ Uploads directory exists
✅ Write permissions OK
✅ Created test tenant directory structure
✅ Multer installed
✅ Sharp installed
✅ UUID installed
✅ Attachment model loaded
```

### Step 4: Test File Upload via API

Using curl or Postman:

```bash
# 1. Login to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Save the token from response

# 2. Upload employee document
curl -X POST http://localhost:4000/api/hrms/employees/EMPLOYEE_ID/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "document_type=passport" \
  -F "expiry_date=2025-12-31"

# 3. Get uploaded documents
curl http://localhost:4000/api/hrms/employees/EMPLOYEE_ID/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Download file
curl http://localhost:4000/uploads/default/hr/employees/EMPLOYEE_ID/documents/uuid.pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output downloaded.pdf
```

### Step 5: Integrate into Frontend

Add the FileUpload component to any page:

```tsx
import { FileUpload } from '@/components/shared/FileUpload';

<FileUpload
  endpoint="/hrms/employees/123/documents"
  accept=".pdf,.jpg,.png"
  documentType="passport"
  expiryDate={true}
  onSuccess={(files) => {
    console.log('Uploaded:', files);
  }}
/>
```

## 📋 Common Use Cases

### Use Case 1: HR Employee Documents

**Location:** `app/(admin)/admin/hr/employees/[id]/page.tsx`

```tsx
import { FileUpload } from '@/components/shared/FileUpload';

// In your employee detail page
<FileUpload
  endpoint={`/hrms/employees/${employeeId}/documents`}
  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
  documentType="passport"
  expiryDate={true}
  onSuccess={refreshDocuments}
/>
```

### Use Case 2: Invoice Attachments

**Location:** `app/(admin)/admin/finance/invoices/[id]/page.tsx`

```tsx
<FileUpload
  endpoint={`/finance/invoices/${invoiceId}/attachments`}
  accept=".pdf,.jpg,.jpeg,.png"
  multiple={true}
  maxSizeMB={20}
  onSuccess={refreshAttachments}
/>
```

### Use Case 3: Company Logo

**Location:** `app/(admin)/admin/settings/branding/page.tsx`

```tsx
<FileUpload
  endpoint="/settings/branding/logo"
  accept=".jpg,.jpeg,.png,.webp"
  maxSizeMB={5}
  onSuccess={(files) => setLogo(files[0].file_url)}
/>
```

## 🔧 Configuration

### Adjust File Size Limits

Edit `backend/services/storageService.js`:

```javascript
const hrDocumentUploader = createUploader({
    getFolderPath: (req) => `${req.user.tenant_id}/hr/employees/${req.params.employeeId}/documents`,
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 10 // Change this value
});
```

### Add New File Types

Edit `backend/services/storageService.js`:

```javascript
const ALLOWED_TYPES = {
    documents: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        // Add more MIME types here
        'application/zip',
        'text/csv'
    ],
    images: ['image/jpeg', 'image/png', 'image/webp']
};
```

### Change Upload Directory

Edit `.env`:

```env
UPLOAD_ROOT=./uploads
# Or use absolute path:
# UPLOAD_ROOT=/var/www/erp/uploads
```

## 🧹 Maintenance

### Run Storage Maintenance

```bash
# Manual run
node backend/jobs/storageMaintenance.js

# Add to package.json scripts
npm run storage:maintenance
```

### Set Up Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 2 AM)
0 2 * * 0 cd /path/to/erp && node backend/jobs/storageMaintenance.js >> /var/log/storage-maintenance.log 2>&1
```

### Set Up Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Weekly, Sunday, 2:00 AM
4. Action: Start a program
5. Program: `node`
6. Arguments: `backend/jobs/storageMaintenance.js`
7. Start in: `/path/to/erp`

## 🐛 Troubleshooting

### Problem: "Cannot find module 'multer'"

**Solution:**
```bash
cd backend
npm install multer sharp uuid
```

### Problem: "EACCES: permission denied, mkdir '/uploads'"

**Solution:**
```bash
# Make sure the uploads directory is writable
chmod 755 uploads/
# Or create it manually
mkdir -p uploads
```

### Problem: "File type not allowed"

**Solution:**
Check the `accept` prop matches the server-side `allowedTypes`:
```tsx
// Frontend
accept=".pdf,.jpg,.png"

// Backend (storageService.js)
allowedTypes: ALLOWED_TYPES.documents
```

### Problem: "File too large"

**Solution:**
1. Check client-side `maxSizeMB` prop
2. Check server-side uploader configuration
3. Check Nginx/Apache upload limits if using reverse proxy

### Problem: "403 Access denied" when downloading

**Solution:**
- Verify JWT token is valid
- Check tenant_id matches between user and file path
- Ensure file exists on disk

### Problem: Files not appearing after upload

**Solution:**
1. Check browser console for errors
2. Verify API endpoint is correct
3. Check server logs for upload errors
4. Verify `onSuccess` callback is refreshing the file list

## 📊 Monitoring

### Check Disk Usage

```bash
# Total uploads directory size
du -sh uploads/

# Size per tenant
du -sh uploads/*/

# Detailed breakdown
du -h uploads/ | sort -h
```

### Check Database Records

```javascript
// In MongoDB shell or Compass
db.attachments.countDocuments({ is_deleted: false })
db.attachments.countDocuments({ is_deleted: true })

// Files by tenant
db.attachments.aggregate([
  { $match: { is_deleted: false } },
  { $group: { _id: "$tenant_id", count: { $sum: 1 }, totalSize: { $sum: "$file_size" } } }
])
```

### Monitor Upload Activity

```bash
# Watch server logs
tail -f backend/logs/server.log | grep -i upload

# Or if using PM2
pm2 logs backend | grep -i upload
```

## 🎯 Next Steps

1. ✅ System is installed and tested
2. 📝 Integrate FileUpload component into your pages
3. 🔒 Set up backup routine for `/uploads` directory
4. ⏰ Configure cron job for maintenance
5. 📊 Monitor disk usage regularly
6. 🧪 Test with real files and users

## 📚 Additional Resources

- **Full Documentation:** `docs/FILE_UPLOAD_SYSTEM.md`
- **Integration Examples:** `docs/UPLOAD_INTEGRATION_EXAMPLES.md`
- **API Reference:** See route files in `backend/routes/*-uploads.js`
- **Component Props:** See `components/shared/FileUpload.tsx`

## 🆘 Need Help?

Common issues and solutions:
1. Check server logs: `tail -f backend/logs/server.log`
2. Verify uploads directory exists and is writable
3. Ensure all dependencies are installed
4. Check authentication token is valid
5. Verify tenant_id matches

For more help, see the troubleshooting section in `docs/FILE_UPLOAD_SYSTEM.md`.
