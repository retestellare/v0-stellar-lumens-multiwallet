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

// Smart number formatting based on magnitude
function formatNumber(value: number | string, maxDecimals: number = 7): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  // For very large numbers, use fewer decimals
  if (absNum >= 100000) {
    return num.toFixed(2);
  } else if (absNum >= 10000) {
    return num.toFixed(3);
  } else if (absNum >= 1000) {
    return num.toFixed(4);
  } else if (absNum >= 100) {
    return num.toFixed(5);
  } else if (absNum >= 1) {
    return num.toFixed(6);
  } else {
    return num.toFixed(maxDecimals);
  }
}

// Format for display (truncates long numbers)
function formatDisplay(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (absNum >= 100000) {
    return num.toFixed(0);
  } else if (absNum >= 10000) {
    return num.toFixed(1);
  } else if (absNum >= 1000) {
    return num.toFixed(2);
  } else if (absNum >= 1) {
    return num.toFixed(4);
  } else {
    return num.toFixed(7);
  }
}

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
      setBuyCounterAmount(isNaN(total) ? '' : formatNumber(total));
    } else {
      setBuyCounterAmount('');
    }
  }, [buyPrice, buyAmount]);

  useEffect(() => {
    if (sellPrice && sellAmount) {
      const total = parseFloat(sellPrice) * parseFloat(sellAmount);
      setSellCounterAmount(isNaN(total) ? '' : formatNumber(total));
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
      onBuyAmountChange(formatNumber(counterAmt / price));
    }
  };

  const handleSellCounterChange = (value: string) => {
    setSellCounterAmount(value);
    const price = parseFloat(sellPrice);
    const counterAmt = parseFloat(value);
    if (price > 0 && !isNaN(counterAmt)) {
      // Amount of tokens = counter amount / price
      onSellAmountChange(formatNumber(counterAmt / price));
    }
  };

  // For SELL: percentage of token balance to sell
  const allocateSellPercentage = (percentage: number) => {
    const balance = parseFloat(sellingBalance);
    if (isNaN(balance) || balance <= 0) return;
    const amount = balance * (percentage / 100);
    onSellAmountChange(formatNumber(amount));
  };

  // For BUY: percentage of counter currency balance to spend
  const allocateBuyPercentage = (percentage: number) => {
    const balance = parseFloat(buyingBalance); // Counter currency balance (e.g., XLM)
    const price = parseFloat(buyPrice);
    
    if (isNaN(balance) || balance <= 0) return;
    if (isNaN(price) || price <= 0) return;
    
    // How much counter currency to spend
    const counterToSpend = balance * (percentage / 100);
    // Amount of base tokens = counter / price
    const tokenAmount = counterToSpend / price;
    
    onBuyAmountChange(formatNumber(tokenAmount));
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
          <div className="text-xs text-muted-foreground truncate">Best: {formatDisplay(bestAsk)}</div>
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
              Balance: {formatDisplay(buyingBalance)} {buyingAsset}
            </span>
          </div>
        </div>

        <div className="flex gap-0.5">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocateBuyPercentage(pct)}
              disabled={!buyPrice || parseFloat(buyPrice) <= 0}
              className="flex-1 px-1 py-0.5 text-xs rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {formatDisplay(buyTotal)} {buyingAsset}
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
          <div className="text-xs text-muted-foreground truncate">Best: {formatDisplay(bestBid)}</div>
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
              Balance: {formatDisplay(sellingBalance)} {sellingAsset}
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

        <div className="flex gap-0.5">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocateSellPercentage(pct)}
              disabled={parseFloat(sellingBalance) <= 0}
              className="flex-1 px-1 py-0.5 text-xs rounded border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {formatDisplay(sellTotal)} {buyingAsset}
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
