'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';
import { useState, useEffect } from 'react';
import { ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';

export default function ReceivePage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  if (!activeWallet) {
    return (
      <main className="min-h-dvh bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-muted-foreground">No active wallet selected</p>
        </div>
      </main>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeWallet.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-dvh bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="glow-border p-6 rounded-lg">
            <h1 className="text-3xl font-bold text-foreground mb-2">Receive Payment</h1>
            <p className="text-muted-foreground text-sm">To {activeWallet.name}</p>
          </div>

          {/* QR Code Placeholder */}
          <div className="glow-border p-8 rounded-lg flex flex-col items-center justify-center aspect-square bg-background/30">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">QR Code</p>
              <div className="w-48 h-48 border-2 border-dashed border-border rounded flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Coming Soon</p>
              </div>
            </div>
          </div>

          {/* Public Key */}
          <div className="glow-border p-6 rounded-lg space-y-3">
            <label className="block text-sm font-medium text-muted-foreground">Your Public Address</label>
            <div className="space-y-2">
              <div className="bg-background/30 p-3 rounded border border-border/50 break-all">
                <code className="text-xs text-foreground font-mono">{activeWallet.publicKey}</code>
              </div>
              <Button
                onClick={handleCopy}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Address'}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 border border-border/50 rounded space-y-2">
            <p className="text-xs font-medium text-muted-foreground">How to receive payments:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Share your public address with the sender</li>
              <li>They send XLM or other Stellar assets to your address</li>
              <li>Your balance will update automatically</li>
            </ol>
          </div>

          {/* Assets Accepted */}
          <div className="glow-border p-6 rounded-lg space-y-3">
            <h3 className="font-medium text-foreground">Assets You Can Receive</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-background/30 rounded border border-border/50">
                <span className="text-sm text-foreground">XLM (Stellar Lumens)</span>
                <span className="text-xs text-primary font-semibold">Native</span>
              </div>
              <p className="text-xs text-muted-foreground">
                To receive other assets, you may need to establish a trust line with the asset issuer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
