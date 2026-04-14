const express = require('express');
const router = express.Router();
const {
    TaxJurisdiction,
    TaxCode,
    FilingPeriod,
    TaxAdjustment,
    VATReturn,
    CorporateTaxFiling,
} = require('../models/TaxCenter');
const { auth } = require('../middleware/auth');

router.use(auth);

function tenantIdFromReq(req) {
    return req.user?.tenant_id || 'default';
}

function tenantFilter(req, extra = {}) {
    return { tenant_id: tenantIdFromReq(req), ...extra };
}

function normalize(doc) {
    if (!doc) return doc;
    const value = doc.toObject ? doc.toObject() : doc;
    return { ...value, id: String(value._id || value.id) };
}

function safeNumber(value) {
    return Number(value || 0);
}

function computeNetVAT(body = {}) {
    const totalOutputVAT = safeNumber(body.totalOutputVAT);
    const totalInputVAT = safeNumber(body.totalInputVAT);
    const adjustments = safeNumber(body.adjustments);
    return totalOutputVAT - totalInputVAT + adjustments;
}

function computeCorporateTax(body = {}) {
    const taxableIncome = safeNumber(body.taxableIncome);
    const taxRate = safeNumber(body.taxRate);
    const lossesCarriedForward = safeNumber(body.lossesCarriedForward);
    const adjustedIncome = Math.max(0, taxableIncome - lossesCarriedForward);
    const taxLiability = safeNumber(body.taxLiability || (adjustedIncome * taxRate) / 100);
    return {
        taxableIncome,
        taxRate,
        lossesCarriedForward,
        taxLiability,
        taxPayable: safeNumber(body.taxPayable || taxLiability),
    };
}

// ======================================================
// TAX JURISDICTIONS
// ======================================================

router.get('/jurisdictions', async (req, res) => {
    try {
        const items = await TaxJurisdiction.find(tenantFilter(req)).sort({ createdAt: -1 }).lean();
        res.json(items.map(normalize));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch jurisdictions' });
    }
});

router.post('/jurisdictions', async (req, res) => {
    try {
        const item = new TaxJurisdiction({ ...req.body, tenant_id: tenantIdFromReq(req) });
        await item.save();
        res.status(201).json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create jurisdiction', detail: err.message });
    }
});

router.put('/jurisdictions/:id', async (req, res) => {
    try {
        const item = await TaxJurisdiction.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            req.body,
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Jurisdiction not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update jurisdiction' });
    }
});

router.delete('/jurisdictions/:id', async (req, res) => {
    try {
        const item = await TaxJurisdiction.findOneAndDelete(tenantFilter(req, { _id: req.params.id }));
        if (!item) return res.status(404).json({ error: 'Jurisdiction not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete jurisdiction' });
    }
});

// ======================================================
// TAX CODES
// ======================================================

router.get('/codes', async (req, res) => {
    try {
        const filter = tenantFilter(req);
        if (req.query.jurisdiction) filter.jurisdiction = req.query.jurisdiction;
        const items = await TaxCode.find(filter).sort({ createdAt: -1 }).lean();
        res.json(items.map(normalize));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tax codes' });
    }
});

router.post('/codes', async (req, res) => {
    try {
        const item = new TaxCode({ ...req.body, tenant_id: tenantIdFromReq(req) });
        await item.save();
        res.status(201).json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create tax code', detail: err.message });
    }
});

router.put('/codes/:id', async (req, res) => {
    try {
        const item = await TaxCode.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            req.body,
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Tax code not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update tax code' });
    }
});

router.delete('/codes/:id', async (req, res) => {
    try {
        const item = await TaxCode.findOneAndDelete(tenantFilter(req, { _id: req.params.id }));
        if (!item) return res.status(404).json({ error: 'Tax code not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete tax code' });
    }
});

// ======================================================
// FILING PERIODS
// ======================================================

router.get('/filing-periods', async (req, res) => {
    try {
        const filter = tenantFilter(req);
        if (req.query.jurisdiction) filter.jurisdiction = req.query.jurisdiction;
        const items = await FilingPeriod.find(filter).sort({ createdAt: -1 }).lean();
        res.json(items.map(normalize));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch filing periods' });
    }
});

