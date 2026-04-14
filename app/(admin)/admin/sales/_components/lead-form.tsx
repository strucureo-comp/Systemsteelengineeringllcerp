'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createLead } from '@/lib/api';
import { toast } from 'sonner';
import { useTenant } from '@/lib/tenant-context';

interface LeadFormProps {
    onSuccess: () => void;
}

export function LeadForm({ onSuccess }: LeadFormProps) {
    const { companyProfile } = useTenant();
    const currency = companyProfile?.baseCurrency || '$';

    const [loading, setLoading] = useState(false);

    // Using controlled state to match inside behaviors
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        company: '',
        potential_value: 0,
        notes: '',
        status: 'new'
    });

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.first_name || !formData.company) {
            return toast.error("First Name and Company are required");
        }

        setLoading(true);

        try {
            await createLead({
                ...formData,
                source: 'Direct Entry',
            });
            toast.success('Lead created successfully');
            onSuccess();
        } catch (error) {
            toast.error('Failed to create lead');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background">
            <div className="p-6 border-b border-border">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Register Lead</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Add a new potential client.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold font-bold ml-1">First Name</Label>
                            <Input placeholder="John" required className="h-10 bg-background" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold font-bold ml-1">Last Name</Label>
                            <Input placeholder="Doe" className="h-10 bg-background" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold ml-1">Email Address</Label>
                            <Input type="email" placeholder="email@example.com" className="h-10 bg-background" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold ml-1">Company</Label>
                            <Input placeholder="Acme Corp" required className="h-10 bg-background" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold ml-1">Potential Value</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground mr-1">
                                {currency}
                            </span>
                            <Input type="number" className="h-10 pl-10 bg-background" value={formData.potential_value || ''} onChange={e => setFormData({ ...formData, potential_value: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold ml-1">Notes</Label>
                        <Textarea placeholder="What are they looking for?" className="bg-background min-h-[100px]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end">
                    <Button type="submit" disabled={loading} className="h-10 px-8 font-bold">
                        {loading ? 'Saving...' : 'Add Lead'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
