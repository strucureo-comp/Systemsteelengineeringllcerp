const express = require('express');
const router = express.Router();
const path = require('path');
const { auth: authenticate } = require('../middleware/auth');
const { logoUploader, deleteFile, resizeImage, UPLOAD_ROOT } = require('../services/storageService');
const BrandingConfig = require('../models/BrandingConfig');

// ═══════════════════════════════════════
// COMPANY LOGO UPLOAD
// ═══════════════════════════════════════

/**
 * POST /api/settings/branding/logo
 * Upload company logo
 */
router.post('/branding/logo', authenticate, logoUploader.single('logo'), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        // Resize logo to 400x400
        await resizeImage(req.file.path, 400, 400);

        const relPath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
        const logoUrl = `/uploads/${relPath}`;

        // Get existing branding config
        let branding = await BrandingConfig.findOne({ tenant_id: tenantId });
        
        // Delete old logo if exists
        if (branding && branding.logo) {
            const oldPath = branding.logo.replace('/uploads/', '');
            deleteFile(path.join(UPLOAD_ROOT, oldPath));
        }

        // Update or create branding config
        if (branding) {
            branding.logo = logoUrl;
            await branding.save();
        } else {
            branding = await BrandingConfig.create({
                tenant_id: tenantId,
                logo: logoUrl
            });
        }

        res.json({ 
            success: true, 
            logo_url: logoUrl 
        });
    } catch (error) {
        console.error('[Logo Upload Error]', error);
        if (req.file) deleteFile(req.file.path);
        res.status(500).json({ error: error.message || 'Failed to upload logo' });
    }
});

/**
 * DELETE /api/settings/branding/logo
 * Delete company logo
 */
router.delete('/branding/logo', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const branding = await BrandingConfig.findOne({ tenant_id: tenantId });
        
        if (!branding || !branding.logo) {
            return res.status(404).json({ error: 'Logo not found' });
        }

        // Delete from disk
        const logoPath = branding.logo.replace('/uploads/', '');
        deleteFile(path.join(UPLOAD_ROOT, logoPath));

        // Remove from database
        branding.logo = null;
        await branding.save();

        res.json({ success: true, message: 'Logo deleted successfully' });
    } catch (error) {
        console.error('[Logo Delete Error]', error);
        res.status(500).json({ error: 'Failed to delete logo' });
    }
});

module.exports = router;
