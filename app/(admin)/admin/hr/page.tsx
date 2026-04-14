'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Users,
  Calendar,
  DollarSign,
  Zap,
  FileText,
  Settings2,
  LayoutDashboard,
  Fingerprint,
  Activity,
  RefreshCcw as LucideRefresh
} from 'lucide-react';
import {
  getEmployees,
  getAttendance,
  getPayrolls,
  getDepartments,
  getHRRoles,
  getLeaves,
  getLeaveTypes,
  getHolidays,
  getSalaryStructures,
  getHREvents,
  getJobOpenings,
  getApplicants,
  getOfferLetters,
  getSeparations,
  getEmployeeDocuments
} from '@/lib/api';
import { HRDashboard } from './_components/hr-dashboard';
import { EmployeeDirectory } from './_components/employee-directory';
import { AttendanceLeave } from './_components/attendance-leave';
import { AttendanceTracking } from './_components/attendance-tracking';
import { OvertimeTracking } from './_components/overtime-tracking';
import { TimesheetTracking } from './_components/timesheet-tracking';
import { PayrollContent, PayslipBrowser } from './_components/payroll-content';
import { HREvents } from './_components/hr-events';
import { HRMSSettings } from './_components/hrms-settings';
import RecruitmentModule from './_components/recruitment-module';
import DisciplinaryModule from './_components/disciplinary-module';
import DocumentTrackingModule from './_components/document-tracking';
import ShiftRosterModule from './_components/shift-roster-module';
import SeparationModule from './_components/separation-module';
import type { Employee, Attendance, Payroll, Leave, LeaveType, Holiday, SalaryStructure, HREvent, HRDepartment, HRRole } from '@/lib/db/types';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/lib/tenant-context';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type HRMode = 'dashboard' | 'staff' | 'operations' | 'workflows' | 'finance' | 'payslips' | 'setup';

function normalizeLeavesForDisplay(leaves: Leave[]): Leave[] {
  const hasValidRange = (leave: Leave) => {
    const from = new Date(leave.from_date).getTime();
    const to = new Date(leave.to_date).getTime();
    if (Number.isNaN(from) || Number.isNaN(to)) return false;
    return to >= from && (leave.days ?? 0) > 0;
  };

  const withValidRange = leaves.filter(hasValidRange);

  // Remove exact duplicates and keep latest by created_at/id for deterministic rendering.
  const exactDedup = new Map<string, Leave>();
  for (const leave of withValidRange) {
    const typeId = typeof leave.leave_type === 'string'
      ? leave.leave_type
      : String((leave.leave_type as any)?.id || (leave.leave_type as any)?._id || (leave.leave_type as any)?.name || '');
    const key = [leave.employee?.id || leave.employee_id, typeId, leave.from_date, leave.to_date, leave.status].join('|');
    const existing = exactDedup.get(key);
    const existingCreated = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
    const currentCreated = leave.created_at ? new Date(leave.created_at).getTime() : 0;
    if (!existing || currentCreated >= existingCreated) {
      exactDedup.set(key, leave);
    }
  }

  // Resolve overlapping approved leaves for the same employee/type by keeping the latest authoritative record.
  const approved = Array.from(exactDedup.values()).filter((leave) => leave.status === 'approved');
  const nonApproved = Array.from(exactDedup.values()).filter((leave) => leave.status !== 'approved');
  const removedApprovedIds = new Set<string>();

  for (let i = 0; i < approved.length; i += 1) {
    for (let j = i + 1; j < approved.length; j += 1) {
      const a = approved[i];
      const b = approved[j];
      const aEmp = String(a.employee?.id || a.employee_id || '');
      const bEmp = String(b.employee?.id || b.employee_id || '');
      if (!aEmp || aEmp !== bEmp) continue;

      const aType = typeof a.leave_type === 'string' ? a.leave_type : String((a.leave_type as any)?.id || (a.leave_type as any)?._id || '');
      const bType = typeof b.leave_type === 'string' ? b.leave_type : String((b.leave_type as any)?.id || (b.leave_type as any)?._id || '');
      if (aType !== bType) continue;

      const aFrom = new Date(a.from_date).getTime();
      const aTo = new Date(a.to_date).getTime();
      const bFrom = new Date(b.from_date).getTime();
      const bTo = new Date(b.to_date).getTime();
      const overlaps = aFrom <= bTo && bFrom <= aTo;
      if (!overlaps) continue;

      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      const removeId = aCreated <= bCreated ? a.id : b.id;
      removedApprovedIds.add(removeId);
    }
  }

  const approvedClean = approved.filter((leave) => !removedApprovedIds.has(leave.id));
  return [...nonApproved, ...approvedClean];
}

