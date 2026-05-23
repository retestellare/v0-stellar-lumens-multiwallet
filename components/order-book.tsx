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
  // Merge and sort orders for interleaved display
  const maxRows = Math.max(bids.length, asks.length);
  const mergedOrders = Array.from({ length: maxRows }, (_, idx) => ({
    bid: bids[idx] || null,
    ask: asks[asks.length - 1 - idx] || null, // Reverse asks for best at top
  }));

  return (
    <div className="space-y-4">
      {/* Spread Info Header */}
      <div className="glow-border p-3 rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Spread: <span className="text-primary font-semibold">{spread.toFixed(3)}%</span>
          </p>
          {bestBid && bestAsk && (
            <p className="text-xs text-muted-foreground">
              Diff: <span className="text-accent font-semibold">
                {(parseFloat(bestAsk) - parseFloat(bestBid)).toFixed(8)} {buyingAsset}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Order Book Table */}
      <div className="glow-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading order book...</div>
        ) : bids.length === 0 && asks.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No orders available</div>
        ) : (
          <div className="overflow-x-auto">
            {/* Column Headers */}
            <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border grid grid-cols-4 gap-0 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div className="text-right pr-2">Amount ({sellingAsset})</div>
              <div className="text-right pr-2 text-primary">Buy ({buyingAsset})</div>
              <div className="text-left pl-2 text-destructive">Sell ({buyingAsset})</div>
              <div className="text-left pl-2">Amount ({sellingAsset})</div>
            </div>

            {/* Order Rows */}
            <div className="max-h-[600px] overflow-y-auto">
              {mergedOrders.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-4 gap-0 px-3 py-2 text-xs border-b border-border/30 hover:bg-background/50 transition-colors"
                >
                  {/* Bid Amount (Left) */}
                  <div className="text-right pr-2 font-mono">
                    {row.bid ? (
                      <span className="text-blue-400">{parseFloat(row.bid.amount).toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Bid Price (Center Left) */}
                  <div className="text-right pr-2 font-mono font-semibold">
                    {row.bid ? (
                      <span className="text-primary">{parseFloat(row.bid.price).toFixed(8)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Price (Center Right) */}
                  <div className="text-left pl-2 font-mono font-semibold">
                    {row.ask ? (
                      <span className="text-destructive">{parseFloat(row.ask.price).toFixed(8)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Amount (Right) */}
                  <div className="text-left pl-2 font-mono">
                    {row.ask ? (
                      <span className="text-pink-400">{parseFloat(row.ask.amount).toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
