const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const CompanyProfile = require('../models/CompanyProfile');

// GET company profile
router.get('/', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        let profile = await CompanyProfile.findOne({ tenant_id });
        
        // Create default profile if doesn't exist
        if (!profile) {
            profile = await CompanyProfile.create({
                tenant_id,
                companyName: 'My Company',
                country: 'US',
                baseCurrency: 'USD',
                fiscalYearStart: '1',
                defaultTaxName: 'Sales Tax',
                defaultTaxRate: 0
            });
        }
        
        res.json({ success: true, data: profile });
    } catch (error) {
        console.error('Error fetching company profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT company profile (create or update)
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const profile = await CompanyProfile.findOneAndUpdate(
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
            data: profile, 
            message: 'Company profile updated successfully' 
        });
    } catch (error) {
        console.error('Error updating company profile:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
