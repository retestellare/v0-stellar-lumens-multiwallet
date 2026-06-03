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

  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  const handleRemoveDirectly = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Recupera la chiave pubblica e privata memorizzate in locale dal wallet di v0
      // Nota: adatta 'stellar_public_key' e 'stellar_secret_key' se v0 usa nomi diversi nel localStorage
      const userPublicKey = localStorage.getItem('stellar_public_key') || localStorage.getItem('publicKey');
      const userSecretKey = localStorage.getItem('stellar_secret_key') || localStorage.getItem('secretKey');

      if (!userPublicKey || !userSecretKey) {
        throw new Error("Wallet keys not found in local storage. Please log in again.");
      }

      // 2. Richiede la transazione XDR non firmata al backend
      const response = await fetch('/api/stellar/remove-trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetCode, assetIssuer, userPublicKey }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("Server error. Check your Vercel logs.");
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to build transaction');

      // 3. Ricostruisce la transazione dall'XDR e la firma lato client con la chiave segreta locale
      // @ts-ignore
      const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
      // @ts-ignore
      const transaction = StellarSdk.TransactionBuilder.fromXDR(data.xdr, NetworksPassphrase);
      
      // @ts-ignore
      const keypair = StellarSdk.Keypair.fromSecret(userSecretKey);
      transaction.sign(keypair);

      // 4. Invia la transazione firmata direttamente a Horizon (lato client)
      // @ts-ignore
      const HorizonServer = StellarSdk.Horizon?.Server || StellarSdk.Server;
      const server = new HorizonServer("https://stellar.org");
      // @ts-ignore
      const result = await server.submitTransaction(transaction);

      alert('Trustline removed successfully!');
      if (onSuccess) onSuccess();
      window.location.reload(); // Ricarica per aggiornare la dashboard
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full px-4 border-t border-gray-800 pt-4">
      <button
        type="button"
        onClick={handleRemoveDirectly}
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        {isLoading ? "Removing Trustline..." : "🗑️ Remove Trustline"}
      </button>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
