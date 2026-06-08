'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import { TradingBotPanel } from '@/components/trading-bot-panel';
import { Button } from '@/components/ui/button';

export default function BotPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="w-full max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Trading Bot Panel - Full Page */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Trading Bot
            </h1>
            <p className="text-muted-foreground">
              Configure and monitor your automated trading bot for Stellar assets.
            </p>
          </div>

          {/* Bot Panel */}
          <TradingBotPanel />
        </div>
      </main>
    </div>
  );
}
