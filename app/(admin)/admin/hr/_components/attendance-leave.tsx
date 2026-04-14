'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock, CheckCircle, XCircle, CalendarDays, TreePalm, ChevronRight, MessageSquare, User, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { applyLeave, updateLeaveStatus, createHoliday, bulkAssignLeaveType, updateLeave } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Employee, Leave, LeaveType, Holiday } from '@/lib/db/types';

interface AttendanceLeaveProps {
  employees: Employee[];
  leaves: Leave[];
  leaveTypes: LeaveType[];
  holidays: Holiday[];
  onRefresh: () => void;
}

export function AttendanceLeave({ employees, leaves, leaveTypes, holidays, onRefresh }: AttendanceLeaveProps) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [bulkTypeId, setBulkTypeId] = useState('');
  const [assignTypeOpen, setAssignTypeOpen] = useState(false);
  const [assigningLeave, setAssigningLeave] = useState<Leave | null>(null);
  const [singleTypeId, setSingleTypeId] = useState('');

  const missingTypeLeaves = leaves.filter((leave) => !leave.leave_type || (typeof leave.leave_type === 'string' && !leave.leave_type.trim()));

  const leaveTypeLabel = (leave: Leave) => {
    if (!leave.leave_type || (typeof leave.leave_type === 'string' && !leave.leave_type.trim())) {
      return 'Type Missing';
    }
    return typeof leave.leave_type === 'string' ? leave.leave_type : (leave.leave_type as any)?.name || 'Type Missing';
  };

  const handleAssignType = async () => {
    if (!singleTypeId || !assigningLeave) {
      toast.error('Please select a leave type');
      return;
    }
    try {
      const { updateLeave } = await import('@/lib/api');
      await updateLeave(assigningLeave.id, { leave_type_id: singleTypeId });
      toast.success('Leave type assigned successfully');
      setAssignTypeOpen(false);
      setAssigningLeave(null);
      setSingleTypeId('');
      onRefresh();
    } catch (error) {
      toast.error('Failed to assign leave type');
    }
  };

  const openAssignType = (leave: Leave) => {
    setAssigningLeave(leave);
    setAssignTypeOpen(true);
  };

  const handleApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!leaveTypes.length) {
      toast.error('Please configure leave types first in HR Configuration');
      return;
    }

    const fd = new FormData(e.currentTarget);
    const fromDate = new Date(fd.get('from_date') as string);
    const toDate = new Date(fd.get('to_date') as string);
    
    // Validate date range
    if (toDate < fromDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    try {
      await applyLeave({
        employee_id: fd.get('employee_id') as string,
        leave_type: fd.get('leave_type') as string,
        from_date: fd.get('from_date') as string,
        to_date: fd.get('to_date') as string,
        days: days,
        reason: fd.get('reason') as string,
      });
      toast.success('Leave application submitted successfully');
      setLeaveOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply leave');
    }
  };

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateLeaveStatus(id, status);
      toast.success(`Leave request ${status}`);
      onRefresh();
    } catch { toast.error('Failed to update leave status'); }
  };

  const handleCreateHoliday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createHoliday({
        name: fd.get('name') as string,
        date: fd.get('date') as string,
        type: fd.get('type') as string
      });
      toast.success('Holiday added to calendar');
      setHolidayOpen(false);
      onRefresh();
    } catch { toast.error('Failed to add holiday'); }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="leaves" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 border h-10 p-0.5">
            <TabsTrigger value="leaves" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Leave Pipeline
            </TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Company Calendar
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-2">
                  <Plus className="h-3.5 w-3.5" /> Apply Leave
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Application</DialogTitle>
                  <DialogDescription>Submit a formal request for time off.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleApplyLeave} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Employee</Label>
                    <select name="employee_id" required className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                      <option value="">Select Employee</option>
                      {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Leave Type</Label>
                    <select name="leave_type" required className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                    </select>
                    {leaveTypes.length === 0 && (
                      <p className="text-xs text-amber-700">
                        No leave types configured. Ask your admin to set up leave types in Configuration → Leave Types.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                      <Input name="from_date" type="date" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                      <Input name="to_date" type="date" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
                    <Input name="reason" placeholder="Medical, Annual, etc." />
                  </div>
                  <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs" disabled={leaveTypes.length === 0}>Submit Request</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90">
                  <CalendarDays className="h-3.5 w-3.5" /> Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Configure Holiday</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateHoliday} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                    <Input name="name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                    <Input name="date" type="date" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                    <select name="type" required className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                      <option value="company">Company Holiday</option>
                      <option value="national">National Holiday</option>
                      <option value="regional">Regional Holiday</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">Save Holiday</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="leaves" className="mt-0 space-y-6">
          {missingTypeLeaves.length > 0 && (
            <Card className="border border-red-200 bg-red-50/30 rounded-md">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-red-700">Missing Leave Type on Existing Records</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 space-y-3">
                <p className="text-xs text-red-700">{missingTypeLeaves.length} leave record(s) have no leave type. Assign a type retroactively in bulk.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={bulkTypeId}
                    onChange={(e) => setBulkTypeId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                  </select>
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={async () => {
                      if (!bulkTypeId) {
                        toast.error('Select a leave type first');
                        return;
                      }
                      const ids = missingTypeLeaves.map((leave) => leave.id);
                      const result = await bulkAssignLeaveType(ids, bulkTypeId);
                      if (result) {
                        toast.success(`Updated ${result.updated || ids.length} leave records`);
                        setBulkTypeId('');
                        onRefresh();
                      } else {
                        toast.error('Failed to bulk-assign leave type');
                      }
                    }}
                  >
                    Assign Type To Missing Records
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Single Leave Type Assign Dialog */}
          <Dialog open={assignTypeOpen} onOpenChange={setAssignTypeOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Leave Type</DialogTitle>
                <DialogDescription>
                  Select a leave type to assign to this record.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {assigningLeave && (
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Employee:</strong> {assigningLeave.employee?.name}</p>
                    <p><strong>Dates:</strong> {new Date(assigningLeave.from_date).toLocaleDateString()} - {new Date(assigningLeave.to_date).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <select
                    value={singleTypeId}
                    onChange={(e) => setSingleTypeId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                  </select>
                </div>
                <Button onClick={handleAssignType} className="w-full">
                  Assign Type
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Pending Approval Section */}
          <Card className="border shadow-sm rounded-md overflow-hidden">
            <CardHeader className="border-b bg-muted/50 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Badge variant="secondary">{ leaves.filter(l => l.status === 'pending').length}</Badge>
            </CardHeader>
            <div className="divide-y">
              {leaves.filter(l => l.status === 'pending').length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <p className="text-xs font-medium italic">All caught up. No pending requests.</p>
                </div>
              ) : (
                leaves.filter(l => l.status === 'pending').map(leave => (
                  <div key={leave.id} onClick={() => setSelectedLeave(leave)} className="flex items-center justify-between p-4 hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs">
                        {leave.employee?.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{leave.employee?.name}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {leaveTypeLabel(leave) === 'Type Missing' ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <Badge variant="destructive" className="text-[10px]">Type Missing</Badge>
                            </span>
                          ) : leaveTypeLabel(leave)} · {new Date(leave.from_date).toLocaleDateString()} to {new Date(leave.to_date).toLocaleDateString()} ({leave.days}d)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {leaveTypeLabel(leave) === 'Type Missing' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-full"
                          onClick={(e) => { e.stopPropagation(); openAssignType(leave); }}
                          title="Assign Leave Type"
                        >
                          <span className="text-xs font-bold">+</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                        onClick={(e) => { e.stopPropagation(); handleLeaveAction(leave.id, 'approved'); }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                        onClick={() => handleLeaveAction(leave.id, 'rejected')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-zinc-900 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Approved Section */}
          {leaves.filter(l => l.status === 'approved').length > 0 && (
            <Card className="border shadow-sm rounded-md overflow-hidden">
              <CardHeader className="border-b bg-muted/50 flex flex-row items-center justify-between py-4">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <Badge variant="outline" className="border-emerald-100 text-emerald-700 bg-emerald-50">{leaves.filter(l => l.status === 'approved').length}</Badge>
              </CardHeader>
              <div className="divide-y">
                {leaves.filter(l => l.status === 'approved').map(leave => (
                  <div key={leave.id} onClick={() => setSelectedLeave(leave)} className="flex items-center justify-between p-4 hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs">
                        {leave.employee?.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{leave.employee?.name}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {leaveTypeLabel(leave) === 'Type Missing' ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <Badge variant="destructive" className="text-[10px]">Type Missing</Badge>
                            </span>
                          ) : leaveTypeLabel(leave)} · {new Date(leave.from_date).toLocaleDateString()} to {new Date(leave.to_date).toLocaleDateString()} ({leave.days}d)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-zinc-900 transition-colors ml-4" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Rejected Section */}
          {leaves.filter(l => l.status === 'rejected').length > 0 && (
            <Card className="border shadow-sm rounded-md overflow-hidden">
              <CardHeader className="border-b bg-muted/50 flex flex-row items-center justify-between py-4">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <Badge variant="outline" className="border-red-100 text-red-700 bg-red-50">{leaves.filter(l => l.status === 'rejected').length}</Badge>
              </CardHeader>
              <div className="divide-y">
                {leaves.filter(l => l.status === 'rejected').map(leave => (
                  <div key={leave.id} onClick={() => setSelectedLeave(leave)} className="flex items-center justify-between p-4 hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs">
                        {leave.employee?.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{leave.employee?.name}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {leaveTypeLabel(leave) === 'Type Missing' ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <Badge variant="destructive" className="text-[10px]">Type Missing</Badge>
                            </span>
                          ) : leaveTypeLabel(leave)} · {new Date(leave.from_date).toLocaleDateString()} to {new Date(leave.to_date).toLocaleDateString()} ({leave.days}d)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-zinc-900 transition-colors ml-4" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="holidays" className="mt-0 space-y-6">
          <CalendarView holidays={holidays} />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Holiday Directory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {holidays.map(h => (
                <Card key={h.id} className="border shadow-sm rounded-md overflow-hidden bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex flex-col items-center justify-center leading-none">
                        <span className="text-xs font-semibold opacity-60">
                          {new Date(h.date).toLocaleDateString('en-AE', { month: 'short' })}
                        </span>
                        <span className="text-lg font-medium">
                          {new Date(h.date).getDate()}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs font-semibold bg-muted text-muted-foreground border-none px-2 py-0.5">
                        {h.type}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium text-foreground">{h.name}</h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(h.date).toLocaleDateString('en-AE', { weekday: 'long' })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <SheetContent className="sm:max-w-md p-0">
          {selectedLeave && (
            <div className="flex flex-col h-full bg-card">
              <SheetHeader className="p-6 bg-primary/10 text-primary border-b">
                <SheetTitle className="text-foreground">Leave Request Details</SheetTitle>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Employee</Label>
                    <p className="text-sm font-medium text-foreground">{selectedLeave.employee?.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">From Date</Label>
                      <p className="text-sm font-medium text-foreground">{new Date(selectedLeave.from_date).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">To Date</Label>
                      <p className="text-sm font-medium text-foreground">{new Date(selectedLeave.to_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Leave Type</Label>
                      <p className="text-sm font-medium text-foreground">{leaveTypeLabel(selectedLeave)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Duration</Label>
                      <p className="text-sm font-medium text-foreground">{selectedLeave.days} days</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Reason</Label>
                    <p className="text-sm font-medium text-foreground">{selectedLeave.reason || '—'}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                    <Badge className={cn('w-fit text-xs font-semibold',
                      selectedLeave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedLeave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {selectedLeave.status?.charAt(0).toUpperCase() + selectedLeave.status?.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedLeave.status === 'pending' && (
                <div className="border-t p-6 flex gap-3">
                  <Button 
                    className="flex-1 bg-primary h-10 font-medium text-xs"
                    onClick={() => {
                      handleLeaveAction(selectedLeave.id, 'approved');
                      setSelectedLeave(null);
                    }}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 h-10 font-medium text-xs"
                    onClick={() => {
                      handleLeaveAction(selectedLeave.id, 'rejected');
                      setSelectedLeave(null);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CalendarView({ holidays }: { holidays: Holiday[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const getHolidaysForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.filter(h => h.date.toString().startsWith(dateStr));
  };
  
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('en-AE', { month: 'long', year: 'numeric' });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  
  return (
    <Card className="border shadow-sm rounded-md overflow-hidden">
      <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Company Calendar {monthName}</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            ← Prev
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            Next →
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map(i => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map(day => {
            const dayHolidays = getHolidaysForDate(day);
            const isHoliday = dayHolidays.length > 0;
            
            return (
              <div 
                key={day} 
                className={cn(
                  "aspect-square p-2 rounded-md border flex flex-col justify-start text-xs cursor-pointer transition-colors",
                  isHoliday 
                    ? "bg-red-50 border-red-200 hover:bg-red-100" 
                    : "bg-card border-border hover:bg-muted"
                )}
                title={dayHolidays.map(h => h.name).join(', ')}
              >
                <span className={cn(
                  "font-semibold",
                  isHoliday ? "text-red-700" : "text-foreground"
                )}>
                  {day}
                </span>
                {dayHolidays.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayHolidays.slice(0, 2).map((h, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-[10px] px-1 py-0 bg-red-100 text-red-700 border-none"
                      >
                        {h.name.split(' ')[0]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}