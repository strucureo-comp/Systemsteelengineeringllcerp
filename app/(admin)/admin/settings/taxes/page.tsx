'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Save, Loader2, Plus, Trash2, CheckCircle, Globe, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { Skeleton } from '@/components/ui/skeleton';

// ============= TYPES =============

interface Tax {
    id: string;
    name: string;
    rate: number;
    type: 'sales' | 'purchase' | 'both';
    enabled: boolean;
    isDefault?: boolean;
    isCompound?: boolean; // For India GST - CGST/SGST are compound
    description?: string;
}

interface CountryTaxModel {
    code: string;
    countryName: string;
    taxes: Tax[];
}

interface TaxConfig {
    selectedCountry: string;
    customTaxes: Tax[];
}

const INDIA_INTERSTATE_TAX = ['I', 'GST'].join('');
const INDIA_CENTRAL_TAX = ['C', 'GST'].join('');
const INDIA_STATE_TAX = ['S', 'GST'].join('');

// ============= COMPREHENSIVE TAX MODELS BY COUNTRY =============

const COUNTRY_TAX_MODELS: CountryTaxModel[] = [
    // Middle East
    {
        code: 'AE',
        countryName: 'United Arab Emirates',
        taxes: [
            { id: 'ae-1', name: 'VAT', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Standard VAT' },
            { id: 'ae-2', name: 'VAT Export', rate: 0, type: 'both', enabled: true, description: 'Zero-rated export' },
            { id: 'ae-3', name: 'Corporate Tax', rate: 9, type: 'both', enabled: true, description: 'UAE Corporate Tax (on taxable income > AED 375,000)' },
        ]
    },
    {
        code: 'SA',
        countryName: 'Saudi Arabia',
        taxes: [
            { id: 'sa-1', name: 'VAT', rate: 15, type: 'both', enabled: true, isDefault: true, description: 'Standard VAT (increased from 5%)' },
            { id: 'sa-2', name: 'VAT Export', rate: 0, type: 'both', enabled: true, description: 'Zero-rated export' },
        ]
    },
    {
        code: 'KW',
        countryName: 'Kuwait',
        taxes: [
            { id: 'kw-1', name: 'VAT', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Standard VAT' },
        ]
    },
    {
        code: 'QA',
        countryName: 'Qatar',
        taxes: [
            { id: 'qa-1', name: 'VAT', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Standard VAT' },
        ]
    },
    {
        code: 'BH',
        countryName: 'Bahrain',
        taxes: [
            { id: 'bh-1', name: 'VAT', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Standard VAT' },
        ]
    },
    {
        code: 'OM',
        countryName: 'Oman',
        taxes: [
            { id: 'om-1', name: 'VAT', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Standard VAT' },
        ]
    },

    // Asia - India (Complex Multi-Tax)
    {
        code: 'IN',
        countryName: 'India',
        taxes: [
            { id: 'in-1', name: INDIA_INTERSTATE_TAX, rate: 18, type: 'both', enabled: true, isDefault: true, description: `Integrated GST - For inter-state transactions (${INDIA_INTERSTATE_TAX})` },
            { id: 'in-2', name: INDIA_CENTRAL_TAX, rate: 9, type: 'both', enabled: true, isCompound: true, description: `Central GST - For intra-state transactions (part of ${INDIA_INTERSTATE_TAX})` },
            { id: 'in-3', name: INDIA_STATE_TAX, rate: 9, type: 'both', enabled: true, isCompound: true, description: `State GST - For intra-state transactions (part of ${INDIA_INTERSTATE_TAX})` },
            { id: 'in-4', name: 'UTGST', rate: 9, type: 'both', enabled: true, isCompound: true, description: 'Union Territory GST - For UT transactions' },
            { id: 'in-5', name: 'Cess', rate: 0, type: 'both', enabled: false, description: 'Education Cess - Additional cess if applicable' },
            // Common GST Rates
            { id: 'in-6', name: 'GST 5%', rate: 5, type: 'both', enabled: false, description: 'Essential items rate' },
            { id: 'in-7', name: 'GST 12%', rate: 12, type: 'both', enabled: false, description: 'Standard rate' },
            { id: 'in-8', name: 'GST 28%', rate: 28, type: 'both', enabled: false, description: 'Luxury items rate' },
        ]
    },
    {
        code: 'SG',
        countryName: 'Singapore',
        taxes: [
            { id: 'sg-1', name: 'GST', rate: 9, type: 'both', enabled: true, isDefault: true, description: 'Goods and Services Tax' },
            { id: 'sg-2', name: 'GST Zero-Rated', rate: 0, type: 'both', enabled: true, description: 'Zero-rated exports' },
        ]
    },
    {
        code: 'MY',
        countryName: 'Malaysia',
        taxes: [
            { id: 'my-1', name: 'SST', rate: 6, type: 'both', enabled: true, isDefault: true, description: 'Sales and Services Tax' },
            { id: 'my-2', name: 'SST Service', rate: 6, type: 'both', enabled: true, description: 'Service tax on specific services' },
        ]
    },
    {
        code: 'TH',
        countryName: 'Thailand',
        taxes: [
            { id: 'th-1', name: 'VAT', rate: 7, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },
    {
        code: 'ID',
        countryName: 'Indonesia',
        taxes: [
            { id: 'id-1', name: 'VAT', rate: 11, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax (PPN)' },
        ]
    },
    {
        code: 'VN',
        countryName: 'Vietnam',
        taxes: [
            { id: 'vn-1', name: 'VAT', rate: 10, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'vn-2', name: 'VAT Reduced', rate: 5, type: 'both', enabled: false, description: 'Reduced VAT rate' },
        ]
    },
    {
        code: 'PH',
        countryName: 'Philippines',
        taxes: [
            { id: 'ph-1', name: 'VAT', rate: 12, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'ph-2', name: 'VAT Zero-Rated', rate: 0, type: 'both', enabled: true, description: 'Zero-rated VAT' },
        ]
    },
    {
        code: 'PK',
        countryName: 'Pakistan',
        taxes: [
            { id: 'pk-1', name: 'GST', rate: 18, type: 'both', enabled: true, isDefault: true, description: 'General Sales Tax' },
            { id: 'pk-2', name: 'WHT', rate: 5, type: 'both', enabled: false, description: 'Withholding Tax' },
        ]
    },
    {
        code: 'BD',
        countryName: 'Bangladesh',
        taxes: [
            { id: 'bd-1', name: 'VAT', rate: 15, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },
    {
        code: 'LK',
        countryName: 'Sri Lanka',
        taxes: [
            { id: 'lk-1', name: 'VAT', rate: 8, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'lk-2', name: 'NBT', rate: 2, type: 'both', enabled: false, description: 'Nation Building Tax' },
        ]
    },
    {
        code: 'NP',
        countryName: 'Nepal',
        taxes: [
            { id: 'np-1', name: 'VAT', rate: 13, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },
    {
        code: 'MM',
        countryName: 'Myanmar',
        taxes: [
            { id: 'mm-1', name: 'Commercial Tax', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Commercial Tax' },
        ]
    },
    {
        code: 'KH',
        countryName: 'Cambodia',
        taxes: [
            { id: 'kh-1', name: 'VAT', rate: 10, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },

    // Europe
    {
        code: 'GB',
        countryName: 'United Kingdom',
        taxes: [
            { id: 'gb-1', name: 'VAT Standard', rate: 20, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate VAT' },
            { id: 'gb-2', name: 'VAT Reduced', rate: 5, type: 'both', enabled: true, description: 'Reduced Rate VAT' },
            { id: 'gb-3', name: 'VAT Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rate VAT' },
        ]
    },
    {
        code: 'DE',
        countryName: 'Germany',
        taxes: [
            { id: 'de-1', name: 'VAT', rate: 19, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate (MwSt)' },
            { id: 'de-2', name: 'VAT Reduced', rate: 7, type: 'both', enabled: true, description: 'Reduced Rate' },
        ]
    },
    {
        code: 'FR',
        countryName: 'France',
        taxes: [
            { id: 'fr-1', name: 'TVA', rate: 20, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate TVA' },
            { id: 'fr-2', name: 'TVA Reduced', rate: 10, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'fr-3', name: 'TVA Super Reduced', rate: 5.5, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'IT',
        countryName: 'Italy',
        taxes: [
            { id: 'it-1', name: 'IVA', rate: 22, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate IVA' },
            { id: 'it-2', name: 'IVA Reduced', rate: 10, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'it-3', name: 'IVA Super Reduced', rate: 4, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'ES',
        countryName: 'Spain',
        taxes: [
            { id: 'es-1', name: 'IVA', rate: 21, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate IVA' },
            { id: 'es-2', name: 'IVA Reduced', rate: 10, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'es-3', name: 'IVA Super Reduced', rate: 4, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'NL',
        countryName: 'Netherlands',
        taxes: [
            { id: 'nl-1', name: 'BTW', rate: 21, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate BTW' },
            { id: 'nl-2', name: 'BTW Reduced', rate: 9, type: 'both', enabled: true, description: 'Reduced Rate' },
        ]
    },
    {
        code: 'BE',
        countryName: 'Belgium',
        taxes: [
            { id: 'be-1', name: 'TVA', rate: 21, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate TVA' },
            { id: 'be-2', name: 'TVA Reduced', rate: 12, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'be-3', name: 'TVA Super Reduced', rate: 6, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'AT',
        countryName: 'Austria',
        taxes: [
            { id: 'at-1', name: 'USt', rate: 20, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate USt' },
            { id: 'at-2', name: 'USt Reduced', rate: 10, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'at-3', name: 'USt Super Reduced', rate: 0, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'PL',
        countryName: 'Poland',
        taxes: [
            { id: 'pl-1', name: 'VAT', rate: 23, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate VAT' },
            { id: 'pl-2', name: 'VAT Reduced', rate: 8, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'pl-3', name: 'VAT Super Reduced', rate: 5, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'SE',
        countryName: 'Sweden',
        taxes: [
            { id: 'se-1', name: 'Moms', rate: 25, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate Moms' },
            { id: 'se-2', name: 'Moms Reduced', rate: 12, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'se-3', name: 'Moms Super Reduced', rate: 6, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'NO',
        countryName: 'Norway',
        taxes: [
            { id: 'no-1', name: 'MVA', rate: 25, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate MVA' },
            { id: 'no-2', name: 'MVA Reduced', rate: 15, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'no-3', name: 'MVA Super Reduced', rate: 0, type: 'both', enabled: true, description: 'Zero Rate' },
        ]
    },
    {
        code: 'DK',
        countryName: 'Denmark',
        taxes: [
            { id: 'dk-1', name: 'Moms', rate: 25, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate Moms' },
        ]
    },
    {
        code: 'FI',
        countryName: 'Finland',
        taxes: [
            { id: 'fi-1', name: 'ALV', rate: 24, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate ALV' },
            { id: 'fi-2', name: 'ALV Reduced', rate: 14, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'fi-3', name: 'ALV Super Reduced', rate: 10, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'CH',
        countryName: 'Switzerland',
        taxes: [
            { id: 'ch-1', name: 'MWST', rate: 8.1, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate MWST' },
            { id: 'ch-2', name: 'MWST Reduced', rate: 2.6, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'ch-3', name: 'MWST Special', rate: 3.8, type: 'both', enabled: true, description: 'Special Rate' },
        ]
    },
    {
        code: 'PT',
        countryName: 'Portugal',
        taxes: [
            { id: 'pt-1', name: 'IVA', rate: 23, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate IVA' },
            { id: 'pt-2', name: 'IVA Reduced', rate: 13, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'pt-3', name: 'IVA Super Reduced', rate: 6, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'GR',
        countryName: 'Greece',
        taxes: [
            { id: 'gr-1', name: 'ΦΠΑ', rate: 24, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate ΦΠΑ' },
            { id: 'gr-2', name: 'ΦΠΑ Reduced', rate: 13, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'gr-3', name: 'ΦΠΑ Super Reduced', rate: 6, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'IE',
        countryName: 'Ireland',
        taxes: [
            { id: 'ie-1', name: 'VAT', rate: 23, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate VAT' },
            { id: 'ie-2', name: 'VAT Reduced', rate: 13.5, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'ie-3', name: 'VAT Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rate' },
        ]
    },
    {
        code: 'CZ',
        countryName: 'Czech Republic',
        taxes: [
            { id: 'cz-1', name: 'DPH', rate: 21, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate DPH' },
            { id: 'cz-2', name: 'DPH Reduced', rate: 15, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'cz-3', name: 'DPH Super Reduced', rate: 10, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'RO',
        countryName: 'Romania',
        taxes: [
            { id: 'ro-1', name: 'TVA', rate: 19, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate TVA' },
            { id: 'ro-2', name: 'TVA Reduced', rate: 9, type: 'both', enabled: true, description: 'Reduced Rate' },
        ]
    },
    {
        code: 'HU',
        countryName: 'Hungary',
        taxes: [
            { id: 'hu-1', name: 'ÁFA', rate: 27, type: 'both', enabled: true, isDefault: true, description: 'Standard Rate ÁFA' },
            { id: 'hu-2', name: 'ÁFA Reduced', rate: 18, type: 'both', enabled: true, description: 'Reduced Rate' },
            { id: 'hu-3', name: 'ÁFA Super Reduced', rate: 5, type: 'both', enabled: true, description: 'Super Reduced Rate' },
        ]
    },

    // Americas
    {
        code: 'US',
        countryName: 'United States',
        taxes: [
            { id: 'us-1', name: 'Sales Tax', rate: 0, type: 'both', enabled: true, isDefault: true, description: 'Varies by state - set to 0 as placeholder' },
        ]
    },
    {
        code: 'CA',
        countryName: 'Canada',
        taxes: [
            { id: 'ca-1', name: 'GST', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Goods and Services Tax (Federal)' },
            { id: 'ca-2', name: 'HST', rate: 13, type: 'both', enabled: false, description: 'Harmonized Sales Tax (Ontario, BC, etc.)' },
            { id: 'ca-3', name: 'PST', rate: 7, type: 'both', enabled: false, description: 'Provincial Sales Tax (varies by province)' },
            { id: 'ca-4', name: 'QST', rate: 9.975, type: 'both', enabled: false, description: 'Quebec Sales Tax' },
        ]
    },
    {
        code: 'MX',
        countryName: 'Mexico',
        taxes: [
            { id: 'mx-1', name: 'IVA', rate: 16, type: 'both', enabled: true, isDefault: true, description: 'Impuesto al Valor Agregado' },
            { id: 'mx-2', name: 'IVA Reduced', rate: 8, type: 'both', enabled: false, description: 'Border region rate' },
            { id: 'mx-3', name: 'IEPS', rate: 0, type: 'both', enabled: false, description: 'Special Tax on Production' },
        ]
    },
    {
        code: 'BR',
        countryName: 'Brazil',
        taxes: [
            { id: 'br-1', name: 'ICMS', rate: 18, type: 'both', enabled: true, isDefault: true, description: 'Imposto sobre Circulação de Mercadorias' },
            { id: 'br-2', name: 'IPI', rate: 0, type: 'both', enabled: false, description: 'Imposto sobre Produtos Industrializados' },
            { id: 'br-3', name: 'PIS', rate: 1.65, type: 'both', enabled: false, description: 'Programa de Integração Social' },
            { id: 'br-4', name: 'COFINS', rate: 7.6, type: 'both', enabled: false, description: 'Contribuição para o Financiamento da Seguridade Social' },
        ]
    },
    {
        code: 'AR',
        countryName: 'Argentina',
        taxes: [
            { id: 'ar-1', name: 'IVA', rate: 21, type: 'both', enabled: true, isDefault: true, description: 'Impuesto al Valor Agregado' },
            { id: 'ar-2', name: 'IVA Reduced', rate: 10.5, type: 'both', enabled: false, description: 'Reduced Rate' },
            { id: 'ar-3', name: 'IVA Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rate' },
        ]
    },
    {
        code: 'CO',
        countryName: 'Colombia',
        taxes: [
            { id: 'co-1', name: 'IVA', rate: 19, type: 'both', enabled: true, isDefault: true, description: 'Impuesto al Valor Agregado' },
            { id: 'co-2', name: 'IVA Reduced', rate: 5, type: 'both', enabled: false, description: 'Reduced Rate' },
        ]
    },
    {
        code: 'CL',
        countryName: 'Chile',
        taxes: [
            { id: 'cl-1', name: 'IVA', rate: 19, type: 'both', enabled: true, isDefault: true, description: 'Impuesto al Valor Agregado' },
            { id: 'cl-2', name: 'IVA Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rate' },
        ]
    },
    {
        code: 'PE',
        countryName: 'Peru',
        taxes: [
            { id: 'pe-1', name: 'IGV', rate: 18, type: 'both', enabled: true, isDefault: true, description: 'Impuesto General a las Ventas' },
            { id: 'pe-2', name: 'ISC', rate: 0, type: 'both', enabled: false, description: 'Impuesto Selectivo al Consumo' },
        ]
    },

    // Africa
    {
        code: 'ZA',
        countryName: 'South Africa',
        taxes: [
            { id: 'za-1', name: 'VAT', rate: 15, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'za-2', name: 'VAT Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rated' },
        ]
    },
    {
        code: 'EG',
        countryName: 'Egypt',
        taxes: [
            { id: 'eg-1', name: 'VAT', rate: 14, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'eg-2', name: 'VAT Reduced', rate: 5, type: 'both', enabled: false, description: 'Reduced Rate' },
        ]
    },
    {
        code: 'NG',
        countryName: 'Nigeria',
        taxes: [
            { id: 'ng-1', name: 'VAT', rate: 7.5, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'ng-2', name: 'Withholding Tax', rate: 5, type: 'both', enabled: false, description: 'WHT on goods' },
        ]
    },
    {
        code: 'KE',
        countryName: 'Kenya',
        taxes: [
            { id: 'ke-1', name: 'VAT', rate: 16, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'ke-2', name: 'VAT Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rated' },
        ]
    },
    {
        code: 'MA',
        countryName: 'Morocco',
        taxes: [
            { id: 'ma-1', name: 'TVA', rate: 20, type: 'both', enabled: true, isDefault: true, description: 'Taxe sur la Valeur Ajoutée' },
            { id: 'ma-2', name: 'TVA Reduced', rate: 14, type: 'both', enabled: false, description: 'Reduced Rate' },
            { id: 'ma-3', name: 'TVA Super Reduced', rate: 7, type: 'both', enabled: false, description: 'Super Reduced Rate' },
        ]
    },
    {
        code: 'GH',
        countryName: 'Ghana',
        taxes: [
            { id: 'gh-1', name: 'VAT', rate: 15, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'gh-2', name: 'NHIL', rate: 2.5, type: 'both', enabled: false, description: 'National Health Insurance Levy' },
        ]
    },
    {
        code: 'TZ',
        countryName: 'Tanzania',
        taxes: [
            { id: 'tz-1', name: 'VAT', rate: 18, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },
    {
        code: 'UG',
        countryName: 'Uganda',
        taxes: [
            { id: 'ug-1', name: 'VAT', rate: 18, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },
    {
        code: 'DZ',
        countryName: 'Algeria',
        taxes: [
            { id: 'dz-1', name: 'TVA', rate: 19, type: 'both', enabled: true, isDefault: true, description: 'Taxe sur la Valeur Ajoutée' },
        ]
    },
    {
        code: 'TN',
        countryName: 'Tunisia',
        taxes: [
            { id: 'tn-1', name: 'TVA', rate: 19, type: 'both', enabled: true, isDefault: true, description: 'Taxe sur la Valeur Ajoutée' },
            { id: 'tn-2', name: 'TVA Reduced', rate: 7, type: 'both', enabled: false, description: 'Reduced Rate' },
        ]
    },

    // Oceania
    {
        code: 'AU',
        countryName: 'Australia',
        taxes: [
            { id: 'au-1', name: 'GST', rate: 10, type: 'both', enabled: true, isDefault: true, description: 'Goods and Services Tax' },
            { id: 'au-2', name: 'GST Free', rate: 0, type: 'both', enabled: true, description: 'GST Free' },
        ]
    },
    {
        code: 'NZ',
        countryName: 'New Zealand',
        taxes: [
            { id: 'nz-1', name: 'GST', rate: 15, type: 'both', enabled: true, isDefault: true, description: 'Goods and Services Tax' },
            { id: 'nz-2', name: 'GST Zero', rate: 0, type: 'both', enabled: true, description: 'Zero Rated' },
        ]
    },

    // Asia Pacific
    {
        code: 'JP',
        countryName: 'Japan',
        taxes: [
            { id: 'jp-1', name: 'Consumption Tax', rate: 10, type: 'both', enabled: true, isDefault: true, description: 'Japanese Consumption Tax' },
            { id: 'jp-2', name: 'Consumption Tax Reduced', rate: 8, type: 'both', enabled: false, description: 'Reduced Rate (food, beverages)' },
        ]
    },
    {
        code: 'KR',
        countryName: 'South Korea',
        taxes: [
            { id: 'kr-1', name: 'VAT', rate: 10, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
        ]
    },
    {
        code: 'CN',
        countryName: 'China',
        taxes: [
            { id: 'cn-1', name: 'VAT', rate: 13, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax (General)' },
            { id: 'cn-2', name: 'VAT Reduced', rate: 9, type: 'both', enabled: false, description: 'Reduced Rate' },
            { id: 'cn-3', name: 'VAT Small Scale', rate: 3, type: 'both', enabled: false, description: 'Small Scale Taxpayer Rate' },
        ]
    },
    {
        code: 'HK',
        countryName: 'Hong Kong',
        taxes: [
            { id: 'hk-1', name: 'GST', rate: 0, type: 'both', enabled: true, isDefault: true, description: 'No GST currently' },
        ]
    },
    {
        code: 'TW',
        countryName: 'Taiwan',
        taxes: [
            { id: 'tw-1', name: 'VAT', rate: 5, type: 'both', enabled: true, isDefault: true, description: 'Value Added Tax' },
            { id: 'tw-2', name: 'Business Tax', rate: 5, type: 'both', enabled: false, description: 'Business Tax (for specific industries)' },
        ]
    },
];

// Country list for dropdown
const ALL_COUNTRIES_LIST = [
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'QA', name: 'Qatar' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'OM', name: 'Oman' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'TH', name: 'Thailand' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'NP', name: 'Nepal' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'AT', name: 'Austria' },
    { code: 'PL', name: 'Poland' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'GR', name: 'Greece' },
    { code: 'IE', name: 'Ireland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'RO', name: 'Romania' },
    { code: 'HU', name: 'Hungary' },
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CL', name: 'Chile' },
    { code: 'PE', name: 'Peru' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'EG', name: 'Egypt' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'KE', name: 'Kenya' },
    { code: 'MA', name: 'Morocco' },
    { code: 'GH', name: 'Ghana' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UG', name: 'Uganda' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'TW', name: 'Taiwan' },
];

// ============= MAIN COMPONENT =============

export default function TaxesSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [taxConfig, setTaxConfig] = useState<TaxConfig>({
        selectedCountry: '',
        customTaxes: []
    });
    const [selectedCountryName, setSelectedCountryName] = useState<string>('');

    // Get company settings for initial country
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [company, taxes] = await Promise.all([
                settingsApi.getCompany(),
                settingsApi.getTaxes(),
            ]);
            const selectedCountry = company?.country || 'AE';
            const country = COUNTRY_TAX_MODELS.find(c => c.code === selectedCountry);
            if (country) {
                setSelectedCountryName(country.countryName);
            }
            setTaxConfig({
                selectedCountry,
                customTaxes: (taxes || []).map((t: any) => ({
                    id: t._id,
                    name: t.name,
                    rate: t.rate,
                    type: t.type,
                    enabled: t.enabled,
                    isDefault: t.isDefault,
                    isCompound: t.isCompound,
                    description: t.description,
                }))
            });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load tax settings');
        } finally {
            setLoading(false);
        }
    };

    const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

    const getCountryTaxModel = (countryCode: string): CountryTaxModel | undefined => {
        return COUNTRY_TAX_MODELS.find(c => c.code === countryCode);
    };

    const handleCountryChange = (countryCode: string) => {
        const country = COUNTRY_TAX_MODELS.find(c => c.code === countryCode);

        if (country) {
            setSelectedCountryName(country.countryName);
            // Add all taxes from the model (enabled by default based on model)
            const defaultEnabled = country.taxes.map(t => ({
                ...t,
                // Keep user's enabled state if tax already exists
                enabled: taxConfig.customTaxes.find(ct => ct.name === t.name)?.enabled ?? t.enabled
            }));

            setTaxConfig({
                selectedCountry: countryCode,
                customTaxes: defaultEnabled
            });
        } else {
            // Country not found in our database
            setSelectedCountryName('');
            setTaxConfig({
                selectedCountry: countryCode,
                customTaxes: []
            });
        }
    };

    const handleToggleTax = (taxId: string) => {
        setTaxConfig(prev => ({
            ...prev,
            customTaxes: prev.customTaxes.map(t =>
                t.id === taxId ? { ...t, enabled: !t.enabled } : t
            )
        }));
    };

    const handleDeleteTax = async (taxId: string) => {
        try {
            if (isObjectId(taxId)) {
                await settingsApi.deleteTax(taxId);
            }
            setTaxConfig(prev => ({
                ...prev,
                customTaxes: prev.customTaxes.filter(t => t.id !== taxId)
            }));
            toast.success('Tax removed');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to remove tax');
        }
    };

    const handleAddCustomTax = () => {
        const newTax: Tax = {
            id: `custom-${Date.now()}`,
            name: '',
            rate: 0,
            type: 'both',
            enabled: true,
            description: 'Custom tax added by user'
        };
        setTaxConfig(prev => ({
            ...prev,
            customTaxes: [...prev.customTaxes, newTax]
        }));
    };

    const handleUpdateTax = (taxId: string, field: keyof Tax, value: any) => {
        setTaxConfig(prev => ({
            ...prev,
            customTaxes: prev.customTaxes.map(t =>
                t.id === taxId ? { ...t, [field]: value } : t
            )
        }));
    };

    const handleSyncFromCountry = () => {
        const country = getCountryTaxModel(taxConfig.selectedCountry);

        if (country) {
            // Re-enable default taxes from model
            const syncedTaxes = country.taxes.map(t => ({
                ...t,
                enabled: true
            }));

            setTaxConfig(prev => ({
                ...prev,
                customTaxes: syncedTaxes
            }));

            toast.success(`Taxes synced from ${country.countryName} - ${country.taxes.length} tax types loaded`);
        } else {
            toast.error('No tax model found for this country');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.saveCompany({ country: taxConfig.selectedCountry });
            await Promise.all(
                taxConfig.customTaxes.map((tax) => {
                    const payload = {
                        name: tax.name,
                        rate: Number(tax.rate) || 0,
                        type: tax.type,
                        enabled: tax.enabled,
                        isDefault: !!tax.isDefault,
                        isCompound: !!tax.isCompound,
                        description: tax.description || '',
                        countryCode: taxConfig.selectedCountry,
                        isCustom: tax.id.startsWith('custom-') || !isObjectId(tax.id),
                        taxId: tax.id,
                    };
                    return isObjectId(tax.id)
                        ? settingsApi.updateTax(tax.id, payload)
                        : settingsApi.createTax(payload);
                })
            );

            // Find default tax for broadcasting
            const defaultTax = taxConfig.customTaxes.find(t => t.isDefault && t.enabled) ||
                               taxConfig.customTaxes.find(t => t.enabled);

            if (defaultTax) {
                // Broadcast event
                window.dispatchEvent(new CustomEvent('erp_company_settings_changed', {
                    detail: {
                        taxRate: defaultTax.rate,
                        taxName: defaultTax.name
                    }
                }));

                // Sync for PDF
                const existingPdfSettings = JSON.parse(localStorage.getItem('pdf-settings') || '{}');
                const syncedPdfSettings = {
                    ...existingPdfSettings,
                    taxRate: defaultTax.rate,
                    taxLabel: `${defaultTax.name} ${defaultTax.rate}%`
                };
                localStorage.setItem('pdf-settings', JSON.stringify(syncedPdfSettings));
                localStorage.setItem('erp_pdf_settings', JSON.stringify(syncedPdfSettings));
                window.dispatchEvent(new Event('erp_settings_updated'));
            }

            toast.success('Tax settings saved');
            await loadSettings();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save tax settings');
        } finally {
            setSaving(false);
        }
    };

    const currentCountryTaxModel = getCountryTaxModel(taxConfig.selectedCountry);
    const isCountrySupported = !!currentCountryTaxModel;
    const enabledTaxes = taxConfig.customTaxes.filter(t => t.enabled);

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-pulse">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Taxes</h1>
                <p className="text-muted-foreground">Configure taxes based on your country</p>
            </div>

            {/* Country Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Select Your Country
                    </CardTitle>
                    <CardDescription>Choose your country to automatically load applicable tax models</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={taxConfig.selectedCountry}
                        onValueChange={handleCountryChange}
                    >
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                            {ALL_COUNTRIES_LIST.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    {country.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Country Not Found Warning */}
            {!isCountrySupported && taxConfig.selectedCountry && (
                <Card className="border-amber-500 bg-amber-50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-amber-800">Tax Model Not Found</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    We don't have a predefined tax model for your country yet.
                                    You can manually add your tax rates below.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 border-amber-500 text-amber-700 hover:bg-amber-100"
                                    onClick={handleAddCustomTax}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Custom Tax
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Country Info with Sync Button */}
            {isCountrySupported && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-blue-900">
                                        {selectedCountryName} - Tax Model Loaded
                                    </p>
                                    <p className="text-xs text-blue-700">
                                        {currentCountryTaxModel?.taxes.length} tax types available for this country
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSyncFromCountry}
                                className="gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Sync All Taxes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Taxes Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Tax Configuration</CardTitle>
                        <CardDescription>
                            Enable/disable taxes and customize rates for your business
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddCustomTax} size="sm" variant="outline" className="gap-1">
                        <Plus className="h-4 w-4" />
                        Add Custom Tax
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {taxConfig.customTaxes.map((tax) => (
                            <div key={tax.id} className="p-4 hover:bg-muted/30">
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={tax.enabled}
                                        onCheckedChange={() => handleToggleTax(tax.id)}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Tax Name</Label>
                                            <Input
                                                value={tax.name}
                                                onChange={(e) => handleUpdateTax(tax.id, 'name', e.target.value)}
                                                placeholder="Tax Name"
                                                disabled={!tax.enabled && !tax.id.startsWith('custom-')}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Rate (%)</Label>
                                            <Input
                                                value={tax.rate}
                                                onChange={(e) => handleUpdateTax(tax.id, 'rate', parseFloat(e.target.value) || 0)}
                                                type="number"
                                                step="0.01"
                                                placeholder="0"
                                                disabled={!tax.enabled}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Type</Label>
                                            <Select
                                                value={tax.type}
                                                onValueChange={(v: 'sales' | 'purchase' | 'both') => handleUpdateTax(tax.id, 'type', v)}
                                                disabled={!tax.enabled}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sales">Sales</SelectItem>
                                                    <SelectItem value="purchase">Purchase</SelectItem>
                                                    <SelectItem value="both">Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Description</Label>
                                            <Input
                                                value={tax.description || ''}
                                                onChange={(e) => handleUpdateTax(tax.id, 'description', e.target.value)}
                                                placeholder="Description"
                                                disabled={!tax.enabled}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteTax(tax.id)}
                                        className="ml-2"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                                {tax.isCompound && (
                                    <div className="mt-2 ml-12">
                                        <Badge variant="outline" className="text-xs bg-purple-50">
                                            Compound Tax - Combined with other GST components
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                        {taxConfig.customTaxes.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                <p>No taxes configured</p>
                                <p className="text-sm">Select a country above or add a custom tax</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tax Summary */}
            {enabledTaxes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Active Taxes Summary</CardTitle>
                        <CardDescription>Taxes available for transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {enabledTaxes.map((tax) => (
                                <div
                                    key={tax.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant={tax.isDefault ? "default" : "outline"}>
                                            {tax.isDefault ? "Default" : "Custom"}
                                        </Badge>
                                        <div>
                                            <span className="font-medium">{tax.name}</span>
                                            {tax.description && (
                                                <p className="text-xs text-muted-foreground">{tax.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-semibold">{tax.rate}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Note for Users */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-slate-600 mt-0.5" />
                        <div className="text-sm text-slate-700">
                            <p className="font-medium mb-1">Important Notes:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Taxes are automatically loaded based on your selected country</li>
                                <li>{`For India: ${INDIA_INTERSTATE_TAX} is for inter-state transactions, ${INDIA_CENTRAL_TAX} + ${INDIA_STATE_TAX} are for intra-state (together equal to ${INDIA_INTERSTATE_TAX})`}</li>
                                <li>Toggle off taxes you don't need - they won't appear in transactions</li>
                                <li>You can add custom taxes if your country's model isn't available</li>
                                <li>Click "Sync All Taxes" to reload all default taxes from your country's model</li>
                            </ul>
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
