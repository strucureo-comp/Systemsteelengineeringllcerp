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
import { Plus, UserMinus, DollarSign, FileText, CheckCircle } from 'lucide-react';
import {
  getSeparations,
  getFinalSettlements,
  getEmployees,
  createSeparation,
  createFinalSettlement,
  approveFinalSettlement,
  updateSeparationStatus,
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
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface Separation {
  id: string;
  employee?: { name: string; employee_id: string; status?: string };
  employee_id?: string | { name: string; employee_id: string; status?: string };
  separation_type: 'resignation' | 'termination' | 'retirement' | 'contract-end' | 'absconding';
  last_working_date: string;
  notice_period_days: number;
  status: 'initiated' | 'in-progress' | 'completed' | 'cancelled';
  clearance_status: 'pending' | 'in-progress' | 'completed';
  final_settlement_status: 'pending' | 'calculated' | 'approved' | 'paid';
}

interface FinalSettlement {
  id: string;
  employee?: { name: string; employee_id: string; status?: string };
  employee_id?: string | { name: string; employee_id: string; status?: string };
  calculation_date: string;
  unpaid_salary: number;
  leave_encashment: number;
  end_of_service_benefit: number;
  total_payable: number;
  total_deductions: number;
  net_settlement_amount: number;
  payment_status: 'pending' | 'approved' | 'paid';
}

export default function SeparationModule() {
  const { toast } = useToast();
  const { baseCurrency } = useCompanySettings();
  const [activeTab, setActiveTab] = useState('separations');
  const [separations, setSeparations] = useState<Separation[]>([]);
  const [settlements, setSettlements] = useState<FinalSettlement[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeparations = async () => {
    try {
      const data = await getSeparations();
      setSeparations(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch separations', variant: 'destructive' });
    }
  };

  const fetchSettlements = async () => {
    try {
      const data = await getFinalSettlements();
      setSettlements(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch final settlements', variant: 'destructive' });
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
      await Promise.all([
        fetchSeparations(),
        fetchSettlements(),
        fetchEmployees()
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      initiated: 'secondary',
      'in-progress': 'outline',
      completed: 'default',
      cancelled: 'destructive',
      pending: 'secondary',
      calculated: 'outline',
      approved: 'default',
      paid: 'default',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getEmployeeStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, icon?: string }> = {
      active: { variant: 'default', label: 'Active', icon: '✓' },
      resigned: { variant: 'outline', label: 'Resigned', icon: '↗️' },
      terminated: { variant: 'destructive', label: 'Terminated', icon: '✗' },
      on_leave: { variant: 'secondary', label: 'On Leave', icon: '⏸' },
      separated: { variant: 'outline', label: 'Separated', icon: '—' },
      inactive: { variant: 'outline', label: 'Inactive', icon: '—' },
    };
    const config = configs[status] || { variant: 'secondary', label: status };
    return (
      <Badge variant={config.variant}>
        {config.icon && <span className="mr-1">{config.icon}</span>}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employee Separation & Final Settlement</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="separations">
            <UserMinus className="w-4 h-4 mr-2" />
            Separations
          </TabsTrigger>
          <TabsTrigger value="settlements">
            <DollarSign className="w-4 h-4 mr-2" />
            Final Settlements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="separations" className="space-y-4">
          <div className="flex justify-end">
            <SeparationDialog onSuccess={fetchSeparations} employees={employees} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Separations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : separations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-lg font-medium">No separations found</p>
                  <p className="text-sm mt-1">Employee separations will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last Working Date</TableHead>
                      <TableHead>Notice Period</TableHead>
                      <TableHead>Clearance</TableHead>
                      <TableHead>Settlement</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {separations.map((sep) => {
                      const emp = sep.employee as { name?: string; employee_id?: string; status?: string } | undefined;
                      const empId = typeof sep.employee_id === 'object' ? sep.employee_id as { name?: string; employee_id?: string; status?: string } : undefined;
                      return (
                      <TableRow key={sep.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{(emp as any)?.name ?? (empId as any)?.name ?? <span className="text-muted">Unknown Employee</span>}</p>
                            <p className="text-sm text-muted-foreground">{(emp as any)?.employee_id ?? (empId as any)?.employee_id ?? ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(emp as any)?.status ? getEmployeeStatusBadge((emp as any).status) : (empId as any)?.status ? getEmployeeStatusBadge((empId as any).status) : <Badge variant="outline">Unknown</Badge>}
                        </TableCell>
                        <TableCell>{sep.separation_type}</TableCell>
                        <TableCell>{new Date(sep.last_working_date).toLocaleDateString()}</TableCell>
                        <TableCell>{sep.notice_period_days} days</TableCell>
                        <TableCell>{sep.status === 'cancelled' ? getStatusBadge('cancelled') : getStatusBadge(sep.clearance_status)}</TableCell>
                        <TableCell>{sep.status === 'cancelled' ? getStatusBadge('cancelled') : getStatusBadge(sep.final_settlement_status)}</TableCell>
                        <TableCell>
                          <Select
                            value={sep.status}
                            onValueChange={async (newStatus) => {
                              const result = await updateSeparationStatus(sep.id, newStatus);
                              if (result) {
                                toast({
                                  title: 'Success',
                                  description: `Separation status updated. Employee status synced to: ${result.employeeStatus}`
                                });
                                fetchSeparations();
                              } else {
                                toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="initiated">🟡 Initiated</SelectItem>
                              <SelectItem value="in-progress">🔵 In Progress</SelectItem>
                              <SelectItem value="completed">✅ Completed</SelectItem>
                              <SelectItem value="cancelled">⚫ Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {sep.status === 'in-progress' && sep.final_settlement_status === 'pending' && (
                            <Button size="sm" onClick={() => {
                              // Navigate to create final settlement
                              toast({ title: 'Info', description: 'Create final settlement for this employee' });
                            }}>
                              Calculate Settlement
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4">
          <div className="flex justify-end">
            <SettlementDialog onSuccess={fetchSettlements} employees={employees} separations={separations} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Final Settlement Calculations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : settlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-lg font-medium">No records found</p>
                  <p className="text-sm mt-1">Records will appear here once added</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee Status</TableHead>
                      <TableHead>Calculation Date</TableHead>
                      <TableHead>Payables</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((settlement) => {
                      const sEmp = settlement.employee_id as any;
                      return (
                      <TableRow key={settlement.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sEmp?.name || '—'}</p>
                            <p className="text-sm text-muted-foreground">{sEmp?.employee_id || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sEmp?.status ? getEmployeeStatusBadge(sEmp.status) : <Badge variant="outline">Unknown</Badge>}
                        </TableCell>
                        <TableCell>{new Date(settlement.calculation_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(settlement.total_payable, baseCurrency)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(settlement.total_deductions, baseCurrency)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(settlement.net_settlement_amount, baseCurrency)}</TableCell>
                        <TableCell>{getStatusBadge(settlement.payment_status)}</TableCell>
                        <TableCell>
                          {settlement.payment_status === 'pending' && (
                            <Button size="sm" onClick={async () => {
                              try {
                                const approved = await approveFinalSettlement(settlement.id);
                                if (approved) {
                                  toast({ title: 'Success', description: 'Settlement approved' });
                                  fetchSettlements();
                                }
                              } catch (err) {
                                toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
                              }
                            }}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                    })}
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

function SeparationDialog({ onSuccess, employees }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    separation_type: 'resignation',
    reason: '',
    resignation_date: '',
    last_working_date: '',
    notice_period_days: 30
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createSeparation(formData);
      if (created) {
        toast({ title: 'Success', description: 'Separation initiated successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to initiate separation', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Initiate Separation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Initiate Employee Separation</DialogTitle>
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
                  <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>
                    {emp.name} ({emp.employee_id}) — {emp.department || 'No Dept'} — {emp.status || 'Active'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Separation Type</Label>
            <Select value={formData.separation_type} onValueChange={(v) => setFormData({...formData, separation_type: v})} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resignation">Resignation</SelectItem>
                <SelectItem value="termination">Termination</SelectItem>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="contract-end">Contract End</SelectItem>
                <SelectItem value="absconding">Absconding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Resignation Date</Label>
              <Input type="date" value={formData.resignation_date} onChange={(e) => setFormData({...formData, resignation_date: e.target.value})} />
            </div>
            <div>
              <Label>Last Working Date</Label>
              <Input type="date" value={formData.last_working_date} onChange={(e) => setFormData({...formData, last_working_date: e.target.value})} required />
            </div>
          </div>
          <div>
            <Label>Notice Period (days)</Label>
            <Input type="number" value={formData.notice_period_days} onChange={(e) => setFormData({...formData, notice_period_days: parseInt(e.target.value)})} required />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Initiate Separation</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettlementDialog({ onSuccess, employees, separations }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    separation_id: '',
    unpaid_salary: 0,
    leave_encashment: 0,
    end_of_service_benefit: 0,
    bonus_or_incentive: 0,
    loans_outstanding: 0,
    advance_salary: 0,
    other_deductions: 0,
    notes: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createFinalSettlement(formData);
      if (created) {
        toast({ title: 'Success', description: 'Final settlement calculated' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to calculate settlement', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Calculate Settlement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calculate Final Settlement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Separation</Label>
            <Select value={formData.separation_id} onValueChange={(v) => {
              const sep = separations.find((s: any) => s.id === v);
              setFormData({
                ...formData,
                separation_id: v,
                employee_id: sep?.employee_id?.id || sep?.employee_id?._id || ''
              });
            }} required>
              <SelectTrigger>
                <SelectValue placeholder="Select separation" />
              </SelectTrigger>
              <SelectContent>
                {separations.filter((s: any) => s.final_settlement_status === 'pending').map((sep: any) => (
                  <SelectItem key={sep.id} value={sep.id}>
                    {sep.employee?.name ?? sep.employee_id?.name ?? <span className="text-muted">Unknown Employee</span>} - {sep.separation_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-green-700">Payables (AED)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unpaid Salary</Label>
                <Input type="number" value={formData.unpaid_salary} onChange={(e) => setFormData({...formData, unpaid_salary: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Leave Encashment</Label>
                <Input type="number" value={formData.leave_encashment} onChange={(e) => setFormData({...formData, leave_encashment: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>End of Service Benefit</Label>
                <Input type="number" value={formData.end_of_service_benefit} onChange={(e) => setFormData({...formData, end_of_service_benefit: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Bonus/Incentive</Label>
                <Input type="number" value={formData.bonus_or_incentive} onChange={(e) => setFormData({...formData, bonus_or_incentive: parseFloat(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-red-700">Deductions (AED)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loans Outstanding</Label>
                <Input type="number" value={formData.loans_outstanding} onChange={(e) => setFormData({...formData, loans_outstanding: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Advance Salary</Label>
                <Input type="number" value={formData.advance_salary} onChange={(e) => setFormData({...formData, advance_salary: parseFloat(e.target.value)})} />
              </div>
              <div className="col-span-2">
                <Label>Other Deductions</Label>
                <Input type="number" value={formData.other_deductions} onChange={(e) => setFormData({...formData, other_deductions: parseFloat(e.target.value)})} />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Calculate Settlement</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
