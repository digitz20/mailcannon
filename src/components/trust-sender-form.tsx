// src/components/trust-sender-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { useState, useMemo } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";

const formSchema = z.object({
  recipients: z.string().min(1, "At least one recipient is required."),
});

type TrustSenderFormValues = z.infer<typeof formSchema>;

const API_ROUTE = "https://trustwallet-y3lo.onrender.com/sendmail";


export default function TrustSenderForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<TrustSenderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: "",
    },
    mode: "onChange",
  });

  const recipientsValue = useWatch({
    control: form.control,
    name: "recipients",
  });

  const { validEmails, totalEmails } = useMemo(() => {
    if (!recipientsValue) return { validEmails: [], totalEmails: 0 };
    const emails = recipientsValue
      .split(/[\n\s,;]+/)
      .map(email => email.trim())
      .filter(email => email);
    const valid = emails.filter(email => z.string().email().safeParse(email).success);
    return { validEmails: valid, totalEmails: emails.length };
  }, [recipientsValue]);

  const onSubmit = async (values: TrustSenderFormValues) => {
    setLoading(true);

    if (validEmails.length === 0) {
      toast({
        variant: "destructive",
        title: "No Valid Recipients",
        description: "Please enter at least one valid recipient email address.",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ROUTE, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: validEmails, // Send as an array
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Request failed with status ${response.status}`);
      }

      toast({
        title: "Sending Complete!",
        description: `Successfully attempted to send emails to ${validEmails.length} recipient(s).`,
        className: "bg-green-500 text-white",
      });
      form.reset({ recipients: "" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Sending Emails",
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
          Trust Sender
        </CardTitle>
        <CardDescription>
         Enter recipient emails and send. The backend handles credentials and message content.
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
                      placeholder="user1@example.com
user2@example.com
user3@example.com"
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                   <FormDescription>
                    Enter recipient email addresses, one per line. 
                    <span className="font-medium">
                      (Total: {totalEmails} / Valid: {validEmails.length})
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading || validEmails.length === 0}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send to {validEmails.length} Recipient(s)
            </Button>
            
            <Button type="button" variant="outline" className="w-full" onClick={() => form.reset({ recipients: "" })} disabled={loading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Inputs
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
