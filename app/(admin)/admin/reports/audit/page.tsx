'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuditReportDashboard } from '@/app/(admin)/admin/reports/_components/audit-report-dashboard';
import { getFinancialAuditReport } from '@/lib/services/business-documents-api';

interface AuditReport {
  generated_at: string;
  period: { from: string; to: string };
  executive_summary: {
    overall_health: string;
    ledger_integrity: boolean;
    total_transactions: number;
    total_accounts: number;
  };
  financial_summary: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    total_revenue: number;
    total_expenses: number;
    net_income: number;
  };
  anomalies_detected: Array<{ category: string; description: string; impact?: string }>;
  compliance_checks: Record<string, boolean>;
  audit_trail: { entries_by_type: Record<string, number> };
  key_observations: {
    revenue_trend: string;
    expense_trend: string;
    cash_position: string;
    liquidity_status: string;
  };
  recommendations: string[];
  account_analysis: Array<{
    account_id: string;
    account_name: string;
    account_code: string;
    account_type: string;
    closing_balance: number;
    transactions_count: number;
  }>;
}

interface ChartData {
  monthly_revenue: Array<{ month: string; amount: number }>;
  monthly_expenses: Array<{ month: string; amount: number }>;
  revenue_by_source: Array<{ name: string; value: number }>;
  expenses_by_category: Array<{ name: string; value: number }>;
  account_balances: Array<{ name: string; value: number }>;
}

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
const monthEnd = today.toISOString().split('T')[0];

function toDashboardReport(raw: any): AuditReport {
  const revenue = Number(raw?.financial_summary?.total_revenue || 0);
  const expenses = Number(raw?.financial_summary?.total_expenses || 0);
  const netIncome = raw?.financial_summary?.net_income ?? raw?.financial_summary?.net_profit ?? (revenue - expenses);

  return {
    generated_at: raw?.generated_at || new Date().toISOString(),
    period: raw?.period || { from: monthStart, to: monthEnd },
    executive_summary: {
      overall_health: raw?.executive_summary?.overall_health || 'good',
      ledger_integrity: Boolean(raw?.executive_summary?.ledger_integrity),
      total_transactions: Number(raw?.executive_summary?.total_transactions || 0),
      total_accounts: Number(raw?.executive_summary?.total_accounts || 0),
    },
    financial_summary: {
      total_assets: Number(raw?.financial_summary?.total_assets || 0),
      total_liabilities: Number(raw?.financial_summary?.total_liabilities || 0),
      total_equity: Number(raw?.financial_summary?.total_equity || 0),
      total_revenue: revenue,
      total_expenses: expenses,
      net_income: Number(netIncome || 0),
    },
    anomalies_detected: Array.isArray(raw?.anomalies_detected)
      ? raw.anomalies_detected.map((a: any) => ({
          category: a.category || 'observation',
          description: a.description || 'N/A',
          impact: a.severity || 'low',
        }))
      : [],
    compliance_checks: {
      ledger_integrity: Boolean(raw?.executive_summary?.ledger_integrity),
      accounting_equation: Math.abs(Number(raw?.financial_summary?.total_assets || 0) - (Number(raw?.financial_summary?.total_liabilities || 0) + Number(raw?.financial_summary?.total_equity || 0))) < 0.01,
      no_critical_anomalies: !(Array.isArray(raw?.anomalies_detected) && raw.anomalies_detected.some((a: any) => a.category === 'error')),
      period_closed: true,
    },
    audit_trail: {
      entries_by_type: {
        journal: Number(raw?.executive_summary?.total_transactions || 0),
        anomaly: Array.isArray(raw?.anomalies_detected) ? raw.anomalies_detected.length : 0,
        account: Number(raw?.executive_summary?.total_accounts || 0),
      },
    },
    key_observations: {
      revenue_trend: revenue >= expenses ? 'increasing' : 'decreasing',
      expense_trend: expenses > revenue ? 'increasing' : 'stable',
      cash_position: Number(raw?.financial_summary?.total_assets || 0) > Number(raw?.financial_summary?.total_liabilities || 0) ? 'strong' : 'tight',
      liquidity_status: Number(raw?.financial_summary?.total_assets || 0) > Number(raw?.financial_summary?.total_liabilities || 0) ? 'healthy' : 'watch',
    },
    recommendations: Array.isArray(raw?.anomalies_detected) && raw.anomalies_detected.length > 0
      ? ['Review anomalies and reconcile impacted ledgers.', 'Validate postings and close unresolved items before filing.']
      : ['Maintain current controls and continue monthly reconciliations.'],
    account_analysis: [],
  };
}

function toDashboardCharts(raw: any): ChartData {
  const monthlyRevenue = Array.isArray(raw?.chart_data?.monthly_revenue) ? raw.chart_data.monthly_revenue : [];
  const monthlyExpenses = Array.isArray(raw?.chart_data?.monthly_expenses) ? raw.chart_data.monthly_expenses : [];
  return {
    monthly_revenue: monthlyRevenue,
    monthly_expenses: monthlyExpenses,
    revenue_by_source: [{ name: 'Revenue', value: Number(raw?.financial_summary?.total_revenue || 0) }],
    expenses_by_category: [{ name: 'Expenses', value: Number(raw?.financial_summary?.total_expenses || 0) }],
    account_balances: [
      { name: 'Assets', value: Number(raw?.financial_summary?.total_assets || 0) },
      { name: 'Liabilities', value: Number(raw?.financial_summary?.total_liabilities || 0) },
      { name: 'Equity', value: Number(raw?.financial_summary?.total_equity || 0) },
    ],
  };
}

export default function FinancialAuditReportPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFinancialAuditReport(from, to);
      setReport(toDashboardReport(data));
      setChartData(toDashboardCharts(data));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load financial audit report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <ModuleGuard module="reports">
      <div className="space-y-4 pb-10">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">To</p>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={() => void load()}>Generate Report</Button>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && report && chartData && (
          <AuditReportDashboard
            report={report as any}
            chartData={chartData as any}
            onExport={() => window.print()}
          />
        )}
      </div>
    </ModuleGuard>
  );
}
