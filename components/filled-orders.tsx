'use client';

import React from 'react';
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

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

// Smart number formatting based on magnitude
function formatSmartNumber(value: number, maxDecimals = 7): string {
  if (isNaN(value) || value === 0) return '0';
  const absVal = Math.abs(value);
  
  if (absVal >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (absVal >= 10000) return (value / 1000).toFixed(1) + 'K';
  if (absVal >= 1000) return value.toFixed(0);
  if (absVal >= 100) return value.toFixed(2);
  if (absVal >= 1) return value.toFixed(4);
  if (absVal >= 0.01) return value.toFixed(6);
  return value.toFixed(maxDecimals);
}

export function FilledOrders({ orders, loading }: FilledOrdersProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
      <div className="p-4 border-b border-border bg-background/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Trade History</h3>
              <p className="text-xs text-muted-foreground">Completed trades</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">{orders.length}</p>
            <p className="text-xs text-muted-foreground">trades</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No completed trades yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30 max-h-[600px] overflow-y-auto">
          {orders.map((order) => {
            // Trading pair
            const tradingPair = `${order.baseCode} / ${order.counterCode}`;
            
            // Calculate price per base unit
            const baseAmt = parseFloat(order.baseAmount);
            const counterAmt = parseFloat(order.counterAmount);
            const pricePerUnit = baseAmt > 0 ? (counterAmt / baseAmt) : 0;
            
            // What you sold (-) and what you received (+)
            // If isBuyer: you bought base (received base, paid counter)
            // If seller: you sold base (paid base, received counter)
            const soldAmount = order.isBuyer ? counterAmt : baseAmt;
            const soldAsset = order.isBuyer ? order.counterCode : order.baseCode;
            const receivedAmount = order.isBuyer ? baseAmt : counterAmt;
            const receivedAsset = order.isBuyer ? order.baseCode : order.counterCode;
            
            return (
              <div
                key={order.id}
                className={`p-3 sm:p-4 ${
                  order.isBuyer ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-destructive'
                } hover:bg-muted/30 transition-colors`}
              >
                {/* Header Row: Trading Pair + Badge + Time */}
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      order.isBuyer 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {order.isBuyer ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-sm font-bold text-foreground">{tradingPair}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">{formatTime(order.timestamp)}</span>
                    <span className="sm:hidden">{new Date(order.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Price Per Unit */}
                <div className="mb-3 text-xs">
                  <span className="text-muted-foreground">Price: </span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatSmartNumber(pricePerUnit)} {order.counterCode}
                  </span>
                </div>
                
                {/* Amount Flow - Stacked on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/30">
                  {/* You Sold */}
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-destructive flex-shrink-0" />
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-bold font-mono text-destructive">
                        -{formatSmartNumber(soldAmount)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{soldAsset}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1">Sold</span>
                  </div>
                  
                  {/* You Received */}
                  <div className="flex items-center gap-2 sm:justify-end">
                    <ArrowDownRight className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-bold font-mono text-green-500">
                        +{formatSmartNumber(receivedAmount)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{receivedAsset}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1">Received</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
