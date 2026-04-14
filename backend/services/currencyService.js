const ExchangeRate = require('../models/ExchangeRate');
const Currency = require('../models/Currency');

// ═══════════════════════════════════════════════════════════════════════════
// CURRENCY SERVICE
// Handles exchange rate lookups and currency conversions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the base currency for a tenant
 * @param {string} tenant_id - Tenant ID
 * @returns {Promise<string>} Base currency code (e.g., 'AED')
 */
async function getBaseCurrency(tenant_id) {
    const baseCurrency = await Currency.findOne({ 
        tenant_id, 
        is_base_currency: true,
        is_active: true
    }).lean();
    
    return baseCurrency ? baseCurrency.code : 'AED'; // Default to AED if not set
}

/**
 * Get exchange rate between two currencies on a specific date
 * Always routes through base currency (triangulation)
 * 
 * @param {string} tenant_id - Tenant ID
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Date} onDate - Date for rate lookup (defaults to today)
 * @returns {Promise<number>} Exchange rate
 */
async function getExchangeRate(tenant_id, fromCurrency, toCurrency, onDate = new Date()) {
    // Same currency = rate of 1
    if (fromCurrency === toCurrency) {
        return 1;
    }

    // Get base currency for this tenant
    const baseCurrency = await getBaseCurrency(tenant_id);

    /**
     * Helper function to get rate from base currency to target currency
     * @param {string} targetCurrency - Target currency code
     * @returns {Promise<number>} Exchange rate
     */
    const getRateFromBase = async (targetCurrency) => {
        if (targetCurrency === baseCurrency) {
            return 1;
        }

        const rate = await ExchangeRate.findOne({
            tenant_id,
            from_currency: baseCurrency,
            to_currency: targetCurrency,
            effective_date: { $lte: onDate }
        })
        .sort({ effective_date: -1 })
        .lean();

        if (!rate) {
            throw new Error(
                `No exchange rate found for ${baseCurrency} to ${targetCurrency} on or before ${onDate.toISOString().split('T')[0]}`
            );
        }

        return rate.rate;
    };

    // Case 1: From base currency to another currency
    if (fromCurrency === baseCurrency) {
        return await getRateFromBase(toCurrency);
    }

    // Case 2: From another currency to base currency
    if (toCurrency === baseCurrency) {
        const rate = await getRateFromBase(fromCurrency);
        return 1 / rate;
    }

    // Case 3: Between two non-base currencies (triangulation)
    // Example: USD to EUR = (USD→AED rate) × (AED→EUR rate)
    // If 1 AED = 0.27 USD, then 1 USD = 3.70 AED (1/0.27)
    // If 1 AED = 0.25 EUR, then 1 USD = 3.70 × 0.25 = 0.925 EUR
    const fromRate = await getRateFromBase(fromCurrency); // base per 1 from
    const toRate = await getRateFromBase(toCurrency);     // base per 1 to
    
    return (1 / fromRate) * toRate;
}

/**
 * Convert amount from one currency to another
 * 
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {string} tenant_id - Tenant ID
 * @param {Date} onDate - Date for rate lookup (defaults to today)
 * @returns {Promise<number>} Converted amount (rounded to 2 decimal places)
 */
async function convertAmount(amount, fromCurrency, toCurrency, tenant_id, onDate = new Date()) {
    if (amount === 0) return 0;
    
    const rate = await getExchangeRate(tenant_id, fromCurrency, toCurrency, onDate);
    
    // Round to 2 decimal places
    return Math.round(amount * rate * 100) / 100;
}

/**
 * Get latest exchange rates for all active currencies
 * Used for dropdowns and quick reference
 * 
 * @param {string} tenant_id - Tenant ID
 * @returns {Promise<Array>} Array of {currency, rate, effective_date}
 */
async function getLatestRates(tenant_id) {
    const baseCurrency = await getBaseCurrency(tenant_id);
    
    // Get all active currencies
    const currencies = await Currency.find({ 
        tenant_id, 
        is_active: true,
        code: { $ne: baseCurrency } // Exclude base currency
    }).lean();

    const rates = [];

    for (const currency of currencies) {
        try {
            const rateDoc = await ExchangeRate.findOne({
                tenant_id,
                from_currency: baseCurrency,
                to_currency: currency.code,
                effective_date: { $lte: new Date() }
            })
            .sort({ effective_date: -1 })
            .lean();

            if (rateDoc) {
                rates.push({
                    currency: currency.code,
                    currency_name: currency.name,
                    currency_symbol: currency.symbol,
                    rate: rateDoc.rate,
                    effective_date: rateDoc.effective_date,
                    inverse_rate: Math.round((1 / rateDoc.rate) * 1000000) / 1000000 // 6 decimal places
                });
            }
        } catch (err) {
            console.warn(`[Currency Service] Could not get rate for ${currency.code}:`, err.message);
        }
    }

    return rates;
}

