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
  
  // For standard amounts, use 4 decimals with trailing zeros removed
  return n.toFixed(4).replace(/\.?0+$/, "");
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
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {/* Buy Form */}
      <div className="glow-border p-2 sm:p-3 rounded-lg space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-primary">BUY {sellingAsset}</h3>

        {bestAsk && (
          <div className="text-xs text-muted-foreground truncate">Best: {formatAmount(bestAsk)}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Price ({buyingAsset})</label>
          <Input
            placeholder="Price"
            type="text"
            inputMode="decimal"
            value={buyPrice}
            onChange={(e) => onBuyPriceChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Amt ({sellingAsset})</label>
          <Input
            placeholder="Amount"
            type="text"
            inputMode="decimal"
            value={buyAmount}
            onChange={(e) => onBuyAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs font-mono"
          />
        </div>

        {/* Counter currency amount field */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Total ({buyingAsset})</label>
          <Input
            placeholder="Total cost"
            type="text"
            inputMode="decimal"
            value={buyCounterAmount}
            onChange={(e) => handleBuyCounterChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs font-mono"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">
              Balance: {formatAmount(buyingBalance)} {buyingAsset}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocateBuyPercentage(pct)}
              disabled={parseFloat(buyingBalance) <= 0}
              className="px-2 py-1 text-xs rounded bg-background/50 text-primary ring-1 ring-primary/50 hover:ring-primary/80 hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-background/50 rounded p-1.5 border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-mono text-primary truncate max-w-[60%]">
              {formatAmount(buyTotal)} {buyingAsset}
            </span>
          </div>
        </div>

        <Button
          onClick={() => onBuyClick(buyPrice, buyAmount)}
          disabled={!buyPrice || !buyAmount || parseFloat(buyAmount) <= 0}
          className="w-full h-7 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
        >
          BUY
        </Button>
      </div>

      {/* Sell Form */}
      <div className="glow-border p-2 sm:p-3 rounded-lg space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-destructive">SELL {sellingAsset}</h3>

        {bestBid && (
          <div className="text-xs text-muted-foreground truncate">Best: {formatAmount(bestBid)}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Price ({buyingAsset})</label>
          <Input
            placeholder="Price"
            type="text"
            inputMode="decimal"
            value={sellPrice}
            onChange={(e) => onSellPriceChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Amt ({sellingAsset})</label>
          <Input
            placeholder="Amount"
            type="text"
            inputMode="decimal"
            value={sellAmount}
            onChange={(e) => onSellAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs font-mono"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">
              Balance: {formatAmount(sellingBalance)} {sellingAsset}
            </span>
          </div>
        </div>

        {/* Counter currency amount field */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Total ({buyingAsset})</label>
          <Input
            placeholder="Total receive"
            type="text"
            inputMode="decimal"
            value={sellCounterAmount}
            onChange={(e) => handleSellCounterChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs font-mono"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocateSellPercentage(pct)}
              disabled={parseFloat(sellingBalance) <= 0}
              className="px-2 py-1 text-xs rounded bg-background/50 text-destructive ring-1 ring-destructive/50 hover:ring-destructive/80 hover:bg-destructive/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-background/50 rounded p-1.5 border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Receive:</span>
            <span className="font-mono text-destructive truncate max-w-[60%]">
              {formatAmount(sellTotal)} {buyingAsset}
            </span>
          </div>
        </div>

        <Button
          onClick={() => onSellClick(sellPrice, sellAmount)}
          disabled={!sellPrice || !sellAmount || parseFloat(sellAmount) <= 0}
          className="w-full h-7 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
        >
          SELL
        </Button>
      </div>
    </div>
  );
}
