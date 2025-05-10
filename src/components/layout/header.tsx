import { Mail } from 'lucide-react';

export function Header() {
  return (
    <header className="py-6 mb-8 border-b border-border">
      <div className="container mx-auto flex items-center justify-center sm:justify-start">
        <Mail className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">MailCannon</h1>
      </div>
    </header>
  );
}
