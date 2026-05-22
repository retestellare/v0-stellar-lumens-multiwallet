'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CompactOrderFormProps {
  sellingAsset: string;
  buyingAsset: string;
  sellingBalance: string;
  buyingBalance: string;
  bestBid?: string;
  bestAsk?: string;
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
  onBuyClick,
  onSellClick,
}: CompactOrderFormProps) {
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');

  const allocatePercentage = (percentage: number, balance: string, setValue: (v: string) => void) => {
    const amount = (parseFloat(balance) * (percentage / 100)).toFixed(4);
    setValue(amount);
  };

  const buyTotal = buyPrice && buyAmount ? (parseFloat(buyPrice) * parseFloat(buyAmount)).toFixed(4) : '0.0000';
  const sellTotal = sellPrice && sellAmount ? (parseFloat(sellPrice) * parseFloat(sellAmount)).toFixed(4) : '0.0000';

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Buy Form */}
      <div className="glow-border p-4 rounded-lg space-y-3">
        <h3 className="text-lg font-semibold text-primary">BUY {sellingAsset}</h3>

        {bestAsk && (
          <div className="text-xs text-muted-foreground">Best Ask: {parseFloat(bestAsk).toFixed(6)} {buyingAsset}</div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Price ({buyingAsset})</label>
          <Input
            placeholder="Price"
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className="bg-input border-border text-foreground h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">{sellingAsset} Amount</label>
            <span className="text-xs text-muted-foreground">Available: {parseFloat(buyingBalance).toFixed(4)}</span>
          </div>
          <Input
            placeholder="Amount"
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="bg-input border-border text-foreground h-8 text-sm"
          />
        </div>

        <div className="flex gap-1">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocatePercentage(pct, buyingBalance, setBuyAmount)}
              className="flex-1 px-2 py-1 text-xs rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="bg-background/30 p-2 rounded text-xs">
          <p className="text-muted-foreground">Total: {buyTotal} {buyingAsset}</p>
        </div>

        <Button
          onClick={() => onBuyClick(buyPrice, buyAmount)}
          disabled={!buyPrice || !buyAmount}
          className="w-full h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
        >
          BUY {sellingAsset}
        </Button>
      </div>

      {/* Sell Form */}
      <div className="glow-border p-4 rounded-lg space-y-3">
        <h3 className="text-lg font-semibold text-destructive">SELL {sellingAsset}</h3>

        {bestBid && (
          <div className="text-xs text-muted-foreground">Best Bid: {parseFloat(bestBid).toFixed(6)} {buyingAsset}</div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Price ({buyingAsset})</label>
          <Input
            placeholder="Price"
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className="bg-input border-border text-foreground h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">{sellingAsset} Amount</label>
            <span className="text-xs text-muted-foreground">Available: {parseFloat(sellingBalance).toFixed(4)}</span>
          </div>
          <Input
            placeholder="Amount"
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            className="bg-input border-border text-foreground h-8 text-sm"
          />
        </div>

        <div className="flex gap-1">
          {[10, 50, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => allocatePercentage(pct, sellingBalance, setSellAmount)}
              className="flex-1 px-2 py-1 text-xs rounded border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="bg-background/30 p-2 rounded text-xs">
          <p className="text-muted-foreground">Total: {sellTotal} {buyingAsset}</p>
        </div>

        <Button
          onClick={() => onSellClick(sellPrice, sellAmount)}
          disabled={!sellPrice || !sellAmount}
          className="w-full h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
        >
          SELL {sellingAsset}
        </Button>
      </div>
    </div>
  );
}
