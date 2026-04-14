'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Receipt, 
  Download,
  Users,
  ChevronRight,
  Search,
  Briefcase,
  FileText,
  Printer,
  Mail,
  ShieldCheck,
  Info,
  AlertCircle,
  Eye,
  Calculator,
  ThumbsUp,
  Clock,
  CheckCircle2,
  Landmark,
  FileCheck,
  Coins,
  Bitcoin
} from 'lucide-react';
import { toast } from 'sonner';
import { createSalaryStructure, generatePayroll, postPayrollToFinance, previewPayroll, submitPayrollForApproval, approvePayroll, rejectPayroll, finalizePayroll, auditFebruaryPayroll2026, getDeletedPayrolls, restorePayroll } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings-context';
import type { Employee, SalaryStructure, Payroll } from '@/lib/db/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PayrollContentProps {
  employees: Employee[];
  salaryStructures: SalaryStructure[];
  payrolls: Payroll[];
  onRefresh: () => void;
  isLoading?: boolean;
}

export function PayrollContent({ employees, salaryStructures, payrolls, onRefresh, isLoading }: PayrollContentProps) {
  const { settings } = useSettings();
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPayroll, setRejectingPayroll] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<SalaryStructure | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMonth, setDuplicateMonth] = useState('');
  const [febAudit, setFebAudit] = useState<any>(null);
  const [deletedPayrolls, setDeletedPayrolls] = useState<any[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [payrollPreview, setPayrollPreview] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Calculate preview fields for Define Structure modal
  const [salaryFields, setSalaryFields] = useState({
    basic: 0,
    hra: 0,
    ta: 0,
    other_allowances: 0,
    deductions: 0
  });
  
  const calculatedGross = salaryFields.basic + salaryFields.hra + salaryFields.ta + salaryFields.other_allowances;
  const calculatedNet = calculatedGross - salaryFields.deductions;
  
  const handleCreateSalary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createSalaryStructure({
        employee_id: fd.get('employee_id') as string,
        effective_from: fd.get('effective_from') as string,
        basic: parseFloat(fd.get('basic') as string) || 0,
        hra: parseFloat(fd.get('hra') as string) || 0,
        da: 0,
        ta: parseFloat(fd.get('ta') as string) || 0,
        special_allowance: parseFloat(fd.get('other_allowances') as string) || 0,
        pf_employee: parseFloat(fd.get('pf_employee') as string) || 0,
        pf_employer: parseFloat(fd.get('pf_employer') as string) || 0,
        esi_employee: parseFloat(fd.get('esi_employee') as string) || 0,
        esi_employer: parseFloat(fd.get('esi_employer') as string) || 0,
        professional_tax: parseFloat(fd.get('professional_tax') as string) || 0,
        tds: parseFloat(fd.get('tds') as string) || 0,
      });
      toast.success('Salary structure defined successfully');
      setSalaryOpen(false);
      setSalaryFields({ basic: 0, hra: 0, ta: 0, other_allowances: 0, deductions: 0 });
      onRefresh();
    } catch (err) { 
      toast.error('Failed to create salary structure'); 
    }
  };
  
  const handleMonthSelect = useCallback(async (month: string) => {
    setSelectedMonth(month);
    setIsLoadingPreview(true);
    try {
      const preview = await previewPayroll(month);
      setPayrollPreview(preview);
      
      if (preview.exists) {
        setDuplicateMonth(month);
        setShowDuplicateWarning(true);
      }
    } catch (error: any) {
      if (error.canGenerate === false) {
        toast.error(error.error || 'No active employees with salary structures');
        setPayrollPreview(null);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedMonth) return;
    try {
      await generatePayroll(selectedMonth);
      toast.success('Payroll cycle created in draft status');
      setGenerateOpen(false);
      setPayrollPreview(null);
      setSelectedMonth('');
      onRefresh();
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CYCLE') {
        setDuplicateMonth(selectedMonth);
        setShowDuplicateWarning(true);
      } else {
        toast.error(error.error || 'Failed to generate payroll');
      }
    }
  };

  useEffect(() => {
    auditFebruaryPayroll2026().then((data) => setFebAudit(data)).catch(() => setFebAudit(null));
    getDeletedPayrolls().then((data) => setDeletedPayrolls(data || [])).catch(() => setDeletedPayrolls([]));
  }, [payrolls.length]);

  const handlePost = async (payrollId: string) => {
    setPosting(payrollId);
    try {
      const result = await postPayrollToFinance(payrollId);
      toast.success(result.message);
      onRefresh();
    } catch { toast.error('Failed to post to finance'); }
    finally { setPosting(null); }
  };

  const handleSubmitForApproval = async (payrollId: string) => {
    setApproving(payrollId);
    try {
      await submitPayrollForApproval(payrollId);
      toast.success('Payroll submitted for MD/CEO approval');
      onRefresh();
    } catch (err) {
      toast.error('Failed to submit payroll for approval');
    }
    finally { setApproving(null); }
  };

  const handleApprove = async (payrollId: string) => {
    setApproving(payrollId);
    try {
      await approvePayroll(payrollId);
      toast.success('Payroll approved successfully');
      onRefresh();
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') {
        toast.error(err.error || 'Only MD or CEO can approve payroll');
      } else {
        toast.error('Failed to approve payroll');
      }
    }
    finally { setApproving(null); }
  };

  const handleReject = async () => {
    if (!rejectingPayroll || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setApproving(rejectingPayroll);
    try {
      await rejectPayroll(rejectingPayroll, rejectReason);
      toast.success('Payroll rejected');
      setRejectDialogOpen(false);
      setRejectReason('');
      setRejectingPayroll(null);
      onRefresh();
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') {
        toast.error(err.error || 'Only MD or CEO can reject payroll');
      } else {
        toast.error('Failed to reject payroll');
      }
    }
    finally { setApproving(null); }
  };

  const handleFinalize = async (payrollId: string) => {
    setApproving(payrollId);
    try {
      await finalizePayroll(payrollId);
      toast.success('Payroll processed and payslips generated');
      onRefresh();
    } catch (err) {
      toast.error('Failed to finalize payroll');
    }
    finally { setApproving(null); }
  };
  
  const filteredStructures = salaryStructures.filter(s => 
    s.is_current && 
    s.employee?.name?.toLowerCase().includes(filterText.toLowerCase())
  );
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved': return 'bg-purple-100 text-purple-700 border-purple-200';  
      case 'processed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'posted': return 'bg-green-100 text-green-700 border-green-200';
      case 'paid': return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-foreground">Payroll Hub</h2>
          <p className="text-xs text-muted-foreground font-medium">Salary Disbursement & Compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Plus className="h-3.5 w-3.5" /> Define Structure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure Salary Policy</DialogTitle>
                <DialogDescription>Define comprehensive salary structure with all components</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSalary} className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Staff Member</Label>
                  <select name="employee_id" required className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                    <option value="">Select Employee...</option>
                    {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Effective From</Label>
                    <Input name="effective_from" type="date" required />
                  </div>
                </div>
                
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Earnings Components
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Basic Salary ({settings.currency})</Label>
                      <Input 
                        name="basic" 
                        type="number" 
                        step="0.01"
                        required 
                        placeholder="0.00"
                        onChange={(e) => setSalaryFields(f => ({ ...f, basic: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Housing Allowance ({settings.currency})</Label>
                      <Input 
                        name="hra" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        defaultValue="0"
                        onChange={(e) => setSalaryFields(f => ({ ...f, hra: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Transport Allowance ({settings.currency})</Label>
                      <Input 
                        name="ta" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        defaultValue="0"
                        onChange={(e) => setSalaryFields(f => ({ ...f, ta: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Other Allowances ({settings.currency})</Label>
                      <Input 
                        name="other_allowances" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        defaultValue="0"
                        onChange={(e) => setSalaryFields(f => ({ ...f, other_allowances: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 border rounded-lg p-4 bg-red-50/30 dark:bg-red-950/10">
                  <h4 className="text-sm font-semibold text-foreground">Deductions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">PF Employee ({settings.currency})</Label>
                      <Input name="pf_employee" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">PF Employer ({settings.currency})</Label>
                      <Input name="pf_employer" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">ESI Employee ({settings.currency})</Label>
                      <Input 
                        name="esi_employee" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        defaultValue="0"
                        onChange={(e) => setSalaryFields(f => ({ ...f, deductions: f.deductions + (parseFloat(e.target.value) || 0) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">ESI Employer ({settings.currency})</Label>
                      <Input name="esi_employer" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Professional Tax ({settings.currency})</Label>
                      <Input name="professional_tax" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">TDS ({settings.currency})</Label>
                      <Input name="tds" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Gross Salary:</span>
                    <span className="font-semibold text-foreground">{settings.currency} {calculatedGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Total Deductions:</span>
                    <span className="font-semibold text-red-600">- {settings.currency} {salaryFields.deductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-primary/20 pt-2 flex justify-between">
                    <span className="text-foreground font-semibold">Net Pay:</span>
                    <span className="text-lg font-bold text-primary">{settings.currency} {calculatedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Save Salary Structure</Button>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={generateOpen} onOpenChange={(open) => {
            setGenerateOpen(open);
            if (!open) {
              setPayrollPreview(null);
              setSelectedMonth('');
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90 font-medium text-xs">
                <Receipt className="h-3.5 w-3.5" /> Create Draft Cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Payroll Draft</DialogTitle>
                <DialogDescription>Create draft payroll cycle for approval workflow</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Target Month</Label>
                  <Input 
                    type="month" 
                    required 
                    value={selectedMonth}
                    onChange={(e) => handleMonthSelect(e.target.value)}
                  />
                </div>
                
                {isLoadingPreview && (
                  <div className="border rounded-lg p-6 bg-muted/30 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-xs text-muted-foreground">Loading preview...</p>
                  </div>
                )}
                
                {payrollPreview && !isLoadingPreview && (
                  <div className="border rounded-lg p-6 bg-muted/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Info className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Batch Preview</h4>
                        <p className="text-xs text-muted-foreground">Review before generating</p>
                      </div>
                    </div>
                    
                    {payrollPreview.exists && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Cycle Already Exists</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">A payroll for this month has already been generated.</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Employees</p>
                        <p className="text-2xl font-bold text-foreground">{payrollPreview.employeeCount}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-xs font-medium text-muted-foreground">Batch Value</p>
                        <p className="text-2xl font-bold text-primary">{settings.currency} {Number(payrollPreview.total_net || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="bg-card border rounded-md p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Salary</span>
                        <span className="font-medium">{settings.currency} {Number(payrollPreview.total_gross || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deductions</span>
                        <span className="font-medium text-red-600">- {settings.currency} {Number(payrollPreview.total_deductions || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Net Payable</span>
                        <span className="font-semibold text-primary">{settings.currency} {Number(payrollPreview.total_net || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {!payrollPreview && !isLoadingPreview && selectedMonth && (
                  <div className="border rounded-lg p-6 bg-red-50 dark:bg-red-950/10 text-center">
                    <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Cannot Generate Batch</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">No active employees with salary structures found.</p>
                  </div>
                )}
                
                <DialogFooter>
                  {payrollPreview && payrollPreview.canGenerate && (
                    <Button 
                      onClick={() => handleGenerate()} 
                      className="w-full bg-primary hover:bg-primary/90 h-10 font-medium"
                    >
                      Create Draft Payroll
                    </Button>
                  )}
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Duplicate Warning Dialog */}
          <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Payroll Cycle Already Exists
                </AlertDialogTitle>
                <AlertDialogDescription>
                  A payroll cycle for <strong>{duplicateMonth}</strong> already exists.
                  Create Draft Cycle is blocked to prevent duplicates.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rejection Reason Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Payroll Cycle</DialogTitle>
                <DialogDescription>
                  Provide a reason for rejection. This will be visible to the Finance Controller.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                  <textarea
                    id="rejection-reason"
                    className="flex min-h-[100px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Explain why this payroll cycle is being rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason('');
                  setRejectingPayroll(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || approving !== null}
                >
                  {approving ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Salary Architectures */}
        <Card className="lg:col-span-2 border shadow-sm rounded-md overflow-hidden bg-card">
          <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Structures</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Filter staff..." 
                className="h-8 pl-8 w-40 text-xs rounded-md" 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </CardHeader>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-4 space-y-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-md bg-muted" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-32 bg-muted" />
                        <Skeleton className="h-2 w-24 bg-muted" />
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <Skeleton className="h-3 w-20 bg-muted ml-auto" />
                      <Skeleton className="h-2 w-16 bg-muted ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStructures.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">No Salary Structures</p>
                  <p className="text-xs text-muted-foreground">
                    {filterText ? "No employees match your search" : "Define salary structures for your active employees"}
                  </p>
                </div>
                {!filterText && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSalaryOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Add Salary Structure
                  </Button>
                )}
              </div>
            ) : (
              filteredStructures.map(s => (
                <div 
                  key={s.id} 
                  className="flex items-center justify-between p-4 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee(s)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{s.employee?.name}</p>
                      <p className="text-xs font-medium text-muted-foreground">Last Revised: {new Date(s.effective_from).toLocaleDateString('en-AE')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{settings.currency} {Number(s.net_salary).toLocaleString()}</p>
                      <p className="text-xs font-medium text-emerald-600">Current Net</p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
        
        {/* Salary Detail Dialog */}
        <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEmployee?.employee?.name} - Salary Breakdown</DialogTitle>
              <DialogDescription>Current salary structure and revision history</DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Employee ID</p>
                    <p className="text-sm font-semibold">{selectedEmployee.employee?.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Effective From</p>
                    <p className="text-sm font-semibold">{new Date(selectedEmployee.effective_from).toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Earnings Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Basic Salary</span>
                      <span className="font-medium">{settings.currency} {Number(selectedEmployee.basic).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Housing Allowance (HRA)</span>
                      <span className="font-medium">{settings.currency} {Number(selectedEmployee.hra).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Transport Allowance (TA)</span>
                      <span className="font-medium">{settings.currency} {Number(selectedEmployee.ta).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Dearness Allowance (DA)</span>
                      <span className="font-medium">{settings.currency} {Number(selectedEmployee.da).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Special Allowance</span>
                      <span className="font-medium">{settings.currency} {Number(selectedEmployee.special_allowance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-950/20 px-3 rounded-md font-semibold">
                      <span className="text-emerald-900 dark:text-emerald-100">Gross Salary</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{settings.currency} {Number(selectedEmployee.gross_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Deductions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">PF (Employee)</span>
                      <span className="font-medium text-red-600">- {settings.currency} {Number(selectedEmployee.pf_employee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">ESI (Employee)</span>
                      <span className="font-medium text-red-600">- {settings.currency} {Number(selectedEmployee.esi_employee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Professional Tax</span>
                      <span className="font-medium text-red-600">- {settings.currency} {Number(selectedEmployee.professional_tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">TDS</span>
                      <span className="font-medium text-red-600">- {settings.currency} {Number(selectedEmployee.tds).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">Net Salary</span>
                    <span className="text-2xl font-bold text-primary">{settings.currency} {Number(selectedEmployee.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    Note: Revision history will be available in the next update
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payroll History & Payslips */}
        <Card className="border shadow-sm rounded-md overflow-hidden bg-card">
          <CardHeader className="border-b bg-muted/50 py-4">
            <CardTitle className="text-sm font-medium">Disbursement Log</CardTitle>
          </CardHeader>
          {!febAudit?.exists && (
            <div className="mx-4 mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center justify-between">
                <span>2026-02 payroll cycle not found. Please audit whether it was deleted and restore if required.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 h-6 bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={async () => {
                    const deleted = await getDeletedPayrolls();
                    const febDeleted = deleted?.find((p: any) => p.month === '2026-02');
                    if (febDeleted?.id) {
                      const restored = await restorePayroll(febDeleted.id);
                      if (restored) {
                        toast.success('2026-02 payroll cycle restored successfully');
                        window.location.reload();
                      } else {
                        toast.error('Failed to restore payroll cycle');
                      }
                    } else {
                      toast.error('No deleted 2026-02 payroll cycle found to restore');
                    }
                  }}
                >
                  Restore Cycle
                </Button>
              </div>
            </div>
          )}
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-6 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24 bg-muted" />
                      <Skeleton className="h-4 w-16 bg-muted" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-12 w-full rounded bg-muted" />
                      <Skeleton className="h-12 w-full rounded bg-muted" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20 rounded bg-muted" />
                      <Skeleton className="h-8 w-24 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : payrolls.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No Payroll Cycles</p>
                  <p className="text-xs text-muted-foreground mt-1">Run your first payroll cycle to get started</p>
                </div>
              </div>
            ) : (
              payrolls.map(p => (
                <div key={p.id} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-foreground">{p.month} Cycle{(p as any).run_number && (p as any).run_number > 1 ? ` (Run ${(p as any).run_number})` : ''}</h4>
                    <Badge variant="outline" className={cn(
                      "text-xs font-semibold",
                      getStatusColor(p.status)
                    )}>
                      {p.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted rounded border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Batch Value</p>
                      <p className="text-sm font-semibold text-foreground">{settings.currency} {Number(p.total_amount).toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-muted rounded border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Headcount</p>
                      <p className="text-sm font-semibold text-foreground">{p.lines?.length || 0} Staff</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {(p.status === 'finalized' || p.status === 'processed' || p.status === 'posted' || p.status === 'paid') ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 rounded-md">
                            <FileText className="h-3 w-3 text-primary" /> Payslips
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0">
                          <PayslipBrowser payroll={p} />
                        </DialogContent>
                      </Dialog>
                    ) : null}
                    
                    {/* Draft → Submit for Approval */}
                    {p.status === 'draft' && (
                      <Button 
                        size="sm" 
                        className="h-8 text-xs font-medium bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => handleSubmitForApproval(p.id)}
                        disabled={approving === p.id}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {approving === p.id ? 'Submitting...' : 'Submit for Approval'}
                      </Button>
                    )}

                    {/* Pending Approval → Approve/Reject (MD/CEO only) */}
                    {p.status === 'pending_approval' && (
                      <>
                        <Button 
                          size="sm" 
                          className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleApprove(p.id)}
                          disabled={approving === p.id}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {approving === p.id ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="h-8 text-xs font-medium"
                          onClick={() => {
                            setRejectingPayroll(p.id);
                            setRejectDialogOpen(true);
                          }}
                          disabled={approving === p.id}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Approved → Generate Payslips */}
                    {p.status === 'approved' && (
                      <Button 
                        size="sm" 
                        className="h-8 text-xs font-medium bg-primary hover:bg-primary/90"
                        onClick={() => handleFinalize(p.id)}
                        disabled={approving === p.id}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {approving === p.id ? 'Processing...' : 'Generate Payslips'}
                      </Button>
                    )}
                    
                    {/* Processed/Finalized → Post to Finance */}
                    {['processed', 'finalized'].includes(p.status) && !p.posted_to_finance ? (
                      <Button 
                        size="sm" 
                        className="h-8 text-xs font-medium bg-primary hover:bg-primary/90"
                        onClick={() => handlePost(p.id)}
                        disabled={posting === p.id}
                      >
                        {posting === p.id ? 'Posting...' : 'Post to Ledger'}
                      </Button>
                    ) : null}
                    
                    {/* Rejected → Show reason */}
                    {p.status === 'rejected' && p.rejection_reason && (
                      <div className="w-full bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900 rounded-md p-2">
                        <p className="text-xs font-medium text-red-900 dark:text-red-100">Rejection Reason:</p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">{p.rejection_reason}</p>
                      </div>
                    )}
                    
                    {(p.status === 'posted' || p.status === 'paid') && (
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function PayslipBrowser({ payroll }: { payroll: Payroll }) {
  const { settings } = useSettings();
  const [selectedLine, setSelectedLine] = useState(payroll.lines?.[0] || null);
  const [paymentDetails, setPaymentDetails] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      const details = new Map();
      for (const line of payroll.lines || []) {
        if (line.employee?.id) {
          try {
            const empId = line.employee?.id;
            if (!empId) return;
            const res = await fetch(`/api/hrms/payment-details/${empId}`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            if (res.ok) {
              const data = await res.json();
              details.set(empId, data);
            }
          } catch (err) {
            console.error('Failed to fetch payment details:', err);
          }
        }
      }
      setPaymentDetails(details);
    };

    if (payroll.lines?.length) {
      fetchPaymentDetails();
    }
  }, [payroll.lines]);

  return (
    <div className="flex flex-col h-[80vh] bg-card">
      <div className="p-6 border-b bg-muted flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Payslip Archive: {payroll.month}</h3>
          <p className="text-xs font-medium text-muted-foreground">Electronic Disbursement Records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-medium">
            <Printer className="h-3 w-3" /> Print Batch
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-medium">
            <Mail className="h-3 w-3" /> Email All
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Staff List */}
        <div className="w-64 border-r overflow-y-auto divide-y">
          {payroll.lines?.map((line: any) => {
            const empPaymentDetails = paymentDetails.get(line.employee?.id || '');
            const paymentMethod = empPaymentDetails?.payment_method || 'bank_transfer';
            const PaymentIcon = paymentMethod === 'bank_transfer' ? Landmark : 
                              paymentMethod === 'cheque' ? FileCheck : 
                              paymentMethod === 'cash' ? Coins : Bitcoin;
            
            return (
              <div 
                key={line.id} 
                onClick={() => setSelectedLine(line)}
                className={cn(
                 "p-4 cursor-pointer transition-colors",
                  selectedLine?.id === line.id ?"bg-primary/5 border-r-2 border-primary" :"hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{line.employee?.name || 'Staff Member'}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{settings.currency} {Number(line.net_pay || 0).toLocaleString()}</p>
                  </div>
                  <PaymentIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </div>
                {empPaymentDetails && (
                  <Badge variant="outline" className="text-[9px] mt-1.5 h-4 px-1">
                    {paymentMethod.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Payslip Render */}
        <div className="flex-1 bg-muted p-10 flex items-center justify-center overflow-y-auto">
          {selectedLine ? (
            <div className="bg-card shadow-2xl border border-border w-full max-w-[500px] aspect-[1/1.414] p-10 flex flex-col animate-in fade-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-6 mb-8">
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-foreground leading-none">{settings.companyName}</h4>
                  <p className="text-xs font-medium text-muted-foreground">Engineering ERP Infrastructure</p>
                  <p className="text-[7px] text-muted-foreground mt-2">{settings.companyAddress}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-semibold text-foreground">PAYSLIP</h2>
                  <p className="text-xs font-medium text-muted-foreground">{payroll.month}</p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground font-medium text-[7px] mb-0.5">Staff Name</p>
                    <p className="font-semibold text-foreground">{selectedLine.employee?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium text-[7px] mb-0.5">Employee ID</p>
                    <p className="font-medium text-foreground">{selectedLine.employee?.employee_id || 'SSE-001'}</p>
                  </div>
                </div>
                <div className="space-y-3 text-right">
                  <div>
                    <p className="text-muted-foreground font-medium text-[7px] mb-0.5">Designation</p>
                    <p className="font-medium text-foreground">{selectedLine.employee?.role || 'Architect'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium text-[7px] mb-0.5">Payment Method</p>
                    <p className="font-medium text-foreground">
                      {(() => {
                        const empPaymentDetails = paymentDetails.get(selectedLine.employee?.id || '');
                        if (!empPaymentDetails) return 'Bank Transfer';
                        const method = empPaymentDetails.payment_method;
                        if (method === 'bank_transfer') {
                          const iban = empPaymentDetails.iban || empPaymentDetails.account_number;
                          return iban ? `Bank - ${(iban || '').slice(-4)}` : 'Bank Transfer';
                        }
                        if (method === 'cheque') return 'Cheque Payment';
                        if (method === 'cash') return 'Cash Disbursement';
                        if (method === 'crypto') return `Crypto - ${empPaymentDetails.bank_name || 'Wallet'}`;
                        return 'Bank Transfer';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Matrix */}
              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">Earnings</span>
                      <span className="text-xs font-semibold text-muted-foreground">Amount ({settings.currency})</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Basic Salary</span>
                        <span className="text-foreground font-medium">{Number(selectedLine.basic_pay || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Overtime</span>
                        <span className="text-foreground font-medium">{Number(selectedLine.overtime_pay || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">Deductions</span>
                      <span className="text-xs font-semibold text-muted-foreground">Amount ({settings.currency})</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Tax / Adjust.</span>
                        <span className="text-foreground font-medium">{Number(selectedLine.deductions || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Box */}
              <div className="mt-auto pt-8 border-t border-border">
                <div className="flex justify-between items-center bg-primary/10 text-primary p-6 rounded-md">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Net Payable Amount</p>
                    <p className="text-2xl font-semibold">{settings.currency} {Number(selectedLine.net_pay || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <ShieldCheck className="h-8 w-8 text-primary opacity-50 ml-auto mb-1" />
                    <p className="text-[7px] font-semibold text-muted-foreground">Verified Digital Record</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs font-medium italic">Select staff member to view payslip</div>
          )}
        </div>
      </div>
    </div>
  );
}
