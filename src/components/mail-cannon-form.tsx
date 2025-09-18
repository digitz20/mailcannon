
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Send, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  senderEmail: z.string().email("Please enter a valid email address."),
  senderPassword: z.string().min(1, "Password/App Passkey is required."),
  senderDisplayName: z.string().optional(),
  recipients: z.string().min(1, "At least one recipient is required."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().optional(),
  linkUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  attachment: z.any().optional(),
});

type MailCannonFormValues = z.infer<typeof formSchema>;

const API_ROUTE = "/api/send-email";

const PDF_ICON_URL = "https://cdn.icon-icons.com/icons2/2107/PNG/512/file_type_pdf_icon_130274.png";
const LOGO_URL = "https://i.pinimg.com/1200x/e2/47/08/e247084e32ebc0b6e34262cd37c59fb3.jpg";


export default function MailCannonForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<MailCannonFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      senderEmail: "",
      senderPassword: "",
      senderDisplayName: "",
      recipients: "",
      subject: "",
      body: "",
      linkUrl: "",
      attachment: undefined,
    },
  });

  const onSubmit = async (values: MailCannonFormValues) => {
    setLoading(true);

    const recipientList = values.recipients
      .split(/[\n\s,;]+/)
      .map(email => email.trim())
      .filter(email => z.string().email().safeParse(email).success);

    if (recipientList.length === 0) {
      toast({
        variant: "destructive",
        title: "No Valid Recipients",
        description: "Please enter at least one valid recipient email address.",
      });
      setLoading(false);
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    let lastErrorMessage = "";
    
    const useLinkTemplate = !!values.linkUrl;

    await Promise.all(recipientList.map(async (recipientEmail) => {
        let emailBody = '';
        const recipientName = recipientEmail.split('@')[0];
        const senderName = values.senderDisplayName || 'The Sender';
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });


        if (useLinkTemplate) {
            emailBody = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: center;">
                    <img src="${LOGO_URL}" alt="Company Logo" width="150" style="border:0; max-width: 100%; margin-bottom: 20px;">
                    <div style="text-align: left;">
                        <p>Dear ${recipientName},</p>
                        <p>I am currently on vacation. I will be back at the publishing house in due time and will instruct you upon my arrival.</p>
                        <p>Please find attached the PDF document of our last brief, including names and shipment dates and deliveries.</p>
                        <div style="margin: 20px 0; text-align: center;">
                            <a href="${values.linkUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
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
            emailBody = (values.body || '').replace(/\n/g, '<br>');
        }

        const formData = new FormData();
        formData.append('senderEmail', values.senderEmail);
        formData.append('senderPassword', values.senderPassword);
        formData.append('subject', values.subject);
        formData.append('body', emailBody);
        formData.append('recipients', recipientEmail); // Send one recipient at a time

        if (values.senderDisplayName) {
            formData.append('senderDisplayName', values.senderDisplayName);
        }

        if (!useLinkTemplate && values.attachment && values.attachment.length > 0) {
            formData.append('attachment', values.attachment[0]);
        }
        
        try {
            const response = await fetch(API_ROUTE, {
                method: "POST",
                body: formData,
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || `Request failed with status ${response.status}`);
            }
            successCount++;
        } catch (error) {
            errorCount++;
            lastErrorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        }
    }));
    
    setLoading(false);

    if (successCount > 0) {
      toast({
        title: "Email(s) Sent!",
        description: `Successfully sent email to ${successCount} of ${recipientList.length} recipient(s).`,
        className: "bg-green-500 text-white",
      });
    }

    if (errorCount > 0) {
       toast({
        variant: "destructive",
        title: "Some Emails Failed",
        description: `Failed to send to ${errorCount} recipient(s). Last error: ${lastErrorMessage}`,
      });
    }

    if (errorCount === 0) {
      form.reset();
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Send className="h-6 w-6 text-primary" />
          MailCannon
        </CardTitle>
        <CardDescription>
          Fill in the details below to send your email. For services like Gmail, an "App Password" may be required instead of your regular password.
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
                  <FormLabel>Sender Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@your-email.com" {...field} />
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
                  <FormLabel>Sender Password / App Passkey</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••" 
                        {...field}
                        className="pr-10"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </button>
                  </div>
                  <FormDescription>
                    For providers like Gmail, use an "App Password" if 2FA is enabled.
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
                  <FormLabel>Sender Display Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name or Company Name" {...field} />
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
                  <FormLabel>Recipients</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="user1@example.com\nuser2@example.com\nuser3@example.com"
                      className="min-h-[100px] resize-y"
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
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email Subject" {...field} />
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
                  <FormLabel>Body (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your email content here..."
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be ignored if you provide a "Link URL".
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/your-file.pdf" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will add a clickable PDF icon to a templated email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="attachment"
              render={({ field: { onChange, value, ...props } }) => (
                <FormItem>
                  <FormLabel>Attachment (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      onChange={(e) => {
                        onChange(e.target.files);
                      }}
                      {...props}
                    />
                  </FormControl>
                  <FormDescription>
                    Select a single file to attach (optional). This will be ignored if you provide a "Link URL".
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Email(s)
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
