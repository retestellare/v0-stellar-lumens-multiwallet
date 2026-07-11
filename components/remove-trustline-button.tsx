'use client';

import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Remove Trustline Modal Component
 * 
 * Provides a dark-themed modal for removing trustlines from assets
 * Uses backend API to build transaction, then signs and submits client-side
 */
export function RemoveTrustlineButton({
  assetCode,
  assetIssuer,
  balance,
  onSuccess,
  onClose,
}: RemoveTrustlineButtonProps) {
  const { activeWallet, globalDecryptedSecret } = useWallet();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Only show button if balance is zero
  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  const handleRemoveTrustline = async () => {
    if (!globalDecryptedSecret || !activeWallet) {
      setError('Wallet not connected. Please unlock your wallet first.');
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      console.log('[v0] Starting trustline removal for:', assetCode);

      // Step 1: Request unsigned transaction XDR from backend API
      console.log('[v0] Calling backend API to build trustline removal transaction');
      const apiResponse = await fetch('/api/stellar/remove-trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode,
          assetIssuer,
          userPublicKey: activeWallet.publicKey,
        }),
      });

      const apiData = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(apiData.error || 'Failed to build transaction');
      }

      console.log('[v0] Transaction XDR received from backend API');

      // Step 2: Reconstruct transaction from XDR
      // @ts-ignore
      const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
      // @ts-ignore
      const tx = StellarSdk.TransactionBuilder.fromXDR(apiData.xdr, NetworksPassphrase);

      if (!tx || typeof tx.sign !== 'function') {
        throw new Error('Failed to reconstruct transaction from XDR');
      }

      console.log('[v0] Transaction reconstructed from XDR, signing with user secret key');

      // Step 3: Sign transaction with user's secret key
      // @ts-ignore
      const keypair = StellarSdk.Keypair.fromSecret(globalDecryptedSecret);
      tx.sign(keypair);

      console.log('[v0] Transaction signed, submitting to Stellar network');

      // Step 4: Submit signed transaction to Stellar network
      // @ts-ignore
      const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
      // @ts-ignore
      const result = await server.submitTransaction(tx);

      console.log('[v0] Trustline removed successfully:', result.hash);
      setShowModal(false);
      onSuccess?.();
    } catch (err) {
      // Catch any errors to prevent app crash
      let errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

      // Map common Stellar/API errors to helpful messages
      if (errorMessage.includes('op_has_sub_entries')) {
        errorMessage = 'Cannot remove trustline. You may have open orders or offers involving this asset. Cancel them first.';
      } else if (errorMessage.includes('non_zero_balance') || errorMessage.includes('op_change_trust_non_zero_balance')) {
        errorMessage = 'Your balance must be exactly zero. Sell or transfer all tokens first.';
      } else if (errorMessage.includes('low_reserve') || errorMessage.includes('op_change_trust_low_reserve')) {
        errorMessage = 'Insufficient XLM for network reserve. Add more XLM to your account.';
      } else if (errorMessage.includes('op_invalid_limit')) {
        errorMessage = 'Invalid trustline removal. Ensure your balance is exactly zero.';
      } else if (errorMessage.includes('Account not found')) {
        errorMessage = 'Account not found on the network. Please check your wallet.';
      }

      setError(errorMessage);
      console.error('[v0] Trustline removal failed:', err);
    } finally {
      setIsPending(false);
    }
  };

  const openModal = () => {
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError(null);
    onClose?.();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={openModal}
        disabled={isPending || !globalDecryptedSecret}
        className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        title={!globalDecryptedSecret ? 'Wallet not connected' : 'Remove trustline for this asset'}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Removing...
          </>
        ) : (
          'Remove Trustline'
        )}
      </button>

      {/* Modal Backdrop and Container */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Header with Asset Icon and Name */}
            <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">
                    {assetCode.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{assetCode}</h2>
                    <p className="text-xs text-slate-400">Remove Trustline</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  disabled={isPending}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Important Warnings Box */}
              <div className="bg-slate-800/50 border border-orange-900/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white text-sm">Important Warnings:</p>
                    <ul className="text-xs text-slate-300 space-y-1.5 mt-2 list-disc list-inside">
                      <li>Your {assetCode} balance must be exactly zero</li>
                      <li>You will no longer be able to hold this asset</li>
                      <li>This action is permanent and cannot be undone</li>
                      <li>Any pending orders for {assetCode} will be cancelled</li>
                      <li>Network fee required (charged in XLM)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveTrustline}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove Trustline'
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Make sure your {assetCode} balance is zero before removing
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
