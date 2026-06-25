'use client';

import { Header } from '@/components/header';
import { SwapPanel } from '@/components/swap-panel';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SwapPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Token Swap
            </h1>
            <p className="text-muted-foreground">
              Swap tokens using the best available path across Stellar DEX and liquidity pools. Get real-time price quotes and execute swaps with optimal routing.
            </p>
          </div>

          {/* Swap Interface */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <div className="p-6 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm">
                <SwapPanel />
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-4 rounded-lg border border-border/30 bg-card/30">
              <h3 className="font-semibold text-foreground mb-2">Best Path Algorithm</h3>
              <p className="text-sm text-muted-foreground">
                Uses Stellar's PathPaymentStrictSend to find the optimal trading route across all available liquidity sources.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border/30 bg-card/30">
              <h3 className="font-semibold text-foreground mb-2">Transparent Pricing</h3>
              <p className="text-sm text-muted-foreground">
                See your price impact and exact amount received before confirming. Slippage protection with customizable tolerance levels.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border/30 bg-card/30">
              <h3 className="font-semibold text-foreground mb-2">Multi-Token Support</h3>
              <p className="text-sm text-muted-foreground">
                Swap between any tokens on the Stellar network, including assets from DEX order books and AMM liquidity pools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
