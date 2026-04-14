'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProject } from '@/lib/api';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

interface Expense {
  id: string;
  desc: string;
  date: string;
  amount: number;
  category: string;
}

export function ExpensesDetails({ project, onUpdate }: { project: Project, onUpdate?: () => void }) {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (project.expenses_data && Array.isArray(project.expenses_data)) {
      return project.expenses_data as Expense[];
    }
    return [
      { id: '1', desc: 'Site Office Setup', date: '2024-01-05', amount: 5000, category: 'Site Expenses' },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [newExp, setNewExp] = useState<Partial<Expense>>({ desc: '', date: '', amount: 0, category: '' });

  const handleAdd = () => {
    if (!newExp.desc) return;
    const e: Expense = {
      id: Date.now().toString(),
      desc: newExp.desc,
      date: newExp.date || new Date().toISOString().split('T')[0],
      amount: Number(newExp.amount) || 0,
      category: newExp.category || 'Misc',
    };
    setExpenses([...expenses, e]);
    setNewExp({ desc: '', date: '', amount: 0, category: '' });
  };

  const handleRemove = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProject(project.id, { expenses_data: expenses });
      if (success) {
        toast.success('Expenses updated');
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
        <h2 className="text-xl font-bold uppercase tracking-tight">Project Expenses</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="space-y-2">
        {expenses.map((e) => (
          <Card key={e.id} className="bg-muted/10 group">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-full border">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{e.desc}</p>
                  <p className="text-xs text-muted-foreground">{e.category} • {e.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold font-mono text-red-600">-${e.amount.toLocaleString()}</p>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleRemove(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="p-3 flex gap-2 items-center">
            <Input placeholder="Description" value={newExp.desc} onChange={e => setNewExp({...newExp, desc: e.target.value})} />
            <Input placeholder="Category" value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})} />
            <Input type="date" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} />
            <Input type="number" placeholder="Amount" value={newExp.amount} onChange={e => setNewExp({...newExp, amount: parseFloat(e.target.value)})} />
            <Button size="icon" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}