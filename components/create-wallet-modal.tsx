'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/lib/wallet-context';
import { X, Copy } from 'lucide-react';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'mode' | 'create' | 'import' | 'secure' | 'review';

export function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const { createWallet, addWallet } = useWallet();
  const [step, setStep] = useState<Step>('mode');
  const [walletName, setWalletName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importSecret, setImportSecret] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateNew = async () => {
    if (!walletName.trim()) {
      setError('Wallet name is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      createWallet(walletName, password);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!walletName.trim()) {
      setError('Wallet name is required');
      return;
    }
    if (!importSecret.trim()) {
      setError('Secret key is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      addWallet(walletName, importSecret.trim(), password);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = () => {
    // We'll generate it when moving to secure step
    setStep('secure');
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(generatedSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleClose = () => {
    setStep('mode');
    setWalletName('');
    setPassword('');
    setConfirmPassword('');
    setImportSecret('');
    setGeneratedSecret('');
    setError('');
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg max-w-md w-full mx-4 p-6 glow-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Create Wallet</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'mode' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">How would you like to proceed?</p>
            <Button
              onClick={() => setStep('create')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create New Wallet
            </Button>
            <Button
              onClick={() => setStep('import')}
              variant="outline"
              className="w-full border-border hover:bg-card"
            >
              Import Existing Wallet
            </Button>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Wallet Name</label>
              <Input
                placeholder="My Stellar Wallet"
                value={walletName}
                onChange={(e) => {
                  setWalletName(e.target.value);
                  setError('');
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => setStep('mode')} variant="outline" className="flex-1 border-border hover:bg-card">
                Back
              </Button>
              <Button
                onClick={handleCreateNew}
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        )}

        {step === 'import' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Wallet Name</label>
              <Input
                placeholder="My Imported Wallet"
                value={walletName}
                onChange={(e) => {
                  setWalletName(e.target.value);
                  setError('');
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Secret Key</label>
              <textarea
                placeholder="SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
                value={importSecret}
                onChange={(e) => {
                  setImportSecret(e.target.value);
                  setError('');
                }}
                className="w-full bg-input border border-border rounded text-foreground text-xs p-2 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                rows={3}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => setStep('mode')} variant="outline" className="flex-1 border-border hover:bg-card">
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}
      </div>
    </div>
  );
}
