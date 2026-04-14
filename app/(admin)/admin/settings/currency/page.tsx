'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, CheckCircle2, Globe, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { useTenant } from '@/lib/tenant-context';
import { broadcastCurrencyChange } from '@/lib/hooks/use-currency';
import { Skeleton } from '@/components/ui/skeleton';

// ============= TYPES =============

interface FinanceConfig {
    baseCurrency: string;
    fiscalYearStart: string;
    accountingMethod: 'accrual' | 'cash';
    selectedCountry: string;
}

interface Currency {
    code: string;
    name: string;
    symbol: string;
    flag: string;
}

interface CountryCurrency {
    code: string;
    countryName: string;
    currency: Currency;
    fiscalYearStart: number;
}

// ============= ALL COUNTRIES WITH CURRENCIES =============

const ALL_COUNTRIES_CURRENCIES: CountryCurrency[] = [
    // Middle East
    { code: 'AE', countryName: 'United Arab Emirates', currency: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' }, fiscalYearStart: 1 },
    { code: 'SA', countryName: 'Saudi Arabia', currency: { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' }, fiscalYearStart: 1 },
    { code: 'KW', countryName: 'Kuwait', currency: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' }, fiscalYearStart: 1 },
    { code: 'QA', countryName: 'Qatar', currency: { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' }, fiscalYearStart: 1 },
    { code: 'BH', countryName: 'Bahrain', currency: { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', flag: '🇧🇭' }, fiscalYearStart: 1 },
    { code: 'OM', countryName: 'Oman', currency: { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', flag: '🇴🇲' }, fiscalYearStart: 1 },

    // Asia
    { code: 'IN', countryName: 'India', currency: { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', flag: '🇮🇳' }, fiscalYearStart: 4 },
    { code: 'SG', countryName: 'Singapore', currency: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' }, fiscalYearStart: 1 },
    { code: 'MY', countryName: 'Malaysia', currency: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' }, fiscalYearStart: 1 },
    { code: 'TH', countryName: 'Thailand', currency: { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' }, fiscalYearStart: 1 },
    { code: 'ID', countryName: 'Indonesia', currency: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' }, fiscalYearStart: 1 },
    { code: 'VN', countryName: 'Vietnam', currency: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' }, fiscalYearStart: 1 },
    { code: 'PH', countryName: 'Philippines', currency: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' }, fiscalYearStart: 1 },
    { code: 'PK', countryName: 'Pakistan', currency: { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' }, fiscalYearStart: 7 },
    { code: 'BD', countryName: 'Bangladesh', currency: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩' }, fiscalYearStart: 7 },
    { code: 'LK', countryName: 'Sri Lanka', currency: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', flag: '🇱🇰' }, fiscalYearStart: 4 },
    { code: 'NP', countryName: 'Nepal', currency: { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' }, fiscalYearStart: 7 },
    { code: 'MM', countryName: 'Myanmar', currency: { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', flag: '🇲🇲' }, fiscalYearStart: 4 },
    { code: 'KH', countryName: 'Cambodia', currency: { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', flag: '🇰🇭' }, fiscalYearStart: 1 },
    { code: 'LA', countryName: 'Laos', currency: { code: 'LAK', name: 'Lao Kip', symbol: '₭', flag: '🇱🇦' }, fiscalYearStart: 1 },

    // Europe
    { code: 'GB', countryName: 'United Kingdom', currency: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' }, fiscalYearStart: 4 },
    { code: 'DE', countryName: 'Germany', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇩🇪' }, fiscalYearStart: 1 },
    { code: 'FR', countryName: 'France', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇫🇷' }, fiscalYearStart: 1 },
    { code: 'IT', countryName: 'Italy', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇮🇹' }, fiscalYearStart: 1 },
    { code: 'ES', countryName: 'Spain', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇸' }, fiscalYearStart: 1 },
    { code: 'NL', countryName: 'Netherlands', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇳🇱' }, fiscalYearStart: 1 },
    { code: 'BE', countryName: 'Belgium', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇧🇪' }, fiscalYearStart: 1 },
    { code: 'AT', countryName: 'Austria', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇦🇹' }, fiscalYearStart: 1 },
    { code: 'PL', countryName: 'Poland', currency: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' }, fiscalYearStart: 1 },
    { code: 'SE', countryName: 'Sweden', currency: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' }, fiscalYearStart: 1 },
    { code: 'NO', countryName: 'Norway', currency: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' }, fiscalYearStart: 1 },
    { code: 'DK', countryName: 'Denmark', currency: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' }, fiscalYearStart: 1 },
    { code: 'FI', countryName: 'Finland', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇫🇮' }, fiscalYearStart: 1 },
    { code: 'CH', countryName: 'Switzerland', currency: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' }, fiscalYearStart: 1 },
    { code: 'PT', countryName: 'Portugal', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇵🇹' }, fiscalYearStart: 1 },
    { code: 'GR', countryName: 'Greece', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇬🇷' }, fiscalYearStart: 1 },
    { code: 'IE', countryName: 'Ireland', currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇮🇪' }, fiscalYearStart: 1 },
    { code: 'CZ', countryName: 'Czech Republic', currency: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' }, fiscalYearStart: 1 },
    { code: 'RO', countryName: 'Romania', currency: { code: 'RON', name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴' }, fiscalYearStart: 1 },
    { code: 'HU', countryName: 'Hungary', currency: { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' }, fiscalYearStart: 1 },

    // Americas
    { code: 'US', countryName: 'United States', currency: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' }, fiscalYearStart: 1 },
    { code: 'CA', countryName: 'Canada', currency: { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦' }, fiscalYearStart: 1 },
    { code: 'MX', countryName: 'Mexico', currency: { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' }, fiscalYearStart: 1 },
    { code: 'BR', countryName: 'Brazil', currency: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' }, fiscalYearStart: 1 },
    { code: 'AR', countryName: 'Argentina', currency: { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷' }, fiscalYearStart: 1 },
    { code: 'CO', countryName: 'Colombia', currency: { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴' }, fiscalYearStart: 1 },
    { code: 'CL', countryName: 'Chile', currency: { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱' }, fiscalYearStart: 1 },
    { code: 'PE', countryName: 'Peru', currency: { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪' }, fiscalYearStart: 1 },

    // Africa
    { code: 'ZA', countryName: 'South Africa', currency: { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' }, fiscalYearStart: 3 },
    { code: 'EG', countryName: 'Egypt', currency: { code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' }, fiscalYearStart: 7 },
    { code: 'NG', countryName: 'Nigeria', currency: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' }, fiscalYearStart: 1 },
    { code: 'KE', countryName: 'Kenya', currency: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' }, fiscalYearStart: 7 },
    { code: 'MA', countryName: 'Morocco', currency: { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', flag: '🇲🇦' }, fiscalYearStart: 1 },
    { code: 'GH', countryName: 'Ghana', currency: { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' }, fiscalYearStart: 1 },
    { code: 'TZ', countryName: 'Tanzania', currency: { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' }, fiscalYearStart: 7 },
    { code: 'UG', countryName: 'Uganda', currency: { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' }, fiscalYearStart: 7 },
    { code: 'DZ', countryName: 'Algeria', currency: { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', flag: '🇩🇿' }, fiscalYearStart: 1 },
    { code: 'TN', countryName: 'Tunisia', currency: { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', flag: '🇹🇳' }, fiscalYearStart: 1 },

    // Oceania
    { code: 'AU', countryName: 'Australia', currency: { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' }, fiscalYearStart: 7 },
    { code: 'NZ', countryName: 'New Zealand', currency: { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', flag: '🇳🇿' }, fiscalYearStart: 4 },

    // Asia Pacific
    { code: 'JP', countryName: 'Japan', currency: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' }, fiscalYearStart: 4 },
    { code: 'KR', countryName: 'South Korea', currency: { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' }, fiscalYearStart: 1 },
    { code: 'CN', countryName: 'China', currency: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' }, fiscalYearStart: 1 },
    { code: 'HK', countryName: 'Hong Kong', currency: { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$', flag: '🇭🇰' }, fiscalYearStart: 4 },
    { code: 'TW', countryName: 'Taiwan', currency: { code: 'TWD', name: 'Taiwan Dollar', symbol: '$', flag: '🇹🇼' }, fiscalYearStart: 1 },
];

const DEFAULT_FINANCE: FinanceConfig = {
    baseCurrency: 'AED',
    fiscalYearStart: '1',
    accountingMethod: 'accrual',
    selectedCountry: 'AE',
};

const FISCAL_YEAR_OPTIONS = [
    { value: '1', label: 'January' },
    { value: '4', label: 'April' },
    { value: '7', label: 'July' },
    { value: '10', label: 'October' },
];

export default function CurrencySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [finance, setFinance] = useState<FinanceConfig>(DEFAULT_FINANCE);
    const [companyCountry, setCompanyCountry] = useState<string>('AE');
    const { refreshTenantStatus } = useTenant();
    const uniqueCurrencies = Array.from(
        new Map(ALL_COUNTRIES_CURRENCIES.map((c) => [c.currency.code, c.currency])).values()
    );

    useEffect(() => {
        void loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [company, financeConfig] = await Promise.all([
                settingsApi.getCompany(),
                settingsApi.getFinance()
            ]);

            const countryCode = financeConfig?.selectedCountry || company?.country || 'AE';
            const countryData = ALL_COUNTRIES_CURRENCIES.find(c => c.code === countryCode);
            setCompanyCountry(countryCode);

            setFinance({
                baseCurrency: financeConfig?.baseCurrency || company?.baseCurrency || countryData?.currency.code || 'AED',
                fiscalYearStart: String(financeConfig?.fiscalYearStart || company?.fiscalYearStart || countryData?.fiscalYearStart || 1),
                accountingMethod: financeConfig?.accountingMethod || 'accrual',
                selectedCountry: countryCode,
            });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load currency settings');
        } finally {
            setLoading(false);
        }
    };

    const handleCountryChange = (countryCode: string) => {
        const countryData = ALL_COUNTRIES_CURRENCIES.find(c => c.code === countryCode);

        if (countryData) {
            setFinance(prev => ({
                ...prev,
                selectedCountry: countryCode,
                baseCurrency: countryData.currency.code,
                fiscalYearStart: countryData.fiscalYearStart.toString(),
            }));
            setCompanyCountry(countryCode);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                settingsApi.saveFinance({
                    baseCurrency: finance.baseCurrency,
                    fiscalYearStart: String(finance.fiscalYearStart),
                    accountingMethod: finance.accountingMethod,
                    selectedCountry: finance.selectedCountry,
                }),
                settingsApi.saveCompany({
                    country: finance.selectedCountry,
                    baseCurrency: finance.baseCurrency,
                    fiscalYearStart: String(finance.fiscalYearStart),
                }),
            ]);
            broadcastCurrencyChange(finance.baseCurrency);
            await refreshTenantStatus();

            // Broadcast event
            window.dispatchEvent(new CustomEvent('erp_company_settings_changed', {
                detail: {
                    baseCurrency: finance.baseCurrency,
                    fiscalYearStart: finance.fiscalYearStart,
                    country: finance.selectedCountry
                }
            }));

            // Sync for PDF
            const existingPdfSettings = JSON.parse(localStorage.getItem('pdf-settings') || '{}');
            const syncedPdfSettings = {
                ...existingPdfSettings,
                currency: finance.baseCurrency
            };
            localStorage.setItem('pdf-settings', JSON.stringify(syncedPdfSettings));
            localStorage.setItem('erp_pdf_settings', JSON.stringify(syncedPdfSettings));
            window.dispatchEvent(new Event('erp_settings_updated'));

            toast.success('Currency & Fiscal settings saved');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save currency settings');
        } finally {
            setSaving(false);
        }
    };

    const currentCountryData = ALL_COUNTRIES_CURRENCIES.find(c => c.code === finance.selectedCountry);

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Currency & Fiscal</h1>
                <p className="text-muted-foreground">Base currency and fiscal year settings</p>
            </div>

            {/* Country Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Select Your Country
                    </CardTitle>
                    <CardDescription>Currency and fiscal year will be auto-configured based on your country</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={finance.selectedCountry}
                        onValueChange={handleCountryChange}
                    >
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                            {ALL_COUNTRIES_CURRENCIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    <div className="flex items-center gap-2">
                                        <span>{country.currency.flag}</span>
                                        <span>{country.countryName}</span>
                                        <span className="text-muted-foreground text-xs">({country.currency.code})</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Currency */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Base Currency</CardTitle>
                        <CardDescription>Primary reporting currency</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            value={finance.baseCurrency}
                            onValueChange={(v) => setFinance({ ...finance, baseCurrency: v })}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueCurrencies.map((currency) => (
                                    <SelectItem key={currency.code} value={currency.code}>
                                        <div className="flex items-center gap-2">
                                            <span>{currency.flag}</span>
                                            <span>{currency.code}</span>
                                            <span className="text-muted-foreground">- {currency.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <div>
                                <p className="text-sm font-medium">
                                    {currentCountryData?.currency.flag} {currentCountryData?.currency.code}
                                </p>
                                <p className="text-xs text-muted-foreground">{currentCountryData?.currency.name}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Fiscal Year */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Fiscal Year Start</CardTitle>
                        <CardDescription>When does your financial year begin?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            value={finance.fiscalYearStart}
                            onValueChange={(v) => setFinance({ ...finance, fiscalYearStart: v })}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FISCAL_YEAR_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium">
                                FY {new Date().getFullYear()}-{new Date().getFullYear() + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {currentCountryData?.countryName} fiscal year starts {FISCAL_YEAR_OPTIONS.find(f => f.value === finance.fiscalYearStart)?.label}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Accounting Method */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Accounting Method</CardTitle>
                        <CardDescription>Basis of accounting</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            value={finance.accountingMethod}
                            onValueChange={(v: 'accrual' | 'cash') => setFinance({ ...finance, accountingMethod: v })}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="accrual">Accrual</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium">
                                {finance.accountingMethod === 'accrual' ? 'Accrual Basis' : 'Cash Basis'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {finance.accountingMethod === 'accrual'
                                    ? 'Revenue/expenses when earned/incurred'
                                    : 'Revenue/expenses when received/paid'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Country Info */}
            {currentCountryData && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl">{currentCountryData.currency.flag}</div>
                            <div>
                                <p className="font-medium text-blue-900">
                                    {currentCountryData.countryName}
                                </p>
                                <p className="text-sm text-blue-700">
                                    Currency: {currentCountryData.currency.name} ({currentCountryData.currency.symbol}) •
                                    Fiscal Year: Starts {FISCAL_YEAR_OPTIONS.find(f => f.value === currentCountryData.fiscalYearStart.toString())?.label}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Box */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-slate-600 mt-0.5" />
                        <div className="text-sm text-slate-700">
                            <p className="font-medium mb-1">Sync Settings</p>
                            <p>Currency and fiscal settings sync with Company settings. Select your country above to automatically configure currency and fiscal year.</p>
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
