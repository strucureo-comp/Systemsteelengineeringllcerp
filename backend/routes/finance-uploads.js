const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { invoiceAttachmentUploader, expenseAttachmentUploader, deleteFile, UPLOAD_ROOT } = require('../services/storageService');
const Attachment = require('../models/Attachment');
const { Invoice, Expense } = require('../models/Finance');

// ═══════════════════════════════════════
// INVOICE ATTACHMENTS
// ═══════════════════════════════════════

/**
 * POST /api/finance/invoices/:invoiceId/attachments
 * Upload invoice attachments (multiple files)
 */
router.post('/invoices/:invoiceId/attachments', authenticate, invoiceAttachmentUploader.array('files', 5), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        // Verify invoice belongs to tenant
        const invoice = await Invoice.findOne({
            _id: req.params.invoiceId,
            tenant_id: tenantId
        });
        
        if (!invoice) {
            // Delete uploaded files if invoice not found
            if (req.files) req.files.forEach(f => deleteFile(f.path));
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Handle req.files array (multiple files)
        const attachments = await Promise.all(req.files.map(async (file) => {
            const relPath = path.relative(UPLOAD_ROOT, file.path).replace(/\\/g, '/');
            
            return Attachment.create({
                tenant_id: tenantId,
                reference_type: 'invoice',
                reference_id: req.params.invoiceId,
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
        console.error('[Invoice Attachment Upload Error]', error);
        if (req.files) req.files.forEach(f => deleteFile(f.path));
        res.status(500).json({ error: error.message || 'Failed to upload attachments' });
    }
});

/**
 * GET /api/finance/invoices/:invoiceId/attachments
 * Get all attachments for an invoice
 */
router.get('/invoices/:invoiceId/attachments', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const attachments = await Attachment.find({
            tenant_id: tenantId,
            reference_type: 'invoice',
            reference_id: req.params.invoiceId,
            is_deleted: false
        })
        .populate('uploaded_by', 'full_name email')
        .sort({ uploaded_at: -1 });

        const withUrls = attachments.map(a => ({
            ...a.toObject(),
            file_url: `/uploads/${a.file_path}`
        }));

        res.json(withUrls);
    } catch (error) {
        console.error('[Invoice Attachments Fetch Error]', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});

/**
 * DELETE /api/finance/invoices/:invoiceId/attachments/:attachmentId
 * Delete invoice attachment
 */
router.delete('/invoices/:invoiceId/attachments/:attachmentId', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const attachment = await Attachment.findOne({
            _id: req.params.attachmentId,
            tenant_id: tenantId,
            reference_type: 'invoice',
            reference_id: req.params.invoiceId
        });

        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        // Soft delete DB record
        attachment.is_deleted = true;
        attachment.deleted_at = new Date();
        attachment.deleted_by = req.user._id;
        await attachment.save();

        // Hard delete from disk
        deleteFile(path.join(UPLOAD_ROOT, attachment.file_path));

        res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
        console.error('[Invoice Attachment Delete Error]', error);
        res.status(500).json({ error: 'Failed to delete attachment' });
    }
});

// ═══════════════════════════════════════
// EXPENSE ATTACHMENTS
// ═══════════════════════════════════════

/**
 * POST /api/finance/expenses/:expenseId/attachments
 * Upload expense receipt/attachment
 */
router.post('/expenses/:expenseId/attachments', authenticate, expenseAttachmentUploader.single('file'), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const expense = await Expense.findOne({
            _id: req.params.expenseId,
            tenant_id: tenantId
        });
        
        if (!expense) {
            if (req.file) deleteFile(req.file.path);
            return res.status(404).json({ error: 'Expense not found' });
        }

        const relPath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
        
        const attachment = await Attachment.create({
            tenant_id: tenantId,
            reference_type: 'expense',
            reference_id: req.params.expenseId,
            document_type: 'receipt',
            original_name: req.file.originalname,
            stored_name: req.file.filename,
            file_path: relPath,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_by: req.user._id
        });

        // Update expense with receipt URL
        await Expense.findByIdAndUpdate(req.params.expenseId, {
            receipt_url: `/uploads/${relPath}`
        });

        res.json({ 
            success: true, 
            attachment: {
                ...attachment.toObject(),
                file_url: `/uploads/${relPath}`
            }
        });
    } catch (error) {
        console.error('[Expense Attachment Upload Error]', error);
        if (req.file) deleteFile(req.file.path);
        res.status(500).json({ error: error.message || 'Failed to upload receipt' });
    }
});

/**
 * GET /api/finance/expenses/:expenseId/attachments
 * Get all attachments for an expense
 */
router.get('/expenses/:expenseId/attachments', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const attachments = await Attachment.find({
            tenant_id: tenantId,
            reference_type: 'expense',
            reference_id: req.params.expenseId,
            is_deleted: false
        })
        .populate('uploaded_by', 'full_name email')
        .sort({ uploaded_at: -1 });

        const withUrls = attachments.map(a => ({
            ...a.toObject(),
            file_url: `/uploads/${a.file_path}`
        }));

        res.json(withUrls);
    } catch (error) {
        console.error('[Expense Attachments Fetch Error]', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});

module.exports = router;
