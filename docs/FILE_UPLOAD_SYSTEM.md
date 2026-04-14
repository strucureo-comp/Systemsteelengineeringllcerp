# File Upload System Documentation

## Overview

This ERP system uses **local disk storage** with Multer for file uploads. No third-party services (AWS S3, Azure Blob, etc.) are required.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  FileUpload Component → API Call → Backend Express Server  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express + Multer)                 │
│  1. Validate file type & size                               │
│  2. Generate UUID filename                                  │
│  3. Save to disk: /uploads/{tenant_id}/{module}/{id}/       │
│  4. Create Attachment record in MongoDB                     │
│  5. Return file URL: /uploads/{tenant_id}/...               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    File System Storage                      │
│  /uploads/                                                  │
│    ├── tenant_123/                                          │
│    │   ├── hr/employees/{emp_id}/documents/                 │
│    │   ├── hr/employees/{emp_id}/avatar/                    │
│    │   ├── finance/invoices/{inv_id}/                       │
│    │   ├── finance/expenses/{exp_id}/                       │
│    │   ├── procurement/purchase-orders/{po_id}/             │
│    │   └── settings/branding/                               │
│    └── tenant_456/                                          │
│        └── ...                                              │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
/uploads/
  /{tenant_id}/
    /hr/
      /employees/
        /{employee_id}/
          /documents/     ← passport, visa, certificates
          /avatar/        ← profile photo
    /finance/
      /invoices/
        /{invoice_id}/    ← invoice attachments, receipts
      /expenses/
        /{expense_id}/    ← expense receipts
    /procurement/
      /purchase-orders/
        /{po_id}/         ← PO documents, quotation files
      /grn/
        /{grn_id}/        ← delivery documents
    /settings/
      /branding/          ← company logo, favicon
```

## Security Features

### 1. Tenant Isolation
- Each tenant's files are stored in separate directories
- File serving route checks tenant ownership before serving
- Path traversal attacks prevented via `path.resolve()` validation

### 2. File Type Validation
- Client-side validation (immediate feedback)
- Server-side validation (security enforcement)
- Allowed types configurable per module

### 3. File Size Limits
- Configurable per module (default: 10MB)
- Enforced by Multer middleware

### 4. Authentication Required
- All upload/download routes require JWT authentication
- User must belong to the tenant to access files

## Usage Examples

### HR Employee Documents

```tsx
import { FileUpload } from '@/components/shared/FileUpload';
import { getEmployeeDocuments, deleteEmployeeDocument } from '@/lib/api-uploads';

function EmployeeDocumentsTab({ employeeId }: { employeeId: string }) {
  const [documents, setDocuments] = useState([]);

  const refreshDocuments = async () => {
    const docs = await getEmployeeDocuments(employeeId);
    setDocuments(docs);
  };

  const handleDelete = async (attachmentId: string) => {
    await deleteEmployeeDocument(employeeId, attachmentId);
    await refreshDocuments();
  };

  return (
    <FileUpload
      endpoint={`/hrms/employees/${employeeId}/documents`}
      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      documentType="passport"
      expiryDate={true}
      onSuccess={refreshDocuments}
      existingFiles={documents}
      onDelete={handleDelete}
    />
  );
}
```

### Invoice Attachments

```tsx
<FileUpload
  endpoint={`/finance/invoices/${invoiceId}/attachments`}
  accept=".pdf,.jpg,.jpeg,.png"
  multiple={true}
  maxSizeMB={20}
  onSuccess={(files) => {
    toast.success(`${files.length} files uploaded`);
    refreshAttachments();
  }}
  existingFiles={invoiceAttachments}
/>
```

### Company Logo

```tsx
<FileUpload
  endpoint="/settings/branding/logo"
  accept=".jpg,.jpeg,.png,.webp"
  maxSizeMB={5}
  onSuccess={(files) => {
    setCompanyLogo(files[0].file_url);
  }}
