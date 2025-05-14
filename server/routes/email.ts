
// server/routes/email.ts
import express from 'express';
import nodemailer from 'nodemailer';
import multer from 'multer';
import type { SendMailOptions } from 'nodemailer';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/send', upload.single('attachment'), async (req, res) => {
  console.log('Received request to /api/email/send');
  // senderEmail and senderPassword will now come from the form
  const { senderEmail, senderPassword, recipients, subject, body } = req.body;
  const attachmentFile = req.file;

  if (!senderEmail || !senderPassword || !recipients || !subject || !body) {
    console.warn('Validation Error: Missing required fields.', { 
        senderEmail: !!senderEmail, 
        senderPassword: !!senderPassword,
        recipients: !!recipients, 
        subject: !!subject, 
        body: !!body 
    });
    return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: sender email, sender password, recipients, subject, or body.' 
    });
  }
  console.log('Request fields validated successfully.');

  const recipientList = recipients.split('\n').map((email: string) => email.trim()).filter(Boolean);
  if (recipientList.length === 0) {
    console.warn('Validation Error: No valid recipient email addresses provided.');
    return res.status(400).json({ success: false, message: 'No valid recipient email addresses provided.' });
  }
  console.log(`Preparing to send email to ${recipientList.length} recipients: ${recipientList.join(', ')}`);

  // Nodemailer server configuration still comes from .env
  if (!process.env.NODEMAILER_HOST) { // Port can have default
    console.error('Nodemailer Configuration Error: Host not configured.');
    return res.status(500).json({ 
        success: false, 
        message: 'Email server configuration error.',
        errorDetails: 'Required Nodemailer environment variable (NODEMAILER_HOST) is missing.'
    });
  }

  let transporter;
  try {
    // Use senderEmail and senderPassword from the form for auth
    transporter = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: parseInt(process.env.NODEMAILER_PORT || "587", 10),
      secure: parseInt(process.env.NODEMAILER_PORT || "587", 10) === 465, // true for 465, false for other ports
      auth: {
        user: senderEmail, // From form
        pass: senderPassword, // From form
      },
      // Add timeout options
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 15000, // 15 seconds
    });
    console.log('Nodemailer transporter created successfully using provided sender credentials.');
  } catch (error: any) {
    console.error('Error creating Nodemailer transporter:', error);
    return res.status(500).json({ 
        success: false, 
        message: 'Failed to initialize email service.', 
        errorDetails: error.message 
    });
  }

  // Display name can still be a global setting or fallback to the sender's email from form
  const senderDisplayName = process.env.SENDER_DISPLAY_NAME || senderEmail.split('@')[0]; 
  
  let successfulSends = 0;
  let failedSendsInfo: Array<{ recipient: string; error: string }> = [];

  for (const recipient of recipientList) {
    // Email body is now just the user-provided body, converted to HTML line breaks
    const emailBodyHtml = body.replace(/\n/g, '<br>');

    const mailOptions: SendMailOptions = {
      from: `"${senderDisplayName}" <${senderEmail}>`, // Use senderEmail from form
      to: recipient,
      subject: subject,
      html: emailBodyHtml, // Use the processed body without tracking link
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
      console.error(`Error sending email to ${recipient}:`, error.message, error.code, error.responseCode, error.command);
      // Provide more detailed error messages
      let errorMessage = error.message;
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        errorMessage = `Authentication failed for sender ${senderEmail}. Please check credentials. (Server: ${error.response})`;
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        errorMessage = `Could not connect to email server ${process.env.NODEMAILER_HOST}. Please check server settings and network.`;
      }
      failedSendsInfo.push({ recipient, error: errorMessage });
    }
  }

  if (successfulSends === recipientList.length) {
    res.status(200).json({ success: true, message: `Email successfully sent to all ${successfulSends} recipients.` });
  } else if (successfulSends > 0) {
    res.status(207).json({ 
      success: true,
      message: `Email sent to ${successfulSends} of ${recipientList.length} recipients. Some deliveries failed.`,
      details: { successful: successfulSends, failed: failedSendsInfo.length, errors: failedSendsInfo }
    });
  } else {
    let clientMessage = 'Failed to send email to any recipients.';
    if (failedSendsInfo.length > 0 && (failedSendsInfo[0].error.includes('auth') || failedSendsInfo[0].error.includes('Authentication failed'))) {
        clientMessage = `Authentication failed for sender ${senderEmail}. Please check credentials.`;
    } else if (failedSendsInfo.length > 0 && (failedSendsInfo[0].error.includes('Could not connect') || failedSendsInfo[0].error.includes('check server settings'))) {
        clientMessage = `Could not connect to email server ${process.env.NODEMAILER_HOST}. Please check server settings and network.`;
    }
    res.status(500).json({ 
      success: false, 
      message: clientMessage,
      details: { successful: 0, failed: failedSendsInfo.length, errors: failedSendsInfo }
    });
  }
});

export default router;
