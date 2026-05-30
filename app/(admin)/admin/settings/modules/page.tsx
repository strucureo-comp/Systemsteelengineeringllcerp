'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
    Save, 
    Loader2, 
    Layers, 
    Info, 
    Building2, 
    Users, 
    ShoppingCart, 
    Package, 
    Briefcase, 
    Factory, 
    FileText, 
    ShieldCheck,
    Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

interface ModuleConfig {
    finance: boolean;
    sales: boolean;
    operations: boolean;
    hr: boolean;
    inventory: boolean;
    projects: boolean;
    manufacturing: boolean;
    procurement: boolean;
    reports: boolean;
    compliance: boolean;
}

const MODULE_INFO = [
    { id: 'finance', name: 'Finance', desc: 'General ledger, accounts payable/receivable, and financial reporting.', icon: Building2 },
    { id: 'sales', name: 'Sales', desc: 'Invoices, quotations, and customer sales management.', icon: FileText },
    { id: 'inventory', name: 'Inventory', desc: 'Stock management, warehouse locations, and real-time tracking.', icon: Package },
    { id: 'procurement', name: 'Procurement', desc: 'Vendor management, purchase orders, and goods receiving.', icon: ShoppingCart },
    { id: 'hr', name: 'HR & Payroll', desc: 'Employee management, attendance, leave, and payroll processing.', icon: Users },
    { id: 'projects', name: 'Project Management', desc: 'Task tracking, project milestones, and resource allocation.', icon: Briefcase },
    { id: 'operations', name: 'Operations', desc: 'Logistics, site operations, and daily activity tracking.', icon: Truck },
    { id: 'manufacturing', name: 'Manufacturing', desc: 'Production planning, BOM management, and work orders.', icon: Factory, isHidden: true },
    { id: 'reports', name: 'Advanced Reports', desc: 'In-depth analytics and custom report generation.', icon: Layers },
    { id: 'compliance', name: 'Compliance', desc: 'Regulatory tracking, audit trails, and legal documentation.', icon: ShieldCheck },
];

export default function ModuleConfigurationPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modules, setModules] = useState<ModuleConfig>({
        finance: true,
        sales: true,
        operations: false,
        hr: false,
        inventory: true,
        projects: false,
        manufacturing: false,
        procurement: true,
        reports: true,
        compliance: false
    });

    useEffect(() => {
        const loadModules = async () => {
            try {
                const data = await settingsApi.getModules();
                if (data && data.modules) {
                    setModules(data.modules);
                }
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load module configuration');
            } finally {
                setLoading(false);
            }
        };
        loadModules();
    }, []);

    const handleToggle = (moduleId: string, enabled: boolean) => {
        setModules(prev => ({
            ...prev,
            [moduleId]: enabled
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.saveModules(modules);
            toast.success('Module configuration updated');
            
            // Broadcast change for components that listen to module visibility
            window.dispatchEvent(new CustomEvent('erp_modules_changed', { detail: modules }));
            
            // Force reload for sidebar to update if necessary
            // router.refresh();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save module configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Module Configuration</h1>
                    <p className="text-muted-foreground">Activate or deactivate system modules to suit your business needs.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULE_INFO.map((module) => (
                    <Card key={module.id} className={module.isHidden ? "opacity-60 border-dashed" : ""}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <module.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-base font-semibold leading-none">{module.name}</Label>
                                            {module.isHidden && (
                                                <Badge variant="secondary" className="text-[10px] h-4 uppercase">Hidden</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {module.desc}
                                        </p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={modules[module.id as keyof ModuleConfig]} 
                                    onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-semibold mb-1">Impact of Deactivation</p>
                        <p>Deactivating a module will hide it from the main navigation for all users. However, existing data will be preserved and will reappear if the module is reactivated.</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Configuration
                </Button>
            </div>
        </div>
    );
}
