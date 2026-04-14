'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTenant } from '@/lib/tenant-context';
import { adminNavItems } from './dashboard-nav';

const MOBILE_PREFERRED_ORDER = ['dashboard', 'finance', 'sales', 'hr', 'settings'];
const MOBILE_FALLBACK_HREF = '/admin/dashboard';

export function MobileNav() {
    const pathname = usePathname();
    const { checkAccess, getModuleLabel } = useTenant();

    const mobileItems = MOBILE_PREFERRED_ORDER
        .map((key) => {
            const item = adminNavItems.find((nav) => {
                if (key === 'dashboard') return nav.href === '/admin/dashboard';
                if (key === 'settings') return nav.href === '/admin/settings';
                return nav.moduleKey === key;
            });
            return item || null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter((item) => {
            if (!item.moduleKey) return true;
            return checkAccess(item.moduleKey as any).accessible;
        });

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-card dark:bg-black border-t border-border dark:border-zinc-800 md:hidden px-4">
            <div className="grid h-full items-center justify-items-center" style={{ gridTemplateColumns: `repeat(${Math.max(mobileItems.length, 1)}, minmax(0, 1fr))` }}>
                {mobileItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    const label = item.moduleKey ? getModuleLabel(item.moduleKey) : item.title;
                    const shortLabel = label.split(' ')[0] || label;

                    return (
                        <Link
                            key={item.href || item.title}
                            href={item.href || MOBILE_FALLBACK_HREF}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                isActive 
                                    ? "text-primary font-bold" 
                                    : "text-muted-foreground dark:text-zinc-400"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                            <span className="text-[10px] uppercase tracking-tighter font-black">{shortLabel}</span>
                            {isActive && <div className="absolute bottom-0 h-1 w-8 bg-primary rounded-t-full" />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
