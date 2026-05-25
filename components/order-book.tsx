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
  onBidClick?: (price: string, amount: string) => void;
  onAskClick?: (price: string, amount: string) => void;
}

export function OrderBook({
  bids,
  asks,
  loading,
  sellingAsset,
  buyingAsset,
  spread,
  bestBid,
  bestAsk,
  onBidClick,
  onAskClick
}: OrderBookProps) {
  // Merge orders for interleaved display
  // Bids: highest price at top (already sorted desc from API)
  // Asks: lowest price at top (already sorted asc from API) - DON'T reverse
  const maxRows = Math.max(bids.length, asks.length);
  const mergedOrders = Array.from({ length: maxRows }, (_, idx) => ({
    bid: bids[idx] || null,
    ask: asks[idx] || null, // Keep asks in natural order (lowest/best ask at top)
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
            {/* Column Headers - wider spacing on mobile */}
            <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border grid grid-cols-4 gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <div className="text-left">{sellingAsset}</div>
              <div className="text-center text-primary border-r border-border/50">Buy</div>
              <div className="text-center text-destructive">Sell</div>
              <div className="text-right">{sellingAsset}</div>
            </div>

            {/* Order Rows - improved mobile spacing */}
            <div className="max-h-[600px] overflow-y-auto">
              {mergedOrders.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-4 gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm border-b border-border/30 hover:bg-background/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (row.bid && onBidClick) {
                      onBidClick(row.bid.price, row.bid.amount);
                    }
                  }}
                >
                  {/* Bid Amount (Left) - edge aligned */}
                  <div className="text-left font-mono">
                    {row.bid ? (
                      <span className="text-blue-400">{parseFloat(row.bid.amount).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Bid Price (Center Left) */}
                  <div className="text-center font-mono font-semibold border-r border-border/50">
                    {row.bid ? (
                      <span className="text-primary">{parseFloat(row.bid.price).toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Price (Center Right) */}
                  <div
                    className="text-center font-mono font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (row.ask && onAskClick) {
                        onAskClick(row.ask.price, row.ask.amount);
                      }
                    }}
                  >
                    {row.ask ? (
                      <span className="text-destructive">{parseFloat(row.ask.price).toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Amount (Right) - edge aligned */}
                  <div className="text-right font-mono">
                    {row.ask ? (
                      <span className="text-pink-400">{parseFloat(row.ask.amount).toFixed(2)}</span>
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
