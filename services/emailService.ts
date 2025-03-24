import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { formatDate, formatTime } from '../utils/dateHelpers';

dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD
      },
      debug: process.env.NODE_ENV !== 'production',
      logger: process.env.NODE_ENV !== 'production',
      tls: {
        rejectUnauthorized: false
      },
      pool: false,
      maxConnections: 1,
      maxMessages: 3
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP Connection Error:', error);
      } else {
        console.log('SMTP Server ready to send emails');
      }
    });
  }

  // Get the frontend base URL based on environment
  private getFrontendBaseUrl(): string {
    // First check for explicit FRONTEND_URL
    if (process.env.FRONTEND_URL) {
      return process.env.FRONTEND_URL;
    }

    // Otherwise use environment-specific defaults
    return process.env.NODE_ENV === 'production' ? 'https://datafirstseo.com' : 'http://localhost:5173';
  }

  // Generate a random token
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Send a booking confirmation email
  async sendBookingConfirmation({
    id,
    name,
    email,
    date,
    time,
    company,
    confirmationToken
  }: {
    id: number;
    name: string;
    email: string;
    date: Date;
    time: string;
    company: string;
    confirmationToken: string;
  }): Promise<void> {
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    const baseUrl = this.getFrontendBaseUrl();

    const confirmationUrl = `${baseUrl}/booking/confirm/${confirmationToken}`;
    const managementUrl = `${baseUrl}/booking/manage/${confirmationToken}`;

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: email,
      subject: 'Please Confirm Your SEO Consultation Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Booking Confirmation Required</h2>
          <p>Dear ${name},</p>
          <p>Thank you for booking a consultation with DataFirstSEO. Please confirm your booking by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Confirm My Booking
            </a>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time (PST):</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${company}</p>
          </div>

          <p>Need to make changes? You can manage your booking here:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${managementUrl}" style="color: #0070f3; text-decoration: underline;">
              Reschedule or Cancel Booking
            </a>
          </div>

          <h3>What to Prepare:</h3>
          <ul>
            <li>Current marketing goals and challenges</li>
            <li>Questions about your industry's SEO landscape</li>
            <li>Access to your current analytics (if available)</li>
          </ul>

          <p>Please note: Your booking is not confirmed until you click the confirmation button above.</p>

          <p>Best regards,<br>Stefan<br><a href="mailto:stefan@datafirstseo.com" style="color: #2563eb; text-decoration: underline;">stefan@datafirstseo.com</a></p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      // Also notify admin about the new booking
      await this.sendAdminNotification({
        type: 'new',
        name,
        email,
        company,
        date,
        time
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error('Failed to send confirmation email');
    }
  }

  // Send booking updated email
  async sendBookingUpdatedEmail({
    name,
    email,
    newDate,
    newTime,
    company
  }: {
    name: string;
    email: string;
    newDate: Date;
    newTime: string;
    company: string;
  }): Promise<void> {
    const formattedNewDate = formatDate(newDate);
    const formattedNewTime = formatTime(newTime);

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: email,
      subject: 'Your SEO Consultation Has Been Rescheduled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Booking Update Confirmation</h2>
          <p>Dear ${name},</p>
          <p>Your SEO consultation booking has been successfully rescheduled.</p>

          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4 style="margin: 0 0 10px 0;">Rescheduled Booking:</h4>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedNewDate}</p>
            <p style="margin: 5px 0;"><strong>Time (PST):</strong> ${formattedNewTime}</p>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${company}</p>
          </div>

          <p>We look forward to speaking with you at the new time.</p>

          <p>Best regards,<br>Stefan<br><a href="mailto:stefan@datafirstseo.com" style="color: #2563eb; text-decoration: underline;">stefan@datafirstseo.com</a></p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      // Notify admin about the rescheduled booking
      await this.sendAdminNotification({
        type: 'rescheduled',
        name,
        email,
        company,
        date: newDate,
        time: newTime
      });
    } catch (error) {
      console.error('Error sending update email:', error);
      throw new Error('Failed to send update email');
    }
  }

  // Send booking cancelled email
  async sendBookingCancelledEmail({ name, email, date, time }: { name: string; email: string; date: Date; time: string }): Promise<void> {
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    const baseUrl = this.getFrontendBaseUrl();
    const bookingUrl = `${baseUrl}/book`;

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: email,
      subject: 'Your SEO Consultation Has Been Cancelled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Booking Cancellation Confirmation</h2>
          <p>Dear ${name},</p>
          <p>Your SEO consultation booking has been cancelled as requested.</p>

          <p>If you'd like to schedule a new consultation, you can do so at any time here:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Schedule New Consultation
            </a>
          </div>

          <p>Best regards,<br>Stefan<br><a href="mailto:stefan@datafirstseo.com" style="color: #2563eb; text-decoration: underline;">stefan@datafirstseo.com</a></p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      // Notify admin about the cancelled booking
      try {
        await this.sendAdminNotification({
          type: 'cancelled',
          name,
          email,
          date,
          time,
          company: '' // We don't have company info in the cancel email params
        });
      } catch (error) {
        // Log but don't rethrow admin notification errors
        console.error('Error sending admin notification for cancellation:', error);
      }
    } catch (error) {
      console.error('Error sending cancellation email:', error);
      throw new Error('Failed to send cancellation email');
    }
  }

  // Send notification to admin about booking activities
  async sendAdminNotification({
    type,
    name,
    email,
    company,
    date,
    time
  }: {
    type: 'new' | 'rescheduled' | 'cancelled';
    name: string;
    email: string;
    company: string;
    date: Date;
    time: string;
  }): Promise<void> {
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    let subject = '';
    let content = '';

    switch (type) {
      case 'new':
        subject = 'New SEO Consultation Booking';
        content = `
          <div style="font-family: Arial, sans-serif;">
            <h2>New Consultation Booking</h2>
            <p>A new consultation has been booked with the following details:</p>
            <ul>
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Company:</strong> ${company}</li>
              <li><strong>Date:</strong> ${formattedDate}</li>
              <li><strong>Time:</strong> ${formattedTime}</li>
            </ul>
          </div>
        `;
        break;
      case 'rescheduled':
        subject = 'SEO Consultation Rescheduled';
        content = `
          <div style="font-family: Arial, sans-serif;">
            <h2>Consultation Rescheduled</h2>
            <p>A consultation has been rescheduled:</p>
            <div style="margin: 20px 0;">
              <h3>Client Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Company:</strong> ${company}</li>
              </ul>
            </div>
            <div style="margin: 20px 0;">
              <h3>New Schedule:</h3>
              <ul>
                <li><strong>New Date:</strong> ${formattedDate}</li>
                <li><strong>New Time:</strong> ${formattedTime}</li>
              </ul>
            </div>
          </div>
        `;
        break;
      case 'cancelled':
        subject = 'SEO Consultation Cancelled';
        content = `
          <div style="font-family: Arial, sans-serif;">
            <h2>Consultation Cancelled</h2>
            <p>A consultation has been cancelled:</p>
            <ul>
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Company:</strong> ${company}</li>
              <li><strong>Original Date:</strong> ${formattedDate}</li>
              <li><strong>Original Time:</strong> ${formattedTime}</li>
            </ul>
          </div>
        `;
        break;
    }

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: 'stefan@datafirstseo.com',
      subject,
      html: content
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending admin notification:', error);
      // We don't throw here as this is a secondary notification
      // and shouldn't block the primary email flow
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const baseUrl = this.getFrontendBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: email,
      subject: 'Reset Your Password - DataFirst SEO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>DataFirst SEO Team</p>
        </div>
      `,
      text: `Reset your password by clicking: ${resetUrl}. This link will expire in 1 hour.`
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully to:', email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      if ('response' in error) {
        console.error('Email service error details:', (error as any).response?.body);
      }
      throw new Error('Failed to send password reset email. Please try again later.');
    }
  }

  // Send contact form message
  async sendContactFormMessage({ name, email, company, message }: { name: string; email: string; company: string; message: string }): Promise<void> {
    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: 'stefan@datafirstseo.com',
      subject: `New Contact Form Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>New Contact Form Message</h2>
          <div style="margin: 20px 0;">
            <h3>Contact Details:</h3>
            <ul>
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Company:</strong> ${company}</li>
            </ul>
          </div>
          <div style="margin: 20px 0;">
            <h3>Message:</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending contact form message:', error);
      throw new Error('Failed to send contact form message');
    }
  }
}

// Create and export singleton instance
export const emailService = new EmailService();

// Export functions for backward compatibility with existing code
export function generateToken(): string {
  return emailService.generateToken();
}

export async function sendBookingConfirmation(params: Parameters<EmailService['sendBookingConfirmation']>[0]): Promise<void> {
  return emailService.sendBookingConfirmation(params);
}

export async function sendBookingUpdatedEmail(params: Parameters<EmailService['sendBookingUpdatedEmail']>[0]): Promise<void> {
  return emailService.sendBookingUpdatedEmail(params);
}

export async function sendBookingCancelledEmail(params: Parameters<EmailService['sendBookingCancelledEmail']>[0]): Promise<void> {
  return emailService.sendBookingCancelledEmail(params);
}
