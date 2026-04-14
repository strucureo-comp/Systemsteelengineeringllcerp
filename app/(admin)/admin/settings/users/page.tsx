'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Save, Loader2, Plus, Trash2, Search, Mail, UserCheck, UserX, Send, CheckCircle, Upload, X } from 'lucide-react';
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

const DEFAULT_USERS: User[] = [];

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

export default function UsersSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Employee');

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await settingsApi.getUsers();
                const mapped: User[] = (data || []).map((u: any) => ({
                    id: u._id,
                    name: u.full_name || '',
                    email: u.email,
                    role: u.role,
                    status: u.status || 'active',
                    invitedAt: u.invited_at,
                    lastLogin: u.last_login ? new Date(u.last_login).toISOString().slice(0, 10) : undefined,
                    signature_url: u.signature_url,
                }));
                setUsers(mapped);
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleInviteUser = async () => {
        if (!inviteEmail) {
            toast.error('Please enter an email address');
            return;
        }

        // Check if email already exists
        if (users.find(u => u.email === inviteEmail)) {
            toast.error('User with this email already exists');
            return;
        }

        try {
            const created = await settingsApi.inviteUser(inviteEmail, inviteRole);
            setUsers([
                ...users,
                {
                    id: created._id,
                    name: created.full_name || '',
                    email: created.email,
                    role: created.role,
                    status: created.status || 'pending',
                    invitedAt: created.invited_at,
                },
            ]);
            setInviteDialogOpen(false);
            setInviteEmail('');
            setInviteRole('Employee');
            toast.success(`Invitation sent to ${inviteEmail}`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to invite user');
        }
    };

    const handleDeleteUser = async (id: string) => {
        try {
            await settingsApi.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete user');
        }
    };

    const handleUpdateUser = async (id: string, field: keyof User, value: string) => {
        const nextUsers = users.map(u => u.id === id ? { ...u, [field]: value } : u);
        setUsers(nextUsers);
        const target = nextUsers.find(u => u.id === id);
        if (!target) return;
        try {
            await settingsApi.updateUser(id, {
                full_name: target.name,
                email: target.email,
                role: target.role,
                status: target.status,
                signature_url: target.signature_url,
            });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update user');
        }
    };

    const handleToggleStatus = async (id: string) => {
        const user = users.find((u) => u.id === id);
        if (!user) return;
        const nextStatus = user.status === 'active' ? 'disabled' : 'active';
        try {
            await settingsApi.toggleUserStatus(id, nextStatus);
            setUsers(users.map(u => u.id === id ? { ...u, status: nextStatus } : u));
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update status');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(
                users.map((u) => settingsApi.updateUser(u.id, {
                    full_name: u.name,
                    email: u.email,
                    role: u.role,
                    status: u.status,
                    signature_url: u.signature_url,
                }))
            );
            toast.success('Users saved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save users');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
                <div className="grid grid-cols-4 gap-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Users</h1>
                    <p className="text-muted-foreground">Manage system users and access</p>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)} className="gap-1">
                    <Send className="h-4 w-4" /> Invite User
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
                            <div className="col-span-3">User</div>
                            <div className="col-span-2">Role</div>
                            <div className="col-span-2">Signature</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Last Login</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {/* User Rows */}
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30">
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <Input
                                            value={user.name}
                                            onChange={(e) => handleUpdateUser(user.id, 'name', e.target.value)}
                                            placeholder="Full Name"
                                            className="h-8 font-medium"
                                        />
                                        <Input
                                            value={user.email}
                                            onChange={(e) => handleUpdateUser(user.id, 'email', e.target.value)}
                                            placeholder="Email"
                                            className="h-6 text-xs text-muted-foreground mt-1"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <Select
                                        value={user.role}
                                        onValueChange={(v) => handleUpdateUser(user.id, 'role', v)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map((r) => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-10 w-24 rounded border-2 border-dashed bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => handleUpdateUser(user.id, 'signature_url', reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            };
                                            input.click();
                                        }}>
                                            {user.signature_url ? (
                                                <img src={user.signature_url} alt="Sign" className="h-full w-full object-contain" />
                                            ) : (
                                                <Upload className="h-3 w-3 text-muted-foreground" />
                                            )}
                                        </div>
                                        {user.signature_url && (
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleUpdateUser(user.id, 'signature_url', null as any)}>
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <Badge
                                        variant={user.status === 'active' ? 'default' : user.status === 'pending' ? 'outline' : 'secondary'}
                                        className={user.status === 'active' ? 'bg-emerald-500' : user.status === 'pending' ? 'bg-amber-500 text-white' : ''}
                                    >
                                        {user.status === 'active' && <UserCheck className="h-3 w-3 mr-1" />}
                                        {user.status === 'disabled' && <UserX className="h-3 w-3 mr-1" />}
                                        {user.status === 'pending' && <Mail className="h-3 w-3 mr-1" />}
                                        {user.status}
                                    </Badge>
                                </div>
                                <div className="col-span-2 text-sm text-muted-foreground">
                                    {user.lastLogin || 'Never'}
                                </div>
                                <div className="col-span-1 flex justify-end gap-2">
                                    {user.status === 'pending' ? (
                                        <Button variant="outline" size="sm" onClick={() => handleUpdateUser(user.id, 'status', 'active')}>
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleStatus(user.id)}
                                        >
                                            {user.status === 'active' ? (
                                                <UserX className="h-4 w-4 text-amber-500" />
                                            ) : (
                                                <UserCheck className="h-4 w-4 text-emerald-500" />
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteUser(user.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            <p>No users found</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-semibold">{users.length}</p>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-semibold text-emerald-500">{users.filter(u => u.status === 'active').length}</p>
                        <p className="text-sm text-muted-foreground">Active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-semibold text-amber-500">{users.filter(u => u.status === 'pending').length}</p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-semibold text-red-500">{users.filter(u => u.status === 'disabled').length}</p>
                        <p className="text-sm text-muted-foreground">Disabled</p>
                    </CardContent>
                </Card>
            </div>

            {/* Invite Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                        <DialogDescription>
                            Send an invitation email to a new team member to join your organization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                placeholder="user@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleInviteUser} className="gap-1">
                            <Send className="h-4 w-4" /> Send Invitation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
