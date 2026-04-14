'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, CheckCircle2, Globe, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { useTenant } from '@/lib/tenant-context';
import { broadcastCurrencyChange } from '@/lib/hooks/use-currency';
import { Skeleton } from '@/components/ui/skeleton';

// ============= TYPES =============

export type BusinessType = 'manufacturing' | 'services' | 'retail' | 'construction' | 'consulting' | 'logistics';
export type CompanySize = 'startup' | 'smb' | 'enterprise';

interface CountryData {
    code: string;
    name: string;
    currency: string;
    currencyCode: string;
    taxName: string;
    taxRate: number;
    fiscalYearStart: number;
    phoneCode: string;
}

interface CompanyProfile {
    companyName: string;
    businessType: BusinessType;
    companySize: CompanySize;
    country: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    baseCurrency: string;
    fiscalYearStart: string;
    defaultTaxName: string;
    defaultTaxRate: number;
}

// ============= DEFAULT VALUES =============

const DEFAULT_COMPANY: CompanyProfile = {
    companyName: '',
    businessType: 'construction',
    companySize: 'startup',
    country: 'AE',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    baseCurrency: 'AED',
    fiscalYearStart: '1',
    defaultTaxName: 'VAT',
    defaultTaxRate: 5,
};

// ============= ALL COUNTRIES DATA (Full List) =============

