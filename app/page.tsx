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
const SendModal = dynamic(() => import('@/components/send-modal').then(mod => ({ default: mod.SendModal })), {
  loading: () => null,
});
const ReceiveModal = dynamic(() => import('@/components/receive-modal').then(mod => ({ default: mod.ReceiveModal })), {
  loading: () => null,
});

export default function DashboardPage() {
  const { wallets, activeWalletId, setActiveWallet, removeWallet, updateBalances } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-foreground">Welcome to Stellar Lumens Wallet</h1>
              <p className="text-muted-foreground max-w-md">
                Create or import your first Stellar wallet to get started. Your keys are encrypted locally and never stored on our servers.
              </p>
              <Button
                onClick={handleAddWallet}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Wallet
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Wallet Summary - Compact Premium Card */}
            {activeWallet && (
              <div className="space-y-3">
                {/* Balance Display Card - Compact */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-card to-card/50 border border-primary/20">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Left Side - Wallet Info */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Wallet</p>
                      <h1 className="text-lg font-bold text-foreground">{activeWallet.name}</h1>
                    </div>
                    
                    {/* Right Side - Balance */}
                    <div className="text-right space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Balance</p>
                      <div className="flex items-baseline justify-end gap-0.5">
                        <p className="text-2xl font-bold text-primary">
                          {(activeWallet.balances.find((b: any) => b.asset_type === 'native')?.balance || '0').split('.')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          .{(activeWallet.balances.find((b: any) => b.asset_type === 'native')?.balance || '0').split('.')[1] || '00'}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground ml-1">XLM</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assets List - Expanded */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Your Assets</h3>
                  <div className="grid gap-2 rounded-lg bg-card/50 border border-primary/10 p-2">
                    {activeWallet.balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No assets yet. Fund your wallet to get started.</p>
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
              </div>
            )}

            {/* Wallets Grid Section - Compact */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Your Wallets</h2>
                  <p className="text-xs text-muted-foreground">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
                </div>
                <Button
                  onClick={handleAddWallet}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/50 gap-1 font-semibold rounded-lg h-8 text-xs px-3"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
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
