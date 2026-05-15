'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandingConfig {
    logo: string | null;
    primaryColor: string;
    accentColor: string;
    footerText: string;
    favicon: string | null;
    authorizedSignature: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
    logo: null,
    primaryColor: '#0F172A',
    accentColor: '#10B981',
    footerText: '',
    favicon: null,
    authorizedSignature: null,
};

const COLOR_PRESETS = [
    { name: 'White + Red', primary: '#FFFFFF', accent: '#DC2626' },
    { name: 'Red', primary: '#DC2626', accent: '#EF4444' },
    { name: 'Emerald', primary: '#059669', accent: '#10B981' },
    { name: 'Blue', primary: '#2563EB', accent: '#3B82F6' },
    { name: 'Purple', primary: '#7C3AED', accent: '#8B5CF6' },
    { name: 'Rose', primary: '#E11D48', accent: '#F43F5E' },
    { name: 'Orange', primary: '#EA580C', accent: '#F97316' },
    { name: 'Slate', primary: '#0F172A', accent: '#10B981' },
    { name: 'Teal', primary: '#0D9488', accent: '#14B8A6' },
    { name: 'Indigo', primary: '#4338CA', accent: '#6366F1' },
];

function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
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

function applyFavicon(faviconData: string) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
    link.rel = 'icon';
    link.href = faviconData;
    if (!document.querySelector("link[rel~='icon']")) {
        document.head.appendChild(link);
    }
}