const ALL_COUNTRIES: CountryData[] = [
    // Middle East
    { code: 'AE', name: 'United Arab Emirates', currency: 'UAE Dirham', currencyCode: 'AED', taxName: 'VAT', taxRate: 5, fiscalYearStart: 1, phoneCode: '+971' },
    { code: 'SA', name: 'Saudi Arabia', currency: 'Saudi Riyal', currencyCode: 'SAR', taxName: 'VAT', taxRate: 15, fiscalYearStart: 1, phoneCode: '+966' },
    { code: 'KW', name: 'Kuwait', currency: 'Kuwaiti Dinar', currencyCode: 'KWD', taxName: 'VAT', taxRate: 5, fiscalYearStart: 1, phoneCode: '+965' },
    { code: 'QA', name: 'Qatar', currency: 'Qatari Riyal', currencyCode: 'QAR', taxName: 'VAT', taxRate: 5, fiscalYearStart: 1, phoneCode: '+974' },
    { code: 'BH', name: 'Bahrain', currency: 'Bahraini Dinar', currencyCode: 'BHD', taxName: 'VAT', taxRate: 5, fiscalYearStart: 1, phoneCode: '+973' },
    { code: 'OM', name: 'Oman', currency: 'Omani Rial', currencyCode: 'OMR', taxName: 'VAT', taxRate: 5, fiscalYearStart: 1, phoneCode: '+968' },

    // Asia
    { code: 'IN', name: 'India', currency: 'Indian Rupee', currencyCode: 'INR', taxName: 'GST', taxRate: 18, fiscalYearStart: 4, phoneCode: '+91' },
    { code: 'SG', name: 'Singapore', currency: 'Singapore Dollar', currencyCode: 'SGD', taxName: 'GST', taxRate: 9, fiscalYearStart: 1, phoneCode: '+65' },
    { code: 'MY', name: 'Malaysia', currency: 'Malaysian Ringgit', currencyCode: 'MYR', taxName: 'SST', taxRate: 6, fiscalYearStart: 1, phoneCode: '+60' },
    { code: 'TH', name: 'Thailand', currency: 'Thai Baht', currencyCode: 'THB', taxName: 'VAT', taxRate: 7, fiscalYearStart: 1, phoneCode: '+66' },
    { code: 'ID', name: 'Indonesia', currency: 'Indonesian Rupiah', currencyCode: 'IDR', taxName: 'VAT', taxRate: 11, fiscalYearStart: 1, phoneCode: '+62' },
    { code: 'VN', name: 'Vietnam', currency: 'Vietnamese Dong', currencyCode: 'VND', taxName: 'VAT', taxRate: 10, fiscalYearStart: 1, phoneCode: '+84' },
    { code: 'PH', name: 'Philippines', currency: 'Philippine Peso', currencyCode: 'PHP', taxName: 'VAT', taxRate: 12, fiscalYearStart: 1, phoneCode: '+63' },
    { code: 'PK', name: 'Pakistan', currency: 'Pakistani Rupee', currencyCode: 'PKR', taxName: 'GST', taxRate: 18, fiscalYearStart: 7, phoneCode: '+92' },
    { code: 'BD', name: 'Bangladesh', currency: 'Bangladeshi Taka', currencyCode: 'BDT', taxName: 'VAT', taxRate: 15, fiscalYearStart: 7, phoneCode: '+880' },
    { code: 'LK', name: 'Sri Lanka', currency: 'Sri Lankan Rupee', currencyCode: 'LKR', taxName: 'VAT', taxRate: 8, fiscalYearStart: 4, phoneCode: '+94' },
    { code: 'NP', name: 'Nepal', currency: 'Nepalese Rupee', currencyCode: 'NPR', taxName: 'VAT', taxRate: 13, fiscalYearStart: 7, phoneCode: '+977' },
    { code: 'MM', name: 'Myanmar', currency: 'Myanmar Kyat', currencyCode: 'MMK', taxName: 'Commercial Tax', taxRate: 5, fiscalYearStart: 4, phoneCode: '+95' },
    { code: 'KH', name: 'Cambodia', currency: 'Cambodian Riel', currencyCode: 'KHR', taxName: 'VAT', taxRate: 10, fiscalYearStart: 1, phoneCode: '+855' },
    { code: 'LA', name: 'Laos', currency: 'Lao Kip', currencyCode: 'LAK', taxName: 'VAT', taxRate: 10, fiscalYearStart: 1, phoneCode: '+856' },

    // Europe
    { code: 'GB', name: 'United Kingdom', currency: 'British Pound', currencyCode: 'GBP', taxName: 'VAT', taxRate: 20, fiscalYearStart: 4, phoneCode: '+44' },
    { code: 'DE', name: 'Germany', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 19, fiscalYearStart: 1, phoneCode: '+49' },
    { code: 'FR', name: 'France', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 20, fiscalYearStart: 1, phoneCode: '+33' },
    { code: 'IT', name: 'Italy', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 22, fiscalYearStart: 1, phoneCode: '+39' },
    { code: 'ES', name: 'Spain', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 21, fiscalYearStart: 1, phoneCode: '+34' },
    { code: 'NL', name: 'Netherlands', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 21, fiscalYearStart: 1, phoneCode: '+31' },
    { code: 'BE', name: 'Belgium', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 21, fiscalYearStart: 1, phoneCode: '+32' },
    { code: 'AT', name: 'Austria', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 20, fiscalYearStart: 1, phoneCode: '+43' },
    { code: 'PL', name: 'Poland', currency: 'Polish Zloty', currencyCode: 'PLN', taxName: 'VAT', taxRate: 23, fiscalYearStart: 1, phoneCode: '+48' },
    { code: 'SE', name: 'Sweden', currency: 'Swedish Krona', currencyCode: 'SEK', taxName: 'VAT', taxRate: 25, fiscalYearStart: 1, phoneCode: '+46' },
    { code: 'NO', name: 'Norway', currency: 'Norwegian Krone', currencyCode: 'NOK', taxName: 'VAT', taxRate: 25, fiscalYearStart: 1, phoneCode: '+47' },
    { code: 'DK', name: 'Denmark', currency: 'Danish Krone', currencyCode: 'DKK', taxName: 'VAT', taxRate: 25, fiscalYearStart: 1, phoneCode: '+45' },
    { code: 'FI', name: 'Finland', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 24, fiscalYearStart: 1, phoneCode: '+358' },
    { code: 'CH', name: 'Switzerland', currency: 'Swiss Franc', currencyCode: 'CHF', taxName: 'VAT', taxRate: 8.1, fiscalYearStart: 1, phoneCode: '+41' },
    { code: 'PT', name: 'Portugal', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 23, fiscalYearStart: 1, phoneCode: '+351' },
    { code: 'GR', name: 'Greece', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 24, fiscalYearStart: 1, phoneCode: '+30' },
    { code: 'IE', name: 'Ireland', currency: 'Euro', currencyCode: 'EUR', taxName: 'VAT', taxRate: 23, fiscalYearStart: 1, phoneCode: '+353' },
    { code: 'CZ', name: 'Czech Republic', currency: 'Czech Koruna', currencyCode: 'CZK', taxName: 'VAT', taxRate: 21, fiscalYearStart: 1, phoneCode: '+420' },
    { code: 'RO', name: 'Romania', currency: 'Romanian Leu', currencyCode: 'RON', taxName: 'VAT', taxRate: 19, fiscalYearStart: 1, phoneCode: '+40' },
    { code: 'HU', name: 'Hungary', currency: 'Hungarian Forint', currencyCode: 'HUF', taxName: 'VAT', taxRate: 27, fiscalYearStart: 1, phoneCode: '+36' },

    // Americas
    { code: 'US', name: 'United States', currency: 'US Dollar', currencyCode: 'USD', taxName: 'Sales Tax', taxRate: 0, fiscalYearStart: 1, phoneCode: '+1' },
    { code: 'CA', name: 'Canada', currency: 'Canadian Dollar', currencyCode: 'CAD', taxName: 'GST', taxRate: 5, fiscalYearStart: 1, phoneCode: '+1' },
    { code: 'MX', name: 'Mexico', currency: 'Mexican Peso', currencyCode: 'MXN', taxName: 'IVA', taxRate: 16, fiscalYearStart: 1, phoneCode: '+52' },
    { code: 'BR', name: 'Brazil', currency: 'Brazilian Real', currencyCode: 'BRL', taxName: 'ICMS', taxRate: 18, fiscalYearStart: 1, phoneCode: '+55' },
    { code: 'AR', name: 'Argentina', currency: 'Argentine Peso', currencyCode: 'ARS', taxName: 'IVA', taxRate: 21, fiscalYearStart: 1, phoneCode: '+54' },
    { code: 'CO', name: 'Colombia', currency: 'Colombian Peso', currencyCode: 'COP', taxName: 'IVA', taxRate: 19, fiscalYearStart: 1, phoneCode: '+57' },
    { code: 'CL', name: 'Chile', currency: 'Chilean Peso', currencyCode: 'CLP', taxName: 'IVA', taxRate: 19, fiscalYearStart: 1, phoneCode: '+56' },
    { code: 'PE', name: 'Peru', currency: 'Peruvian Sol', currencyCode: 'PEN', taxName: 'IGV', taxRate: 18, fiscalYearStart: 1, phoneCode: '+51' },

    // Africa
    { code: 'ZA', name: 'South Africa', currency: 'South African Rand', currencyCode: 'ZAR', taxName: 'VAT', taxRate: 15, fiscalYearStart: 3, phoneCode: '+27' },
    { code: 'EG', name: 'Egypt', currency: 'Egyptian Pound', currencyCode: 'EGP', taxName: 'VAT', taxRate: 14, fiscalYearStart: 7, phoneCode: '+20' },
    { code: 'NG', name: 'Nigeria', currency: 'Nigerian Naira', currencyCode: 'NGN', taxName: 'VAT', taxRate: 7.5, fiscalYearStart: 1, phoneCode: '+234' },
    { code: 'KE', name: 'Kenya', currency: 'Kenyan Shilling', currencyCode: 'KES', taxName: 'VAT', taxRate: 16, fiscalYearStart: 7, phoneCode: '+254' },
    { code: 'MA', name: 'Morocco', currency: 'Moroccan Dirham', currencyCode: 'MAD', taxName: 'VAT', taxRate: 20, fiscalYearStart: 1, phoneCode: '+212' },
    { code: 'GH', name: 'Ghana', currency: 'Ghanaian Cedi', currencyCode: 'GHS', taxName: 'VAT', taxRate: 15, fiscalYearStart: 1, phoneCode: '+233' },
    { code: 'TZ', name: 'Tanzania', currency: 'Tanzanian Shilling', currencyCode: 'TZS', taxName: 'VAT', taxRate: 18, fiscalYearStart: 7, phoneCode: '+255' },
    { code: 'UG', name: 'Uganda', currency: 'Ugandan Shilling', currencyCode: 'UGX', taxName: 'VAT', taxRate: 18, fiscalYearStart: 7, phoneCode: '+256' },
    { code: 'DZ', name: 'Algeria', currency: 'Algerian Dinar', currencyCode: 'DZD', taxName: 'VAT', taxRate: 19, fiscalYearStart: 1, phoneCode: '+213' },
    { code: 'TN', name: 'Tunisia', currency: 'Tunisian Dinar', currencyCode: 'TND', taxName: 'VAT', taxRate: 19, fiscalYearStart: 1, phoneCode: '+216' },

    // Oceania
    { code: 'AU', name: 'Australia', currency: 'Australian Dollar', currencyCode: 'AUD', taxName: 'GST', taxRate: 10, fiscalYearStart: 7, phoneCode: '+61' },
    { code: 'NZ', name: 'New Zealand', currency: 'New Zealand Dollar', currencyCode: 'NZD', taxName: 'GST', taxRate: 15, fiscalYearStart: 4, phoneCode: '+64' },

    // Asia Pacific
    { code: 'JP', name: 'Japan', currency: 'Japanese Yen', currencyCode: 'JPY', taxName: 'Consumption Tax', taxRate: 10, fiscalYearStart: 4, phoneCode: '+81' },
    { code: 'KR', name: 'South Korea', currency: 'South Korean Won', currencyCode: 'KRW', taxName: 'VAT', taxRate: 10, fiscalYearStart: 1, phoneCode: '+82' },
    { code: 'CN', name: 'China', currency: 'Chinese Yuan', currencyCode: 'CNY', taxName: 'VAT', taxRate: 13, fiscalYearStart: 1, phoneCode: '+86' },
    { code: 'HK', name: 'Hong Kong', currency: 'Hong Kong Dollar', currencyCode: 'HKD', taxName: 'GST', taxRate: 0, fiscalYearStart: 4, phoneCode: '+852' },
    { code: 'TW', name: 'Taiwan', currency: 'Taiwan Dollar', currencyCode: 'TWD', taxName: 'VAT', taxRate: 5, fiscalYearStart: 1, phoneCode: '+886' },
];

