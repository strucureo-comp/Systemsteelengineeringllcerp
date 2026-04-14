'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Package,
    Plus,
    Trash2,
    CheckCircle2,
    ArrowRightLeft,
    ClipboardCheck,
    AlertTriangle,
    RotateCcw,
    TrendingUp,
    Warehouse
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import { Skeleton } from '@/components/ui/skeleton';

import {
    getStockJournals,
    createStockJournal,
    postStockJournal,
    getProducts
} from '@/lib/api';
import type { StockJournal, StockJournalLine, ProductVariant } from '@/lib/db/types';

interface JournalLineItem {
    id: string;
    variantId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    lotNumber: string;
    notes: string;
}

const JOURNAL_TYPES = [
    { value: 'adjustment', label: 'Adjustment', icon: TrendingUp },
    { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
    { value: 'count', label: 'Stock Count', icon: ClipboardCheck },
    { value: 'damage', label: 'Damage', icon: AlertTriangle },
    { value: 'obsolete', label: 'Obsolete', icon: Trash2 },
    { value: 'revaluation', label: 'Revaluation', icon: TrendingUp },
];

const VALUATION_METHODS = [
    { value: 'fifo', label: 'FIFO' },
    { value: 'lifo', label: 'LIFO' },
    { value: 'weighted_average', label: 'Weighted Average' },
    { value: 'standard_cost', label: 'Standard Cost' },
];

export function StockJournalContent() {
    const { baseCurrency } = useCompanySettings();
    const [journals, setJournals] = useState<StockJournal[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        const handler = () => window.location.reload();
        window.addEventListener('erp_company_settings_changed', handler);
        return () => window.removeEventListener('erp_company_settings_changed', handler);
    }, []);

    // Form state
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'adjustment',
        reference: '',
        reason: '',
        notes: '',
        valuationMethod: 'fifo',
    });

    const [lineItems, setLineItems] = useState<JournalLineItem[]>([
        { id: '1', variantId: '', fromLocationId: '', toLocationId: '', quantity: 0, unitCost: 0, totalCost: 0, lotNumber: '', notes: '' }
    ]);

    // Calculate totals
    const totals = useMemo(() => {
        const totalValue = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
        const totalQty = lineItems.reduce((sum, item) => sum + item.quantity, 0);
        return { totalValue, totalQty };
    }, [lineItems]);

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [journalsRes, productsRes] = await Promise.allSettled([
                getStockJournals(),
                getProducts()
            ]);

            if (journalsRes.status === 'fulfilled') {
                setJournals(journalsRes.value);
            } else {
                console.error('Failed to load stock journals:', journalsRes.reason);
                setJournals([]);
            }

            if (productsRes.status === 'fulfilled') {
                setProducts(productsRes.value);
            } else {
                setProducts([]);
            }
        } catch (error) {
            toast.error('Failed to load stock journals');
            setJournals([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }

    // Filter journals
    const filteredJournals = useMemo(() => {
        if (activeTab === 'all') return journals;
        if (activeTab === 'posted') return journals.filter(j => j.posting_status === 'posted');
        if (activeTab === 'draft') return journals.filter(j => j.posting_status === 'draft');
        return journals.filter(j => j.type === activeTab);
    }, [journals, activeTab]);

    // Stats
    const stats = useMemo(() => {
        const total = journals.reduce((sum, j) => sum + Number(j.total_value), 0);
        const posted = journals.filter(j => j.posting_status === 'posted').length;
        const draft = journals.filter(j => j.posting_status === 'draft').length;
        const adjustments = journals.filter(j => j.type === 'adjustment').length;
        return { total, posted, draft, adjustments };
    }, [journals]);

    // Add line item
    const addLineItem = () => {
        setLineItems(prev => [...prev, {
            id: Date.now().toString(),
            variantId: '',
            fromLocationId: '',
            toLocationId: '',
            quantity: 0,
            unitCost: 0,
            totalCost: 0,
            lotNumber: '',
            notes: ''
        }]);
    };

    // Remove line item
    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(prev => prev.filter(item => item.id !== id));
        }
    };

    // Update line item
    const updateLineItem = (id: string, field: keyof JournalLineItem, value: any) => {
        setLineItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'quantity' || field === 'unitCost') {
                updated.totalCost = Math.abs(updated.quantity) * updated.unitCost;
            }
            return updated;
        }));
    };

    // Create journal
    const handleCreate = async () => {
        if (lineItems.some(item => !item.variantId || item.quantity === 0)) {
            toast.error('Please fill in all line items with product and quantity');
            return;
        }

        try {
            const data = {
                date: formData.date,
                type: formData.type,
                reference: formData.reference,
                reason: formData.reason,
                notes: formData.notes,
                valuation_method: formData.valuationMethod,
                lines: lineItems.map(item => ({
                    variant_id: item.variantId,
                    from_location_id: item.fromLocationId || null,
                    to_location_id: item.toLocationId || null,
                    quantity: item.quantity,
                    unit_cost: item.unitCost,
                    total_cost: item.totalCost,
                    lot_number: item.lotNumber || null,
                    notes: item.notes
                }))
            };

            await createStockJournal(data);
            toast.success('Stock journal created successfully');
            setIsCreateOpen(false);
            loadData();

            // Reset form
            setFormData({
                date: format(new Date(), 'yyyy-MM-dd'),
                type: 'adjustment',
                reference: '',
                reason: '',
                notes: '',
                valuationMethod: 'fifo',
            });
            setLineItems([{ id: '1', variantId: '', fromLocationId: '', toLocationId: '', quantity: 0, unitCost: 0, totalCost: 0, lotNumber: '', notes: '' }]);
        } catch (error) {
            toast.error('Failed to create stock journal');
        }
    };

    // Post journal
    const handlePost = async (id: string) => {
        try {
            await postStockJournal(id);
            toast.success('Stock journal posted to GL and inventory updated');
            loadData();
        } catch (error) {
            toast.error('Failed to post stock journal');
        }
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft' },
            posted: { variant: 'default', label: 'Posted' },
            voided: { variant: 'destructive', label: 'Voided' }
        };
        const config = variants[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Get type badge
    const getTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            adjustment: 'bg-blue-100 text-blue-800',
            transfer: 'bg-purple-100 text-purple-800',
            count: 'bg-green-100 text-green-800',
            damage: 'bg-red-100 text-red-800',
            obsolete: 'bg-gray-100 text-gray-800',
            revaluation: 'bg-amber-100 text-amber-800'
        };
        return (
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${colors[type] || 'bg-muted'}`}>
                {type.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Total Value</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {formatCurrency(stats.total, baseCurrency)}
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <Package className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Posted</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.posted}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Draft</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.draft}</p>
                            </div>
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <ClipboardCheck className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Adjustments</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.adjustments}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="rounded-[2.5rem] shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold text-foreground">Stock Journal</CardTitle>
                            <p className="text-muted-foreground mt-1">Inventory adjustments with GL integration</p>
                        </div>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-slate-900 hover:bg-slate-800">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Journal Entry
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create Stock Journal</DialogTitle>
                                    <DialogDescription>
                                        Record inventory adjustments, transfers, or valuations.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Journal Type *</Label>
                                            <Select
                                                value={formData.type}
                                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {JOURNAL_TYPES.map(type => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date *</Label>
                                            <Input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Reference</Label>
                                            <Input
                                                placeholder="e.g., PO-123, Count-Sheet-5"
                                                value={formData.reference}
                                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valuation Method</Label>
                                            <Select
                                                value={formData.valuationMethod}
                                                onValueChange={(value) => setFormData({ ...formData, valuationMethod: value })}
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {VALUATION_METHODS.map(method => (
                                                        <SelectItem key={method.value} value={method.value}>
                                                            {method.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason</Label>
                                        <Input
                                            placeholder="e.g., Annual stock count, Damaged goods write-off"
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <Separator className="my-4" />

                                    {/* Line Items */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Line Items</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="rounded-lg">
                                                <Plus className="w-4 h-4 mr-1" /> Add Line
                                            </Button>
                                        </div>
                                        {lineItems.map((item, index) => (
                                            <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted rounded-xl">
                                                <div className="col-span-4">
                                                    <Label className="text-xs">Product *</Label>
                                                    <Select
                                                        value={item.variantId}
                                                        onValueChange={(value) => updateLineItem(item.id, 'variantId', value)}
                                                    >
                                                        <SelectTrigger className="rounded-xl mt-1">
                                                            <SelectValue placeholder="Select product" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products.flatMap((p: any) =>
                                                                p.variants?.map((v: any) => (
                                                                    <SelectItem key={v.id} value={v.id}>
                                                                        {p.name} - {v.sku}
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Quantity *</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="rounded-xl mt-1"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Unit Cost</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Cost"
                                                        value={item.unitCost}
                                                        onChange={(e) => updateLineItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                                        className="rounded-xl mt-1"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Total</Label>
                                                    <p className="text-sm font-medium text-slate-700 mt-3">{formatCurrency(item.totalCost, baseCurrency)}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    {lineItems.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeLineItem(item.id)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {formData.type === 'transfer' && (
                                                    <>
                                                        <div className="col-span-6">
                                                            <Label className="text-xs">From Location</Label>
                                                            <Input
                                                                placeholder="Source location"
                                                                value={item.fromLocationId}
                                                                onChange={(e) => updateLineItem(item.id, 'fromLocationId', e.target.value)}
                                                                className="rounded-xl mt-1"
                                                            />
                                                        </div>
                                                        <div className="col-span-6">
                                                            <Label className="text-xs">To Location</Label>
                                                            <Input
                                                                placeholder="Destination location"
                                                                value={item.toLocationId}
                                                                onChange={(e) => updateLineItem(item.id, 'toLocationId', e.target.value)}
                                                                className="rounded-xl mt-1"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                <div className="col-span-12">
                                                    <Input
                                                        placeholder="Notes (optional)"
                                                        value={item.notes}
                                                        onChange={(e) => updateLineItem(item.id, 'notes', e.target.value)}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator className="my-4" />

                                    {/* Totals */}
                                    <div className="space-y-2 text-right">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Quantity:</span>
                                            <span className="font-medium">{totals.totalQty}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total Value:</span>
                                            <span>{formatCurrency(totals.totalValue, baseCurrency)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Notes</Label>
                                        <Input
                                            placeholder="Internal notes..."
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancel</Button>
                                    <Button onClick={handleCreate} className="rounded-xl bg-slate-900 hover:bg-slate-800">Create Journal</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="rounded-xl bg-muted p-1 flex flex-wrap">
                            <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
                            <TabsTrigger value="draft" className="rounded-lg">Draft</TabsTrigger>
                            <TabsTrigger value="posted" className="rounded-lg">Posted</TabsTrigger>
                            <TabsTrigger value="adjustment" className="rounded-lg">Adjustments</TabsTrigger>
                            <TabsTrigger value="transfer" className="rounded-lg">Transfers</TabsTrigger>
                            <TabsTrigger value="count" className="rounded-lg">Counts</TabsTrigger>
                        </TabsList>

                        <div className="border rounded-2xl overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="font-semibold">Journal #</TableHead>
                                        <TableHead className="font-semibold">Type</TableHead>
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Reference</TableHead>
                                        <TableHead className="font-semibold">Value</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={7}>
                                                    <Skeleton className="h-6 w-full bg-muted" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredJournals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No stock journals found</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredJournals.map((journal) => (
                                            <TableRow key={journal.id} className="hover:bg-slate-50/50">
                                                <TableCell className="font-medium">{journal.number}</TableCell>
                                                <TableCell>{getTypeBadge(journal.type)}</TableCell>
                                                <TableCell>{format(new Date(journal.date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell>{journal.reference || '-'}</TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCurrency(Number(journal.total_value), baseCurrency)}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(journal.posting_status)}</TableCell>
                                                <TableCell className="text-right">
                                                    {journal.posting_status === 'draft' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePost(journal.id)}
                                                            className="rounded-lg"
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1" />
                                                            Post
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
