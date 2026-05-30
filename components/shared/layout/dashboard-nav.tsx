'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Building2,
    DollarSign,
    ShoppingCart,
    Cog,
    Users,
    BarChart3,
    Settings,
    ChevronRight,
    Database,
    Factory,
    Warehouse,
    Briefcase,
    Package,
    ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTenant } from '@/lib/tenant-context';

interface NavItem {
    title: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    section?: string;
    moduleKey?: string;
    comingSoon?: boolean;
}

export const adminNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, section: 'Core' },
    { title: 'Sales Hub', href: '/admin/sales', icon: ShoppingCart, section: 'Operations', moduleKey: 'sales' },
    { title: 'Procurement', href: '/admin/purchases', icon: Building2, section: 'Operations', moduleKey: 'purchases' },
    { title: 'Manufacturing', href: '/admin/manufacturing', icon: Factory, section: 'Operations', moduleKey: 'manufacturing' },
    { title: 'Inventory', href: '/admin/finance/inventory', icon: Package, section: 'Operations', moduleKey: 'inventory' },
    { title: 'Projects', href: '/admin/projects', icon: Briefcase, section: 'Operations', moduleKey: 'projects' },
    { title: 'HR & Teams', href: '/admin/hr', icon: Users, section: 'Operations', moduleKey: 'hr' },
    { title: 'Finance Center', href: '/admin/finance', icon: DollarSign, section: 'Finance', moduleKey: 'finance' },
    { title: 'Reports hub', href: '/admin/reports', icon: BarChart3, section: 'System', moduleKey: 'reports' },
    { title: 'System Hub', href: '/admin/settings', icon: Settings, section: 'System' },
];

export function DashboardNav({ isCollapsed, onNavClick }: { isCollapsed?: boolean; onNavClick?: () => void }) {
    const pathname = usePathname();
    const { getModuleLabel, checkAccess } = useTenant();

    const renderItem = (item: NavItem) => {
        const Icon = item.icon;
        const label = item.moduleKey ? getModuleLabel(item.moduleKey) : item.title;
        const isActive = item.href ? (pathname === item.href || pathname.startsWith(item.href + '/')) : false;

        return (
            <TooltipProvider key={item.title} delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href={item.comingSoon ? '#' : (item.href || '#')}
                            onClick={onNavClick}
                            className={cn(
                                'flex items-center rounded-xl transition-all duration-300 ease-in-out group mb-1 overflow-hidden',
                                isCollapsed
                                    ? 'justify-center w-10 h-10 mx-auto'
                                    : 'gap-3.5 px-3.5 py-2.5 w-full',
                                isActive
                                    ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                item.comingSoon && "opacity-30 cursor-not-allowed grayscale hover:bg-transparent"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center transition-transform duration-300 shrink-0",
                                isCollapsed ? "" : "group-hover:scale-110"
                            )}>
                                <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            </div>

                            <div className={cn(
                                "flex items-center justify-between transition-all duration-300 ease-in-out whitespace-nowrap",
                                isCollapsed ? "max-w-0 opacity-0 px-0 invisible" : "flex-1 opacity-100 max-w-full visible"
                            )}>
                                <span className="text-[13px] font-bold tracking-tight truncate">
                                    {label}
                                </span>
                                {item.comingSoon ? (
                                    <Badge variant="outline" className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-1.5 h-4 ml-2 border-transparent",
                                        isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                    )}>SOON</Badge>
                                ) : isActive && (
                                    <ChevronRight className="h-3 w-3 opacity-40 ml-2" />
                                )}
                            </div>
                        </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent side="right" sideOffset={12} className="bg-black text-white border-none rounded-md text-[12px] font-extrabold px-3 py-2 flex items-center gap-2 shadow-2xl">
                            {label}
                            {item.comingSoon && <Badge className="bg-red-500/20 text-red-500 border-none text-[8px] h-4 ml-1 px-1.5 font-black uppercase tracking-widest">SOON</Badge>}
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        );
    };

    let lastSection = '';

    return (
        <nav className="flex flex-col px-3 gap-0.5">
            {adminNavItems.filter((item) => {
                if (!item.moduleKey) return true;
                return checkAccess(item.moduleKey as any).accessible;
            }).map((item) => {
                const isHeader = item.section && item.section !== lastSection;
                if (item.section) lastSection = item.section;

                return (
                    <div key={item.title}>
                        {isHeader && (
                            <div className={cn(
                                "transition-all duration-300 ease-in-out overflow-hidden flex items-end whitespace-nowrap",
                                isCollapsed ? "h-0 opacity-0" : "h-12 opacity-100"
                            )}>
                                <h4 className="mb-4 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] opacity-60">
                                    {item.section}
                                </h4>
                            </div>
                        )}
                        {renderItem(item)}
                    </div>
                );
            })}
        </nav>
    );
}
