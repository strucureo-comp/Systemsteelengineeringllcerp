'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getJournalEntries, createJournalEntry, deleteJournalEntry } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/use-currency';
import { toast } from 'sonner';

type IntercompanyForm = {
  sourceEntity: string;
  targetEntity: string;
  description: string;
  amount: number;
};

function looksIntercompany(entry: any) {
  const text = `${entry?.description || ''} ${entry?.reference || ''}`.toLowerCase();
  return text.includes('intercompany') || text.includes('ic ') || text.includes('due to') || text.includes('due from');
}

export default function IntercompanyPage() {
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [form, setForm] = useState<IntercompanyForm>({
    sourceEntity: '',
    targetEntity: '',
    description: '',
    amount: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const journals = await getJournalEntries();
      const rows = Array.isArray(journals) ? journals.filter(looksIntercompany) : [];
      setEntries(rows);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load intercompany entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(() => {
    const total = entries.reduce((sum, e) => sum + Number(e.amount || e.total || 0), 0);
    return { count: entries.length, total };
  }, [entries]);

  const submit = async () => {
    if (!form.sourceEntity || !form.targetEntity || !form.description || Number(form.amount) <= 0) {
      toast.error('Source, target, description, and amount are required');
      return;
    }

    const description = `Intercompany: ${form.sourceEntity} -> ${form.targetEntity} | ${form.description}`;

    try {
      await createJournalEntry({
        description,
        lines: [
          {
            accountCode: '1100',
            description,
            debit: Number(form.amount),
            credit: 0,
          },
          {
            accountCode: '2000',
            description,
            debit: 0,
            credit: Number(form.amount),
          },
        ],
      });
      toast.success('Intercompany entry posted');
      setForm({ sourceEntity: '', targetEntity: '', description: '', amount: 0 });
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post intercompany entry');
    }
  };

  const removeEntry = async (id: string) => {
    if (!confirm('Delete this intercompany entry?')) return;
    try {
      const ok = await deleteJournalEntry(id);
      if (!ok) {
        toast.error('Failed to delete intercompany entry');
        return;
      }
      toast.success('Intercompany entry deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete intercompany entry');
    }
  };

  return (
    <DashboardShell requireAdmin>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="border-b pb-5">
          <h1 className="text-2xl font-semibold">Intercompany Hub</h1>
          <p className="text-sm text-muted-foreground">Intercompany transactions now sourced from journal APIs.</p>
        </div>

        <div className="grid gap-4 grid-cols-2">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Intercompany Entries</p><p className="text-2xl font-semibold">{totals.count}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-2xl font-semibold">{fmt(totals.total)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Create Intercompany Entry</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Source Entity</Label><Input value={form.sourceEntity} onChange={(e) => setForm((p) => ({ ...p, sourceEntity: e.target.value }))} /></div>
            <div><Label>Target Entity</Label><Input value={form.targetEntity} onChange={(e) => setForm((p) => ({ ...p, targetEntity: e.target.value }))} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} /></div>
            <div className="flex items-end"><Button onClick={submit}>Post Intercompany</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Intercompany Entries</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No intercompany entries found.</p>
            ) : (
              <div className="space-y-2">
                {entries.slice(0, 20).map((entry) => (
                  <div key={entry.id || entry._id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{entry.description || 'Intercompany Journal'}</p>
                      <p className="text-xs text-muted-foreground">{entry.date || entry.createdAt || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{fmt(Number(entry.amount || entry.total || 0))}</p>
                      <Button variant="outline" size="sm" onClick={() => removeEntry(entry.id || entry._id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
