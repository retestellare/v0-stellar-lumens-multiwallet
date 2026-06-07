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
  const { activeWallet, unlockWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showInput, setShowInput] = useState(false);

  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  // Show warning if wallet is not active
  if (!activeWallet) {
    return (
      <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
        <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-center">
          <p className="text-red-400 text-xs">No active wallet selected</p>
        </div>
      </div>
    );
  }

  // Show warning if wallet is unfunded
  if (activeWallet.status === 'unfunded') {
    return (
      <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
        <div className="bg-yellow-900/20 border border-yellow-900 rounded-lg p-3 text-center">
          <p className="text-yellow-400 text-xs">{activeWallet.statusMessage || 'This wallet is not activated on the Stellar network yet'}</p>
        </div>
      </div>
    );
  }

  // Show error if wallet status is error
  if (activeWallet.status === 'error') {
    return (
      <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
        <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-center">
          <p className="text-red-400 text-xs">{activeWallet.statusMessage || 'Error loading wallet'}</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (activeWallet.status === 'loading') {
    return (
      <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
        <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-3 text-center">
          <p className="text-blue-400 text-xs">Loading wallet...</p>
        </div>
      </div>
    );
  }

  const handleRemove = async () => {
    if (!password) {
      setError("Please enter your wallet password.");
      return;
    }

    if (!activeWallet || !activeWallet.publicKey) {
      setError("Active wallet data is missing.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Unlock wallet using context
      const userSecretKey = unlockWallet(activeWallet.id, password);

      if (!userSecretKey || !userSecretKey.startsWith('S')) {
        throw new Error("Invalid password.");
      }

      // Request unsigned transaction from backend
      const response = await fetch('/api/stellar/remove-trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetCode, assetIssuer, userPublicKey: activeWallet.publicKey }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to build transaction');

      // Rebuild transaction from XDR and sign it on client
      // @ts-ignore
      const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
      
      // Properly convert XDR string back to transaction object
      // @ts-ignore
      const tx = StellarSdk.TransactionBuilder.fromXDR(data.xdr, NetworksPassphrase);
      
      // @ts-ignore
      const keypair = StellarSdk.Keypair.fromSecret(userSecretKey);
      tx.sign(keypair);

      // Submit signed transaction to Horizon Mainnet
      // @ts-ignore
      const server = new StellarSdk.Horizon.Server("https://horizon.stellar.org");
      
      try {
        // @ts-ignore
        const result = await server.submitTransaction(tx);
        
        alert('Trustline removed successfully!');
        if (onSuccess) onSuccess();
        
        // Wait a moment before reloading to ensure transaction is processed
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (submitError: any) {
        const errorDetail = submitError.response?.data?.extras?.result_codes || submitError.message;
        throw new Error(`Transaction submission failed: ${JSON.stringify(errorDetail)}`);
      }
    } catch (err: any) {
      console.error("Remove trustline error:", err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
      {!showInput ? (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          🗑️ Remove Trustline
        </button>
      ) : (
        <div className="flex flex-col gap-2 bg-slate-900 p-3 rounded-lg border border-red-900">
          <label className="text-xs text-gray-400">Enter your Wallet Password to confirm:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wallet Password"
            className="w-full bg-black border border-gray-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            disabled={isLoading}
            autoComplete="off"
          />
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1.5 rounded"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded font-medium flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
