// src/components/header.tsx
import { Rocket } from 'lucide-react';

export default function Header() {
  return (
    <header className="mb-8 text-center">
      <div className="inline-flex items-center justify-center gap-3 rounded-lg bg-card p-4 shadow-md">
        <Rocket size={48} className="text-primary" />
        <h1 className="text-5xl font-bold text-primary">
          MailCannon
        </h1>
      </div>
      <p className="text-muted-foreground mt-3 text-lg">
        Fire off your emails with precision and ease.
      </p>
    </header>
  );
}
