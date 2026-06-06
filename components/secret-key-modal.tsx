'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { decryptSecret } from '@/lib/stellar-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SecretKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecretKeyModal({ isOpen, onClose }: SecretKeyModalProps) {
  const { activeWallet, getPasswordSession, savePasswordSession, passwordSessionType } = useWallet();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Check for existing session password when modal opens
  useEffect(() => {
    if (isOpen && activeWallet) {
      const sessionPassword = getPasswordSession(activeWallet.id);
      if (sessionPassword) {
        // Valid session exists, auto-decrypt
        try {
          const decrypted = decryptSecret(activeWallet.encryptedSecret, sessionPassword);
          setSecretKey(decrypted);
          setError('');
        } catch (e) {
          // Session password is invalid, clear state and show form
          setSecretKey(null);
          setError('');
        }
      }
    }
  }, [isOpen, activeWallet, getPasswordSession]);

  const handleReveal = () => {
    if (!activeWallet || !password) return;
    
    try {
      const decrypted = decryptSecret(activeWallet.encryptedSecret, password);
      setSecretKey(decrypted);
      setError('');
      // Save password to session with current session type
      savePasswordSession(activeWallet.id, password, passwordSessionType);
      setPassword('');
    } catch (e) {
      setError('Invalid password');
    }
  };

  const handleCopy = () => {
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setPassword('');
    setSecretKey(null);
    setShowSecret(false);
    setError('');
    onClose();
  };

  if (!isOpen || !activeWallet) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-card border border-border rounded-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Secret Key</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-background/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning */}
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-500 font-medium mb-1">Security Warning</p>
              <p className="text-xs text-yellow-500/80">
                Never share your secret key with anyone. Anyone with your secret key has full access to your funds.
              </p>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="p-3 rounded-lg bg-background/30">
            <p className="text-xs text-muted-foreground mb-1">Wallet</p>
            <p className="font-medium text-foreground">{activeWallet.name}</p>
          </div>

          {!secretKey ? (
            /* Password Entry */
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter wallet password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleReveal()}
                  className="pr-10"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <Button
                onClick={handleReveal}
                disabled={!password}
                className="w-full"
              >
                <Key className="w-4 h-4 mr-2" />
                Reveal Secret Key
              </Button>
            </div>
          ) : (
            /* Secret Key Display */
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-background/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Your Secret Key</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-1.5 rounded hover:bg-background/50"
                      title={showSecret ? 'Hide' : 'Show'}
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded hover:bg-background/50"
                      title="Copy"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="font-mono text-xs text-foreground break-all select-all">
                  {showSecret 
                    ? secretKey 
                    : 'S••••••••••••••••••••••••••••••••••••••••••••••••••••••'
                  }
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Key
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
