'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { 
    ShoppingCart, 
    Receipt, 
    FileText, 
    Truck, 
    DollarSign, 
    Users, 
    Clock, 
    CreditCard, 
    BarChart3, 
    Building2, 
    Scale,
    Plus,
    ChevronRight,
    ArrowUpRight,
    ShieldCheck,
    Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const modules = [
        {
            category: 'Operations',
            items: [
                { title: 'Sales Hub', desc: 'Quotations, Invoices & Delivery', href: '/admin/sales', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { title: 'Procurement', desc: 'Purchase Orders & Vendor Bills', href: '/admin/purchases', icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { title: 'HR & Teams', desc: 'Directory, Payroll & Time', href: '/admin/hr', icon: Users, color: 'text-orange-600', bg: 'bg-orange-500/10' },
            ]
        },
        {
            category: 'Finance',
            items: [
                { title: 'Finance Center', desc: 'General Ledger & Banking', href: '/admin/finance', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { title: 'Approvals', desc: 'Workflow & Document Control', href: '/admin/finance/approvals', icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-500/10' },
            ]
        },
        {
            category: 'System',
            items: [
                { title: 'Reports hub', desc: 'Analytical telemetry & logs', href: '/admin/reports', icon: BarChart3, color: 'text-slate-600', bg: 'bg-slate-500/10' },
                { title: 'System Hub', desc: 'Company Profile & Settings', href: '/admin/settings', icon: Settings, iconImport: true, color: 'text-zinc-600', bg: 'bg-zinc-500/10' },
            ]
        }
    ];

    if (!isMounted) return null;

    return (
        <div className="space-y-10 max-w-4xl pb-20">
            {/* Header Area */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em] opacity-80">
                    <ShieldCheck className="h-3 w-3" />
                    Operational Dashboard
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Welcome, {user?.full_name?.split(' ')[0] || 'Admin'}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Enterprise command center tracking real-time operational telemetry and cross-module performance.
                </p>
            </div>

            {/* Quick Actions - Floating bar feel */}
            <div className="flex flex-wrap items-center gap-3 py-1">
                <Button 
                    size="sm" 
                    className="h-9 px-5 gap-2 rounded-xl font-bold text-xs shadow-sm shadow-primary/20 hover:shadow-md transition-all"
                    onClick={() => router.push('/admin/sales/invoices/new')}
                >
                    <Plus className="h-3.5 w-3.5" />
                    New Invoice
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-5 gap-2 rounded-xl font-bold text-xs border-border/60 hover:bg-muted/50"
                    onClick={() => router.push('/admin/reports')}
                >
                    <BarChart3 className="h-3.5 w-3.5 opacity-60" />
                    Analytics Hub
                </Button>
            </div>

            {/* Executive Metrics - Analytical & Clean */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricTile 
                    label="Today's Sales" 
                    value="AED 42.4K" 
                    trend="+12.5%" 
                    icon={DollarSign} 
                    positive 
                />
                <MetricTile 
                    label="Pending Bills" 
                    value="8 Overdue" 
                    subValue="AED 12,800" 
                    icon={Receipt} 
                    negative 
                />
                <MetricTile 
                    label="Active Users" 
                    value="12 Online" 
                    subValue="Peak: 24" 
                    icon={Users} 
                />
                <MetricTile 
                    label="System Health" 
                    value="Optimal" 
                    subValue="Lat: 24ms" 
                    icon={ShieldCheck} 
                    status="success" 
                />
            </div>

            {/* Main Operational Modules */}
            <div className="space-y-10 pt-4">
                {modules.map((section) => (
                    <div key={section.category} className="space-y-5">
                        <div className="flex items-center gap-3 px-1">
                            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                {section.category}
                            </h2>
                            <div className="h-px flex-1 bg-border/40" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.items.map((item) => (
                                <Card 
                                    key={item.title} 
                                    className="group cursor-pointer hover:bg-muted/30 transition-all duration-300 border-border/40 hover:border-primary/30 rounded-2xl overflow-hidden"
                                    onClick={() => router.push(item.href)}
                                >
                                    <div className="flex items-center p-5 gap-5">
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm", 
                                            "bg-muted/50 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary border border-border/50"
                                        )}>
                                            <item.icon size={22} className="transition-transform duration-500 group-hover:scale-110" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors tracking-tight">
                                                {item.title}
                                            </h3>
                                            <p className="text-[12px] text-muted-foreground truncate opacity-80 mt-0.5">
                                                {item.desc}
                                            </p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:bg-primary/10">
                                            <ChevronRight className="h-4 w-4 text-primary" />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricTile({ 
    label, 
    value, 
    subValue, 
    trend, 
    icon: Icon, 
    positive, 
    negative, 
    status 
}: { 
    label: string; 
    value: string; 
    subValue?: string;
    trend?: string;
    icon: any;
    positive?: boolean;
    negative?: boolean;
    status?: 'success' | 'warning' | 'error';
}) {
    return (
        <Card className="border-border/50 bg-card hover:border-primary/20 transition-all shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground">
                        <Icon className="h-4 w-4" />
                    </div>
                    {trend && (
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                            positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        )}>
                            {trend}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-foreground tracking-tight mt-1 truncate">
                        {value}
                    </p>
                    {subValue && (
                        <p className="text-[10px] text-muted-foreground font-medium mt-1 opacity-70 truncate">
                            {subValue}
                        </p>
                    )}
                </div>
                {status === 'success' && (
                    <div className="h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden mt-1">
                        <div className="h-full w-full bg-emerald-500 animate-pulse" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
