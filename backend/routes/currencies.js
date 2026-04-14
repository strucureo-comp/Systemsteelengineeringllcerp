const express = require('express');
const router = express.Router();
const Currency = require('../models/Currency');
const ExchangeRate = require('../models/ExchangeRate');
const { auth, adminOnly } = require('../middleware/auth');
const { getLatestRates, getBaseCurrency, seedDefaultCurrencies, seedDefaultRates } = require('../services/currencyService');

router.use(auth);

function tenantIdFromReq(req) {
    return req.user?.tenant_id || 'default';
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRENCY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/settings/currencies - List all currencies
router.get('/', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { active_only } = req.query;
        
        const filter = { tenant_id };
        if (active_only === 'true') {
            filter.is_active = true;
        }
        
        const currencies = await Currency.find(filter)
            .sort({ is_base_currency: -1, code: 1 })
            .lean();
        
        res.json({ success: true, data: currencies });
    } catch (err) {
        console.error('[Currencies] List error:', err);
        res.status(500).json({ error: 'Failed to fetch currencies' });
    }
});

// GET /api/settings/currencies/:code - Get single currency
router.get('/:code', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const currency = await Currency.findOne({ 
            tenant_id, 
            code: req.params.code.toUpperCase() 
        }).lean();
        
        if (!currency) {
            return res.status(404).json({ error: 'Currency not found' });
        }
        
        res.json({ success: true, data: currency });
    } catch (err) {
        console.error('[Currencies] Get error:', err);
        res.status(500).json({ error: 'Failed to fetch currency' });
    }
});

// POST /api/settings/currencies - Add new currency
router.post('/', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { code, name, symbol, decimal_places, is_base_currency } = req.body;
        
        // Check if currency already exists
        const existing = await Currency.findOne({ 
            tenant_id, 
            code: code.toUpperCase() 
        });
        
        if (existing) {
            return res.status(409).json({ 
                error: `Currency ${code} already exists for this tenant` 
            });
        }
        
        const currency = await Currency.create({
            tenant_id,
            code: code.toUpperCase(),
            name,
            symbol,
            decimal_places: decimal_places || 2,
            is_base_currency: is_base_currency || false,
            is_active: true,
            created_by: req.user._id
        });
        
        res.status(201).json({ 
            success: true, 
            data: currency,
            message: `Currency ${code} added successfully` 
        });
    } catch (err) {
        console.error('[Currencies] Create error:', err);
        res.status(500).json({ error: 'Failed to create currency', detail: err.message });
    }
});

// PATCH /api/settings/currencies/:code - Update currency
router.patch('/:code', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { name, symbol, decimal_places, is_base_currency } = req.body;
        
        const currency = await Currency.findOne({ 
            tenant_id, 
            code: req.params.code.toUpperCase() 
        });
        
        if (!currency) {
            return res.status(404).json({ error: 'Currency not found' });
        }
        
        if (name) currency.name = name;
        if (symbol) currency.symbol = symbol;
        if (decimal_places !== undefined) currency.decimal_places = decimal_places;
        if (is_base_currency !== undefined) currency.is_base_currency = is_base_currency;
        
        await currency.save();
        
        res.json({ 
            success: true, 
            data: currency,
            message: `Currency ${currency.code} updated successfully` 
        });
    } catch (err) {
        console.error('[Currencies] Update error:', err);
        res.status(500).json({ error: 'Failed to update currency', detail: err.message });
    }
});

// PATCH /api/settings/currencies/:code/activate - Activate currency
router.patch('/:code/activate', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const currency = await Currency.findOneAndUpdate(
            { tenant_id, code: req.params.code.toUpperCase() },
            { is_active: true },
            { new: true }
        );
        
        if (!currency) {
            return res.status(404).json({ error: 'Currency not found' });
        }
        
        res.json({ 
            success: true, 
            data: currency,
            message: `Currency ${currency.code} activated` 
        });
    } catch (err) {
        console.error('[Currencies] Activate error:', err);
        res.status(500).json({ error: 'Failed to activate currency' });
    }
});

// PATCH /api/settings/currencies/:code/deactivate - Deactivate currency
router.patch('/:code/deactivate', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const currency = await Currency.findOne({ 
            tenant_id, 
            code: req.params.code.toUpperCase() 
        });
        
        if (!currency) {
            return res.status(404).json({ error: 'Currency not found' });
        }
        
        if (currency.is_base_currency) {
            return res.status(400).json({ 
                error: 'Cannot deactivate base currency' 
            });
        }
        
        currency.is_active = false;
        await currency.save();
        
        res.json({ 
            success: true, 
            data: currency,
            message: `Currency ${currency.code} deactivated` 
        });
    } catch (err) {
        console.error('[Currencies] Deactivate error:', err);
        res.status(500).json({ error: 'Failed to deactivate currency' });
    }
});

// DELETE /api/settings/currencies/:code - Delete currency
router.delete('/:code', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const currency = await Currency.findOne({ 
            tenant_id, 
            code: req.params.code.toUpperCase() 
        });
        
        if (!currency) {
            return res.status(404).json({ error: 'Currency not found' });
        }
        
        if (currency.is_base_currency) {
            return res.status(400).json({ 
                error: 'Cannot delete base currency' 
            });
        }
        
        // Check if currency is used in exchange rates
        const ratesCount = await ExchangeRate.countDocuments({
            tenant_id,
            $or: [
                { from_currency: currency.code },
                { to_currency: currency.code }
            ]
        });
        
        if (ratesCount > 0) {
            return res.status(400).json({ 
                error: `Cannot delete currency ${currency.code}. It has ${ratesCount} exchange rate(s) associated with it.` 
            });
        }
        
        await Currency.deleteOne({ _id: currency._id });
        
        res.json({ 
            success: true,
            message: `Currency ${currency.code} deleted successfully` 
        });
    } catch (err) {
        console.error('[Currencies] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete currency' });
    }
});

