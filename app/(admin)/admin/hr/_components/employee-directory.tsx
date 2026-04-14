'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  ChevronRight,
  ShieldCheck,
  DollarSign,
  Users,
  Fingerprint,
  LayoutTemplate,
  UserPlus,
  FileText,
  CreditCard,
  Trash2,
  Download,
  Upload,
  Pencil,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { createEmployee, updateEmployee, getSalaryStructures, createSalaryStructure } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Employee, HRDepartment, HRRole } from '@/lib/db/types';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/lib/tenant-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface EmployeeDirectoryProps {
  employees: Employee[];
  departments: HRDepartment[];
  roles: HRRole[];
  documentCountByEmployee?: Record<string, number>;
  onRefresh: () => void;
}

function normalizeVisaStatus(value?: string): string {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return '—';
  if (['yes', 'true', 'valid', 'active'].includes(normalized)) return 'Active / Valid';
  if (['no', 'false', 'expired', 'inactive'].includes(normalized)) return 'Inactive / Expired';
  return value || '—';
}

export function EmployeeDirectory({ employees, departments, roles, documentCountByEmployee = {}, onRefresh }: EmployeeDirectoryProps) {
  const { baseCurrency } = useCompanySettings();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('erp_company_settings_changed', handler);
    return () => window.removeEventListener('erp_company_settings_changed', handler);
  }, []);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [adjustSalaryOpen, setAdjustSalaryOpen] = useState(false);
  const [newSalary, setNewSalary] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: '',
    department_id: '',
    employment_type: 'full-time',
    date_of_birth: '',
    gender: '',
    nationality: '',
    passport_number: '',
    visa_status: '',
    address: '',
    city: '',
    country: '',
  });
  const [emergencyForm, setEmergencyForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
  });
  const [documentForm, setDocumentForm] = useState({
    type: 'passport' as 'passport' | 'visa' | 'id_card' | 'certificate' | 'contract' | 'other',
    document_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    notes: '',
  });
  const [bankForm, setBankForm] = useState({
    payment_method: 'bank_transfer' as 'bank_transfer' | 'cheque' | 'cash' | 'crypto',
    account_name: '',
    account_number: '',
    bank_name: '',
    iban: '',
    swift_code: '',
    branch: '',
    branch_code: '',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'bi-weekly' | 'bi-monthly',
    payment_date_of_month: -1,
    beneficiary_reference: '',
    special_notes: '',
  });
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [newStructureOpen, setNewStructureOpen] = useState(false);
  const [structureForm, setStructureForm] = useState({
    basic: 0,
    hra: 0,
    da: 0,
    ta: 0,
    special_allowance: 0,
    pf_employee: 0,
    pf_employer: 0,
    esi_employee: 0,
    esi_employer: 0,
    professional_tax: 0,
    tds: 0,
    effective_from: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const filtered = employees.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.employee_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== 'all' && (e.dept?.name || e.department) !== deptFilter) return false;
    return true;
  });

  const { companyProfile } = useTenant();
  const currency = baseCurrency;

  // Fetch salary structures when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      getSalaryStructures(selectedEmployee.id).then(data => {
        setSalaryStructures(data || []);
      });
    }
  }, [selectedEmployee]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const empData = {
        employee_id: fd.get('employee_id') as string,
        name: fd.get('name') as string,
        hr_role_id: (fd.get('role') as string) || undefined,
        employment_type: fd.get('employment_type') as string,
        department_id: (fd.get('department_id') as string) || undefined,
        joining_date: fd.get('joining_date') as string,
        basic_salary: parseFloat(fd.get('basic_salary') as string) || 0,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
        status: 'active'
      };

      const result = await createEmployee(empData);
      if (result) {
        toast.success('Employee onboarded successfully');
        form.reset();
        setOpen(false);
        setTimeout(() => onRefresh(), 500);
      } else {
        toast.error('Failed to save employee');
      }
    } catch (err) {
      console.error('Employee creation error:', err);
      toast.error('Onboarding failed. Check if roles/departments exist.');
    }
  };

  const handleAdjustSalary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    
    const salary = parseFloat(newSalary);
    if (isNaN(salary) || salary < 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    try {
      await updateEmployee(selectedEmployee.id, { basic_salary: salary });
      toast.success('Salary adjusted successfully');
      setAdjustSalaryOpen(false);
      setNewSalary('');
      setTimeout(() => onRefresh(), 500);
    } catch (err) {
      console.error('Salary update error:', err);
      toast.error('Failed to adjust salary');
    }
  };

  const handleCreateSalaryStructure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const normalizedStructure = {
      ...structureForm,
      hra: structureForm.hra > 0 ? structureForm.hra : Math.round(structureForm.basic * 0.4),
      ta: structureForm.ta > 0 ? structureForm.ta : 2000,
    };

    try {
      await createSalaryStructure({
        employee_id: selectedEmployee.id,
        ...normalizedStructure
      });
      toast.success('Salary structure created successfully');
      setNewStructureOpen(false);
      // Refresh salary structures
      const updatedStructures = await getSalaryStructures(selectedEmployee.id);
      setSalaryStructures(updatedStructures || []);
    } catch (err) {
      console.error('Create salary structure error:', err);
      toast.error('Failed to create salary structure');
    }
  };

  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const openProfileDialog = () => {
    if (!selectedEmployee) return;

    setProfileForm({
      name: selectedEmployee.name || '',
      email: selectedEmployee.email || '',
      phone: selectedEmployee.phone || '',
      role_id: selectedEmployee.hr_role_id || '',
      department_id: selectedEmployee.department_id || '',
      employment_type: selectedEmployee.employment_type || 'full-time',
      date_of_birth: formatDateForInput(selectedEmployee.date_of_birth),
      gender: selectedEmployee.gender || '',
      nationality: selectedEmployee.nationality || '',
      passport_number: selectedEmployee.passport_number || '',
      visa_status: selectedEmployee.visa_status ? normalizeVisaStatus(selectedEmployee.visa_status) : '',
      address: selectedEmployee.address || '',
      city: selectedEmployee.city || '',
      country: selectedEmployee.country || '',
    });
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const payload = {
      name: profileForm.name,
      email: profileForm.email || undefined,
      phone: profileForm.phone || undefined,
      hr_role_id: profileForm.role_id || undefined,
      department_id: profileForm.department_id || undefined,
      employment_type: profileForm.employment_type,
      date_of_birth: profileForm.date_of_birth || undefined,
      gender: profileForm.gender || undefined,
      nationality: profileForm.nationality || undefined,
      passport_number: profileForm.passport_number || undefined,
      visa_status: profileForm.visa_status ? normalizeVisaStatus(profileForm.visa_status) : undefined,
      address: profileForm.address || undefined,
      city: profileForm.city || undefined,
      country: profileForm.country || undefined,
    };

    try {
      const updated = await updateEmployee(selectedEmployee.id, payload);

      if (updated) {
        const selectedRole = roles.find((r) => r.id === profileForm.role_id);
        const selectedDept = departments.find((d) => d.id === profileForm.department_id);

        setSelectedEmployee((prev) =>
          prev
            ? {
                ...prev,
                name: profileForm.name,
                email: profileForm.email || prev.email,
                phone: profileForm.phone || prev.phone,
                hr_role_id: profileForm.role_id || prev.hr_role_id,
                department_id: profileForm.department_id || prev.department_id,
                employment_type: profileForm.employment_type,
                date_of_birth: profileForm.date_of_birth || prev.date_of_birth,
                gender: profileForm.gender || prev.gender,
                nationality: profileForm.nationality || prev.nationality,
                passport_number: profileForm.passport_number || prev.passport_number,
                visa_status: profileForm.visa_status ? normalizeVisaStatus(profileForm.visa_status) : (prev.visa_status || ''),
                address: profileForm.address || prev.address,
                city: profileForm.city || prev.city,
                country: profileForm.country || prev.country,
                role: selectedRole?.title || prev.role,
                department: selectedDept?.name || prev.department,
                hr_role: selectedRole || prev.hr_role,
                dept: selectedDept || prev.dept,
              }
            : prev
        );

        toast.success('Profile updated successfully');
        setProfileDialogOpen(false);
        await onRefresh(); // Refresh the employee list from backend
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    }
  };

  const openBankDialog = async () => {
    if (!selectedEmployee) return;
    
    // Try to load existing payment details from PaymentDetails collection
    try {
      const res = await fetch(`/api/hrms/payment-details/${selectedEmployee.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setBankForm({
          payment_method: data.payment_method || 'bank_transfer',
          account_name: data.account_holder_name || selectedEmployee.name || '',
          account_number: data.account_number || '',
          bank_name: data.bank_name || '',
          iban: data.iban || '',
          swift_code: data.swift_code || '',
          branch: data.branch_code || '',
          branch_code: data.branch_code || '',
          frequency: data.frequency || 'monthly',
          payment_date_of_month: data.payment_date_of_month || -1,
          beneficiary_reference: data.beneficiary_reference || selectedEmployee.employee_id || '',
          special_notes: data.special_notes || '',
        });
      } else {
        // Fallback to legacy bank_details if PaymentDetails doesn't exist
        const bank = selectedEmployee.bank_details || {};
        setBankForm({
          payment_method: 'bank_transfer',
          account_name: bank.account_name || selectedEmployee.name || '',
          account_number: bank.account_number || '',
          bank_name: bank.bank_name || '',
          iban: bank.iban || '',
          swift_code: bank.swift_code || '',
          branch: bank.branch || '',
          branch_code: '',
          frequency: 'monthly',
          payment_date_of_month: -1,
          beneficiary_reference: selectedEmployee.employee_id || '',
          special_notes: '',
        });
      }
    } catch (err) {
      console.error('Failed to load payment details:', err);
      // Fallback to empty form
      setBankForm({
        payment_method: 'bank_transfer',
        account_name: selectedEmployee.name || '',
        account_number: '',
        bank_name: '',
        iban: '',
        swift_code: '',
        branch: '',
        branch_code: '',
        frequency: 'monthly',
        payment_date_of_month: -1,
        beneficiary_reference: selectedEmployee.employee_id || '',
        special_notes: '',
      });
    }
    
    setBankDialogOpen(true);
  };

  const handleSaveBankDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      // Save to PaymentDetails collection
      const res = await fetch('/api/hrms/payment-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          payment_method: bankForm.payment_method,
          account_holder_name: bankForm.account_name,
          account_number: bankForm.account_number,
          bank_name: bankForm.bank_name,
          iban: bankForm.iban,
          swift_code: bankForm.swift_code,
          branch_code: bankForm.branch_code,
          frequency: bankForm.frequency,
          payment_date_of_month: bankForm.payment_date_of_month,
          beneficiary_reference: bankForm.beneficiary_reference,
          special_notes: bankForm.special_notes,
        })
      });

      if (res.ok) {
        // Also update legacy bank_details field for backward compatibility
        await updateEmployee(selectedEmployee.id, { 
          bank_details: {
            account_name: bankForm.account_name,
            account_number: bankForm.account_number,
            bank_name: bankForm.bank_name,
            iban: bankForm.iban,
            swift_code: bankForm.swift_code,
            branch: bankForm.branch_code,
          }
        });
        
        setSelectedEmployee((prev) => (prev ? { 
          ...prev, 
          bank_details: {
            account_name: bankForm.account_name,
            account_number: bankForm.account_number,
            bank_name: bankForm.bank_name,
            iban: bankForm.iban,
            swift_code: bankForm.swift_code,
            branch: bankForm.branch_code,
          }
        } : prev));
        
        setBankDialogOpen(false);
        toast.success('Payment details updated successfully');
        onRefresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update payment details');
      }
    } catch (err) {
      console.error('Payment details update error:', err);
      toast.error('Failed to update payment details');
    }
  };

  const openEmergencyDialog = () => {
    setEmergencyForm({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      address: '',
    });
    setEmergencyDialogOpen(true);
  };

  const handleSaveEmergencyContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const contacts = [...(selectedEmployee.emergency_contacts || [])];
    contacts.push({
      name: emergencyForm.name,
      relationship: emergencyForm.relationship,
      phone: emergencyForm.phone,
      email: emergencyForm.email || undefined,
      address: emergencyForm.address || undefined,
      is_primary: contacts.length === 0,
    });

    try {
      await updateEmployee(selectedEmployee.id, { emergency_contacts: contacts });
      setSelectedEmployee((prev) => (prev ? { ...prev, emergency_contacts: contacts } : prev));
      setEmergencyDialogOpen(false);
      toast.success('Emergency contact added');
      onRefresh();
    } catch {
      toast.error('Failed to add contact');
    }
  };

  const openDocumentDialog = () => {
    setDocumentForm({
      type: 'passport',
      document_number: '',
      issue_date: '',
      expiry_date: '',
      issuing_authority: '',
      notes: '',
    });
    setDocumentDialogOpen(true);
  };

  const handleSaveDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const documents = [...(selectedEmployee.documents || [])];
    documents.push({
      type: documentForm.type,
      document_number: documentForm.document_number || undefined,
      issue_date: documentForm.issue_date || undefined,
      expiry_date: documentForm.expiry_date || undefined,
      issuing_authority: documentForm.issuing_authority || undefined,
      notes: documentForm.notes || undefined,
    });

    try {
      await updateEmployee(selectedEmployee.id, { documents });
      setSelectedEmployee((prev) => (prev ? { ...prev, documents } : prev));
      setDocumentDialogOpen(false);
      toast.success('Document added');
      onRefresh();
    } catch {
      toast.error('Failed to add document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find staff member..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 border-border text-sm"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full md:w-44 h-10 border-border text-xs font-medium">
              <SelectValue placeholder="All Depts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 px-6 gap-2 bg-primary hover:bg-primary/90 font-medium text-xs shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Onboard Personnel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className=" text-foreground">New Staff Entry</DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground">Initialize Identity & Core Role</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-8 pt-4">
              <div className="space-y-4">
                <Label className="text-xs font-semibold text-primary">1. Personal Identity</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Employee ID</Label>
                    <Input name="employee_id" placeholder="SSE-000" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Full Legal Name</Label>
                    <Input name="name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Corporate Email</Label>
                    <Input name="email" type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Joining Date</Label>
                    <Input name="joining_date" type="date" required />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-semibold text-primary">2. Role & Compensation</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Designation (Role)</Label>
                    <select
                      name="role"
                      required
                      className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-xs font-medium tracking-wide outline-none focus:ring-1 focus:ring-primary/20"
                    >
                      <option value="">Select Role...</option>
                      {roles && roles.length > 0 ? (
                        roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)
                      ) : (
                        <option value="">No roles available</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Base Salary ({currency})</Label>
                    <Input name="basic_salary" type="number" required placeholder="0.00" className="font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Work Unit</Label>
                    <select
                      name="department_id"
                      className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-xs font-medium tracking-wide outline-none focus:ring-1 focus:ring-primary/20"
                    >
                      <option value="">Select Dept...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Employment Type</Label>
                    <select
                      name="employment_type"
                      required
                      className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-xs font-medium tracking-wide outline-none focus:ring-1 focus:ring-primary/20"
                    >
                      <option value="full-time">Full-Time</option>
                      <option value="contract">Contract</option>
                      <option value="part-time">Part-Time</option>
                    </select>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary h-12 font-medium text-xs">Commit Personnel Record</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(emp => (
          <Card
            key={emp.id || (emp as any)._id}
            onClick={() => setSelectedEmployee(emp)}
            className="border shadow-sm rounded-md hover:border-primary/50 transition-colors cursor-pointer group bg-card"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-medium text-xs shadow-lg">
                  {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <Badge variant="outline" className={cn(
                  "text-xs font-semibold",
                  emp.status === 'active' ? "border-emerald-100 text-emerald-700 bg-emerald-50" : "text-muted-foreground"
                )}>
                  {emp.status}
                </Badge>
              </div>

              <div className="space-y-0.5 mb-4">
                <h3 className="text-sm font-medium text-foreground truncate">{emp.name}</h3>
                <p className="text-xs font-medium text-muted-foreground">{emp.role || '—'}</p>
                <p className="text-xs font-medium text-muted-foreground">{emp.dept?.name || emp.department || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Fingerprint className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">{emp.employee_id}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground justify-end">
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(Number(emp.basic_salary), baseCurrency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet
        open={!!selectedEmployee}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedEmployee(null);
            setProfileDialogOpen(false);
            setEmergencyDialogOpen(false);
            setDocumentDialogOpen(false);
            setBankDialogOpen(false);
          }
        }}
      >
        <SheetContent className="sm:max-w-xl p-0">
          {selectedEmployee && (
            <div className="flex flex-col h-full bg-card">
              <div className="p-6 bg-primary/10 text-primary">
                <div className="flex items-start justify-between mb-8">
                  <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <Badge className="bg-primary text-card-foreground border-none font-medium text-xs px-3 py-1">{selectedEmployee.status}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-primary text-xs font-medium">{selectedEmployee.employee_id}</p>
                  <h2 className="text-3xl font-medium">{selectedEmployee.name}</h2>
                  <p className="text-muted-foreground font-medium text-sm">{selectedEmployee.role} · {selectedEmployee.dept?.name || selectedEmployee.department}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <Tabs defaultValue="profile" className="space-y-6">
                  <TabsList className="bg-muted/50 border h-10 p-0.5 w-full grid grid-cols-6">
                    <TabsTrigger value="profile" className="text-xs font-medium h-full data-[state=active]:bg-white">Profile</TabsTrigger>
                    <TabsTrigger value="emergency" className="text-xs font-medium h-full data-[state=active]:bg-white">Emergency</TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs font-medium h-full data-[state=active]:bg-white">Documents</TabsTrigger>
                    <TabsTrigger value="bank" className="text-xs font-medium h-full data-[state=active]:bg-white">Bank</TabsTrigger>
                    <TabsTrigger value="overtime" className="text-xs font-medium h-full data-[state=active]:bg-white">Overtime</TabsTrigger>
                    <TabsTrigger value="compensation" className="text-xs font-medium h-full data-[state=active]:bg-white">Salary</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-end">
                      <Button size="sm" variant="outline" className="h-8 gap-2 text-xs" onClick={openProfileDialog}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Profile
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailBox icon={Fingerprint} label="Employee ID" value={selectedEmployee.employee_id} />
                      <DetailBox icon={Briefcase} label="Designation" value={selectedEmployee.role || '—'} />
                      <DetailBox icon={Users} label="Department" value={selectedEmployee.dept?.name || selectedEmployee.department || '—'} />
                      <DetailBox icon={Mail} label="Email" value={selectedEmployee.email || '—'} />
                      <DetailBox icon={Phone} label="Phone" value={selectedEmployee.phone || '—'} />
                      <DetailBox icon={Calendar} label="Joined" value={new Date(selectedEmployee.joining_date).toLocaleDateString('en-AE')} />
                      <DetailBox icon={Calendar} label="Date of Birth" value={selectedEmployee.date_of_birth ? new Date(selectedEmployee.date_of_birth).toLocaleDateString('en-AE') : '—'} />
                      <DetailBox icon={Users} label="Gender" value={selectedEmployee.gender || '—'} />
                      <DetailBox icon={MapPin} label="Nationality" value={selectedEmployee.nationality || '—'} />
                      <DetailBox icon={ShieldCheck} label="Employment Type" value={selectedEmployee.employment_type} />
                      <DetailBox icon={FileText} label="Passport" value={selectedEmployee.passport_number || '—'} />
                      <DetailBox icon={FileText} label="Visa Status" value={normalizeVisaStatus(selectedEmployee.visa_status)} />
                    </div>
                    {selectedEmployee.address && (
                      <div className="space-y-1.5 p-4 rounded-md border border-border bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin size={12} className="text-primary" />
                          <span className="text-xs font-semibold">Address</span>
                        </div>
                        <p className="text-xs font-medium text-foreground">{selectedEmployee.address}</p>
                        {(selectedEmployee.city || selectedEmployee.country) && (
                          <p className="text-xs text-muted-foreground">{[selectedEmployee.city, selectedEmployee.country].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="emergency" className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Emergency Contacts</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2 text-xs"
                        onClick={openEmergencyDialog}
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Add Contact
                      </Button>
                    </div>

                    {selectedEmployee.emergency_contacts && selectedEmployee.emergency_contacts.length > 0 ? (
                      <div className="space-y-3">
                        {selectedEmployee.emergency_contacts.map((contact: any, idx: number) => (
                          <Card key={idx} className="border shadow-sm">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                                    {contact.is_primary && (
                                      <Badge variant="default" className="text-xs">Primary</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={async () => {
                                    if (!confirm('Remove this contact?')) return;
                                    const contacts = (selectedEmployee.emergency_contacts || []).filter((_: any, i: number) => i !== idx);
                                    try {
                                      await updateEmployee(selectedEmployee.id, { emergency_contacts: contacts });
                                      toast.success('Contact removed');
                                      onRefresh();
                                    } catch {
                                      toast.error('Failed to remove contact');
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <DetailBox icon={Phone} label="Phone" value={contact.phone} />
                                <DetailBox icon={Mail} label="Email" value={contact.email || '—'} />
                              </div>
                              {contact.address && (
                                <DetailBox icon={MapPin} label="Address" value={contact.address} />
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center border-2 border-dashed rounded-md">
                        <UserPlus className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground italic">No emergency contacts added</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Employee Documents</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2 text-xs"
                        onClick={openDocumentDialog}
                      >
                        <FileText className="h-3.5 w-3.5" /> Add Document
                      </Button>
                    </div>

                    {(Math.max(selectedEmployee.documents?.length || 0, documentCountByEmployee[selectedEmployee.id] || 0)) > 0 ? (
                      <div className="space-y-3">
                        {(selectedEmployee.documents?.length || 0) === 0 && (documentCountByEmployee[selectedEmployee.id] || 0) > 0 && (
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <p className="text-xs text-muted-foreground">
                                {documentCountByEmployee[selectedEmployee.id]} document(s) exist in workflow tracking. Open Workflows → Documents for full detail.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                        {(selectedEmployee as any).documents?.map((doc: any, idx: number) => (
                          <Card key={idx} className="border shadow-sm">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <Badge variant="outline" className="text-xs font-semibold mb-1">
                                    {doc.type?.toUpperCase().replace('_', ' ')}
                                  </Badge>
                                  {doc.document_number && (
                                    <p className="text-sm font-semibold text-foreground">{doc.document_number}</p>
                                  )}
                                  {doc.issuing_authority && (
                                    <p className="text-xs text-muted-foreground">{doc.issuing_authority}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={async () => {
                                    if (!confirm('Remove this document?')) return;
                                    const documents = (selectedEmployee.documents || []).filter((_: any, i: number) => i !== idx);
                                    try {
                                      await updateEmployee(selectedEmployee.id, { documents });
                                      toast.success('Document removed');
                                      onRefresh();
                                    } catch {
                                      toast.error('Failed to remove document');
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {doc.issue_date && (
                                  <DetailBox icon={Calendar} label="Issue Date" value={new Date(doc.issue_date).toLocaleDateString('en-AE')} />
                                )}
                                {doc.expiry_date && (
                                  <DetailBox icon={Calendar} label="Expiry Date" value={new Date(doc.expiry_date).toLocaleDateString('en-AE')} />
                                )}
                              </div>
                              {doc.notes && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">{doc.notes}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center border-2 border-dashed rounded-md">
                        <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground italic">No documents uploaded</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="bank" className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Bank Account Details</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2 text-xs"
                        onClick={openBankDialog}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> {selectedEmployee.bank_details ? 'Update' : 'Add'} Details
                      </Button>
                    </div>

                    {selectedEmployee.bank_details && selectedEmployee.bank_details.account_number ? (
                      <Card className="border shadow-sm">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{selectedEmployee.bank_details.account_name || selectedEmployee.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedEmployee.bank_details.bank_name}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DetailBox icon={CreditCard} label="Account Number" value={selectedEmployee.bank_details.account_number} />
                            {selectedEmployee.bank_details.iban && (
                              <DetailBox icon={FileText} label="IBAN" value={selectedEmployee.bank_details.iban} />
                            )}
                            {selectedEmployee.bank_details.swift_code && (
                              <DetailBox icon={FileText} label="SWIFT Code" value={selectedEmployee.bank_details.swift_code} />
                            )}
                            {selectedEmployee.bank_details.branch && (
                              <DetailBox icon={MapPin} label="Branch" value={selectedEmployee.bank_details.branch} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="p-12 text-center border-2 border-dashed rounded-md">
                        <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground italic">No bank details added</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add bank account for salary transfers</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="overtime" className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Overtime History</p>
                    </div>

                    <EmployeeOvertimeHistory employeeId={selectedEmployee.id} />
                  </TabsContent>

                  <TabsContent value="compensation" className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-foreground">Salary Structure</p>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 h-8 text-xs font-medium gap-1.5" onClick={() => setNewStructureOpen(true)}>
                        <Plus size={14} /> New Structure
                      </Button>
                    </div>

                    {(() => {
                      const currentStructure = salaryStructures.find(s => s.is_current);
                      
                      if (!currentStructure) {
                        return (
                          <Card className="border-border shadow-none bg-muted/50 border-dashed">
                            <CardContent className="p-12 text-center">
                              <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                              <p className="text-sm font-medium text-muted-foreground mb-1">No Salary Structure Assigned</p>
                              <p className="text-xs text-muted-foreground/80 mb-4">Create a structure to define compensation details</p>
                              <Button size="sm" variant="outline" onClick={() => setNewStructureOpen(true)}>
                                <Plus size={14} className="mr-1.5" /> Create Structure
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      }

                      const earnings = [
                        { label: 'Basic Salary', value: currentStructure.basic },
                        { label: 'House Rent Allowance (HRA)', value: currentStructure.hra },
                        { label: 'Dearness Allowance (DA)', value: currentStructure.da },
                        { label: 'Transport Allowance (TA)', value: currentStructure.ta },
                        { label: 'Special Allowance', value: currentStructure.special_allowance },
                      ].filter(e => e.value > 0);

                      const deductions = [
                        { label: 'PF Employee', value: currentStructure.pf_employee },
                        { label: 'PF Employer', value: currentStructure.pf_employer },
                        { label: 'ESI Employee', value: currentStructure.esi_employee },
                        { label: 'ESI Employer', value: currentStructure.esi_employer },
                        { label: 'Professional Tax', value: currentStructure.professional_tax },
                        { label: 'TDS', value: currentStructure.tds },
                      ].filter(d => d.value > 0);

                      return (
                        <>
                          <Card className="border shadow-sm">
                            <CardContent className="p-0">
                              <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">Current</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Effective from {new Date(currentStructure.effective_from).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 space-y-4">
                                <div>
                                  <p className="text-xs font-semibold text-primary mb-2">Earnings</p>
                                  <div className="space-y-2">
                                    {earnings.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-3 bg-muted/40 rounded-md">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="font-medium text-foreground">{formatCurrency(item.value, baseCurrency)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {deductions.length > 0 && (
                                  <div className="border-t pt-4">
                                    <p className="text-xs font-semibold text-rose-600 mb-2">Deductions</p>
                                    <div className="space-y-2">
                                      {deductions.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-3 bg-rose-50/30 dark:bg-rose-950/10 rounded-md">
                                          <span className="text-muted-foreground">{item.label}</span>
                                          <span className="font-medium text-rose-600">- {formatCurrency(item.value, baseCurrency)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2 mt-4">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground font-medium">Gross Salary:</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(currentStructure.gross_salary, baseCurrency)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground font-medium">Total Deductions:</span>
                                    <span className="font-semibold text-red-600">- {formatCurrency(currentStructure.gross_salary - currentStructure.net_salary, baseCurrency)}</span>
                                  </div>
                                  <div className="border-t border-primary/20 pt-2 flex justify-between">
                                    <span className="text-foreground font-semibold">Net Salary:</span>
                                    <span className="text-lg font-bold text-primary">{formatCurrency(currentStructure.net_salary, baseCurrency)}</span>
                                  </div>
                                </div>

                                {currentStructure.notes && (
                                  <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border">
                                    <span className="font-medium">Notes:</span> {currentStructure.notes}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {salaryStructures.length > 1 && (
                            <Card className="border shadow-sm">
                              <CardContent className="p-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-3">Previous Structures ({salaryStructures.length - 1})</p>
                                <div className="space-y-2">
                                  {salaryStructures.filter(s => !s.is_current).map((structure, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-md text-xs">
                                      <span className="text-muted-foreground">
                                        {new Date(structure.effective_from).toLocaleDateString()}
                                      </span>
                                      <span className="font-medium">{formatCurrency(structure.net_salary, baseCurrency)}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Update identity, role assignment, and personal information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Employment Type</Label>
                <Select value={profileForm.employment_type} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, employment_type: value }))}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="part-time">Part-Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Role</Label>
                <Select value={profileForm.role_id || 'none'} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, role_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Role</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Department</Label>
                <Select value={profileForm.department_id || 'none'} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, department_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date of Birth</Label>
                <Input type="date" value={profileForm.date_of_birth} onChange={(e) => setProfileForm((prev) => ({ ...prev, date_of_birth: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                <Input value={profileForm.gender} onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Nationality</Label>
                <Input value={profileForm.nationality} onChange={(e) => setProfileForm((prev) => ({ ...prev, nationality: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Passport Number</Label>
                <Input value={profileForm.passport_number} onChange={(e) => setProfileForm((prev) => ({ ...prev, passport_number: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Visa Status</Label>
                <Input value={profileForm.visa_status} onChange={(e) => setProfileForm((prev) => ({ ...prev, visa_status: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                <Input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">City</Label>
                <Input value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Country</Label>
                <Input value={profileForm.country} onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">Save Profile</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Save a trusted contact for urgent HR communication
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEmergencyContact} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Contact Name</Label>
              <Input
                value={emergencyForm.name}
                onChange={(e) => setEmergencyForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Relationship</Label>
              <Input
                value={emergencyForm.relationship}
                onChange={(e) => setEmergencyForm((prev) => ({ ...prev, relationship: e.target.value }))}
                placeholder="Spouse, Parent, Sibling..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
              <Input
                value={emergencyForm.phone}
                onChange={(e) => setEmergencyForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={emergencyForm.email}
                onChange={(e) => setEmergencyForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Address</Label>
              <Input
                value={emergencyForm.address}
                onChange={(e) => setEmergencyForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">
              Save Contact
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee Document</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Capture document metadata for compliance and expiry tracking
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDocument} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Document Type</Label>
              <Select
                value={documentForm.type}
                onValueChange={(value) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    type: value as 'passport' | 'visa' | 'id_card' | 'certificate' | 'contract' | 'other',
                  }))
                }
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="id_card">ID Card</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Document Number</Label>
              <Input
                value={documentForm.document_number}
                onChange={(e) => setDocumentForm((prev) => ({ ...prev, document_number: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Issue Date</Label>
                <Input
                  type="date"
                  value={documentForm.issue_date}
                  onChange={(e) => setDocumentForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Expiry Date</Label>
                <Input
                  type="date"
                  value={documentForm.expiry_date}
                  onChange={(e) => setDocumentForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Issuing Authority</Label>
              <Input
                value={documentForm.issuing_authority}
                onChange={(e) => setDocumentForm((prev) => ({ ...prev, issuing_authority: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Input
                value={documentForm.notes}
                onChange={(e) => setDocumentForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">
              Save Document
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.bank_details?.account_number ? 'Update Payment Details' : 'Add Payment Details'}</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Enter comprehensive payment and bank transfer details for payroll processing
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBankDetails} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Payment Method *</Label>
              <Select
                value={bankForm.payment_method}
                onValueChange={(value: any) => setBankForm((prev) => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="crypto">Crypto Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bankForm.payment_method === 'bank_transfer' && (
              <>
                <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                  <h4 className="text-sm font-semibold">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Bank Name *</Label>
                      <Input
                        value={bankForm.bank_name}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                        placeholder="Emirates NBD"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Account Holder Name *</Label>
                      <Input
                        value={bankForm.account_name}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, account_name: e.target.value }))}
                        placeholder="Enter account holder name"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">IBAN</Label>
                      <Input
                        value={bankForm.iban}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, iban: e.target.value }))}
                        placeholder="AE070331234567890123456"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Account Number *</Label>
                      <Input
                        value={bankForm.account_number}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, account_number: e.target.value }))}
                        placeholder="1234567890123"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Branch Code</Label>
                      <Input
                        value={bankForm.branch_code}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, branch_code: e.target.value }))}
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">SWIFT Code</Label>
                      <Input
                        value={bankForm.swift_code}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, swift_code: e.target.value }))}
                        placeholder="EIBLAEAD"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                  <h4 className="text-sm font-semibold">Payment Schedule</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
                      <Select
                        value={bankForm.frequency}
                        onValueChange={(value: any) => setBankForm((prev) => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Payment Date</Label>
                      <Select
                        value={bankForm.payment_date_of_month.toString()}
                        onValueChange={(value) => setBankForm((prev) => ({ ...prev, payment_date_of_month: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">Last day of month</SelectItem>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Beneficiary Reference</Label>
                    <Input
                      value={bankForm.beneficiary_reference}
                      onChange={(e) => setBankForm((prev) => ({ ...prev, beneficiary_reference: e.target.value }))}
                      placeholder={selectedEmployee?.employee_id || 'Employee ID'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Special Instructions</Label>
                    <Input
                      value={bankForm.special_notes}
                      onChange={(e) => setBankForm((prev) => ({ ...prev, special_notes: e.target.value }))}
                      placeholder="Any special payment instructions..."
                    />
                  </div>
                </div>
              </>
            )}

            {bankForm.payment_method === 'cheque' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                <h4 className="text-sm font-semibold">Cheque Details</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Payee Name *</Label>
                  <Input
                    value={bankForm.account_name}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, account_name: e.target.value }))}
                    placeholder="Name as it should appear on cheque"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Special Instructions</Label>
                  <Input
                    value={bankForm.special_notes}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, special_notes: e.target.value }))}
                    placeholder="Collection method, mailing address, etc."
                  />
                </div>
              </div>
            )}

            {bankForm.payment_method === 'cash' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                <h4 className="text-sm font-semibold">Cash Payment</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Recipient Name *</Label>
                  <Input
                    value={bankForm.account_name}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, account_name: e.target.value }))}
                    placeholder="Person receiving cash payment"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                  <Input
                    value={bankForm.special_notes}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, special_notes: e.target.value }))}
                    placeholder="Cash collection details"
                  />
                </div>
              </div>
            )}

            {bankForm.payment_method === 'crypto' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                <h4 className="text-sm font-semibold">Crypto Wallet Details</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Wallet Address *</Label>
                  <Input
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, account_number: e.target.value }))}
                    placeholder="Wallet address"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Currency/Network</Label>
                  <Input
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g., USDT (TRC20)"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">
              Save Payment Details
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustSalaryOpen} onOpenChange={setAdjustSalaryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Salary</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Update {selectedEmployee?.name}'s base salary
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustSalary} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Current Salary ({currency})</Label>
              <p className="text-sm font-semibold text-foreground bg-muted/50 rounded-md p-3">
                {currency} {Number(selectedEmployee?.basic_salary || 0).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">New Salary ({currency})</Label>
              <Input 
                type="number" 
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                placeholder="Enter new salary amount"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">
              Confirm Adjustment
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={newStructureOpen} onOpenChange={setNewStructureOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Salary Structure</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Define compensation structure for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSalaryStructure} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Effective From</Label>
                <Input 
                  type="date"
                  value={structureForm.effective_from}
                  onChange={(e) => setStructureForm(prev => ({ ...prev, effective_from: e.target.value }))}
                  required
                />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-xs font-semibold text-primary">Earnings Components</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Basic Salary</Label>
                    <Input 
                      type="number"
                      value={structureForm.basic}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, basic: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">HRA</Label>
                    <Input 
                      type="number"
                      value={structureForm.hra}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, hra: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">DA</Label>
                    <Input 
                      type="number"
                      value={structureForm.da}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, da: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">TA</Label>
                    <Input 
                      type="number"
                      value={structureForm.ta}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, ta: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Special Allowance</Label>
                    <Input 
                      type="number"
                      value={structureForm.special_allowance}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, special_allowance: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3 border-rose-200 bg-rose-50/10">
                <Label className="text-xs font-semibold text-rose-600">Deductions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">PF Employee</Label>
                    <Input 
                      type="number"
                      value={structureForm.pf_employee}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, pf_employee: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">PF Employer</Label>
                    <Input 
                      type="number"
                      value={structureForm.pf_employer}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, pf_employer: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">ESI Employee</Label>
                    <Input 
                      type="number"
                      value={structureForm.esi_employee}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, esi_employee: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">ESI Employer</Label>
                    <Input 
                      type="number"
                      value={structureForm.esi_employer}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, esi_employer: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Professional Tax</Label>
                    <Input 
                      type="number"
                      value={structureForm.professional_tax}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, professional_tax: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">TDS</Label>
                    <Input 
                      type="number"
                      value={structureForm.tds}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, tds: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes (Optional)</Label>
                <Input 
                  value={structureForm.notes}
                  onChange={(e) => setStructureForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Gross Salary:</span>
                  <span className="font-semibold text-foreground">
                    {currency} {(structureForm.basic + structureForm.hra + structureForm.da + structureForm.ta + structureForm.special_allowance).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Total Deductions:</span>
                  <span className="font-semibold text-red-600">
                    - {currency} {(structureForm.pf_employee + structureForm.pf_employer + structureForm.esi_employee + structureForm.esi_employer + structureForm.professional_tax + structureForm.tds).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-2 flex justify-between">
                  <span className="text-foreground font-semibold">Net Salary:</span>
                  <span className="text-lg font-bold text-primary">
                    {currency} {((structureForm.basic + structureForm.hra + structureForm.da + structureForm.ta + structureForm.special_allowance) - (structureForm.pf_employee + structureForm.pf_employer + structureForm.esi_employee + structureForm.esi_employer + structureForm.professional_tax + structureForm.tds)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">
              Create Salary Structure
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBox({ icon: Icon, label, value }: any) {
  return (
    <div className="space-y-1.5 p-3 rounded-md border border-border bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={12} className="text-primary" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-xs font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function EmployeeOvertimeHistory({ employeeId }: { employeeId: string }) {
  const { baseCurrency } = useCompanySettings();
  const [overtimeLogs, setOvertimeLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearToDate, setYearToDate] = useState({ hours: 0, amount: 0 });

  useEffect(() => {
    const fetchOvertimeHistory = async () => {
      try {
        const res = await fetch(`/api/hrms/overtime?employee_id=${employeeId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setOvertimeLogs(data.slice(0, 5)); // Show last 5 entries
          
          // Calculate YTD totals
          const currentYear = new Date().getFullYear();
          const ytdLogs = data.filter((log: any) => new Date(log.date).getFullYear() === currentYear);
          const totalHours = ytdLogs.reduce((sum: number, log: any) => sum + (log.overtime_hours || 0), 0);
          const totalAmount = ytdLogs.reduce((sum: number, log: any) => sum + (log.overtime_amount || 0), 0);
          setYearToDate({ hours: totalHours, amount: totalAmount });
        }
      } catch (err) {
        console.error('Failed to fetch overtime history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOvertimeHistory();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <p className="text-xs text-muted-foreground">Loading overtime history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* YTD Summary */}
      <Card className="border shadow-sm bg-primary/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Year-to-Date Summary</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total OT Hours</p>
              <p className="text-2xl font-bold text-primary">{yearToDate.hours.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(yearToDate.amount, baseCurrency)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Overtime Logs */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Recent Overtime</p>
        {overtimeLogs.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-md">
            <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground italic">No overtime logged</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overtimeLogs.map((log: any) => (
              <Card key={log.id} className="border shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.overtime_hours} hrs ({log.rate_multiplier}x)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatCurrency(log.overtime_amount, baseCurrency)}</p>
                      <Badge variant={log.status === 'approved' ? 'default' : 'secondary'} className="text-xs mt-1">
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
