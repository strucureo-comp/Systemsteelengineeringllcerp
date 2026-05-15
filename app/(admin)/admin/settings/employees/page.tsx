'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Save, Loader2, Plus, Trash2, Search, Mail, UserCheck, UserX, Send, CheckCircle, Upload, X, ChevronLeft, ChevronRight, KeyRound, Contact } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'pending' | 'disabled';
    invitedBy?: string;
    invitedAt?: string;
    lastLogin?: string;
    signature_url?: string | null;
}

const ROLES = [
    'Administrator',
    'Finance Manager',
    'Sales Manager',
    'HR Manager',
    'Operations Manager',
    'Inventory Manager',
    'Procurement Manager',
    'Project Manager',
    'Employee',
    'Viewer',
];

export default function EmployeesSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<User[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Employee');
    const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    const handleResetPassword = async () => {
        if (!passwordResetUser || !newPassword) return;
        setResettingPassword(true);
        try {
            await settingsApi.updateUser(passwordResetUser.id, { password: newPassword });
            toast.success(`Password updated for ${passwordResetUser.name}`);
            setPasswordResetUser(null);
            setNewPassword('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to reset password');
        } finally {
            setResettingPassword(false);
        }
    };

    const loadEmployees = async (page = 1) => {
        setLoading(true);
        try {
            // Specifically fetch users with 'Employee' role via the 'type' filter
            const response = await settingsApi.getUsers({ page, limit: 25, type: 'employee' });
            const data = response.data || [];
            const mapped: User[] = data.map((u: any) => ({
                id: u._id,
                name: u.full_name || '',
                email: u.email,
                role: u.role,
                status: u.status || 'active',
                invitedAt: u.invited_at,
                lastLogin: u.last_login ? new Date(u.last_login).toISOString().slice(0, 10) : undefined,
                signature_url: u.signature_url,
            }));
            
            setEmployees(mapped);
            setPagination(response.pagination || { page, limit: 25, total: mapped.length, pages: 1 });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleInviteEmployee = async () => {
        if (!inviteEmail) {
            toast.error('Please enter an email address');
            return;
        }

        try {
            // Use the selected role
            await settingsApi.inviteUser(inviteEmail, inviteRole);
            setInviteDialogOpen(false);
            setInviteEmail('');
            setInviteRole('Employee');
            toast.success(`Invitation sent to ${inviteEmail}`);
            loadEmployees(pagination.page);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to invite employee');
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        try {
            await settingsApi.deleteUser(id);
            setEmployees(employees.filter(e => e.id !== id));
            toast.success('Employee record removed');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete employee');
        }
    };

    const handleUpdateEmployee = async (id: string, field: keyof User, value: any) => {
        const nextEmployees = employees.map(e => e.id === id ? { ...e, [field]: value } : e);
        setEmployees(nextEmployees);
    };

    const handleToggleStatus = async (id: string) => {
        const employee = employees.find((e) => e.id === id);
        if (!employee) return;
        const nextStatus = employee.status === 'active' ? 'disabled' : 'active';
        try {
            await settingsApi.toggleUserStatus(id, nextStatus);
            setEmployees(employees.map(e => e.id === id ? { ...e, status: nextStatus } : e));
            toast.success(`Employee ${nextStatus === 'active' ? 'activated' : 'disabled'}`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update status');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(
                employees.map((e) => settingsApi.updateUser(e.id, {
                    full_name: e.name,
                    email: e.email,
                    role: e.role,
                    status: e.status,
                    signature_url: e.signature_url,
                }))
            );
            toast.success('Employee records saved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save employees');
        } finally {
            setSaving(false);
        }
    };

    if (loading && pagination.total === 0) {
        return (
            <div className="space-y-6 max-w-5xl animate-pulse">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
                    <p className="text-muted-foreground">Manage general staff and employee accounts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => loadEmployees(pagination.page)}>
                        <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => setInviteDialogOpen(true)} className="gap-1">
                        <Plus className="h-4 w-4" /> Add Employee
                    </Button>
                </div>
            </div>

            {/* Search and Alert */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Badge variant="outline" className="px-3 py-1 bg-blue-50 border-blue-200 text-blue-600">
                    {pagination.total} Total Employees
                </Badge>
            </div>

            {/* Employees Table */}
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="text-left p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Name</th>
                                    <th className="text-left p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Contact Info</th>
                                    <th className="text-left p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Role</th>
                                    <th className="text-left p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Signature</th>
                                    <th className="text-left p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                                    <th className="text-left p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Onboarding Date</th>
                                    <th className="text-right p-4 font-medium text-slate-500 uppercase tracking-wider text-[10px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 shrink-0 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                                    {employee.name ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EM'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <Input
                                                        value={employee.name}
                                                        onChange={(e) => handleUpdateEmployee(employee.id, 'name', e.target.value)}
                                                        className="h-7 px-2 font-medium bg-transparent border-transparent hover:border-slate-200 focus:bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 font-medium">{employee.email}</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight">Email ID</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Select
                                                value={employee.role}
                                                onValueChange={(v) => handleUpdateEmployee(employee.id, 'role', v)}
                                            >
                                                <SelectTrigger className="h-8 w-36 bg-transparent border-transparent hover:border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLES.map((r) => (
                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="h-9 w-24 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                                                    onClick={() => {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'image/*';
                                                        input.onchange = (e: any) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = () => handleUpdateEmployee(employee.id, 'signature_url', reader.result as string);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        };
                                                        input.click();
                                                    }}
                                                >
                                                    {employee.signature_url ? (
                                                        <img src={employee.signature_url} alt="Sign" className="h-full w-full object-contain" />
                                                    ) : (
                                                        <Upload className="h-3.5 w-3.5 text-slate-300" />
                                                    )}
                                                </div>
                                                {employee.signature_url && (
                                                    <button 
                                                        onClick={() => handleUpdateEmployee(employee.id, 'signature_url', null)}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-400"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge
                                                variant={employee.status === 'active' ? 'default' : employee.status === 'pending' ? 'outline' : 'secondary'}
                                                className={`text-[10px] h-5 capitalize ${
                                                    employee.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 
                                                    employee.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50' : 
                                                    'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {employee.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">
                                            {employee.invitedAt ? new Date(employee.invitedAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
                                                    title="Reset Password"
                                                    onClick={() => setPasswordResetUser(employee)}
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleToggleStatus(employee.id)}
                                                >
                                                    {employee.status === 'active' ? (
                                                        <UserX className="h-4 w-4 text-amber-500" />
                                                    ) : (
                                                        <UserCheck className="h-4 w-4 text-emerald-500" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                                    onClick={() => handleDeleteEmployee(employee.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredEmployees.length === 0 && !loading && (
                        <div className="py-20 text-center">
                            <Contact className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No employees found</p>
                            <p className="text-xs text-slate-400 mt-1">Add your first employee to get started</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">
                        Page <span className="font-medium text-slate-900">{pagination.page}</span> of <span className="font-medium text-slate-900">{pagination.pages}</span>
                    </p>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={pagination.page <= 1 || loading}
                            onClick={() => loadEmployees(pagination.page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={pagination.page >= pagination.pages || loading}
                            onClick={() => loadEmployees(pagination.page + 1)}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Employee Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Add New Employee</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Create an account for a new staff member. They will receive an invitation email.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="employee-email" className="text-sm font-medium">Work Email Address</Label>
                            <Input
                                id="employee-email"
                                type="email"
                                placeholder="employee@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="employee-role" className="text-sm font-medium">Initial Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger id="employee-role" className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                <span className="font-semibold text-slate-700">Note:</span> New employees are automatically assigned the 'Employee' role with limited access to the system. You can upgrade their role later in the Users section.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setInviteDialogOpen(false)} className="text-slate-500">Cancel</Button>
                        <Button onClick={handleInviteEmployee} className="gap-2 px-6">
                            <Plus className="h-4 w-4" /> Add Employee
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving || employees.length === 0} className="gap-2 px-8 py-6 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all bg-slate-900 hover:bg-slate-800 text-white border-none">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Sync Employee Data
                </Button>
            </div>
            {/* Password Reset Dialog */}
            <Dialog open={!!passwordResetUser} onOpenChange={(open) => !open && setPasswordResetUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary" />
                            Reset Employee Password
                        </DialogTitle>
                        <DialogDescription>
                            Set a new password for <strong>{passwordResetUser?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-500">
                                Password must be at least 8 characters, contain uppercase, number and special character.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordResetUser(null)}>Cancel</Button>
                        <Button 
                            onClick={handleResetPassword} 
                            disabled={!newPassword || resettingPassword}
                            className="bg-primary shadow-lg shadow-primary/20"
                        >
                            {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set New Password'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
