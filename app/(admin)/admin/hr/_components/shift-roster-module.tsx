"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, Calendar, Users } from 'lucide-react';
import {
  getShifts,
  getRosters,
  getEmployees,
  createShift,
  createRoster,
  updateRoster,
} from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

interface Shift {
  id: string;
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  working_hours: number;
  is_night_shift: boolean;
  is_active: boolean;
}

interface Roster {
  id: string;
  employee_id: { name: string; employee_id: string };
  shift_id: { shift_name: string; start_time: string; end_time: string };
  date: string;
  site_name?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
}

export default function ShiftRosterModule() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('shifts');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = async () => {
    try {
      const data = await getShifts();
      setShifts(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch shifts', variant: 'destructive' });
    }
  };

  const fetchRosters = async () => {
    try {
      const data = await getRosters();
      setRosters(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch rosters', variant: 'destructive' });
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees((data || []).filter((e: any) => e.status === 'active'));
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchShifts(),
        fetchRosters(),
        fetchEmployees()
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shift & Roster Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shifts">
            <Clock className="w-4 h-4 mr-2" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="rosters">
            <Calendar className="w-4 h-4 mr-2" />
            Rosters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          <div className="flex justify-end">
            <ShiftDialog onSuccess={fetchShifts} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shift Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : shifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-lg font-medium">No shifts scheduled</p>
                  <p className="text-sm mt-1">Shift rosters will appear here once created</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Working Hours</TableHead>
                      <TableHead>Night Shift</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.shift_name}</TableCell>
                        <TableCell>{shift.shift_code}</TableCell>
                        <TableCell>{shift.start_time}</TableCell>
                        <TableCell>{shift.end_time}</TableCell>
                        <TableCell>{shift.working_hours}h</TableCell>
                        <TableCell>
                          {shift.is_night_shift ? (
                            <Badge variant="secondary">Night</Badge>
                          ) : (
                            <Badge variant="outline">Day</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                            {shift.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rosters" className="space-y-4">
          <div className="flex justify-end gap-2">
            <RosterDialog onSuccess={fetchRosters} employees={employees} shifts={shifts} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Rosters</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : rosters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-lg font-medium">No shifts scheduled</p>
                  <p className="text-sm mt-1">Shift rosters will appear here once created</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosters.map((roster) => (
                      <TableRow key={roster.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{roster.employee_id?.name}</p>
                            <p className="text-sm text-muted-foreground">{roster.employee_id?.employee_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(roster.date).toLocaleDateString()}</TableCell>
                        <TableCell>{roster.shift_id?.shift_name}</TableCell>
                        <TableCell>
                          {roster.shift_id?.start_time} - {roster.shift_id?.end_time}
                        </TableCell>
                        <TableCell>{roster.site_name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(roster.status)}</TableCell>
                        <TableCell>
                          {roster.status === 'scheduled' && (
                            <Button size="sm" onClick={async () => {
                              try {
                                const updated = await updateRoster(roster.id, { status: 'confirmed' });
                                if (updated) {
                                  toast({ title: 'Success', description: 'Roster confirmed' });
                                  fetchRosters();
                                }
                              } catch (err) {
                                toast({ title: 'Error', description: 'Failed to confirm', variant: 'destructive' });
                              }
                            }}>
                              Confirm
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShiftDialog({ onSuccess }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shift_name: '',
    shift_code: '',
    start_time: '',
    end_time: '',
    working_hours: 8,
    is_night_shift: false,
    description: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createShift(formData);
      if (created) {
        toast({ title: 'Success', description: 'Shift created successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create shift', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Shift</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Shift Name</Label>
            <Input value={formData.shift_name} onChange={(e) => setFormData({...formData, shift_name: e.target.value})} required />
          </div>
          <div>
            <Label>Shift Code</Label>
            <Input value={formData.shift_code} onChange={(e) => setFormData({...formData, shift_code: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} required />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} required />
            </div>
          </div>
          <div>
            <Label>Working Hours</Label>
            <Input type="number" value={formData.working_hours} onChange={(e) => setFormData({...formData, working_hours: parseFloat(e.target.value)})} required />
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.is_night_shift} onChange={(e) => setFormData({...formData, is_night_shift: e.target.checked})} />
            <Label>Night Shift</Label>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Create Shift</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RosterDialog({ onSuccess, employees, shifts }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    shift_id: '',
    date: '',
    site_name: '',
    project_id: '',
    notes: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createRoster(formData);
      if (created) {
        toast({ title: 'Success', description: 'Roster created successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create roster', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Assign Roster</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Employee to Roster</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={formData.employee_id} onValueChange={(v) => setFormData({...formData, employee_id: v})} required>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>{emp.name} ({emp.employee_id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={formData.shift_id} onValueChange={(v) => setFormData({...formData, shift_id: v})} required>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.filter((s: any) => s.is_active).map((shift: any) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.shift_name} ({shift.start_time} - {shift.end_time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
          </div>
          <div>
            <Label>Site Name (Optional)</Label>
            <Input value={formData.site_name} onChange={(e) => setFormData({...formData, site_name: e.target.value})} placeholder="e.g., Construction Site A" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Assign Roster</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
