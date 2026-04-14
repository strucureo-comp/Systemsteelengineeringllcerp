'use server';

import nodemailer from 'nodemailer';

interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

// Email configuration from environment
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@bridgebreak.ae';
const FROM_NAME = process.env.FROM_NAME || 'Bridgebreak ERP';

// Create transporter only if SMTP is configured
function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailParams) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Email] SMTP not configured. Email not sent.');
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    return { success: true, error: null };
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  const subject = 'Welcome to Bridgebreak ERP';
  const html = `
    <h2>Welcome, ${fullName}!</h2>
    <p>Your account has been created successfully.</p>
    <p>Please log in to get started.</p>
    <p>Best regards,<br/>Bridgebreak Team</p>
  `;
  return sendEmail({ to, subject, html });
}

export async function sendProjectUpdateEmail(
  to: string,
  projectTitle: string,
  message: string,
  updatedBy: string
) {
  const subject = `Project Update: ${projectTitle}`;
  const html = `
    <h2>Project Update</h2>
    <p><strong>Project:</strong> ${projectTitle}</p>
    <p><strong>Updated by:</strong> ${updatedBy}</p>
    <p><strong>Message:</strong> ${message}</p>
  `;
  return sendEmail({ to, subject, html });
}

export async function sendSupportTicketEmail(
  to: string,
  subject: string,
  description: string,
  clientName: string,
  isAdmin: boolean
) {
  const html = `
    <h2>Support Ticket ${isAdmin ? 'Created' : 'Updated'}</h2>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Client:</strong> ${clientName}</p>
    <p><strong>Description:</strong> ${description}</p>
  `;
  return sendEmail({ to, subject: `Support: ${subject}`, html });
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  title: string,
  message: string,
  link?: string,
  linkText: string = 'View Details'
) {
  const html = `
    <h2>${title}</h2>
    <p>${message}</p>
    ${link ? `<p><a href="${link}">${linkText}</a></p>` : ''}
  `;
  return sendEmail({ to, subject, html });
}

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string
) {
  const subject = `Invoice ${invoiceNumber}`;
  const html = `
    <h2>Invoice ${invoiceNumber}</h2>
    <p><strong>Amount:</strong> ${amount}</p>
    <p><strong>Due Date:</strong> ${dueDate}</p>
    <p>Please review and process payment.</p>
  `;
  return sendEmail({ to, subject, html });
}

export async function sendMeetingStatusEmail(
  to: string,
  purpose: string,
  requestedDate: string,
  duration: number,
  status: string,
  meetingLink?: string
) {
  const subject = `Meeting Request: ${purpose} - ${status}`;
  const html = `
    <h2>Meeting Request Update</h2>
    <p><strong>Purpose:</strong> ${purpose}</p>
    <p><strong>Date:</strong> ${requestedDate}</p>
    <p><strong>Duration:</strong> ${duration} minutes</p>
    <p><strong>Status:</strong> ${status}</p>
    ${meetingLink ? `<p><a href="${meetingLink}">Join Meeting</a></p>` : ''}
  `;
  return sendEmail({ to, subject, html });
}