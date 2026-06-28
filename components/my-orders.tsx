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
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {orders.map((order: ActiveOrder, idx: number) => {
            const isBuy = order.type === 'buy';
            const price = parseFloat(order.price);
            const amount = parseFloat(order.amount);
            const isReversed = reversedOrderIds.has(order.id);
            
            // Calculate what you give and what you receive
            // For a SELL: you give sellingCode, you receive buyingCode
            // For a BUY: you give buyingCode (pay), you receive sellingCode
            // Stellar offers: amount is always in selling asset, price is buying/selling ratio
            const youGiveAmount = amount;
            const youGiveAsset = order.sellingCode;
            const youReceiveAmount = amount * price;
            const youReceiveAsset = order.buyingCode;
            
            // Trading pair display
            let tradingPair = `${order.sellingCode} / ${order.buyingCode}`;
            let displayPrice = price;
            let priceText = `Price per ${order.sellingCode}: `;
            let displayYouGiveAmount = youGiveAmount;
            let displayYouGiveAsset = youGiveAsset;
            let displayYouReceiveAmount = youReceiveAmount;
            let displayYouReceiveAsset = youReceiveAsset;
            
            // Apply reversed view if toggled
            if (isReversed && displayPrice > 0) {
              tradingPair = `${order.buyingCode} / ${order.sellingCode}`;
              displayPrice = 1 / price;
              priceText = `Price per ${order.buyingCode}: `;
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
                className={`p-4 sm:p-5 ${
                  isBuy ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-destructive'
                } hover:bg-muted/30 transition-colors`}
              >
                {/* Trading Pair Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                      isBuy ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                    }`}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-foreground">{tradingPair}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelOrder(order.id)}
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Issuer Info */}
                <p className="text-xs text-muted-foreground mb-4">
                  {truncateIssuer(order.sellingIssuer) || 'native'} / {truncateIssuer(order.buyingIssuer) || 'native'}
                </p>
                
                {/* Price Per Unit */}
                <div className="mb-4 text-sm flex items-center justify-between gap-2">
                  <div>
                    <span className="text-muted-foreground">{priceText}</span>
                    <span className="font-mono font-semibold text-foreground">{displayPrice.toFixed(7)} {isReversed ? order.sellingCode : order.buyingCode}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReversed(order.id)}
                    className="h-6 w-6 p-0 rounded-full hover:bg-primary/20 text-primary flex-shrink-0"
                    title="Reverse view"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
                
                {/* Amount Flow - What you give/receive */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  {/* You Give (Selling) */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="text-xl sm:text-2xl font-bold font-mono">
                        -{displayYouGiveAmount.toFixed(4)}
                      </span>
                      <span className="text-sm font-medium">{displayYouGiveAsset}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">You sell</p>
                  </div>
                  
                  {/* You Receive (Buying) */}
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-2 text-green-500">
                      <ArrowDownRight className="w-4 h-4" />
                      <span className="text-xl sm:text-2xl font-bold font-mono">
                        +{displayYouReceiveAmount.toFixed(4)}
                      </span>
                      <span className="text-sm font-medium">{displayYouReceiveAsset}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mr-6">You receive</p>
                  </div>
                </div>
                
                {/* Progress Section */}
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Remaining: <span className="font-mono font-medium text-foreground">{(isReversed ? displayYouReceiveAmount : remaining).toFixed(4)}</span> {isReversed ? displayYouReceiveAsset : order.sellingCode}
                    </span>
                    <span className={`font-bold ${progress > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {progress.toFixed(0)}% filled
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isBuy ? 'bg-primary' : 'bg-destructive'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
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
