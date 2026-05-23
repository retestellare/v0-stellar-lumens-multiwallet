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

  const allocatePercentage = (percentage: number, balance: string, setValue: (v: string) => void) => {
    const amount = (parseFloat(balance) * (percentage / 100)).toFixed(4);
    setValue(amount);
  };

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
            <label className="text-xs text-muted-foreground">Amt</label>
            <span className="text-xs text-muted-foreground">{parseFloat(buyingBalance).toFixed(2)}</span>
          </div>
          <Input
            placeholder="Amt"
            type="number"
            value={buyAmount}
            onChange={(e) => onBuyAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="flex gap-0.5">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocatePercentage(pct, buyingBalance, onBuyAmountChange)}
              className="flex-1 px-1 py-0.5 text-xs rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
            >
              {pct}%
            </button>
          ))}
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
            <label className="text-xs text-muted-foreground">Amt</label>
            <span className="text-xs text-muted-foreground">{parseFloat(sellingBalance).toFixed(2)}</span>
          </div>
          <Input
            placeholder="Amt"
            type="number"
            value={sellAmount}
            onChange={(e) => onSellAmountChange(e.target.value)}
            className="bg-input border-border text-foreground h-7 text-xs"
          />
        </div>

        <div className="flex gap-0.5">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocatePercentage(pct, sellingBalance, onSellAmountChange)}
              className="flex-1 px-1 py-0.5 text-xs rounded border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
            >
              {pct}%
            </button>
          ))}
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
