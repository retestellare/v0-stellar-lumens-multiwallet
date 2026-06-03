"use client";

import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
// Importa la funzione di decrittazione nativa del tuo progetto
// @ts-ignore
import { decryptSecret } from '@/lib/stellar-utils';

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
      // 1. Recupera la lista dei wallet salvati da v0
      const storedWallets = localStorage.getItem('stellar_wallets');
      if (!storedWallets) throw new Error("No wallets found. Please log in.");
      
      const wallets = JSON.parse(storedWallets);
      // Prende il primo wallet attivo (o quello correntemente selezionato)
      const activeWallet = wallets[0]; 
      
      if (!activeWallet || !activeWallet.publicKey || !activeWallet.encryptedSecret) {
        throw new Error("Active wallet data is missing.");
      }

      // 2. Decripta la chiave segreta usando la password dell'utente e la funzione nativa
      let userSecretKey: string;
      try {
        userSecretKey = decryptSecret(activeWallet.encryptedSecret, password);
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

      // 4. Ricostruisce la transazione e la firma sul client con la chiave decrittata
      // @ts-ignore
      const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
      // @ts-ignore
      const transaction = StellarSdk.TransactionBuilder.fromXDR(data.xdr, NetworksPassphrase);
      
      // @ts-ignore
      const keypair = StellarSdk.Keypair.fromSecret(userSecretKey);
      transaction.sign(keypair);

      // 5. Invia la transazione firmata a Horizon
      // @ts-ignore
      const HorizonServer = StellarSdk.Horizon?.Server || StellarSdk.Server;
      const server = new HorizonServer("https://stellar.org");
      // @ts-ignore
      const result = await server.submitTransaction(transaction);

      alert('Trustline removed successfully!');
      if (onSuccess) onSuccess();
      window.location.reload(); 
    } catch (err: any) {
      console.error(err);
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
