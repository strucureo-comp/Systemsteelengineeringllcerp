'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Package, ClipboardCheck, AlertTriangle, TrendingUp, Clock, Activity } from 'lucide-react';
import { AnalyticsDashboard } from './_components/analytics-dashboard';

export default function ManufacturingPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Manufacturing Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of production health and operational performance
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Orders</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Factory className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalOrders || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span>System active</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary/[0.03] border border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">Active Process</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboard?.activeOrders || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Real-time tracking</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-emerald-50/50 border border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Completed</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{dashboard?.completedOrders || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Production Target Met</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-rose-50/50 border border-rose-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-700">Quality Issues</CardTitle>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{dashboard?.qualityIssues || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Requires Attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Inline Quick Insights */}
      <div className="pt-4">
        <h2 className="text-base font-semibold mb-4">Production Insights</h2>
        <AnalyticsDashboard isCompact />
      </div>
    </div>
  );
}
