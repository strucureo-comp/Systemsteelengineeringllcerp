'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Plus, Save, CheckCircle, XCircle, FileDown, Calendar, User, Timer } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee } from '@/lib/db/types';
import { authHeaders } from '@/lib/api';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';

interface TimesheetEntry {
  id?: string;
  employee_id: string;
  date: string;
  shift_id?: string;
  clock_in?: string;
  clock_out?: string;
  break_duration: number;
  regular_hours: number;
  overtime_hours: number;
  total_hours_worked: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'adjusted';
  is_manual_entry: boolean;
  task_description?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  employee?: {
    name: string;
    employee_id: string;
  };
}

interface TimesheetTrackingProps {
  employees: Employee[];
  onRefresh: () => void;
}

export function TimesheetTracking({ employees, onRefresh }: TimesheetTrackingProps) {
  const { baseCurrency } = useCompanySettings();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  const [formData, setFormData] = useState<Partial<TimesheetEntry>>({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: '',
    break_duration: 0,
    task_description: '',
    notes: '',
    status: 'draft'
  });

  const fetchTimesheets = useCallback(async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const res = await fetch(`/api/hrms/timesheets?month=${month}&year=${year}`, {
        headers: await authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTimesheets(data);
      }
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
    }
  }, [selectedMonth]);

  const fetchSummary = useCallback(async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const res = await fetch(`/api/hrms/timesheets/summary?month=${month}&year=${year}`, {
        headers: await authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch timesheet summary:', err);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchTimesheets();
    fetchSummary();
  }, [fetchTimesheets, fetchSummary]);

  // Auto-calculate hours when clock_in/clock_out change
  useEffect(() => {
    if (formData.clock_in && formData.clock_out) {
      const inTime = new Date(`2000-01-01T${formData.clock_in}`);
      const outTime = new Date(`2000-01-01T${formData.clock_out}`);
      let totalMinutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);

      // Subtract break duration
      if (formData.break_duration) {
        totalMinutes -= formData.break_duration;
      }

      const totalHours = Math.max(0, totalMinutes / 60);
      const standardHours = 8;

      setFormData(prev => ({
        ...prev,
        total_hours_worked: Math.round(totalHours * 100) / 100,
        regular_hours: Math.min(totalHours, standardHours),
        overtime_hours: Math.max(0, totalHours - standardHours)
      }));
    }
  }, [formData.clock_in, formData.clock_out, formData.break_duration]);

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.date) {
      toast.error('Please select an employee and date');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/hrms/timesheets', {
        method: 'POST',
        headers: {
          ...await authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Timesheet entry created');
        setShowForm(false);
        resetForm();
        fetchTimesheets();
        fetchSummary();
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create timesheet');
      }
    } catch (err) {
      toast.error('Failed to create timesheet entry');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, reason?: string) => {
    try {
      const res = await fetch(`/api/hrms/timesheets/${id}/status`, {
        method: 'PATCH',
        headers: {
          ...await authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, rejection_reason: reason })
      });

      if (res.ok) {
        toast.success(`Timesheet ${status}`);
        fetchTimesheets();
        fetchSummary();
        onRefresh();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      clock_in: '',
      clock_out: '',
      break_duration: 0,
      task_description: '',
      notes: '',
      status: 'draft'
    });
    setEditingEntry(null);
  };

  const openEditForm = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      date: entry.date.split('T')[0],
      clock_in: entry.clock_in ? entry.clock_in.split('T')[1]?.substring(0, 5) : '',
      clock_out: entry.clock_out ? entry.clock_out.split('T')[1]?.substring(0, 5) : '',
      break_duration: entry.break_duration || 0,
      task_description: entry.task_description || '',
      notes: entry.notes || '',
      status: entry.status
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingEntry?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/timesheets/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          ...await authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Timesheet entry updated');
        setShowForm(false);
        resetForm();
        fetchTimesheets();
        fetchSummary();
        onRefresh();
      } else {
        toast.error('Failed to update timesheet');
      }
    } catch (err) {
      toast.error('Failed to update timesheet entry');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    adjusted: 'bg-yellow-100 text-yellow-700'
  };

  const totalHours = timesheets.reduce((sum, t) => sum + (t.total_hours_worked || 0), 0);
  const approvedCount = timesheets.filter(t => t.status === 'approved').length;
  const pendingCount = timesheets.filter(t => t.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return <SelectItem key={value} value={value}>{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-xl font-bold">{totalHours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xl font-bold">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-xl font-bold">{summary.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Summary Table */}
      {summary.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Employee Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs text-right">Regular Hours</TableHead>
                  <TableHead className="text-xs text-right">Overtime Hours</TableHead>
                  <TableHead className="text-xs text-right">Total Hours</TableHead>
                  <TableHead className="text-xs text-center">Entries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s: any) => (
                  <TableRow key={s.employee_id}>
                    <TableCell className="text-xs font-medium">
                      {s.employee_name} ({s.employee_code})
                    </TableCell>
                    <TableCell className="text-xs text-right">{s.total_regular_hours?.toFixed(1) || 0}</TableCell>
                    <TableCell className="text-xs text-right">{s.total_overtime_hours?.toFixed(1) || 0}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{s.total_hours_worked?.toFixed(1) || 0}</TableCell>
                    <TableCell className="text-xs text-center">{s.entries_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Timesheet Entries Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Timesheet Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {timesheets.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No timesheet entries for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Clock In</TableHead>
                  <TableHead className="text-xs">Clock Out</TableHead>
                  <TableHead className="text-xs">Break</TableHead>
                  <TableHead className="text-xs text-right">Regular</TableHead>
                  <TableHead className="text-xs text-right">Overtime</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {entry.employee?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {entry.clock_in ? entry.clock_in.split('T')[1]?.substring(0, 5) : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {entry.clock_out ? entry.clock_out.split('T')[1]?.substring(0, 5) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{entry.break_duration || 0} min</TableCell>
                    <TableCell className="text-xs text-right">{entry.regular_hours?.toFixed(1) || 0}</TableCell>
                    <TableCell className="text-xs text-right">{entry.overtime_hours?.toFixed(1) || 0}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{entry.total_hours_worked?.toFixed(1) || 0}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[entry.status] || 'bg-gray-100'}`}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {entry.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => openEditForm(entry)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={async () => {
                                const res = await fetch(`/api/hrms/timesheets/${entry.id}/submit`, {
                                  method: 'POST',
                                  headers: await authHeaders()
                                });
                                if (res.ok) {
                                  toast.success('Timesheet submitted');
                                  fetchTimesheets();
                                  fetchSummary();
                                }
                              }}
                            >
                              Submit
                            </Button>
                          </>
                        )}
                        {entry.status === 'submitted' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 text-green-600"
                              onClick={() => handleUpdateStatus(entry.id!, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 text-red-600"
                              onClick={() => {
                                const reason = prompt('Rejection reason:');
                                if (reason) handleUpdateStatus(entry.id!, 'rejected', reason);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Timesheet Entry' : 'New Timesheet Entry'}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingEntry ? 'Update the timesheet entry details.' : 'Record hours worked for an employee.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!editingEntry && (
              <div className="space-y-2">
                <Label className="text-xs">Employee</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Clock In</Label>
                <Input
                  type="time"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Clock Out</Label>
                <Input
                  type="time"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Break Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.break_duration}
                onChange={(e) => setFormData({ ...formData, break_duration: Number(e.target.value) })}
                className="h-9 text-xs"
                min={0}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Regular</p>
                <p className="text-sm font-bold">{formData.regular_hours?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Overtime</p>
                <p className="text-sm font-bold">{formData.overtime_hours?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{formData.total_hours_worked?.toFixed(1) || '0.0'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Task Description</Label>
              <Input
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                placeholder="What did you work on?"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            {editingEntry ? (
              <Button size="sm" onClick={handleUpdate} disabled={loading}>
                <Save className="h-4 w-4 mr-1" /> Update
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={loading}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
