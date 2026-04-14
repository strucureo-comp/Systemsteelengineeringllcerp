'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Upload, X, FileIcon, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploaderProps {
    bucket: string;
    path: string;
    onUploadComplete: (url: string, fileName?: string, fileMeta?: UploadMeta) => void;
    label?: string;
    disabled?: boolean;
    accepts?: string;
    maxSize?: number; // in MB
    allowPreview?: boolean;
    secureMode?: boolean;
}

interface UploadMeta {
    size: number;
    type: string;
    extension: string;
}

export function FileUploader({
    bucket,
    path,
    onUploadComplete,
    label = 'Upload File',
    disabled = false,
    accepts,
    maxSize,
    allowPreview = true,
    secureMode = false,
}: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const safeAccepts = useMemo(() => {
        if (accepts) return accepts;
        if (secureMode) return '.pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg';
        return '*';
    }, [accepts, secureMode]);

    const safeMaxSize = useMemo(() => {
        if (typeof maxSize === 'number') return maxSize;
        return secureMode ? 25 : 50;
    }, [maxSize, secureMode]);

    const getExtension = (fileName: string) => {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
    };

    const isAllowedType = (selectedFile: File) => {
        if (safeAccepts === '*') return true;
        const allowed = safeAccepts.split(',').map((t) => t.trim().toLowerCase());
        const ext = `.${getExtension(selectedFile.name)}`;
        const mime = selectedFile.type.toLowerCase();
        return allowed.includes(ext) || allowed.includes(mime);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const ext = getExtension(selectedFile.name);
            
            // Validate file size
            if (selectedFile.size > safeMaxSize * 1024 * 1024) {
                toast.error(`File size exceeds ${safeMaxSize}MB limit`);
                return;
            }

            // Validate file type
            if (!isAllowedType(selectedFile)) {
                toast.error('File type not allowed for secure upload');
                return;
            }
            
            setFile(selectedFile);
            setUploadProgress(0);

            if (allowPreview) {
                if (selectedFile.type.startsWith('image/')) {
                    const url = URL.createObjectURL(selectedFile);
                    setPreviewUrl(url);
                } else {
                    setPreviewUrl(null);
                }
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            // Simulate upload with progress
            for (let i = 0; i <= 100; i += 10) {
                setUploadProgress(i);
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            const securePrefix = secureMode ? 'secure' : 'public';
            const normalizedPath = path.replace(/^\/+|\/+$/g, '');
            const mockUrl = `https://storage.example.com/${securePrefix}/${bucket}/${normalizedPath}/${file.name}`;
            const meta: UploadMeta = {
                size: file.size,
                type: file.type || 'application/octet-stream',
                extension: getExtension(file.name),
            };
            
            onUploadComplete(mockUrl, file.name, meta);
            setFile(null);
            setUploadProgress(0);
            setPreviewUrl(null);
            toast.success(`✓ ${file.name} uploaded successfully!`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    return (
        <div className="space-y-4 w-full">
            {label && (
                <div>
                    <Label className="text-base font-semibold">{label}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                        Max size: {safeMaxSize}MB | Accepted: {safeAccepts === '*' ? 'All files' : safeAccepts}
                    </p>
                </div>
            )}
            {secureMode && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                    <ShieldCheck className="h-4 w-4" />
                    Private upload enabled. Access restricted to authorized company users.
                </div>
            )}
            
            <Card className="border-2 border-dashed overflow-hidden">
                {!file ? (
                    <div className="p-8 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-center">
                            <div className="text-center space-y-4 w-full">
                                <div className="flex justify-center">
                                    <div className="p-4 rounded-lg bg-primary/5">
                                        <Upload className="h-8 w-8 text-primary" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">
                                        Click to browse or drag and drop
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Upload documents, images, or data files for your project
                                    </p>
                                </div>
                                <Input
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={disabled || uploading}
                                    className="cursor-pointer h-10"
                                    accept={safeAccepts}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        {/* File Preview */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <FileIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setFile(null);
                                    setUploadProgress(0);
                                }}
                                disabled={uploading}
                                className="flex-shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {allowPreview && previewUrl && (
                            <div className="rounded-lg border bg-muted/10 p-4">
                                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    <ImageIcon className="h-4 w-4" />
                                    Preview
                                </div>
                                <img
                                    src={previewUrl}
                                    alt={file.name}
                                    className="max-h-64 w-full object-contain rounded-md border bg-background"
                                />
                            </div>
                        )}

                        {/* Progress Bar */}
                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Uploading...</span>
                                    <span className="text-sm font-semibold text-primary">{uploadProgress}%</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Upload Button */}
                        {!uploading && (
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={disabled}
                                    className="flex-1 h-10"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload File
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFile(null)}
                                    disabled={uploading}
                                    className="h-10"
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}

                        {uploading && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="ml-3 text-sm font-medium text-muted-foreground">
                                    Uploading to {bucket}/{path}...
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}