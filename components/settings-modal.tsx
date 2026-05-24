'use client';

import { useState } from 'react';
import {
  X,
  Settings,
  Wallet,
  Shield,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { decryptSecret } from '@/lib/stellar-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { activeWallet, wallets, removeWallet, updateWalletName } = useWallet();
  const [activeSection, setActiveSection] = useState<'main' | 'wallet' | 'security'>('main');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  if (!isOpen) return null;

  const handleSaveName = () => {
    if (activeWallet && newName.trim()) {
      updateWalletName(activeWallet.publicKey, newName.trim());
      setEditingName(false);
      setNewName('');
    }
  };

  const handleRemoveWallet = () => {
    if (activeWallet && confirm('Are you sure you want to remove this wallet? Make sure you have backed up your secret key.')) {
      removeWallet(activeWallet.publicKey);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:max-h-[80vh] bg-card border border-border rounded-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {activeSection !== 'main' && (
              <button
                onClick={() => setActiveSection('main')}
                className="p-1 rounded hover:bg-background/50"
              >
                <ChevronRight className="w-5 h-5 rotate-180 text-muted-foreground" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {activeSection === 'main' && 'Settings'}
              {activeSection === 'wallet' && 'Wallet Settings'}
              {activeSection === 'security' && 'Security'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'main' && (
            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('wallet')}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-background/30 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Wallet Settings</p>
                    <p className="text-xs text-muted-foreground">Name, details</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => setActiveSection('security')}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-background/30 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Wallet Security</p>
                    <p className="text-xs text-muted-foreground">Secret key, remove wallet</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="pt-4 border-t border-border mt-4">
                <p className="text-xs text-muted-foreground mb-2">App Info</p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/20">
                  <span className="text-sm text-foreground">Version</span>
                  <span className="text-sm text-muted-foreground">1.0.0</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/20 mt-2">
                  <span className="text-sm text-foreground">Network</span>
                  <span className="text-sm text-primary">Mainnet</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'wallet' && activeWallet && (
            <div className="space-y-4">
              {/* Wallet Name */}
              <div className="p-4 rounded-xl bg-background/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Wallet Name</p>
                  <button
                    onClick={() => {
                      setEditingName(true);
                      setNewName(activeWallet.name);
                    }}
                    className="p-1 rounded hover:bg-background/50"
                  >
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveName}>Save</Button>
                  </div>
                ) : (
                  <p className="font-medium text-foreground">{activeWallet.name}</p>
                )}
              </div>

              {/* Public Key */}
              <div className="p-4 rounded-xl bg-background/30">
                <p className="text-sm text-muted-foreground mb-2">Public Key</p>
                <p className="font-mono text-xs text-foreground break-all">
                  {activeWallet.publicKey}
                </p>
              </div>

              {/* Assets Count */}
              <div className="p-4 rounded-xl bg-background/30">
                <p className="text-sm text-muted-foreground mb-2">Assets</p>
                <p className="font-medium text-foreground">
                  {activeWallet.balances?.length || 0} assets
                </p>
              </div>
            </div>
          )}

          {activeSection === 'security' && activeWallet && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-500 font-medium mb-1">Security Warning</p>
                <p className="text-xs text-yellow-500/80">
                  Never share your secret key with anyone. Anyone with your secret key can access your funds.
                </p>
              </div>

              <SecretKeySection wallet={activeWallet} />

              {/* Remove Wallet */}
              <div className="pt-4 border-t border-border">
                <button
                  onClick={handleRemoveWallet}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/30"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-500">Remove Wallet</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Secret Key Section Component
function SecretKeySection({ wallet }: { wallet: any }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleRevealSecret = () => {
    try {
      const decrypted = decryptSecret(wallet.encryptedSecret, password);
      setSecretKey(decrypted);
      setError('');
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

  if (secretKey) {
    return (
      <div className="p-4 rounded-xl bg-background/30">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Secret Key</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="p-1 rounded hover:bg-background/50"
            >
              {showSecret ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-background/50"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        <p className="font-mono text-xs text-foreground break-all">
          {showSecret ? secretKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            setSecretKey(null);
            setShowSecret(false);
          }}
        >
          Hide Secret Key
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-background/30">
      <p className="text-sm text-muted-foreground mb-3">View Secret Key</p>
      <div className="space-y-3">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter wallet password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
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
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button
          onClick={handleRevealSecret}
          disabled={!password}
          className="w-full"
        >
          <Key className="w-4 h-4 mr-2" />
          Reveal Secret Key
        </Button>
      </div>
    </div>
  );
}
