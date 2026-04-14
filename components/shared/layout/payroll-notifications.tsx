'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings-context';

export function PayrollNotifications() {
    const router = useRouter();
    const { settings } = useSettings();
    const [pendingPayrolls, setPendingPayrolls] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch pending payroll approvals on component mount
    useEffect(() => {
        const fetchPendingPayrolls = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Fetch pending payrolls for the current user
                const response = await fetch('http://localhost:4000/api/hrms/payrolls?status=pending_approval', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setPendingPayrolls(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to fetch pending payrolls", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPendingPayrolls();
        
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchPendingPayrolls, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.currency,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 rounded-lg relative transition-colors"
                >
                    <DollarSign size={18} />
                    {pendingPayrolls.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-600 text-[8px] font-black text-white ring-2 ring-background">
                            {pendingPayrolls.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0 border-border shadow-xl rounded-xl">
                <div className="flex items-center justify-between p-4 border-b bg-muted/10">
                    <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Payroll Approvals</h4>
                        <p className="text-[10px] font-medium text-muted-foreground">Pending authorization</p>
                    </div>
                    {pendingPayrolls.length > 0 && (
                        <Badge variant="outline" className="text-[9px] font-black h-5 px-2 bg-amber-50 text-amber-600 border-amber-200">
                            {pendingPayrolls.length} PENDING
                        </Badge>
                    )}
                </div>

                <ScrollArea className="h-[320px]">
                    {pendingPayrolls.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">All Approved</p>
                                <p className="text-[10px] text-muted-foreground mt-1">No pending payroll cycles</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {pendingPayrolls.map((payroll) => (
                                <DropdownMenuItem
                                    key={String(payroll.id)}
                                    className="p-4 hover:bg-muted/30 transition-colors group cursor-pointer flex flex-col items-stretch outline-none focus:bg-muted/30"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        router.push(`/admin/hr/payroll/${payroll.id}`);
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2 w-full">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded bg-white border shadow-sm flex items-center justify-center text-amber-600">
                                                <DollarSign className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-foreground">{payroll.month || 'Payroll Cycle'}</p>
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase opacity-80">{payroll.payroll_id || payroll.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-700">{formatCurrency(Number(payroll.total_amount || 0))}</p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">
                                                {payroll.lines?.length || 0} employees
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                Pending Approval
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t bg-muted/10">
                    <Button 
                        variant="ghost" 
                        className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                        onClick={() => router.push('/admin/hr/payroll')}
                    >
                        View All Payrolls <ArrowRight className="h-3 w-3 ml-2" />
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
