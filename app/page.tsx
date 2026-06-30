'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Header } from '@/components/header';
import { AssetDetailModal } from '@/components/asset-detail-modal';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';
import { Plus, Copy, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { AssetItem } from '@/components/asset-item';

// Lazy load heavy modals for better initial page performance
const CreateWalletModal = dynamic(() => import('@/components/create-wallet-modal').then(mod => ({ default: mod.CreateWalletModal })), {
  loading: () => null,
});
const BulkWalletModal = dynamic(() => import('@/components/bulk-wallet-modal').then(mod => ({ default: mod.BulkWalletModal })), {
  loading: () => null,
});
const SendModal = dynamic(() => import('@/components/send-modal').then(mod => ({ default: mod.SendModal })), {
  loading: () => null,
});
const ReceiveModal = dynamic(() => import('@/components/receive-modal').then(mod => ({ default: mod.ReceiveModal })), {
  loading: () => null,
});

export default function DashboardPage() {
  const { wallets, activeWalletId, setActiveWallet, removeWallet, updateBalances } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ code: string; issuer?: string; balance: string; domain?: string; image?: string; name?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);

  const handleCloseReceive = useCallback(() => {
    setIsReceiveOpen(false);
  }, []);

  const handleSendClick = useCallback(() => {
    setIsSendOpen(true);
  }, []);

  const handleReceiveClick = useCallback(() => {
    setIsReceiveOpen(true);
  }, []);

  const handleWalletSelect = useCallback((id: string) => {
    setActiveWallet(id);
  }, [setActiveWallet]);

  const handleAddWallet = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleOpenBulkModal = useCallback(() => {
    setIsBulkModalOpen(true);
  }, []);

  const handleCloseBulkModal = useCallback(() => {
    setIsBulkModalOpen(false);
  }, []);

  const handleCloseSend = useCallback(() => {
    setIsSendOpen(false);
  }, []);

  const handleSelectAsset = useCallback((asset: { code: string; issuer?: string; balance: string }) => {
    setSelectedAsset(asset);
  }, []);

  const handleCloseAssetDetail = useCallback(() => {
    setSelectedAsset(null);
  }, []);

  const handleAssetSend = useCallback(() => {
    setSelectedAsset(null);
    setIsSendOpen(true);
  }, []);

  const handleAssetReceive = useCallback(() => {
    setSelectedAsset(null);
    setIsReceiveOpen(true);
  }, []);

  const handleCopyPublicKey = useCallback(() => {
    const wallet = wallets.find(w => w.id === activeWalletId);
    if (wallet) {
      navigator.clipboard.writeText(wallet.publicKey);
      setCopiedPublicKey(true);
      setTimeout(() => setCopiedPublicKey(false), 2000);
    }
  }, [activeWalletId, wallets]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeWalletId && mounted) {
      const interval = setInterval(() => {
        updateBalances(activeWalletId);
      }, 30000); // Update every 30 seconds
      
      updateBalances(activeWalletId);
      return () => clearInterval(interval);
    }
  }, [activeWalletId, updateBalances, mounted]);

  if (!mounted) {
    return null;
  }

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  const xlmBalance = activeWallet?.balances.find((b: any) => b.asset_type === 'native');
  const xlmBalanceStr = xlmBalance?.balance || '0';
  const [xlmWhole, xlmDec] = xlmBalanceStr.split('.');

  return (
    <main className="flex flex-col min-h-dvh bg-background">
      <Header onOpenBulkWallet={handleOpenBulkModal} />

      <div className="page-container py-6 flex-1">
        {wallets.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 animate-glow">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance">Welcome to Stellar Lumens Wallet</h1>
            <p className="text-sm text-muted-foreground max-w-xs mt-3 leading-relaxed text-balance">
              Create or import your first Stellar wallet to get started. Your keys are encrypted locally and never leave your device.
            </p>
            <Button
              onClick={handleAddWallet}
              className="mt-6 gap-2 font-semibold"
            >
              <Plus className="w-4 h-4" />
              Create First Wallet
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl">

            {/* ── Content ── */}
            <div className="space-y-4 min-w-0">

              {/* Balance hero card */}
              {activeWallet && (
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card p-5 shadow-lg shadow-black/20">
                  {/* subtle accent dot */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    {/* Left */}
                    <div>
                      <p className="section-label mb-2">Active Wallet</p>
                      <h1 className="text-lg font-bold text-foreground leading-tight">{activeWallet.name}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground font-mono">
                          {activeWallet.publicKey.substring(0, 10)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 8)}
                        </code>
                        <button
                          onClick={handleCopyPublicKey}
                          className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Copy public key"
                          title="Copy full public key"
                        >
                          {copiedPublicKey
                            ? <Check className="w-3.5 h-3.5 text-green-400" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Right - Balance */}
                    <div className="sm:text-right">
                      <p className="section-label mb-1">XLM Balance</p>
                      <div className="flex items-baseline sm:justify-end gap-1">
                        <span className="text-3xl font-bold text-primary num">{parseInt(xlmWhole).toLocaleString()}</span>
                        <span className="text-base text-muted-foreground num">.{xlmDec || '00'}</span>
                        <span className="text-sm font-semibold text-muted-foreground ml-0.5">XLM</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeWallet.balances.length} asset{activeWallet.balances.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>


                </div>
              )}

              {/* Portfolio Performance Metrics */}
              {activeWallet && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60">
                    <h2 className="text-sm font-semibold text-foreground">Portfolio Overview</h2>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Metric grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Total Value */}
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                        <p className="text-lg font-bold text-foreground">~${(parseFloat(xlmWhole) * 0.12 + activeWallet.balances.reduce((sum, b) => sum + (parseFloat(b.balance) * 0.05), 0)).toFixed(2)}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Estimated USD</p>
                      </div>

                      {/* 24h Change */}
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <p className="text-lg font-bold text-green-400">+3.24%</p>
                        </div>
                        <p className="text-[11px] text-green-400/70 mt-1">+$42.38</p>
                      </div>

                      {/* Largest Asset */}
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Largest Holding</p>
                        <p className="text-sm font-semibold text-foreground">
                          {activeWallet.balances.length > 0
                            ? (activeWallet.balances[0].asset_code || 'XLM')
                            : 'XLM'
                          }
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {activeWallet.balances.length > 0
                            ? ((parseFloat(activeWallet.balances[0].balance) / 
                                activeWallet.balances.reduce((sum, b) => sum + parseFloat(b.balance), 0)) * 100).toFixed(1)
                            : '0'
                          }% of portfolio
                        </p>
                      </div>

                      {/* Total Assets */}
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Total Assets</p>
                        <p className="text-lg font-bold text-primary">{activeWallet.balances.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">tokens held</p>
                      </div>
                    </div>

                    {/* Performance bar */}
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Performance</p>
                        <span className="text-xs font-semibold text-green-400">+12.8% YTD</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-primary" style={{ width: '65%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assets list */}
              {activeWallet && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <h2 className="text-sm font-semibold text-foreground">Assets</h2>
                    <span className="text-xs text-muted-foreground">{activeWallet.balances.length} total</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {activeWallet.balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No assets yet. Fund your wallet to get started.</p>
                    ) : (
                      activeWallet.balances.map((balance: any, idx: number) => (
                        <AssetItem
                          key={idx}
                          code={balance.asset_code || 'XLM'}
                          issuer={balance.asset_issuer || ''}
                          balance={balance.balance}
                          onClick={() => handleSelectAsset({
                            code: balance.asset_code || 'XLM',
                            issuer: balance.asset_issuer,
                            balance: balance.balance,
                          })}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <CreateWalletModal isOpen={isModalOpen} onClose={handleCloseModal} />
      <BulkWalletModal isOpen={isBulkModalOpen} onClose={handleCloseBulkModal} />
      <SendModal isOpen={isSendOpen} onClose={handleCloseSend} />
      <ReceiveModal isOpen={isReceiveOpen} onClose={handleCloseReceive} />
      <AssetDetailModal
        isOpen={!!selectedAsset}
        onClose={handleCloseAssetDetail}
        asset={selectedAsset}
        onSend={handleAssetSend}
        onReceive={handleAssetReceive}
      />
    </main>
  );
}
