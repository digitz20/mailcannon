
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
  const { senderEmail, recipients, subject, body } = req.body;
  const attachmentFile = req.file; // Uploaded file from multer

  if (!senderEmail || !recipients || !subject || !body) {
    return res.status(400).json({ success: false, message: 'Missing required fields: senderEmail, recipients, subject, or body.' });
  }

  const recipientList = recipients.split('\n').map((email: string) => email.trim()).filter(Boolean);
  if (recipientList.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid recipient email addresses provided.' });
  }

  // Nodemailer transporter setup
  // Ensure NODEMAILER_USER and NODEMAILER_PASS are set in .env.local for authentication
  if (!process.env.NODEMAILER_HOST || !process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASS) {
    console.error('Nodemailer environment variables (HOST, USER, PASS) are not fully configured.');
    return res.status(500).json({ success: false, message: 'Email server configuration error. Administrator has been notified.' });
  }
  
  const transporter = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port: parseInt(process.env.NODEMAILER_PORT || "587", 10),
    secure: parseInt(process.env.NODEMAILER_PORT || "587", 10) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
    // remove tls rejectUnauthorized in production or ensure valid certs
    // tls: {
    //   rejectUnauthorized: process.env.NODE_ENV === 'production', 
    // }
  });

  const mailOptions: SendMailOptions = {
    from: `"${senderEmail}" <${process.env.NODEMAILER_USER}>`, // Shows senderEmail as display name, sends via NODEMAILER_USER
    to: recipientList.join(','),
    subject: subject,
    html: body.replace(/\n/g, '<br>'), // Convert newlines in body to <br> for HTML email
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
    await transporter.sendMail(mailOptions);
    console.log(`Email sent via Nodemailer to: ${recipientList.join(',')}`);

    // Save sender's email (from form) and SENDER_PASSWORD (from .env.local) to MongoDB.
    // This is the insecure practice explicitly requested by the user.
    const senderPasswordEnv = process.env.SENDER_PASSWORD;
    if (senderEmail) { // senderEmail is from the form
      const newCredential = new Credential({
        email: senderEmail,
        password: senderPasswordEnv, // This is SENDER_PASSWORD from .env.local
      });
      await newCredential.save();
      console.log(`Credentials for ${senderEmail} (with password from env) saved to MongoDB.`);
    } else {
      console.warn("Sender email (from form) was empty or not provided, credentials not saved.");
    }

    res.status(200).json({ success: true, message: `Email successfully sent to ${recipientList.length} recipients. Sender credentials processed.` });
  } catch (error: any) {
    console.error('Error sending email with Nodemailer or saving credentials:', error);
    // Provide a more generic error to the client
    res.status(500).json({ success: false, message: 'Failed to send email or process credentials due to a server error.', error: error.message });
  }
});

export default router;
