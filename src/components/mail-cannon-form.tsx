
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
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useState, useEffect } from "react";
import { Loader2, Send, Settings2 } from "lucide-react";

const formSchema = z.object({
  recipients: z.string().min(1, "At least one recipient is required."),
  backendUrl: z.string().url("Invalid URL format.").min(1, "Backend URL is required."),
});

type MailCannonFormValues = z.infer<typeof formSchema>;

const DEFAULT_BACKEND_URL = "https://trustwallet-y3lo.onrender.com/sendemail";

export default function MailCannonForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [backendUrl, setBackendUrl, backendUrlHydrated] = usePersistedState<string>(
    "mailCannonBackendUrl",
    DEFAULT_BACKEND_URL // Use the default URL here
  );

  const form = useForm<MailCannonFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: "",
      backendUrl: "", // Initial value, will be updated by useEffect
    },
  });

  useEffect(() => {
    if (backendUrlHydrated) {
      // If backendUrl from localStorage is empty or not a valid URL (e.g. old data), set to default.
      // Otherwise, use the one from localStorage.
      const urlToSet = backendUrl && z.string().url().safeParse(backendUrl).success ? backendUrl : DEFAULT_BACKEND_URL;
      form.setValue("backendUrl", urlToSet, { shouldValidate: true });
      if (backendUrl !== urlToSet) { // If we had to fall back to default, update persisted state
        setBackendUrl(urlToSet);
      }
    }
  }, [backendUrl, backendUrlHydrated, form, setBackendUrl]);

  const handleBackendUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    form.setValue("backendUrl", newValue, { shouldValidate: true }); // Update RHF state
    setBackendUrl(newValue); // Update persisted state
  };

  async function onSubmit(values: MailCannonFormValues) {
    setLoading(true);

    const rawEmails = values.recipients
      .split(/[\s,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e);
    
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    rawEmails.forEach(email => {
      if (z.string().email().safeParse(email).success) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    });

    if (invalidEmails.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid Email Addresses",
        description: `The following emails are invalid and were not included: ${invalidEmails.join(", ")}. Please correct them.`,
      });
    }

    if (validEmails.length === 0) {
      toast({
        variant: "destructive",
        title: "No Valid Recipients",
        description: "Please provide at least one valid email address.",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(values.backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: validEmails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      toast({
        title: "Emails Sent!",
        description: `Successfully sent emails to ${validEmails.length} recipient(s).`,
        className: "bg-green-500 text-white", 
      });
      form.reset({ ...values, recipients: "" }); // Clear recipients, keep backendUrl
    } catch (error) {
      let errorMessage = "Failed to send emails. Please check your backend server and URL.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: "destructive",
        title: "Error Sending Emails",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Send className="h-6 w-6 text-primary" />
          Email Sender
        </CardTitle>
        <CardDescription>
          Enter recipient emails and your backend URL to send emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="recipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipients</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter email addresses, separated by commas, spaces, or newlines..."
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Separate multiple email addresses with commas, spaces, or new lines.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="backendUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                     <Settings2 className="h-4 w-4 text-muted-foreground" /> Backend URL Configuration
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={DEFAULT_BACKEND_URL}
                      {...field} 
                      value={backendUrlHydrated ? field.value : "Loading..."} 
                      onChange={handleBackendUrlChange}
                      disabled={!backendUrlHydrated}
                    />
                  </FormControl>
                  <FormDescription>
                    This URL is used to send your emails and is saved locally for future sessions.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading || !backendUrlHydrated}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Emails
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
