'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Save, CheckCircle, XCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee } from '@/lib/db/types';
import { authHeaders } from '@/lib/api';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface OvertimeLog {
  id?: string;
  employee_id: string;
  date: string;
  hours_worked: number;
  standard_hours: number;
  overtime_hours: number;
  rate_multiplier: number;
  overtime_amount: number;
  notes: string;
  status: 'logged' | 'approved' | 'rejected' | 'paid';
}

interface OvertimeTrackingProps {
  employees: Employee[];
  onRefresh: () => void;
}

export function OvertimeTracking({ employees, onRefresh }: OvertimeTrackingProps) {
  const { baseCurrency } = useCompanySettings();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);
  const [overtimeLogs, setOvertimeLogs] = useState<OvertimeLog[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [formData, setFormData] = useState<Partial<OvertimeLog>>({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours_worked: 0,
    standard_hours: 8,
    overtime_hours: 0,
    rate_multiplier: 1.5,
    overtime_amount: 0,
    notes: '',
    status: 'logged'
  });

  useEffect(() => {
    fetchOvertimeLogs();
    fetchOvertimeSummary();
  }, [selectedMonth]);

  useEffect(() => {
    // Auto-calculate overtime fields when hours change
    if (formData.hours_worked && formData.standard_hours) {
      const overtimeHours = Math.max(0, formData.hours_worked - formData.standard_hours);
      setFormData(prev => ({ ...prev, overtime_hours: overtimeHours }));

      if (formData.employee_id && overtimeHours > 0) {
        const employee = employees.find(e => e.id === formData.employee_id);
        if (employee && employee.basic_salary) {
          const hourlyRate = employee.basic_salary / 208; // 26 days × 8 hours
          const overtimeAmount = hourlyRate * overtimeHours * (formData.rate_multiplier || 1.5);
          setFormData(prev => ({ ...prev, overtime_amount: Math.round(overtimeAmount * 100) / 100 }));
        }
      }
    }
  }, [formData.hours_worked, formData.standard_hours, formData.employee_id, formData.rate_multiplier, employees]);

  const fetchOvertimeLogs = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const res = await fetch(`/api/hrms/overtime?month=${month}&year=${year}`, {
        headers: await authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setOvertimeLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch overtime logs:', err);
    }
  };

  const fetchOvertimeSummary = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const res = await fetch(`/api/hrms/overtime/summary?month=${month}&year=${year}`, {
        headers: await authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch overtime summary:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/hrms/overtime', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Overtime entry saved successfully');
        setShowForm(false);
        setFormData({
          employee_id: '',
          date: new Date().toISOString().split('T')[0],
          hours_worked: 0,
          standard_hours: 8,
          overtime_hours: 0,
          rate_multiplier: 1.5,
          overtime_amount: 0,
          notes: '',
          status: 'logged'
        });
        fetchOvertimeLogs();
        fetchOvertimeSummary();
        onRefresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save overtime entry');
      }
    } catch (err) {
      toast.error('Failed to save overtime entry');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (logId: string) => {
    try {
      const res = await fetch(`/api/hrms/overtime/${logId}/status`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ status: 'approved' })
      });

      if (res.ok) {
        toast.success('Overtime approved');
        fetchOvertimeLogs();
        fetchOvertimeSummary();
      } else {
        toast.error('Failed to approve overtime');
      }
    } catch (err) {
      toast.error('Failed to approve overtime');
    }
  };

  const handleReject = async (logId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/hrms/overtime/${logId}/status`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
      });

      if (res.ok) {
        toast.success('Overtime rejected');
        fetchOvertimeLogs();
        fetchOvertimeSummary();
      } else {
        toast.error('Failed to reject overtime');
      }
    } catch (err) {
      toast.error('Failed to reject overtime');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      logged: { variant: 'secondary', label: 'Logged' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      paid: { variant: 'outline', label: 'Paid' }
    };

    const config = variants[status] || variants.logged;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overtime Tracking</h2>
          <p className="text-sm text-muted-foreground">Log and manage employee overtime hours</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                return <SelectItem key={value} value={value}>{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Overtime
          </Button>
        </div>
      </div>

      {/* Overtime Entry Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log Overtime Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                    required
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

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours_worked">Hours Worked *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.hours_worked}
                    onChange={(e) => setFormData({ ...formData, hours_worked: parseFloat(e.target.value) || 0 })}
                    placeholder="9.5"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standard_hours">Standard Shift Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.standard_hours}
                    onChange={(e) => setFormData({ ...formData, standard_hours: parseFloat(e.target.value) || 8 })}
                    placeholder="8"
                  />
                </div>

                <div className="space-y-2">
<Label htmlFor="overtime_hours">Overtime Hours (auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.overtime_hours}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_multiplier">Rate Multiplier</Label>
                  <Select
                    value={formData.rate_multiplier?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, rate_multiplier: parseFloat(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.5">1.5x (Normal Days)</SelectItem>
                      <SelectItem value="2.0">2.0x (Holidays)</SelectItem>
                      <SelectItem value="2.5">2.5x (Sundays)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime_amount">Overtime Amount (auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.overtime_amount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes/Reason</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Working on urgent project..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Overtime Entry'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Overtime Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Overtime Summary — {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overtime entries for this month</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Total OT Hrs</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {item.employee_name} ({item.employee_id})
                      </TableCell>
                      <TableCell className="text-right">{item.total_overtime_hours.toFixed(1)} hrs</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_overtime_amount, baseCurrency)}</TableCell>
                      <TableCell className="text-right">{item.entries}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-2">
                <Button variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export to Payroll
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overtime Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overtime Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {overtimeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overtime logs found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Hours Worked</TableHead>
                  <TableHead className="text-right">OT Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overtimeLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {log.employee?.name || 'N/A'} ({log.employee?.employee_id})
                    </TableCell>
                    <TableCell className="text-right">{log.hours_worked} hrs</TableCell>
                    <TableCell className="text-right">{log.overtime_hours} hrs</TableCell>
                    <TableCell className="text-right">{log.rate_multiplier}x</TableCell>
                    <TableCell className="text-right">{formatCurrency(log.overtime_amount, baseCurrency)}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      {log.status === 'logged' && (
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleApprove(log.id)}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleReject(log.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
