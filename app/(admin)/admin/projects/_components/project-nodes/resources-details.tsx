'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { updateProject } from '@/lib/api';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

interface Resource {
  id: string;
  name: string;
  planned: number;
  actual: number;
  unit: string;
}

export function ResourcesDetails({ project, onUpdate }: { project: Project, onUpdate?: () => void }) {
  const [resources, setResources] = useState<Resource[]>(() => {
    if (project.resources_data && Array.isArray(project.resources_data)) {
      return project.resources_data as Resource[];
    }
    return [
      { id: '1', name: 'Structural Steel', planned: 100, actual: 45, unit: 'Ton' },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [newRes, setNewRes] = useState<Partial<Resource>>({ name: '', planned: 0, actual: 0, unit: '' });

  const handleAdd = () => {
    if (!newRes.name) return;
    const r: Resource = {
      id: Date.now().toString(),
      name: newRes.name,
      planned: Number(newRes.planned) || 0,
      actual: Number(newRes.actual) || 0,
      unit: newRes.unit || 'Unit',
    };
    setResources([...resources, r]);
    setNewRes({ name: '', planned: 0, actual: 0, unit: '' });
  };

  const handleRemove = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, { resources_data: resources });
      if (success) {
        toast.success('Resources updated');
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
        <h2 className="text-xl font-bold uppercase tracking-tight">Resource Planning</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid gap-4">
        {resources.map((r) => (
          <Card key={r.id} className="group hover:border-primary transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">{r.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-bold">{r.actual} / {r.planned} {r.unit}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleRemove(r.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <Progress value={r.planned > 0 ? (r.actual / r.planned) * 100 : 0} className="h-2" />
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="p-4 flex gap-2 items-center">
            <Input placeholder="Resource Name" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} />
            <Input placeholder="Unit" className="w-[80px]" value={newRes.unit} onChange={e => setNewRes({...newRes, unit: e.target.value})} />
            <Input type="number" placeholder="Plan" className="w-[80px]" value={newRes.planned} onChange={e => setNewRes({...newRes, planned: parseFloat(e.target.value)})} />
            <Input type="number" placeholder="Act" className="w-[80px]" value={newRes.actual} onChange={e => setNewRes({...newRes, actual: parseFloat(e.target.value)})} />
            <Button size="icon" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}