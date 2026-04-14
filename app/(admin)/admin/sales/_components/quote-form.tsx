'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createQuote, getCustomers } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Save, RefreshCcw, Building2, Calendar, DollarSign, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerAccount } from '@/lib/db/types';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface QuoteFormProps {
    onSuccess: () => void;
}

export function QuoteForm({ onSuccess }: QuoteFormProps) {
    const { baseCurrency } = useCompanySettings();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<CustomerAccount[]>([]);

    useEffect(() => {
        getCustomers().then(setCustomers).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);

        try {
            await createQuote({
                account_id: fd.get('account_id') as string,
                total_amount: Number(fd.get('total_amount')),
                valid_until: fd.get('valid_until') as string,
                status: 'draft',
                currency: baseCurrency
            });
            toast.success('Quote created successfully');
            onSuccess();
        } catch (error) {
            toast.error('Failed to create quote');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background">
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-foreground">New Quotation</h3>
                        <p className="text-muted-foreground text-xs mt-0.5">Create a new draft proposal</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Customer Account</Label>
                            <Select name="account_id" required>
                                <SelectTrigger className="h-10 border-border text-sm font-medium bg-background">
                                    <SelectValue placeholder="Select Client..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Valid Until</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input name="valid_until" type="date" required className="h-10 pl-9 border-border bg-background" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Estimated Total ({baseCurrency})</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input name="total_amount" type="number" required className="h-10 pl-9 border-border bg-background font-bold" placeholder="0.00" />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-10 px-8 bg-primary hover:bg-primary/90 text-sm font-bold"
                    >
                        {loading ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                            "Create Draft Quote"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
