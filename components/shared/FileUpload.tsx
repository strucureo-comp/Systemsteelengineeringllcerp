'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Attachment {
    id: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    file_url: string;
    uploaded_at: string;
    document_type?: string;
    expiry_date?: string;
}

interface FileUploadProps {
    endpoint: string;
    accept?: string;
    multiple?: boolean;
    maxSizeMB?: number;
    documentType?: string;
    expiryDate?: boolean;
    onSuccess: (files: Attachment[]) => void;
    existingFiles?: Attachment[];
    onDelete?: (attachmentId: string) => Promise<void>;
}

export function FileUpload({
    endpoint,
    accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
    multiple = false,
    maxSizeMB = 10,
    documentType,
    expiryDate = false,
    onSuccess,
    existingFiles = [],
    onDelete
}: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiryDateValue, setExpiryDateValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
        if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
        return <File className="h-5 w-5" />;
    };

    const validateFile = (file: File): string | null => {
        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            return `File size exceeds ${maxSizeMB}MB limit`;
        }

        // Check file type
        const acceptedTypes = accept.split(',').map(t => t.trim());
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;

        const isAccepted = acceptedTypes.some(type => {
            if (type.startsWith('.')) {
                return fileExt === type;
            }
            return mimeType.match(new RegExp(type.replace('*', '.*')));
        });

        if (!isAccepted) {
            return `File type not allowed. Accepted: ${accept}`;
        }

        return null;
    };

    const uploadFiles = useCallback(async (files: FileList | File[]) => {
        setError(null);
        const filesArray = Array.from(files);

        // Validate all files first
        for (const file of filesArray) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                toast.error(validationError);
                return;
            }
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            
            if (multiple) {
                filesArray.forEach(file => formData.append('files', file));
            } else {
                formData.append('file', filesArray[0]);
            }

            if (documentType) {
                formData.append('document_type', documentType);
            }

            if (expiryDate && expiryDateValue) {
                formData.append('expiry_date', expiryDateValue);
            }

            // Use XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();
            const token = localStorage.getItem('bb_token');

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(progress);
                }
            });

            const uploadPromise = new Promise<Attachment[]>((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.responseText);
                        const files = response.attachments || [response.attachment];
                        resolve(files);
                    } else {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error || 'Upload failed'));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.open('POST', `/api/backend${endpoint}`);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
                xhr.send(formData);
            });

            const uploadedFiles = await uploadPromise;
            toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
            onSuccess(uploadedFiles);
            
            // Reset form
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setExpiryDateValue('');
        } catch (err: any) {
            console.error('[Upload Error]', err);
            const errorMsg = err.message || 'Failed to upload file';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    }, [endpoint, multiple, documentType, expiryDate, expiryDateValue, maxSizeMB, accept, onSuccess]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFiles(e.dataTransfer.files);
        }
    }, [uploadFiles]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files);
        }
    }, [uploadFiles]);

    const handleDelete = async (attachmentId: string) => {
        if (!onDelete) return;
        
        try {
            await onDelete(attachmentId);
            toast.success('File deleted successfully');
        } catch (err: any) {
            console.error('[Delete Error]', err);
            toast.error(err.message || 'Failed to delete file');
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Zone */}
            <Card
                className={cn(
                    'border-2 border-dashed transition-colors',
                    dragActive && 'border-primary bg-primary/5',
                    error && 'border-destructive',
                    uploading && 'opacity-50 pointer-events-none'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="p-8 text-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleFileInput}
                        className="hidden"
                        disabled={uploading}
                    />

                    {uploading ? (
                        <div className="space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Uploading... {uploadProgress}%</p>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm font-medium mb-2">
                                Drag and drop {multiple ? 'files' : 'a file'} here, or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Accepted: {accept} • Max size: {maxSizeMB}MB
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Browse Files
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            {/* Expiry Date Field (for HR documents) */}
            {expiryDate && !uploading && (
                <div className="space-y-2">
                    <Label htmlFor="expiry-date">Document Expiry Date (Optional)</Label>
                    <Input
                        id="expiry-date"
                        type="date"
                        value={expiryDateValue}
                        onChange={(e) => setExpiryDateValue(e.target.value)}
                        className="max-w-xs"
                    />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* Existing Files List */}
            {existingFiles.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Uploaded Files ({existingFiles.length})
                    </Label>
                    <div className="space-y-2">
                        {existingFiles.map((file) => (
                            <Card key={file.id} className="p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {getFileIcon(file.mime_type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {file.original_name}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{formatFileSize(file.file_size)}</span>
                                                {file.expiry_date && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Expires: {new Date(file.expiry_date).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                        >
                                            <a
                                                href={file.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs"
                                            >
                                                View
                                            </a>
                                        </Button>
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(file.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
