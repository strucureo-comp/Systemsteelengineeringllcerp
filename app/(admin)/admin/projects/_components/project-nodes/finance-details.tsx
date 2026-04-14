import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import type { Project, Invoice } from '@/lib/db/types';

export function FinanceDetails({ project }: { project: Project & { invoices?: Invoice[] } }) {
  const estimatedCost = project.estimated_cost || 0;
  const actualCost = project.actual_cost || 0;
  
  // Calculate Revenue from Invoices
  const invoices = project.invoices || [];
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const outstandingRevenue = totalRevenue - paidRevenue;

  const grossMargin = paidRevenue - actualCost;
  // Mock net margin calculation if we don't have overheads
  const netMargin = grossMargin * 0.9; 

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase tracking-tight">Project Financials</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold text-green-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Paid Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">${paidRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600">Total Invoiced: ${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold text-red-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">${actualCost.toLocaleString()}</div>
            <p className="text-xs text-red-600">Budget: ${estimatedCost.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider">Profitability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Gross Margin (Paid - Cost)</span>
              <span className={`font-bold ${grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${grossMargin.toLocaleString()}
              </span>
            </div>
            <Progress value={totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-muted/20">
          <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Cash Received</p>
          <p className="text-xl font-mono font-bold">${paidRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg bg-muted/20">
          <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Outstanding</p>
          <p className="text-xl font-mono font-bold text-orange-600">${outstandingRevenue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}