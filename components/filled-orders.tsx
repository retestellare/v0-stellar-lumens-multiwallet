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
      <div className="p-4 sm:p-5 border-b border-border bg-background/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">Trade History</h3>
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
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No completed trades yet</p>
          <p className="text-sm mt-1">Your trade history will appear here</p>
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
                className={`p-4 sm:p-5 ${
                  order.isBuyer ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-destructive'
                } hover:bg-muted/30 transition-colors`}
              >
                {/* Header Row: Trading Pair + Badge + Time */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                      order.isBuyer 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {order.isBuyer ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-foreground">{tradingPair}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(order.timestamp)}</span>
                  </div>
                </div>
                
                {/* Price Per Unit */}
                <div className="mb-4 text-sm">
                  <span className="text-muted-foreground">Price per {order.baseCode}: </span>
                  <span className="font-mono font-semibold text-foreground">{pricePerUnit.toFixed(7)} {order.counterCode}</span>
                </div>
                
                {/* Amount Flow - What you sold/received */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/30">
                  {/* You Sold */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <ArrowUpRight className="w-5 h-5" />
                      <span className="text-xl sm:text-2xl font-bold font-mono">
                        -{soldAmount.toFixed(4)}
                      </span>
                      <span className="text-sm font-medium">{soldAsset}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-7">You paid</p>
                  </div>
                  
                  {/* You Received */}
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-2 text-green-500">
                      <ArrowDownRight className="w-5 h-5" />
                      <span className="text-xl sm:text-2xl font-bold font-mono">
                        +{receivedAmount.toFixed(4)}
                      </span>
                      <span className="text-sm font-medium">{receivedAsset}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mr-7">You received</p>
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
