'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Loader2, Plus, Trash2, Shield, Users, ChevronRight, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

interface Permission {
    module: string;
    view: boolean;
    create: boolean;
    edit: boolean;
    approve: boolean;
}

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    isDefault?: boolean;
    isCustom?: boolean;
}

function mapRoleFromApi(role: any): Role {
    return {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        isDefault: role.isDefault,
        isCustom: role.isCustom,
    };
}

const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

const DEFAULT_ROLES: Role[] = [
    {
        id: '1',
        name: 'Administrator',
        description: 'Full system access',
        isDefault: true,
        permissions: [
            { module: 'Sales CRM', view: true, create: true, edit: true, approve: true },
            { module: 'Finance Hub', view: true, create: true, edit: true, approve: true },
            { module: 'Inventory', view: true, create: true, edit: true, approve: true },
            { module: 'HR', view: true, create: true, edit: true, approve: true },
            { module: 'Procurement', view: true, create: true, edit: true, approve: true },
            { module: 'Reports', view: true, create: true, edit: true, approve: true },
            { module: 'Projects', view: true, create: true, edit: true, approve: true },
            { module: 'Manufacturing', view: true, create: true, edit: true, approve: true },
        ]
    },
    {
        id: '2',
        name: 'Finance Manager',
        description: 'Finance & Accounting',
        permissions: [
            { module: 'Sales CRM', view: true, create: false, edit: false, approve: false },
            { module: 'Finance Hub', view: true, create: true, edit: true, approve: true },
            { module: 'Inventory', view: true, create: false, edit: false, approve: false },
            { module: 'HR', view: false, create: false, edit: false, approve: false },
            { module: 'Procurement', view: true, create: false, edit: false, approve: true },
            { module: 'Reports', view: true, create: true, edit: false, approve: false },
            { module: 'Projects', view: false, create: false, edit: false, approve: false },
            { module: 'Manufacturing', view: false, create: false, edit: false, approve: false },
        ]
    },
    {
        id: '3',
        name: 'Sales Manager',
        description: 'Sales & CRM',
        permissions: [
            { module: 'Sales CRM', view: true, create: true, edit: true, approve: true },
            { module: 'Finance Hub', view: false, create: false, edit: false, approve: false },
            { module: 'Inventory', view: true, create: false, edit: false, approve: false },
            { module: 'HR', view: false, create: false, edit: false, approve: false },
            { module: 'Procurement', view: false, create: false, edit: false, approve: false },
            { module: 'Reports', view: true, create: false, edit: false, approve: false },
            { module: 'Projects', view: true, create: false, edit: false, approve: false },
            { module: 'Manufacturing', view: false, create: false, edit: false, approve: false },
        ]
    },
    {
        id: '4',
        name: 'HR Manager',
        description: 'Human Resources',
        permissions: [
            { module: 'Sales CRM', view: false, create: false, edit: false, approve: false },
            { module: 'Finance Hub', view: false, create: false, edit: false, approve: false },
            { module: 'Inventory', view: false, create: false, edit: false, approve: false },
            { module: 'HR', view: true, create: true, edit: true, approve: true },
            { module: 'Procurement', view: false, create: false, edit: false, approve: false },
            { module: 'Reports', view: true, create: false, edit: false, approve: false },
            { module: 'Projects', view: false, create: false, edit: false, approve: false },
            { module: 'Manufacturing', view: false, create: false, edit: false, approve: false },
        ]
    },
    {
        id: '5',
        name: 'Employee',
        description: 'General staff access',
        permissions: [
            { module: 'Sales CRM', view: true, create: true, edit: false, approve: false },
            { module: 'Finance Hub', view: false, create: false, edit: false, approve: false },
            { module: 'Inventory', view: true, create: false, edit: false, approve: false },
            { module: 'HR', view: true, create: false, edit: false, approve: false },
            { module: 'Procurement', view: false, create: false, edit: false, approve: false },
            { module: 'Reports', view: false, create: false, edit: false, approve: false },
            { module: 'Projects', view: true, create: true, edit: false, approve: false },
            { module: 'Manufacturing', view: false, create: false, edit: false, approve: false },
        ]
    },
    {
        id: '6',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: [
            { module: 'Sales CRM', view: true, create: false, edit: false, approve: false },
            { module: 'Finance Hub', view: true, create: false, edit: false, approve: false },
            { module: 'Inventory', view: true, create: false, edit: false, approve: false },
            { module: 'HR', view: true, create: false, edit: false, approve: false },
            { module: 'Procurement', view: true, create: false, edit: false, approve: false },
            { module: 'Reports', view: true, create: false, edit: false, approve: false },
            { module: 'Projects', view: true, create: false, edit: false, approve: false },
            { module: 'Manufacturing', view: true, create: false, edit: false, approve: false },
        ]
    },
];

const MODULES = ['Sales CRM', 'Finance Hub', 'Inventory', 'HR', 'Procurement', 'Reports', 'Projects', 'Manufacturing'];

