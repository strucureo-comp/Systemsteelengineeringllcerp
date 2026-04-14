'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Upload, Download, CheckCircle2, XCircle, Clock, Plane, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { markAttendance, bulkUploadAttendance } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Employee, Attendance, Leave, Holiday } from '@/lib/db/types';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { useEffect } from 'react';

interface AttendanceTrackingProps {
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  holidays?: Holiday[];
  onRefresh: () => void;
}

export function AttendanceTracking({ employees, attendance, leaves, holidays = [], onRefresh }: AttendanceTrackingProps) {
  const { baseCurrency } = useCompanySettings();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('present');
  const [checkIn, setCheckIn] = useState<string>('09:00');
  const [checkOut, setCheckOut] = useState<string>('17:00');
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const getEntityId = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const obj = value as { id?: string; _id?: string };
      return obj.id || obj._id;
    }
    return undefined;
  };

  const getAttendanceEmployeeId = (record: Attendance): string | undefined => {
    return getEntityId(record.employee_id) || getEntityId(record.employee);
  };

  const getLeaveEmployeeId = (leave: Leave): string | undefined => {
    return getEntityId(leave.employee_id) || getEntityId(leave.employee);
  };

  const toLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toRecordDateKey = (value: unknown): string => {
    if (!value) return '';

    if (typeof value === 'string') {
      // Most backend date payloads are ISO strings; keep their calendar date segment as-is.
      const isoDatePart = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) return isoDatePart;
    }

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return toLocalDateKey(date);
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isConfiguredHoliday = (date: Date) => {
    if (!Array.isArray(holidays) || holidays.length === 0) return false;
    const target = toLocalDateKey(date);
    return holidays.some((holiday) => {
      const holidayDate = toRecordDateKey(holiday.date);
      return holidayDate === target;
    });
  };

  // Get days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Active employees only
  const activeEmployees = useMemo(() => 
    employees.filter(e => e.status === 'active').sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );

  // Get approved leaves for auto-marking
  const approvedLeaves = useMemo(() => 
    leaves.filter(l => l.status === 'approved'),
    [leaves]
  );

  // Calculate attendance percentage for each employee
  const getAttendanceStats = (employeeId: string) => {
    const today = new Date();
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
    const isFutureMonth =
      selectedYear > today.getFullYear() ||
      (selectedYear === today.getFullYear() && selectedMonth > today.getMonth());

    const maxDay = isFutureMonth ? 0 : isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    let attendedEquivalent = 0;
    let workingDays = 0;

    for (let day = 1; day <= maxDay; day += 1) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dayKey = toLocalDateKey(date);

      // Skip non-working days from percentage denominator.
      if (isWeekend(date) || isConfiguredHoliday(date) || isOnLeave(employeeId, date)) {
        continue;
      }

      workingDays += 1;

      const record = attendance.find((a) => {
        if (getAttendanceEmployeeId(a) !== employeeId) return false;
        return toRecordDateKey(a.date) === dayKey;
      });

      if (!record) continue;

      if (record.status === 'present') {
        attendedEquivalent += 1;
      } else if (record.status === 'half-day') {
        attendedEquivalent += 0.5;
      }
    }

    const percentage = workingDays > 0 ? Math.round((attendedEquivalent / workingDays) * 100) : 0;
    const attendedDisplay = Number.isInteger(attendedEquivalent)
      ? String(attendedEquivalent)
      : attendedEquivalent.toFixed(1);

    return {
      present: attendedDisplay,
      total: workingDays,
      percentage,
    };
  };

  // Check if employee is on leave for a specific date
  const isOnLeave = (employeeId: string, date: Date) => {
    const dayKey = toLocalDateKey(date);
    return approvedLeaves.some(leave => {
      const fromDateKey = toRecordDateKey(leave.from_date);
      const toDateKey = toRecordDateKey(leave.to_date);
      return (
        getLeaveEmployeeId(leave) === employeeId &&
        !!fromDateKey &&
        !!toDateKey &&
        dayKey >= fromDateKey &&
        dayKey <= toDateKey
      );
    });
  };

  // Get attendance status for a specific employee and date
  const getAttendanceStatus = (employeeId: string, day: number) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const dateStr = toLocalDateKey(date);
    
    // Check if on approved leave
    if (isOnLeave(employeeId, date)) {
      return { status: 'L', color: 'bg-blue-100 text-blue-700', icon: Plane };
    }

    // Check attendance record
    const record = attendance.find(a => 
      getAttendanceEmployeeId(a) === employeeId && 
      toRecordDateKey(a.date) === dateStr
    );

    if (!record) {
      if (isWeekend(date) || isConfiguredHoliday(date)) {
        return { status: 'X', color: 'bg-purple-100 text-purple-700', icon: Calendar };
      }
      return { status: '—', color: 'bg-gray-100 text-gray-400', icon: null };
    }

    switch (record.status) {
      case 'present':
        return { status: 'P', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
      case 'absent':
        return { status: 'A', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'half-day':
        return { status: 'H', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'holiday':
        return { status: 'X', color: 'bg-purple-100 text-purple-700', icon: Calendar };
      case 'leave':
        return { status: 'L', color: 'bg-blue-100 text-blue-700', icon: Plane };
      default:
        return { status: '—', color: 'bg-gray-100 text-gray-400', icon: null };
    }
  };

  // Mark attendance for a single employee
  const handleMarkAttendance = async () => {
    if (!selectedEmployee || !selectedDate) {
      toast.error('Please select employee and date');
      return;
    }

    try {
      await markAttendance({
        employee_id: selectedEmployee,
        date: selectedDate,
        status: selectedStatus,
        check_in: checkIn,
        check_out: checkOut
      });
      toast.success('Attendance marked successfully');
      setMarkDialogOpen(false);
      onRefresh();
    } catch {
      toast.error('Failed to mark attendance');
    }
  };

  // Handle CSV file upload
  const handleFileUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row
      const records = lines.slice(1).map(line => {
        const [employee_id, date, status, check_in, check_out] = line.split(',').map(s => s.trim());
        return { employee_id, date, status, check_in, check_out };
      }).filter(r => r.employee_id && r.date);

      if (records.length === 0) {
        toast.error('No valid records found in CSV');
        return;
      }

      const result = await bulkUploadAttendance(records);
      
      if (result?.success) {
        toast.success(`Uploaded ${result.total} records successfully`);
        setUploadDialogOpen(false);
        setCsvFile(null);
        onRefresh();
      } else {
        toast.error('Failed to upload attendance records');
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      toast.error('Error processing CSV file');
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = 'employee_id,date,status,check_in,check_out\n';
    const sample = activeEmployees.slice(0, 2).map(emp => 
      `${emp.id},2026-03-07,present,09:00,17:00`
    ).join('\n');
    
    const csvContent = headers + sample;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="border shadow-sm rounded-md">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="h-9 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {new Date(2024, i).toLocaleDateString('en-AE', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="h-9 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Mark Attendance</DialogTitle>
                    <DialogDescription>Record attendance for an employee</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Employee</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeEmployees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                      <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="half-day">Half Day</SelectItem>
                          <SelectItem value="leave">Leave</SelectItem>
                          <SelectItem value="holiday">Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Check In</Label>
                        <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Check Out</Label>
                        <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                      </div>
                    </div>

                    <Button onClick={handleMarkAttendance} className="w-full bg-primary h-10 font-medium text-xs">
                      Mark Attendance
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90">
                    <Upload className="h-3.5 w-3.5" /> Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Attendance</DialogTitle>
                    <DialogDescription>Upload attendance records via CSV file</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                        CSV Format: employee_id, date, status, check_in, check_out
                      </p>
                      <Button size="sm" variant="ghost" onClick={downloadTemplate} className="h-7 gap-2 text-blue-700">
                        <Download className="h-3.5 w-3.5" /> Download Template
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Select CSV File</Label>
                      <Input 
                        type="file" 
                        accept=".csv" 
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="h-10"
                      />
                      {csvFile && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {csvFile.name}
                        </p>
                      )}
                    </div>

                    <Button onClick={handleFileUpload} className="w-full bg-primary h-10 font-medium text-xs" disabled={!csvFile}>
                      <Upload className="h-3.5 w-3.5 mr-2" /> Upload Records
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border shadow-sm rounded-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">P</div>
              <span className="text-muted-foreground font-medium">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-red-100 text-red-700 flex items-center justify-center font-semibold">A</div>
              <span className="text-muted-foreground font-medium">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-yellow-100 text-yellow-700 flex items-center justify-center font-semibold">H</div>
              <span className="text-muted-foreground font-medium">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">L</div>
              <span className="text-muted-foreground font-medium">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-semibold">X</div>
              <span className="text-muted-foreground font-medium">Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      <Card className="border shadow-sm rounded-md overflow-hidden">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            Attendance Grid - {new Date(selectedYear, selectedMonth).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b sticky top-0">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground border-r sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                    Employee
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className={cn(
                      'text-center p-2 font-semibold text-muted-foreground min-w-[40px]',
                      isWeekend(new Date(selectedYear, selectedMonth, day)) && 'bg-purple-50/70'
                    )}>
                      {day}
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold text-foreground border-l min-w-[100px]">
                    Attendance %
                  </th>
                </tr>
                <tr>
                  <th className="text-left px-3 pb-2 text-[11px] font-medium text-muted-foreground border-r sticky left-0 bg-muted/50 z-10">
                    Weekday
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const date = new Date(selectedYear, selectedMonth, day);
                    return (
                      <th
                        key={`weekday-${day}`}
                        className={cn(
                          'text-center pb-2 text-[11px] font-medium text-muted-foreground',
                          isWeekend(date) && 'bg-purple-50/70 text-purple-700'
                        )}
                      >
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </th>
                    );
                  })}
                  <th className="border-l" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeEmployees.map(employee => {
                  const stats = getAttendanceStats(employee.id);
                  const attendanceBadgeClass =
                    stats.percentage >= 90
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : stats.percentage >= 75
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-red-500 text-white hover:bg-red-600';
                  return (
                    <tr key={employee.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground border-r sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xs">
                            {employee.name.charAt(0)}
                          </div>
                          <span className="truncate">{employee.name}</span>
                        </div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const date = new Date(selectedYear, selectedMonth, day);
                        const { status, color } = getAttendanceStatus(employee.id, day);
                        return (
                          <td key={day} className={cn('text-center p-1', isWeekend(date) && 'bg-purple-50/40')}>
                            <div className={cn('h-7 w-7 mx-auto rounded flex items-center justify-center font-semibold text-xs', color)}>
                              {status}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-center p-3 border-l">
                        <div className="flex items-center justify-center gap-2">
                          <Badge className={cn('font-semibold text-xs', attendanceBadgeClass)}>
                            {stats.percentage}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({stats.present}/{stats.total})
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {activeEmployees.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium italic">No active employees found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
