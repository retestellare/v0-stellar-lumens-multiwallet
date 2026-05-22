'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OrderFormProps {
  sellingAsset: string;
  buyingAsset: string;
  sellingBalance: string;
  buyingBalance: string;
  onBuyClick: (price: string, amount: string) => void;
  onSellClick: (price: string, amount: string) => void;
}

export function OrderForm({
  sellingAsset,
  buyingAsset,
  sellingBalance,
  buyingBalance,
  onBuyClick,
  onSellClick
}: OrderFormProps) {
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');

  const sellBalanceNum = parseFloat(sellingBalance) || 0;
  const buyBalanceNum = parseFloat(buyingBalance) || 0;

  const setAmountPercentage = (percent: number, isBuy: boolean) => {
    if (isBuy) {
      setBuyAmount((buyBalanceNum * percent / 100).toFixed(4));
    } else {
      setSellAmount((sellBalanceNum * percent / 100).toFixed(4));
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Buy Section */}
      <div className="glow-border p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-bold text-primary">BUY {sellingAsset}</h3>
        
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Price (in {buyingAsset})</label>
          <Input
            type="number"
            placeholder="Enter price"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">{sellingAsset} Amount</label>
            <span className="text-xs text-muted-foreground">Avail: {parseFloat(sellingBalance).toFixed(4)}</span>
          </div>
          <Input
            type="number"
            placeholder="Enter amount"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{buyingAsset} Amount</label>
          <p className="text-sm font-semibold text-foreground">
            {(parseFloat(buyPrice) * parseFloat(buyAmount) || 0).toFixed(4)} {buyingAsset}
          </p>
          <p className="text-xs text-muted-foreground">Avail: {parseFloat(buyingBalance).toFixed(4)}</p>
        </div>

        <div className="flex gap-2">
          {[10, 50, 100].map((pct) => (
            <Button
              key={pct}
              variant="outline"
              size="sm"
              onClick={() => setAmountPercentage(pct, true)}
              className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
            >
              {pct}%
            </Button>
          ))}
          <span className="flex items-center text-sm text-muted-foreground">{sellingAsset}</span>
        </div>

        <Button
          onClick={() => onBuyClick(buyPrice, buyAmount)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base py-6"
        >
          BUY {sellingAsset}
        </Button>
      </div>

      {/* Sell Section */}
      <div className="glow-border p-6 rounded-lg space-y-4 border-destructive/30">
        <h3 className="text-lg font-bold text-destructive">SELL {sellingAsset}</h3>
        
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Price (in {buyingAsset})</label>
          <Input
            type="number"
            placeholder="Enter price"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">{sellingAsset} Amount</label>
            <span className="text-xs text-muted-foreground">Avail: {parseFloat(sellingBalance).toFixed(4)}</span>
          </div>
          <Input
            type="number"
            placeholder="Enter amount"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{buyingAsset} Amount</label>
          <p className="text-sm font-semibold text-foreground">
            {(parseFloat(sellPrice) * parseFloat(sellAmount) || 0).toFixed(4)} {buyingAsset}
          </p>
          <p className="text-xs text-muted-foreground">Avail: {parseFloat(buyingBalance).toFixed(4)}</p>
        </div>

        <div className="flex gap-2">
          {[10, 50, 100].map((pct) => (
            <Button
              key={pct}
              variant="outline"
              size="sm"
              onClick={() => setAmountPercentage(pct, false)}
              className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {pct}%
            </Button>
          ))}
          <span className="flex items-center text-sm text-muted-foreground">{sellingAsset}</span>
        </div>

        <Button
          onClick={() => onSellClick(sellPrice, sellAmount)}
          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-base py-6"
        >
          SELL {sellingAsset}
        </Button>
      </div>
    </div>
  );
}