export default function RolesSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
    const [selectedRole, setSelectedRole] = useState<Role>(DEFAULT_ROLES[0]);
    const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const data = await settingsApi.getRoles();
                const mapped = (data || []).map(mapRoleFromApi);
                if (mapped.length) {
                    setRoles(mapped);
                    setSelectedRole(mapped[0]);
                } else {
                    setRoles(DEFAULT_ROLES);
                    setSelectedRole(DEFAULT_ROLES[0]);
                }
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load roles');
            } finally {
                setLoading(false);
            }
        };
        loadRoles();
    }, []);

    const handlePermissionChange = (moduleIndex: number, permission: keyof Permission, value: boolean) => {
        const updatedRoles = roles.map(r => {
            if (r.id === selectedRole.id) {
                const newPermissions = [...r.permissions];
                newPermissions[moduleIndex] = { ...newPermissions[moduleIndex], [permission]: value };
                return { ...r, permissions: newPermissions };
            }
            return r;
        });
        setRoles(updatedRoles);
        setSelectedRole(updatedRoles.find(r => r.id === selectedRole.id)!);
    };

    const handleCreateRole = async () => {
        if (!newRoleName) {
            toast.error('Role name is required');
            return;
        }

        const newRole: Role = {
            id: Date.now().toString(),
            name: newRoleName,
            description: newRoleDescription || `${newRoleName} role`,
            isCustom: true,
            permissions: MODULES.map(m => ({
                module: m,
                view: false,
                create: false,
                edit: false,
                approve: false,
            }))
        };

        try {
            const created = await settingsApi.createRole({
                name: newRole.name,
                description: newRole.description,
                permissions: newRole.permissions,
            });
            const mapped = mapRoleFromApi(created);
            setRoles([...roles, mapped]);
            setSelectedRole(mapped);
            setCreateRoleDialogOpen(false);
            setNewRoleName('');
            setNewRoleDescription('');
            toast.success(`Role "${newRoleName}" created`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to create role');
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (roles.find(r => r.id === id)?.isDefault) {
            toast.error('Cannot delete default roles');
            return;
        }
        try {
            await settingsApi.deleteRole(id);
            const filtered = roles.filter(r => r.id !== id);
            setRoles(filtered);
            if (selectedRole.id === id && filtered.length) {
                setSelectedRole(filtered[0]);
            }
            toast.success('Role deleted');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete role');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const existingRoles = await settingsApi.getRoles();
            const existingByName = new Map(
                (existingRoles || []).map((r: any) => [String(r.name || '').toLowerCase(), r])
            );

            await Promise.all(
                roles.map((role) => {
                    const payload = {
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions,
                        isDefault: role.isDefault,
                        isCustom: role.isCustom,
                    };

                    if (isObjectId(role.id)) {
                        return settingsApi.updateRole(role.id, payload);
                    }

                    const existing = existingByName.get(role.name.toLowerCase());
                    if (existing?._id) {
                        return settingsApi.updateRole(existing._id, payload);
                    }

                    return settingsApi.createRole(payload);
                })
            );
            toast.success('Roles saved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save roles');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl animate-pulse">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-[500px] w-full rounded-xl" />
                    <Skeleton className="lg:col-span-2 h-[500px] w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
                    <p className="text-muted-foreground">Define roles and their access levels</p>
                </div>
                <Button onClick={() => setCreateRoleDialogOpen(true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Create Role
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Roles List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Roles</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={cn(
                                        "w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors",
                                        selectedRole.id === role.id && "bg-primary/5 border-l-2 border-primary"
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{role.name}</p>
                                        <p className="text-xs text-muted-foreground">{role.description}</p>
                                    </div>
                                    {role.isDefault && (
                                        <Badge variant="secondary" className="text-xs">Default</Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Permissions Grid */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">{selectedRole.name} Permissions</CardTitle>
                                <CardDescription>{selectedRole.description}</CardDescription>
                            </div>
                            {selectedRole.isCustom && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(selectedRole.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Module</th>
                                        <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">View</th>
                                        <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Create</th>
                                        <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Edit</th>
                                        <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Approve</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedRole.permissions.map((perm, idx) => (
                                        <tr key={perm.module} className="border-b hover:bg-muted/20">
                                            <td className="py-3 px-2 font-medium text-sm">{perm.module}</td>
                                            <td className="py-3 px-2 text-center">
                                                <Switch
                                                    checked={perm.view}
                                                    onCheckedChange={(v) => handlePermissionChange(idx, 'view', v)}
                                                />
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <Switch
                                                    checked={perm.create}
                                                    onCheckedChange={(v) => handlePermissionChange(idx, 'create', v)}
                                                />
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <Switch
                                                    checked={perm.edit}
                                                    onCheckedChange={(v) => handlePermissionChange(idx, 'edit', v)}
                                                />
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <Switch
                                                    checked={perm.approve}
                                                    onCheckedChange={(v) => handlePermissionChange(idx, 'approve', v)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Role Dialog */}
            <Dialog open={createRoleDialogOpen} onOpenChange={setCreateRoleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Custom Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Role Name</Label>
                            <Input
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="e.g., Warehouse Manager"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={newRoleDescription}
                                onChange={(e) => setNewRoleDescription(e.target.value)}
                                placeholder="Brief description of this role"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateRoleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateRole}>Create Role</Button>
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
