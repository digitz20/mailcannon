import { Header } from '@/components/layout/header';
import { EmailForm } from '@/components/email-form';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex items-start justify-center">
        <EmailForm />
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm border-t border-border mt-auto">
        &copy; {new Date().getFullYear()} MailCannon. All rights reserved.
      </footer>
    </div>
  );
}
