'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Loader2, CheckCircle2, Package, ShoppingCart, Users, DollarSign, Briefcase, Factory, Shield, BarChart3, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

interface Module {
    id: string;
    name: string;
    description: string;
    icon: any;
    enabled: boolean;
    required: boolean;
}

interface ModulesConfig {
    modules: Module[];
}

const MODULE_ICONS: Record<string, any> = {
    finance: DollarSign,
    sales: ShoppingCart,
    operations: Settings2,
    hr: Users,
    inventory: Package,
    projects: Briefcase,
    manufacturing: Factory,
    procurement: ShoppingCart,
    reports: BarChart3,
    compliance: Shield,
};

const DEFAULT_MODULES: ModulesConfig = {
    modules: [
        { id: 'finance', name: 'Finance', description: 'General ledger, invoicing, payments', icon: 'finance', enabled: true, required: true },
        { id: 'sales', name: 'Sales', description: 'CRM, quotations, customers', icon: 'sales', enabled: true, required: false },
        { id: 'operations', name: 'Operations', description: 'Production, scheduling', icon: 'operations', enabled: true, required: false },
        { id: 'hr', name: 'Human Resources', description: 'Employees, payroll, attendance', icon: 'hr', enabled: false, required: false },
        { id: 'inventory', name: 'Inventory', description: 'Stock management, warehousing', icon: 'inventory', enabled: true, required: false },
        { id: 'projects', name: 'Projects', description: 'Project management, tasks', icon: 'projects', enabled: false, required: false },
        { id: 'manufacturing', name: 'Manufacturing', description: 'BOM, work orders', icon: 'manufacturing', enabled: false, required: false },
        { id: 'procurement', name: 'Procurement', description: 'Purchase orders, vendors', icon: 'procurement', enabled: true, required: false },
        { id: 'reports', name: 'Reports', description: 'Financial reports, analytics', icon: 'reports', enabled: true, required: false },
        { id: 'compliance', name: 'Compliance', description: 'Audit trails, regulatory', icon: 'compliance', enabled: false, required: false },
    ],
};

export default function ModulesSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modulesConfig, setModulesConfig] = useState<ModulesConfig>(DEFAULT_MODULES);
    const { refreshTenantStatus, globalCompanyName, globalCurrency } = useTenant();

    useEffect(() => {
        const loadModules = async () => {
            try {
                const data = await settingsApi.getModules();
                if (data?.modules) {
                    setModulesConfig({
                        modules: DEFAULT_MODULES.modules.map((m) => ({ ...m, enabled: Boolean(data.modules[m.id]) })),
                    });
                }
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load module settings');
            } finally {
                setLoading(false);
            }
        };
        loadModules();
    }, []);

    const handleToggle = (moduleId: string) => {
        setModulesConfig({
            modules: modulesConfig.modules.map(m =>
                m.id === moduleId ? { ...m, enabled: !m.enabled } : m
            ),
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = modulesConfig.modules.reduce((acc, m) => {
                acc[m.id] = m.enabled;
                return acc;
            }, {} as Record<string, boolean>);
            await settingsApi.saveModules(payload);
            await refreshTenantStatus();
            toast.success('Modules saved successfully');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save module settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    const enabledCount = modulesConfig.modules.filter(m => m.enabled).length;

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Modules</h1>
                <p className="text-muted-foreground">Enable or disable system modules</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Active organization: {globalCompanyName} | Base currency: {globalCurrency}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold">{enabledCount}</p>
                            <p className="text-sm text-muted-foreground">Active Modules</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-semibold">{modulesConfig.modules.length}</p>
                        <p className="text-sm text-muted-foreground">Total Modules</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-semibold">{modulesConfig.modules.filter(m => m.required).length}</p>
                        <p className="text-sm text-muted-foreground">Required</p>
                    </CardContent>
                </Card>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modulesConfig.modules.map((module) => {
                    const Icon = MODULE_ICONS[module.id] || Package;
                    return (
                        <Card
                            key={module.id}
                            className={cn(
                                "transition-all",
                                module.enabled ? "border-primary/30 bg-primary/5" : "opacity-75"
                            )}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-lg flex items-center justify-center",
                                            module.enabled ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{module.name}</p>
                                                {module.required && (
                                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{module.description}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={module.enabled}
                                        onCheckedChange={() => handleToggle(module.id)}
                                        disabled={module.required}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

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
