'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { WalletContainer } from '@/components/wallet-container';
import { useWallet } from '@/lib/wallet-context';
import dynamic from 'next/dynamic';

const CreateWalletModal = dynamic(() => import('@/components/create-wallet-modal').then(m => ({ default: m.CreateWalletModal })), { loading: () => null });
const BulkWalletModal = dynamic(() => import('@/components/bulk-wallet-modal').then(m => ({ default: m.BulkWalletModal })), { loading: () => null });

export default function WalletsPage() {
  const { wallets, activeWalletId, setActiveWallet, removeWallet } = useWallet();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-background">
      <Header />

      <div className="page-container py-5 sm:py-8">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1 text-balance">
            My Wallets
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage and switch between your Stellar wallets. Add new wallets or import existing ones.
          </p>
        </div>

        <div className="max-w-2xl">
          <WalletContainer
            wallets={wallets}
            activeWalletId={activeWalletId}
            onSelect={setActiveWallet}
            onDelete={removeWallet}
            onAdd={() => setIsCreateOpen(true)}
          />
        </div>
      </div>

      <CreateWalletModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <BulkWalletModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />
    </main>
  );
}
