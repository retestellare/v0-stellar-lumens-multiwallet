'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { WalletCard } from '@/components/wallet-card';
import { CreateWalletModal } from '@/components/create-wallet-modal';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';
import { Plus, Send, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { wallets, activeWalletId, setActiveWallet, removeWallet, updateBalances } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
                onClick={() => setIsModalOpen(true)}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link href="/send" className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center group">
                    <Send className="w-5 h-5 text-primary mx-auto mb-2 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Send</p>
                  </Link>
                  <Link href="/receive" className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center group">
                    <LogIn className="w-5 h-5 text-primary mx-auto mb-2 rotate-180 group-hover:glow-pulse" />
                    <p className="text-xs font-medium text-foreground">Receive</p>
                  </Link>
                  <Link href="/portfolio" className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center">
                    <p className="text-xs font-medium text-foreground">Portfolio</p>
                  </Link>
                  <Link href="/exchange" className="glow-border p-3 rounded-lg hover:bg-primary/10 transition-colors text-center">
                    <p className="text-xs font-medium text-foreground">Exchange</p>
                  </Link>
                </div>

                {/* Assets List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Assets</h3>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {activeWallet.balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No assets yet. Fund your wallet to get started.</p>
                    ) : (
                      activeWallet.balances.map((balance: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-background/30 rounded border border-border/50">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-foreground">
                              {balance.asset_code || 'XLM'}
                            </p>
                            {balance.asset_issuer && (
                              <p className="text-xs text-muted-foreground truncate">
                                {balance.asset_issuer.substring(0, 12)}...
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {parseFloat(balance.balance).toFixed(4)}
                          </p>
                        </div>
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
                  onClick={() => setIsModalOpen(true)}
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
                    onSelect={() => setActiveWallet(wallet.id)}
                    onDelete={() => removeWallet(wallet.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateWalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}
