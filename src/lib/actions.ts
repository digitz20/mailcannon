'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const emailSchema = z.object({
  recipients: z.string().min(1, 'Recipient emails are required.'),
  subject: z.string().min(1, 'Subject is required.'),
  body: z.string().min(1, 'Email body is required.'),
  attachment: z.instanceof(File).optional(),
});

export interface SendEmailFormState {
  message: string | null;
  success: boolean;
  errors?: {
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

  const { recipients, subject, body } = validatedFields.data;
  const recipientList = recipients.split(',').map(email => email.trim()).filter(Boolean);

  if (recipientList.length === 0) {
    return {
      message: 'No valid recipient emails provided.',
      success: false,
      errors: { recipients: ['Please enter at least one valid email address.'] },
    };
  }

  // Placeholder for actual email sending logic
  console.log('Sending email to:', recipientList);
  console.log('Subject:', subject);
  console.log('Body:', body);
  if (validatedFields.data.attachment) {
    console.log('Attachment:', validatedFields.data.attachment.name, validatedFields.data.attachment.size, 'bytes');
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate potential error
  // if (Math.random() > 0.8) {
  //   return {
  //     message: 'Failed to send email. Please try again.',
  //     success: false,
  //     errors: { _form: ['An unexpected error occurred on the server.'] }
  //   };
  // }

  revalidatePath('/');
  return { message: `Email successfully prepared for ${recipientList.length} recipients.`, success: true };
}
