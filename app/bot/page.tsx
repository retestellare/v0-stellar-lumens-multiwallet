'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';

export default function BotPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex flex-col w-full flex-1">
        {/* Back Button */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border/50 flex-shrink-0">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Trading Console - Full Height Scrollable iframe */}
        <div className="w-full overflow-y-auto">
          <iframe
            src="https://lumenspread-bot-ok.base44.app"
            title="Trading Console"
            className="w-full border-0"
            style={{ 
              display: 'block',
              minHeight: 'calc(100vh - 140px)',
              height: 'auto'
            }}
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; magnetometer; microphone; payment; usb"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          />
        </div>
      </main>
    </div>
  );
}
