const express = require('express');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/workflows
router.get('/', auth, async (req, res) => {
    try {
        const workflows = await ApprovalWorkflow.find({}).sort({ createdAt: -1 });
        res.json({ data: workflows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

// POST /api/workflows
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { title, status, threshold, flow } = req.body;
        const workflow = await ApprovalWorkflow.create({
            title, status, threshold, flow,
            created_by: req.user._id
        });
        res.status(201).json({ data: workflow });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});

// PUT /api/workflows/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { title, status, threshold, flow } = req.body;
        const workflow = await ApprovalWorkflow.findByIdAndUpdate(
            req.params.id,
            { title, status, threshold, flow },
            { new: true, runValidators: true }
        );
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
        res.json({ data: workflow });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

// DELETE /api/workflows/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const workflow = await ApprovalWorkflow.findByIdAndDelete(req.params.id);
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
        res.json({ message: 'Workflow deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});

module.exports = router;
