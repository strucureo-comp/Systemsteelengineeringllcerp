'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { 
    CalendarIcon, 
    Package, 
    User, 
    Phone, 
    ClipboardList,
    Hash,
    Calendar as CalendarLucide,
    Send,
    RefreshCcw,
    AlertCircle,
    MapPin,
    ShieldCheck,
    FileImage,
    Construction
} from 'lucide-react';
import { toast } from 'sonner';
import { createPurchaseRequest } from '@/lib/api';
import type { Project } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const generateRef = (prefix: string) => {
    const date = new Date();
    const seq = String(date.getTime()).slice(-5);
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${seq}`;
};

interface MaterialRequestFormProps {
    projects: Project[];
    onSuccess: () => void;
}

export function MaterialRequestForm({ projects, onSuccess }: MaterialRequestFormProps) {
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().split('T')[0];
    const [mrNumber] = useState(generateRef('MR'));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        
        try {
            // Mapping fields to our PurchaseRequest model
            // Packing extra questions into 'notes' for data integrity
            const extraData = {
                priority: fd.get('priority'),
                delivery_location: fd.get('delivery_location'),
                supervisor: fd.get('supervisor_name'),
                tech_spec: fd.get('tech_spec'),
                mobile: fd.get('mobile_number'),
                purpose: fd.get('purpose')
            };

            const data = {
                item_name: fd.get('material_description') as string,
                quantity: Number(fd.get('quantity')),
                unit: fd.get('unit') as string || 'units',
                project_id: fd.get('project_id') as string,
                needed_by: fd.get('required_date') as string,
                priority: (fd.get('priority') as string).toLowerCase() || 'medium',
                notes: JSON.stringify(extraData),
            };

            await createPurchaseRequest(data);
            toast.success('Enterprise Material Request (MR) Dispatched');
            onSuccess();
        } catch (err) {
            toast.error('Failed to dispatch request');
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
                        <Construction className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight uppercase">Site Requisition Form</h3>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Official Requisition Hub (MR-V2)</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Document No</p>
                        <p className="text-xs font-black font-mono text-primary">{mrNumber}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                        <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] h-4 font-black uppercase">Draft/Pending</Badge>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">System Date</p>
                        <p className="text-xs font-black uppercase">{new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                {/* Section 1: Authorization */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                        <ShieldCheck size={14} className="text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">1. Authorization & Contact</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Requester Name</Label>
                            <Input name="requester_name" placeholder="Full Name" required className="h-10 border-border" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Contact Number</Label>
                            <Input name="mobile_number" placeholder="+971 -- --- ----" required className="h-10 border-border" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Site Supervisor Clearance</Label>
                            <Input name="supervisor_name" placeholder="Name of approving supervisor" className="h-10 border-border bg-muted/50" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Material Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                        <Package size={14} className="text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">2. Material Specification</Label>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Material Description</Label>
                        <Input name="material_description" placeholder="Exact name of item" required className="h-10 border-border" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Technical Specs / Brand Preference</Label>
                        <Input name="tech_spec" placeholder="e.g. Grade 60, Hilti Brand, 220V..." className="h-10 border-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Quantity & Unit</Label>
                            <div className="flex gap-2">
                                <Input name="quantity" type="number" placeholder="0.00" required className="h-10 border-border font-bold" />
                                <Select name="unit" defaultValue="pcs">
                                    <SelectTrigger className="w-24 h-10 border-border text-xs font-bold uppercase">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pcs">PCS</SelectItem>
                                        <SelectItem value="kg">KG</SelectItem>
                                        <SelectItem value="mtr">MTR</SelectItem>
                                        <SelectItem value="nos">NOS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Request Urgency</Label>
                            <Select name="priority" defaultValue="Medium">
                                <SelectTrigger className="h-10 border-border text-xs font-bold uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low - Normal</SelectItem>
                                    <SelectItem value="Medium">Medium - Standard</SelectItem>
                                    <SelectItem value="High">High - Urgent</SelectItem>
                                    <SelectItem value="Emergency">Emergency - Stop Work</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Section 3: Project & Logistics */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                        <MapPin size={14} className="text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">3. Project & Logistics</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Project / Job No</Label>
                            <Select name="project_id" required>
                                <SelectTrigger className="h-10 border-border text-xs font-bold uppercase">
                                    <SelectValue placeholder="Select Job..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="text-xs font-bold uppercase">{p.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Required Date</Label>
                            <Input name="required_date" type="date" min={today} required className="h-10 border-border" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Delivery Drop-off Point</Label>
                        <Input name="delivery_location" placeholder="e.g. Gate 4, Fabrication Area..." className="h-10 border-border" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Detailed Purpose</Label>
                        <Textarea name="purpose" placeholder="Describe where this will be used..." className="min-h-[80px] border-border text-xs resize-none" required />
                    </div>
                </div>

                {/* Section 4: Attachments (UI Only) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                        <FileImage size={14} className="text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">4. Visual Reference</Label>
                    </div>
                    <div className="border-2 border-dashed border-border rounded-md p-6 text-center hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group">
                        <FileImage className="h-6 w-6 text-zinc-200 mx-auto group-hover:text-primary transition-colors" />
                        <p className="text-[9px] font-bold uppercase text-muted-foreground mt-2">Attach Photo or Drawing (Optional)</p>
                    </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-card">
                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <Send size={14} /> Dispatch Requisition to HQ
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
