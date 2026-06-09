'use client';

import { Wallet } from '@/lib/wallet-context';
import { Copy, Trash2 } from 'lucide-react';
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
      className={`relative p-4 rounded-lg cursor-pointer transition-all group ${
        isActive
          ? 'glow-border glow-cyan'
          : 'border border-border hover:border-primary/50 hover:bg-card/50'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground">{wallet.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {assetCount} asset{assetCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 rounded"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>

        <div className="space-y-2 bg-background/30 p-2 rounded border border-border/50">
          <p className="text-lg font-bold text-primary">
            {totalBalance.toFixed(2)} XLM
          </p>
          <div className="flex items-start gap-2">
            <code className="text-xs text-muted-foreground break-all font-mono flex-1">
              {wallet.publicKey}
            </code>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1 hover:bg-primary/20 rounded transition-colors flex-shrink-0 mt-0.5"
              title="Copy public key"
            >
              <Copy className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
          {copied && <p className="text-xs text-primary">Copied!</p>}
        </div>
      </div>
    </div>
  );
}
