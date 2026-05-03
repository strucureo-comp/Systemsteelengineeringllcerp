'use client';

import { useState } from 'react';
import { getGeneralLedger, exportGeneralLedgerPDF } from '@/lib/api-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { exportToCSV } from '@/lib/utils/export-csv';
import Link from 'next/link';

export default function GeneralLedgerPage() {
  const { baseCurrency } = useCompanySettings();
  const [accountCode, setAccountCode] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getGeneralLedger({
      account_code: accountCode || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">Journal-level ledger detail by account and period.</p>
        </div>
        <Link href="/admin/reports" className="text-sm text-primary">Back to Reports</Link>
      </div>

      <Card className="p-4 grid md:grid-cols-5 gap-3 items-end">
        <div>
          <Label>Account Code</Label>
          <Input placeholder="e.g. 1000" value={accountCode} onChange={(e) => setAccountCode(e.target.value)} />
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={load} className="gap-2" disabled={loading}>
          {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
          Load
        </Button>
        <Button
          variant="outline"
          onClick={() => void exportGeneralLedgerPDF({ account_code: accountCode || undefined, from: from || undefined, to: to || undefined })}
          className="gap-2"
        >
          Export PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!data?.rows?.length) return;
            exportToCSV(
              data.rows.map((row: any) => ({
                date: new Date(row.date).toISOString().slice(0, 10),
                entry_number: row.entry_number,
                reference: row.reference,
                description: row.description,
                debit: Number(row.debit || 0),
                credit: Number(row.credit || 0),
                running_balance: Number(row.running_balance || 0),
              })),
              `general_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
              [
                { key: 'date', label: 'Date' },
                { key: 'entry_number', label: 'Entry Number' },
                { key: 'reference', label: 'Reference' },
                { key: 'description', label: 'Description' },
                { key: 'debit', label: 'Debit' },
                { key: 'credit', label: 'Credit' },
                { key: 'running_balance', label: 'Running Balance' },
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Total Debit</p><p className="font-bold">{formatCurrency(Number(data.totals?.debit || 0), baseCurrency)}</p></div>
              <div><p className="text-muted-foreground">Total Credit</p><p className="font-bold">{formatCurrency(Number(data.totals?.credit || 0), baseCurrency)}</p></div>
            </div>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Entry</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Reference</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Description</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Debit</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Credit</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).map((row: any, idx: number) => (
                  <tr key={`${row.entry_number}-${idx}`} className="border-b border-border">
                    <td className="px-4 py-2 text-sm">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm font-mono">{row.entry_number}</td>
                    <td className="px-4 py-2 text-sm">{row.reference}</td>
                    <td className="px-4 py-2 text-sm">{row.description}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(Number(row.debit || 0), baseCurrency)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(Number(row.credit || 0), baseCurrency)}</td>
                    <td className="px-4 py-2 text-sm text-right font-bold">{formatCurrency(Number(row.running_balance || 0), baseCurrency)}</td>
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
