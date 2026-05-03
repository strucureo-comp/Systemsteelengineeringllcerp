'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getVATReturns,
  createVATReturn,
  fileVATReturn,
  autoPopulateVATFromGL,
  downloadVATReturnPDF,
  getCorporateTaxFilings,
  createCorporateTaxFiling,
  fileCorporateTaxFiling,
  downloadCorporateTaxPDF,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCcw, Plus, Send, Download, Calculator, Scale, Building2, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

export default function FinanceTaxesPage() {
  const { baseCurrency } = useCompanySettings();
  const [vatReturns, setVatReturns] = useState<any[]>([]);
  const [corpFilings, setCorpFilings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vat');

  const [vatForm, setVatForm] = useState({
    periodStart: '',
    periodEnd: '',
    totalOutputVAT: '0',
    totalInputVAT: '0',
    adjustments: '0',
  });

  const [corpForm, setCorpForm] = useState({
    taxYear: String(new Date().getFullYear()),
    periodStart: '',
    periodEnd: '',
    taxableIncome: '0',
    taxRate: '9',
    lossesCarriedForward: '0',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vat, corp] = await Promise.all([
        getVATReturns().catch(() => []),
        getCorporateTaxFilings().catch(() => []),
      ]);
      setVatReturns(vat || []);
      setCorpFilings(corp || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const vatNetPreview = useMemo(() => {
    const output = Number(vatForm.totalOutputVAT || 0);
    const input = Number(vatForm.totalInputVAT || 0);
    const adj = Number(vatForm.adjustments || 0);
    return output - input + adj;
  }, [vatForm]);

  const corpTaxPreview = useMemo(() => {
    const taxableIncome = Number(corpForm.taxableIncome || 0);
    const taxRate = Number(corpForm.taxRate || 0);
    const losses = Number(corpForm.lossesCarriedForward || 0);
    const adjustedIncome = Math.max(0, taxableIncome - losses);
    return (adjustedIncome * taxRate) / 100;
  }, [corpForm]);

  const handleCreateVAT = async () => {
    if (!vatForm.periodStart || !vatForm.periodEnd) {
      toast.error('VAT period start and end are required');
      return;
    }
    const payload = {
      ...vatForm,
      totalOutputVAT: Number(vatForm.totalOutputVAT || 0),
      totalInputVAT: Number(vatForm.totalInputVAT || 0),
      adjustments: Number(vatForm.adjustments || 0),
      netVAT: vatNetPreview,
      status: 'draft',
    };
    const result = await createVATReturn(payload).catch(() => null);
    if (!result) {
      toast.error('Failed to create VAT return');
      return;
    }
    toast.success('VAT return created');
    setVatForm({ periodStart: '', periodEnd: '', totalOutputVAT: '0', totalInputVAT: '0', adjustments: '0' });
    await loadData();
  };

  const handleAutoPopulateVAT = async () => {
    if (!vatForm.periodStart || !vatForm.periodEnd) {
      toast.error('Set period start and end before auto-populate');
      return;
    }
    const result = await autoPopulateVATFromGL({
      periodStart: vatForm.periodStart,
      periodEnd: vatForm.periodEnd,
    }).catch(() => null);
    if (!result?.totals) {
      toast.error('Failed to auto-populate VAT from GL');
      return;
    }
    setVatForm((p) => ({
      ...p,
      totalOutputVAT: String(Number(result.totals.totalOutputVAT || 0)),
      totalInputVAT: String(Number(result.totals.totalInputVAT || 0)),
      adjustments: String(Number(result.totals.adjustments || 0)),
    }));
    toast.success('VAT values auto-populated from GL');
  };

  const handleFileVAT = async (id: string) => {
    const referenceNumber = window.prompt('Enter filing reference number (optional)') || '';
    const result = await fileVATReturn(id, { referenceNumber }).catch(() => null);
    if (!result) {
      toast.error('Failed to file VAT return');
      return;
    }
    toast.success('VAT return filed');
    await loadData();
  };

  const handleCreateCorpTax = async () => {
    if (!corpForm.taxYear || !corpForm.periodStart || !corpForm.periodEnd) {
      toast.error('Tax year and period dates are required');
      return;
    }
    const payload = {
      ...corpForm,
      taxableIncome: Number(corpForm.taxableIncome || 0),
      taxRate: Number(corpForm.taxRate || 0),
      lossesCarriedForward: Number(corpForm.lossesCarriedForward || 0),
      taxLiability: corpTaxPreview,
      taxPayable: corpTaxPreview,
      status: 'draft',
    };
    const result = await createCorporateTaxFiling(payload).catch(() => null);
    if (!result) {
      toast.error('Failed to create corporate tax filing');
      return;
    }
    toast.success('Corporate tax filing created');
    await loadData();
  };

  const handleFileCorpTax = async (id: string) => {
    const referenceNumber = window.prompt('Enter filing reference number (optional)') || '';
    const result = await fileCorporateTaxFiling(id, { referenceNumber }).catch(() => null);
    if (!result) {
      toast.error('Failed to file corporate tax return');
      return;
    }
    toast.success('Corporate tax filing marked filed');
    await loadData();
  };

  if (loading) {
    return (
      <ModuleGuard module="finance">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Tax Engine...</p>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="finance">
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                    <Scale className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Tax Management</h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">VAT & Corporate Compliance Hub</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-10 gap-2 font-bold uppercase text-[10px] tracking-widest" onClick={loadData}>
                    <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="VAT Submissions" value={String(vatReturns.length)} sub="Historical Returns" icon={<Landmark className="h-4 w-4" />} />
            <KpiCard label="Corp Tax Filings" value={String(corpFilings.length)} sub="Annual Compliance" icon={<Building2 className="h-4 w-4" />} />
            <KpiCard 
                label="Next VAT Due" 
                value={vatReturns.find(r => r.status === 'draft')?.periodEnd || 'N/A'} 
                sub="Upcoming Deadline" 
                warn={vatReturns.some(r => r.status === 'draft')} 
            />
            <KpiCard label="Tax Jurisdiction" value="United Arab Emirates" sub="Primary Territory" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="bg-muted/50 border border-border h-11 p-1 rounded-xl">
            <TabsTrigger value="vat" className="px-8 text-[11px] font-black uppercase tracking-widest h-full data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg shadow-sm">VAT Return</TabsTrigger>
            <TabsTrigger value="corporate" className="px-8 text-[11px] font-black uppercase tracking-widest h-full data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg shadow-sm">Corporate Tax</TabsTrigger>
          </TabsList>

          <TabsContent value="vat" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 border-border shadow-sm">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Generate Return</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">New Periodic Filing</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Period Start</Label>
                      <Input type="date" value={vatForm.periodStart} onChange={(e) => setVatForm((p) => ({ ...p, periodStart: e.target.value }))} className="h-9 text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Period End</Label>
                      <Input type="date" value={vatForm.periodEnd} onChange={(e) => setVatForm((p) => ({ ...p, periodEnd: e.target.value }))} className="h-9 text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Output VAT</Label>
                      <Input type="number" value={vatForm.totalOutputVAT} onChange={(e) => setVatForm((p) => ({ ...p, totalOutputVAT: e.target.value }))} className="h-9 text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Input VAT</Label>
                      <Input type="number" value={vatForm.totalInputVAT} onChange={(e) => setVatForm((p) => ({ ...p, totalInputVAT: e.target.value }))} className="h-9 text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Adjustments</Label>
                      <Input type="number" value={vatForm.adjustments} onChange={(e) => setVatForm((p) => ({ ...p, adjustments: e.target.value }))} className="h-9 text-xs font-bold" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Net Liability</span>
                        <span className={cn("text-sm font-black tracking-tight", vatNetPreview >= 0 ? "text-red-600" : "text-emerald-600")}>
                            {formatCurrency(Math.abs(vatNetPreview), baseCurrency)}
                            <span className="ml-1 text-[8px] uppercase">{vatNetPreview >= 0 ? 'Payable' : 'Refund'}</span>
                        </span>
                    </div>
                    <div className="grid gap-2">
                        <Button variant="outline" onClick={handleAutoPopulateVAT} className="w-full h-10 gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Calculator className="h-3.5 w-3.5" /> Auto-populate
                        </Button>
                        <Button onClick={handleCreateVAT} className="w-full h-10 gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Plus className="h-3.5 w-3.5" /> Initialize Return
                        </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-border shadow-sm">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Filing History</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Archived VAT Returns</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground">Tax Period</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Liability</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-center">Status</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {vatReturns.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center">
                                    <Landmark className="h-10 w-10 text-muted/20 mx-auto mb-3" />
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">No Historical Returns Found</p>
                                </td>
                            </tr>
                        ) : vatReturns.map((r: any) => (
                          <tr key={r.id || r._id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                                <p className="text-xs font-bold text-foreground font-mono">{r.periodStart} ➔ {r.periodEnd}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className={cn("text-xs font-black", Number(r.netVAT || 0) >= 0 ? "text-red-600" : "text-emerald-600")}>
                                    {formatCurrency(Number(r.netVAT || 0), baseCurrency)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Badge variant="outline" className={cn(
                                    "text-[9px] font-black uppercase tracking-tighter border-none px-2",
                                    r.status === 'filed' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                )}>
                                    {r.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                {r.status !== 'filed' ? (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleFileVAT(r.id || r._id)} title="Mark Filed">
                                    <Send className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => downloadVATReturnPDF(r.id || r._id)} title="Download PDF">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="corporate" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 border-border shadow-sm">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Prepare Filing</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Annual Corporate Tax Return</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Assessment Year</Label>
                            <Input value={corpForm.taxYear} onChange={(e) => setCorpForm((p) => ({ ...p, taxYear: e.target.value }))} className="h-9 text-xs font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Period Start</Label>
                                <Input type="date" value={corpForm.periodStart} onChange={(e) => setCorpForm((p) => ({ ...p, periodStart: e.target.value }))} className="h-9 text-xs font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Period End</Label>
                                <Input type="date" value={corpForm.periodEnd} onChange={(e) => setCorpForm((p) => ({ ...p, periodEnd: e.target.value }))} className="h-9 text-xs font-bold" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Taxable Income</Label>
                            <Input type="number" value={corpForm.taxableIncome} onChange={(e) => setCorpForm((p) => ({ ...p, taxableIncome: e.target.value }))} className="h-9 text-xs font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Tax Rate (%)</Label>
                                <Input type="number" value={corpForm.taxRate} onChange={(e) => setCorpForm((p) => ({ ...p, taxRate: e.target.value }))} className="h-9 text-xs font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Loss Carryover</Label>
                                <Input type="number" value={corpForm.lossesCarriedForward} onChange={(e) => setCorpForm((p) => ({ ...p, lossesCarriedForward: e.target.value }))} className="h-9 text-xs font-bold" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Est. Tax Payable</span>
                            <span className="text-sm font-black text-red-600 tracking-tight">
                                {formatCurrency(corpTaxPreview, baseCurrency)}
                            </span>
                        </div>
                        <Button onClick={handleCreateCorpTax} className="w-full h-10 gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Plus className="h-3.5 w-3.5" /> Initialize Filing
                        </Button>
                    </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-border shadow-sm">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Compliance Registry</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Corporate Tax Record History</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground">AY / Period</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Tax Charge</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-center">Status</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {corpFilings.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center">
                                    <Building2 className="h-10 w-10 text-muted/20 mx-auto mb-3" />
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">No Compliance Records Found</p>
                                </td>
                            </tr>
                        ) : corpFilings.map((r: any) => (
                          <tr key={r.id || r._id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                                <p className="text-xs font-black text-foreground uppercase tracking-tight">{r.taxYear}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase font-mono">{r.periodStart} ➔ {r.periodEnd}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className="text-xs font-black text-foreground">
                                    {formatCurrency(Number(r.taxPayable || r.taxLiability || 0), baseCurrency)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Badge variant="outline" className={cn(
                                    "text-[9px] font-black uppercase tracking-tighter border-none px-2",
                                    r.status === 'filed' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                )}>
                                    {r.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                {r.status !== 'filed' ? (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleFileCorpTax(r.id || r._id)} title="Mark Filed">
                                    <Send className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => downloadCorporateTaxPDF(r.id || r._id)} title="Download PDF">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleGuard>
  );
}

function KpiCard({ label, value, sub, icon, alert, warn }: { label: string, value: string, sub?: string, icon?: React.ReactNode, alert?: boolean, warn?: boolean }) {
    return (
        <Card className={cn(
            "border shadow-sm transition-all overflow-hidden",
            alert ? "border-red-200 bg-red-50/30" : "border-border bg-card",
            warn && !alert ? "border-amber-200 bg-amber-50/30" : ""
        )}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                    {icon && <div className="text-muted-foreground/40">{icon}</div>}
                </div>
                <p className={cn(
                    "text-lg font-black tracking-tight leading-none mb-1",
                    alert ? "text-red-600" : "text-foreground"
                )}>
                    {value}
                </p>
                {sub && <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{sub}</p>}
            </CardContent>
        </Card>
    );
}
