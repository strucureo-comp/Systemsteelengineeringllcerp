'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { updateProject } from '@/lib/api';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

interface LabourEntry {
  id: string;
  category: string;
  skill: string;
  rate: number;
  attendance: number;
  overtime: number;
}

export function LabourDetails({ project, onUpdate }: { project: Project, onUpdate?: () => void }) {
  // Parse existing data or use default
  const [labourData, setLabourData] = useState<LabourEntry[]>(() => {
    if (project.labour_data && Array.isArray(project.labour_data)) {
      return project.labour_data as LabourEntry[];
    }
    return [
      { id: '1', category: 'Welder', skill: 'Skilled', rate: 120, attendance: 24, overtime: 12 },
      { id: '2', category: 'Fitter', skill: 'Semi-Skilled', rate: 90, attendance: 22, overtime: 5 },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<LabourEntry>>({
    category: '', skill: '', rate: 0, attendance: 0, overtime: 0
  });

  const totalCost = labourData.reduce((sum, item) => sum + (item.rate * item.attendance * 8) + (item.rate * 1.5 * item.overtime), 0);

  const handleAdd = () => {
    if (!newEntry.category || !newEntry.skill) return;
    const entry: LabourEntry = {
      id: Date.now().toString(),
      category: newEntry.category,
      skill: newEntry.skill,
      rate: Number(newEntry.rate) || 0,
      attendance: Number(newEntry.attendance) || 0,
      overtime: Number(newEntry.overtime) || 0,
    };
    setLabourData([...labourData, entry]);
    setNewEntry({ category: '', skill: '', rate: 0, attendance: 0, overtime: 0 });
  };

  const handleRemove = (id: string) => {
    setLabourData(labourData.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, {
        labour_data: labourData
      });
      
      if (success) {
        toast.success('Labour records updated');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to update records');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase tracking-tight">Labour Details</h2>
        <div className="flex gap-4 items-center">
          <Badge variant="outline" className="text-lg px-3 py-1">Est. Total: ${totalCost.toLocaleString()}</Badge>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Daily Labour Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Skill Level</TableHead>
                <TableHead className="text-right">Rate ($/hr)</TableHead>
                <TableHead className="text-center">Man-Days</TableHead>
                <TableHead className="text-right">Overtime (hrs)</TableHead>
                <TableHead className="text-right">Cost (Est)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labourData.map((item) => {
                const cost = (item.rate * item.attendance * 8) + (item.rate * 1.5 * item.overtime);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell>{item.skill}</TableCell>
                    <TableCell className="text-right">{item.rate}</TableCell>
                    <TableCell className="text-center">{item.attendance}</TableCell>
                    <TableCell className="text-right">{item.overtime}</TableCell>
                    <TableCell className="text-right font-bold">${cost.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Add New Row */}
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input 
                    placeholder="Category" 
                    value={newEntry.category} 
                    onChange={e => setNewEntry({...newEntry, category: e.target.value})}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    placeholder="Skill" 
                    value={newEntry.skill} 
                    onChange={e => setNewEntry({...newEntry, skill: e.target.value})}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    placeholder="Rate" 
                    value={newEntry.rate} 
                    onChange={e => setNewEntry({...newEntry, rate: parseFloat(e.target.value)})}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    placeholder="Days" 
                    value={newEntry.attendance} 
                    onChange={e => setNewEntry({...newEntry, attendance: parseFloat(e.target.value)})}
                    className="h-8 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    placeholder="Hrs" 
                    value={newEntry.overtime} 
                    onChange={e => setNewEntry({...newEntry, overtime: parseFloat(e.target.value)})}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">-</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={handleAdd}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}