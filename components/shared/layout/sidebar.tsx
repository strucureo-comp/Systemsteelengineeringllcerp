'use client';

import { useState, useEffect } from 'react';
import { DashboardNav } from './dashboard-nav';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, Cpu } from 'lucide-react';
import Link from 'next/link';
import { settingsApi } from '@/lib/settings-api';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

// Helper functions for color conversion (same as theme-context)
function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function applyBrandingColors(primaryColor: string, accentColor: string) {
  const root = document.documentElement;
  const primaryRGB = hexToRGB(primaryColor);
  if (primaryRGB) {
    const primaryHSL = rgbToHSL(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--sidebar-primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--sidebar-ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
  }
  const accentRGB = hexToRGB(accentColor);
  if (accentRGB) {
    const accentHSL = rgbToHSL(accentRGB.r, accentRGB.g, accentRGB.b);
    root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    root.style.setProperty('--sidebar-accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
  }
}

export function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('BridgeBreak');

  useEffect(() => {
    const loadSettings = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bb_token') : null;
      if (!token) return;

      try {
        const [branding, company] = await Promise.all([
          settingsApi.getBranding(),
          settingsApi.getCompany(),
        ]);

        setLogo(branding?.logo || null);
        if (branding?.primaryColor && branding?.accentColor) {
          applyBrandingColors(branding.primaryColor, branding.accentColor);
        }
        setCompanyName(company?.companyName || 'BridgeBreak');
      } catch {
        // Keep defaults when backend is unavailable.
      }
    };

    loadSettings();
    // OPTIMIZATION: Removed 30s interval. Settings are mostly static and now cached by backend.
  }, []);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen md:block transition-all duration-300 ease-in-out bg-card border-r border-border/50",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Sidebar Header - Enterprise Brand */}
        <div className={cn(
          "flex h-16 items-center shrink-0 border-b border-border/40",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}>
          <Link href="/admin/dashboard" className="flex items-center gap-3 group min-w-0">
            {logo ? (
              <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-muted shrink-0 border border-border/50 shadow-sm">
                <img src={logo} alt="Logo" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm">
                <Cpu className="h-5 w-5" />
              </div>
            )}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="font-bold text-sm text-foreground leading-none truncate tracking-tight">{companyName}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">Control Tower</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation - Logic Groups */}
        <div className="flex-1 overflow-y-auto py-8 no-scrollbar">
          <DashboardNav isCollapsed={isCollapsed} />
        </div>

        {/* Sidebar Footer - Utility */}
        <div className="p-4 border-t border-border/40 shrink-0 bg-muted/5">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
            className="h-8 w-8 rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-primary transition-all mx-auto flex items-center justify-center shadow-sm hover:shadow-md"
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
