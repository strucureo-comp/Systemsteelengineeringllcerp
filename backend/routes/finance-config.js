const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const FinanceConfig = require('../models/FinanceConfig');

// GET finance config
router.get('/', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        let config = await FinanceConfig.findOne({ tenant_id });
        
        // Create default config if doesn't exist
        if (!config) {
            config = await FinanceConfig.create({
                tenant_id,
                baseCurrency: 'USD',
                fiscalYearStart: '1',
                accountingMethod: 'accrual',
                selectedCountry: 'US'
            });
        }
        
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching finance config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT finance config
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const config = await FinanceConfig.findOneAndUpdate(
            { tenant_id },
            { 
                ...req.body, 
                tenant_id,
                updated_by: req.user._id 
            },
            { 
                new: true, 
                upsert: true, 
                runValidators: true 
            }
        );
        
        res.json({ 
            success: true, 
            data: config, 
            message: 'Finance config updated successfully' 
        });
    } catch (error) {
        console.error('Error updating finance config:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
