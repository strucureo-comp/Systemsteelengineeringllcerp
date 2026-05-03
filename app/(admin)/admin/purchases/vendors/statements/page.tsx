'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendors, getVendorStatement } from '@/lib/api';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, RefreshCcw, FileSpreadsheet } from 'lucide-react';
import { PurchasesNav } from '../../_components/purchases-nav';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

export default function VendorStatementsPage() {
  const router = useRouter();
  const { baseCurrency } = useCompanySettings();
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const data = await getVendors();
      setVendors(data || []);
      setLoading(false);
    };
    void run();
  }, []);

  const loadStatement = async () => {
    if (!vendorId) {
      toast.error('Select a vendor');
      return;
    }
    const data = await getVendorStatement(vendorId, { from: from || undefined, to: to || undefined });
    if (!data) {
      toast.error('Failed to load statement');
      return;
    }
    setStatement(data);
  };

  const rows = useMemo(() => statement?.lines || [], [statement]);

  if (loading) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/purchases/vendors')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Vendor Statements</h1>
            <p className="text-muted-foreground">Ledger and outstanding balances by vendor</p>
          </div>
        </div>

        <PurchasesNav />

        <Card className="p-4 border border-border">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor</Label>
              <select className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select vendor</option>
                {vendors.map((v) => <option key={v.id || v._id} value={v.id || v._id}>{v.name || v.legal_name}</option>)}
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
              <Card className="p-4"><p className="text-xs text-muted-foreground">Total Paid</p><p className="font-bold">{formatCurrency(statement.summary.total_paid || 0, baseCurrency)}</p></Card>
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
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground text-right">Paid</th>
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
    </DashboardShell>
  );
}

