import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { removeTrustline } from '@/lib/stellar-utils';

interface RemoveTrustlineOptions {
  onSuccess?: (hash: string) => void;
  onError?: (error: string) => void;
  showToast?: boolean;
}

export const useRemoveTrustline = (options: RemoveTrustlineOptions = {}) => {
  const { showToast = true, onSuccess, onError } = options;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (secretKey: string, assetCode: string, assetIssuer: string) => {
      // Reset state
      setError(null);
      setIsLoading(true);

      try {
        // Validate inputs
        if (!secretKey || !assetCode || !assetIssuer) {
          const message = 'Missing required parameters for trustline removal';
          setError(message);
          if (showToast) {
            toast({
              variant: 'destructive',
              title: 'Validation Error',
              description: message,
            });
          }
          onError?.(message);
          setIsLoading(false);
          return { success: false, error: message };
        }

        // Show loading toast
        if (showToast) {
          toast({
            title: 'Removing Trustline',
            description: `Removing trustline for ${assetCode}...`,
          });
        }

        // Execute trustline removal
        const result = await removeTrustline(secretKey, assetCode, assetIssuer);

        // Handle success
        if (result.success && result.hash) {
          const successMessage = `Trustline for ${assetCode} removed successfully`;
          
          if (showToast) {
            toast({
              title: 'Success',
              description: successMessage,
              variant: 'default',
            });
          }

          console.log('[v0] Trustline removal successful:', result.hash);
          onSuccess?.(result.hash);
          setIsLoading(false);
          return result;
        }

        // Handle error
        const errorMessage = result.error || 'Failed to remove trustline';
        setError(errorMessage);

        if (showToast) {
          toast({
            variant: 'destructive',
            title: 'Error Removing Trustline',
            description: errorMessage,
          });
        }

        console.error('[v0] Trustline removal failed:', errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
        return result;
      } catch (err: any) {
        // Catch any unexpected errors
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred while removing trustline';
        
        setError(errorMessage);

        if (showToast) {
          toast({
            variant: 'destructive',
            title: 'Unexpected Error',
            description: errorMessage,
          });
        }

        console.error('[v0] Unexpected error in removeTrustline:', err);
        onError?.(errorMessage);
        setIsLoading(false);

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [showToast, onSuccess, onError, toast]
  );

  return {
    execute,
    isLoading,
    error,
  };
};