export default function HRPage() {
  const { getModuleLabel } = useTenant();
  const [activeMode, setActiveMode] = useState<HRMode>('dashboard');
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [departments, setDepartments] = useState<HRDepartment[]>([]);
  const [roles, setRoles] = useState<HRRole[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [hrEvents, setHrEvents] = useState<HREvent[]>([]);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>('none');
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [offerLetters, setOfferLetters] = useState<any[]>([]);
  const [separations, setSeparations] = useState<any[]>([]);
  const [documentCountByEmployee, setDocumentCountByEmployee] = useState<Record<string, number>>({});

  const fetchAll = useCallback(async () => {
    try {
      const [emps, att, pays, depts, rls, lvs, lvTypes, hols, sals, evts, jobs, apps, offers, seps, docs] = await Promise.all([
        getEmployees().catch(() => []),
        getAttendance().catch(() => []),
        getPayrolls().catch(() => []),
        getDepartments().catch(() => []),
        getHRRoles().catch(() => []),
        getLeaves().catch(() => []),
        getLeaveTypes().catch(() => []),
        getHolidays().catch(() => []),
        getSalaryStructures().catch(() => []),
        getHREvents().catch(() => []),
        getJobOpenings().catch(() => []),
        getApplicants().catch(() => []),
        getOfferLetters().catch(() => []),
        getSeparations().catch(() => []),
        getEmployeeDocuments().catch(() => []),
      ]);

      setEmployees((emps as Employee[]) || []);
      setAttendance(att || []);
      setPayrolls((pays as Payroll[]) || []);

      const postedBatch = ((pays as Payroll[]) || []).find(p => p.status === 'posted');
      if (postedBatch) setSelectedPayrollId(postedBatch.id);

      setDepartments(depts || []);
      setRoles(rls || []);
      setLeaves(normalizeLeavesForDisplay((lvs as Leave[]) || []));
      setLeaveTypes(lvTypes || []);
      setHolidays(hols || []);
      setSalaryStructures(sals || []);
      setHrEvents(evts || []);
      setJobOpenings(jobs || []);
      setApplicants(apps || []);
      setOfferLetters(offers || []);
      setSeparations(seps || []);

      const docCounts: Record<string, number> = {};
      (docs || []).forEach((doc: any) => {
        const employeeRef = doc.employee_id;
        const employeeId = typeof employeeRef === 'string'
          ? employeeRef
          : String(employeeRef?.id || employeeRef?._id || '');
        if (!employeeId) return;
        docCounts[employeeId] = (docCounts[employeeId] || 0) + 1;
      });
      setDocumentCountByEmployee(docCounts);
    } catch (err) {
      console.error('[HR Hub Data Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <ModuleGuard module="hr">
        <div className="space-y-6 max-w-4xl animate-pulse">
            <div>
                <div className="h-8 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-64 bg-muted rounded" />
            </div>
            <div className="h-[400px] bg-muted rounded-xl w-full" />
        </div>
      </ModuleGuard>
    );
  }

  const activePayroll = payrolls.find(p => p.id === selectedPayrollId);

  return (
    <ModuleGuard module="hr">
      <div className="space-y-6 max-w-4xl">
        {/* Header Area */}
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{getModuleLabel('hr')}</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage personnel, payroll, attendance, and recruitment registry.</p>
        </div>

        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as HRMode)} className="w-full">
          <TabsList className="h-10 p-1 bg-muted/50 rounded-lg gap-1 border border-border inline-flex mb-6">
            <TabsTrigger value="dashboard" className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Summary</TabsTrigger>
            <TabsTrigger value="staff" className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Registry</TabsTrigger>
            <TabsTrigger value="operations" className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Ops</TabsTrigger>
            <TabsTrigger value="finance" className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Payroll</TabsTrigger>
            <TabsTrigger value="setup" className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Setup</TabsTrigger>
          </TabsList>

          <div className="animate-in fade-in duration-500">
            <TabsContent value="dashboard" className="m-0 focus-visible:outline-none">
              <HRDashboard 
                employees={employees} 
                attendance={attendance} 
                payrolls={payrolls} 
                leaves={leaves} 
                holidays={holidays}
                jobOpenings={jobOpenings}
                applicants={applicants}
                offerLetters={offerLetters}
                separations={separations}
              />
            </TabsContent>
            <TabsContent value="staff" className="m-0 focus-visible:outline-none space-y-6">
              <EmployeeDirectory
                employees={employees}
                departments={departments}
                roles={roles}
                documentCountByEmployee={documentCountByEmployee}
                onRefresh={fetchAll}
              />
              <HREvents employees={employees} events={hrEvents} onRefresh={fetchAll} />
            </TabsContent>
            <TabsContent value="operations" className="m-0 focus-visible:outline-none">
              <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="bg-muted/50 border h-10 p-0.5 mb-6">
                  <TabsTrigger value="attendance" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Attendance Tracking
                  </TabsTrigger>
                  <TabsTrigger value="timesheet" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Timesheet Entry
                  </TabsTrigger>
                  <TabsTrigger value="leaves" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Leave Management
                  </TabsTrigger>
                  <TabsTrigger value="overtime" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Overtime Tracking
                  </TabsTrigger>
                  <TabsTrigger value="timesheet" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Timesheet Entry
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="attendance" className="m-0">
                  <AttendanceTracking employees={employees} attendance={attendance} leaves={leaves} holidays={holidays} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="leaves" className="m-0">
                  <AttendanceLeave employees={employees} leaves={leaves} leaveTypes={leaveTypes} holidays={holidays} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="overtime" className="m-0">
                  <OvertimeTracking employees={employees} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="timesheet" className="m-0">
                  <TimesheetTracking employees={employees} onRefresh={fetchAll} />
                </TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="workflows" className="m-0 focus-visible:outline-none">
              <Tabs defaultValue="recruitment" className="w-full">
                <TabsList className="bg-muted/50 border h-10 p-0.5 mb-6 overflow-x-auto">
                  <TabsTrigger value="recruitment" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Recruitment
                  </TabsTrigger>
                  <TabsTrigger value="disciplinary" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Disciplinary
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="rosters" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Shift & Roster
                  </TabsTrigger>
                  <TabsTrigger value="separation" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Separation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recruitment" className="m-0">
                  <RecruitmentModule />
                </TabsContent>
                <TabsContent value="disciplinary" className="m-0">
                  <DisciplinaryModule />
                </TabsContent>
                <TabsContent value="documents" className="m-0">
                  <DocumentTrackingModule />
                </TabsContent>
                <TabsContent value="rosters" className="m-0">
                  <ShiftRosterModule />
                </TabsContent>
                <TabsContent value="separation" className="m-0">
                  <SeparationModule />
                </TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="finance" className="m-0 focus-visible:outline-none">
              <PayrollContent employees={employees} salaryStructures={salaryStructures} payrolls={payrolls} onRefresh={fetchAll} />
            </TabsContent>
            <TabsContent value="payslips" className="m-0 focus-visible:outline-none space-y-6">
              <Card className="border shadow-none bg-muted/40 border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Disbursement Archive</p>
                      <p className="text-sm text-muted-foreground">Select a payroll cycle to view its corresponding payslips.</p>
                    </div>
                  </div>
                  <Select value={selectedPayrollId} onValueChange={setSelectedPayrollId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {payrolls.filter(p => p.status === 'finalized' || p.status === 'processed' || p.status === 'posted' || p.status === 'approved').length === 0 ? (
                        <SelectItem value="none" disabled>No Cycles Available</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="none" disabled>Select a Cycle</SelectItem>
                          {payrolls.filter(p => p.status === 'finalized' || p.status === 'processed' || p.status === 'posted' || p.status === 'approved').map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.month} Cycle ({p.status})</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              {activePayroll ? <PayslipBrowser payroll={activePayroll} /> : (
                <div className="py-20 text-center border-2 border-dashed rounded-md border-border bg-muted/20">
                  <p className="text-sm font-medium text-muted-foreground">
                    {payrolls.filter(p => p.status === 'finalized' || p.status === 'processed' || p.status === 'posted' || p.status === 'approved').length === 0
                      ? 'No payroll cycles available. Go to Payroll tab to run your first cycle.'
                      : 'Select a cycle above to view payslips'}
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="setup" className="m-0 focus-visible:outline-none">
              <HRMSSettings 
                roles={roles} 
                departments={departments} 
                leaveTypes={leaveTypes}
                onRefresh={fetchAll} 
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ModuleGuard>
  );
}
