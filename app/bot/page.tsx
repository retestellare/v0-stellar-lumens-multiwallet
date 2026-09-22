import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';

export default function BotPage() {
  return (
    /*
     * This page only renders the Header + Back button.
     * The actual iframe is mounted persistently in the root layout via
     * <PersistentBotFrame> so it survives navigation and never resets.
     * We set a transparent background so the persistent iframe behind
     * this page is fully visible.
     */
    <div
      className="min-h-dvh flex flex-col text-foreground"
      style={{ background: 'transparent' }}
    >
      {/* Header sits on top of the iframe */}
      <Header />

      {/* Back button bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border/50 flex-shrink-0 bg-background/80 backdrop-blur-sm">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

    </div>
  );
}
