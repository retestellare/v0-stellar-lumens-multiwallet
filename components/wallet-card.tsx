'use client';

import { Wallet } from '@/lib/wallet-context';
import { Copy, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface WalletCardProps {
  wallet: Wallet;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function WalletCard({ wallet, isActive, onSelect, onDelete }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(wallet.publicKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for restricted environments
        const textarea = document.createElement('textarea');
        textarea.value = wallet.publicKey;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('[v0] Failed to copy to clipboard:', err);
      setCopied(false);
    }
  };

  const xlmBalance = wallet.balances.find((b: any) => b.asset_type === 'native');
  const totalBalance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
  const assetCount = wallet.balances.length;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`relative rounded-xl cursor-pointer transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isActive
          ? 'bg-card border border-primary/30 shadow-lg shadow-primary/10'
          : 'bg-card border border-border hover:border-border/80 hover:shadow-md'
      }`}
    >
      {/* Active indicator stripe */}
      {isActive && (
        <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full bg-primary" />
      )}

      <div className="flex items-center gap-3 p-3.5">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {wallet.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground truncate">{wallet.name}</h3>
            {isActive && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary border border-primary/20 flex-shrink-0">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <code className="text-xs text-muted-foreground font-mono">
              {wallet.publicKey.substring(0, 6)}...{wallet.publicKey.substring(wallet.publicKey.length - 6)}
            </code>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="p-0.5 hover:text-primary text-muted-foreground transition-colors"
              title="Copy public key"
              aria-label="Copy public key"
            >
              <Copy className="w-3 h-3" />
            </button>
            {copied && <span className="text-xs text-primary font-medium">Copied</span>}
          </div>
        </div>

        {/* Balance + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            {wallet.fetchError ? (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-destructive">Error</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-primary num">{totalBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">XLM</p>
              </>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/15 rounded-lg"
            aria-label="Delete wallet"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      {/* Asset count row */}
      <div className="px-3.5 pb-3 -mt-1">
        <p className="text-xs text-muted-foreground">{assetCount} asset{assetCount !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}
