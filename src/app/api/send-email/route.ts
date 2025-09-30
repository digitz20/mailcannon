
// src/app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const PDF_ICON_URL = "https://cdn.icon-icons.com/icons2/2107/PNG/512/file_type_pdf_icon_130274.png";
const LOGO_URL = "https://i.pinimg.com/1200x/e2/47/08/e247084e32ebc0b6e34262cd37c59fb3.jpg";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const senderEmail = process.env.SENDER_EMAIL || (formData.get('senderEmail') as string);
    const senderPassword = process.env.SENDER_PASSWORD || (formData.get('senderPassword') as string);
    const senderDisplayName = formData.get('senderDisplayName') as string | null;
    const recipientsJSON = formData.get('recipients') as string;
    const subject = formData.get('subject') as string;

    // Template-related fields
    const useLinkTemplate = formData.get('useLinkTemplate') === 'true';
    const linkUrl = formData.get('linkUrl') as string | null;
    const body = formData.get('body') as string | null;
    const attachmentFile = formData.get('attachment') as File | null;


    if (!senderEmail || !senderPassword || !recipientsJSON || !subject) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const recipients = JSON.parse(recipientsJSON) as string[];
    const recipientEmail = recipients[0]; // Expecting only one recipient per request

    if (!recipientEmail) {
        return NextResponse.json({ message: 'Recipient email is missing.' }, { status: 400 });
    }

    // Determine SMTP settings
    let service = 'gmail';
    if (senderEmail.includes('yahoo')) service = 'yahoo';
    else if (senderEmail.includes('outlook') || senderEmail.includes('hotmail')) service = 'hotmail';

    const transporter = nodemailer.createTransport({
      service: service,
      auth: { user: senderEmail, pass: senderPassword },
    });
    
    let attachmentBuffer: Buffer | null = null;
    if (attachmentFile && !useLinkTemplate) {
        attachmentBuffer = Buffer.from(await attachmentFile.arrayBuffer());
    }

    let emailBody = '';
    const recipientName = recipientEmail.split('@')[0];
    const senderName = senderDisplayName || 'The Sender';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (useLinkTemplate && linkUrl) {
        emailBody = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: center;">
                <img src="${LOGO_URL}" alt="Company Logo" width="150" style="border:0; max-width: 100%; margin-bottom: 20px;">
                <div style="text-align: left;">
                    <p>Dear ${recipientName},</p>
                    <p>I am currently on vacation. I will be back at the publishing house in due time and will instruct you upon my arrival.</p>
                    <p>Please find attached the PDF document of our last brief, including names and shipment dates and deliveries.</p>
                    <div style="margin: 20px 0; text-align: center;">
                        <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
                            <img src="${PDF_ICON_URL}" alt="PDF Document" width="128" style="border:0; max-width: 100%;">
                        </a>
                    </div>
                    <p>Best regards,</p>
                    <p><strong>${senderName}</strong></p>
                    <p><em>${today}</em></p>
                </div>
            </div>
        `;
    } else {
        emailBody = (body || '').replace(/\n/g, '<br>');
    }

    const mailOptions: nodemailer.SendMailOptions = {
        from: senderDisplayName ? `"${senderDisplayName}" <${senderEmail}>` : senderEmail,
        to: recipientEmail,
        subject: subject,
        html: emailBody,
    };

    if (attachmentBuffer && attachmentFile) {
        mailOptions.attachments = [{
            filename: attachmentFile.name,
            content: attachmentBuffer,
            contentType: attachmentFile.type,
        }];
    }
    
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: `Email sent successfully to ${recipientEmail}` }, { status: 200 });

  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ message: `Error: ${errorMessage}` }, { status: 500 });
  }
}
