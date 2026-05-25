'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';

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
      <div className="glow-border p-6 rounded-lg text-center text-muted-foreground">
        <div className="animate-pulse">Loading filled orders...</div>
      </div>
    );
  }

  return (
    <div className="glow-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          My Filled Orders
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Your completed trades on the Stellar DEX
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          No filled orders found
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_1fr_80px] sm:grid-cols-[70px_1fr_1fr_1fr_100px] gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-medium text-muted-foreground bg-background/50 border-b border-border min-w-[320px]">
            <div>Type</div>
            <div className="text-right">Base</div>
            <div className="text-right">Counter</div>
            <div className="hidden sm:block text-right">Price</div>
            <div className="text-right">Time</div>
          </div>

          {/* Orders */}
          <div className="max-h-[400px] overflow-y-auto">
            {orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-[60px_1fr_1fr_80px] sm:grid-cols-[70px_1fr_1fr_1fr_100px] gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs border-b border-border/30 hover:bg-background/50 min-w-[320px]"
              >
                <div className={`font-medium ${order.isBuyer ? 'text-primary' : 'text-destructive'}`}>
                  {order.isBuyer ? 'BUY' : 'SELL'}
                </div>
                <div className="text-right font-mono truncate">
                  <span className="text-foreground">{parseFloat(order.baseAmount).toFixed(2)}</span>
                  <span className="text-muted-foreground text-[9px] sm:text-[10px] ml-0.5">{order.baseCode}</span>
                </div>
                <div className="text-right font-mono truncate">
                  <span className="text-foreground">{parseFloat(order.counterAmount).toFixed(2)}</span>
                  <span className="text-muted-foreground text-[9px] sm:text-[10px] ml-0.5">{order.counterCode}</span>
                </div>
                <div className="hidden sm:block text-right font-mono text-foreground">
                  {parseFloat(order.price).toFixed(7)}
                </div>
                <div className="text-right text-muted-foreground text-[9px] sm:text-[10px]">
                  {formatTime(order.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
