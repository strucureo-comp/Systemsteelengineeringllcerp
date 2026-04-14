'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Store, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Hash,
    Globe,
    Plus,
    RefreshCcw,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { createVendor } from '@/lib/api';

interface VendorFormProps {
    onSuccess: () => void;
}

export function VendorForm({ onSuccess }: VendorFormProps) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        
        try {
            await createVendor({
                name: fd.get('name') as string,
                contact_person: fd.get('contact_person') as string,
                email: fd.get('email') as string,
                phone: fd.get('phone') as string,
                address: fd.get('address') as string,
                tax_id: fd.get('tax_id') as string,
                country_code: fd.get('country_code') as string || 'AE',
            });
            toast.success('Supplier entity registered successfully');
            onSuccess();
        } catch (err) {
            toast.error('Failed to register vendor');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card">
            <div className="p-6 bg-foreground text-card-foreground">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                        <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight uppercase">Register Vendor</h3>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Initialize Supplier Profile</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Section 1: Legal Entity */}
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">1. Entity Identification</Label>
                    <div className="grid gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Company Legal Name</Label>
                            <Input name="name" placeholder="e.g. Emirates Steel Industries" required className="h-10 border-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">TRN / Tax ID</Label>
                                <Input name="tax_id" placeholder="100XXXXXXXXXXXX" className="h-10 border-border font-mono font-bold uppercase text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Country Code</Label>
                                <Input name="country_code" defaultValue="AE" placeholder="AE" className="h-10 border-border font-bold uppercase text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Contact Personnel */}
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">2. Primary Contact</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Contact Person</Label>
                            <Input name="contact_person" placeholder="Full Name" className="h-10 border-border" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mobile Number</Label>
                            <Input name="phone" placeholder="+971 -- --- ----" className="h-10 border-border" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                            <Input name="email" type="email" placeholder="sales@vendor.com" className="h-10 border-border" />
                        </div>
                    </div>
                </div>

                {/* Section 3: Logistics */}
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">3. Physical Address</Label>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Office / Warehouse Location</Label>
                        <Textarea name="address" placeholder="Full address details..." className="min-h-[80px] border-border text-xs resize-none" />
                    </div>
                </div>

                <div className="pt-4">
                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} /> Commit Vendor Record
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
