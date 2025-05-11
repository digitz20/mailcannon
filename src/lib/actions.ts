
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// This Zod schema can still be used by the EmailForm for client-side validation.
// The primary server-side validation will occur in the Express backend.
const emailSchemaValidation = z.object({
  senderEmail: z.string().email('Invalid sender email format.'),
  recipients: z.string().min(1, 'Recipient emails are required.'),
  subject: z.string().min(1, 'Subject is required.'),
  body: z.string().min(1, 'Email body is required.'),
  attachment: z.instanceof(File).optional().nullable(), // Allow null for attachment
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
    _form?: string[]; // General form errors
  };
}

export async function sendEmailAction(
  prevState: SendEmailFormState,
  formData: FormData // FormData is passed from the EmailForm component
): Promise<SendEmailFormState> {

  const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/send`;
  
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.error("NEXT_PUBLIC_BACKEND_URL is not set. Cannot determine backend API endpoint.");
    return {
      message: "Application configuration error: Unable to contact email service. Backend URL not set.",
      success: false,
      errors: { _form: ["Application configuration error. Backend URL not set."] }
    };
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData, 
    });

    const result = await response.json(); 

    if (!response.ok || !result.success) {
      const baseMessage = result.message || `An error occurred while sending the email (HTTP ${response.status}).`;
      const details = result.errorDetails ? `Details: ${result.errorDetails}` : null;
      
      // Combine base message and details for a more informative toast.
      const fullMessage = details ? `${baseMessage} ${details}` : baseMessage;

      // Truncate message if too long for a toast
      const displayMessage = fullMessage.length > 300 ? fullMessage.substring(0, 297) + '...' : fullMessage;

      return {
        message: displayMessage,
        success: false,
        // Pass through structured errors from backend if any, otherwise use formState.message for general error.
        // If `result.errors` is undefined, the EmailForm will rely on `formState.message` for the toast.
        errors: result.errors 
      };
    }

    revalidatePath('/'); 
    return { message: result.message || "Email sent successfully.", success: true };

  } catch (error: any) {
    console.error('Network or unexpected error calling backend API:', error);
    let errorMessage = 'Failed to connect to the email service. Please check your network connection or try again later.';
    if (error.message) {
        errorMessage += ` Error: ${error.message}`;
    }
    return {
      message: errorMessage,
      success: false,
      errors: { _form: ['A network error occurred, or the email service is temporarily unavailable.'] },
    };
  }
}
