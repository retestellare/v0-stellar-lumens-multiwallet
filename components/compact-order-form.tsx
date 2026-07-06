'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

interface CompactOrderFormProps {
  sellingAsset: string;
  buyingAsset: string;
  sellingBalance: string;
  buyingBalance: string;
  bestBid?: string;
  bestAsk?: string;
  buyPrice: string;
  buyAmount: string;
  sellPrice: string;
  sellAmount: string;
  onBuyPriceChange: (value: string) => void;
  onBuyAmountChange: (value: string) => void;
  onSellPriceChange: (value: string) => void;
  onSellAmountChange: (value: string) => void;
  onBuyClick: (price: string, amount: string) => void;
  onSellClick: (price: string, amount: string) => void;
}

// Intelligent number formatting based on magnitude
const formatAmount = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!n || n === 0) return "0";
  
  // If the value is less than 0.01 (micro-amounts), use up to 7 decimals
  if (n < 0.01) {
    return n.toFixed(7).replace(/\.?0+$/, "");
  }
  
  // For standard amounts, use 6 decimals with trailing zeros removed
  return n.toFixed(6).replace(/\.?0+$/, "");
};

export function CompactOrderForm({
  sellingAsset,
  buyingAsset,
  sellingBalance,
  buyingBalance,
  bestBid,
  bestAsk,
  buyPrice,
  buyAmount,
  sellPrice,
  sellAmount,
  onBuyPriceChange,
  onBuyAmountChange,
  onSellPriceChange,
  onSellAmountChange,
  onBuyClick,
  onSellClick,
}: CompactOrderFormProps) {
  // Track the counter currency amounts
  const [buyCounterAmount, setBuyCounterAmount] = useState('');
  const [sellCounterAmount, setSellCounterAmount] = useState('');
  const [activeSide, setActiveSide] = useState<'buy' | 'sell'>('buy');

  // Calculate counter amounts when price or amount changes
  useEffect(() => {
    if (buyPrice && buyAmount) {
      const total = parseFloat(buyPrice) * parseFloat(buyAmount);
      setBuyCounterAmount(isNaN(total) ? '' : formatAmount(total));
    } else {
      setBuyCounterAmount('');
    }
  }, [buyPrice, buyAmount]);

  useEffect(() => {
    if (sellPrice && sellAmount) {
      const total = parseFloat(sellPrice) * parseFloat(sellAmount);
      setSellCounterAmount(isNaN(total) ? '' : formatAmount(total));
    } else {
      setSellCounterAmount('');
    }
  }, [sellPrice, sellAmount]);

  // Handle counter amount change (recalculate base amount)
  const handleBuyCounterChange = (value: string) => {
    setBuyCounterAmount(value);
    const price = parseFloat(buyPrice);
    const counterAmt = parseFloat(value);
    if (price > 0 && !isNaN(counterAmt)) {
      // Amount of tokens = counter amount / price
      onBuyAmountChange(formatAmount(counterAmt / price));
    }
  };

  const handleSellCounterChange = (value: string) => {
    setSellCounterAmount(value);
    const price = parseFloat(sellPrice);
    const counterAmt = parseFloat(value);
    if (price > 0 && !isNaN(counterAmt)) {
      // Amount of tokens = counter amount / price
      onSellAmountChange(formatAmount(counterAmt / price));
    }
  };

  // For SELL: percentage of token balance to sell
  const allocateSellPercentage = (percentage: number) => {
    const balance = parseFloat(sellingBalance);
    if (isNaN(balance) || balance <= 0) return;
    
    // Auto-fill price from best bid if not set
    let price = parseFloat(sellPrice);
    if (isNaN(price) || price <= 0) {
      price = bestBid ? parseFloat(bestBid) : 0;
      if (price > 0) {
        onSellPriceChange(formatAmount(price));
      }
    }
    
    const amount = balance * (percentage / 100);
    onSellAmountChange(formatAmount(amount));
  };

  // For BUY: percentage of counter currency balance to spend
  const allocateBuyPercentage = (percentage: number) => {
    const balance = parseFloat(buyingBalance); // Counter currency balance (e.g., XLM)
    
    if (isNaN(balance) || balance <= 0) return;
    
    // Use entered price or best ask as fallback
    let price = parseFloat(buyPrice);
    if (isNaN(price) || price <= 0) {
      price = bestAsk ? parseFloat(bestAsk) : 0;
      if (price > 0) {
        // Auto-fill price from best ask
        onBuyPriceChange(formatAmount(price));
      }
    }
    
    if (price <= 0) return;
    
    // How much counter currency to spend
    const counterToSpend = balance * (percentage / 100);
    // Amount of base tokens = counter / price
    const tokenAmount = counterToSpend / price;
    
    onBuyAmountChange(formatAmount(tokenAmount));
  };

  // Calculate totals
  const buyTotal = buyPrice && buyAmount 
    ? parseFloat(buyPrice) * parseFloat(buyAmount)
    : 0;
  const sellTotal = sellPrice && sellAmount
    ? parseFloat(sellPrice) * parseFloat(sellAmount)
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-1 backdrop-blur-md md:hidden">
        <button
          onClick={() => setActiveSide('buy')}
          className={`h-10 rounded-xl text-sm font-semibold transition-all duration-200 ease-in-out active:scale-[0.98] ${activeSide === 'buy' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-300 hover:bg-zinc-800/60'}`}
        >
          BUY {sellingAsset}
        </button>
        <button
          onClick={() => setActiveSide('sell')}
          className={`h-10 rounded-xl text-sm font-semibold transition-all duration-200 ease-in-out active:scale-[0.98] ${activeSide === 'sell' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-zinc-300 hover:bg-zinc-800/60'}`}
        >
          SELL {sellingAsset}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className={`space-y-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-3 backdrop-blur-md md:block ${activeSide === 'buy' ? 'block' : 'hidden'}`}>
          <div className="flex items-center justify-between border-t-2 border-emerald-500/60 pt-2">
            <h3 className="text-sm font-semibold text-emerald-300">BUY {sellingAsset}</h3>
            {bestAsk && <div className="text-xs text-zinc-400 font-mono tabular-nums">Best: {formatAmount(bestAsk)}</div>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">Price ({buyingAsset})</label>
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 focus-within:ring-1 focus-within:ring-yellow-500/50">
              <Input
                placeholder="Price"
                type="text"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => onBuyPriceChange(e.target.value)}
                className="h-12 border-0 bg-transparent text-center text-sm font-mono tabular-nums text-foreground placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">Amount ({sellingAsset})</label>
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 focus-within:ring-1 focus-within:ring-yellow-500/50">
              <Input
                placeholder="Amount"
                type="text"
                inputMode="decimal"
                value={buyAmount}
                onChange={(e) => onBuyAmountChange(e.target.value)}
                className="h-12 border-0 bg-transparent text-center text-sm font-mono tabular-nums text-foreground placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">Total ({buyingAsset})</label>
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 focus-within:ring-1 focus-within:ring-yellow-500/50">
              <Input
                placeholder="Total cost"
                type="text"
                inputMode="decimal"
                value={buyCounterAmount}
                onChange={(e) => handleBuyCounterChange(e.target.value)}
                className="h-12 border-0 bg-transparent text-center text-sm font-mono tabular-nums text-foreground placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
            <div className="text-right text-[10px] text-zinc-500 font-mono tabular-nums">
              Balance: {formatAmount(buyingBalance)} {buyingAsset}
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2">
            {[10, 50, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => allocateBuyPercentage(pct)}
                disabled={parseFloat(buyingBalance) <= 0}
                className="h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-200 transition-all duration-200 ease-in-out active:scale-[0.98] hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Cost:</span>
              <span className="max-w-[65%] truncate font-mono tabular-nums text-emerald-300">
                {formatAmount(buyTotal)} {buyingAsset}
              </span>
            </div>
          </div>

          <Button
            onClick={() => onBuyClick(buyPrice, buyAmount)}
            disabled={!buyPrice || !buyAmount || parseFloat(buyAmount) <= 0}
            className="h-11 w-full bg-emerald-500 text-emerald-950 transition-all duration-200 ease-in-out active:scale-[0.98] hover:bg-emerald-400"
          >
            BUY
          </Button>
        </div>

        <div className={`space-y-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-3 backdrop-blur-md md:block ${activeSide === 'sell' ? 'block' : 'hidden'}`}>
          <div className="flex items-center justify-between border-t-2 border-rose-500/60 pt-2">
            <h3 className="text-sm font-semibold text-rose-300">SELL {sellingAsset}</h3>
            {bestBid && <div className="text-xs text-zinc-400 font-mono tabular-nums">Best: {formatAmount(bestBid)}</div>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">Price ({buyingAsset})</label>
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 focus-within:ring-1 focus-within:ring-yellow-500/50">
              <Input
                placeholder="Price"
                type="text"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => onSellPriceChange(e.target.value)}
                className="h-12 border-0 bg-transparent text-center text-sm font-mono tabular-nums text-foreground placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">Amount ({sellingAsset})</label>
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 focus-within:ring-1 focus-within:ring-yellow-500/50">
              <Input
                placeholder="Amount"
                type="text"
                inputMode="decimal"
                value={sellAmount}
                onChange={(e) => onSellAmountChange(e.target.value)}
                className="h-12 border-0 bg-transparent text-center text-sm font-mono tabular-nums text-foreground placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
            <div className="text-right text-[10px] text-zinc-500 font-mono tabular-nums">
              Balance: {formatAmount(sellingBalance)} {sellingAsset}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-400">Total ({buyingAsset})</label>
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 focus-within:ring-1 focus-within:ring-yellow-500/50">
              <Input
                placeholder="Total receive"
                type="text"
                inputMode="decimal"
                value={sellCounterAmount}
                onChange={(e) => handleSellCounterChange(e.target.value)}
                className="h-12 border-0 bg-transparent text-center text-sm font-mono tabular-nums text-foreground placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2">
            {[10, 50, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => allocateSellPercentage(pct)}
                disabled={parseFloat(sellingBalance) <= 0}
                className="h-9 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200 transition-all duration-200 ease-in-out active:scale-[0.98] hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Receive:</span>
              <span className="max-w-[65%] truncate font-mono tabular-nums text-rose-300">
                {formatAmount(sellTotal)} {buyingAsset}
              </span>
            </div>
          </div>

          <Button
            onClick={() => onSellClick(sellPrice, sellAmount)}
            disabled={!sellPrice || !sellAmount || parseFloat(sellAmount) <= 0}
            className="h-11 w-full bg-rose-500 text-rose-50 transition-all duration-200 ease-in-out active:scale-[0.98] hover:bg-rose-400"
          >
            SELL
          </Button>
        </div>
      </div>
    </div>
  );
}
