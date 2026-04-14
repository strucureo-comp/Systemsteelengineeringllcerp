const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const ModulesConfig = require('../models/ModulesConfig');

// GET modules config
router.get('/', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        let config = await ModulesConfig.findOne({ tenant_id });
        
        // Create default config if doesn't exist
        if (!config) {
            config = await ModulesConfig.create({
                tenant_id,
                modules: {
                    finance: true,
                    sales: true,
                    operations: true,
                    hr: false,
                    inventory: true,
                    projects: false,
                    manufacturing: false,
                    procurement: true,
                    reports: true,
                    compliance: false
                }
            });
        }
        
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching modules config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update modules config
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const config = await ModulesConfig.findOneAndUpdate(
            { tenant_id },
            { 
                modules: req.body.modules,
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
            message: 'Modules config updated successfully' 
        });
    } catch (error) {
        console.error('Error updating modules config:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT toggle single module
router.put('/:moduleId/toggle', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { moduleId } = req.params;
        const { enabled } = req.body;
        
        const config = await ModulesConfig.findOne({ tenant_id });
        
        if (!config) {
            return res.status(404).json({ success: false, error: 'Config not found' });
        }
        
        if (!config.modules.hasOwnProperty(moduleId)) {
            return res.status(400).json({ success: false, error: 'Invalid module ID' });
        }
        
        config.modules[moduleId] = enabled;
        config.updated_by = req.user._id;
        await config.save();
        
        res.json({ 
            success: true, 
            data: config, 
            message: `Module ${moduleId} ${enabled ? 'enabled' : 'disabled'} successfully` 
        });
    } catch (error) {
        console.error('Error toggling module:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
