const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const ApprovalConfig = require('../models/ApprovalConfig');

// GET all approval configs
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const configs = await ApprovalConfig.find({ tenant_id });
        
        // Group by module
        const grouped = {
            sales: {},
            purchase: {},
            hr: {},
            finance: {}
        };
        
        configs.forEach(config => {
            grouped[config.module][config.documentType] = {
                enabled: config.enabled,
                approverRole: config.approverRole,
                threshold: config.threshold
            };
        });
        
        res.json({ success: true, data: grouped });
    } catch (error) {
        console.error('Error fetching approval configs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET approval config for specific document
router.get('/:module/:docType', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { module, docType } = req.params;
        
        const config = await ApprovalConfig.findOne({ 
            tenant_id, 
            module, 
            documentType: docType 
        });
        
        if (!config) {
            return res.json({ 
                success: true, 
                data: { 
                    enabled: false, 
                    approverRole: '', 
                    threshold: 0 
                } 
            });
        }
        
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching approval config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update all approval configs
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const allConfigs = req.body;  // { sales: {...}, purchase: {...}, hr: {...}, finance: {...} }
        
        const promises = [];
        
        // Iterate through all modules and document types
        for (const [module, docs] of Object.entries(allConfigs)) {
            for (const [docType, config] of Object.entries(docs)) {
                promises.push(
                    ApprovalConfig.findOneAndUpdate(
                        { tenant_id, module, documentType: docType },
                        {
                            ...config,
                            tenant_id,
                            module,
                            documentType: docType,
                            updated_by: req.user._id
                        },
                        { upsert: true, new: true }
                    )
                );
            }
        }
        
        await Promise.all(promises);
        
        res.json({ 
            success: true, 
            message: 'Approval configs updated successfully' 
        });
    } catch (error) {
        console.error('Error updating approval configs:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update single approval config
router.put('/:module/:docType', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { module, docType } = req.params;
        
        const config = await ApprovalConfig.findOneAndUpdate(
            { tenant_id, module, documentType: docType },
            {
                ...req.body,
                tenant_id,
                module,
                documentType: docType,
                updated_by: req.user._id
            },
            { upsert: true, new: true, runValidators: true }
        );
        
        res.json({ 
            success: true, 
            data: config, 
            message: 'Approval config updated successfully' 
        });
    } catch (error) {
        console.error('Error updating approval config:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
