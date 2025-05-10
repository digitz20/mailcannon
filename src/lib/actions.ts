
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

  // Optional: Validate formData structure here using Zod before sending to backend,
  // though the backend will perform its own validation.
  // This example directly forwards FormData.

  // The backend URL should be an environment variable.
  // NEXT_PUBLIC_ means it's available on the client and server-side for Next.js
  const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/send`;
  
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.error("NEXT_PUBLIC_BACKEND_URL is not set. Cannot determine backend API endpoint.");
    return {
      message: "Application configuration error. Unable to contact email service.",
      success: false,
      errors: { _form: ["Application configuration error."] }
    };
  }

  try {
    // Use fetch to send FormData to the Express backend
    // FormData is suitable for multipart/form-data, which multer on the backend expects
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData, // Pass FormData directly
      // Fetch will automatically set Content-Type to multipart/form-data with boundary
    });

    const result = await response.json(); // Expect JSON response from the backend

    if (!response.ok || !result.success) {
      // Backend should return a 'message' and optionally 'errors' object
      return {
        message: result.message || 'An error occurred while sending the email.',
        success: false,
        // Map backend errors if provided in a compatible structure
        errors: result.errors || { _form: [result.message || `Backend error: ${response.status}`] },
      };
    }

    // On success:
    revalidatePath('/'); // Revalidate parts of the Next.js app if needed
    return { message: result.message, success: true };

  } catch (error: any) {
    console.error('Network or unexpected error calling backend API:', error);
    // Handle network errors or cases where the backend is unreachable
    return {
      message: 'Failed to connect to the email service. Please check your network connection or try again later.',
      success: false,
      errors: { _form: ['A network error occurred, or the email service is temporarily unavailable.'] },
    };
  }
}
