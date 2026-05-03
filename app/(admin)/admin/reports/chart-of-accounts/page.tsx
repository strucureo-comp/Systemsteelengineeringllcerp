'use client';

import { useEffect, useState } from 'react';
import { getCoaSummary } from '@/lib/api-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { exportToCSV } from '@/lib/utils/export-csv';
import Link from 'next/link';

export default function ChartOfAccountsSummaryPage() {
  const { baseCurrency } = useCompanySettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getCoaSummary();
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">Account structure and net movement by type.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!data?.rows?.length) return;
              exportToCSV(
                data.rows.map((row: any) => ({
                  code: row.code,
                  name: row.name,
                  type: row.type,
                  status: row.is_active ? 'Active' : 'Inactive',
                  debit: Number(row.debit || 0),
                  credit: Number(row.credit || 0),
                  net: Number(row.net || 0),
                })),
                `coa_summary_${new Date().toISOString().slice(0, 10)}.csv`,
                [
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'status', label: 'Status' },
                  { key: 'debit', label: 'Debit' },
                  { key: 'credit', label: 'Credit' },
                  { key: 'net', label: 'Net' },
                ]
              );
            }}
          >
            Export CSV
          </Button>
          <Button variant="outline" onClick={load} className="gap-2" disabled={loading}>
            {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Link href="/admin/reports" className="text-sm text-primary">Back to Reports</Link>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(data.byType || {}).map(([type, v]: any) => (
              <Card key={type} className="p-4">
                <p className="text-xs text-muted-foreground uppercase">{type}</p>
                <p className="text-sm font-bold mt-1">Accounts: {v.count}</p>
                <p className="text-sm font-bold">{formatCurrency(Number(v.net || 0), baseCurrency)}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Code</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Name</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Debit</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Credit</th>
                  <th className="px-4 py-2 text-xs text-muted-foreground text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).map((row: any) => (
                  <tr key={row.code} className="border-b border-border">
                    <td className="px-4 py-2 text-sm font-mono">{row.code}</td>
                    <td className="px-4 py-2 text-sm">{row.name}</td>
                    <td className="px-4 py-2 text-sm">{row.type}</td>
                    <td className="px-4 py-2 text-sm">{row.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(Number(row.debit || 0), baseCurrency)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(Number(row.credit || 0), baseCurrency)}</td>
                    <td className="px-4 py-2 text-sm text-right font-bold">{formatCurrency(Number(row.net || 0), baseCurrency)}</td>
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
