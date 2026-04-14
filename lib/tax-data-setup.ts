export const SUPPORTED_TAX_COUNTRIES: Record<string, string[]> = {
    gulf: ['AE', 'SA', 'BH', 'OM', 'QA', 'KW'],
    europe: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ', 'GR'],
    americas: ['US', 'CA', 'MX', 'BR', 'AR', 'CL'],
    asia: ['IN', 'SG', 'MY', 'TH', 'PH', 'ID', 'JP', 'KR', 'CN'],
    oceania: ['AU', 'NZ'],
    africa: ['ZA', 'EG', 'KE', 'NG'],
};

export const TAX_COLLECTION_CONFIG = {
    REQUEST_TIMEOUT_MS: 10000,
    REQUEST_DELAY_MS: 250,
    MAX_RETRIES: 2,
    STORAGE_KEY: 'tax_database',
    COLLECTION_INTERVAL_DAYS: 10,
} as const;

export const APILAYER_ENDPOINTS = {
    CHECK_TAX: 'https://api.apilayer.com/tax_data/rate',
    GET_COUNTRIES: 'https://api.apilayer.com/tax_data/countries',
    VALIDATE_VAT: 'https://api.apilayer.com/tax_data/validate',
} as const;
