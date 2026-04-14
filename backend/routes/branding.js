const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const BrandingConfig = require('../models/BrandingConfig');

// GET branding config (public for login page)
router.get('/', async (req, res) => {
    try {
        const tenant_id = req.query.tenant_id || 'default';
        let branding = await BrandingConfig.findOne({ tenant_id });
        
        // Return default branding if doesn't exist
        if (!branding) {
            branding = {
                logo: null,
                primaryColor: '#0F172A',
                accentColor: '#10B981',
                footerText: '',
                favicon: null
            };
        }
        
        res.json({ success: true, data: branding });
    } catch (error) {
        console.error('Error fetching branding:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT branding config
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const branding = await BrandingConfig.findOneAndUpdate(
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
            data: branding, 
            message: 'Branding updated successfully' 
        });
    } catch (error) {
        console.error('Error updating branding:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
