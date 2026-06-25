'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Copy, Loader } from 'lucide-react';
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
  
  // Multi-step state management: 'amount' (amount selection) → 'loading' → 'details' (transaction details)
  const [step, setStep] = useState<'amount' | 'loading' | 'details'>('amount');
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [isCustom, setIsCustom] = useState(false);
  
  // Transaction details from simulated Bitrefill API
  const [transactionDetails, setTransactionDetails] = useState<{
    destinationAddress: string;
    memoText: string;
    amount: number;
  } | null>(null);
  
  // Copy to clipboard feedback
  const [copiedField, setCopiedField] = useState<'address' | 'memo' | null>(null);

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

  const handleCopyToClipboard = async (text: string, field: 'address' | 'memo') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('[v0] Copy to clipboard failed:', err);
    }
  };

  // Simulate Bitrefill API call with loading animation
  const simulateBitrefillOrder = async () => {
    setStep('loading');
    
    // Simulate API delay (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulated Bitrefill API response with random but consistent addresses
    const mockDestinationAddress = 'GB7CEJF7GVVMIXJJ3CTWQKUJNLQHFVMJWK34MEPZXDKDXD4GHZRK7BTC';
    const mockMemoText = `BITREFILL-${Date.now().toString().slice(-8)}`;
    
    setTransactionDetails({
      destinationAddress: mockDestinationAddress,
      memoText: mockMemoText,
      amount: usdcAmount,
    });
    
    setStep('details');
  };

  const handleProceed = () => {
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (amount && !isNaN(amount) && amount > 0) {
      simulateBitrefillOrder();
    }
  };

  const handleSignAndSend = () => {
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (amount && !isNaN(amount) && amount > 0) {
      onProceed?.(amount, 'EUR');
      onClose();
      // Reset state for next use
      setStep('amount');
      setTransactionDetails(null);
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

          {/* Content - Rendered based on step */}
          <div className="p-6 space-y-6">
            {step === 'amount' && (
              <>
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
              </>
            )}

            {step === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative w-16 h-16">
                  <Loader className="w-16 h-16 text-purple-400 animate-spin" />
                </div>
                <p className="text-center text-slate-300 font-medium">
                  Generating anonymous Bitrefill order...
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  This may take a moment
                </p>
              </div>
            )}

            {step === 'details' && transactionDetails && (
              <>
                {/* Amount Summary */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-purple-500/30">
                  <p className="text-xs text-muted-foreground mb-2">Payment Amount</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-400">{transactionDetails.amount.toFixed(2)}</span>
                    <span className="text-lg font-semibold text-slate-300">USDC</span>
                  </div>
                </div>

                {/* Stellar Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Stellar Destination Address</label>
                  <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-between gap-2">
                    <code className="text-xs text-slate-300 font-mono break-all">
                      {transactionDetails.destinationAddress}
                    </code>
                    <button
                      onClick={() => handleCopyToClipboard(transactionDetails.destinationAddress, 'address')}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-600/50 transition-colors"
                      title="Copy address"
                    >
                      <Copy className={`w-4 h-4 ${copiedField === 'address' ? 'text-green-400' : 'text-slate-400'}`} />
                    </button>
                  </div>
                  {copiedField === 'address' && (
                    <p className="text-xs text-green-400">Address copied to clipboard</p>
                  )}
                </div>

                {/* Mandatory MEMO Text */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-white">MEMO Text</label>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 border border-red-500/50 text-red-300">
                      MANDATORY
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/40 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono font-bold text-red-300">
                      {transactionDetails.memoText}
                    </code>
                    <button
                      onClick={() => handleCopyToClipboard(transactionDetails.memoText, 'memo')}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      title="Copy memo"
                    >
                      <Copy className={`w-4 h-4 ${copiedField === 'memo' ? 'text-green-400' : 'text-red-300'}`} />
                    </button>
                  </div>
                  {copiedField === 'memo' && (
                    <p className="text-xs text-green-400">Memo copied to clipboard</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This memo must be included with your payment for successful order processing
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-purple-500/20 space-y-3">
            {step === 'amount' && (
              <>
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
              </>
            )}

            {step === 'details' && (
              <>
                <Button
                  onClick={handleSignAndSend}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-purple-500/50"
                >
                  Sign & Send Payment
                </Button>
                <Button
                  onClick={() => {
                    setStep('amount');
                    setTransactionDetails(null);
                  }}
                  variant="outline"
                  className="w-full bg-slate-700/50 border-slate-600/50 text-slate-200 hover:bg-slate-700 hover:text-white"
                >
                  Back
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
