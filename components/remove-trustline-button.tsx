"use client";

import React, { useState } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { removeTrustline } from '@/lib/stellar-utils';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  onSuccess?: () => void;
}

export function RemoveTrustlineButton({ assetCode, assetIssuer, balance, onSuccess }: RemoveTrustlineButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeWallet, globalDecryptedSecret } = useWallet();

  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  const handleRemove = async () => {
    if (!activeWallet || !globalDecryptedSecret) {
      setError('Wallet not unlocked. Please unlock your wallet first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await removeTrustline(globalDecryptedSecret, assetCode, assetIssuer);

    if (result.success) {
      alert(`Trustline for ${assetCode} removed successfully!`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setError(`Failed to remove trustline: ${result.error}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
      <button
        type="button"
        onClick={handleRemove}
        disabled={isLoading || !activeWallet || !globalDecryptedSecret}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">&#x21BB;</span>
            Removing Trustline...
          </>
        ) : (
          'Remove Trustline'
        )}
      </button>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
