'use client';

import { useState, useEffect, useCallback, useTransition, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Header } from '@/components/header';
import { WalletCard } from '@/components/wallet-card';
import { AssetDetailModal } from '@/components/asset-detail-modal';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';
import { Plus, Send, ArrowRightLeft, Briefcase, Download, Droplets, Search } from 'lucide-react';
import Link from 'next/link';
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { wallets, activeWalletId, setActiveWallet, removeWallet, updateBalances } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ code: string; issuer?: string; balance: string; domain?: string; image?: string; name?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Memoize callback to prevent re-renders on every state change
  const handleExchangeClick = useCallback(() => {
    startTransition(() => {
      router.push('/exchange');
    });
  }, [router]);

  const handleSendClick = useCallback(() => {
    setIsSendOpen(true);
  }, []);

  const handleReceiveClick = useCallback(() => {
    setIsReceiveOpen(true);
  }, []);

  const handlePoolsClick = useCallback(() => {
    // Link component handles navigation, but we can use startTransition for consistency
    startTransition(() => {
      router.push('/pools');
    });
  }, [router]);

  const handleWalletSelect = useCallback((id: string) => {
    startTransition(() => {
      setActiveWallet(id);
    });
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

  const handleCloseReceive = useCallback(() => {
    setIsReceiveOpen(false);
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
          <div className="space-y-8">
            {/* Active Wallet Summary */}
            {activeWallet && (
              <div className="glow-border p-6 rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-muted-foreground">Active Wallet</h2>
                    <p className="text-2xl font-bold text-primary mt-1">{activeWallet.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {(activeWallet.balances.find((b: any) => b.asset_type === 'native')?.balance || '0')} XLM
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <button 
                    onClick={handleSendClick}
                    className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center group"
                  >
                    <Send className="w-5 h-5 text-primary mx-auto mb-2 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Send</p>
                  </button>
                  <button 
                    onClick={handleReceiveClick}
                    className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center group"
                  >
                    <Download className="w-5 h-5 text-primary mx-auto mb-2 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Receive</p>
                  </button>
                  <Link href="/token-search" className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center group">
                    <Search className="w-5 h-5 text-primary mx-auto mb-2 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Search</p>
                  </Link>
                  <button 
                    onClick={handleExchangeClick}
                    disabled={isPending}
                    className="glow-border p-3 rounded-lg hover:bg-primary/10 disabled:opacity-50 transition-colors text-center group"
                  >
                    <ArrowRightLeft className="w-5 h-5 text-primary mx-auto mb-2 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Exchange</p>
                  </button>
                  <button 
                    onClick={handlePoolsClick}
                    disabled={isPending}
                    className="glow-border p-3 rounded-lg hover:bg-primary/10 disabled:opacity-50 transition-colors text-center group"
                  >
                    <Droplets className="w-5 h-5 text-primary mx-auto mb-2 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Pools</p>
                  </button>
                </div>

                {/* Assets List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Assets</h3>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {activeWallet.balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No assets yet. Fund your wallet to get started.</p>
                    ) : (
                      activeWallet.balances.map((balance: any, idx: number) => (
                        <AssetItem
                          key={idx}
                          code={balance.asset_code || 'XLM'}
                          issuer={balance.asset_issuer || ''}
                          balance={balance.balance}
                          onClick={() => setSelectedAsset({
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

            {/* Wallets Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Your Wallets</h3>
                <Button
                  onClick={handleAddWallet}
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary hover:bg-primary/10 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Wallet
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
