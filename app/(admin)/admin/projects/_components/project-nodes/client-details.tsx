import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/shared/common/file-uploader';
import { Mail, Phone, MapPin, FileText, Image as ImageIcon, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFileItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'document' | 'image' | 'other';
  file_size: string;
  created_at: string;
}

export function ClientDetails({ project }: { project: any }) {
  const client = project.client || { full_name: 'Unknown Client', email: 'no-email@example.com' };
  const [files, setFiles] = useState<ProjectFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

  const loadFiles = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/upload-files?project_id=${project.id}&module_type=client`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load files`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load files');
      setFiles(json.files || json.data || []);
    } catch (err: any) {
      console.error('Failed to load project files:', err);
      toast.error(err.message || 'Failed to load project files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase tracking-tight">Client Information</h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {client.full_name[0]}
            </div>
            <div>
              <h3 className="font-bold text-lg">{client.full_name}</h3>
              <p className="text-sm text-muted-foreground">Client ID: {client.id || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>+971 50 000 0000 (Mock)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Dubai, UAE</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-6 mb-2">Secure Client Documents</h3>

      <FileUploader
        bucket="projects"
        path={`${project.id}/client`}
        label="Upload Client Documents & Images (Secure)"
        secureMode
        allowPreview
        accepts=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
        onUploadComplete={async (url, fileName, meta) => {
          if (!fileName) return;
          try {
            const res = await fetch(`${API_BASE}/projects/upload-files`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                project_id: project.id,
                module_type: 'client',
                file_path: `${project.id}/client`,
                file_name: fileName,
                file_size: meta?.size || 0,
                mime_type: meta?.type || 'application/octet-stream',
                file_type: meta?.type?.startsWith('image/') ? 'image' : 'document',
                visibility: 'private',
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Upload failed with status ${res.status}`);
            }

            toast.success('File uploaded successfully');
            await loadFiles();
          } catch (err: any) {
            console.error('File upload error:', err);
            toast.error(err.message || 'Failed to upload file');
          }
        }}
      />

      <div className="grid gap-3">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client documents uploaded yet.</p>
        ) : (
          files.map((file) => (
            <Card key={file.id} className="hover:bg-muted/5 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                {file.file_type === 'image' ? (
                  <ImageIcon className="h-5 w-5 text-emerald-600" />
                ) : (
                  <FileText className="h-5 w-5 text-blue-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">Private</Badge>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(file.file_url, '_blank', 'noopener,noreferrer')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
