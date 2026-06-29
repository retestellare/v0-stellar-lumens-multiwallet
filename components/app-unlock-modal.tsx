'use client';

import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { decryptSecret } from '@/lib/stellar-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * AppUnlockModal — shown once when the app starts and wallets exist
 * but no global decrypted secret is available yet.
 * Stores the result in WalletContext.globalDecryptedSecret so every
 * page/component can use it without asking again.
 */
export function AppUnlockModal() {
  const { wallets, activeWallet, activeWalletId, globalDecryptedSecret, setGlobalDecryptedSecret } = useWallet();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show only when: mounted, wallets exist, active wallet exists, and no secret unlocked yet
  const shouldShow =
    mounted &&
    wallets.length > 0 &&
    activeWallet !== null &&
    globalDecryptedSecret === null;

  const handleUnlock = async () => {
    if (!activeWallet || !password) return;

    setIsSubmitting(true);
    setError('');

    try {
      const secret = decryptSecret(activeWallet.encryptedSecret, password);
      setGlobalDecryptedSecret(secret);
      setPassword('');
    } catch {
      setError('Incorrect password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && password && !isSubmitting) {
      handleUnlock();
    }
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-7 space-y-6 animate-scale-in">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-glow">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Unlock Wallet</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Enter your password to access{' '}
              <span className="text-foreground font-semibold">{activeWallet?.name}</span>
            </p>
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="current-password"
            className="bg-input border-border h-12 text-sm px-4"
          />
          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}
        </div>

        {/* Confirm button */}
        <Button
          onClick={handleUnlock}
          disabled={!password || isSubmitting}
          className="w-full h-11 font-semibold text-sm"
        >
          {isSubmitting ? 'Unlocking...' : 'Unlock'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Your keys are encrypted locally and never leave your device.
        </p>
      </div>
    </div>
  );
}
