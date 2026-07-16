'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown, RotateCw } from 'lucide-react';

interface ActiveOrder {
  id: string;
  type: 'buy' | 'sell';
  price: string;
  amount: string;
  filled: string;
  timestamp: string;
  sellingCode: string;
  sellingIssuer: string;
  buyingCode: string;
  buyingIssuer: string;
}

interface MyOrdersProps {
  orders: ActiveOrder[];
  loading: boolean;
  onCancelOrder: (id: string) => void;
  buyingAsset: string;
  sellingAsset: string;
}

// Truncate issuer for display
const truncateIssuer = (issuer: string) => {
  if (!issuer || issuer.length < 10) return '';
  return `${issuer.slice(0, 4)}...${issuer.slice(-4)}`;
};

export function MyOrders({ orders, loading, onCancelOrder }: MyOrdersProps) {
  const [reversedOrderIds, setReversedOrderIds] = useState<Set<string>>(new Set());

  const toggleReversed = (orderId: string) => {
    const newSet = new Set(reversedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setReversedOrderIds(newSet);
  };

  return (
    <div className="glow-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-background/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">My Active Orders</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {orders.length} open order{orders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-primary">
              <TrendingUp className="w-3.5 h-3.5" /> Buy
            </span>
            <span className="flex items-center gap-1.5 text-destructive">
              <TrendingDown className="w-3.5 h-3.5" /> Sell
            </span>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-pulse text-muted-foreground">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No active orders</p>
          <p className="text-sm mt-1">Place a buy or sell order to get started</p>
        </div>
      ) : (
        <div className="space-y-2 p-3 sm:p-4 max-h-[650px] overflow-y-auto">
          {orders.map((order: ActiveOrder, idx: number) => {
            const isBuy = order.type === 'buy';
            const price = parseFloat(order.price);
            const amount = parseFloat(order.amount);
            const isReversed = reversedOrderIds.has(order.id);
            
            const youGiveAmount = amount;
            const youGiveAsset = order.sellingCode;
            const youReceiveAmount = amount * price;
            const youReceiveAsset = order.buyingCode;
            
            let tradingPair = `${order.sellingCode} / ${order.buyingCode}`;
            let displayPrice = price;
            let priceText = `Price per ${order.sellingCode}`;
            let displayYouGiveAmount = youGiveAmount;
            let displayYouGiveAsset = youGiveAsset;
            let displayYouReceiveAmount = youReceiveAmount;
            let displayYouReceiveAsset = youReceiveAsset;
            
            if (isReversed && displayPrice > 0) {
              tradingPair = `${order.buyingCode} / ${order.sellingCode}`;
              displayPrice = 1 / price;
              priceText = `Price per ${order.buyingCode}`;
              displayYouGiveAmount = youReceiveAmount;
              displayYouGiveAsset = youReceiveAsset;
              displayYouReceiveAmount = youGiveAmount;
              displayYouReceiveAsset = youGiveAsset;
            }
            
            const remaining = amount - parseFloat(order.filled);
            const progress = (parseFloat(order.filled) / amount * 100);
            
            return (
              <div
                key={idx}
                className="rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 overflow-hidden hover:border-border/80 hover:shadow-lg transition-all duration-200 group"
              >
                {/* Top Accent Bar */}
                <div className={`h-1 ${isBuy ? 'bg-primary' : 'bg-destructive'}`} />
                
                <div className="p-4 space-y-3">
                  {/* Header: Badge + Trading Pair + Cancel Button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isBuy 
                          ? 'bg-primary/15 text-primary border border-primary/30' 
                          : 'bg-destructive/15 text-destructive border border-destructive/30'
                      }`}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                      <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{tradingPair}</span>
                      <p className="text-xs text-muted-foreground">
                        {truncateIssuer(order.sellingIssuer) || 'native'} / {truncateIssuer(order.buyingIssuer) || 'native'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelOrder(order.id)}
                      className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg transition-colors flex-shrink-0"
                      title="Cancel order"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Price Section with Reverse Button */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-background/50 border border-border/30">
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Exchange Rate</p>
                      <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                        {displayPrice.toFixed(7)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {isReversed ? order.sellingCode : order.buyingCode} per {isReversed ? order.buyingCode : order.sellingCode}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReversed(order.id)}
                      className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 text-primary hover:text-primary flex-shrink-0 transition-colors"
                      title="Reverse pair view"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Amount Flow Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* You Give (Selling) */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-destructive/5 border border-destructive/20">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center mt-0.5">
                        <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">You Sell</p>
                        <p className="text-sm font-bold font-mono text-destructive mt-0.5 truncate">
                          -{displayYouGiveAmount.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{displayYouGiveAsset}</p>
                      </div>
                    </div>
                    
                    {/* You Receive (Buying) */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-green-500/5 border border-green-500/20">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center mt-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">You Receive</p>
                        <p className="text-sm font-bold font-mono text-green-500 mt-0.5 truncate">
                          +{displayYouReceiveAmount.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{displayYouReceiveAsset}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Section */}
                  <div className="pt-2 space-y-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground font-medium">
                        Remaining: <span className="font-mono text-foreground">{remaining.toFixed(4)}</span> {order.sellingCode}
                      </span>
                      <span className={`font-bold ${progress > 0 ? isBuy ? 'text-primary' : 'text-destructive' : 'text-muted-foreground'}`}>
                        {progress.toFixed(1)}% filled
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isBuy ? 'bg-gradient-to-r from-primary to-primary/70' : 'bg-gradient-to-r from-destructive to-destructive/70'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
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
