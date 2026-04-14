# File Upload Integration Examples

## Example 1: HR Employee Documents Page

```tsx
// app/(admin)/admin/hr/employees/[id]/documents/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileUpload } from '@/components/shared/FileUpload';
import { getEmployeeDocuments, deleteEmployeeDocument } from '@/lib/api-uploads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmployeeDocumentsPage() {
    const params = useParams();
    const employeeId = params.id as string;
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshDocuments = async () => {
        setLoading(true);
        const docs = await getEmployeeDocuments(employeeId);
        setDocuments(docs);
        setLoading(false);
    };

    useEffect(() => {
        refreshDocuments();
    }, [employeeId]);

    const handleDelete = async (attachmentId: string) => {
        const success = await deleteEmployeeDocument(employeeId, attachmentId);
        if (success) {
            await refreshDocuments();
        }
    };

    const filterByType = (type: string) => 
        documents.filter(d => d.document_type === type);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Employee Documents</h1>
                <p className="text-sm text-muted-foreground">
                    Upload and manage employee documents
                </p>
            </div>

            <Tabs defaultValue="passport">
                <TabsList>
                    <TabsTrigger value="passport">Passport</TabsTrigger>
                    <TabsTrigger value="visa">Visa</TabsTrigger>
                    <TabsTrigger value="emirates_id">Emirates ID</TabsTrigger>
                    <TabsTrigger value="certificate">Certificates</TabsTrigger>
                    <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>

                <TabsContent value="passport">
                    <Card>
                        <CardHeader>
                            <CardTitle>Passport</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FileUpload
                                endpoint={`/hrms/employees/${employeeId}/documents`}
                                accept=".pdf,.jpg,.jpeg,.png"
                                documentType="passport"
                                expiryDate={true}
                                onSuccess={refreshDocuments}
                                existingFiles={filterByType('passport')}
                                onDelete={handleDelete}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="visa">
                    <Card>
                        <CardHeader>
                            <CardTitle>Visa</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FileUpload
                                endpoint={`/hrms/employees/${employeeId}/documents`}
                                accept=".pdf,.jpg,.jpeg,.png"
                                documentType="visa"
                                expiryDate={true}
                                onSuccess={refreshDocuments}
                                existingFiles={filterByType('visa')}
                                onDelete={handleDelete}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Add other tabs similarly */}
            </Tabs>
        </div>
    );
}
```

## Example 2: Invoice Attachments Section

```tsx
// components/finance/InvoiceAttachments.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/shared/FileUpload';
import { getInvoiceAttachments, deleteInvoiceAttachment } from '@/lib/api-uploads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InvoiceAttachmentsProps {
    invoiceId: string;
}

export function InvoiceAttachments({ invoiceId }: InvoiceAttachmentsProps) {
    const [attachments, setAttachments] = useState<any[]>([]);

    const refreshAttachments = async () => {
        const data = await getInvoiceAttachments(invoiceId);
        setAttachments(data);
    };

    useEffect(() => {
        refreshAttachments();
    }, [invoiceId]);

    const handleDelete = async (attachmentId: string) => {
        await deleteInvoiceAttachment(invoiceId, attachmentId);
        await refreshAttachments();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
                <FileUpload
                    endpoint={`/finance/invoices/${invoiceId}/attachments`}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple={true}
                    maxSizeMB={20}
                    onSuccess={refreshAttachments}
                    existingFiles={attachments}
                    onDelete={handleDelete}
                />
            </CardContent>
        </Card>
    );
}
```

## Example 3: Expense Receipt Upload

```tsx
// components/finance/ExpenseForm.tsx
'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/shared/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExpense } from '@/lib/api';

export function ExpenseForm() {
    const [expenseId, setExpenseId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        category: '',
        amount: 0,
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Create expense first
        const expense = await createExpense(formData);
        setExpenseId(expense.id);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label>Category</Label>
                    <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                </div>

                <div>
                    <Label>Amount</Label>
                    <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                </div>

                <div>
                    <Label>Description</Label>
                    <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
            </div>

            <Button type="submit">Create Expense</Button>

            {/* Show upload section after expense is created */}
            {expenseId && (
                <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">Upload Receipt</h3>
                    <FileUpload
                        endpoint={`/finance/expenses/${expenseId}/attachments`}
                        accept=".pdf,.jpg,.jpeg,.png"
                        maxSizeMB={10}
                        onSuccess={(files) => {
                            console.log('Receipt uploaded:', files);
                        }}
                    />
                </div>
            )}
        </form>
    );
}
```

## Example 4: Company Logo in Settings

