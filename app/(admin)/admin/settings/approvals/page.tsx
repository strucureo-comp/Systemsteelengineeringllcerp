'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Workflow, Receipt, ShoppingCart, Users, FileText, Truck, DollarSign, CreditCard, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

// ============= TYPES =============

interface DocumentApprovalConfig {
    enabled: boolean;
    approverRole: string;
    threshold?: number;
}

interface ModuleApprovalConfig {
    [key: string]: DocumentApprovalConfig;
}

interface AllApprovalsConfig {
    sales: ModuleApprovalConfig;
    purchase: ModuleApprovalConfig;
    hr: ModuleApprovalConfig;
    finance: ModuleApprovalConfig;
}

// ============= MODULE DEFINITIONS =============

const MODULES = {
    sales: {
        name: 'Sales & CRM',
        icon: Receipt,
        description: 'Sales documents approval workflow',
        documents: [
            { id: 'quotation', name: 'Sales Quote', description: 'Create quotation for customer', icon: FileText },
            { id: 'proformaInvoice', name: 'Proforma Invoice', description: 'Used when advance payment is required before final invoice', icon: Receipt },
            { id: 'salesInvoice', name: 'Sales Invoice', description: 'Final billing after confirmation', icon: DollarSign },
            { id: 'deliveryNote', name: 'Delivery Note', description: 'Product delivery record linked with invoice', icon: Truck },
        ]
    },
    purchase: {
        name: 'Purchase',
        icon: ShoppingCart,
        description: 'Purchase documents approval workflow',
        documents: [
            { id: 'purchaseOrder', name: 'Purchase Order', description: 'Order sent to supplier', icon: ShoppingCart },
            { id: 'purchaseBill', name: 'Purchase Bill Entry', description: 'Supplier invoice recording', icon: Receipt },
        ]
    },
    hr: {
        name: 'HR',
        icon: Users,
        description: 'HR documents approval workflow',
        documents: [
            { id: 'payslip', name: 'HR Payslip', description: 'Salary slip generation', icon: DollarSign },
        ]
    },
    finance: {
        name: 'Finance',
        icon: CreditCard,
        description: 'Finance documents approval workflow',
        documents: [
            { id: 'paymentVoucher', name: 'Payment Voucher', description: 'Payment made to supplier/vendor', icon: CreditCard },
            { id: 'receiptVoucher', name: 'Receipt Voucher', description: 'Money received from customers', icon: Receipt },
        ]
    }
};

const DEFAULT_APPROVALS_CONFIG: AllApprovalsConfig = {
    sales: {
        quotation: { enabled: false, approverRole: '', threshold: 0 },
        proformaInvoice: { enabled: false, approverRole: '', threshold: 0 },
        salesInvoice: { enabled: false, approverRole: '', threshold: 0 },
        deliveryNote: { enabled: false, approverRole: '', threshold: 0 },
    },
    purchase: {
        purchaseOrder: { enabled: false, approverRole: '', threshold: 0 },
        purchaseBill: { enabled: false, approverRole: '', threshold: 0 },
    },
    hr: {
        payslip: { enabled: false, approverRole: '', threshold: 0 },
    },
    finance: {
        paymentVoucher: { enabled: false, approverRole: '', threshold: 0 },
        receiptVoucher: { enabled: false, approverRole: '', threshold: 0 },
    },
};

// ============= HELPER FUNCTIONS =============

const getRoles = (): string[] => ['Administrator', 'Finance Manager', 'Sales Manager', 'HR Manager', 'Operations Manager', 'Project Manager', 'Employee', 'Viewer'];

// ============= MAIN COMPONENT =============

