'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, AlertTriangle, Copy, Check, Info } from 'lucide-react';
import { Keypair } from '@stellar/stellar-sdk';

interface BotWalletData {
  publicKey: string;
  secretKey: string;
  balance: number;
  createdAt: string;
  network: 'mainnet';
}

interface BotWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletCreated: (wallet: BotWalletData) => void;
}

type Step = 'mode' | 'create' | 'import' | 'backup' | 'confirm';

export function BotWalletModal({ isOpen, onClose, onWalletCreated }: BotWalletModalProps) {
  const [step, setStep] = useState<Step>('mode');
  const [importSecret, setImportSecret] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [generatedPublic, setGeneratedPublic] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const handleCreateNew = () => {
    try {
      const keypair = Keypair.random();
      setGeneratedSecret(keypair.secret());
      setGeneratedPublic(keypair.publicKey());
      setStep('backup');
      setError('');
    } catch (err: any) {
      setError('Failed to generate wallet');
    }
  };

  const handleImport = () => {
    if (!importSecret.trim()) {
      setError('Secret key is required');
      return;
    }

    try {
      // Validate the secret key format first
      if (!importSecret.trim().startsWith('S')) {
        setError('Invalid Stellar secret key format. Secret keys must start with "S"');
        return;
      }

      // Validate the secret key by creating a keypair
      const keypair = Keypair.fromSecret(importSecret.trim());
      setGeneratedSecret(keypair.secret());
      setGeneratedPublic(keypair.publicKey());
      setImportSecret(''); // Clear input for security
      setStep('confirm');
      setError('');
    } catch (err: any) {
      setError('Invalid secret key. Please check the format and try again.');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(generatedSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyPublic = () => {
    navigator.clipboard.writeText(generatedPublic);
    setCopiedPublic(true);
    setTimeout(() => setCopiedPublic(false), 2000);
  };

  const handleConfirmBackup = () => {
    if (!backupConfirmed) {
      setError('You must confirm that you have safely stored your secret key');
      return;
    }

    const wallet: BotWalletData = {
      publicKey: generatedPublic,
      secretKey: generatedSecret,
      balance: 0,
      createdAt: new Date().toISOString(),
      network: 'mainnet',
    };

    localStorage.setItem('stellar_bot_wallet', JSON.stringify(wallet));
    onWalletCreated(wallet);
    handleClose();
  };

  const handleConfirmImport = () => {
    const wallet: BotWalletData = {
      publicKey: generatedPublic,
      secretKey: generatedSecret,
      balance: 0,
      createdAt: new Date().toISOString(),
      network: 'mainnet',
    };

    localStorage.setItem('stellar_bot_wallet', JSON.stringify(wallet));
    onWalletCreated(wallet);
    handleClose();
  };

  const handleClose = () => {
    setStep('mode');
    setImportSecret('');
    setGeneratedSecret('');
    setGeneratedPublic('');
    setError('');
    setBackupConfirmed(false);
    setCopiedSecret(false);
    setCopiedPublic(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl bg-card border border-border rounded-2xl z-50 flex flex-col overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-foreground">Bot Wallet Management</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-background/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1">
          {step === 'mode' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-500 font-medium mb-1">Mainnet Only</p>
                  <p className="text-xs text-blue-500/80">
                    Your bot wallet operates exclusively on Stellar Mainnet with real funds. Choose to create a new wallet or import an existing one.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleCreateNew}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  Create New Bot Wallet
                </Button>
                <Button
                  onClick={() => setStep('import')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Import Existing Wallet
                </Button>
              </div>
            </div>
          )}

          {step === 'import' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Secret Key</label>
                <Input
                  placeholder="Enter your Stellar secret key (starts with S)"
                  value={importSecret}
                  onChange={(e) => {
                    setImportSecret(e.target.value);
                    setError('');
                  }}
                  className="font-mono text-xs"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('mode');
                    setError('');
                    setImportSecret('');
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importSecret.trim()}
                  className="flex-1"
                >
                  Import Wallet
                </Button>
              </div>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-500 font-medium mb-1">Save Your Secret Key</p>
                  <p className="text-xs text-yellow-500/80">
                    This is the ONLY way to access your bot wallet and funds. Store it in a secure location. We do not store it.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Secret Key</label>
                <div className="p-4 rounded-lg bg-background/30 border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-xs text-yellow-400 break-all select-all">{generatedSecret}</p>
                    <button
                      onClick={handleCopySecret}
                      className="p-2 rounded hover:bg-background/50 flex-shrink-0"
                    >
                      {copiedSecret ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Public Key (Bot Address)</label>
                <div className="p-4 rounded-lg bg-background/30 border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-xs text-primary break-all">{generatedPublic}</p>
                    <button
                      onClick={handleCopyPublic}
                      className="p-2 rounded hover:bg-background/50 flex-shrink-0"
                    >
                      {copiedPublic ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-background/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={(e) => {
                    setBackupConfirmed(e.target.checked);
                    setError('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">
                  I have safely stored my secret key and understand that Orion cannot recover it if lost
                </span>
              </label>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                onClick={handleConfirmBackup}
                disabled={!backupConfirmed}
                className="w-full"
              >
                Confirm & Create Wallet
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-500 font-medium mb-1">Wallet Valid</p>
                  <p className="text-xs text-green-500/80">
                    Your wallet has been validated and is ready to use on Mainnet.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Public Key (Bot Address)</label>
                <div className="p-4 rounded-lg bg-background/30 border border-border">
                  <p className="font-mono text-xs text-primary break-all">{generatedPublic}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('mode')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  className="flex-1"
                >
                  Use This Wallet
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
