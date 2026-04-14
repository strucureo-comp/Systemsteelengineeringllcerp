# File Upload System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  FileUpload Component (React)                                    │  │
│  │  • Drag & drop interface                                         │  │
│  │  • Client-side validation (type, size)                           │  │
│  │  • Progress tracking (XMLHttpRequest)                            │  │
│  │  • File preview & management                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓ FormData                                 │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware                                       │  │
│  │  • Verify JWT token                                              │  │
│  │  • Extract user & tenant_id                                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Multer Middleware (storageService.js)                           │  │
│  │  • Validate file type (server-side)                              │  │
│  │  • Check file size limit                                         │  │
│  │  • Generate UUID filename                                        │  │
│  │  • Determine storage path: {tenant_id}/{module}/{id}/            │  │
│  │  • Save file to disk                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Image Processing (Sharp) - Optional                             │  │
│  │  • Resize avatars: 200x200px                                     │  │
│  │  • Resize logos: 400x400px                                       │  │
│  │  • Optimize image quality                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Database (MongoDB)                                              │  │
│  │  • Create Attachment record                                      │  │
│  │  • Store metadata (filename, size, type, path)                   │  │
│  │  • Link to parent entity (employee, invoice, etc.)               │  │
│  │  • Track uploader & timestamp                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Response                                                        │  │
│  │  • Return file URL: /uploads/{tenant_id}/...                     │  │
│  │  • Return attachment metadata                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      FILE SYSTEM (Disk)                                 │
│                                                                         │
│  /uploads/                                                              │
│    ├── tenant_123/                                                      │
│    │   ├── hr/employees/emp_001/documents/uuid-1.pdf                    │
│    │   ├── hr/employees/emp_001/avatar/uuid-2.jpg                       │
│    │   ├── finance/invoices/inv_001/uuid-3.pdf                          │
│    │   └── settings/branding/uuid-4.png                                 │
│    └── tenant_456/                                                      │
│        └── ...                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Download Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
│  Request: GET /uploads/tenant_123/hr/employees/emp_001/documents/uuid.pdf │
│  Headers: Authorization: Bearer {JWT_TOKEN}                             │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Secure File Serving Route (/uploads/:tenantId/*)               │  │
│  │                                                                  │  │
│  │  1. Verify JWT token                                            │  │
│  │  2. Extract user's tenant_id from token                         │  │
│  │  3. Compare with requested tenant_id in URL                     │  │
│  │     ❌ If mismatch → 403 Forbidden                              │  │
│  │     ✅ If match → Continue                                       │  │
│  │                                                                  │  │
│  │  4. Resolve file path                                           │  │
│  │  5. Check for path traversal attacks                            │  │
│  │     ❌ If malicious path → 403 Forbidden                        │  │
│  │     ✅ If safe → Continue                                        │  │
│  │                                                                  │  │
│  │  6. Check if file exists                                        │  │
│  │     ❌ If not found → 404 Not Found                             │  │
│  │     ✅ If exists → Serve file                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
│  Receives file with appropriate Content-Type header                    │
│  Browser displays/downloads based on file type                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Attachment Collection (MongoDB)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  {                                                                      │
│    _id: ObjectId("..."),                                                │
│    tenant_id: "tenant_123",                                             │
│    reference_type: "employee",  // or "invoice", "expense", etc.        │
│    reference_id: ObjectId("..."),  // ID of parent entity               │
│    document_type: "passport",   // Specific document type               │
│    original_name: "passport.pdf",  // User's filename                   │
│    stored_name: "uuid-123.pdf",    // UUID filename on disk             │
│    file_path: "tenant_123/hr/employees/emp_001/documents/uuid-123.pdf", │
│    file_size: 1048576,  // bytes                                        │
│    mime_type: "application/pdf",                                        │
│    uploaded_by: ObjectId("..."),  // User who uploaded                  │
│    uploaded_at: ISODate("2024-01-15T10:30:00Z"),                        │
│    expiry_date: ISODate("2025-12-31T00:00:00Z"),  // Optional           │
│    is_deleted: false,                                                   │
│    deleted_at: null,                                                    │
│    deleted_by: null                                                     │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Module Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              HR MODULE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Employee Documents:                                                    │
│  • Passport (with expiry tracking)                                      │
│  • Visa (with expiry tracking)                                          │
│  • Emirates ID                                                          │
│  • Certificates                                                         │
│  • Contracts                                                            │
│                                                                         │
│  Employee Avatar:                                                       │
│  • Profile photo (auto-resized to 200x200)                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           FINANCE MODULE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Invoice Attachments:                                                   │
│  • Supporting documents                                                 │
│  • Payment receipts                                                     │
│  • Multiple files per invoice                                           │
│                                                                         │
│  Expense Attachments:                                                   │
│  • Receipts                                                             │
│  • Bills                                                                │
│  • Supporting documents                                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        PROCUREMENT MODULE                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Purchase Order Attachments:                                            │
│  • Vendor quotations                                                    │
│  • Specifications                                                       │
│  • Terms & conditions                                                   │
│                                                                         │
│  GRN Attachments:                                                       │
│  • Delivery notes                                                       │
│  • Packing lists                                                        │
│  • Quality certificates                                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          SETTINGS MODULE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Branding:                                                              │
│  • Company logo (auto-resized to 400x400)                               │
│  • Favicon                                                              │
│  • Email templates                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Layer 1: Authentication                                                │
│  ├─ JWT token required for all upload/download operations              │
│  ├─ Token validated on every request                                   │
│  └─ Expired tokens rejected                                            │
│                                                                         │
│  Layer 2: Tenant Isolation                                              │
│  ├─ User's tenant_id extracted from JWT                                │
│  ├─ Files stored in tenant-specific directories                        │
│  ├─ Download requests verify tenant ownership                          │
│  └─ Cross-tenant access blocked                                        │
│                                                                         │
│  Layer 3: Path Traversal Prevention                                     │
│  ├─ File paths resolved to absolute paths                              │
│  ├─ Verified to be within UPLOAD_ROOT                                  │
│  ├─ Malicious paths (../, ..\, etc.) blocked                           │
│  └─ Symbolic links not followed                                        │
│                                                                         │
│  Layer 4: File Type Validation                                          │
│  ├─ Client-side validation (immediate feedback)                        │
│  ├─ Server-side validation (security enforcement)                      │
│  ├─ MIME type checking                                                 │
│  └─ File extension verification                                        │
│                                                                         │
│  Layer 5: File Size Limits                                              │
│  ├─ Configurable per module                                            │
│  ├─ Enforced by Multer middleware                                      │
│  ├─ Prevents disk space exhaustion                                     │
│  └─ Prevents DoS attacks                                               │
│                                                                         │
│  Layer 6: Audit Trail                                                   │
│  ├─ All uploads logged with user & timestamp                           │
│  ├─ Soft delete preserves history                                      │
│  ├─ Deletion tracked with user & timestamp                             │
│  └─ Full audit trail in database                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Maintenance Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STORAGE MAINTENANCE JOB                              │
│                    (Runs weekly via cron)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: Orphan Cleanup                                                 │
│  ├─ Find attachments: is_deleted=true AND deleted_at < 30 days ago     │
│  ├─ Delete files from disk                                             │
│  ├─ Remove attachment records from database                            │
│  └─ Log: "Deleted X orphaned files"                                    │
│                                                                         │
│  Step 2: Disk Usage Report                                              │
│  ├─ Walk uploads directory                                             │
│  ├─ Calculate size per tenant                                          │
│  ├─ Log: "Tenant X: 2.3 GB used"                                       │
│  └─ Alert if any tenant > 10 GB                                        │
│                                                                         │
│  Step 3: Missing File Check                                             │
│  ├─ Query all active attachments (is_deleted=false)                    │
│  ├─ Check if file exists on disk                                       │
│  ├─ Log any missing files                                              │
│  └─ Alert for investigation                                            │
│                                                                         │
│  Step 4: Expiry Alerts                                                  │
│  ├─ Find documents expiring within 30 days                             │
│  ├─ Log: "Passport expires on 2024-12-31"                              │
│  ├─ Send notifications (if configured)                                 │
│  └─ Update reminder_sent flag                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERFORMANCE METRICS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Upload Speed:                                                          │
│  • Small files (< 1MB): < 1 second                                      │
│  • Medium files (1-10MB): 1-5 seconds                                   │
│  • Large files (10-20MB): 5-15 seconds                                  │
│  • Depends on: Network speed, disk I/O, server load                    │
│                                                                         │
│  Download Speed:                                                        │
│  • Served directly from disk (fast)                                    │
│  • No database query needed (file path in URL)                         │
│  • Typical: < 1 second for most files                                  │
│                                                                         │
│  Image Resizing:                                                        │
│  • Sharp library (very fast)                                           │
│  • Avatar (200x200): < 500ms                                            │
│  • Logo (400x400): < 1 second                                           │
│                                                                         │
│  Concurrent Uploads:                                                    │
│  • Multer handles concurrency efficiently                              │
│  • No special configuration needed                                     │
│  • Tested: 10+ simultaneous uploads work fine                          │
│                                                                         │
│  Storage Efficiency:                                                    │
│  • No duplication (UUID filenames)                                     │
│  • Image optimization reduces size                                     │
│  • Soft delete allows recovery                                         │
│  • Maintenance job cleans up old files                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SCALABILITY                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Current Setup (Single Server):                                         │
│  • Suitable for: Small to medium deployments                           │
│  • Capacity: Thousands of files, hundreds of GB                        │
│  • Limitation: Single point of failure                                 │
│                                                                         │
│  Future Enhancements:                                                   │
│  • Network File System (NFS) for shared storage                        │
│  • Cloud storage migration (S3, Azure Blob)                            │
│  • CDN integration for public files                                    │
│  • Load balancer with sticky sessions                                  │
│  • Distributed file system (GlusterFS, Ceph)                           │
│                                                                         │
│  Migration Path to Cloud:                                               │
│  1. Keep current API endpoints                                         │
│  2. Replace storageService.js with cloud SDK                           │
│  3. Migrate existing files to cloud                                    │
│  4. Update file_path in database                                       │
│  5. No frontend changes needed                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TECHNOLOGY STACK                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Backend:                                                               │
│  • Node.js + Express.js                                                 │
│  • Multer (file upload middleware)                                     │
│  • Sharp (image processing)                                            │
│  • UUID (unique filename generation)                                   │
│  • MongoDB + Mongoose (metadata storage)                               │
│                                                                         │
│  Frontend:                                                              │
│  • React 18 + Next.js 13                                                │
│  • TypeScript                                                          │
│  • Tailwind CSS + Shadcn UI                                            │
│  • XMLHttpRequest (upload progress)                                    │
│                                                                         │
│  Storage:                                                               │
│  • Local disk (file system)                                            │
│  • No cloud dependencies                                               │
│  • Easy to migrate to cloud later                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```
