const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalRequest = require('../models/ApprovalRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { Employee } = require('../models/HRMS');

/**
 * Evaluate condition against document data
 */
function evaluateCondition(condition, documentData) {
    if (!condition || !condition.field) return true;
    
    const fieldValue = documentData[condition.field];
    const conditionValue = condition.value;
    
    switch (condition.operator) {
        case 'gt': return fieldValue > conditionValue;
        case 'lt': return fieldValue < conditionValue;
        case 'gte': return fieldValue >= conditionValue;
        case 'lte': return fieldValue <= conditionValue;
        case 'eq': return fieldValue == conditionValue;
        case 'ne': return fieldValue != conditionValue;
        default: return true;
    }
}

/**
 * Resolve approver based on type
 */
async function resolveApprover(step, documentData, tenant_id) {
    switch (step.approver_type) {
        case 'specific_user':
            if (!step.approver_user_id) {
                throw new Error(`Step ${step.step_number}: specific_user type requires approver_user_id`);
            }
            const specificUser = await User.findById(step.approver_user_id).select('_id full_name email');
            if (!specificUser) {
                throw new Error(`Step ${step.step_number}: User not found`);
            }
            return specificUser;
            
        case 'role':
            if (!step.approver_role) {
                throw new Error(`Step ${step.step_number}: role type requires approver_role`);
            }
            // Find first active user with this role
            const roleUser = await User.findOne({ 
                tenant_id, 
                role: step.approver_role,
                is_active: true,
                status: 'active'
            }).select('_id full_name email');
            
            if (!roleUser) {
                throw new Error(`Step ${step.step_number}: No active user found with role "${step.approver_role}"`);
            }
            return roleUser;
            
        case 'department_head':
            // Get department from document data
            const departmentId = documentData.department_id;
            if (!departmentId) {
                throw new Error(`Step ${step.step_number}: department_head type requires department_id in document`);
            }
            
            const { HRDepartment } = require('../models/HRMS');
            const department = await HRDepartment.findById(departmentId).populate('head_id');
            if (!department || !department.head_id) {
                throw new Error(`Step ${step.step_number}: Department head not found`);
            }
            
            const deptHeadUser = await User.findOne({ 
                _id: department.head_id.user_id,
                is_active: true 
            }).select('_id full_name email');
            
            if (!deptHeadUser) {
                throw new Error(`Step ${step.step_number}: Department head user not found`);
            }
            return deptHeadUser;
            
        case 'reporting_manager':
            // Get employee's reporting manager
            const employeeId = documentData.employee_id || documentData.requested_by_employee_id;
            if (!employeeId) {
                throw new Error(`Step ${step.step_number}: reporting_manager type requires employee_id in document`);
            }
            
            const employee = await Employee.findById(employeeId).populate('department_id');
            if (!employee || !employee.department_id || !employee.department_id.head_id) {
                throw new Error(`Step ${step.step_number}: Reporting manager not found`);
            }
            
            const managerUser = await User.findOne({
                _id: employee.department_id.head_id.user_id,
                is_active: true
            }).select('_id full_name email');
            
            if (!managerUser) {
                throw new Error(`Step ${step.step_number}: Manager user not found`);
            }
            return managerUser;
            
        default:
            throw new Error(`Step ${step.step_number}: Unknown approver_type "${step.approver_type}"`);
    }
}

/**
 * Create notification for user
 */
async function createNotification(tenant_id, user_id, type, title, message, reference_type, reference_id, reference_number, action_url, priority = 'normal') {
    try {
        await Notification.create({
            tenant_id,
            user_id,
            type,
            title,
            message,
            reference_type,
            reference_id,
            reference_number,
            action_url,
            priority
        });
    } catch (error) {
        console.error('[Approval Engine] Failed to create notification:', error);
        // Don't throw - notification failure shouldn't break approval flow
    }
}

/**
 * Submit document for approval
 */
async function submitForApproval(documentType, documentId, documentData, tenant_id, submittedBy) {
    try {
        // Find active workflow for this document type
        const workflow = await ApprovalWorkflow.findOne({
            tenant_id,
            document_type: documentType,
            is_active: true
        });
        
        if (!workflow) {
            console.log(`[Approval Engine] No workflow found for ${documentType} in tenant ${tenant_id} - auto-approving`);
            return {
                auto_approved: true,
                message: 'No approval workflow configured - document auto-approved'
            };
        }
        
        if (!workflow.steps || workflow.steps.length === 0) {
            console.log(`[Approval Engine] Workflow has no steps - auto-approving`);
            return {
                auto_approved: true,
                message: 'Workflow has no steps - document auto-approved'
            };
        }
        
        // Get submitter details
        const submitter = await User.findById(submittedBy).select('full_name email');
        
        // Resolve approvers for each step and evaluate conditions
        const resolvedSteps = [];
        for (const step of workflow.steps) {
            // Evaluate condition
            const conditionMet = evaluateCondition(step.condition, documentData);
            
            if (!conditionMet) {
                console.log(`[Approval Engine] Step ${step.step_number} condition not met - skipping`);
                continue;
            }
            
            // Resolve approver
            try {
                const approver = await resolveApprover(step, documentData, tenant_id);
                
                const dueAt = step.timeout_hours 
                    ? new Date(Date.now() + step.timeout_hours * 60 * 60 * 1000)
                    : null;
                
                resolvedSteps.push({
                    step_number: step.step_number,
                    step_name: step.name,
                    approver_id: approver._id,
                    approver_name: approver.full_name,
                    approver_email: approver.email,
                    status: step.step_number === 1 ? 'pending' : 'waiting',
                    due_at: dueAt
                });
            } catch (error) {
                console.error(`[Approval Engine] Failed to resolve approver for step ${step.step_number}:`, error.message);
                throw new Error(`Failed to resolve approver for step ${step.step_number}: ${error.message}`);
            }
        }
        
        if (resolvedSteps.length === 0) {
            console.log(`[Approval Engine] All steps skipped due to conditions - auto-approving`);
            return {
                auto_approved: true,
                message: 'All approval steps skipped - document auto-approved'
            };
        }
        
        // Create approval request
        const approvalRequest = await ApprovalRequest.create({
            tenant_id,
            document_type: documentType,
            document_id: documentId,
            document_number: documentData.document_number || documentData.number || 'N/A',
            document_data: {
                total_amount: documentData.total_amount || documentData.amount,
                currency: documentData.currency,
                description: documentData.description || documentData.title
            },
            requested_by: submittedBy,
            requested_by_name: submitter?.full_name,
            workflow_id: workflow._id,
            workflow_name: workflow.name,
            current_step: 1,
            status: 'pending',
            steps: resolvedSteps,
            history: [{
                action: 'submitted',
                step_number: 0,
                user_id: submittedBy,
                user_name: submitter?.full_name,
                comments: 'Document submitted for approval',
                timestamp: new Date()
            }]
        });
        
        // Notify first approver
        const firstStep = resolvedSteps[0];
        firstStep.notified_at = new Date();
        await approvalRequest.save();
        
        await createNotification(
            tenant_id,
            firstStep.approver_id,
            'approval_requested',
            `Approval Required: ${documentData.document_number || documentType}`,
            `${submitter?.full_name} has submitted ${documentType} for your approval`,
            'approval_request',
            approvalRequest._id,
            documentData.document_number,
            `/admin/approvals/${approvalRequest._id}`,
            'high'
        );
        
        // Send email notification to first approver
        try {
            const emailService = require('./emailService');
            await emailService.sendApprovalNotification({
                to: firstStep.approver_email,
                approverName: firstStep.approver_name,
                documentType: docType,
                documentNumber: docNumber,
                requesterName: requester.full_name,
                amount: totalAmount,
                approvalUrl: `${process.env.FRONTEND_URL}/admin/approvals/${approvalRequest._id}`
            });
            console.log(`[Approval Engine] Email sent to ${firstStep.approver_email}`);
        } catch (emailError) {
            console.error('[Approval Engine] Failed to send email:', emailError.message);
        }
        
        console.log(`[Approval Engine] Approval request created: ${approvalRequest._id}`);
        console.log(`[Approval Engine] First approver: ${firstStep.approver_name} (${firstStep.approver_email})`);
        
        return {
            auto_approved: false,
            approval_request: approvalRequest
        };
        
    } catch (error) {
        console.error('[Approval Engine] submitForApproval error:', error);
        throw error;
    }
}

/**
 * Process approval action (approve/reject)
 */
async function processApproval(approvalRequestId, approverId, action, comments) {
    try {
        const approvalRequest = await ApprovalRequest.findById(approvalRequestId);
        
        if (!approvalRequest) {
            throw new Error('Approval request not found');
        }
        
        if (approvalRequest.status !== 'pending') {
            throw new Error(`Cannot process approval - request status is ${approvalRequest.status}`);
        }
        
        // Validate approver
        if (!approvalRequest.canUserApprove(approverId)) {
            throw new Error('You are not authorized to approve this step');
        }
        
        const currentStep = approvalRequest.getCurrentStep();
        const approver = await User.findById(approverId).select('full_name email');
        
        if (action === 'approve') {
            // Mark current step as approved
            currentStep.status = 'approved';
            currentStep.actioned_at = new Date();
            currentStep.actioned_by = approverId;
            currentStep.comments = comments;
            
            // Add to history
            approvalRequest.history.push({
                action: 'approved',
                step_number: currentStep.step_number,
                user_id: approverId,
                user_name: approver?.full_name,
                comments,
                timestamp: new Date()
            });
            
            // Check if there are more steps
            const nextStepNumber = currentStep.step_number + 1;
            const nextStep = approvalRequest.steps.find(s => s.step_number === nextStepNumber);
            
            if (nextStep) {
                // Move to next step
                approvalRequest.current_step = nextStepNumber;
                nextStep.status = 'pending';
                nextStep.notified_at = new Date();
                
                await approvalRequest.save();
                
                // Notify next approver
                await createNotification(
                    approvalRequest.tenant_id,
                    nextStep.approver_id,
                    'approval_requested',
                    `Approval Required: ${approvalRequest.document_number}`,
                    `${approver?.full_name} approved step ${currentStep.step_number}. Your approval is now required.`,
                    'approval_request',
                    approvalRequest._id,
                    approvalRequest.document_number,
                    `/admin/approvals/${approvalRequest._id}`,
                    'high'
                );
                
                console.log(`[Approval Engine] Moved to step ${nextStepNumber}, notified ${nextStep.approver_name}`);
                
            } else {
                // Final approval - mark as approved
                approvalRequest.status = 'approved';
                approvalRequest.final_actioned_at = new Date();
                approvalRequest.final_actioned_by = approverId;
                approvalRequest.current_step = 0;
                
                await approvalRequest.save();
                
                // ── POST-APPROVAL ACTIONS ───────────────────────────────────────────
                // Update the status of the target document automatically
                try {
                    const docId = approvalRequest.document_id;
                    const tenant_id = approvalRequest.tenant_id;

                    if (approvalRequest.document_type === 'payroll_approval') {
                        const { Payroll } = require('../models/HRMS');
                        await Payroll.findByIdAndUpdate(docId, {
                            status: 'approved',
                            approved_at: new Date(),
                            approved_by: approverId
                        });
                    } else if (approvalRequest.document_type === 'purchase_order') {
                        const { PurchaseOrder } = require('../models/Procurement');
                        await PurchaseOrder.findByIdAndUpdate(docId, {
                            status: 'approved',
                            updated_by: approverId
                        });
                    } else if (approvalRequest.document_type === 'bill_approval') {
                        const { Bill } = require('../models/Payables');
                        await Bill.findByIdAndUpdate(docId, {
                            status: 'approved',
                            approved_at: new Date()
                        });
                    }
                } catch (callbackError) {
                    console.error('[Approval Engine] Post-approval update failed:', callbackError.message);
                }

                // Notify submitter
                await createNotification(
                    approvalRequest.tenant_id,
                    approvalRequest.requested_by,
                    'approval_approved',
                    `Approved: ${approvalRequest.document_number}`,
                    `Your ${approvalRequest.document_type} has been fully approved by ${approver?.full_name}`,
                    approvalRequest.document_type,
                    approvalRequest.document_id,
                    approvalRequest.document_number,
                    `/admin/${approvalRequest.document_type}/${approvalRequest.document_id}`,
                    'normal'
                );
                
                console.log(`[Approval Engine] Final approval completed by ${approver?.full_name}`);
            }
            
            return {
                success: true,
                status: approvalRequest.status,
                message: approvalRequest.status === 'approved' 
                    ? 'Document fully approved' 
                    : `Approved - moved to step ${nextStepNumber}`,
                approval_request: approvalRequest
            };
            
        } else if (action === 'reject') {
            // Mark current step as rejected
            currentStep.status = 'rejected';
            currentStep.actioned_at = new Date();
            currentStep.actioned_by = approverId;
            currentStep.comments = comments;
            
            // Mark entire request as rejected
            approvalRequest.status = 'rejected';
            approvalRequest.final_actioned_at = new Date();
            approvalRequest.final_actioned_by = approverId;
            approvalRequest.rejection_reason = comments;
            approvalRequest.current_step = 0;
            
            // Add to history
            approvalRequest.history.push({
                action: 'rejected',
                step_number: currentStep.step_number,
                user_id: approverId,
                user_name: approver?.full_name,
                comments,
                timestamp: new Date()
            });
            
            await approvalRequest.save();
            
            // Notify submitter
            await createNotification(
                approvalRequest.tenant_id,
                approvalRequest.requested_by,
                'approval_rejected',
                `Rejected: ${approvalRequest.document_number}`,
                `Your ${approvalRequest.document_type} was rejected by ${approver?.full_name}. Reason: ${comments}`,
                approvalRequest.document_type,
                approvalRequest.document_id,
                approvalRequest.document_number,
                `/admin/${approvalRequest.document_type}/${approvalRequest.document_id}`,
                'high'
            );
            
            console.log(`[Approval Engine] Rejected by ${approver?.full_name}: ${comments}`);
            
            return {
                success: true,
                status: 'rejected',
                message: 'Document rejected',
                approval_request: approvalRequest
            };
            
        } else {
            throw new Error(`Invalid action: ${action}`);
        }
        
    } catch (error) {
        console.error('[Approval Engine] processApproval error:', error);
        throw error;
    }
}

/**
 * Cancel approval request
 */
async function cancelApproval(approvalRequestId, cancelledBy, reason) {
    try {
        const approvalRequest = await ApprovalRequest.findById(approvalRequestId);
        
        if (!approvalRequest) {
            throw new Error('Approval request not found');
        }
        
        if (approvalRequest.status !== 'pending') {
            throw new Error(`Cannot cancel - request status is ${approvalRequest.status}`);
        }
        
        // Check if user is submitter or admin
        const user = await User.findById(cancelledBy).select('full_name role');
        const isAdmin = ['admin', 'superadmin', 'administrator'].includes(user?.role?.toLowerCase());
        const isSubmitter = approvalRequest.requested_by.toString() === cancelledBy.toString();
        
        if (!isAdmin && !isSubmitter) {
            throw new Error('Only the submitter or admin can cancel approval requests');
        }
        
        // Mark as cancelled
        approvalRequest.status = 'cancelled';
        approvalRequest.cancellation_reason = reason;
        approvalRequest.cancelled_by = cancelledBy;
        approvalRequest.cancelled_at = new Date();
        approvalRequest.current_step = 0;
        
        // Add to history
        approvalRequest.history.push({
            action: 'cancelled',
            step_number: approvalRequest.current_step,
            user_id: cancelledBy,
            user_name: user?.full_name,
            comments: reason,
            timestamp: new Date()
        });
        
        await approvalRequest.save();
        
        // Notify pending approvers
        const pendingApprovers = approvalRequest.getPendingApprovers();
        for (const approverId of pendingApprovers) {
            await createNotification(
                approvalRequest.tenant_id,
                approverId,
                'approval_cancelled',
                `Cancelled: ${approvalRequest.document_number}`,
                `Approval request cancelled by ${user?.full_name}. Reason: ${reason}`,
                'approval_request',
                approvalRequest._id,
                approvalRequest.document_number,
                null,
                'normal'
            );
        }
        
        console.log(`[Approval Engine] Cancelled by ${user?.full_name}: ${reason}`);
        
        return {
            success: true,
            message: 'Approval request cancelled',
            approval_request: approvalRequest
        };
        
    } catch (error) {
        console.error('[Approval Engine] cancelApproval error:', error);
        throw error;
    }
}

/**
 * Get pending approvals for a user
 */
async function getPendingApprovals(tenant_id, userId) {
    try {
        const approvals = await ApprovalRequest.find({
            tenant_id,
            status: 'pending',
            'steps.approver_id': userId,
            'steps.status': 'pending'
        })
        .populate('requested_by', 'full_name email')
        .populate('workflow_id', 'name')
        .sort({ createdAt: -1 });
        
        return approvals;
    } catch (error) {
        console.error('[Approval Engine] getPendingApprovals error:', error);
        throw error;
    }
}

/**
 * Get approval history for a document
 */
async function getApprovalHistory(documentType, documentId, tenant_id) {
    try {
        const approvals = await ApprovalRequest.find({
            tenant_id,
            document_type: documentType,
            document_id: documentId
        })
        .populate('requested_by', 'full_name email')
        .populate('workflow_id', 'name')
        .populate('steps.approver_id', 'full_name email')
        .sort({ createdAt: -1 });
        
        return approvals;
    } catch (error) {
        console.error('[Approval Engine] getApprovalHistory error:', error);
        throw error;
    }
}

module.exports = {
    submitForApproval,
    processApproval,
    cancelApproval,
    getPendingApprovals,
    getApprovalHistory
};
