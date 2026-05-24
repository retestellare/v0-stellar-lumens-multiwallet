'use client';

import React from 'react';

interface Trade {
  id: string;
  price: string;
  amount: string;
  timestamp: string;
  direction: 'buy' | 'sell';
}

interface TradeHistoryProps {
  trades: Trade[];
  loading: boolean;
  buyingAsset: string;
  sellingAsset: string;
}

export function TradeHistory({ trades, loading, buyingAsset, sellingAsset }: TradeHistoryProps) {
  return (
    <div className="glow-border p-6 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-foreground">All Trades</h3>
      
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : trades.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No trades yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted-foreground font-medium">Price ({buyingAsset})</th>
                <th className="text-left py-3 px-3 text-muted-foreground font-medium">Amount ({sellingAsset})</th>
                <th className="text-left py-3 px-3 text-muted-foreground font-medium">Total ({buyingAsset})</th>
                <th className="text-left py-3 px-3 text-muted-foreground font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade: Trade, idx: number) => {
                const total = (parseFloat(trade.price) * parseFloat(trade.amount)).toFixed(4);
                const date = new Date(trade.timestamp);
                const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <tr key={idx} className="border-b border-border/50 hover:bg-background/50 transition-colors">
                    <td className={`py-3 px-3 font-semibold ${trade.direction === 'buy' ? 'text-primary' : 'text-destructive'}`}>
                      {parseFloat(trade.price).toFixed(6)}
                    </td>
                    <td className="py-3 px-3 text-foreground">{parseFloat(trade.amount).toFixed(4)}</td>
                    <td className="py-3 px-3 text-accent">{total}</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">{time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
