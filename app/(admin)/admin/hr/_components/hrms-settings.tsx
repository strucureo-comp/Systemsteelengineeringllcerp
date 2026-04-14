'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Globe, 
  Settings2, 
  Wallet, 
  Calculator, 
  ChevronRight,
  Landmark,
  Plus,
  Save,
  Trash2,
  Shield,
  Users,
  X,
  Pencil,
  Briefcase,
  Building2,
  Tags,
  Plane,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  createHRRole, 
  createDepartment, 
  createLeaveType, 
  createHoliday,
  deleteHRRole,
  deleteDepartment,
  deleteLeaveType
} from '@/lib/api';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

type ConfigMode = 'statutory' | 'roles' | 'departments' | 'employment-types' | 'components' | 'templates' | 'leave-types';

interface HRMSSettingsProps {
  roles?: any[];
  departments?: any[];
  leaveTypes?: any[];
  onRefresh?: () => void;
}

export function HRMSSettings({ roles = [], departments = [], leaveTypes = [], onRefresh = () => {} }: HRMSSettingsProps) {
  const { baseCurrency } = useCompanySettings();
  const [mode, setConfigMode] = useState<ConfigMode>('statutory');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(['Permanent', 'Contract', 'Intern', 'Probationary']);
  const [salaryComponents, setSalaryComponents] = useState([
    { name: 'Base Salary', cat: 'Earning', type: 'Fixed' },
    { name: 'Housing', cat: 'Earning', type: '40% of Base' },
    { name: 'Transport', cat: 'Earning', type: 'Flat' },
  ]);
  const [salaryTemplates, setSalaryTemplates] = useState(() => {
    const deptNames = (departments || []).map((d: any) => d?.name).filter(Boolean);
    const roleA = deptNames[0] || 'Developing';
    const roleB = deptNames[1] || deptNames[0] || 'Engine';
    const roleC = deptNames[2] || deptNames[0] || 'Developing';
    return [
      { name: 'Senior Engineer', role: roleA, base: 10000, hra: 4000, ta: 2000 },
      { name: 'Junior Developer', role: roleB, base: 6000, hra: 2400, ta: 1200 },
      { name: 'Operations Manager', role: roleC, base: 8500, hra: 3400, ta: 1700 },
    ];
  });
  const sampleSalary = formatCurrency(16000, baseCurrency);
  const sampleDeductions = formatCurrency(0, baseCurrency);

  useEffect(() => {
    if (!departments?.length) return;
    const deptNames = departments.map((d: any) => d?.name).filter(Boolean);
    if (!deptNames.length) return;
    setSalaryTemplates((prev) =>
      prev.map((template, idx) => {
        if (deptNames.includes(template.role)) return template;
        return { ...template, role: deptNames[idx % deptNames.length] };
      })
    );
  }, [departments]);

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsEditOpen(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <Label className="text-sm font-medium text-foreground">Configuration Hub</Label>
        <Button size="sm" className="h-8 gap-2 bg-primary hover:bg-primary/90 font-medium text-xs">
          <Save className="h-3 w-3" /> Save All Changes
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={mode} onValueChange={(v) => setConfigMode(v as ConfigMode)} className="w-full space-y-6">
        <TabsList className="bg-muted p-1 w-full flex justify-start pl-2 rounded-lg gap-1 border-b mb-6 overflow-x-auto h-auto">
          <TabsTrigger value="statutory" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Globe className="h-4 w-4 mr-2" />
            Statutory Rules
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Shield className="h-4 w-4 mr-2" />
            Role Architect
          </TabsTrigger>
          <TabsTrigger value="departments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Building2 className="h-4 w-4 mr-2" />
            Work Units
          </TabsTrigger>
          <TabsTrigger value="leave-types" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Plane className="h-4 w-4 mr-2" />
            Leave Types
          </TabsTrigger>
          <TabsTrigger value="employment-types" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Tags className="h-4 w-4 mr-2" />
            Contract Types
          </TabsTrigger>
          <TabsTrigger value="components" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Calculator className="h-4 w-4 mr-2" />
            Component Master
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium text-xs">
            <Wallet className="h-4 w-4 mr-2" />
            Salary Templates
          </TabsTrigger>
        </TabsList>

        <div className="space-y-6 animate-in fade-in duration-300">
          <TabsContent value="statutory" className="m-0 focus-visible:outline-none">
            <Card className="border shadow-sm rounded-md bg-card">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Statutory Engine</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-4">
                <Label className="text-xs font-medium text-muted-foreground">Select Active Region</Label>
                <Select defaultValue="AE">
                  <SelectTrigger className="h-10 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AE" className="text-xs font-medium">United Arab Emirates (AED)</SelectItem>
                    <SelectItem value="IN" className="text-xs font-medium">India (INR)</SelectItem>
                    <SelectItem value="US" className="text-xs font-medium">United States (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Tax Model</Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="h-9 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Exempt)</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="slab">Progressive Slabs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Gratuity Rule</Label>
                  <div className="flex items-center gap-3 h-9">
                    <Switch defaultChecked />
                    <span className="text-xs font-medium text-muted-foreground">Mandatory Accrual</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="m-0 focus-visible:outline-none">
          <Card className="border shadow-sm rounded-md bg-card">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Role Architect</CardTitle>
              <Badge variant="outline" className="text-xs font-medium">Designations</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">New Designation</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Senior Fitter" className="h-9 border-border text-xs font-medium" id="new-role-title" />
                    <Button size="sm" className="h-9 px-4 bg-primary font-medium text-xs" onClick={async () => {
                      const input = document.getElementById('new-role-title') as HTMLInputElement;
                      if (!input.value) return;
                      try {
                        await createHRRole({ title: input.value, code: input.value.toLowerCase().replace(/\s+/g, '_') });
                        toast.success('Designation added');
                        input.value = '';
                        onRefresh();
                      } catch { toast.error('Failed to add'); }
                    }}>Add</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-xs font-medium text-foreground">Configured Roles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roles && Array.isArray(roles) && roles.length > 0 ? (
                    roles.filter(role => role && role.title).map(role => (
                      <div key={role.id || role._id} className="flex items-center justify-between p-3 border rounded-md bg-muted hover:bg-white transition-all group">
                        <div className="flex items-center gap-3">
                          <Users size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-foreground">{role.title}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit({ type: 'role', name: role.title, id: role.id || role._id })}>
                            <Pencil size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-rose-500" onClick={async () => {
                            if (!confirm(`Delete role "${role.title}"?`)) return;
                            try {
                              const success = await deleteHRRole(role.id || role._id);
                              if (success) {
                                toast.success('Role deleted');
                                onRefresh();
                              } else {
                                toast.error('Failed to delete role');
                              }
                            } catch (err) {
                              toast.error('Failed to delete role');
                              console.error('Delete role error:', err);
                            }
                          }}><Trash2 size={12} /></Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic col-span-full">No roles configured yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="m-0 focus-visible:outline-none">
          <Card className="border shadow-sm rounded-md bg-card">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Work Units</CardTitle>
              <Badge variant="outline" className="text-xs font-medium">Departments</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">New Department Name</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Fabrication" className="h-9 border-border text-xs font-medium" id="new-dept-name" />
                    <Button size="sm" className="h-9 px-4 bg-primary font-medium text-xs" onClick={async () => {
                      const input = document.getElementById('new-dept-name') as HTMLInputElement;
                      if (!input.value) return;
                      try {
                        await createDepartment({ name: input.value, code: input.value.toUpperCase().slice(0, 3) });
                        toast.success('Department created');
                        input.value = '';
                        onRefresh();
                      } catch { toast.error('Failed to create'); }
                    }}>Add</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-xs font-medium text-foreground">Active Units</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {departments && Array.isArray(departments) && departments.length > 0 ? (
                    departments.filter(dept => dept && dept.name).map(dept => (
                      <div key={dept.id || dept._id} className="flex items-center justify-between p-3 border rounded-md bg-muted hover:bg-white transition-all group">
                        <div className="flex items-center gap-3">
                          <Building2 size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-foreground">{dept.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit({ type: 'dept', name: dept.name, id: dept.id || dept._id })}>
                            <Pencil size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-rose-500" onClick={async () => {
                            if (!confirm(`Delete department "${dept.name}"?`)) return;
                            try {
                              const success = await deleteDepartment(dept.id || dept._id);
                              if (success) {
                                toast.success('Department deleted');
                                onRefresh();
                              } else {
                                toast.error('Failed to delete department');
                              }
                            } catch (err) {
                              toast.error('Failed to delete department');
                              console.error('Delete department error:', err);
                            }
                          }}><Trash2 size={12} /></Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic col-span-full">No departments configured yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave-types" className="m-0 focus-visible:outline-none">
          <Card className="border shadow-sm rounded-md bg-card">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Leave Types Configuration</CardTitle>
              <Badge variant="outline" className="text-xs font-medium">Time Off</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  Configure leave categories that employees can apply for. Each type can have annual limits and approval rules.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Create New Leave Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input 
                      placeholder="e.g. Casual Leave" 
                      className="h-9 border-border text-xs font-medium" 
                      id="new-leave-name" 
                    />
                    <Input 
                      placeholder="Code (e.g. CL)" 
                      className="h-9 border-border text-xs font-medium" 
                      id="new-leave-code" 
                    />
                    <Input 
                      type="number" 
                      placeholder="Days per year" 
                      className="h-9 border-border text-xs font-medium" 
                      id="new-leave-days" 
                      defaultValue="5"
                    />
                  </div>
                  <Button size="sm" className="h-9 px-4 bg-primary font-medium text-xs mt-2 w-full md:w-auto" onClick={async () => {
                    const nameInput = document.getElementById('new-leave-name') as HTMLInputElement;
                    const codeInput = document.getElementById('new-leave-code') as HTMLInputElement;
                    const daysInput = document.getElementById('new-leave-days') as HTMLInputElement;
                    
                    if (!nameInput.value || !codeInput.value) {
                      toast.error('Leave name and code are required');
                      return;
                    }
                    
                    try {
                      await createLeaveType({ 
                        name: nameInput.value, 
                        code: codeInput.value.toUpperCase(),
                        days_per_year: parseInt(daysInput.value) || 5,
                        is_paid: true,
                        requires_approval: true
                      });
                      toast.success('Leave type created successfully');
                      nameInput.value = '';
                      codeInput.value = '';
                      daysInput.value = '5';
                      onRefresh();
                    } catch { 
                      toast.error('Failed to create leave type'); 
                    }
                  }}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Leave Type
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-xs font-medium text-foreground">Configured Leave Types</Label>
                <div className="grid grid-cols-1 gap-2">
                  {leaveTypes && Array.isArray(leaveTypes) && leaveTypes.length > 0 ? (
                    leaveTypes.filter(lt => lt && lt.name).map(lt => (
                      <div key={lt.id || lt._id} className="flex items-center justify-between p-4 border rounded-md bg-muted hover:bg-white transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                            <Plane size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{lt.name}</span>
                              <Badge variant="secondary" className="text-xs font-bold">{lt.code || 'N/A'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {lt.days_per_year || 0} days per year · {lt.is_paid ? 'Paid' : 'Unpaid'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit({ type: 'leave-type', name: lt.name, id: lt.id || lt._id })}>
                            <Pencil size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-rose-500" onClick={async () => {
                            if (!confirm(`Delete leave type "${lt.name}"?`)) return;
                            try {
                              const success = await deleteLeaveType(lt.id || lt._id);
                              if (success) {
                                toast.success('Leave type deleted');
                                onRefresh();
                              } else {
                                toast.error('Failed to delete leave type');
                              }
                            } catch (err) {
                              toast.error('Failed to delete leave type');
                              console.error('Delete leave type error:', err);
                            }
                          }}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed rounded-md">
                      <Plane className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground italic">No leave types configured yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Create standard types like Casual, Earned, Sick, etc.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment-types" className="m-0 focus-visible:outline-none">
          <Card className="border shadow-sm rounded-md bg-card">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Contract Types</CardTitle>
              <Badge variant="outline" className="text-xs font-medium">Staffing</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Add Category</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Daily Wages" className="h-9 border-border text-xs font-medium" />
                    <Button size="sm" className="h-9 px-4 bg-primary font-medium text-xs">Add</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-xs font-medium text-foreground">Current Categories</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {employmentTypes.map(type => (
                    <div key={type} className="flex items-center justify-between p-3 border rounded-md bg-muted hover:bg-white transition-all group">
                      <div className="flex items-center gap-3">
                        <Tags size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">{type}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit({ type: 'contract', name: type })}>
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground/60 hover:text-rose-500"
                          onClick={() => {
                            setEmploymentTypes((prev) => prev.filter((item) => item !== type));
                            toast.success('Employment type deleted');
                          }}
                        ><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="m-0 focus-visible:outline-none">
          <Card className="border shadow-sm rounded-md bg-card overflow-hidden">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Salary Components</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs font-medium text-primary border-primary/20">+ Add</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {salaryComponents.map((comp) => (
                  <div key={comp.name} className="flex items-center justify-between p-4 hover:bg-accent hover:text-accent-foreground transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        <Calculator size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{comp.name}</p>
                        <Badge className={cn(
                         "text-xs font-semibold px-1.5 h-4 mt-1 border-none",
                          comp.cat === 'Earning' ?"bg-emerald-50 text-emerald-700" :"bg-rose-50 text-rose-700"
                        )}>{comp.cat}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="text-xs font-medium text-muted-foreground">Logic</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{comp.type}</p>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit({ ...comp, kind: 'component' })}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/60 hover:text-rose-500"
                          onClick={() => {
                            setSalaryComponents((prev) => prev.filter((item) => item.name !== comp.name));
                            toast.success('Component removed');
                          }}
                        ><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="m-0 focus-visible:outline-none">
          <div className="space-y-6">
            <Card className="border shadow-sm rounded-md bg-card">
              <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between text-foreground">
                <CardTitle className="text-sm font-semibold">Salary Templates</CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs font-medium text-primary border-primary/20 gap-1.5">
                  <Plus size={14} /> New Template
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {salaryTemplates.map((template) => (
                    <div key={template.name} className="flex items-center justify-between p-4 hover:bg-accent hover:text-accent-foreground transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{template.name}</p>
                          <Badge variant="secondary" className="text-xs font-semibold mt-1">{template.role}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-medium text-muted-foreground">Base Salary</p>
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(template.base, baseCurrency)}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit template" onClick={() => handleEdit({ type: 'template', name: template.name })}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500/60 hover:text-rose-600"
                            title="Delete template"
                            onClick={() => {
                              setSalaryTemplates((prev) => prev.filter((item) => item.name !== template.name));
                              toast.success('Template deleted');
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm rounded-md bg-card">
              <CardHeader className="border-b bg-muted/50 py-4">
                <CardTitle className="text-sm font-semibold text-foreground">Define Structure: {salaryTemplates[0]?.name || 'Template'}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-semibold text-primary">Earnings Components</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border group hover:border-primary/30">
                      <div>
                        <p className="text-xs font-medium text-foreground">Base Salary</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Fixed monthly amount</p>
                      </div>
                      <input type="number" placeholder="10000" defaultValue="10000" className="w-24 h-8 rounded-md border border-border px-2 text-xs font-medium" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><X size={14} /></Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border group hover:border-primary/30">
                      <div>
                        <p className="text-xs font-medium text-foreground">Housing Allowance</p>
                        <p className="text-xs text-muted-foreground mt-0.5">40% of base salary</p>
                      </div>
                      <input type="number" placeholder="4000" defaultValue="4000" className="w-24 h-8 rounded-md border border-border px-2 text-xs font-medium" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><X size={14} /></Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border group hover:border-primary/30">
                      <div>
                        <p className="text-xs font-medium text-foreground">Transport Allowance</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{`Flat ${formatCurrency(2000, baseCurrency)}`}</p>
                      </div>
                      <input type="number" placeholder="2000" defaultValue="2000" className="w-24 h-8 rounded-md border border-border px-2 text-xs font-medium" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><X size={14} /></Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs font-medium gap-1.5"><Plus size={14} /> Add Component</Button>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-xs font-semibold text-rose-600">Deductions</Label>
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-between p-3 bg-rose-50/30 dark:bg-rose-950/10 rounded-md border border-rose-200/50 group hover:border-rose-300/50">
                      <div>
                        <p className="text-xs font-medium text-foreground">PF Employee</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Provident Fund</p>
                      </div>
                      <input type="number" placeholder="0" className="w-24 h-8 rounded-md border border-border px-2 text-xs font-medium" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><X size={14} /></Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs font-medium gap-1.5 mt-3"><Plus size={14} /> Add Deduction</Button>
                </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Gross Salary:</span>
                    <span className="font-semibold text-foreground">{sampleSalary}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Total Deductions:</span>
                    <span className="font-semibold text-red-600">- {sampleDeductions}</span>
                  </div>
                  <div className="border-t border-primary/20 pt-2 flex justify-between">
                    <span className="text-foreground font-semibold">Net Salary:</span>
                    <span className="text-lg font-bold text-primary">{sampleSalary}</span>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 font-medium text-xs h-10">Save Template Structure</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </div>
      </Tabs>

      {/* Global Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="">Edit Properties</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">Update system configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Name / Title</Label>
              <Input defaultValue={editingItem?.name} className="h-10 border-border font-medium text-xs" />
            </div>
            {editingItem?.type === 'component' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Calculation Logic</Label>
                  <Select defaultValue="fixed">
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percent">Percentage of Base</SelectItem>
                      <SelectItem value="formula">Custom Formula</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md border border-border">
                  <span className="text-xs font-medium text-muted-foreground">Taxable Component</span>
                  <Switch defaultChecked={editingItem?.tax} className="scale-75" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button className="w-full bg-primary hover:bg-primary/90 font-medium text-xs h-10" onClick={() => {
              toast.success('Configuration updated');
              setIsEditOpen(false);
            }}>Commit Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
