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

// Smart number formatting based on magnitude
function formatPrice(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  
  const absNum = Math.abs(num);
  
  // For very large numbers (like BTC prices), show fewer decimals
  if (absNum >= 100000) {
    return num.toFixed(0);
  } else if (absNum >= 10000) {
    return num.toFixed(1);
  } else if (absNum >= 1000) {
    return num.toFixed(2);
  } else if (absNum >= 100) {
    return num.toFixed(3);
  } else if (absNum >= 10) {
    return num.toFixed(4);
  } else if (absNum >= 1) {
    return num.toFixed(5);
  } else if (absNum >= 0.01) {
    return num.toFixed(6);
  } else {
    return num.toFixed(7);
  }
}

function formatAmount(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000) {
    return num.toFixed(0);
  } else if (absNum >= 100) {
    return num.toFixed(1);
  } else if (absNum >= 10) {
    return num.toFixed(2);
  } else if (absNum >= 1) {
    return num.toFixed(3);
  } else {
    return num.toFixed(4);
  }
}

function formatDiff(value: number): string {
  const absNum = Math.abs(value);
  
  if (absNum >= 10000) {
    return value.toFixed(0);
  } else if (absNum >= 1000) {
    return value.toFixed(1);
  } else if (absNum >= 100) {
    return value.toFixed(2);
  } else {
    return value.toFixed(4);
  }
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
  // NOTE: Stellar Horizon API semantics:
  // - bids.amount = counter_asset volume (XLM), already in the correct unit for display
  // - If calculating base_asset quantity for bids: bid.amount / bid.price
  const maxRows = Math.max(bids.length, asks.length);
  const mergedOrders = Array.from({ length: maxRows }, (_, idx) => ({
    bid: bids[idx] || null,
    ask: asks[idx] || null,
  }));

  const priceDiff = bestBid && bestAsk 
    ? parseFloat(bestAsk) - parseFloat(bestBid)
    : 0;

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
                {formatDiff(priceDiff)} {buyingAsset}
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
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border flex px-1 sm:px-2 py-3 text-[10px] sm:text-xs font-semibold">
              <div className="w-[22%] text-left text-blue-400 truncate">Bid Amt</div>
              <div className="w-[28%] text-right text-primary truncate pr-2">Bid</div>
              <div className="w-[28%] text-left text-destructive truncate pl-2">Ask</div>
              <div className="w-[22%] text-right text-pink-400 truncate">Ask Amt</div>
            </div>
            
            {/* Subheader showing base asset */}
            <div className="bg-background/80 border-b border-border/50 flex px-1 sm:px-2 py-1 text-[9px] sm:text-[10px] text-muted-foreground">
              <div className="w-[22%] text-left truncate">{sellingAsset}</div>
              <div className="w-[28%] text-right truncate pr-2">{buyingAsset}</div>
              <div className="w-[28%] text-left truncate pl-2">{buyingAsset}</div>
              <div className="w-[22%] text-right truncate">{sellingAsset}</div>
            </div>

            {/* Order Rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {mergedOrders.map((row, idx) => (
                <div
                  key={idx}
                  className="flex px-1 sm:px-2 py-1.5 text-[11px] sm:text-xs border-b border-border/20 hover:bg-primary/5 transition-colors"
                >
                  {/* Bid Amount - Click to SELL */}
                  {/* Stellar: bid.amount = counter_asset volume (XLM), displayed directly */}
                  <div 
                    className="w-[22%] text-left font-mono cursor-pointer hover:bg-blue-500/10 rounded truncate"
                    onClick={() => row.bid && onBidClick?.(row.bid.price, row.bid.amount)}
                    title={row.bid ? row.bid.amount : undefined}
                  >
                    {row.bid ? (
                      <span className="text-blue-400 font-medium">{formatAmount(row.bid.amount)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Bid Price */}
                  <div 
                    className="w-[28%] text-right font-mono cursor-pointer hover:bg-primary/10 rounded pr-2 truncate"
                    onClick={() => row.bid && onBidClick?.(row.bid.price, row.bid.amount)}
                    title={row.bid ? row.bid.price : undefined}
                  >
                    {row.bid ? (
                      <span className="text-primary font-semibold">{formatPrice(row.bid.price)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Price */}
                  <div 
                    className="w-[28%] text-left font-mono cursor-pointer hover:bg-destructive/10 rounded pl-2 truncate"
                    onClick={() => row.ask && onAskClick?.(row.ask.price, row.ask.amount)}
                    title={row.ask ? row.ask.price : undefined}
                  >
                    {row.ask ? (
                      <span className="text-destructive font-semibold">{formatPrice(row.ask.price)}</span>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </div>

                  {/* Ask Amount - Click to BUY */}
                  <div 
                    className="w-[22%] text-right font-mono cursor-pointer hover:bg-pink-500/10 rounded truncate"
                    onClick={() => row.ask && onAskClick?.(row.ask.price, row.ask.amount)}
                    title={row.ask ? row.ask.amount : undefined}
                  >
                    {row.ask ? (
                      <span className="text-pink-400 font-medium">{formatAmount(row.ask.amount)}</span>
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
      <div className="flex justify-center gap-4 sm:gap-6 text-[10px] sm:text-xs text-muted-foreground">
        <span><span className="text-blue-400">Bid</span> = Buyers (click to sell)</span>
        <span><span className="text-pink-400">Ask</span> = Sellers (click to buy)</span>
      </div>
    </div>
  );
}
