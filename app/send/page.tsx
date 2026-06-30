'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/lib/wallet-context';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SendPage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [asset, setAsset] = useState('XLM');

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

  const handleSend = async () => {
    // Transaction signing would happen here
    console.log('[v0] Send transaction:', { recipient, amount, memo, asset });
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Send Payment</h1>
            <p className="text-muted-foreground text-sm">From {activeWallet.name}</p>
          </div>

          {/* Form */}
          <div className="glow-border p-6 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Recipient Address</label>
              <Input
                placeholder="G..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Asset</label>
                <Input
                  placeholder="XLM"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value.toUpperCase())}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Memo (Optional)</label>
              <Input
                placeholder="Payment reference"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!recipient || !amount}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Send
            </Button>
          </div>

          {/* Info */}
          <div className="p-4 border border-border/50 rounded text-xs text-muted-foreground space-y-2">
            <p>⚠️ This feature requires transaction signing. Full implementation coming soon.</p>
            <p>Your wallet will remain non-custodial with all operations signed locally.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
