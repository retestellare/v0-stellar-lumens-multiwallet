"use client";

import React, { useState } from 'react';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  onSuccess?: () => void;
}

export function RemoveTrustlineButton({ assetCode, assetIssuer, balance, onSuccess }: RemoveTrustlineButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Mostra il componente solo se il saldo è effettivamente zero
  const isBalanceZero = parseFloat(balance) === 0;

  if (!isBalanceZero) return null;

  const handleRemove = async () => {
    if (!secretKey) {
      setError("Inserisci la tua chiave privata per firmare.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stellar/remove-trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetCode, assetIssuer, userSecretKey: secretKey }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Errore durante la rimozione');

      alert('Trustline rimossa con successo!');
      if (onSuccess) onSuccess();
      setShowInput(false);
      setSecretKey('');
    } catch (err: any) {
      setError(err.message || 'Errore imprevisto');
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
          🗑️ Rimuovi Trustline
        </button>
      ) : (
        <div className="flex flex-col gap-2 bg-slate-900 p-3 rounded-lg border border-red-900">
          <label className="text-xs text-gray-400">Inserisci Chiave Privata (S...) per confermare:</label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="S..."
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
              Annulla
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded font-medium flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? "Rimozione..." : "Conferma"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
