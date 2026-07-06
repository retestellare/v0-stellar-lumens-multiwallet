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

  // Determine if the trade is a BUY or SELL based on XLM as the base asset
  const determineTradeType = (order: FilledOrder): 'BUY' | 'SELL' => {
    // XLM is the base asset for all trades
    const xlmIsBase = order.baseCode === 'XLM';
    const xlmIsCounter = order.counterCode === 'XLM';

    if (xlmIsBase) {
      // XLM is the base asset
      // If isBuyer=true: user bought base (XLM), so it's a BUY
      // If isBuyer=false: user sold base (XLM), so it's a SELL
      return order.isBuyer ? 'BUY' : 'SELL';
    } else if (xlmIsCounter) {
      // XLM is the counter asset
      // If isBuyer=true: user bought base, which means sold XLM, so it's a SELL
      // If isBuyer=false: user sold base, which means bought XLM, so it's a BUY
      return order.isBuyer ? 'SELL' : 'BUY';
    } else {
      // Neither asset is XLM (shouldn't happen in normal wallet usage)
      // Fall back to the original isBuyer logic
      return order.isBuyer ? 'BUY' : 'SELL';
    }
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
        <div className="p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">No completed trades yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Your filled orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 p-3 sm:p-4 max-h-[700px] overflow-y-auto">
          {orders.map((order) => {
            const baseAmt = parseFloat(order.baseAmount);
            const counterAmt = parseFloat(order.counterAmount);

            // Determine trade type based on XLM as the base asset
            const tradeType = determineTradeType(order);
            const isXlmSell = tradeType === 'SELL';
            
            // Determine what was sold and received
            // If selling XLM: sold asset is XLM, received is the counter
            // If buying XLM: sold asset is the base, received is XLM
            let soldAsset: string;
            let soldAmount: number;
            let receivedAsset: string;
            let receivedAmount: number;

            if (order.baseCode === 'XLM') {
              // XLM is base
              if (isXlmSell) {
                // Selling XLM: base_is_seller = true
                soldAsset = order.baseCode;
                soldAmount = baseAmt;
                receivedAsset = order.counterCode;
                receivedAmount = counterAmt;
              } else {
                // Buying XLM: base_is_seller = false
                soldAsset = order.counterCode;
                soldAmount = counterAmt;
                receivedAsset = order.baseCode;
                receivedAmount = baseAmt;
              }
            } else if (order.counterCode === 'XLM') {
              // XLM is counter
              if (isXlmSell) {
                // Selling XLM (counter): base_is_seller = true means user bought base
                soldAsset = order.counterCode;
                soldAmount = counterAmt;
                receivedAsset = order.baseCode;
                receivedAmount = baseAmt;
              } else {
                // Buying XLM (counter): base_is_seller = false means user sold base
                soldAsset = order.baseCode;
                soldAmount = baseAmt;
                receivedAsset = order.counterCode;
                receivedAmount = counterAmt;
              }
            } else {
              // Neither is XLM - use original logic
              if (order.isBuyer) {
                soldAsset = order.counterCode;
                soldAmount = counterAmt;
                receivedAsset = order.baseCode;
                receivedAmount = baseAmt;
              } else {
                soldAsset = order.baseCode;
                soldAmount = baseAmt;
                receivedAsset = order.counterCode;
                receivedAmount = counterAmt;
              }
            }

            const tradingPair = `${soldAsset} / ${receivedAsset}`;
            const displayPrice = soldAmount > 0 ? (receivedAmount / soldAmount) : 0;

            const isReversed = reversedOrderIds.has(order.id);
            const finalTradingPair = isReversed ? `${receivedAsset} / ${soldAsset}` : tradingPair;
            const finalDisplayPrice = isReversed && displayPrice > 0 ? (1 / displayPrice) : displayPrice;
            const finalDisplayBaseCode = isReversed ? receivedAsset : soldAsset;
            const finalDisplayCounterCode = isReversed ? soldAsset : receivedAsset;
            
            return (
              <div
                key={order.id}
                className="rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 overflow-hidden hover:border-border/80 hover:shadow-lg transition-all duration-200 group"
              >
                {/* Top Accent Bar */}
                <div className={`h-1 ${isXlmSell ? 'bg-destructive' : 'bg-primary'}`} />
                
                <div className="p-4 space-y-3">
                  {/* Header Row: Badge + Trading Pair + Time */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isXlmSell
                          ? 'bg-destructive/15 text-destructive border border-destructive/30' 
                          : 'bg-primary/15 text-primary border border-primary/30'
                      }`}>
                        {tradeType}
                      </span>
                      <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{finalTradingPair}</span>
                      {order.isLPTrade && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          Liquidity Pool
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline font-medium">{formatTime(order.timestamp)}</span>
                      <span className="sm:hidden font-medium">{new Date(order.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Price Section with Reverse Button */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-background/50 border border-border/30">
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Exchange Rate</p>
                      <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                        {formatSmartNumber(finalDisplayPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {finalDisplayCounterCode} per {finalDisplayBaseCode}
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
                    {/* Sold */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-destructive/5 border border-destructive/20">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center mt-0.5">
                        <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sold</p>
                        <p className="text-sm font-bold font-mono text-destructive mt-0.5 truncate">
                          -{formatSmartNumber(soldAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{soldAsset}</p>
                      </div>
                    </div>
                    
                    {/* Received */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-green-500/5 border border-green-500/20">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center mt-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Received</p>
                        <p className="text-sm font-bold font-mono text-green-500 mt-0.5 truncate">
                          +{formatSmartNumber(receivedAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{receivedAsset}</p>
                      </div>
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
