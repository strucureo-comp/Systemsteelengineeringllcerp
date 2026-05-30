const express = require('express');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/workflows
router.get('/', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const workflows = await ApprovalWorkflow.find({ tenant_id }).sort({ createdAt: -1 });
        res.json({ success: true, data: workflows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch workflows' });
    }
});

// POST /api/workflows
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const workflow = await ApprovalWorkflow.create({
            ...req.body,
            tenant_id,
            created_by: req.user._id,
            updated_by: req.user._id
        });
        res.status(201).json({ success: true, data: workflow });
    } catch (error) {
        console.error('[Workflow Route] Create error:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message || 'Failed to create workflow' 
        });
    }
});

// PUT /api/workflows/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const workflow = await ApprovalWorkflow.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            { ...req.body, updated_by: req.user._id },
            { new: true, runValidators: true }
        );
        if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
        res.json({ success: true, data: workflow });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || 'Failed to update workflow' });
    }
});

// DELETE /api/workflows/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const workflow = await ApprovalWorkflow.findOneAndDelete({ _id: req.params.id, tenant_id });
        if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
        res.json({ success: true, message: 'Workflow deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete workflow' });
    }
});

module.exports = router;
