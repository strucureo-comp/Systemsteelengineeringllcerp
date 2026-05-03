const express = require('express');
const router = express.Router();
const path = require('path');
const { auth: authenticate } = require('../middleware/auth');
const { hrDocumentUploader, avatarUploader, deleteFile, resizeImage, UPLOAD_ROOT } = require('../services/storageService');
const Attachment = require('../models/Attachment');
const { Employee } = require('../models/HRMS');

// ═══════════════════════════════════════
// HR EMPLOYEE DOCUMENTS
// ═══════════════════════════════════════

/**
 * POST /api/hrms/employees/:employeeId/documents
 * Upload employee document (passport, visa, certificate, etc.)
 */
router.post('/employees/:employeeId/documents', authenticate, hrDocumentUploader.single('file'), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        // Verify employee belongs to tenant
        const employee = await Employee.findOne({
            _id: req.params.employeeId,
            tenant_id: tenantId
        });
        
        if (!employee) {
            // Delete uploaded file if employee not found
            if (req.file) deleteFile(req.file.path);
            return res.status(404).json({ error: 'Employee not found' });
        }

        const relPath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
        
        const attachment = await Attachment.create({
            tenant_id: tenantId,
            reference_type: 'employee',
            reference_id: employee._id,
            document_type: req.body.document_type || 'other',
            original_name: req.file.originalname,
            stored_name: req.file.filename,
            file_path: relPath,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_by: req.user._id,
            expiry_date: req.body.expiry_date || null
        });

        res.json({ 
            success: true, 
            attachment: {
                ...attachment.toObject(),
                file_url: `/uploads/${relPath}`
            }
        });
    } catch (error) {
        console.error('[HR Document Upload Error]', error);
        // Clean up file on error
        if (req.file) deleteFile(req.file.path);
        res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
});

/**
 * GET /api/hrms/employees/:employeeId/documents
 * Get all documents for an employee
 */
router.get('/employees/:employeeId/documents', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const attachments = await Attachment.find({
            tenant_id: tenantId,
            reference_type: 'employee',
            reference_id: req.params.employeeId,
            is_deleted: false
        })
        .populate('uploaded_by', 'full_name email')
        .sort({ uploaded_at: -1 });

        // Build file URL for each
        const withUrls = attachments.map(a => ({
            ...a.toObject(),
            file_url: `/uploads/${a.file_path}`
        }));

        res.json(withUrls);
    } catch (error) {
        console.error('[HR Documents Fetch Error]', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

/**
 * DELETE /api/hrms/employees/:employeeId/documents/:attachmentId
 * Delete employee document
 */
router.delete('/employees/:employeeId/documents/:attachmentId', authenticate, async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        const attachment = await Attachment.findOne({
            _id: req.params.attachmentId,
            tenant_id: tenantId,
            reference_type: 'employee',
            reference_id: req.params.employeeId
        });

        if (!attachment) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Soft delete DB record
        attachment.is_deleted = true;
        attachment.deleted_at = new Date();
        attachment.deleted_by = req.user._id;
        await attachment.save();

        // Hard delete from disk
        deleteFile(path.join(UPLOAD_ROOT, attachment.file_path));

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('[HR Document Delete Error]', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// ═══════════════════════════════════════
// HR EMPLOYEE AVATAR
// ═══════════════════════════════════════

/**
 * POST /api/hrms/employees/:employeeId/avatar
 * Upload employee avatar/profile photo
 */
router.post('/employees/:employeeId/avatar', authenticate, avatarUploader.single('avatar'), async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 'default';
        
        // Verify employee belongs to tenant
        const employee = await Employee.findOne({
            _id: req.params.employeeId,
            tenant_id: tenantId
        });
        
        if (!employee) {
            if (req.file) deleteFile(req.file.path);
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Resize image to 200x200
        await resizeImage(req.file.path, 200, 200);

        const relPath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
        const avatarUrl = `/uploads/${relPath}`;

        // Delete old avatar if exists
        if (employee.photo_url) {
            const oldPath = employee.photo_url.replace('/uploads/', '');
            deleteFile(path.join(UPLOAD_ROOT, oldPath));
        }

        // Update employee record
        await Employee.findByIdAndUpdate(req.params.employeeId, {
            photo_url: avatarUrl
        });

        res.json({ 
            success: true, 
            avatar_url: avatarUrl 
        });
    } catch (error) {
        console.error('[Avatar Upload Error]', error);
        if (req.file) deleteFile(req.file.path);
        res.status(500).json({ error: error.message || 'Failed to upload avatar' });
    }
});

module.exports = router;
