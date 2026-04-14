'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    TrendingUp, 
    TrendingDown, 
    Activity, 
    Target, 
    AlertTriangle,
    BarChart3,
    PieChart,
    Calendar,
    Clock,
    ShieldCheck,
    DollarSign,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // OEE Data
  const [oeeData, setOeeData] = useState<any>(null);
  const [selectedWorkCenter, setSelectedWorkCenter] = useState('');
  const [workCenters, setWorkCenters] = useState<any[]>([]);

  // Efficiency Data
  const [efficiencyData, setEfficiencyData] = useState<any>(null);

  // Quality Data
  const [qualityData, setQualityData] = useState<any>(null);

  // Scrap Data
  const [scrapData, setScrapData] = useState<any>(null);

  useEffect(() => {
    fetchWorkCenters();
  }, []);

  useEffect(() => {
    if (selectedWorkCenter) {
      fetchOEE();
    }
  }, [selectedWorkCenter, dateRange]);

  useEffect(() => {
    fetchEfficiency();
    fetchQuality();
    fetchScrap();
  }, [dateRange]);

  const fetchWorkCenters = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/work-centers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkCenters(data);
        if (data.length > 0) setSelectedWorkCenter(data[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch work centers:', error);
    }
  };

  const fetchOEE = async () => {
    if (!selectedWorkCenter) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/manufacturing/analytics/oee?work_center_id=${selectedWorkCenter}&start_date=${dateRange.start}&end_date=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setOeeData(data);
      }
    } catch (error) {
      console.error('Failed to fetch OEE:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEfficiency = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/manufacturing/analytics/efficiency?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setEfficiencyData(data);
      }
    } catch (error) {
      console.error('Failed to fetch efficiency:', error);
    }
  };

  const fetchQuality = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/manufacturing/analytics/quality?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setQualityData(data);
      }
    } catch (error) {
      console.error('Failed to fetch quality:', error);
    }
  };

  const fetchScrap = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/manufacturing/analytics/scrap?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setScrapData(data);
      }
    } catch (error) {
      console.error('Failed to fetch scrap:', error);
    }
  };

  const getOEEColor = (value: number) => {
    if (value >= 85) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOEEBgColor = (value: number) => {
    if (value >= 85) return 'bg-green-100';
    if (value >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Date Range & Filter bar */}
      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Period Start</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="pl-9 bg-background focus:ring-primary/20 transition-all border-none shadow-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Period End</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="pl-9 bg-background focus:ring-primary/20 transition-all border-none shadow-none"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={() => {
                fetchOEE();
                fetchEfficiency();
                fetchQuality();
                fetchScrap();
              }} 
              className="md:w-32 bg-primary shadow-lg shadow-primary/20 gap-2"
            >
              <Activity className="h-4 w-4" />
              <span>Sync</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="oee" className="space-y-6">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="oee" className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">System OEE</TabsTrigger>
          <TabsTrigger value="efficiency" className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Efficiency</TabsTrigger>
          <TabsTrigger value="quality" className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Quality</TabsTrigger>
          <TabsTrigger value="scrap" className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Waste Analysis</TabsTrigger>
        </TabsList>

        {/* OEE Tab */}
        <TabsContent value="oee" className="space-y-6">
          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <div className="h-1 bg-primary/20 w-full" />
            <CardHeader className="py-4 px-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Overall Equipment Effectiveness</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Performance metrics for specific floor facilities</p>
                    </div>
                    <div className="w-64">
                        <Select value={selectedWorkCenter} onValueChange={setSelectedWorkCenter}>
                            <SelectTrigger className="h-9 bg-muted/50 border-none rounded-full px-4">
                                <SelectValue placeholder="Select facility..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50">
                                {workCenters.map((wc) => (
                                    <SelectItem key={wc._id} value={wc._id}>
                                        {wc.name} ({wc.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            {oeeData && (
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* OEE Highlight */}
                  <div className={cn("p-6 rounded-3xl transition-all border", 
                    oeeData.oee >= 85 ? "bg-emerald-50/50 border-emerald-100" : 
                    oeeData.oee >= 60 ? "bg-amber-50/50 border-amber-100" : 
                    "bg-rose-50/50 border-rose-100"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest",
                             oeeData.oee >= 85 ? "text-emerald-700" : 
                             oeeData.oee >= 60 ? "text-amber-700" : 
                             "text-rose-700"
                        )}>Total OEE</p>
                        <Target className={cn("h-4 w-4", 
                             oeeData.oee >= 85 ? "text-emerald-500" : 
                             oeeData.oee >= 60 ? "text-amber-500" : 
                             "text-rose-500"
                        )} />
                    </div>
                    <div className={cn("text-4xl font-black tracking-tighter", 
                        oeeData.oee >= 85 ? "text-emerald-600" : 
                        oeeData.oee >= 60 ? "text-amber-600" : 
                        "text-rose-600"
                    )}>
                      {oeeData.oee}%
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-2 uppercase tracking-tight">World Class Target: 85%</p>
                  </div>

                  <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Availability</p>
                        <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">
                      {oeeData.availability}%
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-2 uppercase tracking-tight">
                      {oeeData.total_actual_time_hours}h Activity / {oeeData.total_planned_time_hours}h Planned
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performance</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">
                      {oeeData.performance}%
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-2 uppercase tracking-tight">
                      {oeeData.total_actual_production} / {oeeData.total_planned_production} units
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quality</p>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{oeeData.quality}%</div>
                    <p className="text-[10px] font-medium text-rose-500 mt-2 uppercase tracking-tighter">
                      {oeeData.total_rejected} Loss due to defects
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-10 p-4 border rounded-2xl bg-muted/5 border-dashed">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">OEE Guide:</p>
                    <div className="flex gap-6 text-[10px] font-bold uppercase tracking-tight">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                          <span className="text-emerald-600">85-100%: World Class</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                          <span className="text-amber-600">60-84%: Standard</span>
                        </div>
                        <div className="flex items-center gap-2 text-rose-600">
                          <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                          <span>&lt;60%: Sub-optimal</span>
                        </div>
                    </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-6">
          {efficiencyData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-blue-50/50 border border-blue-100/50 overflow-hidden">
                <div className="p-6 flex items-start justify-between">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                               <Target className="h-4 w-4" />
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Completion Velocity</p>
                        </div>
                        <div className="text-5xl font-black text-blue-700 tracking-tighter">
                          {efficiencyData.completion_rate}%
                        </div>
                        <div className="pt-2 flex gap-4 text-xs font-medium text-blue-600/70">
                             <div className="px-3 py-1 bg-white/50 rounded-full border border-blue-100/50">
                                <strong>{efficiencyData.completed_orders}</strong> Finished
                             </div>
                             <div className="px-3 py-1 bg-white/50 rounded-full border border-blue-100/50">
                                <strong>{efficiencyData.total_orders}</strong> Total
                             </div>
                        </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-200" />
                </div>
              </Card>

              <Card className="border-none shadow-sm bg-emerald-50/50 border border-emerald-100/50 overflow-hidden">
                <div className="p-6 flex items-start justify-between">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                               <Clock className="h-4 w-4" />
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Delivery Accuracy</p>
                        </div>
                        <div className="text-5xl font-black text-emerald-700 tracking-tighter">
                          {efficiencyData.on_time_delivery_rate}%
                        </div>
                        <p className="text-xs font-medium text-emerald-600/70 uppercase tracking-tight">On-time fulfillment performance</p>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-emerald-200" />
                </div>
              </Card>

              <Card className="border-none shadow-sm md:col-span-2 overflow-hidden bg-card">
                <CardHeader className="py-4 border-b">
                   <CardTitle className="text-base font-semibold">Volume Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Scheduled Batch</p>
                        <p className="text-4xl font-bold tracking-tighter">{efficiencyData.total_planned_quantity}</p>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                           <div className="h-full bg-primary w-[70%]" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Net Realized</p>
                        <p className="text-4xl font-bold tracking-tighter text-emerald-600">{efficiencyData.total_produced_quantity}</p>
                        <div className="h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 w-[95%]" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Material Loss</p>
                        <p className="text-4xl font-bold tracking-tighter text-rose-600">{efficiencyData.total_scrapped_quantity}</p>
                        <div className="h-1 w-full bg-rose-100 rounded-full overflow-hidden">
                           <div className="h-full bg-rose-500 w-[15%]" />
                        </div>
                      </div>
                   </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-6">
          {qualityData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="border-none shadow-sm bg-emerald-500 text-white overflow-hidden p-6 relative">
                   <Activity className="absolute bottom-[-10px] right-[-10px] h-24 w-24 text-white/10" />
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Inspection pass rate</p>
                   <div className="text-5xl font-black mt-2 tracking-tighter">{qualityData.pass_rate}%</div>
                   <p className="mt-8 text-xs font-medium bg-white/20 inline-block px-3 py-1 rounded-full">{qualityData.passed_inspections} Audits passed</p>
               </Card>
               <Card className="border-none shadow-sm bg-rose-500 text-white overflow-hidden p-6 relative">
                   <AlertTriangle className="absolute bottom-[-10px] right-[-10px] h-24 w-24 text-white/10" />
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Unit rejection rate</p>
                   <div className="text-5xl font-black mt-2 tracking-tighter">{qualityData.rejection_rate}%</div>
                   <p className="mt-8 text-xs font-medium bg-white/20 inline-block px-3 py-1 rounded-full">{qualityData.total_rejected} Units failing standards</p>
               </Card>
               <Card className="border-none shadow-sm bg-card overflow-hidden p-6">
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Units Audited</p>
                   <div className="text-5xl font-black mt-2 tracking-tighter text-foreground">{qualityData.total_inspected}</div>
                   <div className="mt-8 flex gap-2">
                       <div className="flex-1 h-2 bg-emerald-100 rounded-full" />
                       <div className="flex-[0.3] h-2 bg-rose-100 rounded-full" />
                   </div>
               </Card>

               <Card className="border-none shadow-sm md:col-span-3 overflow-hidden bg-card">
                  <CardHeader className="py-4 border-b">
                     <CardTitle className="text-base font-semibold">Defect Stratification</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {Object.entries(qualityData.defects_by_type).map(([type, data]: [string, any]) => (
                        <div key={type} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                          <div className="space-y-2">
                            <p className="text-sm font-bold uppercase tracking-tight">{type}</p>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Crit: {data.critical}</span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded">Maj: {data.major}</span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Min: {data.minor}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black">{data.quantity}</p>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">{data.count} Occurrences</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
               </Card>
            </div>
          )}
        </TabsContent>

        {/* Scrap Tab */}
        <TabsContent value="scrap" className="space-y-6">
          {scrapData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Premium Scrap Metric */}
                 <div className="p-6 rounded-[2rem] bg-rose-50/50 border border-rose-100 flex flex-col justify-between h-48">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
                           <Trash2 className="h-5 w-5" />
                        </div>
                        <AlertTriangle className="text-rose-300 h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Total Material Waste</p>
                        <p className="text-4xl font-black text-rose-800 tracking-tighter">{scrapData.total_scrap_quantity}</p>
                    </div>
                 </div>

                 <div className="p-6 rounded-[2rem] bg-amber-50/50 border border-amber-100 flex flex-col justify-between h-48">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                           <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Financial Loss (OPEX)</p>
                        <p className="text-4xl font-black text-amber-800 tracking-tighter underline decoration-amber-300 underline-offset-4 decoration-4">AED {scrapData.total_scrap_value.toFixed(0)}</p>
                    </div>
                 </div>

                 <Card className="border-none shadow-sm bg-card p-6 flex flex-col justify-between h-48 md:col-span-2 lg:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rework Potential</p>
                    <div className="flex items-end gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold">
                               <span className="text-emerald-600">RECOVERABLE: {scrapData.reworkable_percentage}%</span>
                               <span className="text-rose-500">LOSS: {100 - scrapData.reworkable_percentage}%</span>
                            </div>
                            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)]" style={{ width: `${scrapData.reworkable_percentage}%` }} />
                                <div className="h-full bg-rose-500" style={{ width: `${100 - scrapData.reworkable_percentage}%` }} />
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-2xl font-black text-emerald-600">{scrapData.reworkable_quantity}</p>
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">UNITS</p>
                        </div>
                    </div>
                 </Card>

                 {/* Reasons breakdown */}
                 <Card className="border-none shadow-sm bg-card overflow-hidden md:col-span-2 lg:col-span-2">
                     <CardHeader className="py-4 border-b">
                        <CardTitle className="text-base font-semibold">Root Cause Attribution</CardTitle>
                     </CardHeader>
                     <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {Object.entries(scrapData.scrap_by_reason).map(([reason, data]: [string, any]) => (
                                <div key={reason} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-tight text-foreground">{reason.replace('_', ' ')}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{data.count} Incidences reported</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black">{data.quantity} Units</p>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">AED {data.value.toFixed(2)} Loss</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </CardContent>
                 </Card>

                 <Card className="border-none shadow-sm bg-card overflow-hidden md:col-span-2 lg:col-span-2">
                     <CardHeader className="py-4 border-b">
                        <CardTitle className="text-base font-semibold">High Scrap Intensity Items</CardTitle>
                     </CardHeader>
                     <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {scrapData.top_scrap_items.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-black">{index + 1}</div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-tight text-foreground">{item.item_name}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium font-mono">{item.item_sku}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black">{item.quantity} Units</p>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">AED {item.value.toFixed(2)} Value</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </CardContent>
                 </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