router.post('/filing-periods', async (req, res) => {
    try {
        const body = {
            ...req.body,
            tenant_id: tenantIdFromReq(req),
            netLiability: safeNumber(req.body.taxPayable) - safeNumber(req.body.taxReceivable),
        };
        const item = new FilingPeriod(body);
        await item.save();
        res.status(201).json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create filing period', detail: err.message });
    }
});

router.put('/filing-periods/:id', async (req, res) => {
    try {
        const body = { ...req.body };
        if (body.taxPayable !== undefined || body.taxReceivable !== undefined) {
            body.netLiability = safeNumber(body.taxPayable) - safeNumber(body.taxReceivable);
        }
        const item = await FilingPeriod.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            body,
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Filing period not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update filing period' });
    }
});

router.patch('/filing-periods/:id/status', async (req, res) => {
    try {
        const fp = await FilingPeriod.findOne(tenantFilter(req, { _id: req.params.id }));
        if (!fp) return res.status(404).json({ error: 'Filing period not found' });

        if (fp.status === 'open') {
            fp.status = 'filed';
            fp.filedBy = req.body.filedBy || req.user?.full_name || req.user?.email || 'System';
            fp.filedAt = new Date().toISOString().slice(0, 10);
        } else if (fp.status === 'filed') {
            fp.status = 'locked';
        }

        await fp.save();
        res.json(normalize(fp));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update filing status' });
    }
});

router.delete('/filing-periods/:id', async (req, res) => {
    try {
        const item = await FilingPeriod.findOneAndDelete(tenantFilter(req, { _id: req.params.id }));
        if (!item) return res.status(404).json({ error: 'Filing period not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete filing period' });
    }
});

// ======================================================
// TAX ADJUSTMENTS
// ======================================================

router.get('/adjustments', async (req, res) => {
    try {
        const items = await TaxAdjustment.find(tenantFilter(req)).sort({ createdAt: -1 }).lean();
        res.json(items.map(normalize));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch adjustments' });
    }
});

router.post('/adjustments', async (req, res) => {
    try {
        const item = new TaxAdjustment({ ...req.body, tenant_id: tenantIdFromReq(req) });
        await item.save();
        res.status(201).json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create adjustment', detail: err.message });
    }
});

router.patch('/adjustments/:id/post', async (req, res) => {
    try {
        const item = await TaxAdjustment.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            { status: 'posted' },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Adjustment not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to post adjustment' });
    }
});

router.delete('/adjustments/:id', async (req, res) => {
    try {
        const item = await TaxAdjustment.findOneAndDelete(tenantFilter(req, { _id: req.params.id }));
        if (!item) return res.status(404).json({ error: 'Adjustment not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete adjustment' });
    }
});

// ======================================================
// VAT RETURNS
// ======================================================

router.get('/vat-returns', async (req, res) => {
    try {
        const { status, year } = req.query;
        const query = tenantFilter(req);
        if (status) query.status = status;
        if (year) {
            query.periodStart = { $gte: `${year}-01-01` };
            query.periodEnd = { $lte: `${year}-12-31` };
        }
        const returns = await VATReturn.find(query).sort({ periodEnd: -1, createdAt: -1 }).lean();
        res.json(returns.map(normalize));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch VAT returns' });
    }
});

router.post('/vat-returns', async (req, res) => {
    try {
        const item = new VATReturn({
            ...req.body,
            tenant_id: tenantIdFromReq(req),
            netVAT: req.body.netVAT !== undefined ? safeNumber(req.body.netVAT) : computeNetVAT(req.body),
        });
        await item.save();
        res.status(201).json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create VAT return', detail: err.message });
    }
});

router.put('/vat-returns/:id', async (req, res) => {
    try {
        const body = {
            ...req.body,
            netVAT: req.body.netVAT !== undefined ? safeNumber(req.body.netVAT) : computeNetVAT(req.body),
        };
        const item = await VATReturn.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            body,
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'VAT return not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update VAT return' });
    }
});

async function fileVATReturn(req, res) {
    try {
        const item = await VATReturn.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            {
                status: 'filed',
                filedAt: new Date().toISOString(),
                filedBy: req.body.filedBy || req.user?.full_name || req.user?.email || 'System',
                referenceNumber: req.body.referenceNumber || '',
            },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'VAT return not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to file VAT return' });
    }
}

