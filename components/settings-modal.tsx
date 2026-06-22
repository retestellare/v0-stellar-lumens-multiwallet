'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  Globe,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { decryptSecret, getAccountHomeDomain, setHomeDomain, clearHomeDomain } from '@/lib/stellar-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordSessionScreen } from './settings/password-session-screen';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBulkWallet?: () => void;
}

export function SettingsModal({ isOpen, onClose, onOpenBulkWallet = () => {} }: SettingsModalProps) {
  const { activeWallet, wallets, removeWallet, updateWalletDetails } = useWallet();
  const [activeSection, setActiveSection] = useState<'main' | 'wallet' | 'security' | 'password-session'>('main');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Home domain state
  const [blockchainDomain, setBlockchainDomain] = useState<string | null>(null);
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [editingDomain, setEditingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainPassword, setDomainPassword] = useState('');
  const [domainError, setDomainError] = useState('');
  const [submittingDomain, setSubmittingDomain] = useState(false);
  const [domainSuccess, setDomainSuccess] = useState(false);

  // Reset states when closing modal or switching sections
  useEffect(() => {
    if (!isOpen) {
      setActiveSection('main');
      setBlockchainDomain(null);
      setLoadingDomain(false);
      setEditingDomain(false);
      setDomainPassword('');
      setDomainError('');
      setDomainSuccess(false);
    }
  }, [isOpen]);

  // Fetch home_domain from blockchain when wallet section opens
  useEffect(() => {
    if (activeSection === 'wallet' && activeWallet?.publicKey) {
      const publicKey = activeWallet.publicKey;
      setLoadingDomain(true);
      getAccountHomeDomain(publicKey)
        .then(domain => {
          setBlockchainDomain(domain);
        })
        .catch(() => {
          setBlockchainDomain(null);
        })
        .finally(() => {
          setLoadingDomain(false);
        });
    }
  }, [activeSection, activeWallet?.publicKey]);

  if (!isOpen) return null;

  const handleSaveName = () => {
    if (activeWallet && newName.trim()) {
      updateWalletDetails(activeWallet.publicKey, { name: newName.trim() });
      setEditingName(false);
      setNewName('');
    }
  };

  const handleSetDomain = async () => {
    if (!activeWallet || !domainPassword) return;
    
    setDomainError('');
    setSubmittingDomain(true);
    
    try {
      // Decrypt secret key
      const secretKey = decryptSecret(activeWallet.encryptedSecret, domainPassword);
      
      let result;
      if (newDomain.trim()) {
        // Set new domain
        result = await setHomeDomain(secretKey, newDomain.trim());
      } else {
        // Clear domain
        result = await clearHomeDomain(secretKey);
      }
      
      if (result.success) {
        setBlockchainDomain(newDomain.trim() || null);
        setDomainSuccess(true);
        setTimeout(() => {
          setEditingDomain(false);
          setNewDomain('');
          setDomainPassword('');
          setDomainSuccess(false);
        }, 2000);
      } else {
        setDomainError(result.error || 'Transaction failed');
      }
    } catch (e: any) {
      setDomainError(e.message || 'Invalid password');
    } finally {
      setSubmittingDomain(false);
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
                onClick={() => {
                  if (activeSection === 'password-session') {
                    setActiveSection('security');
                  } else {
                    setActiveSection('main');
                  }
                }}
                className="p-1 rounded hover:bg-background/50"
              >
                <ChevronRight className="w-5 h-5 rotate-180 text-muted-foreground" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {activeSection === 'main' && 'Settings'}
              {activeSection === 'wallet' && 'Wallet Settings'}
              {activeSection === 'security' && 'Security'}
              {activeSection === 'password-session' && 'Security'}
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
                    <p className="text-xs text-muted-foreground">Name, home domain</p>
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

              {onOpenBulkWallet && (
                <button
                  onClick={() => {
                    onOpenBulkWallet();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-background/30 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-foreground">Bulk Import/Export</p>
                      <p className="text-xs text-muted-foreground">Import or export multiple wallets</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              )}

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
              {/* Wallet Name - Local only */}
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

              {/* Home Domain - On-chain */}
              <div className="p-4 rounded-xl bg-background/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Home Domain</p>
                  </div>
                  {!editingDomain && (
                    <button
                      onClick={() => {
                        setEditingDomain(true);
                        setNewDomain(blockchainDomain || '');
                        setDomainPassword('');
                        setDomainError('');
                      }}
                      className="p-1 rounded hover:bg-background/50"
                    >
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                
                {editingDomain ? (
                  <div className="space-y-3">
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="example.com"
                      className="w-full"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This will submit a transaction to set your home_domain on the Stellar network.
                    </p>
                    <Input
                      type="password"
                      value={domainPassword}
                      onChange={(e) => setDomainPassword(e.target.value)}
                      placeholder="Enter wallet password to sign"
                      className="w-full"
                    />
                    {domainError && (
                      <div className="flex items-center gap-2 text-red-500 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {domainError}
                      </div>
                    )}
                    {domainSuccess && (
                      <div className="flex items-center gap-2 text-green-500 text-xs">
                        <Check className="w-3 h-3" />
                        Home domain updated on blockchain!
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDomain(false);
                          setNewDomain('');
                          setDomainPassword('');
                          setDomainError('');
                        }}
                        disabled={submittingDomain}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSetDomain}
                        disabled={!domainPassword || submittingDomain}
                        className="flex-1"
                      >
                        {submittingDomain ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          newDomain.trim() ? 'Set Domain' : 'Clear Domain'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {loadingDomain ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <p className="font-medium text-foreground">
                        {blockchainDomain || <span className="text-muted-foreground">Not Set</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Info about federation */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary/80">
                  <strong>Federation:</strong> To use a federation address (like user*domain.com), your home domain must host a federation server at /.well-known/stellar.toml
                </p>
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

              {/* Require Session Password */}
              <button
                onClick={() => setActiveSection('password-session')}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-background/30 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Require session password</p>
                    <p className="text-xs text-muted-foreground">Configure password timeout</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

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

          {activeSection === 'password-session' && (
            <PasswordSessionScreen
              onBack={() => setActiveSection('security')}
            />
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
