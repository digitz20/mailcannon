
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { saveCredentials } from './db';

const emailSchema = z.object({
  senderEmail: z.string().email('Invalid sender email format.'),
  recipients: z.string().min(1, 'Recipient emails are required.'),
  subject: z.string().min(1, 'Subject is required.'),
  body: z.string().min(1, 'Email body is required.'),
  attachment: z.instanceof(File).optional(),
});

export interface SendEmailFormState {
  message: string | null;
  success: boolean;
  errors?: {
    senderEmail?: string[];
    recipients?: string[];
    subject?: string[];
    body?: string[];
    attachment?: string[];
    _form?: string[];
  };
}

export async function sendEmailAction(
  prevState: SendEmailFormState,
  formData: FormData
): Promise<SendEmailFormState> {
  const attachment = formData.get('attachment') as File | null;

  const validatedFields = emailSchema.safeParse({
    senderEmail: formData.get('senderEmail'),
    recipients: formData.get('recipients'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    attachment: attachment && attachment.size > 0 ? attachment : undefined,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your inputs.',
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { senderEmail, recipients, subject, body } = validatedFields.data;
  // Split recipients by newline, then trim and filter out empty strings
  const recipientList = recipients.split('\n').map(email => email.trim()).filter(Boolean);

  if (recipientList.length === 0) {
    return {
      message: 'No valid recipient emails provided.',
      success: false,
      errors: { recipients: ['Please enter at least one valid email address.'] },
    };
  }

  // Placeholder for actual email sending logic
  console.log('Simulating email sending from:', senderEmail);
  console.log('Simulating email sending to:', recipientList);
  console.log('Subject:', subject);
  console.log('Body:', body);
  if (validatedFields.data.attachment) {
    console.log('Attachment:', validatedFields.data.attachment.name, validatedFields.data.attachment.size, 'bytes');
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Save sender credentials (email from form, password from env)
  // Storing SENDER_PASSWORD in environment variables and then to a database is highly insecure.
  // This is implemented based on the explicit request.
  const senderPassword = process.env.SENDER_PASSWORD; // VERY INSECURE PRACTICE

  // The password field in saveCredentials is optional; it will be undefined if SENDER_PASSWORD is not set.
  await saveCredentials(senderEmail, senderPassword);
  
  // Simulate potential error for email sending itself (unrelated to credential saving)
  // if (Math.random() > 0.8) {
  //   return {
  //     message: 'Failed to send email. Please try again.',
  //     success: false,
  //     errors: { _form: ['An unexpected error occurred on the server while sending email.'] }
  //   };
  // }

  revalidatePath('/');
  return { message: `Email successfully prepared for ${recipientList.length} recipients. Sender credentials (email: ${senderEmail}, password from env) were processed.`, success: true };
}

