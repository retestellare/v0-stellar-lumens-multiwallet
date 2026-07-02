'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Header } from '@/components/header';
import { AssetDetailModal } from '@/components/asset-detail-modal';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';
import { Plus, Copy, Check } from 'lucide-react';
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
                <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 shadow-xl shadow-black/30 ring-1 ring-primary/8">
                  {/* subtle accent glow */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-secondary/5 blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    {/* Left */}
                    <div>
                      <p className="section-label mb-2">Active Wallet</p>
                      <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">{activeWallet.name}</h1>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                          {activeWallet.publicKey.substring(0, 10)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 8)}
                        </code>
                        <button
                          onClick={handleCopyPublicKey}
                          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Copy public key"
                          title="Copy full public key"
                        >
                          {copiedPublicKey
                            ? <Check className="w-3.5 h-3.5 text-success" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Right - Balance */}
                    <div className="sm:text-right">
                      <p className="section-label mb-1">XLM Balance</p>
                      <div className="flex items-baseline sm:justify-end gap-0.5">
                        <span className="text-4xl font-bold text-primary num tracking-tight">{parseInt(xlmWhole).toLocaleString()}</span>
                        <span className="text-xl text-primary/60 num">.{xlmDec || '00'}</span>
                        <span className="text-sm font-semibold text-muted-foreground ml-1">XLM</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeWallet.balances.length} asset{activeWallet.balances.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assets list */}
              {activeWallet && (
                <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/10">
                    <h2 className="text-sm font-semibold text-foreground tracking-tight">Assets</h2>
                    <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">{activeWallet.balances.length} total</span>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {activeWallet.balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No assets yet. Fund your wallet to get started.</p>
                    ) : (
                      activeWallet.balances.map((balance: any) => (
                        <AssetItem
                          key={`${balance.asset_code || 'XLM'}_${balance.asset_issuer || ''}`}
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