router.post('/vat-returns/:id/file', fileVATReturn);
router.patch('/vat-returns/:id/file', fileVATReturn);

router.delete('/vat-returns/:id', async (req, res) => {
    try {
        const item = await VATReturn.findOneAndDelete(tenantFilter(req, { _id: req.params.id }));
        if (!item) return res.status(404).json({ error: 'VAT return not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete VAT return' });
    }
});

// ======================================================
// CORPORATE TAX FILINGS
// ======================================================

router.get('/corporate-tax', async (req, res) => {
    try {
        const { status, year } = req.query;
        const query = tenantFilter(req);
        if (status) query.status = status;
        if (year) query.taxYear = year;
        const filings = await CorporateTaxFiling.find(query).sort({ taxYear: -1, periodEnd: -1 }).lean();
        res.json(filings.map(normalize));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch corporate tax filings' });
    }
});

router.post('/corporate-tax', async (req, res) => {
    try {
        const computed = computeCorporateTax(req.body);
        const item = new CorporateTaxFiling({
            ...req.body,
            ...computed,
            tenant_id: tenantIdFromReq(req),
        });
        await item.save();
        res.status(201).json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create corporate tax filing', detail: err.message });
    }
});

router.put('/corporate-tax/:id', async (req, res) => {
    try {
        const item = await CorporateTaxFiling.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            { ...req.body, ...computeCorporateTax(req.body) },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Corporate tax filing not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update corporate tax filing' });
    }
});

async function fileCorporateTax(req, res) {
    try {
        const item = await CorporateTaxFiling.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            {
                status: 'filed',
                filedAt: new Date().toISOString(),
                filedBy: req.body.filedBy || req.user?.full_name || req.user?.email || 'System',
                referenceNumber: req.body.referenceNumber || '',
            },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Corporate tax filing not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to file corporate tax filing' });
    }
}

router.post('/corporate-tax/:id/file', fileCorporateTax);
router.patch('/corporate-tax/:id/file', fileCorporateTax);

router.post('/corporate-tax/:id/request-assessment', async (req, res) => {
    try {
        const item = await CorporateTaxFiling.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            { status: 'pending' },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Corporate tax filing not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to request corporate tax assessment' });
    }
});

router.patch('/corporate-tax/:id/assess', async (req, res) => {
    try {
        const item = await CorporateTaxFiling.findOneAndUpdate(
            tenantFilter(req, { _id: req.params.id }),
            {
                status: 'assessed',
                assessedAt: new Date().toISOString(),
                ...req.body,
            },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Corporate tax filing not found' });
        res.json(normalize(item));
    } catch (err) {
        res.status(500).json({ error: 'Failed to process assessment' });
    }
});

router.delete('/corporate-tax/:id', async (req, res) => {
    try {
        const item = await CorporateTaxFiling.findOneAndDelete(tenantFilter(req, { _id: req.params.id }));
        if (!item) return res.status(404).json({ error: 'Corporate tax filing not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete corporate tax filing' });
    }
});

// ======================================================
// TAX CENTER SUMMARY
// ======================================================

router.get('/center-summary', async (req, res) => {
    try {
        const filter = tenantFilter(req);
        const [jurisdictions, codes, filings, adjustments, vatReturns, corpTaxFilings] = await Promise.all([
            TaxJurisdiction.countDocuments(filter),
            TaxCode.countDocuments(filter),
            FilingPeriod.find(filter).lean(),
            TaxAdjustment.countDocuments(filter),
            VATReturn.countDocuments(filter),
            CorporateTaxFiling.countDocuments(filter),
        ]);

        const openPeriods = filings.filter(item => item.status === 'open').length;
        const totalLiability = filings
            .filter(item => item.status === 'open')
            .reduce((sum, item) => sum + safeNumber(item.netLiability), 0);

        res.json({
            jurisdictions,
            codes,
            openPeriods,
            totalLiability,
            adjustments,
            vatReturns,
            corporateTaxFilings: corpTaxFilings,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tax summary' });
    }
});

module.exports = router;