export default function ApprovalsSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<AllApprovalsConfig>(DEFAULT_APPROVALS_CONFIG);
    const [roles, setRoles] = useState<string[]>(getRoles());
    const [activeTab, setActiveTab] = useState('sales');

    useEffect(() => {
        const loadApprovals = async () => {
            try {
                const [approvals, roleData] = await Promise.all([
                    settingsApi.getApprovals(),
                    settingsApi.getRoles(),
                ]);
                setConfig({
                    sales: { ...DEFAULT_APPROVALS_CONFIG.sales, ...(approvals?.sales || {}) },
                    purchase: { ...DEFAULT_APPROVALS_CONFIG.purchase, ...(approvals?.purchase || {}) },
                    hr: { ...DEFAULT_APPROVALS_CONFIG.hr, ...(approvals?.hr || {}) },
                    finance: { ...DEFAULT_APPROVALS_CONFIG.finance, ...(approvals?.finance || {}) },
                });
                const roleNames = (roleData || []).map((r: any) => r.name);
                if (roleNames.length) {
                    setRoles(roleNames);
                }
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load approval settings');
            } finally {
                setLoading(false);
            }
        };
        loadApprovals();
    }, []);

    const handleToggle = (module: keyof AllApprovalsConfig, docId: string) => {
        setConfig(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [docId]: {
                    ...(prev[module][docId] || { enabled: false, approverRole: '', threshold: 0 }),
                    enabled: !(prev[module][docId]?.enabled || false)
                }
            }
        }));
    };

    const handleRoleChange = (module: keyof AllApprovalsConfig, docId: string, role: string) => {
        setConfig(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [docId]: {
                    ...(prev[module][docId] || { enabled: false, approverRole: '', threshold: 0 }),
                    approverRole: role
                }
            }
        }));
    };

    const handleThresholdChange = (module: keyof AllApprovalsConfig, docId: string, threshold: number) => {
        setConfig(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [docId]: {
                    ...(prev[module][docId] || { enabled: false, approverRole: '', threshold: 0 }),
                    threshold
                }
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.saveApprovals(config);
            toast.success('Approval settings saved successfully');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save approval settings');
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
                <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-32 rounded-md" />
                    ))}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Approval Workflows</h1>
                <p className="text-muted-foreground">Configure approval settings for each module</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full max-w-lg">
                    {Object.entries(MODULES).map(([key, module]) => (
                        <TabsTrigger key={key} value={key} className="gap-1">
                            <module.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{module.name}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Render tabs for each module */}
                {Object.entries(MODULES).map(([moduleKey, moduleData]) => (
                    <TabsContent key={moduleKey} value={moduleKey} className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <moduleData.icon className="h-5 w-5" />
                                    {moduleData.name} Approvals
                                </CardTitle>
                                <CardDescription>
                                    Configure which roles can approve {moduleData.name.toLowerCase()} documents.
                                    Only selected role users will see Approve/Reject buttons.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {moduleData.documents.map((doc) => {
                                    const docConfig = config[moduleKey as keyof AllApprovalsConfig]?.[doc.id] ||
                                        { enabled: false, approverRole: '', threshold: 0 };
                                    return (
                                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <Switch
                                                    checked={docConfig.enabled}
                                                    onCheckedChange={() => handleToggle(moduleKey as keyof AllApprovalsConfig, doc.id)}
                                                />
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                    docConfig.enabled ? "bg-primary text-primary-foreground" : "bg-muted"
                                                )}>
                                                    <doc.icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{doc.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {doc.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-[180px]">
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Approver Role</Label>
                                                    <Select
                                                        value={docConfig.approverRole}
                                                        onValueChange={(v) => handleRoleChange(moduleKey as keyof AllApprovalsConfig, doc.id, v)}
                                                        disabled={!docConfig.enabled}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {roles.map((role) => (
                                                                <SelectItem key={role} value={role}>{role}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-[130px]">
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Threshold</Label>
                                                    <Input
                                                        type="number"
                                                        value={docConfig.threshold || ''}
                                                        onChange={(e) => handleThresholdChange(moduleKey as keyof AllApprovalsConfig, doc.id, Number(e.target.value))}
                                                        disabled={!docConfig.enabled}
                                                        placeholder="0"
                                                        className="h-9"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <Workflow className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium">How {moduleData.name} approvals work:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li>Enable approval for a document type</li>
                                            <li>Select which role can approve (e.g., Finance Manager, Sales Manager)</li>
                                            <li>Only users with that role will see Approve/Reject buttons</li>
                                            <li>Documents will go through: Draft → Pending Approval → Approved/Rejected → Completed</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>

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