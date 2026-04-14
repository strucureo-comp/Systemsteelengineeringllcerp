const express = require('express');
const Settings = require('../models/Settings');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

function isAdminRole(role) {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superadmin' || normalized === 'administrator';
}

// Public settings that don't require auth
const PUBLIC_SETTINGS = ['branding_config', 'company_profile', 'tenant_status'];

// GET /api/settings/:key - requires auth, but allows public settings to be fetched without
router.get('/:key', auth, async (req, res) => {
    try {
        const { key } = req.params;

        // Allow public settings without admin check
        const isPublicSetting = PUBLIC_SETTINGS.includes(key);

        // For non-public settings, require admin
        if (!isPublicSetting && !isAdminRole(req.user?.role)) {
            return res.status(403).json({ error: 'Admin access required for this setting' });
        }

        const setting = await Settings.findOne({ key });
        if (!setting) {
            return res.json({ data: null });
        }
        res.json({ data: setting.value });
    } catch (error) {
        console.error('[Settings] Get Error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/settings/:key (requires auth)
router.put('/:key', auth, adminOnly, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }

        const setting = await Settings.findOneAndUpdate(
            { key: req.params.key },
            { value, updated_by: req.user._id },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({ data: setting.value, message: 'Settings saved' });
    } catch (error) {
        console.error('[Settings] Save Error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// GET /api/settings (all settings as object - requires auth)
router.get('/', auth, async (req, res) => {
    try {
        const settings = await Settings.find({});
        const result = {};
        settings.forEach(s => { result[s.key] = s.value; });
        res.json({ data: result });
    } catch (error) {
        console.error('[Settings] GetAll Error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

module.exports = router;
