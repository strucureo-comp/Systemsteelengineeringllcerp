import { hexToRgb as utilsHexToRgb, formatCurrency as utilsFormatCurrency } from './pdf-utils';
export { useSettings } from './settings-context';

export interface PDFSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTRN: string;
  logoUrl: string;
  authorizedSignature: string | null;
  primaryColor: string;      // hex e.g. "#1a3c5e"
  accentColor: string;       // hex e.g. "#c8a951"
  currency: 'AED' | 'USD' | 'EUR' | 'INR';
  taxRate: number;           // e.g. 5 for 5%
  taxLabel: string;          // e.g. "VAT 5%"
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
  };
  defaultPaymentTerms: string;
  defaultNotes: string;
  signatories: {
    procurement: string;
    procurementManager: string;
    vicePresident: string;
    ceo: string;
  };
  termsAndConditions: string[]; // array of clause strings
  acknowledgement: {
    title: string;
    signatureLabel: string;
    nameLabel: string;
    dateLabel: string;
    showStamp: boolean;
  };
}

export const DEFAULT_PDF_SETTINGS: PDFSettings = {
  companyName: 'Your Company Name LLC',
  companyAddress: 'P.O. Box 12345, Dubai, UAE',
  companyPhone: '+971 4 123 4567',
  companyEmail: 'info@yourcompany.com',
  companyTRN: '100XXXXXXXXXXXX',
  logoUrl: '',
  authorizedSignature: null,
  primaryColor: '#1a3c5e',
  accentColor: '#c8a951',
  currency: 'AED',
  taxRate: 5,
  taxLabel: 'VAT 5%',
  bankDetails: {
    bankName: 'Emirates NBD',
    accountName: 'Your Company Name LLC',
    accountNumber: '123456789012',
    iban: 'AE0000000000000000000',
    swiftCode: 'EBBDAEAD',
  },
  defaultPaymentTerms: '60 DAYS credit',
  defaultNotes: 'Thank you for your business.',
  signatories: {
    procurement: 'Procurement Officer',
    procurementManager: 'Procurement Manager',
    vicePresident: 'Vice President',
    ceo: 'CEO',
  },
  termsAndConditions: [
    'Delivery shall be made to our warehouse unless otherwise specified.',
    'Payment terms: 60 DAYS credit from date of invoice receipt.',
    'Please quote Purchase Order number in all correspondence, Delivery Notes, and Invoices.',
    'Invoices must be submitted with a copy of the PO and acknowledged Delivery Note.',
    'Invoices to be submitted by the 1st of the following month.',
    'Invoices must show VAT Reg No, PO No, Description of goods, Quantities, VAT Rate, and Total Amount.',
    'This Purchase Order shall be governed by the laws of the UAE and subject to Dubai Courts jurisdiction.',
    'Suppliers are not authorized to use the Company trademark without written consent.',
    'Goods must conform to the quality, specifications, and HSE standards of the Company.',
    'Strict adherence to HSE compliance is required for all deliveries and services.'
  ],
  acknowledgement: {
    title: 'RECEIVER ACKNOWLEDGEMENT',
    signatureLabel: 'SIGNATURE / COMPANY STAMP',
    nameLabel: 'NAME',
    dateLabel: 'DATE & TIME',
    showStamp: true
  }
};

const STORAGE_KEY = 'erp_pdf_settings';

export function getPDFSettings(): PDFSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_PDF_SETTINGS;
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PDF_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to parse PDF settings", e);
  }
  
  return DEFAULT_PDF_SETTINGS;
}

export function savePDFSettings(settings: PDFSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('erp_settings_updated'));
  }
}

// --- LEGACY EXPORTS FOR BACKWARD COMPATIBILITY ---

export interface CompanySettings {
    companyName: string;
    businessType: string;
    companySize: string;
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
    trn?: string;
    poBox?: string;
    city?: string;
    state?: string;
    bankName?: string;
    bankAccount?: string;
    bankIban?: string;
    bankSwift?: string;
}

export interface BrandingSettings {
    logo: string | null;
    primaryColor: string;
    accentColor: string;
    footerText: string;
}

export function getCompanySettings(): CompanySettings {
    if (typeof window !== 'undefined') {
        const legacy = localStorage.getItem('company_settings');
        if (legacy) return JSON.parse(legacy);
    }
    
    const newSettings = getPDFSettings();
    return {
        companyName: newSettings.companyName,
        businessType: 'General',
        companySize: 'SMB',
        country: 'UAE',
        address: newSettings.companyAddress,
        phone: newSettings.companyPhone,
        email: newSettings.companyEmail,
        website: '',
        taxId: newSettings.companyTRN,
        baseCurrency: newSettings.currency,
        fiscalYearStart: '1',
        defaultTaxName: newSettings.taxLabel,
        defaultTaxRate: newSettings.taxRate,
        trn: newSettings.companyTRN,
        bankName: newSettings.bankDetails.bankName,
        bankAccount: newSettings.bankDetails.accountNumber,
        bankIban: newSettings.bankDetails.iban,
        bankSwift: newSettings.bankDetails.swiftCode
    };
}

export function getBrandingSettings(): BrandingSettings {
    if (typeof window !== 'undefined') {
        const legacy = localStorage.getItem('branding_settings') || localStorage.getItem('branding_config');
        if (legacy) return JSON.parse(legacy);
    }

    const newSettings = getPDFSettings();
    return {
        logo: newSettings.logoUrl || null,
        primaryColor: newSettings.primaryColor,
        accentColor: newSettings.accentColor,
        footerText: 'Powered by BridgeBreak ERP'
    };
}

export const hexToRgb = utilsHexToRgb;

export function formatPdfCurrency(amount: number, currency: string = 'AED'): string {
    return utilsFormatCurrency(amount, currency);
}
