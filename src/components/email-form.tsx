
'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Paperclip, Loader2, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// import { Label } from '@/components/ui/label'; // No longer directly used
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { SendEmailFormState } from '@/lib/actions';
import { sendEmailAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  recipients: z.string().min(1, 'Please enter at least one recipient email.'),
  subject: z.string().min(1, 'Subject cannot be empty.'),
  body: z.string().min(1, 'Email body cannot be empty.'),
  attachment: z.custom<FileList | null>((val) => val instanceof FileList || val === null, "Invalid file").optional(),
});

type EmailFormValues = z.infer<typeof formSchema>;

const initialState: SendEmailFormState = {
  message: null,
  success: false,
};

export function EmailForm() {
  const [formState, dispatchSendEmailAction] = useActionState(sendEmailAction, initialState);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: '',
      subject: '',
      body: '',
      attachment: null,
    },
  });

  React.useEffect(() => {
    if (formState.message) {
      const toastDetails: { title: string; description: string; variant?: 'default' | 'destructive' } = {
        title: formState.success ? 'Success!' : 'Error',
        description: formState.message,
        variant: formState.success ? 'default' : 'destructive',
      };

      if (formState.success) {
        if (formState.details) { // Handle partial success details
          const details = formState.details as any;
          if (details.successful > 0 && details.failed > 0) {
            toastDetails.title = 'Partial Success';
            toastDetails.description = `${formState.message} Sent: ${details.successful}, Failed: ${details.failed}.`;
          }
        }
        form.reset();
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; 
        }
      }
      
      toast(toastDetails);
    }

    if (formState.errors) {
        if (formState.errors.recipients) form.setError("recipients", { type: "server", message: formState.errors.recipients.join(', ') });
        if (formState.errors.subject) form.setError("subject", { type: "server", message: formState.errors.subject.join(', ') });
        if (formState.errors.body) form.setError("body", { type: "server", message: formState.errors.body.join(', ') });
        // _form errors are handled by the main message toast
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);


  const onSubmit = (values: EmailFormValues) => {
    const formData = new FormData();
    formData.append('recipients', values.recipients);
    formData.append('subject', values.subject);
    formData.append('body', values.body);
    if (values.attachment && values.attachment.length > 0) {
      formData.append('attachment', values.attachment[0]);
    }

    startTransition(() => {
      dispatchSendEmailAction(formData);
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Compose Email</CardTitle>
        <CardDescription>
          Fill in the details below to send your email. Emails include a tracked link to a document.
          Sender&apos;s email is configured on the server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Tracking Information</AlertTitle>
          <AlertDescription>
            Emails sent via this form will include a link to a document. Access to this link by recipients will be logged (recipient email and time of access). No other personal information or passwords are ever collected.
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="recipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="recipients">Recipients</FormLabel>
                  <FormControl>
                    <Textarea
                      id="recipients"
                      placeholder={`user1@example.com\nuser2@example.com\nuser3@example.com`}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter recipient email addresses, one per line.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="subject">Subject</FormLabel>
                  <FormControl>
                    <Input id="subject" placeholder="Email Subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="body">Body</FormLabel>
                  <FormControl>
                    <Textarea
                      id="body"
                      placeholder="Write your email content here... A tracking link for a document will be appended."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="attachment"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel htmlFor="attachment" className="flex items-center">
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attachment (Optional)
                  </FormLabel>
                  <FormControl>
                     <Input 
                        id="attachment" 
                        type="file" 
                        {...rest}
                        ref={fileInputRef}
                        onChange={(event) => {
                            onChange(event.target.files);
                        }}
                        className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                     />
                  </FormControl>
                  <FormDescription>
                    Select a single file to attach (optional).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {formState.errors?._form && !formState.message && ( // Display _form error only if no general message toast shown
              <p className="text-sm font-medium text-destructive">{formState.errors._form.join(', ')}</p>
            )}

            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email(s)
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
