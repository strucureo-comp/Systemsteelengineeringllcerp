'use client';

import { useState } from 'react';
import { getTrialBalance, exportTrialBalancePDF } from '@/lib/api-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { exportToCSV } from '@/lib/utils/export-csv';
import Link from 'next/link';

export default function TrialBalancePage() {
  const { baseCurrency } = useCompanySettings();
  const [asOf, setAsOf] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getTrialBalance(asOf || undefined);
    setData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
          <p className="text-sm text-muted-foreground mt-1">Account balances as of a selected date.</p>
        </div>
        <Link href="/admin/reports" className="text-sm text-primary">Back to Reports</Link>
      </div>

      <Card className="p-4 flex items-end gap-3">
        <div>
          <Label>As Of Date</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <Button onClick={load} className="gap-2" disabled={loading}>
          {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
          Load
        </Button>
        <Button variant="outline" onClick={() => void exportTrialBalancePDF(asOf || undefined)} className="gap-2">
          Export PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!data?.lines?.length) return;
            exportToCSV(
              data.lines.map((line: any) => ({
                account_code: line.account_code,
                account_name: line.account_name,
                debit: Number(line.debit || 0),
                credit: Number(line.credit || 0),
              })),
              `trial_balance_${asOf || new Date().toISOString().slice(0, 10)}.csv`,
              [
                { key: 'account_code', label: 'Account Code' },
                { key: 'account_name', label: 'Account Name' },
                { key: 'debit', label: 'Debit' },
                { key: 'credit', label: 'Credit' },
              ]
            );
          }}
          className="gap-2"
        >
          Export CSV
        </Button>
      </Card>

      {data && (
        <>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground">Total Debit</p><p className="font-bold">{formatCurrency(Number(data.totals?.debit || 0), baseCurrency)}</p></div>
              <div><p className="text-muted-foreground">Total Credit</p><p className="font-bold">{formatCurrency(Number(data.totals?.credit || 0), baseCurrency)}</p></div>
              <div><p className="text-muted-foreground">Balanced</p><p className="font-bold">{data.balanced ? 'Yes' : 'No'}</p></div>
            </div>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Account Code</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Account Name</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Debit</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {(data.lines || []).map((line: any) => (
                  <tr key={line.account_code} className="border-b border-border">
                    <td className="px-4 py-2 text-sm font-mono">{line.account_code}</td>
                    <td className="px-4 py-2 text-sm">{line.account_name}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(Number(line.debit || 0), baseCurrency)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(Number(line.credit || 0), baseCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
