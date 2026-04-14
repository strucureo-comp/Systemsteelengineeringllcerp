'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, FileImage, Plus, Save, Trash2, Loader2, Eye } from 'lucide-react';
import { FileUploader } from '@/components/shared/common/file-uploader';
import { updateProject } from '@/lib/api';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

interface DesignDoc {
  id: string;
  type: string;
  name: string;
  status: string;
  revision: string;
  date: string;
  file_url?: string;
  file_kind?: 'image' | 'document' | 'other';
}

export function DesignDetails({ project, onUpdate }: { project: Project, onUpdate?: () => void }) {
  const [documents, setDocuments] = useState<DesignDoc[]>(() => {
    if (project.design_data && Array.isArray(project.design_data)) {
      return project.design_data as DesignDoc[];
    }
    return [
      { id: '1', type: 'Drawing', name: 'General Arrangement', status: 'approved', revision: 'R2', date: '2024-01-15' },
    ];
  });

  const [saving, setSaving] = useState(false);
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
  const [newDoc, setNewDoc] = useState<Partial<DesignDoc>>({
    type: 'Drawing', name: '', status: 'pending', revision: 'R0', date: new Date().toISOString().split('T')[0]
  });

  const handleAdd = () => {
    if (!newDoc.name) return;
    const doc: DesignDoc = {
      id: Date.now().toString(),
      type: newDoc.type || 'Drawing',
      name: newDoc.name,
      status: newDoc.status || 'pending',
      revision: newDoc.revision || 'R0',
      date: newDoc.date || '',
    };
    setDocuments([...documents, doc]);
    setNewDoc({ type: 'Drawing', name: '', status: 'pending', revision: 'R0', date: new Date().toISOString().split('T')[0] });
  };

  const handleRemove = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, { design_data: documents });
      if (success) {
        toast.success('Design log updated');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Update failed');
      }
    } catch {
      toast.error('Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase tracking-tight">Design & Engineering</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="group hover:border-primary transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                {doc.type === 'Drawing' ? <FileImage className="h-6 w-6 text-blue-600" /> : <FileText className="h-6 w-6 text-orange-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                  <span className="text-xs font-bold text-muted-foreground">{doc.revision}</span>
                </div>
                <p className="font-medium text-sm">{doc.name}</p>
              </div>
              <div className="text-right">
                <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'} className="mb-1 uppercase text-[10px]">
                  {doc.status}
                </Badge>
                <p className="text-[10px] text-muted-foreground">{doc.date}</p>
              </div>
              {doc.file_url && (
                <Button
                  variant="outline"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => window.open(doc.file_url, '_blank', 'noopener,noreferrer')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleRemove(doc.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Add New */}
        <Card className="border-dashed">
          <CardContent className="p-4 flex gap-2 items-center">
            <Select value={newDoc.type} onValueChange={v => setNewDoc({...newDoc, type: v})}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Drawing">Drawing</SelectItem>
                <SelectItem value="BOQ">BOQ</SelectItem>
                <SelectItem value="Spec">Spec</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Document Name" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} />
            <Input className="w-[80px]" placeholder="Rev" value={newDoc.revision} onChange={e => setNewDoc({...newDoc, revision: e.target.value})} />
            <Select value={newDoc.status} onValueChange={v => setNewDoc({...newDoc, status: v})}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      </div>

      <div className="pt-2">
        <FileUploader
          bucket="projects"
          path={`${project.id}/design`}
          label="Upload Design Docs or Images (Secure)"
          secureMode
          allowPreview
          accepts=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
          onUploadComplete={async (url, fileName, meta) => {
            if (!fileName) return;
            const fileKind = meta?.type?.startsWith('image/') ? 'image' : 'document';
            const newEntry: DesignDoc = {
              id: Date.now().toString(),
              type: fileKind === 'image' ? 'Drawing' : 'Spec',
              name: fileName,
              status: 'uploaded',
              revision: 'R0',
              date: new Date().toISOString().split('T')[0],
              file_url: url,
              file_kind: fileKind,
            };

            const previousDocuments = documents;
            setDocuments((prev) => [newEntry, ...prev]);

            try {
              const res = await fetch(`${API_BASE}/projects/upload-files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  project_id: project.id,
                  module_type: 'design',
                  file_path: `${project.id}/design`,
                  file_name: fileName,
                  uploaded_by: project.client_id,
                  file_size: meta?.size || 0,
                  mime_type: meta?.type || 'application/octet-stream',
                  file_type: fileKind === 'image' ? 'image' : 'document',
                  visibility: 'private',
                }),
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Upload failed with status ${res.status}`);
              }
              
              const json = await res.json();
              // Replace optimistic entry with real server data if needed
              if (json.success && json.data && json.data[0]) {
                setDocuments(prev => prev.map(d => d.id === newEntry.id ? { ...newEntry, ...json.data[0] } : d));
              }
              toast.success('File uploaded successfully');
            } catch (err: any) {
              console.error('File upload error:', err);
              setDocuments(previousDocuments); // Rollback
              toast.error(err.message || 'Failed to upload file');
            }
          }}
        />
      </div>
    </div>
  );
}
