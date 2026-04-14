"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { getDisciplinaryActions, getEmployees, createDisciplinaryAction } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

interface DisciplinaryAction {
  id: string;
  employee?: { name: string; employee_id: string };
  employee_id?: string;
  incident_date: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  resolution_status: 'open' | 'in-progress' | 'resolved' | 'closed';
  action_taken?: string;
}

export default function DisciplinaryModule() {
  const { toast } = useToast();
  const [actions, setActions] = useState<DisciplinaryAction[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState<DisciplinaryAction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchActions = async () => {
    try {
      const data = await getDisciplinaryActions();
      setActions(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch disciplinary actions', variant: 'destructive' });
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchActions(), fetchEmployees()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'secondary',
      medium: 'outline',
      high: 'default',
      critical: 'destructive',
    };
    return <Badge variant={variants[severity] || 'secondary'}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'destructive',
      'in-progress': 'outline',
      resolved: 'default',
      closed: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Disciplinary Actions & Incidents</h2>
        <DisciplinaryActionDialog onSuccess={fetchActions} employees={employees} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disciplinary Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm mt-1">Disciplinary records will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Incident Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{action.employee?.name ?? <span className="text-muted">Unknown Employee</span>}</p>
                        <p className="text-sm text-muted-foreground">{action.employee?.employee_id ?? action.employee_id ?? '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(action.incident_date).toLocaleDateString()}</TableCell>
                    <TableCell>{action.type}</TableCell>
                    <TableCell>{action.title}</TableCell>
                    <TableCell>{getSeverityBadge(action.severity)}</TableCell>
                    <TableCell>{getStatusBadge(action.resolution_status)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedAction(action);
                        setDetailsOpen(true);
                      }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disciplinary Action Details</DialogTitle>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Employee</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="font-medium text-sm">{selectedAction.employee?.name ?? 'Unknown Employee'}</p>
                    <p className="text-xs text-muted-foreground">{selectedAction.employee?.employee_id ?? selectedAction.employee_id ?? '—'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Incident Date</Label>
                  <div className="p-3 bg-muted/50 rounded-md flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{new Date(selectedAction.incident_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">{selectedAction.type}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Severity</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    {getSeverityBadge(selectedAction.severity)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">{selectedAction.title}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedAction.description || 'No description provided'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Action Taken</Label>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedAction.action_taken || 'No action specified'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <div className="p-3 bg-muted/50 rounded-md">
                  {getStatusBadge(selectedAction.resolution_status)}
                </div>
              </div>

              <Button onClick={() => setDetailsOpen(false)} className="w-full">Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DisciplinaryActionDialog({ onSuccess, employees }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    incident_date: '',
    type: 'warning',
    severity: 'medium',
    title: '',
    description: '',
    action_taken: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createDisciplinaryAction(formData);
      if (created) {
        toast({ title: 'Success', description: 'Disciplinary action recorded' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to record action', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Record Incident</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Disciplinary Action</DialogTitle>
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
            <Label>Incident Date</Label>
            <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({...formData, incident_date: e.target.value})} required />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="written-warning">Written Warning</SelectItem>
                <SelectItem value="suspension">Suspension</SelectItem>
                <SelectItem value="termination">Termination</SelectItem>
                <SelectItem value="performance-issue">Performance Issue</SelectItem>
                <SelectItem value="misconduct">Misconduct</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={formData.severity} onValueChange={(v) => setFormData({...formData, severity: v})} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} />
          </div>
          <div>
            <Label>Action Taken</Label>
            <Textarea value={formData.action_taken} onChange={(e) => setFormData({...formData, action_taken: e.target.value})} rows={3} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Record Action</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
