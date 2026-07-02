'use client';

import { useState } from 'react';
import { CreditCard, ShoppingCart, Zap, Smartphone, Badge, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AmountSelectionModal } from '@/components/amount-selection-modal';
import { useWallet } from '@/lib/wallet-context';

interface SpendingOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
  comingSoon?: boolean;
}

const spendingOptions: SpendingOption[] = [
  {
    id: 'mastercard',
    title: 'Virtual Mastercard',
    description: 'Spendable Everywhere',
    icon: <CreditCard className="w-8 h-8" />,
    gradient: 'from-purple-500/20 via-purple-600/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]',
  },
  {
    id: 'visa',
    title: 'Virtual Visa Card',
    description: 'Instant Global Payments',
    icon: <CreditCard className="w-8 h-8" />,
    gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
  },
  {
    id: 'supermarket',
    title: 'Supermarkets',
    description: 'Esselunga • Carrefour',
    icon: <ShoppingCart className="w-8 h-8" />,
    gradient: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]',
  },
  {
    id: 'fuel',
    title: 'Gas & Fuel',
    description: 'Q8 • Eni • Shell',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(217,119,6,0.4)]',
  },
  {
    id: 'amazon',
    title: 'Amazon',
    description: 'Online Shopping',
    icon: <Smartphone className="w-8 h-8" />,
    gradient: 'from-orange-500/20 via-orange-600/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(234,88,12,0.4)]',
  },
  {
    id: 'streaming',
    title: 'Streaming & Subscriptions',
    description: 'Netflix • Spotify • More',
    icon: <Badge className="w-8 h-8" />,
    gradient: 'from-pink-500/20 via-pink-600/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]',
    comingSoon: true,
  },
];

export function RealWorldSpending() {
  const { activeWallet, unlockWallet, getPasswordSession } = useWallet();
  const [selectedMerchant, setSelectedMerchant] = useState<typeof spendingOptions[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unlockedSecretKey, setUnlockedSecretKey] = useState<string | null>(null);

  const handleCardClick = (option: typeof spendingOptions[0]) => {
    if (!option.comingSoon && activeWallet) {
      // Check if wallet is already unlocked in password session
      const sessionPassword = getPasswordSession(activeWallet.id);
      if (sessionPassword) {
        try {
          const secretKey = unlockWallet(activeWallet.id, sessionPassword);
          setUnlockedSecretKey(secretKey);
          setSelectedMerchant(option);
          setIsModalOpen(true);
        } catch (error) {
          console.error('[v0] Error unlocking wallet:', error);
        }
      } else {
        // Wallet needs to be unlocked - user will see a prompt in the modal or separate dialog
        setSelectedMerchant(option);
        setIsModalOpen(true);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMerchant(null);
    setUnlockedSecretKey(null);
  };

  const handleProceed = (amount: number, currency: 'EUR' | 'USDC') => {
    console.log('[v0] Proceeding with payment:', { merchant: selectedMerchant?.title, amount, currency });
    // Payment processing will be implemented in next step
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header Section */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Real-World Spending
            </h1>
            <p className="text-muted-foreground text-lg">
              Use your XLM everywhere with zero KYC hassle
            </p>
          </div>
        </div>

        {/* Under Construction Notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-200 text-sm">
              Feature Under Construction
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Real-world spending capabilities are currently under development and awaiting regulatory approval. Once approved, you&apos;ll be able to purchase virtual cards and spend with merchants worldwide.
            </p>
          </div>
        </div>

        {/* DeFi Protocol Badge */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40">
            <Badge className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-purple-200 text-sm">
              DeFi Protocol - No KYC required under €150
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Spend instantly without identity verification up to your daily limit
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-xs font-bold text-white">
            LIVE
          </div>
        </div>
      </div>

      {/* Spending Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spendingOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleCardClick(option)}
            disabled={option.comingSoon}
            className={`group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-left transition-all duration-300 ${
              option.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-slate-900/80'
            }`}
          >
            {/* Gradient Background */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />

            {/* Glow Effect */}
            <div
              className={`absolute inset-0 ${option.glowColor} transition-shadow duration-300 rounded-2xl`}
            />

            {/* Content Container */}
            <div className="relative z-10 space-y-4">
              {/* Icon & Badge Container */}
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 text-primary group-hover:text-secondary group-hover:border-secondary/50 transition-colors duration-300">
                  {option.icon}
                </div>
                {option.comingSoon && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 text-blue-300">
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Text Content */}
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                  {option.title}
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-secondary/80 transition-colors duration-300">
                  {option.description}
                </p>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground flex items-center justify-between">
                  {option.comingSoon ? (
                    <span>Available soon</span>
                  ) : (
                    <>
                      <span>Tap to connect</span>
                      <span className="ml-2">→</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Hover Border Animation */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </button>
        ))}
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <div className="p-6 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-bold text-blue-100">Instant Spending</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Convert and spend your XLM in real-time at any partnered merchant
          </p>
        </div>

        <div className="p-6 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Badge className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-purple-100">No KYC Below €150</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete transactions instantly without identity verification up to daily limits
          </p>
        </div>

        <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-bold text-cyan-100">Borderless Payments</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your virtual cards work worldwide with competitive exchange rates
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 p-8 rounded-2xl border border-gradient-to-r from-purple-500/40 to-blue-500/40 bg-gradient-to-br from-purple-500/5 via-slate-900/50 to-blue-500/5 backdrop-blur-sm">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Ready to spend your XLM?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get your virtual card in minutes. No lengthy verification process required.
          </p>
          <Button
            className="mx-auto mt-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get Your Card
          </Button>
        </div>
      </div>

      {/* Amount Selection Modal */}
      <AmountSelectionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        merchant={
          selectedMerchant
            ? {
                name: selectedMerchant.title,
                icon: selectedMerchant.title === 'Virtual Mastercard' ? '💳' : 
                      selectedMerchant.title === 'Virtual Visa Card' ? '💳' :
                      selectedMerchant.title === 'Supermarkets' ? '🛒' :
                      selectedMerchant.title === 'Gas & Fuel' ? '⛽' :
                      selectedMerchant.title === 'Amazon' ? '📦' :
                      selectedMerchant.title === 'Streaming & Subscriptions' ? '🎬' : '🎯',
                description: selectedMerchant.description,
                merchantType: selectedMerchant.title === 'Virtual Mastercard' ? 'virtual_card' :
                              selectedMerchant.title === 'Virtual Visa Card' ? 'virtual_card' :
                              selectedMerchant.title === 'Amazon' ? 'amazon' :
                              selectedMerchant.title === 'Supermarkets' ? 'retail' :
                              selectedMerchant.title === 'Gas & Fuel' ? 'gas' : 'retail',
              }
            : null
        }
        onProceed={handleProceed}
        activePublicKey={activeWallet?.publicKey}
        activeSecretKey={unlockedSecretKey || undefined}
      />
    </div>
  );
}
