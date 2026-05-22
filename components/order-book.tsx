'use client';

import React from 'react';

interface OrderBookProps {
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
  loading: boolean;
  sellingAsset: string;
  buyingAsset: string;
  spread: number;
  bestBid: string | null;
  bestAsk: string | null;
}

export function OrderBook({
  bids,
  asks,
  loading,
  sellingAsset,
  buyingAsset,
  spread,
  bestBid,
  bestAsk
}: OrderBookProps) {
  return (
    <div className="space-y-6">
      {/* Spread Info */}
      <div className="glow-border p-4 rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-2">Spread</p>
        <p className="text-2xl font-bold text-accent">{spread.toFixed(3)}%</p>
        {bestBid && bestAsk && (
          <p className="text-xs text-muted-foreground mt-2">
            {parseFloat(bestAsk) - parseFloat(bestBid)} {buyingAsset}
          </p>
        )}
      </div>

      {/* Order Book Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bids */}
        <div className="glow-border p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-primary">Amount ({sellingAsset})</h3>
          <div className="flex justify-between mb-4 px-2">
            <span className="text-xs font-medium text-muted-foreground">Buy Price ({buyingAsset})</span>
            <span className="text-xs font-medium text-muted-foreground">Amount ({sellingAsset})</span>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : bids.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No buy orders</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {bids.slice(0, 30).map((bid: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-primary/5 hover:bg-primary/10 rounded transition-colors border border-primary/20 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-primary">
                    {parseFloat(bid.price).toFixed(8)}
                  </span>
                  <span className="text-xs text-foreground font-medium">
                    {parseFloat(bid.amount).toFixed(4)}
                  </span>
                  <span className="text-xs text-primary/70">
                    {(parseFloat(bid.price) * parseFloat(bid.amount)).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Asks */}
        <div className="glow-border p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-destructive">Sell Price ({buyingAsset})</h3>
          <div className="flex justify-between mb-4 px-2">
            <span className="text-xs font-medium text-muted-foreground">Sell Price ({buyingAsset})</span>
            <span className="text-xs font-medium text-muted-foreground">Amount ({sellingAsset})</span>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : asks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sell orders</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {asks.slice(0, 30).map((ask: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-destructive/5 hover:bg-destructive/10 rounded transition-colors border border-destructive/20 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-destructive">
                    {parseFloat(ask.price).toFixed(8)}
                  </span>
                  <span className="text-xs text-foreground font-medium">
                    {parseFloat(ask.amount).toFixed(4)}
                  </span>
                  <span className="text-xs text-destructive/70">
                    {(parseFloat(ask.price) * parseFloat(ask.amount)).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
