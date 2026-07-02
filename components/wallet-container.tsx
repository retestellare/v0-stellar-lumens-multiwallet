'use client';

import { useState } from 'react';
import { Wallet } from '@/lib/wallet-context';
import { WalletCard } from '@/components/wallet-card';
import { Button } from '@/components/ui/button';
import { Plus, Wallet as WalletIcon, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';

interface WalletContainerProps {
  wallets: Wallet[];
  activeWalletId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function WalletContainer({
  wallets,
  activeWalletId,
  onSelect,
  onDelete,
  onAdd,
}: WalletContainerProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Compute total portfolio XLM across all wallets
  const totalXlm = wallets.reduce((sum, w) => {
    const native = w.balances.find((b: any) => b.asset_type === 'native');
    return sum + (native ? parseFloat(native.balance) : 0);
  }, 0);

  const totalAssets = wallets.reduce((sum, w) => sum + w.balances.length, 0);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl shadow-black/30 flex flex-col">

      {/* ── Container header ── */}
      <div className="relative overflow-hidden px-4 pt-4 pb-3 border-b border-border/60 bg-gradient-to-br from-card to-[#0a1225]">
        {/* Subtle glow accent */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/8 blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3">
          {/* Left: icon + title + toggle */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
            aria-expanded={isOpen}
            aria-controls="wallet-container-body"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <WalletIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-foreground leading-tight">My Wallets</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-muted/50 border border-border/50 group-hover:bg-muted transition-colors flex-shrink-0">
              {isOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </div>
          </button>

          {/* Right: Add button */}
          <Button
            onClick={onAdd}
            size="sm"
            className="h-7 gap-1.5 text-xs font-semibold px-2.5 flex-shrink-0"
            aria-label="Add new wallet"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>

        {/* Portfolio summary strip */}
        {isOpen && wallets.length > 0 && (
          <div className="relative mt-3 flex items-center gap-4 bg-muted/40 rounded-xl px-3 py-2 border border-border/40">
            <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="flex items-baseline gap-1 flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">Portfolio</span>
              <span className="text-sm font-bold text-primary num ml-auto">
                {totalXlm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">XLM</span>
            </div>
            <div className="h-3 w-px bg-border/60" />
            <span className="text-xs text-muted-foreground flex-shrink-0">{totalAssets} assets</span>
          </div>
        )}
      </div>

      {/* ── Wallet list ── */}
      {isOpen && <div id="wallet-container-body" className="flex-1 overflow-y-auto max-h-[520px] p-2 space-y-1.5 scrollbar-thin">
        {wallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center mb-3">
              <WalletIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No wallets yet</p>
            <p className="text-xs text-muted-foreground mt-1 text-balance">
              Add your first wallet to get started
            </p>
            <Button onClick={onAdd} size="sm" className="mt-4 gap-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              Create Wallet
            </Button>
          </div>
        ) : (
          wallets.map((wallet, index) => (
            <div key={wallet.id} className="relative">
              {/* Sequential index badge — shown outside the card */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-muted/70 border border-border/60 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-muted-foreground leading-none">{index + 1}</span>
              </div>
              <div className="pl-8">
                <WalletCard
                  wallet={wallet}
                  isActive={activeWalletId === wallet.id}
                  onSelect={() => onSelect(wallet.id)}
                  onDelete={() => onDelete(wallet.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>}

      {/* ── Footer tally ── */}
      {isOpen && wallets.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} total
          </span>
          <span className="text-xs text-muted-foreground">
            Active: <span className="text-foreground font-medium">
              {wallets.find(w => w.id === activeWalletId)?.name ?? '—'}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
