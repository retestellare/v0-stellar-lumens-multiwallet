'use client';

import React from 'react';
import { CheckCircle2, ArrowRightLeft } from 'lucide-react';

interface FilledOrder {
  id: string;
  price: string;
  baseAmount: string;
  counterAmount: string;
  baseCode: string;
  counterCode: string;
  timestamp: string;
  isBuyer: boolean;
}

interface FilledOrdersProps {
  orders: FilledOrder[];
  loading: boolean;
}

export function FilledOrders({ orders, loading }: FilledOrdersProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="glow-border p-8 rounded-lg text-center text-muted-foreground">
        <div className="animate-pulse">Loading trade history...</div>
      </div>
    );
  }

  return (
    <div className="glow-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-background/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">My Filled Orders</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your completed trades on the Stellar DEX
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{orders.length}</p>
            <p className="text-xs text-muted-foreground">trades</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No completed trades yet</p>
          <p className="text-sm mt-1">Your trade history will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-4 sm:p-5 hover:bg-background/50 transition-colors"
            >
              {/* Trade Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Left: Type & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold ${
                    order.isBuyer 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {order.isBuyer ? 'BUY' : 'SELL'}
                  </span>
                  
                  <div className="min-w-0 flex-1">
                    {/* Trade amounts */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-bold text-foreground">
                        {parseFloat(order.baseAmount).toFixed(4)}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{order.baseCode}</span>
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-lg sm:text-xl font-bold text-foreground">
                        {parseFloat(order.counterAmount).toFixed(4)}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{order.counterCode}</span>
                    </div>
                    
                    {/* Price */}
                    <p className="text-sm text-muted-foreground mt-1">
                      Price: <span className="font-mono text-foreground">{parseFloat(order.price).toFixed(7)}</span>
                    </p>
                  </div>
                </div>
                
                {/* Right: Time */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground">{formatTime(order.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
