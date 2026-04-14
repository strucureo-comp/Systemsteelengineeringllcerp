'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function QualityInspectionList() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/quality-inspections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInspections(data);
      }
    } catch (error) {
      console.error('Failed to fetch inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      passed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
      conditional: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
    };

    const { color, icon: Icon } = config[status] || config.pending;

    return (
      <Badge className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 border-b pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Quality Inspections</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Audit production output and verify compliance standards</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span>New Inspection</span>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Card View */}
        <div className="block lg:hidden divide-y divide-border/50">
          {inspections.map((inspection) => (
            <div key={inspection._id} className="p-4 space-y-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{inspection.inspection_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inspection.inspection_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                  </div>
                  {getStatusBadge(inspection.status)}
                </div>
                
                <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Batch</p>
                    <p className="text-sm font-semibold">{inspection.quantity_inspected}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Passed</p>
                    <p className="text-sm font-bold text-emerald-600">{inspection.quantity_accepted}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-rose-600">Failed</p>
                    <p className="text-sm font-bold text-rose-600">{inspection.quantity_rejected}</p>
                  </div>
                </div>

                <Button size="sm" variant="ghost" className="w-full rounded-full bg-muted/50 hover:bg-muted">
                  Audit Details
                </Button>
            </div>
          ))}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b border-border/50">
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Inspection ID</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Audit Date</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Category</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Batch</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Passed</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Failed</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Result</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {inspections.map((inspection) => (
                <tr key={inspection._id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 font-bold text-sm tracking-tight">{inspection.inspection_number}</td>
                  <td className="p-4 text-sm font-medium">{new Date(inspection.inspection_date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-semibold text-muted-foreground italic">{inspection.inspection_type}</td>
                  <td className="p-4 text-center font-bold text-sm">{inspection.quantity_inspected}</td>
                  <td className="p-4 text-center font-bold text-sm text-emerald-600">{inspection.quantity_accepted}</td>
                  <td className="p-4 text-center font-bold text-sm text-rose-600">{inspection.quantity_rejected}</td>
                  <td className="p-4 text-center">
                    {getStatusBadge(inspection.status)}
                  </td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" className="h-8 rounded-full hover:bg-muted font-bold text-[10px] uppercase">
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inspections.length === 0 && (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-sm font-medium italic">No quality inspection logs found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
