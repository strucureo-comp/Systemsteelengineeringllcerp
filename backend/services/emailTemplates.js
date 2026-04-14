// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// Professional HTML email templates for all system notifications
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base email template wrapper
 * Provides consistent branding and styling
 */
const baseTemplate = (content, company = {}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .wrap { max-width: 600px; margin: 0 auto; background: #fff; }
        .header { background: #1a1a2e; padding: 20px 30px; color: #fff; font-size: 18px; font-weight: bold; }
        .body { padding: 30px; line-height: 1.6; }
        .footer { background: #f5f5f5; padding: 15px 30px; font-size: 12px; color: #888; text-align: center; }
        .btn { display: inline-block; padding: 12px 28px; background: #1a1a2e; color: #fff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 14px; }
        .btn:hover { background: #2a2a3e; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 13px; border-bottom: 2px solid #ddd; font-weight: 600; }
        td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
        .total-row td { font-weight: bold; background: #fafafa; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .badge-blue { background: #e6f1fb; color: #185FA5; }
        .badge-green { background: #eaf3de; color: #3B6D11; }
        .badge-red { background: #fcebeb; color: #A32D2D; }
        .badge-yellow { background: #fff4e6; color: #B45309; }
        .info-box { background: #f0f4ff; border-left: 4px solid #1a1a2e; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
        .warning-box { background: #fff4e6; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
        p { margin: 12px 0; }
        strong { color: #1a1a2e; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="header">${company.name || 'ERP System'}</div>
        <div class="body">${content}</div>
        <div class="footer">
            This is an automated message from ${company.name || 'ERP System'}. Please do not reply to this email.<br>
            ${company.address ? company.address + '<br>' : ''}
            ${company.phone ? 'Phone: ' + company.phone + ' | ' : ''}
            ${company.email ? 'Email: ' + company.email : ''}
        </div>
    </div>
</body>
</html>
`;

// ═══════════════════════════════════════════════════════════════════════════
// FINANCE MODULE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Invoice email template
 */
exports.invoiceEmail = ({ invoice, customer, company, portalUrl }) => ({
    subject: `Invoice ${invoice.invoice_number} — Due ${new Date(invoice.due_date).toLocaleDateString('en-AE')}`,
    html: baseTemplate(`
        <p>Dear ${customer.legal_name || customer.customer_name || 'Valued Customer'},</p>
        <p>Please find below your invoice from <strong>${company.name || 'our company'}</strong>.</p>
        
        <div class="info-box">
            <strong>Invoice #:</strong> ${invoice.invoice_number}<br>
            <strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-AE')}<br>
            <strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-AE')}<br>
            <strong>Currency:</strong> ${invoice.currency || 'AED'}
        </div>

        <table>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Tax</th>
                <th>Amount</th>
            </tr>
            ${invoice.lines.map(l => `
                <tr>
                    <td>${l.description}</td>
                    <td>${l.quantity || 1}</td>
                    <td>${invoice.currency || 'AED'} ${(l.unit_price || 0).toFixed(2)}</td>
                    <td>${l.tax_rate || 0}%</td>
                    <td>${invoice.currency || 'AED'} ${(l.amount || 0).toFixed(2)}</td>
                </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="4">Subtotal</td>
                <td>${invoice.currency || 'AED'} ${(invoice.subtotal || 0).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
                <td colspan="4">Tax</td>
                <td>${invoice.currency || 'AED'} ${(invoice.tax_total || invoice.tax_amount || 0).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
                <td colspan="4"><strong>Total Due</strong></td>
                <td><strong>${invoice.currency || 'AED'} ${(invoice.total_amount || 0).toFixed(2)}</strong></td>
            </tr>
        </table>

        ${company.bank_name ? `
        <p><strong>Bank Details:</strong><br>
        Bank: ${company.bank_name}<br>
        ${company.iban ? `IBAN: ${company.iban}<br>` : ''}
        ${company.account_name ? `Account Name: ${company.account_name}<br>` : ''}
        ${company.swift_code ? `SWIFT: ${company.swift_code}` : ''}
        </p>
        ` : ''}

        ${portalUrl ? `<a href="${portalUrl}" class="btn">View Invoice Online</a>` : ''}

        <p style="font-size:12px;color:#888">If you have any questions, please contact ${company.email || 'us'}.</p>
    `, company)
});

/**
 * Payment receipt email template
 */
exports.paymentReceiptEmail = ({ payment, customer, invoice, company }) => ({
    subject: `Payment Received — ${payment.receipt_number || payment.reference_no}`,
    html: baseTemplate(`
        <p>Dear ${customer.legal_name || customer.customer_name || 'Valued Customer'},</p>
        <p>We have received your payment. Thank you!</p>
        
        <div class="info-box">
            <strong>Payment Ref:</strong> ${payment.receipt_number || payment.reference_no}<br>
            <strong>Amount Received:</strong> ${payment.currency || invoice.currency || 'AED'} ${(payment.amount_received || payment.amount || 0).toFixed(2)}<br>
            <strong>Payment Date:</strong> ${new Date(payment.payment_date).toLocaleDateString('en-AE')}<br>
            ${invoice ? `<strong>Against Invoice:</strong> ${invoice.invoice_number}<br>` : ''}
            ${invoice ? `<strong>Outstanding Balance:</strong> ${invoice.currency || 'AED'} ${(invoice.balance_due || 0).toFixed(2)}` : ''}
        </div>

        <p>This is your official payment receipt. Please keep it for your records.</p>
        <p>Thank you for your business!</p>
    `, company)
});

/**
 * Payment reminder email template
 */
exports.paymentReminderEmail = ({ invoice, customer, company, daysOverdue }) => ({
    subject: `Payment Reminder — Invoice ${invoice.invoice_number} ${daysOverdue > 0 ? 'Overdue' : 'Due Soon'}`,
    html: baseTemplate(`
        <p>Dear ${customer.legal_name || customer.customer_name},</p>
        ${daysOverdue > 0 ? `
            <div class="warning-box">
                <strong>⚠️ Payment Overdue</strong><br>
                This invoice is ${daysOverdue} day(s) overdue. Please arrange payment at your earliest convenience.
            </div>
        ` : `
            <p>This is a friendly reminder that the following invoice is due soon.</p>
        `}
        
        <div class="info-box">
            <strong>Invoice #:</strong> ${invoice.invoice_number}<br>
            <strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-AE')}<br>
            <strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-AE')}<br>
            <strong>Amount Due:</strong> ${invoice.currency || 'AED'} ${(invoice.balance_due || invoice.total_amount || 0).toFixed(2)}
        </div>

        ${company.bank_name ? `
        <p><strong>Bank Details:</strong><br>
        Bank: ${company.bank_name}<br>
        ${company.iban ? `IBAN: ${company.iban}<br>` : ''}
        ${company.account_name ? `Account Name: ${company.account_name}` : ''}
        </p>
        ` : ''}

        <p>If you have already made this payment, please disregard this reminder.</p>
        <p>For any queries, please contact ${company.email || 'us'}.</p>
    `, company)
});

// ═══════════════════════════════════════════════════════════════════════════
// PROCUREMENT MODULE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Purchase Order email to vendor
 */
exports.purchaseOrderEmail = ({ po, vendor, company }) => ({
    subject: `Purchase Order ${po.po_number} from ${company.name || 'Company'}`,
    html: baseTemplate(`
        <p>Dear ${vendor.legal_name || vendor.name},</p>
        <p>Please find below our Purchase Order. Kindly confirm receipt and expected delivery date.</p>
        
        <div class="info-box">
            <strong>PO Number:</strong> ${po.po_number}<br>
            <strong>Order Date:</strong> ${new Date(po.order_date || po.po_date).toLocaleDateString('en-AE')}<br>
            ${po.delivery_date ? `<strong>Required By:</strong> ${new Date(po.delivery_date).toLocaleDateString('en-AE')}<br>` : ''}
            ${company.address ? `<strong>Delivery To:</strong> ${company.address}` : ''}
        </div>

        <table>
            <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
            ${po.lines.map(l => `
                <tr>
                    <td>${l.item_code || l.item_id || ''}</td>
                    <td>${l.description}</td>
                    <td>${l.quantity} ${l.uom || ''}</td>
                    <td>${po.currency || 'AED'} ${(l.unit_price || 0).toFixed(2)}</td>
                    <td>${po.currency || 'AED'} ${((l.quantity || 0) * (l.unit_price || 0)).toFixed(2)}</td>
                </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="4"><strong>Total</strong></td>
                <td><strong>${po.currency || 'AED'} ${(po.total_amount || 0).toFixed(2)}</strong></td>
            </tr>
        </table>

        <p><strong>Payment Terms:</strong> ${po.payment_terms || 'As agreed'}</p>
        <p>Please reply to confirm receipt of this PO and your delivery schedule.</p>
        <p><strong>Contact:</strong> ${company.procurement_email || company.email || ''}</p>
    `, company)
});

// ═══════════════════════════════════════════════════════════════════════════
// HR MODULE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Payslip email template
 */
exports.payslipEmail = ({ employee, payroll, company }) => ({
    subject: `Your Payslip for ${payroll.month || payroll.period} — Confidential`,
    html: baseTemplate(`
        <p>Dear ${employee.full_name || employee.name},</p>
        <p>Please find your payslip for <strong>${payroll.month || payroll.period}</strong> attached to this email.</p>
        
        <div class="info-box">
            <strong>Employee ID:</strong> ${employee.employee_id}<br>
            <strong>Period:</strong> ${payroll.month || payroll.period}<br>
            ${payroll.net_pay ? `<strong>Net Pay:</strong> AED ${payroll.net_pay.toFixed(2)}<br>` : ''}
            <strong>Payment Date:</strong> ${new Date(payroll.payment_date || Date.now()).toLocaleDateString('en-AE')}
        </div>

        <p>If you have any queries regarding your payslip, please contact HR at ${company.hr_email || company.email || 'HR department'}.</p>
        <p style="font-size:12px;color:#888"><strong>⚠️ Confidential:</strong> This email and attachment contain confidential information.</p>
    `, company)
});

/**
 * Leave approval/rejection email template
 */
exports.leaveActionEmail = ({ employee, leave, action, comments, approver, company }) => ({
    subject: `Leave Request ${action === 'approved' ? 'Approved' : 'Rejected'} — ${leave.leave_type || 'Leave'}`,
    html: baseTemplate(`
        <p>Dear ${employee.full_name || employee.name},</p>
        
        ${action === 'approved' ? `
            <p>Your leave request has been <span class="badge badge-green">Approved</span>.</p>
            
            <div class="info-box">
                <strong>Leave Type:</strong> ${leave.leave_type || 'Leave'}<br>
                <strong>From:</strong> ${new Date(leave.start_date).toLocaleDateString('en-AE')}<br>
                <strong>To:</strong> ${new Date(leave.end_date).toLocaleDateString('en-AE')}<br>
                ${leave.total_days ? `<strong>Days:</strong> ${leave.total_days}<br>` : ''}
                <strong>Approved By:</strong> ${approver.full_name || approver.name || 'Manager'}
            </div>

            <p>Have a great leave! 🌴</p>
        ` : `
            <p>Your leave request has been <span class="badge badge-red">Rejected</span>.</p>
            
            <div class="warning-box">
                <strong>Leave Type:</strong> ${leave.leave_type || 'Leave'}<br>
                <strong>Dates Requested:</strong> ${new Date(leave.start_date).toLocaleDateString('en-AE')} to ${new Date(leave.end_date).toLocaleDateString('en-AE')}<br>
                ${comments ? `<strong>Reason:</strong> ${comments}<br>` : ''}
                <strong>Rejected By:</strong> ${approver.full_name || approver.name || 'Manager'}
            </div>

            <p>Please contact HR if you have questions.</p>
        `}
    `, company)
});

/**
 * Leave application notification to manager
 */
exports.leaveApplicationEmail = ({ employee, leave, manager, company, actionUrl }) => ({
    subject: `Leave Request from ${employee.full_name || employee.name} — Action Required`,
    html: baseTemplate(`
        <p>Dear ${manager.full_name || manager.name},</p>
        <p>You have a new leave request pending your approval.</p>
        
        <div class="info-box">
            <strong>Employee:</strong> ${employee.full_name || employee.name} (${employee.employee_id})<br>
            <strong>Leave Type:</strong> ${leave.leave_type || 'Leave'}<br>
            <strong>From:</strong> ${new Date(leave.start_date).toLocaleDateString('en-AE')}<br>
            <strong>To:</strong> ${new Date(leave.end_date).toLocaleDateString('en-AE')}<br>
            ${leave.total_days ? `<strong>Days:</strong> ${leave.total_days}<br>` : ''}
            ${leave.reason ? `<strong>Reason:</strong> ${leave.reason}` : ''}
        </div>

        ${actionUrl ? `<a href="${actionUrl}" class="btn">Review & Approve</a>` : ''}
        
        <p style="font-size:12px;color:#888">Or log in to the ERP system to take action on this request.</p>
    `, company)
});

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL ENGINE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic approval request email
 */
exports.approvalRequestEmail = ({ approver, documentType, documentNumber, amount, currency, submittedBy, company, actionUrl }) => ({
    subject: `Action Required: Approve ${documentType} ${documentNumber}`,
    html: baseTemplate(`
        <p>Dear ${approver.full_name || approver.name},</p>
        <p>You have a pending approval request.</p>
        
        <div class="info-box">
            <strong>Document:</strong> ${documentType}<br>
            <strong>Number:</strong> ${documentNumber}<br>
            ${amount ? `<strong>Amount:</strong> ${currency || 'AED'} ${amount.toFixed(2)}<br>` : ''}
            <strong>Submitted By:</strong> ${submittedBy.full_name || submittedBy.name}<br>
            <strong>Submitted At:</strong> ${new Date().toLocaleString('en-AE')}
        </div>

        ${actionUrl ? `<a href="${actionUrl}" class="btn">Review & Approve</a>` : ''}
        
        <p style="font-size:12px;color:#888">Or log in to the ERP system to take action on this request.</p>
    `, company)
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH & USER MANAGEMENT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User invitation email
 */
exports.inviteEmail = ({ invitedBy, role, company, signupUrl }) => ({
    subject: `You've been invited to join ${company.name || 'ERP System'}`,
    html: baseTemplate(`
        <p>Hello,</p>
        <p><strong>${invitedBy.full_name || invitedBy.name}</strong> has invited you to join <strong>${company.name || 'the ERP system'}</strong>.</p>
        
        <div class="info-box">
            <strong>Company:</strong> ${company.name || 'ERP System'}<br>
            <strong>Your Role:</strong> ${role}<br>
            <strong>Invited By:</strong> ${invitedBy.full_name || invitedBy.name}
        </div>

        ${signupUrl ? `<a href="${signupUrl}" class="btn">Accept Invitation</a>` : ''}
        
        <p style="font-size:12px;color:#888">This invitation expires in 48 hours. If you did not expect this invitation, please ignore this email.</p>
    `, company)
});

/**
 * Password reset email
 */
exports.passwordResetEmail = ({ userName, resetUrl, company }) => ({
    subject: `Password Reset — ${company.name || 'ERP System'}`,
    html: baseTemplate(`
        <p>Dear ${userName},</p>
        <p>We received a request to reset your password.</p>
        
        ${resetUrl ? `<a href="${resetUrl}" class="btn">Reset Password</a>` : ''}
        
        <p style="font-size:12px;color:#888">This link expires in 1 hour. If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
    `, company)
});

/**
 * Welcome email for new users
 */
exports.welcomeEmail = ({ user, company, loginUrl }) => ({
    subject: `Welcome to ${company.name || 'ERP System'}!`,
    html: baseTemplate(`
        <p>Dear ${user.full_name || user.name},</p>
        <p>Welcome to <strong>${company.name || 'our ERP system'}</strong>! Your account has been successfully created.</p>
        
        <div class="info-box">
            <strong>Email:</strong> ${user.email}<br>
            <strong>Role:</strong> ${user.role}
        </div>

        ${loginUrl ? `<a href="${loginUrl}" class="btn">Login Now</a>` : ''}
        
        <p>If you have any questions, please contact ${company.email || 'support'}.</p>
    `, company)
});

module.exports = exports;
