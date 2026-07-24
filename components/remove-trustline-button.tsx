"use client";

import React, { useState } from 'react';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { removeTrustline } from '@/lib/stellar-utils';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
  onRemoved?: () => void;
}

export function RemoveTrustlineButton({
  assetCode,
  assetIssuer,
  balance,
  onRemoved,
}: RemoveTrustlineButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeWallet, activeWalletId, globalDecryptedSecret, updateBalances } = useWallet();

  // Native XLM has no issuer and can never have its trustline removed.
  if (!assetIssuer || assetCode === 'XLM') return null;

  // Stellar only allows removing a trustline when the balance is exactly zero.
  const numericBalance = Number.parseFloat(balance);
  if (!Number.isFinite(numericBalance) || numericBalance !== 0) return null;

  const isLocked = !activeWallet || !globalDecryptedSecret;

  const handleRemove = async () => {
    if (isLocked) {
      setError('Wallet is locked. Please unlock your wallet first.');
      setConfirming(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await removeTrustline(globalDecryptedSecret, assetCode, assetIssuer);

      if (!result.success) {
        setError(result.error || 'Failed to remove trustline.');
        setConfirming(false);
        return;
      }

      // Refresh balances in place from Horizon so the asset disappears from the
      // list and the stale copy in localStorage is overwritten. Previously this
      // did a full window.location.reload(), which wiped the in-memory
      // decrypted secret (forcing the unlock screen) and rehydrated the stale
      // asset list from localStorage, making it look like nothing was removed.
      const walletKey = activeWalletId || activeWallet.id;
      if (walletKey) {
        await updateBalances(walletKey);
      }

      onRemoved?.();
    } catch (err: any) {
      setError(err?.message || 'Unexpected error while removing the trustline.');
      setConfirming(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full border-t border-border pt-4">
      {confirming ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-foreground">
              {`Remove the ${assetCode} trustline? This asset will disappear from your wallet. You can add it back later.`}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Removing...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={isLoading || isLocked}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-transparent px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove Trustline
        </button>
      )}

      {isLocked && !confirming && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Unlock your wallet to remove this asset.
        </p>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
