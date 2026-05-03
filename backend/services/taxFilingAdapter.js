// Tax Filing Adapter Stub
// - If TAX_API_URL and TAX_API_KEY are provided in environment, this module should be extended
//   to call the external tax authority APIs securely.
// - For now, it provides a safe no-op that returns { skipped: true } when not configured.

const axios = require('axios');

const TAX_API_URL = process.env.TAX_API_URL || '';
const TAX_API_KEY = process.env.TAX_API_KEY || '';

async function fileVATReturn(vatReturn, opts = {}) {
    if (!TAX_API_URL || !TAX_API_KEY) {
        return { skipped: true, reason: 'E-filing not configured' };
    }

    try {
        const payload = {
            document_number: vatReturn._id || vatReturn.id,
            periodStart: vatReturn.periodStart,
            periodEnd: vatReturn.periodEnd,
            totalOutputVAT: vatReturn.totalOutputVAT,
            totalInputVAT: vatReturn.totalInputVAT,
            netVAT: vatReturn.netVAT,
            tenant_id: vatReturn.tenant_id,
        };

        const resp = await axios.post(`${TAX_API_URL}/efile/vat`, payload, {
            headers: { 'Authorization': `Bearer ${TAX_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 15000
        });

        if (resp?.data) {
            return { success: true, referenceNumber: resp.data.referenceNumber || resp.data.ref || '' };
        }

        return { success: false, reason: 'Empty response from tax API' };
    } catch (err) {
        console.error('[TaxFilingAdapter] VAT filing error:', err.message || err);
        throw err;
    }
}

async function fileCorporateTax(corpFiling, opts = {}) {
    if (!TAX_API_URL || !TAX_API_KEY) {
        return { skipped: true, reason: 'E-filing not configured' };
    }

    try {
        const payload = {
            document_number: corpFiling._id || corpFiling.id,
            taxYear: corpFiling.taxYear,
            taxableIncome: corpFiling.taxableIncome,
            taxLiability: corpFiling.taxLiability,
            tenant_id: corpFiling.tenant_id,
        };

        const resp = await axios.post(`${TAX_API_URL}/efile/corporate`, payload, {
            headers: { 'Authorization': `Bearer ${TAX_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 15000
        });

        if (resp?.data) {
            return { success: true, referenceNumber: resp.data.referenceNumber || resp.data.ref || '' };
        }

        return { success: false, reason: 'Empty response from tax API' };
    } catch (err) {
        console.error('[TaxFilingAdapter] Corporate filing error:', err.message || err);
        throw err;
    }
}

module.exports = {
    fileVATReturn,
    fileCorporateTax
};
