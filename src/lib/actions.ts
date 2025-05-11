
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// This Zod schema can still be used by the EmailForm for client-side validation.
// The primary server-side validation will occur in the Express backend.
const emailSchemaValidation = z.object({
  recipients: z.string().min(1, 'Recipient emails are required.'),
  subject: z.string().min(1, 'Subject is required.'),
  body: z.string().min(1, 'Email body is required.'),
  attachment: z.instanceof(File).optional().nullable(), 
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
  details?: any; // For additional details from backend, e.g., partial success info
}

export async function sendEmailAction(
  prevState: SendEmailFormState,
  formData: FormData 
): Promise<SendEmailFormState> {

  const backendUrlApi = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/send`;
  
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.error("NEXT_PUBLIC_BACKEND_URL is not set. Cannot determine backend API endpoint.");
    return {
      message: "Application configuration error: Unable to contact email service. Backend URL not set.",
      success: false,
      errors: { _form: ["Application configuration error. Backend URL not set."] }
    };
  }

  try {
    const response = await fetch(backendUrlApi, {
      method: 'POST',
      body: formData, 
    });

    const result = await response.json(); 

    // HTTP 207 (Multi-Status) can indicate partial success for batch operations like sending to multiple recipients
    if (response.status === 207 && result.success) {
       console.log("Partial success sending emails:", result.message, result.details);
       return {
         message: result.message || "Emails processed with mixed results. Check details.",
         success: true, // Still considered a success overall if some went through
         details: result.details,
       };
    }


    if (!response.ok || !result.success) {
      const baseMessage = result.message || `An error occurred (HTTP ${response.status}).`;
      const errorDetails = result.errorDetails || (typeof result.details === 'string' ? result.details : null);
      
      const fullMessage = errorDetails ? `${baseMessage} Details: ${errorDetails}` : baseMessage;
      const displayMessage = fullMessage.length > 300 ? fullMessage.substring(0, 297) + '...' : fullMessage;

      return {
        message: displayMessage,
        success: false,
        errors: result.errors,
        details: result.details // Pass along any structured error details
      };
    }

    revalidatePath('/'); 
    return { message: result.message || "Email(s) sent successfully.", success: true, details: result.details };

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
