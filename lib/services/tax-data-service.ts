/**
 * APILayer Tax Data Service
 * Collects VAT/Tax data for all supported countries 3 times per month
 * Stores in database for global user access
 */

import { prisma } from '@/lib/prisma';
import { SUPPORTED_TAX_COUNTRIES, TAX_COLLECTION_CONFIG, APILAYER_ENDPOINTS } from '@/lib/tax-data-setup';

// APILayer Tax Data API Configuration
const APILAYER_API_KEY = process.env.APILAYER_API_KEY;

export interface TaxData {
  country_code: string;
  country_name: string;
  vat_rate: number;
  standard_rate: number;
  reduced_rates: number[];
  super_reduced_rate?: number;
  parking_rate?: number;
  zero_rate?: boolean;
  reverse_charge_applicable: boolean;
  last_updated: string;
  applies_from: string;
  notes?: string;
}

export interface PriceConversionData {
  country_code: string;
  base_amount: number;
  base_currency: string;
  vat_amount: number;
  total_with_vat: number;
  vat_rate: number;
  conversion_date: string;
}

export interface StoredTaxDatabase {
  id?: string;
  collection_date: string;
  data: TaxData[];
  all_countries: string[];
  last_sync: string;
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
  version: number;
  updated_at?: string;
}

class TaxDataService {
  /**
   * Fetch single country VAT data from APILayer
   */
  async fetchCountryTaxData(countryCode: string): Promise<TaxData | null> {
    if (!APILAYER_API_KEY) {
      console.warn('APILAYER_API_KEY not configured properly');
      return null;
    }

    try {
      // Try real API first
      const response = await fetch(
        `${APILAYER_ENDPOINTS.CHECK_TAX}?country=${countryCode}`,
        {
          headers: {
            apikey: APILAYER_API_KEY,
          },
          signal: AbortSignal.timeout(TAX_COLLECTION_CONFIG.REQUEST_TIMEOUT_MS)
        }
      );

      if (response.ok) {
        const data = await response.json();
        // APILayer returns rates as decimals (0.05 = 5%)
        // Transform APILayer response to our format (percentages)
        const stdRate = data.standard_rate?.rate ? data.standard_rate.rate * 100 : 0;
        const redRates = Array.isArray(data.other_rates) 
          ? data.other_rates.map((r: any) => r.rate * 100) 
          : [];

        return {
          country_code: countryCode.toUpperCase(),
          country_name: data.country_name || '',
          vat_rate: stdRate,
          standard_rate: stdRate,
          reduced_rates: redRates,
          super_reduced_rate: undefined,
          parking_rate: undefined,
          zero_rate: redRates.includes(0),
          reverse_charge_applicable: false,
          last_updated: new Date().toISOString(),
          applies_from: new Date().toISOString(),
          notes: data.standard_rate?.description || '',
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error(`APILayer Error for ${countryCode}:`, errData);
      }
    } catch (error) {
      console.error(`Network/Timeout error fetching tax data for ${countryCode}:`, error);
    }

    return null;
  }

  /**
   * Fetch all supported countries from APILayer
   */
  async fetchSupportedCountries(): Promise<string[]> {
    if (!APILAYER_API_KEY) {
      return Object.values(SUPPORTED_TAX_COUNTRIES).flat();
    }

    try {
      const response = await fetch(APILAYER_ENDPOINTS.GET_COUNTRIES, {
        headers: { apikey: APILAYER_API_KEY },
        signal: AbortSignal.timeout(TAX_COLLECTION_CONFIG.REQUEST_TIMEOUT_MS)
      });

      if (response.ok) {
        const data = await response.json();
        // APILayer returns an object where keys are country codes
        if (data && typeof data === 'object') {
          const codes = Object.keys(data);
          if (codes.length > 0) {
            console.log(`[TAX SERVICE] Dynamically identified ${codes.length} countries from API`);
            return codes;
          }
        }
      }
    } catch (error) {
      console.error('[TAX SERVICE] Failed to fetch dynamic country list, using fallback:', error);
    }

    return Object.values(SUPPORTED_TAX_COUNTRIES).flat();
  }

  /**
   * Collect tax data for all countries (called ~3 times per month)
   */
  async collectAllCountriesTaxData(): Promise<StoredTaxDatabase | null> {
    console.log('[TAX SERVICE] Starting comprehensive tax data collection...');

    // Get the most up-to-date list of countries
    const countryCodes = await this.fetchSupportedCountries();

    const collectedData: TaxData[] = [];
    const errors: Array<{ country: string; error: string }> = [];

    // Fetch data with rate limiting and retry logic
    for (const code of countryCodes) {
      let taxData = null;
      let retries = 0;

      while (!taxData && retries <= TAX_COLLECTION_CONFIG.MAX_RETRIES) {
        if (retries > 0) {
          console.log(`[TAX SERVICE] Retrying ${code} (Attempt ${retries})...`);
          await new Promise(r => setTimeout(r, 1000 * retries));
        }
        
        taxData = await this.fetchCountryTaxData(code);
        retries++;
      }

      if (taxData) {
        collectedData.push(taxData);
        console.log(`[TAX SERVICE] ✓ Collected tax data for ${code}`);
      } else {
        errors.push({ country: code, error: 'Failed after retries' });
        console.warn(`[TAX SERVICE] ✗ Failed to collect tax data for ${code}`);
      }

      // Rate limiting: configured delay between requests
      await new Promise((resolve) => setTimeout(resolve, TAX_COLLECTION_CONFIG.REQUEST_DELAY_MS));
    }

    const storedData: StoredTaxDatabase = {
      collection_date: new Date().toISOString(),
      data: collectedData,
      all_countries: countryCodes,
      last_sync: new Date().toISOString(),
      status: errors.length === 0 ? 'success' : collectedData.length > 0 ? 'partial' : 'failed',
      error_message: errors.length > 0 ? `Failed for ${errors.length} countries` : undefined,
      version: 1,
    };

    // Store in database
    await this.storeTaxDatabase(storedData);

    return storedData;
  }

  /**
   * Store tax database in SystemSettings
   */
  async storeTaxDatabase(data: StoredTaxDatabase): Promise<void> {
    if (!prisma) {
      console.warn('Prisma not initialized');
      return;
    }

    try {
      await prisma.systemSettings.upsert({
        where: { key: TAX_COLLECTION_CONFIG.STORAGE_KEY },
        update: {
          value: data as any,
          updated_at: new Date(),
        },
        create: {
          key: TAX_COLLECTION_CONFIG.STORAGE_KEY,
          value: data as any,
        },
      });

      console.log(`[TAX SERVICE] Tax database (${data.data.length} records) stored successfully`);
    } catch (error) {
      console.error('[TAX SERVICE] Error storing tax database:', error);
    }
  }

  /**
   * Retrieve stored tax database
   */
  async getTaxDatabase(): Promise<StoredTaxDatabase | null> {
    if (!prisma) {
      console.warn('Prisma not initialized');
      return null;
    }

    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: TAX_COLLECTION_CONFIG.STORAGE_KEY },
      });

      return setting ? (setting.value as unknown as StoredTaxDatabase) : null;
    } catch (error) {
      console.error('[TAX SERVICE] Error retrieving tax database:', error);
      return null;
    }
  }

  /**
   * Get tax data for specific country
   */
  async getCountryTaxData(countryCode: string): Promise<TaxData | null> {
    const db = await this.getTaxDatabase();

    if (!db) {
      return null;
    }

    return (
      db.data.find(
        (tax) => tax.country_code.toUpperCase() === countryCode.toUpperCase()
      ) || null
    );
  }

  /**
   * Calculate price with VAT
   */
  async calculatePriceWithVAT(
    countryCode: string,
    baseAmount: number,
    currency: string = 'USD'
  ): Promise<PriceConversionData | null> {
    const taxData = await this.getCountryTaxData(countryCode);

    if (!taxData) {
      return null;
    }

    const vatRate = taxData.vat_rate / 100;
    const vatAmount = baseAmount * vatRate;
    const totalWithVAT = baseAmount + vatAmount;

    return {
      country_code: countryCode.toUpperCase(),
      base_amount: baseAmount,
      base_currency: currency,
      vat_amount: parseFloat(vatAmount.toFixed(2)),
      total_with_vat: parseFloat(totalWithVAT.toFixed(2)),
      vat_rate: taxData.vat_rate,
      conversion_date: new Date().toISOString(),
    };
  }

  /**
   * Validate VAT number via APILayer
   */
  async validateVATNumber(vatNumber: string): Promise<{ valid: boolean; country: string | null }> {
    if (!APILAYER_API_KEY) {
      console.warn('APILAYER_API_KEY not configured');
      return { valid: false, country: null };
    }

    try {
      const response = await fetch(
        `${APILAYER_ENDPOINTS.VALIDATE_VAT}?vat_number=${vatNumber}`,
        {
          headers: {
            apikey: APILAYER_API_KEY,
          },
        }
      );

      if (!response.ok) {
        return { valid: false, country: null };
      }

      const data = await response.json();
      return {
        valid: data.valid || false,
        country: data.country_code || null,
      };
    } catch (error) {
      console.error(`Error validating VAT number ${vatNumber}:`, error);
      return { valid: false, country: null };
    }
  }

  /**
   * Get all available countries in tax database
   */
  async getAllAvailableCountries(): Promise<Array<{ code: string; name: string; vatRate: number }>> {
    const db = await this.getTaxDatabase();

    if (!db) {
      return [];
    }

    return db.data.map((tax) => ({
      code: tax.country_code,
      name: tax.country_name,
      vatRate: tax.vat_rate,
    }));
  }

  /**
   * Check last collection timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    const db = await this.getTaxDatabase();

    if (!db || !db.last_sync) {
      return null;
    }

    return new Date(db.last_sync);
  }

  /**
   * Check if collection is needed based on 10-day interval
   */
  async shouldCollectTaxData(): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();

    if (!lastSync) {
      return true; // Never collected
    }

    const intervalMs = TAX_COLLECTION_CONFIG.COLLECTION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
    const nextCollectTime = lastSync.getTime() + intervalMs;

    return Date.now() > nextCollectTime;
  }
}

export const taxDataService = new TaxDataService();