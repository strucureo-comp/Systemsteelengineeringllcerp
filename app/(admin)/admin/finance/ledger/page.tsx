'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAccounts, getJournalEntries, createAccount, createJournalEntry, deleteAccount, deleteJournalEntry } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/use-currency';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/shared/layout/module-guard';

type AccountForm = { code: string; name: string; type: string };
type JournalForm = { description: string; debitAccountCode: string; creditAccountCode: string; amount: number };

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-2">{label}</p>
        <p className="text-xl font-black text-foreground tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function FinanceLedgerPage() {
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [accountForm, setAccountForm] = useState<AccountForm>({ code: '', name: '', type: 'asset' });
  const [journalForm, setJournalForm] = useState<JournalForm>({ description: '', debitAccountCode: '', creditAccountCode: '', amount: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const [acc, je] = await Promise.all([getAccounts(), getJournalEntries()]);
      setAccounts(Array.isArray(acc) ? acc : []);
      setJournals(Array.isArray(je) ? je : []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(() => {
    const assets = accounts.filter((a) => a.type === 'asset').length;
    const liabilities = accounts.filter((a) => a.type === 'liability').length;
    const equity = accounts.filter((a) => a.type === 'equity').length;
    const entries = journals.length;
    return { assets, liabilities, equity, entries };
  }, [accounts, journals]);

  const submitAccount = async () => {
    if (!accountForm.code || !accountForm.name) {
      toast.error('Account code and name are required');
      return;
    }

    try {
      await createAccount(accountForm);
      toast.success('Account created');
      setAccountForm({ code: '', name: '', type: 'asset' });
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account');
    }
  };

  const submitJournal = async () => {
    if (!journalForm.description || !journalForm.debitAccountCode || !journalForm.creditAccountCode) {
      toast.error('Description and accounts are required');
      return;
    }

    if (Number(journalForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    try {
      await createJournalEntry({
        description: journalForm.description,
        date: new Date().toISOString(),
        lines: [
          {
            account_code: journalForm.debitAccountCode,
            description: journalForm.description,
            debit: Number(journalForm.amount),
            credit: 0,
          },
          {
            account_code: journalForm.creditAccountCode,
            description: journalForm.description,
            debit: 0,
            credit: Number(journalForm.amount),
          },
        ],
      });
      toast.success('Journal entry posted');
      setJournalForm({ description: '', debitAccountCode: '', creditAccountCode: '', amount: 0 });
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post journal entry');
    }
  };

  const removeAccount = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    try {
      const ok = await deleteAccount(id);
      if (!ok) {
        toast.error('Failed to delete account');
        return;
      }
      toast.success('Account deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete account');
    }
  };

  const removeJournal = async (id: string) => {
    if (!confirm('Delete this journal entry?')) return;
    try {
      const ok = await deleteJournalEntry(id);
      if (!ok) {
        toast.error('Failed to delete journal entry');
        return;
      }
      toast.success('Journal entry deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete journal entry');
    }
  };

  return (
    <DashboardShell requireAdmin>
      <ModuleGuard module="finance">
        <div className="space-y-6 max-w-4xl pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">General Ledger</h1>
                    <p className="text-sm text-muted-foreground mt-2">Live chart of accounts and journal entries.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-bold uppercase tracking-widest" onClick={loadData}>
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                        Sync
                    </Button>
                </div>
            </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="ASSET ACCOUNTS" value={totals.assets.toString()} />
        <KpiCard label="LIABILITIES" value={totals.liabilities.toString()} />
        <KpiCard label="EQUITY" value={totals.equity.toString()} />
        <KpiCard label="JOURNAL ENTRIES" value={totals.entries.toString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 px-5 pt-5"><CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Add Account</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Code</Label>
                <Input className="h-9" value={accountForm.code} onChange={(e) => setAccountForm((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Account Name</Label>
                <Input className="h-9" value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Classification</Label>
              <Input className="h-9" value={accountForm.type} onChange={(e) => setAccountForm((p) => ({ ...p, type: e.target.value }))} />
            </div>
            <Button className="w-full h-9 font-bold uppercase text-[10px] tracking-widest" onClick={submitAccount}>Establish Account</Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 px-5 pt-5"><CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Post Journal</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Memo / Description</Label>
              <Input className="h-9" value={journalForm.description} onChange={(e) => setJournalForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Debit Account</Label>
                <Input className="h-9" value={journalForm.debitAccountCode} onChange={(e) => setJournalForm((p) => ({ ...p, debitAccountCode: e.target.value }))} placeholder="e.g. 1000" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Credit Account</Label>
                <Input className="h-9" value={journalForm.creditAccountCode} onChange={(e) => setJournalForm((p) => ({ ...p, creditAccountCode: e.target.value }))} placeholder="e.g. 2000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Amount</Label>
              <Input className="h-9" type="number" value={journalForm.amount} onChange={(e) => setJournalForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} />
            </div>
            <Button variant="secondary" className="w-full h-9 font-bold uppercase text-[10px] tracking-widest" onClick={submitJournal}>Commit Entry</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Accounts Registry</h3>
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            {accounts.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-bold uppercase text-muted-foreground opacity-50 tracking-widest">No verified accounts</div>
            ) : (
              <div className="divide-y">
                {accounts.slice(0, 20).map((a) => (
                  <div key={a.id || a._id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-tight">{a.code} — {a.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5 tracking-widest opacity-70">{a.type}</p>
                    </div>
                    <Button variant="ghost" className="h-8 text-[10px] font-bold text-red-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAccount(a.id || a._id)}>Drop</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chronological Ledger</h3>
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 animate-pulse space-y-2">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
              </div>
            ) : journals.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-bold uppercase text-muted-foreground opacity-50 tracking-widest">No entries found</div>
            ) : (
              <div className="divide-y">
                {journals.slice(0, 20).map((j) => (
                  <div key={j.id || j._id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-tight">{j.description || 'Journal Entry'}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{j.date || j.createdAt || '-'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-black text-foreground">{fmt(Number(j.amount || j.total || 0))}</p>
                      <Button variant="ghost" className="h-8 text-[10px] font-bold text-red-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeJournal(j.id || j._id)}>Redact</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      </ModuleGuard>
    </DashboardShell>
  );
}
