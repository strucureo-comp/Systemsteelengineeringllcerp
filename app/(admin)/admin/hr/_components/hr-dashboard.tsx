'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, AlertTriangle, Calendar, ChevronRight, Clock, DollarSign, ShieldCheck, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import type { Attendance, Employee, Holiday, Leave, Payroll } from '@/lib/db/types';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffect } from 'react';

interface HRDashboardProps {
  employees: Employee[];
  attendance: Attendance[];
  payrolls: Payroll[];
  leaves: Leave[];
  holidays: Holiday[];
  jobOpenings?: any[];
  applicants?: any[];
  offerLetters?: any[];
  separations?: any[];
}

function asDate(input: unknown): Date | null {
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function HRDashboard({ employees, attendance, payrolls, leaves, holidays, jobOpenings = [], applicants = [], offerLetters = [], separations = [] }: HRDashboardProps) {
  const { baseCurrency } = useCompanySettings();

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);

  const fmt = (n: number) => formatCurrency(n, baseCurrency, { compact: true });
  const latestAttendanceByEmployee = useMemo(() => {
    const latest = new Map<string, Attendance>();
    for (const record of attendance) {
      const employeeId = String(record.employee_id || record.employee?.id || '');
      if (!employeeId) continue;

      const current = latest.get(employeeId);
      const recordDate = asDate(record.date)?.getTime() || 0;
      const currentDate = current ? asDate(current.date)?.getTime() || 0 : 0;

      if (!current || recordDate >= currentDate) {
        latest.set(employeeId, record);
      }
    }
    return latest;
  }, [attendance]);

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      onDuty: employees.filter((e) => e.status === 'active').filter((e) => latestAttendanceByEmployee.get(String(e.id))?.status === 'present').length,
      pendingLeaves: leaves.filter((l) => l.status === 'pending').length,
      pendingPayrolls: payrolls.filter((p) => p.status === 'pending_approval').length,
      monthlyCost: payrolls[0]
        ? Number(payrolls[0].total_amount || 0)
        : employees.reduce((sum, e) => sum + Number(e.basic_salary || 0), 0),
      upcomingHolidays: holidays.filter((h) => {
        const d = asDate(h.date);
        return d ? d >= new Date() : false;
      }).length,
      // Recruitment Pipeline Stats
      openJobs: jobOpenings.filter((j) => j.status === 'open').length,
      pendingApplicants: applicants.filter((a) => ['applied', 'screening', 'interview'].includes(a.status)).length,
      pendingOffers: offerLetters.filter((o) => o.status === 'sent').length,
      // Separation Stats
      activeSeparations: separations.filter((s) => ['initiated', 'in-progress'].includes(s.status)).length,
      pendingSeparations: separations.filter((s) => s.status !== 'cancelled' && (s.clearance_status === 'pending' || s.final_settlement_status === 'pending')).length,
    }),
    [employees, latestAttendanceByEmployee, payrolls, leaves, holidays, jobOpenings, applicants, offerLetters, separations]
  );

  const deptDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((e) => {
      const dept = e.dept?.name || e.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [employees]);

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((e) => {
      const type = e.employment_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const attendanceTrends = useMemo(() => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts: Record<string, number> = {};
    dayLabels.forEach((d) => {
      dayCounts[d] = 0;
    });

    attendance.forEach((a) => {
      const d = asDate(a.date);
      if (!d) return;
      if (a.status === 'present') {
        dayCounts[dayLabels[d.getDay()]] += 1;
      }
    });

    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => ({
      name,
      present: dayCounts[name] || 0,
    }));
  }, [attendance]);

  const pendingPayrollList = useMemo(
    () => payrolls.filter((p) => p.status === 'pending_approval').slice(0, 3),
    [payrolls]
  );

  const upcomingHolidayList = useMemo(
    () =>
      holidays
        .filter((h) => {
          const d = asDate(h.date);
          return d ? d >= new Date() : false;
        })
        .sort((a, b) => {
          const aDate = asDate(a.date)?.getTime() || 0;
          const bDate = asDate(b.date)?.getTime() || 0;
          return aDate - bDate;
        })
        .slice(0, 4),
    [holidays]
  );

  const pendingLeaveList = useMemo(() => leaves.filter((l) => l.status === 'pending').slice(0, 4), [leaves]);

  const colors = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Workforce Size"
          value={stats.total}
          icon={Users}
          trend={stats.active > 0 ? `${stats.active} active` : 'No active staff'}
          trendUp={stats.active > 0}
          description="Active employees"
        />
        <MetricCard
          title="Payroll Approvals"
          value={stats.pendingPayrolls}
          icon={ShieldCheck}
          trend="Pending"
          trendUp={false}
          description="Awaiting MD/CEO review"
          highlight={stats.pendingPayrolls > 0}
        />
        <MetricCard
          title="Monthly Payroll"
          value={fmt(stats.monthlyCost)}
          icon={DollarSign}
          trend="Estimated"
          description="Current cycle"
        />
        <MetricCard
          title="Leave Requests"
          value={stats.pendingLeaves}
          icon={AlertTriangle}
          trend="Pending"
          trendUp={false}
          description="Requires review"
        />
      </div>

      {/* Recruitment & Separation Pipeline Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recruitment Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Open Positions</span>
                <span className="font-bold text-lg">{stats.openJobs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Applicants (Pending Review)</span>
                <span className="font-bold text-lg">{stats.pendingApplicants}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Offers Sent (Awaiting Response)</span>
                <span className="font-bold text-lg">{stats.pendingOffers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Separation Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Separations</span>
                <span className="font-bold text-lg">{stats.activeSeparations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Clearance/Settlement</span>
                <span className="font-bold text-lg">{stats.pendingSeparations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Resigned Employees</span>
                <span className="font-bold text-lg">{employees.filter(e => e.status === 'resigned').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-md border shadow-sm lg:col-span-2">
          <CardHeader className="border-b bg-muted/50 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-primary" />
              Attendance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height={240} minWidth={10} minHeight={10}>
                <AreaChart data={attendanceTrends}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: 'none',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#09090b" strokeWidth={2} fill="#09090b" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md border shadow-sm">
          <CardHeader className="border-b bg-muted/50 py-4">
            <CardTitle className="text-sm font-medium">Department Matrix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {deptDistribution.map((dept) => (
              <div key={dept.name} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>{dept.name}</span>
                  <span>{dept.value} units</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-700"
                    style={{ width: `${stats.total > 0 ? (dept.value / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {deptDistribution.length === 0 && (
              <p className="text-xs text-muted-foreground">No department distribution available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-md border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 py-4">
            <CardTitle className="text-sm font-medium">Upcoming Holidays</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <div className="divide-y">
            {upcomingHolidayList.map((h) => {
              const d = asDate(h.date);
              return (
                <div key={String(h.id)} className="flex items-center justify-between p-4 transition-colors hover:bg-accent hover:text-accent-foreground">
                  <span className="text-xs font-medium text-foreground">{h.name}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {d ? d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }) : 'N/A'}
                  </span>
                </div>
              );
            })}
            {upcomingHolidayList.length === 0 && (
              <div className="p-4 text-center text-xs italic text-muted-foreground">No upcoming holidays</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-md border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 py-4">
            <CardTitle className="text-sm font-medium">Pending Leave</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <div className="divide-y">
            {pendingLeaveList.map((l) => (
              <div
                key={String(l.id)}
                className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{l.employee?.name || 'Employee'}</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {typeof l.leave_type === 'string' ? l.leave_type : (l.leave_type as any)?.name || 'Leave'} . {l.days} days
                  </p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </div>
            ))}
            {pendingLeaveList.length === 0 && (
              <div className="p-8 text-center text-xs font-medium italic text-muted-foreground/60">Clear pipeline</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-md border shadow-sm">
          <CardHeader className="border-b bg-muted/50 py-4">
            <CardTitle className="text-sm font-medium">Workforce Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-4">
            <div className="w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height={200} minWidth={10} minHeight={10}>
                <PieChart>
                  <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {typeDistribution.map((entry, i) => (
                      <Cell key={`${entry.name}-${i}`} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid w-full grid-cols-2 gap-x-6 gap-y-2">
              {typeDistribution.map((t, i) => (
                <div key={`${t.name}-${i}`} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {t.name} ({t.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="On Duty"
          value={stats.onDuty}
          icon={Activity}
          trend="Today"
          trendUp={stats.onDuty > 0}
          description="Present employees"
        />
        <MetricCard
          title="Upcoming Holidays"
          value={stats.upcomingHolidays}
          icon={Calendar}
          trend="Queued"
          description="Near-term holidays"
        />
        <MetricCard
          title="Headcount Active"
          value={`${stats.active}/${stats.total}`}
          icon={Users}
          trend={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : '0%'}
          trendUp={stats.active >= Math.max(1, Math.round(stats.total * 0.8))}
          description="Workforce utilization"
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  description,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string | null;
  trendUp?: boolean;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        'rounded-md border shadow-sm',
        highlight && 'border-yellow-400 bg-yellow-50/30 dark:border-yellow-600 dark:bg-yellow-950/10'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-semibold',
            trendUp ? 'bg-emerald-50 text-emerald-600' : trendUp === false ? 'bg-rose-50 text-rose-600' : 'bg-muted text-muted-foreground'
          )}
        >
          {trend || '-'}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon
            className={cn('h-3.5 w-3.5', highlight ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground')}
          />
          <div className={cn('text-xl font-medium', highlight ? 'text-yellow-900 dark:text-yellow-100' : 'text-foreground')}>{value}</div>
        </div>
        <p className={cn('mt-1 text-xs font-medium', highlight ? 'text-yellow-700 dark:text-yellow-300' : 'text-muted-foreground')}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
