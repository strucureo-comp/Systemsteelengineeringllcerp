const Sequence = require('../models/Sequence');

/**
 * Get next number in sequence (atomic, thread-safe)
 * @param {string} tenant_id - Tenant identifier
 * @param {string} key - Sequence key (e.g., 'invoice', 'purchase_order')
 * @param {string} prefix - Prefix for the number (e.g., 'INV', 'PO')
 * @param {number} padLength - Number of digits to pad (default: 4)
 * @param {boolean} includeYear - Include year in format (default: true)
 * @returns {Promise<string>} - Formatted number (e.g., 'INV-2026-0001')
 */
async function getNextNumber(tenant_id, key, prefix, padLength = 4, includeYear = true) {
    const year = new Date().getFullYear();
    const sequenceKey = includeYear ? `${key}_${year}` : key;
    
    // Atomic increment - prevents race conditions
    const sequence = await Sequence.findOneAndUpdate(
        { tenant_id, key: sequenceKey },
        { 
            $inc: { value: 1 },
            $setOnInsert: { 
                prefix,
                pad_length: padLength,
                tenant_id,
                key: sequenceKey
            }
        },
        { 
            new: true, 
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
    
    const paddedNumber = String(sequence.value).padStart(padLength, '0');
    
    if (includeYear) {
        return `${prefix}-${year}-${paddedNumber}`;
    } else {
        return `${prefix}-${paddedNumber}`;
    }
}

/**
 * Get current sequence value without incrementing
 * @param {string} tenant_id - Tenant identifier
 * @param {string} key - Sequence key
 * @param {boolean} includeYear - Include year in key
 * @returns {Promise<number>} - Current sequence value
 */
async function getCurrentNumber(tenant_id, key, includeYear = true) {
    const year = new Date().getFullYear();
    const sequenceKey = includeYear ? `${key}_${year}` : key;
    
    const sequence = await Sequence.findOne({ tenant_id, key: sequenceKey });
    return sequence ? sequence.value : 0;
}

/**
 * Reset sequence to specific value (use with caution)
 * @param {string} tenant_id - Tenant identifier
 * @param {string} key - Sequence key
 * @param {number} value - New value
 * @param {boolean} includeYear - Include year in key
 */
async function resetSequence(tenant_id, key, value = 0, includeYear = true) {
    const year = new Date().getFullYear();
    const sequenceKey = includeYear ? `${key}_${year}` : key;
    
    await Sequence.findOneAndUpdate(
        { tenant_id, key: sequenceKey },
        { value },
        { upsert: true }
    );
}

module.exports = {
    getNextNumber,
    getCurrentNumber,
    resetSequence
};
