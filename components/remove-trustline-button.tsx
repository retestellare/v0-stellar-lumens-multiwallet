'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { removeTrustline } from '@/lib/stellar-utils';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  onSuccess?: () => void;
}

export function RemoveTrustlineButton({
  assetCode,
  assetIssuer,
  balance,
  onSuccess,
}: RemoveTrustlineButtonProps) {
  const { globalDecryptedSecret, activeWalletId, updateBalances } = useWallet();
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show button if balance is zero
  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  const handleRemoveTrustline = async () => {
    if (!globalDecryptedSecret) {
      setError('Wallet not connected. Please unlock your wallet first.');
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await removeTrustline(globalDecryptedSecret, assetCode, assetIssuer);

    if (result.success) {
      // Refresh balances so the token disappears from the list
      if (activeWalletId) {
        await updateBalances(activeWalletId);
      }
      setSuccess(true);
      setIsPending(false);
      // Give the user a moment to see the success state, then close
      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } else {
      setError(result.error || 'Failed to remove trustline');
      setIsPending(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={handleRemoveTrustline}
        disabled={isPending || success || !globalDecryptedSecret}
        className={`w-full px-4 py-2.5 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-white
          ${success
            ? 'bg-green-600 cursor-default'
            : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed'
          }`}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Removing...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Trustline Removed
          </>
        ) : (
          'Remove Trustline'
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
