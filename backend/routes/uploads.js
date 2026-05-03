const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { UPLOAD_ROOT } = require('../services/storageService');
const { auth: authenticate } = require('../middleware/auth');

/**
 * Protected file serving route
 * IMPORTANT: Do NOT use express.static on the uploads folder directly.
 * That would expose every tenant's files to any URL.
 * This route checks tenant ownership before serving files.
 */
router.get('/:tenantId/*', authenticate, async (req, res) => {
    try {
        const requestedTenantId = req.params.tenantId;
        const userTenantId = req.user?.tenant_id || 'default';
        
        // Tenant can only access their own files
        if (requestedTenantId !== userTenantId) {
            return res.status(403).json({ error: 'Access denied: Tenant mismatch' });
        }

        const filePath = path.join(
            UPLOAD_ROOT,
            requestedTenantId,
            req.params[0] // rest of the path
        );

        // Prevent path traversal attacks
        const resolvedPath = path.resolve(filePath);
        const resolvedRoot = path.resolve(UPLOAD_ROOT);
        
        if (!resolvedPath.startsWith(resolvedRoot)) {
            return res.status(403).json({ error: 'Invalid path: Path traversal detected' });
        }

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if it's a file (not a directory)
        const stats = fs.statSync(resolvedPath);
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        res.sendFile(resolvedPath);
    } catch (error) {
        console.error('[File Serving Error]', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

module.exports = router;
