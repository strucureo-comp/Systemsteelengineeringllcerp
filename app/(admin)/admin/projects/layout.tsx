'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Briefcase, ChevronRight } from 'lucide-react';

const projectsNav = [
    {
        title: 'General',
        items: [
            { title: 'All Projects', href: '/admin/projects', icon: Briefcase },
        ]
    }
];

interface ProjectsLayoutProps {
    children: React.ReactNode;
}

export default function ProjectsLayout({ children }: ProjectsLayoutProps) {
    const pathname = usePathname();

    return (
        <>
            <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 flex min-h-[calc(100vh-3.5rem)]">
                {/* Left Sidebar */}
                <aside className="w-64 shrink-0 border-r bg-card overflow-y-auto">
                    <nav className="p-4 space-y-6">
                        {projectsNav.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin/projects');
                                        
                                        // Specific handling for root highlight
                                        const isRootActive = item.href === '/admin/projects' && (pathname === '/admin/projects' || pathname.startsWith('/admin/projects/'));
                                        
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                                    (isActive || isRootActive)
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </div>
                                                <ChevronRight className="h-3 w-3 opacity-50" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </>
    );
}
