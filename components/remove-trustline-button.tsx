"use client";

import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  onSuccess?: () => void;
}

export function RemoveTrustlineButton({ assetCode, assetIssuer, balance, onSuccess }: RemoveTrustlineButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showInput, setShowInput] = useState(false);

  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  const handleRemove = async () => {
    if (!password) {
      setError("Please enter your wallet password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Recupera l'array dei wallet salvati da v0
      const storedWallets = localStorage.getItem('stellar_wallets');
      if (!storedWallets) throw new Error("No wallets found. Please log in.");
      
      const wallets = JSON.parse(storedWallets);
      
      // Estrae in modo sicuro il primo elemento se è un array, altrimenti usa l'oggetto diretto
      const activeWallet = Array.isArray(wallets) ? wallets[0] : wallets; 
      
      if (!activeWallet || !activeWallet.publicKey || !activeWallet.encryptedSecret) {
        throw new Error("Active wallet data is missing.");
      }

      // 2. Decripta la chiave segreta usando la password dell'utente.
      // Sfruttiamo il decryptSecret iniettato globalmente o recuperato dalla libreria nativa.
      let userSecretKey: string = "";
      try {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.decryptSecret) {
          // @ts-ignore
          userSecretKey = window.decryptSecret(activeWallet.encryptedSecret, password);
        } else {
          // Fallback dinamico se la funzione non è globale
          const utils = require('@/lib/stellar-utils');
          userSecretKey = utils.decryptSecret(activeWallet.encryptedSecret, password);
        }

        if (!userSecretKey || !userSecretKey.startsWith('S')) {
          throw new Error("Invalid password.");
        }
      } catch (e) {
        throw new Error("Incorrect password. Verification failed.");
      }

      // 3. Richiede la transazione XDR non firmata al backend
      const response = await fetch('/api/stellar/remove-trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetCode, assetIssuer, userPublicKey: activeWallet.publicKey }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to build transaction');

      // 4. Ricostruisce la transazione dall'XDR e la firma sul client
      // @ts-ignore
      const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
      
      // Properly convert XDR string back to transaction object
      // TransactionBuilder.fromXDR returns a Transaction object directly
      // @ts-ignore
      const tx = StellarSdk.TransactionBuilder.fromXDR(data.xdr, NetworksPassphrase);
      
      // Verify the transaction object is valid before signing
      if (!tx || typeof tx.sign !== 'function') {
        throw new Error('Failed to reconstruct transaction from XDR');
      }
      
      // @ts-ignore
      const keypair = StellarSdk.Keypair.fromSecret(userSecretKey);
      tx.sign(keypair);

      // 5. Invia la transazione firmata alla Mainnet di Horizon
      // @ts-ignore
      const server = new StellarSdk.Horizon.Server("https://horizon.stellar.org");
      
      console.log('[v0] Submitting signed trustline removal transaction');
      
      try {
        // @ts-ignore
        const result = await server.submitTransaction(tx);
        
        console.log('[v0] Transaction successful:', result.id);
        alert('Trustline removed successfully!');
        if (onSuccess) onSuccess();
        
        // Wait a moment before reloading to ensure transaction is processed
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (submitError: any) {
        console.error('[v0] Transaction submission error:', submitError);
        
        // Extract detailed error information
        let errorDetail = 'Unknown error';
        if (submitError.response?.data?.extras?.result_codes) {
          errorDetail = JSON.stringify(submitError.response.data.extras.result_codes);
        } else if (submitError.response?.data?.extras) {
          errorDetail = JSON.stringify(submitError.response.data.extras);
        } else if (submitError.response?.data?.title) {
          errorDetail = submitError.response.data.title;
        } else if (submitError.message) {
          errorDetail = submitError.message;
        }
        
        throw new Error(`Transaction submission failed: ${errorDetail}`);
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
            autoComplete="current-password"
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
