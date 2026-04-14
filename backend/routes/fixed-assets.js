const express = require('express');
const router = express.Router();
const { FixedAsset } = require('../models/FixedAssets');
const { auth } = require('../middleware/auth');

// ── FIXED ASSETS ─────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const assets = await FixedAsset.find().sort({ asset_number: 1 });
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch fixed assets' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const asset = new FixedAsset(req.body);
        await asset.save();
        res.status(201).json(asset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create fixed asset' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const deleted = await FixedAsset.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Fixed asset not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete fixed asset' });
    }
});

module.exports = router;
