/**
 * EXAMPLE: Email Notification Service Using Settings
 * 
 * This demonstrates how to use settings for:
 * - Retrieving email configuration
 * - Building emails with company branding
 * - Handling notification templates
 */

import { settingsApi } from '@/lib/settings-api';
import nodemailer from 'nodemailer';

interface NotificationOptions {
  to: string;
  subject: string;
  htmlContent: string;
  templateName?: string;
}

export class EmailNotificationService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter with settings from database
   */
  async initialize() {
    try {
      const emailConfig = await settingsApi.email.getAll();

      // Check if SMTP is configured
      if (!emailConfig.smtpHost || !emailConfig.smtpUser) {
        console.warn('[Email] SMTP not configured in settings');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: parseInt(emailConfig.smtpPort),
        secure: emailConfig.smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPass
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('[Email] SMTP connection verified');
      return true;
    } catch (error) {
      console.error('[Email] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Send notification email
   */
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    if (!this.transporter) {
      await this.initialize();
      if (!this.transporter) {
        console.error('[Email] Transporter not initialized');
        return false;
      }
    }

    try {
      const emailConfig = await settingsApi.email.getAll();
      const company = await settingsApi.company.getAll();

      // Build email with company branding
      const htmlWithBranding = await this.wrapWithTemplate({
        htmlContent: options.htmlContent,
        companyName: company.name,
        companyEmail: company.email,
        companyPhone: company.phone,
        companyWebsite: company.website
      });

      const info = await this.transporter.sendMail({
        from: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: htmlWithBranding
      });

      console.log(`[Email] Sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[Email] Send failed:', error);
      return false;
    }
  }

  /**
   * Wrap content with email template including company branding
   */
  private async wrapWithTemplate(options: {
    htmlContent: string;
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyWebsite: string;
  }): Promise<string> {
    const brandingSettings = await settingsApi.branding.getAll();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, ${brandingSettings.primaryColor}, ${brandingSettings.secondaryColor});
              color: white;
              padding: 20px;
              text-align: center;
            }
            .header img {
              max-width: 200px;
              height: auto;
            }
            .content {
              padding: 30px 20px;
            }
            .footer {
              background-color: #f5f5f5;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
            }
            .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: ${brandingSettings.primaryColor};
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${brandingSettings.logo ? `<img src="${brandingSettings.logo}" alt="Logo">` : ''}
              <h1>${options.companyName}</h1>
            </div>

            <div class="content">
              ${options.htmlContent}
            </div>

            <div class="footer">
              <p>
                ${options.companyName}<br>
                ${options.companyPhone}<br>
                <a href="mailto:${options.companyEmail}">${options.companyEmail}</a><br>
                <a href="${options.companyWebsite}">${options.companyWebsite}</a>
              </p>
              <p>© ${new Date().getFullYear()} ${options.companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send invoice notification
   */
  async sendInvoiceNotification(to: string, invoiceNumber: string, invoiceAmount: number): Promise<boolean> {
    const htmlContent = `
      <h2>Invoice Notification</h2>
      <p>Dear Customer,</p>
      <p>Your invoice <strong>${invoiceNumber}</strong> is ready.</p>
      <p><strong>Amount Due:</strong> AED ${invoiceAmount.toLocaleString()}</p>
      <p>
        <a href="https://erp.example.com/invoices/${invoiceNumber}" class="button">
          View Invoice
        </a>
      </p>
      <p>Thank you for your business!</p>
    `;

    return this.sendNotification({
      to,
      subject: `Invoice ${invoiceNumber} - Ready for Download`,
      htmlContent
    });
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(to: string, orderNumber: string, orderDate: Date): Promise<boolean> {
    const htmlContent = `
      <h2>Order Confirmation</h2>
      <p>Dear Customer,</p>
      <p>Your order <strong>${orderNumber}</strong> has been confirmed.</p>
      <p><strong>Date:</strong> ${orderDate.toLocaleDateString()}</p>
      <p>We will notify you once your order ships.</p>
      <p>
        <a href="https://erp.example.com/orders/${orderNumber}" class="button">
          Track Order
        </a>
      </p>
      <p>Thank you!</p>
    `;

    return this.sendNotification({
      to,
      subject: `Order Confirmation - ${orderNumber}`,
      htmlContent
    });
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequest(
    to: string,
    documentType: string,
    documentNumber: string,
    requesterName: string
  ): Promise<boolean> {
    const htmlContent = `
      <h2>Approval Request</h2>
      <p>Hello,</p>
      <p><strong>${requesterName}</strong> has requested your approval on the following:</p>
      <p><strong>Document Type:</strong> ${documentType}</p>
      <p><strong>Document Number:</strong> ${documentNumber}</p>
      <p>
        <a href="https://erp.example.com/approvals/${documentNumber}" class="button">
          Review & Approve
        </a>
      </p>
      <p>Please review and take action within 24 hours.</p>
    `;

    return this.sendNotification({
      to,
      subject: `Approval Required - ${documentType} ${documentNumber}`,
      htmlContent
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetLink: string): Promise<boolean> {
    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <p>
        <a href="${resetLink}" class="button">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendNotification({
      to,
      subject: 'Password Reset Request',
      htmlContent
    });
  }
}

// Export singleton instance
export const emailService = new EmailNotificationService();

// Usage in Express routes:
// 
// router.post('/send-invoice', async (req, res) => {
//   const { email, invoiceNumber, amount } = req.body;
//   const success = await emailService.sendInvoiceNotification(email, invoiceNumber, amount);
//   res.json({ success });
// });
