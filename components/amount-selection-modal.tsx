'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/lib/wallet-context';

interface AmountSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: {
    name: string;
    icon: string;
    description?: string;
  } | null;
  onProceed?: (amount: number, currency: 'EUR' | 'USDC') => void;
}

export function AmountSelectionModal({
  isOpen,
  onClose,
  merchant,
  onProceed,
}: AmountSelectionModalProps) {
  const { activeWallet } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [isCustom, setIsCustom] = useState(false);

  // EUR to USDC conversion rate (1 EUR ≈ 1.08 USDC, approximate market rate)
  const EUR_TO_USDC_RATE = 1.08;

  const quickAmounts = [25, 50, 100];

  useEffect(() => {
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (amount && !isNaN(amount) && amount > 0) {
      setUsdcAmount(parseFloat((amount * EUR_TO_USDC_RATE).toFixed(2)));
    } else {
      setUsdcAmount(0);
    }
  }, [selectedAmount, customAmount, isCustom]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setIsCustom(false);
  };

  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    setIsCustom(true);
    setSelectedAmount(null);
  };

  const handleProceed = () => {
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (amount && !isNaN(amount) && amount > 0) {
      onProceed?.(amount, 'EUR');
      onClose();
    }
  };

  if (!isOpen || !merchant) return null;

  const displayAmount = isCustom ? customAmount : selectedAmount?.toString() || '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="p-6 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                {merchant.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{merchant.name}</h2>
                {merchant.description && (
                  <p className="text-xs text-muted-foreground">{merchant.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Active Wallet Info */}
            {activeWallet && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-muted-foreground mb-1">Paying from Wallet</p>
                <p className="text-sm font-medium text-blue-400">{activeWallet.name}</p>
              </div>
            )}

            {/* Amount Display */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Select Amount</label>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`py-2 px-3 rounded-lg font-medium transition-all ${
                      selectedAmount === amount && !isCustom
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-700/50 text-slate-200 hover:bg-slate-700 border border-slate-600/50'
                    }`}
                  >
                    €{amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Custom Amount (€)</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={handleCustomAmount}
                    min="0"
                    step="0.01"
                    className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                </div>
              </div>
            </div>

            {/* Conversion Display */}
            {displayAmount && usdcAmount > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">€{displayAmount}</span>
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-blue-400">{usdcAmount.toFixed(2)} USDC</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Conversion rate: 1 EUR = {EUR_TO_USDC_RATE} USDC
                </p>
              </div>
            )}

            {/* Fee Info */}
            <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
              <p className="text-xs text-muted-foreground text-center">
                All transactions are final on Stellar blockchain
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-purple-500/20 space-y-3">
            <Button
              onClick={handleProceed}
              disabled={!displayAmount || usdcAmount === 0}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Stellar Payment
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full bg-slate-700/50 border-slate-600/50 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
