/**
 * Global Currency Utility
 * Reads baseCurrency from org_config settings and provides formatting helpers.
 * Conversion: symbol changes with currency selection, amounts are converted using FX rates.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
    AED: 'د.إ', USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹',
    CNY: '¥', CHF: 'CHF', CAD: 'CA$', AUD: 'A$', SGD: 'S$', HKD: 'HK$',
    NZD: 'NZ$', SEK: 'kr', NOK: 'kr', DKK: 'kr', ZAR: 'R', BRL: 'R$',
    MXN: 'MX$', KWD: 'KD', SAR: '﷼', QAR: 'QR', BHD: 'BD', OMR: 'OMR',
    JOD: 'JD', EGP: 'E£', PKR: '₨', BDT: '৳', LKR: '₨', MYR: 'RM',
    THB: '฿', IDR: 'Rp', PHP: '₱', KRW: '₩', TRY: '₺', RUB: '₽',
    PLN: 'zł', CZK: 'Kč', HUF: 'Ft', RON: 'lei', BGN: 'лв',
};

export const CURRENCY_NAMES: Record<string, string> = {
    AED: 'UAE Dirham', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
    JPY: 'Japanese Yen', INR: 'Indian Rupee', CNY: 'Chinese Yuan',
    CHF: 'Swiss Franc', CAD: 'Canadian Dollar', AUD: 'Australian Dollar',
    SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar', SAR: 'Saudi Riyal',
    KWD: 'Kuwaiti Dinar', QAR: 'Qatari Riyal', BHD: 'Bahraini Dinar',
    OMR: 'Omani Rial', ZAR: 'South African Rand', BRL: 'Brazilian Real',
    MXN: 'Mexican Peso', MYR: 'Malaysian Ringgit', THB: 'Thai Baht',
    IDR: 'Indonesian Rupiah', PHP: 'Philippine Peso', KRW: 'South Korean Won',
    TRY: 'Turkish Lira', RUB: 'Russian Ruble',
};

// Exchange rates must be fetched from API at runtime
export const MOCK_FX_RATES: Record<string, number> = {};

let cachedRates: Record<string, number> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Fetch FX rates from free API
async function fetchFxRates(): Promise<Record<string, number> | null> {
    const FX_API_URL = process.env.FX_API_URL || 'https://open.er-api.com/v6/latest/USD';

    try {
        const res = await fetch(FX_API_URL, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const data = await res.json();
            if (data.rates) {
                return data.rates as Record<string, number>;
            }
        }
    } catch (e) {
        console.warn('[Currency] Failed to fetch FX rates, using fallback:', e);
    }
    return null;
}

/**
 * Get FX rates (from cache, API, or fallback)
 */
export async function getFxRates(): Promise<Record<string, number>> {
    const now = Date.now();

    // Return cached rates if still valid
    if (cachedRates && (now - lastFetchTime) < CACHE_DURATION_MS) {
        return cachedRates;
    }

    // Try to fetch from API
    const freshRates = await fetchFxRates();
    if (freshRates) {
        cachedRates = freshRates;
        lastFetchTime = now;
        return cachedRates;
    }

    // Return fallback rates if API fails
    return MOCK_FX_RATES;
}

/**
 * Convert amount from a source currency to a target currency.
 * Uses API rates if available, falls back to static rates.
 */
export async function convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const rates = await getFxRates();
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    return (amount / fromRate) * toRate;
}

/**
 * Synchronous conversion using cached/fallback rates (for SSR)
 */
export function convertAmountSync(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;
    const rates = cachedRates || MOCK_FX_RATES;
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    return (amount / fromRate) * toRate;
}

/**
 * Format a number as a currency string using the given currency code.
 */
export function formatCurrency(
    amount: number,
    currencyCode: string = 'AED',
    options: { showCode?: boolean; compact?: boolean } = {}
): string {
    const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
    const { showCode = false, compact = false } = options;

    let formatted: string;
    if (compact && Math.abs(amount) >= 1_000_000) {
        formatted = `${(amount / 1_000_000).toFixed(1)}M`;
    } else if (compact && Math.abs(amount) >= 1_000) {
        formatted = `${(amount / 1_000).toFixed(1)}K`;
    } else {
        formatted = amount.toLocaleString('en', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    return showCode
        ? `${symbol} ${formatted} ${currencyCode}`
        : `${symbol} ${formatted}`;
}

/**
 * Get just the symbol for a currency code.
 */
export function getCurrencySymbol(currencyCode: string): string {
    return CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
}
