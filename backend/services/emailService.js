const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Warn if essential SMTP env vars are missing
const requiredSmtpVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingSmtp = requiredSmtpVars.filter(k => !process.env[k]);
if (missingSmtp.length > 0) {
    console.warn('[Email Service] Missing SMTP environment variables:', missingSmtp.join(', '));
    console.warn('[Email Service] Emails will not send until SMTP is configured. Copy .env.example -> .env and fill values.');
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE
// Handles all email sending via SMTP with logging and error handling
// ═══════════════════════════════════════════════════════════════════════════

// Create transporter with SMTP configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates
    }
});

// Test SMTP connection on startup
const verifySmtp = async () => {
    try {
        await transporter.verify();
        console.log('[Email Service] SMTP connection verified successfully');
        console.log(`[Email Service] Using SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    } catch (err) {
        console.error('[Email Service] SMTP connection failed:', err.message);
        console.error('[Email Service] Please check your SMTP configuration in .env');
        // Don't crash the server - just warn
    }
};

// Verify on module load
verifySmtp();

/**
 * Send email via SMTP
 * 
 * @param {Object} options - Email options
 * @param {string} options.tenant_id - Tenant ID for logging
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body
 * @param {string|string[]} [options.cc] - CC recipients
 * @param {string|string[]} [options.bcc] - BCC recipients
 * @param {Array} [options.attachments] - Email attachments
 * @param {string} [options.reference_type] - Document type (invoice, leave, etc.)
 * @param {string} [options.reference_id] - Document ID
 * @param {string} [options.sent_by] - User ID who triggered the email
 * @returns {Promise<Object>} { success, messageId, error }
 */
async function sendEmail({
    tenant_id = 'default',
    to,
    subject,
    html,
    text,
    cc,
    bcc,
    attachments = [],
    reference_type,
    reference_id,
    sent_by
}) {
    // Validate required fields
    if (!to || !subject || !html) {
        console.error('[Email Service] Missing required fields: to, subject, or html');
        return { success: false, error: 'Missing required fields' };
    }

    // Convert to array if string
    const toArray = Array.isArray(to) ? to : [to];
    const toStr = toArray.join(',');

    try {
        // Send email via SMTP
        const info = await transporter.sendMail({
            from: `"${process.env.COMPANY_NAME || 'ERP System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: toStr,
            cc: cc ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
            bcc: bcc ? (Array.isArray(bcc) ? bcc.join(',') : bcc) : undefined,
            subject,
            html,
            text: text || undefined,
            attachments // [{ filename, content (Buffer), contentType, path }]
        });

        // Log successful send
        await EmailLog.create({
            tenant_id,
            to: toStr,
            cc: cc ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
            bcc: bcc ? (Array.isArray(bcc) ? bcc.join(',') : bcc) : undefined,
            subject,
            status: 'sent',
            message_id: info.messageId,
            reference_type,
            reference_id,
            sent_by,
            sent_at: new Date()
        });

        console.log(`[Email Service] Email sent successfully to ${toStr} - Message ID: ${info.messageId}`);
        
        return { 
            success: true, 
            messageId: info.messageId 
        };

    } catch (err) {
        // Log failed send
        await EmailLog.create({
            tenant_id,
            to: toStr,
            cc: cc ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
            bcc: bcc ? (Array.isArray(bcc) ? bcc.join(',') : bcc) : undefined,
            subject,
            status: 'failed',
            error: err.message,
            reference_type,
            reference_id,
            sent_by
        });

        console.error('[Email Service] Email send failed:', err.message);
        console.error('[Email Service] To:', toStr);
        console.error('[Email Service] Subject:', subject);
        
        return { 
            success: false, 
            error: err.message 
        };
        
        // Never throw - email failure should not crash the main operation
    }
}

/**
 * Send bulk emails (with rate limiting to avoid SMTP throttling)
 * 
 * @param {Array} emails - Array of email objects
 * @param {number} delayMs - Delay between emails in milliseconds
 * @returns {Promise<Object>} { sent, failed, results }
 */
async function sendBulkEmails(emails, delayMs = 100) {
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
        const result = await sendEmail(email);
        results.push(result);
        
        if (result.success) {
            sent++;
        } else {
            failed++;
        }

        // Delay between emails to avoid SMTP rate limits
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return { sent, failed, results };
}

