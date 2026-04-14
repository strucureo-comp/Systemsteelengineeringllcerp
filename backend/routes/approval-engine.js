const express = require('express');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const ApprovalRequest = require('../models/ApprovalRequest');
const {
    submitForApproval,
    processApproval,
    cancelApproval,
    getPendingApprovals,
    getApprovalHistory
} = require('../services/approvalEngine');

const router = express.Router();

// ============================================================================
// SUBMIT FOR APPROVAL
// ============================================================================

/**
 * POST /api/approval-engine/submit
 * Submit a document for approval
 */
router.post('/submit', auth, async (req, res) => {
    try {
        const { documentType, documentId, documentData } = req.body;
        const tenant_id = req.user?.tenant_id || 'default';
        const submittedBy = req.user._id;
        
        if (!documentType || !documentId) {
            return res.status(400).json({ 
                error: 'documentType and documentId are required' 
            });
        }
        
        const result = await submitForApproval(
            documentType,
            documentId,
            documentData || {},
            tenant_id,
            submittedBy
        );
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('[Approval Engine API] Submit error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to submit for approval' 
        });
    }
});

// ============================================================================
// PROCESS APPROVAL (APPROVE/REJECT)
// ============================================================================

/**
 * POST /api/approval-engine/:id/approve
 * Approve current step
 */
router.post('/:id/approve', auth, async (req, res) => {
    try {
        const { comments } = req.body;
        const approverId = req.user._id;
        
        const result = await processApproval(
            req.params.id,
            approverId,
            'approve',
            comments
        );
        
        res.json(result);
        
    } catch (error) {
        console.error('[Approval Engine API] Approve error:', error);
        res.status(400).json({ 
            error: error.message || 'Failed to approve' 
        });
    }
});

/**
 * POST /api/approval-engine/:id/reject
 * Reject current step
 */
router.post('/:id/reject', auth, async (req, res) => {
    try {
        const { comments } = req.body;
        const approverId = req.user._id;
        
        if (!comments || comments.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Rejection reason is required' 
            });
        }
        
        const result = await processApproval(
            req.params.id,
            approverId,
            'reject',
            comments
        );
        
        res.json(result);
        
    } catch (error) {
        console.error('[Approval Engine API] Reject error:', error);
        res.status(400).json({ 
            error: error.message || 'Failed to reject' 
        });
    }
});

// ============================================================================
// CANCEL APPROVAL
// ============================================================================

/**
 * POST /api/approval-engine/:id/cancel
 * Cancel approval request
 */
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const cancelledBy = req.user._id;
        
        const result = await cancelApproval(
            req.params.id,
            cancelledBy,
            reason || 'Cancelled by user'
        );
        
        res.json(result);
        
    } catch (error) {
        console.error('[Approval Engine API] Cancel error:', error);
        res.status(400).json({ 
            error: error.message || 'Failed to cancel approval' 
        });
    }
});

// ============================================================================
// GET APPROVALS
// ============================================================================

/**
 * GET /api/approval-engine/pending
 * Get pending approvals for current user
 */
router.get('/pending', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        
        const approvals = await getPendingApprovals(tenant_id, userId);
        
        res.json({
            success: true,
            data: approvals,
            count: approvals.length
        });
        
    } catch (error) {
        console.error('[Approval Engine API] Get pending error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch pending approvals' 
        });
    }
});

/**
 * GET /api/approval-engine/:id
 * Get approval request details
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const approval = await ApprovalRequest.findOne({
            _id: req.params.id,
            tenant_id
        })
        .populate('requested_by', 'full_name email')
        .populate('workflow_id', 'name description')
        .populate('steps.approver_id', 'full_name email')
        .populate('steps.actioned_by', 'full_name email')
        .populate('final_actioned_by', 'full_name email')
        .populate('cancelled_by', 'full_name email');
        
        if (!approval) {
            return res.status(404).json({ 
                error: 'Approval request not found' 
            });
        }
        
        res.json({
            success: true,
            data: approval
        });
        
    } catch (error) {
        console.error('[Approval Engine API] Get approval error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch approval request' 
        });
    }
});

/**
 * GET /api/approval-engine/document/:documentType/:documentId
 * Get approval history for a document
 */
router.get('/document/:documentType/:documentId', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { documentType, documentId } = req.params;
        
        const history = await getApprovalHistory(documentType, documentId, tenant_id);
        
        res.json({
            success: true,
            data: history,
            count: history.length
        });
        
    } catch (error) {
        console.error('[Approval Engine API] Get history error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch approval history' 
        });
    }
});

/**
 * GET /api/approval-engine/my-requests
 * Get approval requests submitted by current user
 */
router.get('/my-requests', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        const { status } = req.query;
        
        const query = {
            tenant_id,
            requested_by: userId
        };
        
        if (status) {
            query.status = status;
        }
        
        const requests = await ApprovalRequest.find(query)
            .populate('workflow_id', 'name')
            .populate('steps.approver_id', 'full_name email')
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.json({
            success: true,
            data: requests,
            count: requests.length
        });
        
    } catch (error) {
        console.error('[Approval Engine API] Get my requests error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch your requests' 
        });
    }
});

module.exports = router;
