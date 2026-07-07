'use client';

import React, { useState } from 'react';
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Clock, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilledOrder {
  id: string;
  price: string;
  baseAmount: string;
  counterAmount: string;
  baseCode: string;
  counterCode: string;
  timestamp: string;
  isBuyer: boolean;
  isLPTrade?: boolean; // Flag for liquidity pool trades
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

// Helper function to determine if an asset is a primary/quote asset
function isPrimaryAsset(assetCode: string): boolean {
  const primaryAssets = ['XLM', 'USD', 'USDC', 'USDT', 'EUR', 'GBP', 'JPY'];
  return primaryAssets.includes(assetCode.toUpperCase());
}

export function FilledOrders({ orders, loading }: FilledOrdersProps) {
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
            const baseAmt = parseFloat(order.baseAmount);
            const counterAmt = parseFloat(order.counterAmount);
            
            // Determine normalization: primary asset should always be quote (denominator)
            const basePrimary = isPrimaryAsset(order.baseCode);
            const counterPrimary = isPrimaryAsset(order.counterCode);
            
            // If base is primary and counter is secondary, or both/neither are primary, keep as-is
            // If counter is primary and base is secondary, swap for display
            const shouldSwap = counterPrimary && !basePrimary;
            
            // Normalized values for consistent display
            const displayBaseCode = shouldSwap ? order.counterCode : order.baseCode;
            const displayCounterCode = shouldSwap ? order.baseCode : order.counterCode;
            const displayBaseAmount = shouldSwap ? counterAmt : baseAmt;
            const displayCounterAmount = shouldSwap ? baseAmt : counterAmt;
            
            // Trading pair display (normalized: base / quote)
            const tradingPair = `${displayBaseCode} / ${displayCounterCode}`;
            
            // Price calculation: Price = Quote / Base
            const displayPrice = displayBaseAmount > 0 ? (displayCounterAmount / displayBaseAmount) : 0;
            
            // Determine if user was a buyer based on NORMALIZED view
            // In normalized view: if user bought base (received more base than paid), it's a BUY
            // If shouldSwap, we need to invert the isBuyer logic
            const userWasBuyer = shouldSwap ? !order.isBuyer : order.isBuyer;
            
            // What was sold and received (in normalized terms)
            const soldAsset = userWasBuyer ? displayCounterCode : displayBaseCode;
            const soldAmount = userWasBuyer ? displayCounterAmount : displayBaseAmount;
            const receivedAsset = userWasBuyer ? displayBaseCode : displayCounterCode;
            const receivedAmount = userWasBuyer ? displayBaseAmount : displayCounterAmount;
            
            // Calculate display values based on reversed state
            const isReversed = reversedOrderIds.has(order.id);
            
            // Reversed view: flip the pair and invert the price
            const finalDisplayBaseCode = isReversed ? displayCounterCode : displayBaseCode;
            const finalDisplayCounterCode = isReversed ? displayBaseCode : displayCounterCode;
            const finalDisplayPrice = isReversed && displayPrice > 0 ? (1 / displayPrice) : displayPrice;
            const finalTradingPair = `${finalDisplayBaseCode} / ${finalDisplayCounterCode}`;
            
            return (
              <div
                key={order.id}
                className={`p-3 sm:p-4 ${
                  userWasBuyer ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-destructive'
                } hover:bg-muted/30 transition-colors`}
              >
                {/* Header Row: Trading Pair + Badge + Time */}
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      userWasBuyer 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {userWasBuyer ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-sm font-bold text-foreground">{finalTradingPair}</span>
                    {order.isLPTrade && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                        LP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">{formatTime(order.timestamp)}</span>
                    <span className="sm:hidden">{new Date(order.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Price Per Unit with Reverse View Button */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Price: </span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatSmartNumber(finalDisplayPrice)} {finalDisplayCounterCode}/{finalDisplayBaseCode}
                    </span>
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
