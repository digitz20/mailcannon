// src/app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const senderEmail = formData.get('senderEmail') as string;
    const senderPassword = formData.get('senderPassword') as string;
    const senderDisplayName = formData.get('senderDisplayName') as string | null;
    const recipients = formData.getAll('recipients') as string[];
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const attachment = formData.get('attachment') as File | null;

    if (!senderEmail || !senderPassword || !recipients.length || !subject || !body) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Determine SMTP settings from sender's email provider
    let service = 'gmail'; // Default to gmail
    if (senderEmail.includes('yahoo')) {
      service = 'yahoo';
    } else if (senderEmail.includes('outlook') || senderEmail.includes('hotmail')) {
      service = 'hotmail';
    } // Add other services as needed

    const transporter = nodemailer.createTransport({
      service: service,
      auth: {
        user: senderEmail,
        pass: senderPassword,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: senderDisplayName ? `"${senderDisplayName}" <${senderEmail}>` : senderEmail,
      to: recipients.join(', '), // Nodemailer can take a comma-separated string
      subject: subject,
      html: body,
    };

    if (attachment) {
      const attachmentBuffer = Buffer.from(await attachment.arrayBuffer());
      mailOptions.attachments = [
        {
          filename: attachment.name,
          content: attachmentBuffer,
          contentType: attachment.type,
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Emails sent successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Provide more specific feedback for common errors
    if (errorMessage.includes('Invalid login') || errorMessage.includes('Authentication failed')) {
      return NextResponse.json({ message: 'Authentication failed. Please check your email and password/app passkey.' }, { status: 401 });
    }
    if (errorMessage.includes('Missing credentials')) {
      return NextResponse.json({ message: 'Server is missing email credentials configuration.' }, { status: 500 });
    }

    return NextResponse.json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}
    