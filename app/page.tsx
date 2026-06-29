'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Header } from '@/components/header';
import { WalletCard } from '@/components/wallet-card';
import { AssetDetailModal } from '@/components/asset-detail-modal';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';
import { Plus } from 'lucide-react';
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
    <main className="flex flex-col min-h-screen bg-background">
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
          <div className="grid lg:grid-cols-[1fr_320px] gap-5">

            {/* ── Left column ── */}
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
                      <code className="text-xs text-muted-foreground font-mono mt-1 block">
                        {activeWallet.publicKey.substring(0, 10)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 8)}
                      </code>
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

                  {/* Quick action links */}
                  <div className="relative z-10 flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <Link href="/send">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium border-border hover:border-primary/40 hover:bg-primary/5">
                        Send
                      </Button>
                    </Link>
                    <Link href="/receive">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium border-border hover:border-primary/40 hover:bg-primary/5">
                        Receive
                      </Button>
                    </Link>
                    <Link href="/swap">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium border-border hover:border-primary/40 hover:bg-primary/5">
                        Swap
                      </Button>
                    </Link>
                    <Link href="/portfolio" className="ml-auto">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                        Portfolio &rarr;
                      </Button>
                    </Link>
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

            {/* ── Right column — Wallets list ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Wallets</h2>
                  <p className="text-xs text-muted-foreground">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
                </div>
                <Button
                  onClick={handleAddWallet}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    isActive={activeWalletId === wallet.id}
                    onSelect={() => handleWalletSelect(wallet.id)}
                    onDelete={() => removeWallet(wallet.id)}
                  />
                ))}
              </div>
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
