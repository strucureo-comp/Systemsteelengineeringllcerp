'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBalanceSheet, exportBalanceSheetPDF } from '@/lib/api-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { exportToCSV } from '@/lib/utils/export-csv';

export default function BalanceSheetPage() {
  const { baseCurrency } = useCompanySettings();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getBalanceSheet(true);
    setData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">Assets, liabilities, and equity snapshot.</p>
        </div>
        <Link href="/admin/reports" className="text-sm text-primary">Back to Reports</Link>
      </div>

      <Card className="p-4 flex items-end gap-3">
        <Button onClick={load} className="gap-2" disabled={loading}>
          {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
          Load
        </Button>
        <Button variant="outline" onClick={() => void exportBalanceSheetPDF()}>Export PDF</Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!data) return;
            exportToCSV(
              [
                { section: 'Assets', metric: 'Current Assets', value: Number(data.assets?.current || 0) },
                { section: 'Assets', metric: 'Fixed Assets', value: Number(data.assets?.fixed || 0) },
                { section: 'Assets', metric: 'Total Assets', value: Number(data.assets?.total || 0) },
                { section: 'Liabilities', metric: 'Current Liabilities', value: Number(data.liabilities?.current || 0) },
                { section: 'Liabilities', metric: 'Long-Term Liabilities', value: Number(data.liabilities?.longTerm || 0) },
                { section: 'Liabilities', metric: 'Total Liabilities', value: Number(data.liabilities?.total || 0) },
                { section: 'Equity', metric: 'Capital', value: Number(data.equity?.capital || 0) },
                { section: 'Equity', metric: 'Retained Earnings', value: Number(data.equity?.retained || 0) },
                { section: 'Equity', metric: 'Total Equity', value: Number(data.equity?.total || 0) },
              ],
              `balance_sheet_${new Date().toISOString().slice(0, 10)}.csv`,
              [
                { key: 'section', label: 'Section' },
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Value' },
              ]
            );
          }}
        >
          Export CSV
        </Button>
      </Card>

      {data && (
        <Card className="p-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Current Assets</p><p className="font-bold">{formatCurrency(Number(data.assets?.current || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Fixed Assets</p><p className="font-bold">{formatCurrency(Number(data.assets?.fixed || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Current Liabilities</p><p className="font-bold">{formatCurrency(Number(data.liabilities?.current || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Long-Term Liabilities</p><p className="font-bold">{formatCurrency(Number(data.liabilities?.longTerm || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Capital</p><p className="font-bold">{formatCurrency(Number(data.equity?.capital || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Retained Earnings</p><p className="font-bold">{formatCurrency(Number(data.equity?.retained || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Total Assets</p><p className="font-bold">{formatCurrency(Number(data.assets?.total || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Balanced</p><p className="font-bold">{data.balanced ? 'Yes' : 'No'}</p></div>
          </div>
          {data.comparison ? (
            <div className="mt-4 border-t pt-4 text-sm">
              <p className="text-muted-foreground">Compared to previous snapshot ({new Date(data.comparison.asOf).toLocaleDateString()})</p>
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <div><p className="text-muted-foreground">Total Assets Delta</p><p className="font-bold">{formatCurrency(Number((data.assets?.total || 0) - (data.comparison.assets?.total || 0)), baseCurrency)}</p></div>
                <div><p className="text-muted-foreground">Total Liabilities Delta</p><p className="font-bold">{formatCurrency(Number((data.liabilities?.total || 0) - (data.comparison.liabilities?.total || 0)), baseCurrency)}</p></div>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
