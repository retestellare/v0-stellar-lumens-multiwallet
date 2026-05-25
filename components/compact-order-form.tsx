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
    const amount = (parseFloat(sellingBalance) * (percentage / 100)).toFixed(4);
    onSellAmountChange(amount);
  };

  // For BUY: percentage of XLM to spend, converted to token amount
  const allocateBuyPercentage = (percentage: number) => {
    const xlmToSpend = parseFloat(buyingBalance) * (percentage / 100);
    const price = parseFloat(buyPrice);
    if (price > 0) {
      // Amount of tokens = XLM to spend / price per token
      const tokenAmount = (xlmToSpend / price).toFixed(4);
      onBuyAmountChange(tokenAmount);
    }
  };

  // Calculate totals
  const buyTotal = buyPrice && buyAmount 
    ? (parseFloat(buyPrice) * parseFloat(buyAmount)).toFixed(7)
    : '0';
  const sellTotal = sellPrice && sellAmount
    ? (parseFloat(sellPrice) * parseFloat(sellAmount)).toFixed(7)
    : '0';

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {/* Buy Form */}
      <div className="glow-border p-2 sm:p-3 rounded-lg space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-primary">BUY {sellingAsset}</h3>

        {bestAsk && (
          <div className="text-xs text-muted-foreground truncate">Best: {parseFloat(bestAsk).toFixed(4)}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Price</label>
          <Input
            placeholder="Price"
            type="number"
            value={buyPrice}
            onChange={(e) => onBuyPriceChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Amt ({sellingAsset})</label>
          </div>
          <Input
            placeholder="Amt"
            type="number"
            value={buyAmount}
            onChange={(e) => onBuyAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Balance: {parseFloat(buyingBalance).toFixed(2)} {buyingAsset}</span>
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

        {/* Total XLM cost */}
        <div className="bg-background/50 rounded p-1.5 border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-mono text-primary">{buyTotal} {buyingAsset}</span>
          </div>
        </div>

        <Button
          onClick={() => onBuyClick(buyPrice, buyAmount)}
          disabled={!buyPrice || !buyAmount}
          className="w-full h-7 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
        >
          BUY
        </Button>
      </div>

      {/* Sell Form */}
      <div className="glow-border p-2 sm:p-3 rounded-lg space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-destructive">SELL {sellingAsset}</h3>

        {bestBid && (
          <div className="text-xs text-muted-foreground truncate">Best: {parseFloat(bestBid).toFixed(4)}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Price</label>
          <Input
            placeholder="Price"
            type="number"
            value={sellPrice}
            onChange={(e) => onSellPriceChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Amt ({sellingAsset})</label>
          </div>
          <Input
            placeholder="Amt"
            type="number"
            value={sellAmount}
            onChange={(e) => onSellAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Balance: {parseFloat(sellingBalance).toFixed(2)} {sellingAsset}</span>
          </div>
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

        {/* Total XLM received */}
        <div className="bg-background/50 rounded p-1.5 border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-mono text-destructive">{sellTotal} {buyingAsset}</span>
          </div>
        </div>

        <Button
          onClick={() => onSellClick(sellPrice, sellAmount)}
          disabled={!sellPrice || !sellAmount}
          className="w-full h-7 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
        >
          SELL
        </Button>
      </div>
    </div>
  );
}
