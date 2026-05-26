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
  // Asks: lowest price at top (already sorted asc from API)
  const maxRows = Math.max(bids.length, asks.length);
  const mergedOrders = Array.from({ length: maxRows }, (_, idx) => ({
    bid: bids[idx] || null,
    ask: asks[idx] || null,
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
                {(parseFloat(bestAsk) - parseFloat(bestBid)).toFixed(4)} {buyingAsset}
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
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border grid grid-cols-4 px-2 sm:px-4 py-3 text-xs font-semibold">
              <div className="text-left text-blue-400">Bid Amt</div>
              <div className="text-center text-primary">Bid ({buyingAsset})</div>
              <div className="text-center text-destructive">Ask ({buyingAsset})</div>
              <div className="text-right text-pink-400">Ask Amt</div>
            </div>
            
            {/* Subheader showing base asset */}
            <div className="bg-background/80 border-b border-border/50 grid grid-cols-4 px-2 sm:px-4 py-1 text-[10px] text-muted-foreground">
              <div className="text-left">{sellingAsset}</div>
              <div className="text-center">Price</div>
              <div className="text-center">Price</div>
              <div className="text-right">{sellingAsset}</div>
            </div>

            {/* Order Rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {mergedOrders.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-4 px-2 sm:px-4 py-2 text-sm border-b border-border/20 hover:bg-primary/5 transition-colors"
                >
                  {/* Bid Amount - Click to SELL */}
                  <div 
                    className="text-left font-mono cursor-pointer hover:bg-blue-500/10 rounded px-1 -mx-1"
                    onClick={() => row.bid && onBidClick?.(row.bid.price, row.bid.amount)}
                  >
                    {row.bid ? (
                      <span className="text-blue-400 font-medium">{parseFloat(row.bid.amount).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Bid Price */}
                  <div 
                    className="text-center font-mono cursor-pointer hover:bg-primary/10 rounded"
                    onClick={() => row.bid && onBidClick?.(row.bid.price, row.bid.amount)}
                  >
                    {row.bid ? (
                      <span className="text-primary font-semibold">{parseFloat(row.bid.price).toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Price */}
                  <div 
                    className="text-center font-mono cursor-pointer hover:bg-destructive/10 rounded"
                    onClick={() => row.ask && onAskClick?.(row.ask.price, row.ask.amount)}
                  >
                    {row.ask ? (
                      <span className="text-destructive font-semibold">{parseFloat(row.ask.price).toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Amount - Click to BUY */}
                  <div 
                    className="text-right font-mono cursor-pointer hover:bg-pink-500/10 rounded px-1 -mx-1"
                    onClick={() => row.ask && onAskClick?.(row.ask.price, row.ask.amount)}
                  >
                    {row.ask ? (
                      <span className="text-pink-400 font-medium">{parseFloat(row.ask.amount).toFixed(2)}</span>
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
      
      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        <span><span className="text-blue-400">Bid</span> = Buyers (click to sell)</span>
        <span><span className="text-pink-400">Ask</span> = Sellers (click to buy)</span>
      </div>
    </div>
  );
}
