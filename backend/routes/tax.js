const express = require('express');
const router = express.Router();

const API_NINJAS_KEY = process.env.API_NINJAS_KEY;
const API_NINJAS_BASE = 'https://api.api-ninjas.com/v1';

// ============================================================
// Built-in Global Tax Rates (for countries not covered by API)
// ============================================================
const GLOBAL_TAX_RATES = {
    AE: {
        country: 'United Arab Emirates', system: 'VAT', rates: [
            { type: 'standard', rate: 5, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Exports, basic food, healthcare, education' },
            { type: 'exempt', rate: 0, category: 'Financial services, residential property, bare land' },
        ]
    },
    SA: {
        country: 'Saudi Arabia', system: 'VAT', rates: [
            { type: 'standard', rate: 15, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Exports, international transport' },
            { type: 'exempt', rate: 0, category: 'Financial services, rent' },
        ]
    },
    IN: {
        country: 'India', system: 'GST', rates: [
            { type: 'standard', rate: 18, category: 'Standard GST (most goods & services)' },
            { type: 'reduced', rate: 5, category: 'Essential items, transport' },
            { type: 'reduced', rate: 12, category: 'Processed food, IT products' },
            { type: 'luxury', rate: 28, category: 'Luxury items, automobiles, tobacco' },
            { type: 'zero_rated', rate: 0, category: 'Unbranded food, education, healthcare' },
        ]
    },
    US: {
        country: 'United States', system: 'Sales Tax', rates: [
            { type: 'note', rate: 0, category: 'Sales tax varies by state (0% – 10.25%). Use zip code lookup for precise rates.' },
        ]
    },
    GB: {
        country: 'United Kingdom', system: 'VAT', rates: [
            { type: 'standard', rate: 20, category: 'Standard VAT' },
            { type: 'reduced', rate: 5, category: 'Domestic fuel, child car seats' },
            { type: 'zero_rated', rate: 0, category: 'Food, books, children clothing' },
        ]
    },
    CN: {
        country: 'China', system: 'VAT', rates: [
            { type: 'standard', rate: 13, category: 'Standard VAT (goods)' },
            { type: 'reduced', rate: 9, category: 'Transport, postal, agricultural products' },
            { type: 'reduced', rate: 6, category: 'Modern services, financial services' },
        ]
    },
    JP: {
        country: 'Japan', system: 'Consumption Tax', rates: [
            { type: 'standard', rate: 10, category: 'Standard consumption tax' },
            { type: 'reduced', rate: 8, category: 'Food, beverages (excl. alcohol), newspapers' },
        ]
    },
    AU: {
        country: 'Australia', system: 'GST', rates: [
            { type: 'standard', rate: 10, category: 'Standard GST' },
            { type: 'zero_rated', rate: 0, category: 'Basic food, exports, healthcare' },
        ]
    },
    CA: {
        country: 'Canada', system: 'GST/HST', rates: [
            { type: 'standard', rate: 5, category: 'Federal GST' },
            { type: 'note', rate: 0, category: 'HST rates vary by province (13%–15% combined)' },
        ]
    },
    BR: {
        country: 'Brazil', system: 'ICMS/IPI', rates: [
            { type: 'standard', rate: 17, category: 'Standard ICMS (varies 7%–25% by state)' },
            { type: 'standard', rate: 10, category: 'Average IPI' },
        ]
    },
    SG: {
        country: 'Singapore', system: 'GST', rates: [
            { type: 'standard', rate: 9, category: 'Standard GST' },
            { type: 'zero_rated', rate: 0, category: 'International services, exports' },
        ]
    },
    KW: {
        country: 'Kuwait', system: 'None', rates: [
            { type: 'note', rate: 0, category: 'No VAT/GST currently. Corporate income tax for foreign entities only.' },
        ]
    },
    QA: {
        country: 'Qatar', system: 'None', rates: [
            { type: 'note', rate: 0, category: 'No VAT/GST currently. Excise tax applies to specific goods.' },
        ]
    },
    BH: {
        country: 'Bahrain', system: 'VAT', rates: [
            { type: 'standard', rate: 10, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Exports, basic food, healthcare' },
        ]
    },
    OM: {
        country: 'Oman', system: 'VAT', rates: [
            { type: 'standard', rate: 5, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Exports, basic food, healthcare, education' },
        ]
    },
    EG: {
        country: 'Egypt', system: 'VAT', rates: [
            { type: 'standard', rate: 14, category: 'Standard VAT' },
            { type: 'reduced', rate: 5, category: 'Machinery, equipment' },
        ]
    },
    PK: {
        country: 'Pakistan', system: 'Sales Tax', rates: [
            { type: 'standard', rate: 18, category: 'Federal sales tax on goods' },
            { type: 'reduced', rate: 10, category: 'Some essential items' },
        ]
    },
    MY: {
        country: 'Malaysia', system: 'Sales & Service Tax', rates: [
            { type: 'standard', rate: 8, category: 'Service tax' },
            { type: 'standard', rate: 10, category: 'Sales tax on manufactured goods' },
            { type: 'reduced', rate: 5, category: 'Certain food items, building materials' },
        ]
    },
    ZA: {
        country: 'South Africa', system: 'VAT', rates: [
            { type: 'standard', rate: 15, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Basic food, exports, agricultural inputs' },
        ]
    },
    NG: {
        country: 'Nigeria', system: 'VAT', rates: [
            { type: 'standard', rate: 7.5, category: 'Standard VAT' },
            { type: 'exempt', rate: 0, category: 'Medical & pharmaceutical products, basic food' },
        ]
    },
    KE: {
        country: 'Kenya', system: 'VAT', rates: [
            { type: 'standard', rate: 16, category: 'Standard VAT' },
            { type: 'reduced', rate: 8, category: 'Petroleum products' },
            { type: 'zero_rated', rate: 0, category: 'Exports, certain agricultural goods' },
        ]
    },
    TR: {
        country: 'Turkey', system: 'VAT (KDV)', rates: [
            { type: 'standard', rate: 20, category: 'Standard VAT' },
            { type: 'reduced', rate: 10, category: 'Basic food, textiles, hospitality' },
            { type: 'reduced', rate: 1, category: 'Unprocessed food, newspapers, seeds' },
        ]
    },
    MX: {
        country: 'Mexico', system: 'IVA', rates: [
            { type: 'standard', rate: 16, category: 'Standard IVA' },
            { type: 'zero_rated', rate: 0, category: 'Basic food, medicine, exports' },
        ]
    },
    KR: {
        country: 'South Korea', system: 'VAT', rates: [
            { type: 'standard', rate: 10, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Exports, overseas services' },
        ]
    },
    ID: {
        country: 'Indonesia', system: 'VAT (PPN)', rates: [
            { type: 'standard', rate: 12, category: 'Standard PPN' },
            { type: 'zero_rated', rate: 0, category: 'Exports' },
        ]
    },
    TH: {
        country: 'Thailand', system: 'VAT', rates: [
            { type: 'standard', rate: 7, category: 'Standard VAT (reduced from 10%)' },
            { type: 'zero_rated', rate: 0, category: 'Exports' },
        ]
    },
    PH: {
        country: 'Philippines', system: 'VAT', rates: [
            { type: 'standard', rate: 12, category: 'Standard VAT' },
            { type: 'zero_rated', rate: 0, category: 'Exports, BOI-registered enterprises' },
        ]
    },
    VN: {
        country: 'Vietnam', system: 'VAT', rates: [
            { type: 'standard', rate: 10, category: 'Standard VAT' },
            { type: 'reduced', rate: 5, category: 'Essential goods, healthcare, education supplies' },
        ]
    },
    BD: {
        country: 'Bangladesh', system: 'VAT', rates: [
            { type: 'standard', rate: 15, category: 'Standard VAT' },
            { type: 'reduced', rate: 5, category: 'Cash register businesses' },
        ]
    },
    LK: {
        country: 'Sri Lanka', system: 'VAT', rates: [
            { type: 'standard', rate: 18, category: 'Standard VAT' },
            { type: 'exempt', rate: 0, category: 'Banking, insurance, healthcare' },
        ]
    },
    NZ: {
        country: 'New Zealand', system: 'GST', rates: [
            { type: 'standard', rate: 15, category: 'Standard GST' },
            { type: 'zero_rated', rate: 0, category: 'Exports, financial services' },
        ]
    },
    CH: {
        country: 'Switzerland', system: 'VAT', rates: [
            { type: 'standard', rate: 8.1, category: 'Standard VAT' },
            { type: 'reduced', rate: 2.6, category: 'Food, books, medicines, newspapers' },
            { type: 'reduced', rate: 3.8, category: 'Accommodation services' },
        ]
    },
    NO: {
        country: 'Norway', system: 'VAT (MVA)', rates: [
            { type: 'standard', rate: 25, category: 'Standard VAT' },
            { type: 'reduced', rate: 15, category: 'Food & beverages' },
            { type: 'reduced', rate: 12, category: 'Transport, accommodation, cultural events' },
        ]
    },
    SE: {
        country: 'Sweden', system: 'VAT (Moms)', rates: [
            { type: 'standard', rate: 25, category: 'Standard VAT' },
            { type: 'reduced', rate: 12, category: 'Food, restaurants, hotels' },
            { type: 'reduced', rate: 6, category: 'Books, newspapers, transport' },
        ]
    },
    RU: {
        country: 'Russia', system: 'VAT (NDS)', rates: [
            { type: 'standard', rate: 20, category: 'Standard VAT' },
            { type: 'reduced', rate: 10, category: 'Food, children goods, medicines' },
            { type: 'zero_rated', rate: 0, category: 'Exports' },
        ]
    },
};

// EU country codes (for API Ninjas VAT lookup)
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES'
];

/**
 * GET /api/tax/rates/:countryCode
 * Returns tax rates for a given country code
 */
router.get('/rates/:countryCode', async (req, res) => {
    try {
        const cc = req.params.countryCode.toUpperCase();

        // For EU countries, try API Ninjas live data
        if (EU_COUNTRIES.includes(cc) && API_NINJAS_KEY) {
            try {
                const response = await fetch(
                    `${API_NINJAS_BASE}/vat?country=${cc}`,
                    { headers: { 'X-Api-Key': API_NINJAS_KEY } }
                );

                if (response.ok) {
                    const apiData = await response.json();
                    if (apiData && apiData.length > 0) {
                        // Normalize API Ninjas format to our format
                        const rates = apiData.map(item => ({
                            type: normalizeType(item.type),
                            rate: item.rate,
                            category: item.category || `${capitalize(item.type)} rate`,
                            date: item.date,
                        }));

                        // Deduplicate: group by type, keep unique rates
                        const deduped = deduplicateRates(rates);

                        return res.json({
                            success: true,
                            source: 'api_ninjas',
                            data: {
                                country: cc,
                                countryName: getCountryName(cc),
                                system: 'VAT',
                                rates: deduped,
                                lastUpdated: new Date().toISOString(),
                            }
                        });
                    }
                }
            } catch (apiErr) {
                console.warn(`[Tax API] API Ninjas error for ${cc}:`, apiErr.message);
            }
        }

        // Fallback to built-in database
        if (GLOBAL_TAX_RATES[cc]) {
            const data = GLOBAL_TAX_RATES[cc];
            return res.json({
                success: true,
                source: 'builtin',
                data: {
                    country: cc,
                    countryName: data.country,
                    system: data.system,
                    rates: data.rates,
                    lastUpdated: '2025-01-01',
                }
            });
        }

        // Country not found
        return res.json({
            success: true,
            source: 'default',
            data: {
                country: cc,
                countryName: getCountryName(cc),
                system: 'Unknown',
                rates: [{ type: 'note', rate: 0, category: 'Tax data not available for this country. Please configure manually.' }],
                lastUpdated: null,
            }
        });

    } catch (error) {
        console.error('[Tax API] Error:', error);
        res.status(500).json({ error: 'Failed to fetch tax rates' });
    }
});

/**
 * GET /api/tax/salestax/:zipCode
 * US-specific: Returns sales tax rates by ZIP code
 */
router.get('/salestax/:zipCode', async (req, res) => {
    try {
        if (!API_NINJAS_KEY) {
            return res.status(503).json({ error: 'API key not configured' });
        }

        const response = await fetch(
            `${API_NINJAS_BASE}/salestax?zip_code=${req.params.zipCode}`,
            { headers: { 'X-Api-Key': API_NINJAS_KEY } }
        );

        if (response.ok) {
            const data = await response.json();
            return res.json({ success: true, source: 'api_ninjas', data });
        }

        res.status(response.status).json({ error: 'Failed to fetch sales tax' });
    } catch (error) {
        console.error('[Tax API] Sales tax error:', error);
        res.status(500).json({ error: 'Failed to fetch sales tax rates' });
    }
});

// === Helpers ===
function normalizeType(type) {
    const map = {
        'standard': 'standard',
        'reduced_rate': 'reduced',
        'super_reduced': 'super_reduced',
        'exempted': 'exempt',
        'out_of_scope': 'exempt',
        'parking': 'parking',
    };
    return map[type] || type;
}

function capitalize(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function deduplicateRates(rates) {
    // Group by type+rate, combine categories
    const map = new Map();
    for (const r of rates) {
        const key = `${r.type}_${r.rate}`;
        if (!map.has(key)) {
            map.set(key, { ...r });
        }
    }
    return Array.from(map.values());
}

function getCountryName(code) {
    const names = {
        AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus',
        CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FI: 'Finland', FR: 'France',
        DE: 'Germany', GR: 'Greece', HU: 'Hungary', IE: 'Ireland', IT: 'Italy',
        LV: 'Latvia', LT: 'Lithuania', LU: 'Luxembourg', MT: 'Malta', NL: 'Netherlands',
        PL: 'Poland', PT: 'Portugal', RO: 'Romania', SK: 'Slovakia', SI: 'Slovenia',
        ES: 'Spain', AE: 'United Arab Emirates', SA: 'Saudi Arabia', IN: 'India',
        US: 'United States', GB: 'United Kingdom', CN: 'China', JP: 'Japan',
        AU: 'Australia', CA: 'Canada', BR: 'Brazil', SG: 'Singapore', KW: 'Kuwait',
        QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', EG: 'Egypt', PK: 'Pakistan',
        MY: 'Malaysia', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', TR: 'Turkey',
        MX: 'Mexico', KR: 'South Korea', ID: 'Indonesia', TH: 'Thailand',
        PH: 'Philippines', VN: 'Vietnam', BD: 'Bangladesh', LK: 'Sri Lanka',
        NZ: 'New Zealand', CH: 'Switzerland', NO: 'Norway', SE: 'Sweden', RU: 'Russia',
    };
    return names[code] || code;
}

module.exports = router;