/>
```

## API Endpoints

### HR Uploads
- `POST /api/hrms/employees/:employeeId/documents` - Upload employee document
- `GET /api/hrms/employees/:employeeId/documents` - List employee documents
- `DELETE /api/hrms/employees/:employeeId/documents/:attachmentId` - Delete document
- `POST /api/hrms/employees/:employeeId/avatar` - Upload employee avatar

### Finance Uploads
- `POST /api/finance/invoices/:invoiceId/attachments` - Upload invoice attachments (multiple)
- `GET /api/finance/invoices/:invoiceId/attachments` - List invoice attachments
- `DELETE /api/finance/invoices/:invoiceId/attachments/:attachmentId` - Delete attachment
- `POST /api/finance/expenses/:expenseId/attachments` - Upload expense receipt
- `GET /api/finance/expenses/:expenseId/attachments` - List expense attachments

### Procurement Uploads
- `POST /api/procurement/purchase-orders/:poId/attachments` - Upload PO attachments
- `GET /api/procurement/purchase-orders/:poId/attachments` - List PO attachments
- `POST /api/procurement/grn/:grnId/attachments` - Upload GRN documents
- `GET /api/procurement/grn/:grnId/attachments` - List GRN attachments

### Settings Uploads
- `POST /api/settings/branding/logo` - Upload company logo
- `DELETE /api/settings/branding/logo` - Delete company logo

### File Serving
- `GET /uploads/:tenantId/*` - Serve file (authenticated, tenant-restricted)

## Maintenance

### Storage Maintenance Job

Run weekly via cron to:
1. Clean up orphaned files (soft-deleted > 30 days)
2. Generate disk usage report per tenant
3. Check for missing files
4. Alert on expiring documents (passports, visas)

```bash
# Run manually
node backend/jobs/storageMaintenance.js

# Add to crontab (weekly on Sunday at 2 AM)
0 2 * * 0 cd /path/to/erp && node backend/jobs/storageMaintenance.js >> /var/log/storage-maintenance.log 2>&1
```

### Disk Space Monitoring

The maintenance job alerts when any tenant exceeds 10GB (configurable).

```javascript
// In storageMaintenance.js
const ALERT_THRESHOLD_GB = 10; // Adjust as needed
```

### Backup Strategy

Add `/uploads` directory to your backup routine:

```bash
# Example: Daily backup to external storage
rsync -avz /path/to/erp/uploads/ /backup/location/uploads/
```

## Configuration

### Environment Variables

```env
# .env
UPLOAD_ROOT=./uploads
MAX_UPLOAD_SIZE_MB=20
```

### Allowed File Types

Edit `backend/services/storageService.js`:

```javascript
const ALLOWED_TYPES = {
    documents: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Add more types as needed
    ],
    images: ['image/jpeg', 'image/png', 'image/webp']
};
```

### Size Limits Per Module

```javascript
// In storageService.js
const hrDocumentUploader = createUploader({
    getFolderPath: (req) => `${req.user.tenant_id}/hr/employees/${req.params.employeeId}/documents`,
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 10 // Adjust per module
});
```

## Troubleshooting

### Files Not Uploading

1. Check uploads directory exists and is writable:
   ```bash
   ls -la uploads/
   chmod 755 uploads/
   ```

2. Check Multer is installed:
   ```bash
   cd backend && npm list multer sharp uuid
   ```

3. Check server logs for errors:
   ```bash
   tail -f backend/logs/server.log
   ```

### Files Not Serving

1. Verify authentication token is valid
2. Check tenant_id matches between user and file path
3. Verify file exists on disk:
   ```bash
   ls -la uploads/{tenant_id}/...
   ```

### Disk Space Issues

1. Run maintenance job to clean up orphaned files
2. Check disk usage report
3. Consider archiving old files to external storage

## Performance Considerations

### Image Optimization

Avatars and logos are automatically resized using Sharp:
- Avatars: 200x200px
- Logos: 400x400px

### Large File Uploads

For files > 20MB, consider:
1. Increasing `MAX_UPLOAD_SIZE_MB` in .env
2. Adjusting Nginx/Apache upload limits
3. Implementing chunked uploads for very large files

### Concurrent Uploads

Multer handles concurrent uploads efficiently. No special configuration needed for typical ERP workloads.

## Migration from Cloud Storage

If migrating from AWS S3 or similar:

1. Download all files from cloud storage
2. Organize into the folder structure above
3. Update Attachment records with new file_path
4. Update application URLs from cloud URLs to `/uploads/...`

## Future Enhancements

Potential improvements (not currently implemented):

- [ ] Virus scanning integration (ClamAV)
- [ ] Image thumbnail generation
- [ ] Video transcoding
- [ ] Automatic archival to cold storage
- [ ] CDN integration for public files
- [ ] Chunked upload for large files
- [ ] Client-side image compression before upload
