'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { updateProject } from '@/lib/api';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

interface InventoryEntry {
  id: string;
  name: string;
  unit: string;
  issued: number;
  used: number;
  scrap: number;
  returned: number;
}

export function InventoryDetails({ project, onUpdate }: { project: Project, onUpdate?: () => void }) {
  const [inventory, setInventory] = useState<InventoryEntry[]>(() => {
    if (project.inventory_data && Array.isArray(project.inventory_data)) {
      return project.inventory_data as InventoryEntry[];
    }
    return [
      { id: '1', name: 'Steel Beams', unit: 'Ton', issued: 50, used: 35, scrap: 0.5, returned: 0 },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<InventoryEntry>>({
    name: '', unit: '', issued: 0, used: 0, scrap: 0, returned: 0
  });

  const handleAdd = () => {
    if (!newEntry.name) return;
    const entry: InventoryEntry = {
      id: Date.now().toString(),
      name: newEntry.name,
      unit: newEntry.unit || 'Unit',
      issued: Number(newEntry.issued) || 0,
      used: Number(newEntry.used) || 0,
      scrap: Number(newEntry.scrap) || 0,
      returned: Number(newEntry.returned) || 0,
    };
    setInventory([...inventory, entry]);
    setNewEntry({ name: '', unit: '', issued: 0, used: 0, scrap: 0, returned: 0 });
  };

  const handleRemove = (id: string) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, {
        inventory_data: inventory
      });
      
      if (success) {
        toast.success('Inventory updated');
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
        <h2 className="text-xl font-bold uppercase tracking-tight">Project Inventory</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-center">Unit</TableHead>
                <TableHead className="text-right text-blue-600">Issued</TableHead>
                <TableHead className="text-right text-green-600">Used</TableHead>
                <TableHead className="text-right text-red-600">Scrap</TableHead>
                <TableHead className="text-right text-orange-600">Returns</TableHead>
                <TableHead className="text-right font-bold">Balance</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-center text-xs uppercase text-muted-foreground">{m.unit}</TableCell>
                  <TableCell className="text-right">{m.issued}</TableCell>
                  <TableCell className="text-right">{m.used}</TableCell>
                  <TableCell className="text-right">{m.scrap}</TableCell>
                  <TableCell className="text-right">{m.returned}</TableCell>
                  <TableCell className="text-right font-bold bg-muted/20">
                    {m.issued - m.used - m.scrap - m.returned}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell><Input placeholder="Material Name" value={newEntry.name} onChange={e => setNewEntry({...newEntry, name: e.target.value})} className="h-8"/></TableCell>
                <TableCell><Input placeholder="Unit" value={newEntry.unit} onChange={e => setNewEntry({...newEntry, unit: e.target.value})} className="h-8 text-center"/></TableCell>
                <TableCell><Input type="number" value={newEntry.issued} onChange={e => setNewEntry({...newEntry, issued: parseFloat(e.target.value)})} className="h-8 text-right"/></TableCell>
                <TableCell><Input type="number" value={newEntry.used} onChange={e => setNewEntry({...newEntry, used: parseFloat(e.target.value)})} className="h-8 text-right"/></TableCell>
                <TableCell><Input type="number" value={newEntry.scrap} onChange={e => setNewEntry({...newEntry, scrap: parseFloat(e.target.value)})} className="h-8 text-right"/></TableCell>
                <TableCell><Input type="number" value={newEntry.returned} onChange={e => setNewEntry({...newEntry, returned: parseFloat(e.target.value)})} className="h-8 text-right"/></TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={handleAdd}><Plus className="h-4 w-4"/></Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}