export default function BrandingSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadBranding = async () => {
            try {
                const parsed = await settingsApi.getBranding();
                const next = { ...DEFAULT_BRANDING, ...parsed };
                setBranding(next);
                if (next.primaryColor && next.accentColor) {
                    applyBrandingColors(next.primaryColor, next.accentColor);
                }
                if (next.favicon) {
                    applyFavicon(next.favicon);
                }
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load branding');
            } finally {
                setLoading(false);
            }
        };
        loadBranding();
    }, []);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size <= 2 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = () => setBranding({ ...branding, logo: reader.result as string });
            reader.readAsDataURL(file);
        } else {
            toast.error('File size must be under 2MB');
        }
    };

    const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size <= 512 * 1024) {
            const reader = new FileReader();
            reader.onload = () => {
                setBranding({ ...branding, favicon: reader.result as string });
                applyFavicon(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            toast.error('File size must be under 512KB');
        }
    };
    
    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size <= 1 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = () => setBranding({ ...branding, authorizedSignature: reader.result as string });
            reader.readAsDataURL(file);
        } else {
            toast.error('File size must be under 1MB');
        }
    };

    const handleColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
        setBranding({ ...branding, primaryColor: preset.primary, accentColor: preset.accent });
        applyBrandingColors(preset.primary, preset.accent);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.saveBranding(branding);
            applyBrandingColors(branding.primaryColor, branding.accentColor);

            // Broadcast event
            window.dispatchEvent(new CustomEvent('erp_company_settings_changed', {
                detail: {
                    logo: branding.logo,
                    footerText: branding.footerText,
                    primaryColor: branding.primaryColor,
                    accentColor: branding.accentColor
                }
            }));

            // Sync for PDF
            const existingPdfSettings = JSON.parse(localStorage.getItem('pdf-settings') || '{}');
            const syncedPdfSettings = {
                ...existingPdfSettings,
                logo: branding.logo,
                primaryColor: branding.primaryColor,
                accentColor: branding.accentColor,
                footerText: branding.footerText,
                favicon: branding.favicon,
                authorizedSignature: branding.authorizedSignature,
            };
            localStorage.setItem('pdf-settings', JSON.stringify(syncedPdfSettings));
            localStorage.setItem('erp_pdf_settings', JSON.stringify(syncedPdfSettings));
            localStorage.setItem('branding_settings', JSON.stringify(branding));
            window.dispatchEvent(new Event('erp_settings_updated'));

            toast.success('Branding saved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save branding');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[500px] w-full rounded-xl" />
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-semibold">Branding</h1>
                <p className="text-muted-foreground">Customize your application logo and colors</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Theme & Colors</CardTitle>
                        <CardDescription>Choose your primary and accent colors</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Quick Presets</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {COLOR_PRESETS.map((preset) => (
                                    <button key={preset.name} onClick={() => handleColorPreset(preset)} className="h-10 rounded-lg border-2 overflow-hidden relative hover:scale-105 transition-transform" style={{ backgroundColor: preset.primary, borderColor: branding.primaryColor === preset.primary && branding.accentColor === preset.accent ? 'var(--primary)' : 'transparent' }} title={preset.name}>
                                        <div className="absolute bottom-0 right-0 w-4 h-4" style={{ backgroundColor: preset.accent }} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Primary Color</Label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={branding.primaryColor} onChange={(e) => { setBranding({ ...branding, primaryColor: e.target.value }); applyBrandingColors(e.target.value, branding.accentColor); }} className="h-10 w-10 rounded cursor-pointer border" />
                                    <Input value={branding.primaryColor} onChange={(e) => { setBranding({ ...branding, primaryColor: e.target.value }); applyBrandingColors(e.target.value, branding.accentColor); }} className="font-mono" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Accent Color</Label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={branding.accentColor} onChange={(e) => { setBranding({ ...branding, accentColor: e.target.value }); applyBrandingColors(branding.primaryColor, e.target.value); }} className="h-10 w-10 rounded cursor-pointer border" />
                                    <Input value={branding.accentColor} onChange={(e) => { setBranding({ ...branding, accentColor: e.target.value }); applyBrandingColors(branding.primaryColor, e.target.value); }} className="font-mono" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Company Logo (Sidebar)</Label>
                            <div className="flex items-center gap-4">
                                <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80" onClick={() => fileInputRef.current?.click()}>
                                    {branding.logo ? <img src={branding.logo} alt="Logo" className="h-full w-full object-contain p-1" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                <div>
                                    <p className="text-sm font-medium">Upload Logo</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG. Max 2MB</p>
                                </div>
                                {branding.logo && <Button variant="outline" size="sm" onClick={() => setBranding({ ...branding, logo: null })}><X className="h-4 w-4" /></Button>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Site Tab Icon (Favicon)</Label>
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80" onClick={() => faviconInputRef.current?.click()}>
                                    {branding.favicon ? <img src={branding.favicon} alt="Favicon" className="h-full w-full object-contain p-1" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                                <div>
                                    <p className="text-sm font-medium">Upload Favicon</p>
                                    <p className="text-xs text-muted-foreground">PNG, ICO. 16x16 or 32x32</p>
                                </div>
                                {branding.favicon && <Button variant="outline" size="sm" onClick={() => setBranding({ ...branding, favicon: null })}><X className="h-4 w-4" /></Button>}
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <Label>Official Authorized Signature</Label>
                            <CardDescription className="mb-2 text-xs">This signature will appear on official company documents (PDFs)</CardDescription>
                            <div className="flex items-center gap-4">
                                <div className="h-24 w-48 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80" onClick={() => signatureInputRef.current?.click()}>
                                    {branding.authorizedSignature ? <img src={branding.authorizedSignature} alt="Signature" className="h-full w-full object-contain p-2" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                                <div>
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => signatureInputRef.current?.click()}>
                                        <Upload className="h-3 w-3" />
                                        Upload Image
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground mt-1">Recommended: Transparent PNG, 400x200px</p>
                                </div>
                                {branding.authorizedSignature && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setBranding({ ...branding, authorizedSignature: null })}><X className="h-4 w-4" /></Button>}
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-muted/30 p-2 text-xs font-medium text-muted-foreground">Sidebar</div>
                            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--background)' }}>
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: branding.primaryColor }}>
                                    {branding.logo ? <img src={branding.logo} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-xs font-bold">B</span>}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Company Name</p>
                                    <p className="text-xs text-muted-foreground">Enterprise OS</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 space-y-1">
                                <div className="h-8 rounded-md flex items-center gap-2 px-3 text-sm" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>Dashboard</div>
                                <div className="h-8 rounded-md flex items-center gap-2 px-3 text-sm text-muted-foreground hover:bg-accent">Sales</div>
                            </div>
                        </div>
                        <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex gap-2">
                                <button className="px-4 py-2 rounded-md text-white text-sm font-medium" style={{ backgroundColor: branding.primaryColor }}>Primary</button>
                                <button className="px-4 py-2 rounded-md text-white text-sm font-medium" style={{ backgroundColor: branding.accentColor }}>Accent</button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
