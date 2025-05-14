
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// This Zod schema is for reference or potential future direct use if not using FormData.
// Client-side validation is primarily handled by react-hook-form in EmailForm.
const emailSchemaValidation = z.object({
  senderEmail: z.string().email(),
  senderPassword: z.string().min(1),
  recipients: z.string().min(1, 'Recipient emails are required.'),
  subject: z.string().min(1, 'Subject is required.'),
  body: z.string().min(1, 'Email body is required.'),
  attachment: z.instanceof(File).optional().nullable(), 
});

export interface SendEmailFormState {
  message: string | null;
  success: boolean;
  errors?: {
    senderEmail?: string[];
    senderPassword?: string[];
    recipients?: string[];
    subject?: string[];
    body?: string[];
    attachment?: string[];
    _form?: string[]; 
  };
  details?: any; 
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

  // Optionally, perform basic FormData presence checks here if desired,
  // though the backend will perform the comprehensive validation.
  // For example:
  // if (!formData.get('senderEmail') || !formData.get('senderPassword')) {
  //   return { message: "Sender email and password must be provided.", success: false, errors: { _form: ["Sender email and password must be provided."]}};
  // }

  try {
    const response = await fetch(backendUrlApi, {
      method: 'POST',
      body: formData, 
    });

    const result = await response.json(); 

    if (response.status === 207 && result.success) {
       console.log("Partial success sending emails:", result.message, result.details);
       return {
         message: result.message || "Emails processed with mixed results. Check details.",
         success: true, 
         details: result.details,
       };
    }

    if (!response.ok || !result.success) {
      const baseMessage = result.message || `An error occurred (HTTP ${response.status}).`;
      const errorDetailsMsg = result.errorDetails || (typeof result.details === 'string' ? result.details : (result.details?.errors?.[0]?.error ? result.details.errors[0].error : null) );
      
      let fullMessage = baseMessage;
      if (errorDetailsMsg && typeof errorDetailsMsg === 'string' && !baseMessage.includes(errorDetailsMsg)) {
        fullMessage = `${baseMessage} Details: ${errorDetailsMsg}`;
      }
      
      const displayMessage = fullMessage.length > 300 ? fullMessage.substring(0, 297) + '...' : fullMessage;

      return {
        message: displayMessage,
        success: false,
        // Pass through errors if the backend structures them for field-specific display
        errors: result.errors || (response.status === 400 && result.message ? { _form: [result.message] } : { _form: [displayMessage] }),
        details: result.details 
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
