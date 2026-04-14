/**
 * Format amount as currency with proper symbol and decimal places
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'AED', 'EUR')
 * @param locale - Locale for formatting (default: 'en-AE')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'AED', 
  locale: string = 'en-AE'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format amount with currency symbol (no locale formatting)
 * 
 * @param amount - Amount to format
 * @param currencySymbol - Currency symbol (e.g., '$', 'AED', '€')
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatAmount(
  amount: number,
  currencySymbol: string = 'AED',
  decimalPlaces: number = 2
): string {
  const formatted = amount.toFixed(decimalPlaces);
  return `${currencySymbol} ${formatted}`;
}

/**
 * Format exchange rate with appropriate decimal places
 * 
 * @param rate - Exchange rate
 * @param decimalPlaces - Number of decimal places (default: 6)
 * @returns Formatted rate string
 */
export function formatExchangeRate(
  rate: number,
  decimalPlaces: number = 6
): string {
  return rate.toFixed(decimalPlaces);
}

/**
 * Parse currency string to number
 * 
 * @param value - Currency string (e.g., "1,234.56" or "AED 1,234.56")
 * @returns Parsed number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols, letters, and spaces
  const cleaned = value.replace(/[^\d.,-]/g, '');
  // Remove thousand separators
  const normalized = cleaned.replace(/,/g, '');
  return parseFloat(normalized) || 0;
}

/**
 * Get currency symbol from currency code
 * 
 * @param currencyCode - Currency code (e.g., 'USD', 'EUR')
 * @param locale - Locale for symbol lookup (default: 'en-US')
 * @returns Currency symbol
 */
export function getCurrencySymbol(
  currencyCode: string,
  locale: string = 'en-US'
): string {
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
    
    // Extract symbol by removing digits
    return formatted.replace(/[\d\s]/g, '');
  } catch (error) {
    return currencyCode;
  }
}

/**
 * Format currency with base currency equivalent
 * 
 * @param amount - Amount in foreign currency
 * @param currency - Foreign currency code
 * @param baseAmount - Amount in base currency
 * @param baseCurrency - Base currency code
 * @returns Formatted string with both amounts
 */
export function formatWithBase(
  amount: number,
  currency: string,
  baseAmount: number,
  baseCurrency: string = 'AED'
): string {
  const foreign = formatCurrency(amount, currency);
  const base = formatCurrency(baseAmount, baseCurrency);
  
  if (currency === baseCurrency) {
    return foreign;
  }
  
  return `${foreign} (${base})`;
}
