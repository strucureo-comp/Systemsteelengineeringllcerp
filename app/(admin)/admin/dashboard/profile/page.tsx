'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Shield, ShieldCheck, FileText, Download, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getMyPayslips } from '@/lib/api';
import { generatePayslipPDF } from '@/lib/pdf-generator';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loadingPayslips, setLoadingPayslips] = useState(false);

    useEffect(() => {
        if (user) {
            fetchPayslips();
        }
    }, [user]);

    const fetchPayslips = async () => {
        try {
            setLoadingPayslips(true);
            const data = await getMyPayslips();
            setPayslips(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPayslips(false);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleSave = () => {
        toast.success("Profile mapping updated successfully.");
    };

    const handleDownload = async (payslipData: any) => {
        try {
            await generatePayslipPDF({
                payroll: payslipData.payroll,
                line: payslipData.payslip,
                currency: settings.currency
            });
            toast.success('Payslip downloaded');
        } catch (e) {
            toast.error('Failed to generate PDF');
        }
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

                        {/* Quick Stats or Additional Info could go here */}
                    </div>

                    {/* Right Col: Personal Info & Payslips */}
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

                        {/* My Payslips Section */}
                        <Card className="border-border shadow-sm">
                            <CardHeader className="border-b border-border bg-muted/20 pb-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center justify-between">
                                    My Payslips
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchPayslips} disabled={loadingPayslips}>
                                        <RefreshCcw className={cn("h-3 w-3", loadingPayslips && "animate-spin")} />
                                    </Button>
                                </CardTitle>
                                <CardDescription className="text-xs">Access and download your monthly payment records.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {loadingPayslips ? (
                                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                                        <RefreshCcw className="h-6 w-6 animate-spin text-primary/40" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Loading Records...</p>
                                    </div>
                                ) : payslips.length > 0 ? (
                                    <div className="space-y-3">
                                        {payslips.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">{item.month}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">{item.payslip?.payslip_number || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right mr-3">
                                                        <p className="text-xs font-black text-foreground">
                                                            {Number(item.payslip?.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{settings.currency || 'AED'}</p>
                                                    </div>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border" onClick={() => handleDownload(item)}>
                                                        <Download size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-muted rounded-2xl">
                                        <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Payslips Found</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 px-4 text-balance">
                                            Your monthly payslips will appear here once they are processed by the HR department.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
