'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { useTenant } from '@/lib/tenant-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { DashboardNav } from './dashboard-nav';
import { ApprovalsInbox } from './approvals-inbox';
import {
  Menu,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Bell,
  Search,
  Command,
  Sparkles,
  Cpu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Safely get tenant data with fallbacks
  let tenantStatus = null;
  let brandingConfig = null;
  let companyProfile = null;

  try {
    const tenant = useTenant();
    tenantStatus = tenant.tenantStatus;
    brandingConfig = tenant.brandingConfig;
    companyProfile = tenant.companyProfile;
  } catch (error) {
    console.warn('Tenant context not available in Header');
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className={cn(
      "h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between px-8 transition-all duration-300",
      scrolled && "shadow-sm shadow-foreground/5"
    )}>
      <div className="flex items-center gap-4">
        {/* Mobile Nav */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-lg">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 border-r border-border bg-background">
            <div className="p-8 border-b border-border/40 bg-muted/5 flex items-center gap-4">
              {brandingConfig?.logo ? (
                <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-background shrink-0 border border-border/50">
                  <img src={brandingConfig.logo} alt="Logo" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
              )}
              <SheetTitle className="text-sm font-black text-foreground tracking-tight">
                {companyProfile?.tradingName || 'Enterprise Workspace'}
              </SheetTitle>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-80px)] pb-12 no-scrollbar">
              <DashboardNav onNavClick={() => setIsOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Dynamic Status Indicator */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10">
           <div className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
           </div>
           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none">
             System Operational
           </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Action Inbox */}
        <div className="flex items-center">
            <ApprovalsInbox />
        </div>

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* User Workspace Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-3 px-2 rounded-xl hover:bg-muted/50 transition-all group">
              <Avatar className="h-8 w-8 rounded-lg border border-border/50 shadow-sm transition-transform group-hover:scale-105">
                <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-black">
                  {user ? getInitials(user.full_name) : 'SA'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-[12px] font-black text-foreground leading-none tracking-tight">{user?.full_name || 'System Admin'}</p>
                <p className="text-[9px] font-black text-muted-foreground mt-1 uppercase tracking-[0.1em] opacity-60">{tenantStatus?.business_type || 'Executive'}</p>
              </div>
              <ChevronDown size={12} className="text-muted-foreground/40 group-hover:text-primary transition-colors ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-2xl border-border/50 shadow-2xl p-2" align="end" sideOffset={12}>
            <DropdownMenuLabel className="p-4 mb-2 rounded-xl bg-muted/30">
              <div className="flex flex-col space-y-1.5">
                <p className="text-[13px] font-black text-foreground tracking-tight">{user?.full_name}</p>
                <p className="text-[11px] font-bold text-muted-foreground truncate opacity-70">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuItem asChild className="text-[12px] font-bold py-2.5 px-4 cursor-pointer focus:bg-primary/10 focus:text-primary rounded-xl transition-all">
              <Link href="/admin/dashboard/profile" className="flex items-center">
                <User className="mr-3 h-4 w-4 opacity-50" /> Account Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[12px] font-bold py-2.5 px-4 cursor-pointer focus:bg-primary/10 focus:text-primary rounded-xl transition-all">
              <Link href="/admin/settings" className="flex items-center">
                <Settings className="mr-3 h-4 w-4 opacity-50" /> System Settings
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2 bg-border/40" />
            
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-[12px] font-black py-2.5 px-4 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-xl transition-all"
            >
              <LogOut className="mr-3 h-4 w-4 opacity-50" /> Terminate Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
