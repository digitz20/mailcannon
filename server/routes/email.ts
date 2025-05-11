
// server/routes/email.ts
import express from 'express';
import nodemailer from 'nodemailer';
import multer from 'multer';
import type { SendMailOptions } from 'nodemailer';
// import Credential from '../models/credential'; // No longer saving sender credentials
import crypto from 'crypto'; // For generating unique IDs

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/send', upload.single('attachment'), async (req, res) => {
  console.log('Received request to /api/email/send');
  const { recipients, subject, body } = req.body;
  const attachmentFile = req.file;

  if (!recipients || !subject || !body) {
    console.warn('Validation Error: Missing required fields.', { recipients: !!recipients, subject: !!subject, body: !!body });
    return res.status(400).json({ success: false, message: 'Missing required fields: recipients, subject, or body.' });
  }
  console.log('Request fields validated successfully.');

  const recipientList = recipients.split('\n').map((email: string) => email.trim()).filter(Boolean);
  if (recipientList.length === 0) {
    console.warn('Validation Error: No valid recipient email addresses provided.');
    return res.status(400).json({ success: false, message: 'No valid recipient email addresses provided.' });
  }
  console.log(`Preparing to send email to ${recipientList.length} recipients: ${recipientList.join(', ')}`);

  if (!process.env.NODEMAILER_HOST || !process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASS) {
    console.error('Nodemailer Configuration Error: Host, User, or Pass not fully configured.');
    return res.status(500).json({ 
        success: false, 
        message: 'Email server configuration error.',
        errorDetails: 'Required Nodemailer environment variables (host, user, pass) are missing.'
    });
  }

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: parseInt(process.env.NODEMAILER_PORT || "587", 10),
      secure: parseInt(process.env.NODEMAILER_PORT || "587", 10) === 465,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });
    console.log('Nodemailer transporter created successfully.');
  } catch (error: any) {
    console.error('Error creating Nodemailer transporter:', error);
    return res.status(500).json({ 
        success: false, 
        message: 'Failed to initialize email service.', 
        errorDetails: error.message 
    });
  }

  const senderDisplayName = process.env.SENDER_DISPLAY_NAME || process.env.NODEMAILER_USER;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    console.warn('NEXT_PUBLIC_BACKEND_URL is not set. Tracking links will not be generated.');
  }

  let successfulSends = 0;
  let failedSendsInfo: Array<{ recipient: string; error: string }> = [];

  for (const recipient of recipientList) {
    const trackingId = crypto.randomUUID();
    let emailBodyWithTracking = body.replace(/\n/g, '<br>'); // Original body

    if (backendUrl) {
      // IMPORTANT: This link is solely for tracking access to a document and logging the recipient's email.
      // It does NOT and MUST NOT attempt to capture passwords or any other sensitive personal information.
      const trackingUrl = `${backendUrl}/api/track/file/${trackingId}?recipient_email=${encodeURIComponent(recipient)}&subject=${encodeURIComponent(subject)}`;
      const trackingLinkHtml = `<br><br><p><small>To access your secure document, please <a href="${trackingUrl}">click here</a>. This link helps us confirm receipt.</small></p>`;
      emailBodyWithTracking += trackingLinkHtml;
    } else {
      emailBodyWithTracking += `<br><br><p><small>Document access confirmation is currently unavailable.</small></p>`;
    }

    const mailOptions: SendMailOptions = {
      from: `"${senderDisplayName}" <${process.env.NODEMAILER_USER}>`,
      to: recipient,
      subject: subject,
      html: emailBodyWithTracking,
    };

    if (attachmentFile) {
      mailOptions.attachments = [
        {
          filename: attachmentFile.originalname,
          content: attachmentFile.buffer,
          contentType: attachmentFile.mimetype,
        },
      ];
    }

    try {
      console.log(`Attempting to send email to: ${recipient}, Subject: ${subject}`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email to ${recipient} sent successfully. Message ID: ${info.messageId}`);
      successfulSends++;
    } catch (error: any) {
      console.error(`Error sending email to ${recipient}:`, error.message);
      failedSendsInfo.push({ recipient, error: error.message });
    }
  }

  // Sender credentials are NOT saved to the database.
  // The tracking of recipient link clicks is handled by the /api/track endpoint.

  if (successfulSends === recipientList.length) {
    res.status(200).json({ success: true, message: `Email successfully sent to all ${successfulSends} recipients.` });
  } else if (successfulSends > 0) {
    res.status(207).json({ 
      success: true,  // Partial success
      message: `Email sent to ${successfulSends} of ${recipientList.length} recipients. Some deliveries failed.`,
      details: { successful: successfulSends, failed: failedSendsInfo.length, errors: failedSendsInfo }
    });
  } else {
    let clientMessage = 'Failed to send email to any recipients.';
    if (failedSendsInfo.length > 0 && failedSendsInfo[0].error.includes('auth')) { // Check for common auth error
        clientMessage = 'Email authentication failed for the sender. Please check server credentials.';
    }
    res.status(500).json({ 
      success: false, 
      message: clientMessage,
      details: { successful: 0, failed: failedSendsInfo.length, errors: failedSendsInfo }
    });
  }
});

export default router;

