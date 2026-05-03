'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getARCustomers, getCustomerStatement } from '@/lib/api';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, RefreshCcw, FileSpreadsheet } from 'lucide-react';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

export default function CustomerStatementsPage() {
  const router = useRouter();
  const { baseCurrency } = useCompanySettings();
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const data = await getARCustomers();
      setCustomers(data || []);
      setLoading(false);
    };
    void run();
  }, []);

  const loadStatement = async () => {
    if (!customerId) {
      toast.error('Select a customer');
      return;
    }

    const data = await getCustomerStatement(customerId, { from: from || undefined, to: to || undefined });
    if (!data) {
      toast.error('Failed to load statement');
      return;
    }
    setStatement(data);
  };

  const rows = useMemo(() => statement?.lines || [], [statement]);

  if (loading) {
    return (
      <ModuleGuard module="sales">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/sales/customers')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Customer Statements</h1>
            <p className="text-muted-foreground">Ledger and outstanding balances by customer</p>
          </div>
        </div>

        <Card className="p-4 border border-border">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <select className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.legal_name || c.trade_name || c.customer_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={loadStatement} className="h-10 w-full">Load Statement</Button>
            </div>
          </div>
        </Card>

        {statement && (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4"><p className="text-xs text-muted-foreground">Total Billed</p><p className="font-bold">{formatCurrency(statement.summary.total_billed || 0, baseCurrency)}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Total Received</p><p className="font-bold">{formatCurrency(statement.summary.total_paid || 0, baseCurrency)}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-bold">{formatCurrency(statement.summary.outstanding || 0, baseCurrency)}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Invoices</p><p className="font-bold">{statement.summary.invoices_count || 0}</p></Card>
            </div>

            <Card className="border shadow-sm rounded-md overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Reference</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Billed</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Received</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Balance</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((line: any, idx: number) => (
                      <tr key={`${line.reference}-${idx}`}>
                        <td className="px-6 py-4 text-xs">{new Date(line.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-xs font-bold">{line.reference}</td>
                        <td className="px-6 py-4 text-xs text-right">{formatCurrency(line.debit || 0, baseCurrency)}</td>
                        <td className="px-6 py-4 text-xs text-right">{formatCurrency(line.credit || 0, baseCurrency)}</td>
                        <td className="px-6 py-4 text-xs text-right font-bold">{formatCurrency(line.balance || 0, baseCurrency)}</td>
                        <td className="px-6 py-4 text-xs">{line.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => window.print()} className="h-9 gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Print
              </Button>
            </div>
          </>
        )}
      </div>
    </ModuleGuard>
  );
}
