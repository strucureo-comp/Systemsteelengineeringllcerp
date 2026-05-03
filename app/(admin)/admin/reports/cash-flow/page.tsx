'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getCashFlowReport, exportCashFlowPDF } from '@/lib/api-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCcw } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { exportToCSV } from '@/lib/utils/export-csv';

export default function CashFlowPage() {
  const { baseCurrency } = useCompanySettings();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getCashFlowReport(period, true);
    setData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Flow Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">Operating, investing, and financing cash movements.</p>
        </div>
        <Link href="/admin/reports" className="text-sm text-primary">Back to Reports</Link>
      </div>

      <Card className="p-4 flex items-end gap-3">
        <div className="w-52">
          <p className="text-sm mb-2">Period</p>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} className="gap-2" disabled={loading}>
          {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
          Load
        </Button>
        <Button variant="outline" onClick={() => void exportCashFlowPDF(period)}>Export PDF</Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!data) return;
            exportToCSV(
              [
                { metric: 'Operating Cash Flow', value: Number(data.operating || 0) },
                { metric: 'Investing Cash Flow', value: Number(data.investing || 0) },
                { metric: 'Financing Cash Flow', value: Number(data.financing || 0) },
                { metric: 'Net Change In Cash', value: Number(data.netChange || 0) },
              ],
              `cash_flow_${period}.csv`,
              [
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
            <div><p className="text-muted-foreground">Operating</p><p className="font-bold">{formatCurrency(Number(data.operating || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Investing</p><p className="font-bold">{formatCurrency(Number(data.investing || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Financing</p><p className="font-bold">{formatCurrency(Number(data.financing || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Net Change</p><p className="font-bold">{formatCurrency(Number(data.netChange || 0), baseCurrency)}</p></div>
          </div>
          {data.comparison ? (
            <div className="mt-4 border-t pt-4 text-sm">
              <p className="text-muted-foreground">Compared to previous period ({data.comparison.period?.start} to {data.comparison.period?.end})</p>
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <div><p className="text-muted-foreground">Operating Delta</p><p className="font-bold">{formatCurrency(Number((data.operating || 0) - (data.comparison.operating || 0)), baseCurrency)}</p></div>
                <div><p className="text-muted-foreground">Net Change Delta</p><p className="font-bold">{formatCurrency(Number((data.netChange || 0) - (data.comparison.netChange || 0)), baseCurrency)}</p></div>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