```tsx
// app/(admin)/admin/settings/branding/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/shared/FileUpload';
import { getSettings, updateSettings } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrandingSettingsPage() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadBranding = async () => {
            const branding = await getSettings('branding');
            setLogoUrl(branding?.logo || null);
        };
        loadBranding();
    }, []);

    const handleLogoUpload = (files: any[]) => {
        setLogoUrl(files[0].file_url);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Branding Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Customize your company branding
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Company Logo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {logoUrl && (
                        <div className="mb-4">
                            <p className="text-sm font-medium mb-2">Current Logo:</p>
                            <img
                                src={logoUrl}
                                alt="Company Logo"
                                className="h-24 w-auto border rounded"
                            />
                        </div>
                    )}

                    <FileUpload
                        endpoint="/settings/branding/logo"
                        accept=".jpg,.jpeg,.png,.webp"
                        maxSizeMB={5}
                        onSuccess={handleLogoUpload}
                    />

                    <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 400x400px. Will be automatically resized.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
```

## Example 5: Employee Avatar Upload

```tsx
// components/hr/EmployeeAvatarUpload.tsx
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeAvatarUploadProps {
    employeeId: string;
    currentAvatar?: string;
    employeeName: string;
    onAvatarUpdate: (url: string) => void;
}

export function EmployeeAvatarUpload({
    employeeId,
    currentAvatar,
    employeeName,
    onAvatarUpdate
}: EmployeeAvatarUploadProps) {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (3MB)
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image must be less than 3MB');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const token = localStorage.getItem('bb_token');
            const response = await fetch(`/api/backend/hrms/employees/${employeeId}/avatar`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            onAvatarUpdate(data.avatar_url);
            toast.success('Avatar updated successfully');
        } catch (error) {
            console.error('Avatar upload error:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const initials = employeeName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
                <AvatarImage src={currentAvatar} alt={employeeName} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="avatar-upload"
                    disabled={uploading}
                />
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={uploading}
                >
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Camera className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Change Photo'}
                    </label>
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or WebP. Max 3MB.
                </p>
            </div>
        </div>
    );
}
```

## Example 6: Purchase Order Attachments

```tsx
// app/(admin)/admin/procurement/purchase-orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileUpload } from '@/components/shared/FileUpload';
import { getPOAttachments } from '@/lib/api-uploads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PurchaseOrderDetailPage() {
    const params = useParams();
    const poId = params.id as string;
    const [attachments, setAttachments] = useState<any[]>([]);

    const refreshAttachments = async () => {
        const data = await getPOAttachments(poId);
        setAttachments(data);
    };

    useEffect(() => {
        refreshAttachments();
    }, [poId]);

    return (
        <div className="space-y-6">
            {/* PO details here */}

            <Card>
                <CardHeader>
                    <CardTitle>Supporting Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    <FileUpload
                        endpoint={`/procurement/purchase-orders/${poId}/attachments`}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        multiple={true}
                        maxSizeMB={20}
                        onSuccess={refreshAttachments}
                        existingFiles={attachments}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
```

## Common Patterns

### Pattern 1: Upload After Entity Creation

```tsx
// 1. Create entity first
const entity = await createEntity(data);

// 2. Then show upload component
{entityId && (
    <FileUpload
        endpoint={`/module/${entityId}/attachments`}
        onSuccess={handleUploadSuccess}
    />
)}
```

### Pattern 2: Inline Upload in Form

```tsx
<form onSubmit={handleSubmit}>
    {/* Form fields */}
    
    <div className="border-t pt-4 mt-4">
        <Label>Attachments (Optional)</Label>
        <FileUpload
            endpoint={`/module/${entityId}/attachments`}
            multiple={true}
            onSuccess={(files) => {
                // Store file IDs to associate with entity
                setAttachmentIds(files.map(f => f.id));
            }}
        />
    </div>
</form>
```

### Pattern 3: Conditional Upload Based on Document Type

```tsx
const documentTypes = ['passport', 'visa', 'emirates_id', 'certificate'];

{documentTypes.map(type => (
    <Card key={type}>
        <CardHeader>
            <CardTitle>{type.replace('_', ' ').toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
            <FileUpload
                endpoint={`/hrms/employees/${employeeId}/documents`}
                documentType={type}
                expiryDate={['passport', 'visa'].includes(type)}
                onSuccess={refreshDocuments}
                existingFiles={documents.filter(d => d.document_type === type)}
            />
        </CardContent>
    </Card>
))}
```

## Error Handling

```tsx
const handleUploadSuccess = (files: any[]) => {
    try {
        // Process uploaded files
        console.log('Uploaded:', files);
        
        // Update parent state
        setAttachments(prev => [...prev, ...files]);
        
        // Show success message
        toast.success(`${files.length} file(s) uploaded successfully`);
        
        // Refresh data if needed
        refreshData();
    } catch (error) {
        console.error('Upload success handler error:', error);
        toast.error('Failed to process uploaded files');
    }
};

const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    toast.error(error.message || 'Upload failed');
};
```

## Best Practices

1. **Always create the parent entity first** before allowing file uploads
2. **Refresh the file list** after successful upload/delete
3. **Show loading states** during upload operations
4. **Validate file types and sizes** on both client and server
5. **Handle errors gracefully** with user-friendly messages
6. **Use appropriate file size limits** per module (HR: 10MB, Finance: 20MB)
7. **Enable expiry date tracking** for time-sensitive documents (passports, visas)
8. **Provide clear instructions** about accepted file types and sizes
