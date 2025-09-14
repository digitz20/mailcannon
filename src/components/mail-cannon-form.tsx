
// src/components/mail-cannon-form.tsx
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
  body: z.string().min(1, "Email body is required."),
  attachment: z.any().optional(),
});

type MailCannonFormValues = z.infer<typeof formSchema>;

const BACKEND_URL = "https://trustwallet-y3lo.onrender.com/sendmail";

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

    const formData = new FormData();
    formData.append('senderEmail', values.senderEmail);
    formData.append('senderPassword', values.senderPassword);
    formData.append('subject', values.subject);
    formData.append('body', values.body);
    recipientList.forEach(email => formData.append('recipients', email));
    
    if (values.senderDisplayName) {
      formData.append('senderDisplayName', values.senderDisplayName);
    }
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      formData.append('attachment', fileInput.files[0]);
    }
    
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        let errorText = `Request failed with status ${response.status}`;
        try {
          errorData = await response.json();
          if (errorData && errorData.message) {
            errorText = errorData.message;
          } else {
             const textResponse = await response.text();
             errorText = textResponse || errorText;
          }
        } catch (jsonError) {
           try {
            const textResponse = await response.text();
            errorText = textResponse || errorText;
          } catch (textError) {
            // Keep the original status code error
          }
        }
        throw new Error(errorText);
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
          Compose Email
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
              name="attachment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attachment (Optional)</FormLabel>
                  <FormControl>
                    <Input type="file" onChange={(e) => field.onChange(e.target.files)} />
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
