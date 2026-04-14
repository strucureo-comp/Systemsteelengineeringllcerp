const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const TaxConfiguration = require('../models/TaxConfiguration');

// GET all taxes
router.get('/', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const taxes = await TaxConfiguration.find({ tenant_id }).sort({ createdAt: -1 });
        
        res.json({ success: true, data: taxes });
    } catch (error) {
        console.error('Error fetching taxes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single tax
router.get('/:id', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const tax = await TaxConfiguration.findOne({ 
            _id: req.params.id, 
            tenant_id 
        });
        
        if (!tax) {
            return res.status(404).json({ success: false, error: 'Tax not found' });
        }
        
        res.json({ success: true, data: tax });
    } catch (error) {
        console.error('Error fetching tax:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create tax
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const tax = await TaxConfiguration.create({
            ...req.body,
            tenant_id,
            created_by: req.user._id,
            updated_by: req.user._id
        });
        
        res.status(201).json({ 
            success: true, 
            data: tax, 
            message: 'Tax created successfully' 
        });
    } catch (error) {
        console.error('Error creating tax:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update tax
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const tax = await TaxConfiguration.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            { 
                ...req.body, 
                updated_by: req.user._id 
            },
            { 
                new: true, 
                runValidators: true 
            }
        );
        
        if (!tax) {
            return res.status(404).json({ success: false, error: 'Tax not found' });
        }
        
        res.json({ 
            success: true, 
            data: tax, 
            message: 'Tax updated successfully' 
        });
    } catch (error) {
        console.error('Error updating tax:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE tax
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const tax = await TaxConfiguration.findOneAndDelete({ 
            _id: req.params.id, 
            tenant_id,
            isCustom: true  // Only allow deletion of custom taxes
        });
        
        if (!tax) {
            return res.status(404).json({ 
                success: false, 
                error: 'Tax not found or cannot be deleted' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Tax deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting tax:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT toggle tax
router.put('/:id/toggle', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const tax = await TaxConfiguration.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            { 
                enabled: req.body.enabled,
                updated_by: req.user._id 
            },
            { new: true }
        );
        
        if (!tax) {
            return res.status(404).json({ success: false, error: 'Tax not found' });
        }
        
        res.json({ 
            success: true, 
            data: tax, 
            message: `Tax ${tax.enabled ? 'enabled' : 'disabled'} successfully` 
        });
    } catch (error) {
        console.error('Error toggling tax:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
