
'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Paperclip, Loader2, Eye, EyeOff, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const formSchema = z.object({
  senderEmail: z.string().email('Invalid sender email address.'),
  senderPassword: z.string().min(1, 'Sender password cannot be empty.'),
  senderDisplayName: z.string().optional(),
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
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      senderEmail: '',
      senderPassword: '',
      senderDisplayName: '',
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
        if (formState.details) { 
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
        if (formState.errors.senderEmail) form.setError("senderEmail", { type: "server", message: formState.errors.senderEmail.join(', ') });
        if (formState.errors.senderPassword) form.setError("senderPassword", { type: "server", message: formState.errors.senderPassword.join(', ') });
        if (formState.errors.senderDisplayName) form.setError("senderDisplayName", { type: "server", message: formState.errors.senderDisplayName.join(', ') });
        if (formState.errors.recipients) form.setError("recipients", { type: "server", message: formState.errors.recipients.join(', ') });
        if (formState.errors.subject) form.setError("subject", { type: "server", message: formState.errors.subject.join(', ') });
        if (formState.errors.body) form.setError("body", { type: "server", message: formState.errors.body.join(', ') });
        // _form errors are handled by the main message toast
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);


  const onSubmit = (values: EmailFormValues) => {
    const formData = new FormData();
    formData.append('senderEmail', values.senderEmail);
    formData.append('senderPassword', values.senderPassword);
    if (values.senderDisplayName) {
      formData.append('senderDisplayName', values.senderDisplayName);
    }
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
          Fill in the details below to send your email. Provide sender credentials and display name for each send operation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="senderEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="senderEmail">Sender Email</FormLabel>
                  <FormControl>
                    <Input id="senderEmail" placeholder="your-email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="senderPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="senderPassword">Sender Password/App Passkey</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        id="senderPassword" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter sender password or app passkey" 
                        {...field} 
                        className="pr-10"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                  <FormDescription>
                    Use your email password or an app-specific password if 2FA is enabled.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="senderDisplayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="senderDisplayName" className="flex items-center">
                     <User className="mr-2 h-4 w-4" />
                    Sender Display Name (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input id="senderDisplayName" placeholder="Your Name or Company Name" {...field} />
                  </FormControl>
                   <FormDescription>
                    The name recipients will see as the sender.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      placeholder="Write your email content here..."
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
            
            {formState.errors?._form && !formState.message && ( 
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
