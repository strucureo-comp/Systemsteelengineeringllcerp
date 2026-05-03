const express = require('express');
const router = express.Router();
const path = require('path');
const { auth: authenticate } = require('../middleware/auth');
const { poAttachmentUploader, grnAttachmentUploader, deleteFile, UPLOAD_ROOT } = require('../services/storageService');
const Attachment = require('../models/Attachment');
const { PurchaseOrder, GRN } = require('../models/Procurement');

// ═══════════════════════════════════════
// PURCHASE ORDER ATTACHMENTS
// ═══════════════════════════════════════

router.post('/purchase-orders/:poId/attachments', authenticate, poAttachmentUploader.array('files', 5), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const po = await PurchaseOrder.findOne({
            _id: req.params.poId,
            tenant_id: tenantId
        });
        
        if (!po) {
            if (req.files) req.files.forEach(f => deleteFile(f.path));
            return res.status(404).json({ error: 'Purchase Order not found' });
        }

        const attachments = await Promise.all(req.files.map(async (file) => {
            const relPath = path.relative(UPLOAD_ROOT, file.path).replace(/\\/g, '/');
            
            return Attachment.create({
                tenant_id: tenantId,
                reference_type: 'purchase_order',
                reference_id: req.params.poId,
                document_type: req.body.document_type || 'attachment',
                original_name: file.originalname,
                stored_name: file.filename,
                file_path: relPath,
                file_size: file.size,
                mime_type: file.mimetype,
                uploaded_by: req.user._id
            });
        }));

        const withUrls = attachments.map(a => ({
            ...a.toObject(),
            file_url: `/uploads/${a.file_path}`
        }));

        res.json({ success: true, attachments: withUrls });
    } catch (error) {
        console.error('[PO Attachment Upload Error]', error);
        if (req.files) req.files.forEach(f => deleteFile(f.path));
        res.status(500).json({ error: error.message || 'Failed to upload attachments' });
    }
});

router.get('/purchase-orders/:poId/attachments', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const attachments = await Attachment.find({
            tenant_id: tenantId,
            reference_type: 'purchase_order',
            reference_id: req.params.poId,
            is_deleted: false
        }).populate('uploaded_by', 'full_name email').sort({ uploaded_at: -1 });

        const withUrls = attachments.map(a => ({
            ...a.toObject(),
            file_url: `/uploads/${a.file_path}`
        }));

        res.json(withUrls);
    } catch (error) {
        console.error('[PO Attachments Fetch Error]', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});

// ═══════════════════════════════════════
// GRN ATTACHMENTS
// ═══════════════════════════════════════

router.post('/grn/:grnId/attachments', authenticate, grnAttachmentUploader.array('files', 5), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const grn = await GRN.findOne({
            _id: req.params.grnId,
            tenant_id: tenantId
        });
        
        if (!grn) {
            if (req.files) req.files.forEach(f => deleteFile(f.path));
            return res.status(404).json({ error: 'GRN not found' });
        }

        const attachments = await Promise.all(req.files.map(async (file) => {
            const relPath = path.relative(UPLOAD_ROOT, file.path).replace(/\\/g, '/');
            
            return Attachment.create({
                tenant_id: tenantId,
                reference_type: 'grn',
                reference_id: req.params.grnId,
                document_type: 'delivery_note',
                original_name: file.originalname,
                stored_name: file.filename,
                file_path: relPath,
                file_size: file.size,
                mime_type: file.mimetype,
                uploaded_by: req.user._id
            });
        }));

        const withUrls = attachments.map(a => ({
            ...a.toObject(),
            file_url: `/uploads/${a.file_path}`
        }));

        res.json({ success: true, attachments: withUrls });
    } catch (error) {
        console.error('[GRN Attachment Upload Error]', error);
        if (req.files) req.files.forEach(f => deleteFile(f.path));
        res.status(500).json({ error: error.message || 'Failed to upload attachments' });
    }
});

module.exports = router;
