'use client';

import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/lib/settings-api';
import { useTenant } from '@/lib/tenant-context';

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  baseCurrency: string;
  taxRate: number;
  taxName: string;
  fiscalYearStart: string;
  country: string;
  logo: string | null;
  footerText: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Your Company',
  address: '',
  phone: '',
  email: '',
  website: '',
  taxId: '',
  baseCurrency: 'AED',
  taxRate: 5,
  taxName: 'VAT',
  fiscalYearStart: '1',
  country: 'AE',
  logo: null,
  footerText: '',
};

export function useCompanySettings() {
  const { companyProfile, brandingConfig } = useTenant();
  const [settings, setSettings] = useState<CompanySettings>(() => {
    // Initial state from tenant context
    if (companyProfile) {
      const defaultTax = companyProfile.taxConfig?.rates?.find(r => r.rate > 0) || { name: 'VAT', rate: 5 };
      return {
        companyName: companyProfile.companyName || companyProfile.legalName || DEFAULT_SETTINGS.companyName,
        address: companyProfile.address || DEFAULT_SETTINGS.address,
        phone: DEFAULT_SETTINGS.phone,
        email: DEFAULT_SETTINGS.email,
        website: DEFAULT_SETTINGS.website,
        taxId: companyProfile.taxId || DEFAULT_SETTINGS.taxId,
        baseCurrency: companyProfile.baseCurrency || DEFAULT_SETTINGS.baseCurrency,
        taxRate: defaultTax.rate,
        taxName: defaultTax.name,
        fiscalYearStart: DEFAULT_SETTINGS.fiscalYearStart,
        country: DEFAULT_SETTINGS.country,
        logo: brandingConfig?.logo || null,
        footerText: DEFAULT_SETTINGS.footerText,
      };
    }
    return DEFAULT_SETTINGS;
  });

  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [company, finance, taxes, branding] = await Promise.all([
        settingsApi.getCompany().catch(() => null),
        settingsApi.getFinance().catch(() => null),
        settingsApi.getTaxes().catch(() => []),
        settingsApi.getBranding().catch(() => null),
      ]);

      const defaultTax = taxes?.find((t: any) => t.isDefault && t.enabled) || 
                         taxes?.find((t: any) => t.enabled) || 
                         { name: 'VAT', rate: 5 };

      setSettings({
        companyName: company?.companyName || companyProfile?.companyName || DEFAULT_SETTINGS.companyName,
        address: company?.address || companyProfile?.address || DEFAULT_SETTINGS.address,
        phone: company?.phone || DEFAULT_SETTINGS.phone,
        email: company?.email || DEFAULT_SETTINGS.email,
        website: company?.website || DEFAULT_SETTINGS.website,
        taxId: company?.taxId || company?.trn || companyProfile?.taxId || DEFAULT_SETTINGS.taxId,
        baseCurrency: finance?.baseCurrency || company?.baseCurrency || companyProfile?.baseCurrency || DEFAULT_SETTINGS.baseCurrency,
        taxRate: defaultTax?.rate ?? DEFAULT_SETTINGS.taxRate,
        taxName: defaultTax?.name ?? DEFAULT_SETTINGS.taxName,
        fiscalYearStart: finance?.fiscalYearStart || company?.fiscalYearStart || DEFAULT_SETTINGS.fiscalYearStart,
        country: company?.country || DEFAULT_SETTINGS.country,
        logo: branding?.logo || brandingConfig?.logo || null,
        footerText: branding?.footerText || DEFAULT_SETTINGS.footerText,
      });
    } catch (error) {
      console.error('Error fetching unified settings:', error);
    } finally {
      setLoading(false);
    }
  }, [companyProfile, brandingConfig]);

  useEffect(() => {
    fetchSettings();

    const handleSettingsChange = (event: any) => {
      if (event.detail) {
        setSettings(prev => ({ ...prev, ...event.detail }));
      } else {
        fetchSettings();
      }
    };

    window.addEventListener('erp_company_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('erp_company_settings_changed', handleSettingsChange);
    };
  }, [fetchSettings]);

  return { ...settings, loading, refresh: fetchSettings };
}
