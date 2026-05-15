'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Plus, Trash2, Info, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

// ============= TYPES =============

interface Tax {
    id: string;
    name: string;
    rate: number;
    type: 'sales' | 'purchase' | 'both';
    enabled: boolean;
    isDefault?: boolean;
    isCompound?: boolean;
    description?: string;
}

interface TaxConfig {
    customTaxes: Tax[];
}

// ============= MAIN COMPONENT =============

export default function TaxesSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [taxConfig, setTaxConfig] = useState<TaxConfig>({
        customTaxes: []
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const taxes = await settingsApi.getTaxes();
            setTaxConfig({
                customTaxes: (taxes || []).map((t: any) => ({
                    id: t._id,
                    name: t.name,
                    rate: t.rate,
                    type: t.type,
                    enabled: t.enabled,
                    isDefault: t.isDefault,
                    isCompound: t.isCompound,
                    description: t.description,
                }))
            });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load tax settings');
        } finally {
            setLoading(false);
        }
    };

    const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

    const handleToggleTax = (taxId: string) => {
        setTaxConfig(prev => ({
            ...prev,
            customTaxes: prev.customTaxes.map(t =>
                t.id === taxId ? { ...t, enabled: !t.enabled } : t
            )
        }));
    };

    const handleDeleteTax = async (taxId: string) => {
        try {
            if (isObjectId(taxId)) {
                await settingsApi.deleteTax(taxId);
            }
            setTaxConfig(prev => ({
                ...prev,
                customTaxes: prev.customTaxes.filter(t => t.id !== taxId)
            }));
            toast.success('Tax removed');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to remove tax');
        }
    };

    const handleAddCustomTax = () => {
        const newTax: Tax = {
            id: `custom-${Date.now()}`,
            name: '',
            rate: 0,
            type: 'both',
            enabled: true,
            description: ''
        };
        setTaxConfig(prev => ({
            ...prev,
            customTaxes: [...prev.customTaxes, newTax]
        }));
    };

    const handleUpdateTax = (taxId: string, field: keyof Tax, value: any) => {
        setTaxConfig(prev => ({
            ...prev,
            customTaxes: prev.customTaxes.map(t =>
                t.id === taxId ? { ...t, [field]: value } : t
            )
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(
                taxConfig.customTaxes.map((tax) => {
                    const payload = {
                        name: tax.name,
                        rate: Number(tax.rate) || 0,
                        type: tax.type,
                        enabled: tax.enabled,
                        isDefault: !!tax.isDefault,
                        isCompound: !!tax.isCompound,
                        description: tax.description || '',
                        isCustom: true,
                        taxId: tax.id,
                    };
                    return isObjectId(tax.id)
                        ? settingsApi.updateTax(tax.id, payload)
                        : settingsApi.createTax(payload);
                })
            );

            // Find default tax for broadcasting
            const defaultTax = taxConfig.customTaxes.find(t => t.isDefault && t.enabled) ||
                               taxConfig.customTaxes.find(t => t.enabled);

            if (defaultTax) {
                // Sync for PDF
                const existingPdfSettings = JSON.parse(localStorage.getItem('pdf-settings') || '{}');
                const syncedPdfSettings = {
                    ...existingPdfSettings,
                    taxRate: defaultTax.rate,
                    taxLabel: `${defaultTax.name} ${defaultTax.rate}%`
                };
                localStorage.setItem('pdf-settings', JSON.stringify(syncedPdfSettings));
                window.dispatchEvent(new Event('erp_settings_updated'));
            }

            toast.success('Tax settings saved');
            await loadSettings();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save tax settings');
        } finally {
            setSaving(false);
        }
    };

    const enabledTaxes = taxConfig.customTaxes.filter(t => t.enabled);

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Taxes</h1>
                    <p className="text-muted-foreground">Manually configure tax rates for your business</p>
                </div>
                <Button onClick={handleAddCustomTax} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Tax Rate
                </Button>
            </div>

            {/* Tax Configuration Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Tax Configuration
                    </CardTitle>
                    <CardDescription>
                        Define manual tax rates for sales and purchases
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {taxConfig.customTaxes.map((tax) => (
                            <div key={tax.id} className="p-4 hover:bg-muted/30">
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={tax.enabled}
                                        onCheckedChange={() => handleToggleTax(tax.id)}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Tax Name</Label>
                                            <Input
                                                value={tax.name}
                                                onChange={(e) => handleUpdateTax(tax.id, 'name', e.target.value)}
                                                placeholder="e.g. VAT, GST"
                                                disabled={!tax.enabled}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Rate (%)</Label>
                                            <Input
                                                value={tax.rate}
                                                onChange={(e) => handleUpdateTax(tax.id, 'rate', parseFloat(e.target.value) || 0)}
                                                type="number"
                                                step="0.01"
                                                placeholder="0"
                                                disabled={!tax.enabled}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Type</Label>
                                            <Select
                                                value={tax.type}
                                                onValueChange={(v: 'sales' | 'purchase' | 'both') => handleUpdateTax(tax.id, 'type', v)}
                                                disabled={!tax.enabled}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sales">Sales Only</SelectItem>
                                                    <SelectItem value="purchase">Purchase Only</SelectItem>
                                                    <SelectItem value="both">Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Description</Label>
                                            <Input
                                                value={tax.description || ''}
                                                onChange={(e) => handleUpdateTax(tax.id, 'description', e.target.value)}
                                                placeholder="Optional details"
                                                disabled={!tax.enabled}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteTax(tax.id)}
                                        className="ml-2"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {taxConfig.customTaxes.length === 0 && (
                            <div className="p-12 text-center text-muted-foreground">
                                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="font-medium">No taxes configured</p>
                                <p className="text-sm mb-4">Click the button above to add your first tax rate</p>
                                <Button onClick={handleAddCustomTax} variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" /> Add Tax
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Info Note */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-slate-600 mt-0.5" />
                        <div className="text-sm text-slate-700">
                            <p className="font-medium mb-1">Manual Tax Management</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>All taxes must be configured manually for your specific region</li>
                                <li>"Sales" taxes will appear on invoices and quotes</li>
                                <li>"Purchase" taxes will appear on purchase orders and bills</li>
                                <li>Toggle a tax off to hide it from new transactions without deleting it</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || taxConfig.customTaxes.length === 0} className="gap-2 px-8">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Tax Settings
                </Button>
            </div>
        </div>
    );
}
