"use client";

import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { useWallet } from '@/lib/wallet-context';

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
      setError("Wallet not unlocked. Please unlock your wallet first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[v0] Starting trustline removal for', assetCode, 'from', activeWallet.publicKey);

      // 1. Request unsigned transaction XDR from backend
      const response = await fetch('/api/stellar/remove-trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetCode, assetIssuer, userPublicKey: activeWallet.publicKey }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to build transaction');

      console.log('[v0] Transaction XDR received');

      // 2. Reconstruct transaction from XDR and sign it client-side
      // @ts-ignore
      const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
      
      // Transaction.fromXDR returns a Transaction object (not TransactionBuilder)
      // @ts-ignore
      const tx = StellarSdk.Transaction.fromXDR(data.xdr, NetworksPassphrase);
      
      if (!tx || typeof tx.sign !== 'function') {
        throw new Error('Failed to reconstruct transaction from XDR');
      }
      
      // @ts-ignore
      const keypair = StellarSdk.Keypair.fromSecret(globalDecryptedSecret);
      tx.sign(keypair);

      console.log('[v0] Transaction signed');

      // 3. Submit signed transaction to Horizon
      // @ts-ignore
      const server = new StellarSdk.Horizon.Server("https://horizon.stellar.org");
      
      console.log('[v0] Submitting signed trustline removal transaction');
      
      // @ts-ignore
      const result = await server.submitTransaction(tx);
      
      console.log('[v0] Trustline removal transaction successful:', result);
      
      // Only show success if transaction was actually submitted (has hash/id)
      if (result && (result.hash || result.id)) {
        alert(`Trustline for ${assetCode} removed successfully!`);
        
        if (onSuccess) onSuccess();
        
        // Wait a moment before reloading to ensure transaction is processed on-chain
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('Transaction submitted but no confirmation received');
      }
    } catch (err: any) {
      console.error('[v0] Remove trustline error:', err);
      
      // Extract detailed error information from Horizon
      let errorDetail = 'Unknown error';
      if (err.response?.data?.extras?.result_codes) {
        errorDetail = JSON.stringify(err.response.data.extras.result_codes);
      } else if (err.response?.data?.extras) {
        errorDetail = JSON.stringify(err.response.data.extras);
      } else if (err.response?.data?.title) {
        errorDetail = err.response.data.title;
      } else if (err.message) {
        errorDetail = err.message;
      }
      
      const finalError = `Failed to remove trustline: ${errorDetail}`;
      setError(finalError);
    } finally {
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
            <span className="animate-spin">⟳</span>
            Removing Trustline...
          </>
        ) : (
          <>
            🗑️ Remove Trustline
          </>
        )}
      </button>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