/**
 * Test SMTP connection
 * 
 * @returns {Promise<Object>} { success, message }
 */
async function testSmtpConnection() {
    try {
        await transporter.verify();
        return { 
            success: true, 
            message: 'SMTP connection successful' 
        };
    } catch (err) {
        return { 
            success: false, 
            message: err.message 
        };
    }
}

module.exports = {
    sendEmail,
    sendBulkEmails,
    testSmtpConnection,
    transporter // Export for advanced use cases
};

/**
 * Send password reset email
 */
async function sendPasswordResetEmail({ to, userName, resetToken, resetUrl }) {
    const subject = 'Password Reset Request';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Dear ${userName},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <p style="margin: 30px 0;">
                <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #6b7280; word-break: break-all;">${resetUrl}</p>
            <p style="color: #dc2626; margin-top: 20px;">
                <strong>This link will expire in 1 hour.</strong>
            </p>
            <p>If you didn't request this, please ignore this email.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                ${process.env.COMPANY_NAME || 'ERP System'}
            </p>
        </div>
    `;
    
    return sendEmail({ to, subject, html });
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail({ to, userName, loginUrl }) {
    const subject = `Welcome to ${process.env.COMPANY_NAME || 'ERP System'}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome!</h2>
            <p>Dear ${userName},</p>
            <p>Your account has been created successfully. You can now log in to access the system.</p>
            <p style="margin: 30px 0;">
                <a href="${loginUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Login Now
                </a>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                ${process.env.COMPANY_NAME || 'ERP System'}
            </p>
        </div>
    `;
    
    return sendEmail({ to, subject, html });
}

/**
 * Send invitation email
 */
async function sendInvitationEmail({ to, inviterName, invitationUrl }) {
    const subject = `You've been invited to ${process.env.COMPANY_NAME || 'ERP System'}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">You're Invited!</h2>
            <p>${inviterName} has invited you to join ${process.env.COMPANY_NAME || 'ERP System'}.</p>
            <p>Click the button below to accept the invitation and set up your account:</p>
            <p style="margin: 30px 0;">
                <a href="${invitationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Accept Invitation
                </a>
            </p>
            <p style="color: #dc2626; margin-top: 20px;">
                <strong>This invitation will expire in 7 days.</strong>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                ${process.env.COMPANY_NAME || 'ERP System'}
            </p>
        </div>
    `;
    
    return sendEmail({ to, subject, html });
}

/**
 * Send approval notification email
 */
async function sendApprovalNotification({ to, approverName, documentType, documentNumber, requesterName, amount, approvalUrl }) {
    const subject = `Approval Required: ${documentType} ${documentNumber}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Approval Request</h2>
            <p>Dear ${approverName},</p>
            <p>A new ${documentType} requires your approval:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Document:</strong> ${documentNumber}</p>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${documentType}</p>
                <p style="margin: 5px 0;"><strong>Requested by:</strong> ${requesterName}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
            </div>
            <p>
                <a href="${approvalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Review & Approve
                </a>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                This is an automated notification from ${process.env.COMPANY_NAME || 'ERP System'}.
            </p>
        </div>
    `;
    
    return sendEmail({ to, subject, html });
}

/**
 * Send PO to vendor email
 */
async function sendPurchaseOrderToVendor({ to, vendorName, poNumber, poDate, totalAmount, pdfAttachment }) {
    const subject = `Purchase Order ${poNumber}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Purchase Order</h2>
            <p>Dear ${vendorName},</p>
            <p>Please find attached Purchase Order ${poNumber} for your reference.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>PO Number:</strong> ${poNumber}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${poDate}</p>
                <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${totalAmount}</p>
            </div>
            <p>Please confirm receipt and expected delivery date.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Best regards,<br>
                ${process.env.COMPANY_NAME || 'ERP System'}
            </p>
        </div>
    `;
    
    const attachments = pdfAttachment ? [{
        filename: `PO-${poNumber}.pdf`,
        content: pdfAttachment,
        contentType: 'application/pdf'
    }] : [];
    
    return sendEmail({ to, subject, html, attachments });
}

// Re-export with new functions
module.exports = {
    sendEmail,
    sendBulkEmails,
    testSmtpConnection,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendInvitationEmail,
    sendApprovalNotification,
    sendPurchaseOrderToVendor,
    transporter
};
