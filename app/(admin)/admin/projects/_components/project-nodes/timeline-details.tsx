'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Save, Trash2, Loader2 } from 'lucide-react';
import { updateProject } from '@/lib/api';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

interface Milestone {
  id: string;
  name: string;
  date: string;
  status: string;
}

export function TimelineDetails({ project, onUpdate }: { project: Project, onUpdate?: () => void }) {
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    if (project.timeline_data && Array.isArray(project.timeline_data)) {
      return project.timeline_data as Milestone[];
    }
    return [
      { id: '1', name: 'Project Kickoff', date: '2024-01-01', status: 'completed' },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [newMilestone, setNewMilestone] = useState<Partial<Milestone>>({
    name: '', date: '', status: 'pending'
  });

  const handleAdd = () => {
    if (!newMilestone.name) return;
    const m: Milestone = {
      id: Date.now().toString(),
      name: newMilestone.name,
      date: newMilestone.date || '',
      status: newMilestone.status || 'pending',
    };
    setMilestones([...milestones, m]);
    setNewMilestone({ name: '', date: '', status: 'pending' });
  };

  const handleRemove = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, { timeline_data: milestones });
      if (success) {
        toast.success('Timeline updated');
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
        <h2 className="text-xl font-bold uppercase tracking-tight">Timeline & Milestones</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="relative border-l-2 border-muted ml-3 space-y-8 py-2">
        {milestones.map((m) => (
          <div key={m.id} className="relative pl-8 group">
            <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 ${
              m.status === 'completed' ? 'bg-green-500 border-green-500' : 
              m.status === 'in_progress' ? 'bg-blue-500 border-blue-500 animate-pulse' : 
              'bg-background border-muted-foreground'
            }`} />
            
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> {m.date}
                </span>
                <h3 className={`text-sm font-bold ${m.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {m.name}
                </h3>
                <div>
                  <Badge variant="outline" className="text-[10px] uppercase">{m.status.replace('_', ' ')}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleRemove(m.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add Form */}
        <div className="pl-8 pt-4">
          <div className="grid gap-2 p-4 border border-dashed rounded-lg bg-muted/10">
            <Input placeholder="Milestone Name" value={newMilestone.name} onChange={e => setNewMilestone({...newMilestone, name: e.target.value})} />
            <div className="flex gap-2">
              <Input type="date" value={newMilestone.date} onChange={e => setNewMilestone({...newMilestone, date: e.target.value})} />
              <Select value={newMilestone.status} onValueChange={v => setNewMilestone({...newMilestone, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd}><Plus className="h-4 w-4" /> Add</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}