// POST /api/settings/currencies/seed - Seed default currencies
router.post('/seed', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { base_currency } = req.body;
        
        const count = await seedDefaultCurrencies(tenant_id, base_currency || 'AED');
        
        if (count === 0) {
            return res.json({ 
                success: true, 
                message: 'Currencies already seeded',
                count: 0
            });
        }
        
        res.json({ 
            success: true, 
            message: `${count} default currencies seeded successfully`,
            count 
        });
    } catch (err) {
        console.error('[Currencies] Seed error:', err);
        res.status(500).json({ error: 'Failed to seed currencies', detail: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXCHANGE RATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/settings/exchange-rates - List exchange rates
router.get('/exchange-rates/list', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { currency, from, to, limit } = req.query;
        
        const filter = { tenant_id };
        
        if (currency) {
            filter.to_currency = currency.toUpperCase();
        }
        
        if (from || to) {
            filter.effective_date = {};
            if (from) filter.effective_date.$gte = new Date(from);
            if (to) filter.effective_date.$lte = new Date(to);
        }
        
        const rates = await ExchangeRate.find(filter)
            .sort({ effective_date: -1, to_currency: 1 })
            .limit(limit ? parseInt(limit) : 100)
            .populate('created_by', 'full_name email')
            .lean();
        
        res.json({ success: true, data: rates });
    } catch (err) {
        console.error('[Exchange Rates] List error:', err);
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
});

// GET /api/settings/exchange-rates/latest - Get latest rates for all currencies
router.get('/exchange-rates/latest', async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const rates = await getLatestRates(tenant_id);
        
        res.json({ success: true, data: rates });
    } catch (err) {
        console.error('[Exchange Rates] Latest error:', err);
        res.status(500).json({ error: 'Failed to fetch latest rates' });
    }
});

// POST /api/settings/exchange-rates - Add new exchange rate
router.post('/exchange-rates', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { to_currency, rate, effective_date, notes } = req.body;
        
        // Validation
        if (!to_currency || !rate || !effective_date) {
            return res.status(400).json({ 
                error: 'to_currency, rate, and effective_date are required' 
            });
        }
        
        if (rate <= 0) {
            return res.status(400).json({ 
                error: 'Exchange rate must be greater than 0' 
            });
        }
        
        const effectiveDateObj = new Date(effective_date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (effectiveDateObj > today) {
            return res.status(400).json({ 
                error: 'Effective date cannot be in the future' 
            });
        }
        
        // Get base currency
        const baseCurrency = await getBaseCurrency(tenant_id);
        
        if (to_currency.toUpperCase() === baseCurrency) {
            return res.status(400).json({ 
                error: `Cannot set exchange rate for base currency ${baseCurrency}` 
            });
        }
        
        // Check for duplicate
        const existing = await ExchangeRate.findOne({
            tenant_id,
            from_currency: baseCurrency,
            to_currency: to_currency.toUpperCase(),
            effective_date: effectiveDateObj
        });
        
        if (existing) {
            return res.status(409).json({ 
                error: `Exchange rate for ${to_currency} on ${effective_date} already exists` 
            });
        }
        
        const exchangeRate = await ExchangeRate.create({
            tenant_id,
            from_currency: baseCurrency,
            to_currency: to_currency.toUpperCase(),
            rate: parseFloat(rate),
            effective_date: effectiveDateObj,
            source: 'manual',
            notes,
            created_by: req.user._id
        });
        
        res.status(201).json({ 
            success: true, 
            data: exchangeRate,
            message: `Exchange rate for ${to_currency} added successfully` 
        });
    } catch (err) {
        console.error('[Exchange Rates] Create error:', err);
        res.status(500).json({ error: 'Failed to create exchange rate', detail: err.message });
    }
});

// DELETE /api/settings/exchange-rates/:id - Delete exchange rate
router.delete('/exchange-rates/:id', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        
        const rate = await ExchangeRate.findOneAndDelete({
            _id: req.params.id,
            tenant_id
        });
        
        if (!rate) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }
        
        res.json({ 
            success: true,
            message: `Exchange rate deleted successfully` 
        });
    } catch (err) {
        console.error('[Exchange Rates] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete exchange rate' });
    }
});

// POST /api/settings/exchange-rates/seed - Seed default rates
router.post('/exchange-rates/seed', adminOnly, async (req, res) => {
    try {
        const tenant_id = tenantIdFromReq(req);
        const { effective_date } = req.body;
        
        const count = await seedDefaultRates(
            tenant_id, 
            effective_date ? new Date(effective_date) : new Date()
        );
        
        if (count === 0) {
            return res.json({ 
                success: true, 
                message: 'Exchange rates already seeded or base currency is not AED',
                count: 0
            });
        }
        
        res.json({ 
            success: true, 
            message: `${count} default exchange rates seeded successfully`,
            count 
        });
    } catch (err) {
        console.error('[Exchange Rates] Seed error:', err);
        res.status(500).json({ error: 'Failed to seed exchange rates', detail: err.message });
    }
});

module.exports = router;