/**
 * Calculate FX gain/loss between invoice and payment
 * 
 * @param {number} amount - Amount in foreign currency
 * @param {string} currency - Foreign currency code
 * @param {number} invoiceRate - Exchange rate at invoice date
 * @param {number} paymentRate - Exchange rate at payment date
 * @returns {Object} { fxGainLoss, isGain, invoiceAmountBase, paymentAmountBase }
 */
function calculateFXGainLoss(amount, currency, invoiceRate, paymentRate) {
    const invoiceAmountBase = amount * invoiceRate;
    const paymentAmountBase = amount * paymentRate;
    const fxGainLoss = paymentAmountBase - invoiceAmountBase;
    
    return {
        fxGainLoss: Math.round(fxGainLoss * 100) / 100,
        isGain: fxGainLoss > 0,
        invoiceAmountBase: Math.round(invoiceAmountBase * 100) / 100,
        paymentAmountBase: Math.round(paymentAmountBase * 100) / 100
    };
}

/**
 * Seed default currencies for a tenant
 * 
 * @param {string} tenant_id - Tenant ID
 * @param {string} baseCurrencyCode - Base currency code (default: 'AED')
 * @returns {Promise<number>} Number of currencies created
 */
async function seedDefaultCurrencies(tenant_id, baseCurrencyCode = 'AED') {
    const defaultCurrencies = [
        { code: 'AED', name: 'UAE Dirham', symbol: 'AED', is_base_currency: baseCurrencyCode === 'AED' },
        { code: 'USD', name: 'US Dollar', symbol: '$', is_base_currency: baseCurrencyCode === 'USD' },
        { code: 'EUR', name: 'Euro', symbol: '€', is_base_currency: baseCurrencyCode === 'EUR' },
        { code: 'GBP', name: 'British Pound', symbol: '£', is_base_currency: baseCurrencyCode === 'GBP' },
        { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', is_base_currency: baseCurrencyCode === 'SAR' },
        { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', is_base_currency: baseCurrencyCode === 'QAR' },
        { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', decimal_places: 3, is_base_currency: baseCurrencyCode === 'OMR' },
        { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', decimal_places: 3, is_base_currency: baseCurrencyCode === 'BHD' },
        { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', decimal_places: 3, is_base_currency: baseCurrencyCode === 'KWD' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', is_base_currency: baseCurrencyCode === 'INR' },
        { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', is_base_currency: baseCurrencyCode === 'PKR' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', is_base_currency: baseCurrencyCode === 'CNY' },
    ];

    const existingCount = await Currency.countDocuments({ tenant_id });
    if (existingCount > 0) {
        return 0; // Already seeded
    }

    const currencies = defaultCurrencies.map(c => ({
        ...c,
        tenant_id,
        is_active: true
    }));

    await Currency.insertMany(currencies);
    return currencies.length;
}

/**
 * Seed default exchange rates for a tenant (AED base)
 * 
 * @param {string} tenant_id - Tenant ID
 * @param {Date} effectiveDate - Effective date for rates
 * @returns {Promise<number>} Number of rates created
 */
async function seedDefaultRates(tenant_id, effectiveDate = new Date()) {
    const baseCurrency = await getBaseCurrency(tenant_id);
    
    // Default rates (AED as base)
    const defaultRates = {
        'USD': 0.272,    // 1 AED = 0.272 USD (1 USD = 3.67 AED)
        'EUR': 0.250,    // 1 AED = 0.250 EUR (1 EUR = 4.00 AED)
        'GBP': 0.215,    // 1 AED = 0.215 GBP (1 GBP = 4.65 AED)
        'SAR': 1.020,    // 1 AED = 1.020 SAR (1 SAR = 0.98 AED)
        'QAR': 0.991,    // 1 AED = 0.991 QAR (1 QAR = 1.01 AED)
        'OMR': 0.105,    // 1 AED = 0.105 OMR (1 OMR = 9.53 AED)
        'BHD': 0.103,    // 1 AED = 0.103 BHD (1 BHD = 9.71 AED)
        'KWD': 0.084,    // 1 AED = 0.084 KWD (1 KWD = 11.90 AED)
        'INR': 22.50,    // 1 AED = 22.50 INR (1 INR = 0.044 AED)
        'PKR': 75.80,    // 1 AED = 75.80 PKR (1 PKR = 0.013 AED)
        'CNY': 1.96,     // 1 AED = 1.96 CNY (1 CNY = 0.51 AED)
    };

    if (baseCurrency !== 'AED') {
        console.warn('[Currency Service] Default rates are for AED base. Please set rates manually.');
        return 0;
    }

    const existingCount = await ExchangeRate.countDocuments({ tenant_id });
    if (existingCount > 0) {
        return 0; // Already seeded
    }

    const rates = Object.entries(defaultRates).map(([currency, rate]) => ({
        tenant_id,
        from_currency: baseCurrency,
        to_currency: currency,
        rate,
        effective_date: effectiveDate,
        source: 'manual'
    }));

    await ExchangeRate.insertMany(rates);
    return rates.length;
}

module.exports = {
    getBaseCurrency,
    getExchangeRate,
    convertAmount,
    getLatestRates,
    calculateFXGainLoss,
    seedDefaultCurrencies,
    seedDefaultRates
};
