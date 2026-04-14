'use client';

import { useAuth } from '@/lib/auth/context';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
    const { user } = useAuth();

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleSave = () => {
        toast.success("Profile mapping updated successfully.");
    };

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-6 max-w-4xl mx-auto pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                            <User className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">Account Profile</h1>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Personal Identity Data</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Col: Avatar & Status */}
                    <div className="space-y-6">
                        <Card className="border-border shadow-sm overflow-hidden text-center">
                            <CardContent className="pt-8 pb-6 flex flex-col items-center">
                                <Avatar className="h-24 w-24 rounded-2xl border-4 border-background shadow-lg mb-4 ring-2 ring-primary/20">
                                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black rounded-2xl">
                                        {user ? getInitials(user.full_name) : 'SA'}
                                    </AvatarFallback>
                                </Avatar>
                                <h3 className="text-lg font-bold text-foreground">{user?.full_name || 'System Admin'}</h3>
                                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{user?.role || 'Administrator'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Col: Personal Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="border-b border-border bg-muted/20 pb-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Identity Information</CardTitle>
                                <CardDescription className="text-xs">Manage your personal details and system credentials.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Full Legal Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input defaultValue={user?.full_name || 'System Admin'} className="pl-9 h-10 border-border bg-background" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input defaultValue={user?.email || 'admin@example.com'} disabled className="pl-9 h-10 border-border bg-muted opacity-60" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Contact your system administrator to change your email address.</p>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleSave} className="h-9 px-6 text-xs font-bold uppercase tracking-widest">
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
