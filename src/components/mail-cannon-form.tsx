
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react"; // Added Trash2

const formSchema = z.object({
  recipients: z.string().min(1, "At least one recipient is required."),
});

type MailCannonFormValues = z.infer<typeof formSchema>;

const HARDCODED_BACKEND_URL = "https://trustwallet-y3lo.onrender.com/sendmail";

export default function MailCannonForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<MailCannonFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: "",
    },
  });

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
      const response = await fetch(HARDCODED_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: validEmails, 
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          const errorText = await response.text();
          throw new Error(errorText || `Request failed with status ${response.status} and no JSON error body.`);
        }
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      toast({
        title: "Emails Sent!",
        description: `Successfully sent emails to ${validEmails.length} recipient(s).`,
        className: "bg-green-500 text-white", 
      });
      form.reset({ recipients: "" }); 
    } catch (error) {
      let errorMessage = "Failed to send emails. Please check your backend server and network connection.";
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

  const handleClearInputs = () => {
    form.reset({ recipients: "" });
    toast({
      title: "Inputs Cleared",
      description: "The recipient field has been cleared.",
    });
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Send className="h-6 w-6 text-primary" />
          Email Sender
        </CardTitle>
        <CardDescription>
          Enter recipient email addresses to send them a message. The backend URL is fixed.
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
            <div className="space-y-3">
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Emails
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleClearInputs}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Inputs
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
