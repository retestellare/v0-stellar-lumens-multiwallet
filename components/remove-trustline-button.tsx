'use client';

import React, { useState } from 'react';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRemoveTrustline } from '@/hooks/useRemoveTrustline';
import { useWallet } from '@/lib/wallet-context';

interface RemoveTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  onSuccess?: (hash: string) => void;
  className?: string;
}

/**
 * Component for removing a trustline with robust error handling and user confirmation
 * 
 * Features:
 * - Validates balance is zero before allowing removal
 * - Shows confirmation dialog with important warnings
 * - Displays toast notifications for success/error states
 * - Handles errors gracefully with user-friendly messages
 * - Prevents application crashes with comprehensive try/catch blocks
 */
export function RemoveTrustlineButton({
  assetCode,
  assetIssuer,
  balance,
  onSuccess,
  className = '',
}: RemoveTrustlineButtonProps) {
  const { globalDecryptedSecret } = useWallet();
  const { execute, isLoading, error } = useRemoveTrustline({
    onSuccess,
    showToast: true,
  });
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Only show button if balance is zero
  const isBalanceZero = parseFloat(balance) === 0;
  if (!isBalanceZero) return null;

  const handleRemove = async () => {
    if (!globalDecryptedSecret) {
      console.error('[v0] No secret key available for trustline removal');
      return;
    }

    setShowConfirmation(false);
    await execute(globalDecryptedSecret, assetCode, assetIssuer);
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmation(true)}
        disabled={isLoading || !globalDecryptedSecret}
        variant="destructive"
        className={className}
        title={!globalDecryptedSecret ? 'Wallet not connected' : `Remove trustline for ${assetCode}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Removing...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Trustline
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <AlertDialogTitle>Remove Trustline?</AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <div className="space-y-3">
              <p>
                You are about to remove your trustline for <span className="font-semibold">{assetCode}</span>.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 space-y-2">
                <p className="font-medium">⚠️ Important Warnings:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Your {assetCode} balance must be exactly zero</li>
                  <li>You will no longer be able to hold this asset</li>
                  <li>This action is permanent and cannot be undone</li>
                  <li>Any pending orders for {assetCode} will be cancelled</li>
                  <li>Network fee required (charged in XLM)</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600"
            >
              {isLoading ? 'Removing...' : 'Remove Trustline'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Banner - Persistent display of last error */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="font-medium flex items-center gap-2 text-red-900 mb-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Error
          </div>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </>
  );
}
