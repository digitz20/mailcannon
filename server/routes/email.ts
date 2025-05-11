
// server/routes/email.ts
import express from 'express';
import nodemailer from 'nodemailer';
import multer from 'multer';
import type { SendMailOptions } from 'nodemailer';
import Credential from '../models/credential'; // Mongoose model

const router = express.Router();

// Multer setup for file uploads: store files in memory
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Example: 10MB file size limit
});

router.post('/send', upload.single('attachment'), async (req, res) => {
  console.log('Received request to /api/email/send');
  const { senderEmail, recipients, subject, body } = req.body;
  const attachmentFile = req.file; // Uploaded file from multer

  if (!senderEmail || !recipients || !subject || !body) {
    console.warn('Validation Error: Missing required fields from request body.', { senderEmail: !!senderEmail, recipients: !!recipients, subject: !!subject, body: !!body });
    return res.status(400).json({ success: false, message: 'Missing required fields: senderEmail, recipients, subject, or body.' });
  }
  console.log('Request fields validated successfully.');

  const recipientList = recipients.split('\n').map((email: string) => email.trim()).filter(Boolean);
  if (recipientList.length === 0) {
    console.warn('Validation Error: No valid recipient email addresses provided.');
    return res.status(400).json({ success: false, message: 'No valid recipient email addresses provided.' });
  }
  console.log(`Processing email for ${recipientList.length} recipients: ${recipientList.join(', ')}`);

  // Nodemailer transporter setup
  console.log('Checking Nodemailer environment variables...');
  if (!process.env.NODEMAILER_HOST || !process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASS) {
    console.error('Nodemailer Configuration Error: NODEMAILER_HOST, NODEMAILER_USER, or NODEMAILER_PASS is not fully configured in environment variables.');
    if (!process.env.NODEMAILER_HOST) console.error('NODEMAILER_HOST is missing.');
    if (!process.env.NODEMAILER_USER) console.error('NODEMAILER_USER is missing.');
    if (!process.env.NODEMAILER_PASS) console.error('NODEMAILER_PASS is missing.');
    return res.status(500).json({ success: false, message: 'Email server configuration error. Administrator has been notified.' });
  }
  console.log('Nodemailer environment variables seem present. Creating transporter...');
  
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: parseInt(process.env.NODEMAILER_PORT || "587", 10),
      secure: parseInt(process.env.NODEMAILER_PORT || "587", 10) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
      // Consider enabling `debug: true` for more verbose Nodemailer logs during development if issues persist
      // debug: process.env.NODE_ENV !== 'production', 
      // logger: process.env.NODE_ENV !== 'production',
    });
    console.log('Nodemailer transporter created successfully.');
  } catch (error: any) {
    console.error('Error creating Nodemailer transporter:', error);
    return res.status(500).json({ success: false, message: 'Failed to initialize email service. Configuration issue suspected.', errorDetails: error.message });
  }

  const mailOptions: SendMailOptions = {
    from: `"${senderEmail}" <${process.env.NODEMAILER_USER}>`, 
    to: recipientList.join(','),
    subject: subject,
    html: body.replace(/\n/g, '<br>'),
  };

  if (attachmentFile) {
    console.log(`Attaching file: ${attachmentFile.originalname}, size: ${attachmentFile.size} bytes, type: ${attachmentFile.mimetype}`);
    mailOptions.attachments = [
      {
        filename: attachmentFile.originalname,
        content: attachmentFile.buffer,
        contentType: attachmentFile.mimetype,
      },
    ];
  }

  try {
    console.log(`Attempting to send email. From: "${senderEmail}" <${process.env.NODEMAILER_USER}>, To: ${recipientList.join(',')}, Subject: ${subject}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully via Nodemailer. Message ID: ${info.messageId}, Response: ${info.response}`);

    const senderPasswordEnv = process.env.SENDER_PASSWORD;
    if (!senderPasswordEnv) {
        console.warn("SENDER_PASSWORD environment variable is not set. Password will not be saved with credentials.");
    }

    if (senderEmail) { 
      console.log(`Attempting to save credentials for sender: ${senderEmail}`);
      const newCredential = new Credential({
        email: senderEmail,
        password: senderPasswordEnv, 
      });
      await newCredential.save();
      console.log(`Credentials for ${senderEmail} (with SENDER_PASSWORD from env if present) saved to MongoDB.`);
    } else {
      console.warn("Sender email (from form) was empty or not provided at the point of saving credentials, so credentials were not saved.");
    }

    res.status(200).json({ success: true, message: `Email successfully sent to ${recipientList.length} recipients. Sender credentials processed.` });
  } catch (error: any) {
    // IMPORTANT: Check your backend server console logs for the detailed error message here.
    // This 'error' object contains the specific reason for the failure (e.g., SMTP auth error, DB connection issue).
    console.error('Error during email sending or credential saving process:', error); 
    if (error.code) { 
      console.error(`Nodemailer specific error code: ${error.code}`);
    }
    if (error.responseCode) { 
        console.error(`SMTP server response code: ${error.responseCode}`);
    }
    if (error.command) {
        console.error(`Nodemailer command: ${error.command}`);
    }
    // The client receives a generic message, but server logs now have more details.
    res.status(500).json({ success: false, message: 'Failed to send email or process credentials due to a server error.', errorDetails: error.message });
  }
});

export default router;

