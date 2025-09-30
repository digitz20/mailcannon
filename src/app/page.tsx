import MailCannonForm from "@/components/mail-cannon-form";
import BulkSenderForm from "@/components/bulk-sender-form";
import Header from "@/components/header";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen py-8 px-4 bg-background">
      <Header />
      <main className="w-full max-w-2xl mt-8">
        <BulkSenderForm />
        <Separator className="my-12" />
        <MailCannonForm />
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Mail Sender. All rights reserved.</p>
      </footer>
    </div>
  );
}
