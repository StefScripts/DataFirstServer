import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { format, parse } from 'date-fns';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD
  },
  debug: true,
  logger: true,
  tls: {
    rejectUnauthorized: false
  },

  pool: false,
  maxConnections: 1,
  maxMessages: 3
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server ready to send emails');
  }
});

export function generateToken() {
  return randomBytes(32).toString('hex');
}

function formatTime(time: string): string {
  return format(parse(time, 'HH:mm', new Date()), 'h:mm a');
}

function formatDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

async function sendAdminNotification({
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
}) {
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
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw new Error('Failed to send admin notification');
  }
}

export async function sendBookingConfirmation({
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
}) {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);

  const baseUrl = process.env.NODE_ENV === 'production' ? 'https://book.datafirstseo.com' : 'http://localhost:5173';

  const confirmationUrl = `${baseUrl}/confirm/${confirmationToken}`;
  const managementUrl = `${baseUrl}/manage/${confirmationToken}`;

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
    await transporter.sendMail(mailOptions);
    // Send admin notification
    await sendAdminNotification({
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

export async function sendBookingUpdatedEmail({
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
}) {
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
    await transporter.sendMail(mailOptions);
    // Send admin notification
    await sendAdminNotification({
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

export async function sendBookingCancelledEmail({ name, email, date, time }: { name: string; email: string; date: Date; time: string }) {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);

  const baseUrl = process.env.NODE_ENV === 'production' ? 'https://book.datafirstseo.com' : 'http://localhost:5173';

  const bookingUrl = `${baseUrl}/`;

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
    await transporter.sendMail(mailOptions);
    // Send admin notification
    await sendAdminNotification({
      type: 'cancelled',
      name,
      email,
      date,
      time,
      company: '' // We don't have company info in the cancel email params
    });
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    throw new Error('Failed to send cancellation email');
  }
}
