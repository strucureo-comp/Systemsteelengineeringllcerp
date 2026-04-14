'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BrandingConfig {
    logo: string | null;
    primaryColor: string;
    accentColor: string;
    footerText: string;
}

interface ThemeContextType {
    branding: BrandingConfig;
    updateBranding: (branding: Partial<BrandingConfig>) => void;
    loading: boolean;
}

// Default branding - overridden by Settings > Branding
const DEFAULT_BRANDING: BrandingConfig = {
    logo: null,
    primaryColor: '#0F172A',
    accentColor: '#4F46E5',
    footerText: 'Control Tower v2.4.1',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface SavedPDFBranding {
    logo?: string | null;
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
}

// Helper functions
function readStoredJSON<T>(storageKey: string): Partial<T> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) as Partial<T> : null;
    } catch {
        return null;
    }
}

function getSavedBranding(): BrandingConfig {
    const pdfSettings = readStoredJSON<SavedPDFBranding>('pdf-settings');
    const legacyBranding =
        readStoredJSON<BrandingConfig>('branding_settings') ??
        readStoredJSON<BrandingConfig>('branding_config');

    return {
        ...DEFAULT_BRANDING,
        ...legacyBranding,
        logo: legacyBranding?.logo ?? pdfSettings?.logo ?? pdfSettings?.logoUrl ?? DEFAULT_BRANDING.logo,
        primaryColor: pdfSettings?.primaryColor || legacyBranding?.primaryColor || DEFAULT_BRANDING.primaryColor,
        accentColor: pdfSettings?.accentColor || legacyBranding?.accentColor || DEFAULT_BRANDING.accentColor,
    };
}

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

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

export function applyBrandingColors(primaryColor?: string, accentColor?: string) {
    if (typeof document === 'undefined') {
        return;
    }

    const savedBranding = getSavedBranding();
    const resolvedPrimary = primaryColor || savedBranding.primaryColor;
    const resolvedAccent = accentColor || savedBranding.accentColor;
    const root = document.documentElement;

    // Set brand hex colors as CSS variables
    root.style.setProperty('--branding-primary', resolvedPrimary);
    root.style.setProperty('--branding-accent', resolvedAccent);

    // Convert primary to HSL and apply
    const primaryRGB = hexToRGB(resolvedPrimary);
    if (primaryRGB) {
        const primaryHSL = rgbToHSL(primaryRGB.r, primaryRGB.g, primaryRGB.b);
        root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
        root.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
        root.style.setProperty('--sidebar-primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
        root.style.setProperty('--sidebar-ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
        root.style.setProperty('--chart-1', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    }

    // Convert accent to HSL and apply
    const accentRGB = hexToRGB(resolvedAccent);
    if (accentRGB) {
        const accentHSL = rgbToHSL(accentRGB.r, accentRGB.g, accentRGB.b);
        root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
        root.style.setProperty('--sidebar-accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
        root.style.setProperty('--chart-2', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const syncBranding = () => {
            const brandingData = getSavedBranding();
            setBranding(brandingData);
            applyBrandingColors();
            setLoading(false);
        };

        syncBranding();

        const handler = () => {
            syncBranding();
        };

        window.addEventListener('erp_company_settings_changed', handler);
        return () => {
            window.removeEventListener('erp_company_settings_changed', handler);
        };
    }, []);

    // Also load company settings for company name
    useEffect(() => {
        const companySaved = localStorage.getItem('company_settings');
        if (companySaved) {
            const company = JSON.parse(companySaved);
            localStorage.setItem('app_company_name', company.companyName || 'BridgeBreak');
            document.title = `${company.companyName || 'BridgeBreak'} - ERP`;
        }
    }, []);

    const updateBranding = (updates: Partial<BrandingConfig>) => {
        const newBranding = { ...branding, ...updates };
        setBranding(newBranding);
        localStorage.setItem('branding_settings', JSON.stringify(newBranding));

        // Apply the new branding immediately
        applyBrandingColors(newBranding.primaryColor, newBranding.accentColor);
    };

    return (
        <ThemeContext.Provider value={{ branding, updateBranding, loading }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
