'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateProject } from '@/lib/api';
import type { Project } from '@/lib/db/types';

export function CoreDetails({ project, onUpdate }: { project: Project, onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description,
    status: project.status,
    estimated_cost: project.estimated_cost?.toString() || '',
    actual_cost: project.actual_cost?.toString() || '',
    deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
        actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : undefined,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      });

      if (success) {
        toast.success('Project details updated');
        onUpdate();
      } else {
        toast.error('Failed to update project');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase tracking-tight">Project Core Details</h2>
      
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>Project Title</Label>
          <Input 
            value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
          />
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(val: any) => setFormData({ ...formData, status: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Estimated Cost</Label>
            <Input 
              type="number" 
              value={formData.estimated_cost} 
              onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })} 
            />
          </div>
          <div className="grid gap-2">
            <Label>Actual Cost</Label>
            <Input 
              type="number" 
              value={formData.actual_cost} 
              onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })} 
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Deadline</Label>
          <Input 
            type="date" 
            value={formData.deadline} 
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} 
          />
        </div>

        <div className="grid gap-2">
          <Label>Description</Label>
          <Textarea 
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            rows={4}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
