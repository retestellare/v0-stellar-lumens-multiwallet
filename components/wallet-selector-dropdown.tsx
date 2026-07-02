'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Wallet, Copy, Check, X } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface WalletSelectorDropdownProps {
  compact?: boolean;
}

export function WalletSelectorDropdown({ compact = false }: WalletSelectorDropdownProps) {
  const { wallets, activeWallet, setActiveWallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = async (e: React.MouseEvent, publicKey: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(publicKey);
    setCopiedId(publicKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectWallet = (walletId: string) => {
    setActiveWallet(walletId);
    setIsOpen(false);
  };

  const truncateKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

  if (!activeWallet || wallets.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <Wallet className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[180px]">
          {activeWallet.name || truncateKey(activeWallet.publicKey)}
        </span>
        <span className="text-muted-foreground hidden sm:inline">
          {truncateKey(activeWallet.publicKey)}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 min-w-[280px] sm:min-w-[320px]">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
              <h3 className="font-semibold text-foreground text-sm tracking-tight">Select Wallet</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wallet List */}
            <div className="max-h-[300px] overflow-y-auto">
              {wallets.map((wallet) => {
                const isActive = wallet.id === activeWallet.id || wallet.publicKey === activeWallet.publicKey;
                return (
                  <button
                    key={wallet.id || wallet.publicKey}
                    onClick={() => handleSelectWallet(wallet.id || wallet.publicKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-all border-b border-border/20 last:border-b-0 ${
                      isActive
                        ? 'bg-primary/12 border-l-[3px] border-l-primary pl-[13px]'
                        : 'hover:bg-muted/40 border-l-[3px] border-l-transparent pl-[13px]'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className={`font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {wallet.name || 'Unnamed Wallet'}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {truncateKey(wallet.publicKey)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleCopyAddress(e, wallet.publicKey)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors"
                      title="Copy address"
                    >
                      {copiedId === wallet.publicKey ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            {wallets.length > 1 && (
              <div className="px-4 py-2 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  {wallets.length} wallets connected
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
