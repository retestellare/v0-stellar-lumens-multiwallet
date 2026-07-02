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

  // Calculate max amounts for proportional depth visualization
  // For bids, calculate base asset amount: bid.amount / bid.price
  const maxAmountBids = bids.length > 0 
    ? Math.max(...bids.map(b => {
        const price = parseFloat(b.price) || 1;
        const amount = parseFloat(b.amount) || 0;
        return (amount / price) || 0;
      }), 1)
    : 1;
  const maxAmountAsks = asks.length > 0
    ? Math.max(...asks.map(a => parseFloat(a.amount) || 0), 1)
    : 1;

  const priceDiff = bestBid && bestAsk
    ? parseFloat(bestAsk) - parseFloat(bestBid)
    : 0;

  const midPrice = bestBid && bestAsk
    ? (parseFloat(bestBid) + parseFloat(bestAsk)) / 2
    : null;

  return (
    <div className="space-y-3">
      {/* Price Summary Header */}
      <div className="glow-border rounded-xl overflow-hidden">
        {/* Mid / Current Price — prominent top strip */}
        {midPrice !== null && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 border-b border-primary/20">
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest">Current Price</span>
            <span className="text-base sm:text-lg font-bold text-primary tabular-nums">
              {formatPrice(midPrice.toString())}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{buyingAsset}</span>
          </div>
        )}

        {/* Bid / Spread / Ask row */}
        <div className="grid grid-cols-3 divide-x divide-border/30 bg-background/40">
          <div className="flex flex-col items-center gap-0.5 py-3 px-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best Bid</p>
            <p className="text-sm font-bold text-blue-400 tabular-nums">
              {bestBid ? formatPrice(bestBid) : '—'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-3 px-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spread</p>
            <p className="text-sm font-bold text-primary tabular-nums">
              {spread.toFixed(3)}%
            </p>
            {priceDiff !== 0 && (
              <p className="text-[9px] text-muted-foreground tabular-nums">{formatDiff(priceDiff)} {buyingAsset}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 py-3 px-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best Ask</p>
            <p className="text-sm font-bold text-pink-400 tabular-nums">
              {bestAsk ? formatPrice(bestAsk) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Order Book Table */}
      <div className="glow-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading order book...</div>
        ) : bids.length === 0 && asks.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No orders available</div>
        ) : (
          <div className="bg-background/50">
            {/* Column Headers */}
            <div className="grid grid-cols-4 text-[10px] font-semibold text-muted-foreground px-2 py-2.5 border-b border-border/40 bg-background/70 uppercase tracking-wide">
              <div className="text-left pl-1">Amt ({sellingAsset})</div>
              <div className="text-right pr-1">Bid ({buyingAsset})</div>
              <div className="text-left pl-1">Ask ({buyingAsset})</div>
              <div className="text-right pr-1">Amt ({sellingAsset})</div>
            </div>

            {/* Order Rows */}
            <div className="max-h-[500px] overflow-y-auto space-y-0.5">
              {mergedOrders.map((row, idx) => {
                // Calculate depth percentages based on actual max amounts
                // For bids, use calculated base asset amount: bid.amount / bid.price
                const bidForgeAmount = row.bid ? (parseFloat(row.bid.amount) / parseFloat(row.bid.price)) : 0;
                const bidDepthWidth = row.bid ? (bidForgeAmount / maxAmountBids) * 100 : 0;
                const askDepthWidth = row.ask ? (parseFloat(row.ask.amount) / maxAmountAsks) * 100 : 0;

                return (
                  <div key={idx} className="grid grid-cols-4 gap-0 text-[11px] sm:text-xs font-mono">
                      {/* LEFT SIDE - BIDS (base amount on left, price on right) */}
                    <div 
                      className="col-span-2 grid grid-cols-2"
                      style={{
                        background: row.bid ? `linear-gradient(to left, rgba(59, 130, 246, 0.2) ${bidDepthWidth}%, transparent ${bidDepthWidth}%)` : 'transparent'
                      }}
                    >
                      {/* Bid Amount */}
                      <div 
                        className="py-1.5 px-2 text-left text-gray-300 hover:bg-blue-500/10 cursor-pointer transition-colors"
                        onClick={() => row.bid && onBidClick?.(row.bid.price, row.bid.amount)}
                        title={row.bid ? `Price: ${row.bid.price}, Amount: ${row.bid.amount}` : undefined}
                      >
                        {row.bid ? formatAmount((parseFloat(row.bid.amount) / parseFloat(row.bid.price)).toFixed(3)) : '-'}
                      </div>

                      {/* Bid Price */}
                      <div 
                        className="py-1.5 px-2 text-right text-blue-400 font-medium hover:bg-blue-500/10 cursor-pointer transition-colors"
                        onClick={() => row.bid && onBidClick?.(row.bid.price, row.bid.amount)}
                        title={row.bid ? `Price: ${row.bid.price}, Amount: ${row.bid.amount}` : undefined}
                      >
                        {row.bid ? formatPrice(row.bid.price) : '-'}
                      </div>
                    </div>

                    {/* RIGHT SIDE - ASKS (Price on left, Amount on right) with gradient spanning both */}
                    <div 
                      className="col-span-2 grid grid-cols-2"
                      style={{
                        background: row.ask ? `linear-gradient(to right, rgba(239, 68, 68, 0.2) ${askDepthWidth}%, transparent ${askDepthWidth}%)` : 'transparent'
                      }}
                    >
                      {/* Ask Price */}
                      <div 
                        className="py-1.5 px-2 text-left text-pink-400 font-medium hover:bg-pink-500/10 cursor-pointer transition-colors"
                        onClick={() => row.ask && onAskClick?.(row.ask.price, row.ask.amount)}
                        title={row.ask ? `Price: ${row.ask.price}, Amount: ${row.ask.amount}` : undefined}
                      >
                        {row.ask ? formatPrice(row.ask.price) : '-'}
                      </div>

                      {/* Ask Amount */}
                      <div 
                        className="py-1.5 px-2 text-right text-gray-300 hover:bg-pink-500/10 cursor-pointer transition-colors"
                        onClick={() => row.ask && onAskClick?.(row.ask.price, row.ask.amount)}
                        title={row.ask ? `Price: ${row.ask.price}, Amount: ${row.ask.amount}` : undefined}
                      >
                        {row.ask ? formatAmount(row.ask.amount) : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
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
