'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getPnLReport, exportPnLPDF } from '@/lib/api-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCcw } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { exportToCSV } from '@/lib/utils/export-csv';

export default function ProfitLossPage() {
  const { baseCurrency } = useCompanySettings();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getPnLReport(period, true);
    setData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue and expense performance by period.</p>
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
        <Button variant="outline" onClick={() => void exportPnLPDF(period)}>Export PDF</Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!data) return;
            exportToCSV(
              [
                { metric: 'Revenue', value: Number(data.revenue?.total || 0) },
                { metric: 'COGS', value: Number(data.expenses?.cogs || 0) },
                { metric: 'Operating Expenses', value: Number(data.expenses?.operating || 0) },
                { metric: 'Other Expenses', value: Number(data.expenses?.other || 0) },
                { metric: 'Gross Profit', value: Number(data.profit?.gross || 0) },
                { metric: 'Operating Profit', value: Number(data.profit?.operating || 0) },
                { metric: 'Net Profit', value: Number(data.profit?.net || 0) },
                { metric: 'Net Margin %', value: Number(data.profit?.margin || 0) },
              ],
              `profit_loss_${period}.csv`,
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
            <div><p className="text-muted-foreground">Revenue</p><p className="font-bold">{formatCurrency(Number(data.revenue?.total || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">COGS</p><p className="font-bold">{formatCurrency(Number(data.expenses?.cogs || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Operating Expenses</p><p className="font-bold">{formatCurrency(Number(data.expenses?.operating || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Other Expenses</p><p className="font-bold">{formatCurrency(Number(data.expenses?.other || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Gross Profit</p><p className="font-bold">{formatCurrency(Number(data.profit?.gross || 0), baseCurrency)}</p></div>
            <div><p className="text-muted-foreground">Net Profit</p><p className="font-bold">{formatCurrency(Number(data.profit?.net || 0), baseCurrency)}</p></div>
          </div>
          {data.comparison ? (
            <div className="mt-4 border-t pt-4 text-sm">
              <p className="text-muted-foreground">Compared to previous period ({data.comparison.period?.start} to {data.comparison.period?.end})</p>
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <div><p className="text-muted-foreground">Revenue Delta</p><p className="font-bold">{formatCurrency(Number((data.revenue?.total || 0) - (data.comparison.revenue?.total || 0)), baseCurrency)}</p></div>
                <div><p className="text-muted-foreground">Net Profit Delta</p><p className="font-bold">{formatCurrency(Number((data.profit?.net || 0) - (data.comparison.profit?.net || 0)), baseCurrency)}</p></div>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
