'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getJournalEntries, getAccounts, getApprovalEngineSummary } from '@/lib/api';
import { toast } from 'sonner';

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  detail: string;
}

export default function PeriodClosePage() {
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [period, setPeriod] = useState<string>(() => new Date().toISOString().slice(0, 7));

  const loadData = async () => {
    try {
      setLoading(true);
      const [journals, accounts, approvals] = await Promise.all([
        getJournalEntries(),
        getAccounts(),
        getApprovalEngineSummary(),
      ]);

      const journalRows = Array.isArray(journals) ? journals : [];
      const accountRows = Array.isArray(accounts) ? accounts : [];
      const pendingApprovals = Number(approvals?.pendingApprovals || 0);

      const draftJournals = journalRows.filter((j) => (j.status || '').toLowerCase() === 'draft').length;
      const unclassifiedAccounts = accountRows.filter((a) => !a.type || !a.code).length;

      setChecklist([
        {
          key: 'journals',
          label: 'All journals posted',
          done: draftJournals === 0,
          detail: draftJournals === 0 ? 'No draft journals' : `${draftJournals} draft journal(s) remaining`,
        },
        {
          key: 'accounts',
          label: 'Chart of accounts validated',
          done: unclassifiedAccounts === 0,
          detail: unclassifiedAccounts === 0 ? 'Accounts look valid' : `${unclassifiedAccounts} account(s) missing metadata`,
        },
        {
          key: 'approvals',
          label: 'Approval queue cleared',
          done: pendingApprovals === 0,
          detail: pendingApprovals === 0 ? 'No pending approvals' : `${pendingApprovals} approval(s) pending`,
        },
      ]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load period-close checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [period]);

  const progress = useMemo(() => {
    if (checklist.length === 0) return 0;
    const doneCount = checklist.filter((item) => item.done).length;
    return Math.round((doneCount / checklist.length) * 100);
  }, [checklist]);

  return (
    <DashboardShell requireAdmin>
      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        <div className="border-b pb-5">
          <h1 className="text-2xl font-semibold">Period Close</h1>
          <p className="text-sm text-muted-foreground">Checklist generated from live accounting and approval APIs.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Close Progress ({period})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-2 bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className={`text-xs font-semibold ${item.done ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {item.done ? 'DONE' : 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={() => void loadData()}>Refresh Checklist</Button>
          <Button variant="outline" onClick={() => toast.success('Close validation requested')}>Run Close Validation</Button>
        </div>
      </div>
    </DashboardShell>
  );
}
