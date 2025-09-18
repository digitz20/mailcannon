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
  senderEmail: z.string().email("Invalid email address."),
  senderPassword: z.string().min(1, "Sender password is required."),
  senderDisplayName: z.string().optional(),
  recipients: z.string().min(1, "At least one recipient is required."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().optional(),
  linkUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  attachment: z.any().optional(),
});

type MailCannonFormValues = z.infer<typeof formSchema>;

const API_ROUTE = "/api/send-email";

const PDF_ICON_URL = "https://i.pinimg.com/1200x/37/a1/4e/37a14ee968a6a729725ba69e5c15de22.jpg";
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
    
    // Prepare email body as HTML
    let emailBody = '';

    if (values.linkUrl) {
      // Get recipient name from email if possible
      const recipientName = recipientList.length === 1 ? recipientList[0].split('@')[0] : 'there';
      // Use the fixed template
      emailBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="background-color: #ffffff; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${LOGO_URL}" alt="Company Logo" style="max-width: 150px; border-radius: 8px;">
            </div>
            <div style="font-size: 16px; line-height: 1.6;">
              <p>Dear ${recipientName},</p>
              <p>I am currently on vacation. I will be back at the publishing house in due time and will instruct you upon my arrival.</p>
              <p>Please find attached the pdf document of our last brief including names and shipment dates and deliveries.</p>
              <p>Best regards,<br>${values.senderDisplayName || 'The Team'}</p>
              <p style="font-size: 12px; color: #888;">${new Date().toDateString()}</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${values.linkUrl}" target="_blank" rel="noopener noreferrer">
                <img src="${PDF_ICON_URL}" alt="PDF Document" width="200" height="200" style="border:0;">
              </a>
            </div>
            <div style="text-align: center; font-size: 12px; color: #888; margin-top: 20px;">
              <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Use the standard body from the form
      emailBody = (values.body || '').replace(/\n/g, '<br>');
    }


    const formData = new FormData();
    formData.append('senderEmail', values.senderEmail);
    formData.append('senderPassword', values.senderPassword);
    formData.append('subject', values.subject);
    formData.append('body', emailBody); // Send the HTML body
    recipientList.forEach(email => formData.append('recipients', email));
    
    if (values.senderDisplayName) {
      formData.append('senderDisplayName', values.senderDisplayName);
    }
    
    if (values.attachment && values.attachment.length > 0) {
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

      toast({
        title: "Email(s) Sent!",
        description: `Successfully sent email to ${recipientList.length} recipient(s).`,
        className: "bg-green-500 text-white",
      });
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
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
          Fill in the details below to send your email. Provide sender credentials and display name for each send operation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="senderEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sender Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your-email@example.com" {...field} />
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
                    <FormLabel>Sender Password/App Passkey</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter sender password or app passkey"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FormDescription>
                     Use your email password or an app-specific password if 2FA is enabled.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