// ============= MAIN COMPONENT =============

export default function CompanySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
    const { refreshTenantStatus } = useTenant();

    useEffect(() => {
        const loadCompany = async () => {
            try {
                const data = await settingsApi.getCompany();
                setCompany({
                    ...DEFAULT_COMPANY,
                    ...data,
                    fiscalYearStart: String(data?.fiscalYearStart ?? DEFAULT_COMPANY.fiscalYearStart),
                });
            } catch (error: any) {
                toast.error(error?.message || 'Failed to load company settings');
            } finally {
                setLoading(false);
            }
        };
        loadCompany();
    }, []);

    const handleCountryChange = (countryCode: string) => {
        const country = ALL_COUNTRIES.find(c => c.code === countryCode);
        if (country) {
            setCompany({
                ...company,
                country: countryCode,
                baseCurrency: country.currencyCode,
                fiscalYearStart: country.fiscalYearStart.toString(),
                defaultTaxName: country.taxName,
                defaultTaxRate: country.taxRate,
            });
        }
    };

    const selectedCountry = ALL_COUNTRIES.find(c => c.code === company.country);

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.saveCompany({
                ...company,
                fiscalYearStart: String(company.fiscalYearStart),
            });
            broadcastCurrencyChange(company.baseCurrency);
            await refreshTenantStatus();

            // Broadcast event
            window.dispatchEvent(new CustomEvent('erp_company_settings_changed', {
                detail: {
                    companyName: company.companyName,
                    address: company.address,
                    phone: company.phone,
                    email: company.email,
                    website: company.website,
                    taxId: company.taxId,
                    baseCurrency: company.baseCurrency,
                    country: company.country
                }
            }));

            // Sync for PDF
            const existingPdfSettings = JSON.parse(localStorage.getItem('pdf-settings') || '{}');
            const syncedPdfSettings = {
                ...existingPdfSettings,
                companyName: company.companyName,
                companyAddress: company.address,
                companyPhone: company.phone,
                companyEmail: company.email,
                companyTRN: company.taxId,
                currency: company.baseCurrency,
                address: company.address,
                phone: company.phone,
                email: company.email,
                website: company.website,
                taxId: company.taxId
            };
            localStorage.setItem('pdf-settings', JSON.stringify(syncedPdfSettings));
            localStorage.setItem('erp_pdf_settings', JSON.stringify(syncedPdfSettings));
            localStorage.setItem('company_settings', JSON.stringify(company));
            window.dispatchEvent(new Event('erp_settings_updated'));

            toast.success('Company settings saved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save company settings');
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
                <Skeleton className="h-[400px] w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Company</h1>
                <p className="text-muted-foreground">Your company identity and location</p>
            </div>

            {/* Company Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Company Information</CardTitle>
                    <CardDescription>Basic company details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                                value={company.companyName}
                                onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                                placeholder="Enter company name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tax ID / TRN</Label>
                            <Input
                                value={company.taxId}
                                onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                                placeholder="Tax Registration Number"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Business Type</Label>
                            <Select
                                value={company.businessType}
                                onValueChange={(v) => setCompany({ ...company, businessType: v as BusinessType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                    <SelectItem value="construction">Construction</SelectItem>
                                    <SelectItem value="services">Services</SelectItem>
                                    <SelectItem value="retail">Retail</SelectItem>
                                    <SelectItem value="logistics">Logistics</SelectItem>
                                    <SelectItem value="consulting">Consulting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Company Size</Label>
                            <Select
                                value={company.companySize}
                                onValueChange={(v) => setCompany({ ...company, companySize: v as CompanySize })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="startup"> Startup</SelectItem>
                                    <SelectItem value="smb"> Small Business</SelectItem>
                                    <SelectItem value="enterprise"> Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Country
                            </Label>
                            <Select
                                value={company.country}
                                onValueChange={(v) => handleCountryChange(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {ALL_COUNTRIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.name} ({c.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input
                            value={company.address}
                            onChange={(e) => setCompany({ ...company, address: e.target.value })}
                            placeholder="Full company address"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={company.email}
                                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                                placeholder="email@company.com"
                                type="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={company.phone}
                                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                                placeholder={selectedCountry?.phoneCode ? `${selectedCountry.phoneCode} xxx xxxx` : "Enter phone number"}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                                value={company.website}
                                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                                placeholder="www.company.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Auto-Configured Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Auto-Configured from Country
                    </CardTitle>
                    <CardDescription>These are automatically set based on your country selection</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-background">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Currency</p>
                                <p className="text-lg font-semibold">{company.baseCurrency} - {selectedCountry?.currency || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-background">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Tax</p>
                                <p className="text-lg font-semibold">{company.defaultTaxName} {company.defaultTaxRate}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-background">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Fiscal Year</p>
                                <p className="text-lg font-semibold">
                                    {company.fiscalYearStart === '1' ? 'January' :
                                     company.fiscalYearStart === '4' ? 'April' :
                                     company.fiscalYearStart === '7' ? 'July' : 'October'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
