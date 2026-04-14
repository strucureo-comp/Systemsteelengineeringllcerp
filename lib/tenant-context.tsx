'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { getTenantStatus, getSettings } from '@/lib/api';
import {
  ModuleKey,
  ModuleAccess,
  checkModuleAccess,
  getNextSetupStep,
  TenantSetupStatus
} from '@/lib/module-gate';
import { useAuth } from '@/lib/auth/context';

type ModulesConfig = Record<string, boolean>;

interface BrandingConfig {
  color: string;
  template: 'modern' | 'classic' | 'mono';
  headerAlign: 'left' | 'center' | 'right';
  showWatermark: boolean;
  terms: string;
  footerNote: string;
  logo: string | null;
}

interface TaxConfig {
  regime: string;
  rates: Array<{ id: string; name: string; rate: number; type: string }>;
  autoApply: boolean;
}

interface CompanyProfile {
  companyName?: string;
  tradingName: string;
  legalName: string;
  baseCurrency: string;
  taxId: string;
  address?: string;
  branding?: BrandingConfig;
  taxConfig?: TaxConfig;
  businessType?: string;
  activeModules?: Record<string, boolean>;
}

interface TenantContextType {
  tenantStatus: TenantSetupStatus | null;
  companyProfile: CompanyProfile | null;
  globalCompanyName: string;
  globalCurrency: string;
  brandingConfig: { logo?: string | null; primaryColor?: string; accentColor?: string } | null;
  loading: boolean;
  getModuleLabel: (moduleId: string) => string;
  checkAccess: (module: ModuleKey) => ModuleAccess;
  setupProgress: {
    step: number;
    total: number;
    label: string;
    path: string;
    percentage: number;
  };
  refreshTenantStatus: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ============================
// GLOBAL SECTOR ENGINE
// Maps modules to industry-specific terms
// ============================
const SECTOR_LABELS: Record<string, Record<string, string>> = {
  manufacturing: {
    inventory: 'Raw Materials',
    manufacturing: 'Shop Floor',
    operations: 'Production Control',
    projects: 'Build Jobs',
    purchases: 'Supply Chain'
  },
  construction: {
    projects: 'Site Records',
    manufacturing: 'Fabrication',
    inventory: 'Material Store',
    operations: 'Site Operations',
    purchases: 'Procurement'
  },
  hospitality: {
    inventory: 'Kitchen Stock',
    sales: 'Reservations',
    operations: 'Property Mgmt',
    manufacturing: 'F&B Production'
  },
  retail: {
    sales: 'POS Terminal',
    inventory: 'Store Stock',
    manufacturing: 'Custom Orders'
  },
  service: {
    projects: 'Client Projects',
    sales: 'Service CRM',
    operations: 'Task Management',
    manufacturing: 'Internal Ops'
  },
  trading: {
    inventory: 'Warehouse',
    operations: 'Logistics',
    purchases: 'Vendor Supply'
  }
};

const DEFAULT_LABELS: Record<string, string> = {
  finance: 'Finance Hub',
  sales: 'Sales CRM',
  hr: 'Human Resources',
  projects: 'Projects',
  inventory: 'Inventory',
  manufacturing: 'Production',
  operations: 'Operations',
  reports: 'Analytics',
  settings: 'System Hub',
  masters: 'Master Data',
  purchases: 'Procurement',
  compliance: 'Legal & Compliance'
};

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantStatus, setTenantStatus] = useState<TenantSetupStatus | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [brandingConfig, setBrandingConfig] = useState<{ logo?: string | null; primaryColor?: string; accentColor?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  const refreshTenantStatus = useCallback(async () => {
    try {
      setLoading(true);

      const [status, company, branding, modules] = await Promise.all([
        getTenantStatus(),
        getSettings<any>('company'),
        getSettings<any>('branding'),
        getSettings<ModulesConfig>('modules')
      ]);

      const normalizedProfile: CompanyProfile | null = company ? {
        companyName: company.companyName || company.tradingName || company.legalName || '',
        tradingName: company.companyName || '',
        legalName: company.legalName || '',
        baseCurrency: company.baseCurrency || 'USD',
        taxId: company.taxId || '',
        address: company.address,
        businessType: company.businessType || status?.business_type,
        activeModules: (modules as any)?.modules || modules || undefined
      } : null;

      setTenantStatus(status as any);
      setCompanyProfile(normalizedProfile);
      setBrandingConfig(branding || null);

      if (normalizedProfile) {
        window.dispatchEvent(new CustomEvent('erp_company_settings_changed', { 
          detail: { 
            companyName: normalizedProfile.companyName,
            baseCurrency: normalizedProfile.baseCurrency,
            address: normalizedProfile.address,
            logo: branding?.logo || null
          } 
        }));
      }
    } catch (error) {
      console.error('Failed to load tenant context:', error);
      setCompanyProfile(null);
      setBrandingConfig(null);

      // Keep a safe default when API is unavailable.
      setTenantStatus({
        setup_stage: 'completed',
        business_type: 'service',
        company_setup_complete: true,
        finance_setup_complete: true,
        roles_setup_complete: true,
        module_finance: true,
        module_sales: true,
        module_operations: true,
        module_hr: true
      } as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch tenant data after auth is done loading AND we have a user
    if (!authLoading) {
      if (user) {
        refreshTenantStatus();
      } else {
        setLoading(false);
      }
    } else {
      // If auth is still loading, keep tenant loading too
      setLoading(true);
    }
  }, [authLoading, user, refreshTenantStatus]);

  const getModuleLabel = (moduleId: string) => {
    const sector = companyProfile?.businessType || tenantStatus?.business_type || 'service';
    // Clean key mapping
    const keyMap: Record<string, string> = {
      'purchases': 'purchases',
      'inventory': 'inventory',
      'manufacturing': 'manufacturing',
      'operations': 'operations',
      'projects': 'projects',
      'sales': 'sales'
    };

    const lookupKey = keyMap[moduleId] || moduleId;
    return SECTOR_LABELS[sector]?.[lookupKey] || DEFAULT_LABELS[lookupKey] || moduleId;
  };

  const hasAdminAccess = (role?: string | null) => {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superadmin' || normalized === 'administrator';
  };

  const checkAccess = (module: ModuleKey): ModuleAccess => {
    if (hasAdminAccess(user?.role)) return { accessible: true };

    if (module === 'dashboard' || module === 'settings') return { accessible: true };

    const sector = companyProfile?.businessType || tenantStatus?.business_type || 'service';

    // Core logic defining defaults
    const isCore = (m: string) => {
      if (['finance', 'sales', 'operations', 'purchases'].includes(m)) return true;
      if (m === 'inventory' && ['manufacturing', 'retail', 'trading'].includes(sector)) return true;
      if (m === 'projects' && ['construction', 'service'].includes(sector)) return true;
      if (m === 'manufacturing' && sector === 'manufacturing') return true;
      return false;
    };

    if (companyProfile?.activeModules && module in companyProfile.activeModules) {
      if (!companyProfile.activeModules[module]) {
        return { accessible: false, reason: 'Module suspended by System Admin' };
      }
      return { accessible: true };
    }

    // Default by core
    if (!isCore(module)) return { accessible: false, reason: 'Module not enabled' };

    return checkModuleAccess(module, tenantStatus, user?.role);
  };

  const setupProgress = useMemo(() => getNextSetupStep(tenantStatus), [tenantStatus]);

  return (
    <TenantContext.Provider value={{
      tenantStatus,
      companyProfile,
      globalCompanyName: companyProfile?.companyName || companyProfile?.tradingName || companyProfile?.legalName || 'My Company',
      globalCurrency: companyProfile?.baseCurrency || 'USD',
      brandingConfig,
      loading,
      getModuleLabel,
      checkAccess,
      setupProgress,
      refreshTenantStatus
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
