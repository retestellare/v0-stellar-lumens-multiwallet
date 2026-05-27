'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

// Smart number formatting based on value magnitude
const formatNumber = (value: number | string, maxDecimals = 7): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  // For very large numbers (>100k), use fewer decimals
  if (absNum >= 100000) return num.toFixed(2);
  if (absNum >= 10000) return num.toFixed(3);
  if (absNum >= 1000) return num.toFixed(4);
  if (absNum >= 100) return num.toFixed(5);
  if (absNum >= 10) return num.toFixed(6);
  if (absNum >= 1) return num.toFixed(maxDecimals);
  
  // For small numbers, show more decimals but trim trailing zeros
  return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
};

// Format balance for display
const formatBalance = (value: string, asset: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return `0 ${asset}`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M ${asset}`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K ${asset}`;
  return `${formatNumber(num, 4)} ${asset}`;
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

  // For SELL: percentage of token balance to sell
  const allocateSellPercentage = (percentage: number) => {
    const amount = parseFloat(sellingBalance) * (percentage / 100);
    onSellAmountChange(formatNumber(amount, 7));
  };

  // For BUY: percentage of payment currency to spend, converted to token amount
  const allocateBuyPercentage = (percentage: number) => {
    const paymentToSpend = parseFloat(buyingBalance) * (percentage / 100);
    const price = parseFloat(buyPrice);
    if (price > 0) {
      // Amount of tokens = payment to spend / price per token
      const tokenAmount = paymentToSpend / price;
      onBuyAmountChange(formatNumber(tokenAmount, 7));
    }
  };

  // Calculate totals (price * amount = total in counter currency)
  const buyTotal = buyPrice && buyAmount 
    ? parseFloat(buyPrice) * parseFloat(buyAmount)
    : 0;
  const sellTotal = sellPrice && sellAmount
    ? parseFloat(sellPrice) * parseFloat(sellAmount)
    : 0;

  // Handle counter currency input changes (calculate token amount from total)
  const handleBuyTotalChange = (totalValue: string) => {
    const total = parseFloat(totalValue);
    const price = parseFloat(buyPrice);
    if (!isNaN(total) && price > 0) {
      const tokenAmount = total / price;
      onBuyAmountChange(formatNumber(tokenAmount, 7));
    }
  };

  const handleSellTotalChange = (totalValue: string) => {
    const total = parseFloat(totalValue);
    const price = parseFloat(sellPrice);
    if (!isNaN(total) && price > 0) {
      const tokenAmount = total / price;
      onSellAmountChange(formatNumber(tokenAmount, 7));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {/* Buy Form */}
      <div className="glow-border p-2 sm:p-3 rounded-lg space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-primary">BUY {sellingAsset}</h3>

        {bestAsk && (
          <div className="text-xs text-muted-foreground truncate">Best: {formatNumber(bestAsk, 4)}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Price ({buyingAsset})</label>
          <Input
            placeholder="Price"
            type="number"
            value={buyPrice}
            onChange={(e) => onBuyPriceChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Amt ({sellingAsset})</label>
          <Input
            placeholder="Amount"
            type="number"
            value={buyAmount}
            onChange={(e) => onBuyAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        {/* Counter currency input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Total ({buyingAsset})</label>
          <Input
            placeholder="Total"
            type="number"
            value={buyTotal > 0 ? formatNumber(buyTotal, 7) : ''}
            onChange={(e) => handleBuyTotalChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Bal: {formatBalance(buyingBalance, buyingAsset)}</span>
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
          <div className="text-xs text-muted-foreground truncate">Best: {formatNumber(bestBid, 4)}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Price ({buyingAsset})</label>
          <Input
            placeholder="Price"
            type="number"
            value={sellPrice}
            onChange={(e) => onSellPriceChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Amt ({sellingAsset})</label>
          <Input
            placeholder="Amount"
            type="number"
            value={sellAmount}
            onChange={(e) => onSellAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Bal: {formatBalance(sellingBalance, sellingAsset)}</span>
          </div>
        </div>

        {/* Counter currency input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Total ({buyingAsset})</label>
          <Input
            placeholder="Total"
            type="number"
            value={sellTotal > 0 ? formatNumber(sellTotal, 7) : ''}
            onChange={(e) => handleSellTotalChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="flex gap-0.5">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocateSellPercentage(pct)}
              className="flex-1 px-1 py-0.5 text-xs rounded border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
            >
              {pct}%
            </button>
          ))}
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
