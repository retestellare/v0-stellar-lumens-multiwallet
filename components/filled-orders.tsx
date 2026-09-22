'use client';

import React, { useState } from 'react';
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Clock, RotateCw, Filter } from 'lucide-react';
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
  buyingAsset?: string;
  sellingAsset?: string;
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


export function FilledOrders({ orders, loading, buyingAsset, sellingAsset }: FilledOrdersProps) {
  const [reversedOrderIds, setReversedOrderIds] = useState<Set<string>>(new Set());
  const [filterByCurrentPair, setFilterByCurrentPair] = useState(false);

  const toggleReversed = (orderId: string) => {
    const newSet = new Set(reversedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setReversedOrderIds(newSet);
  };

  // Filter trades to only show those matching the current trading pair
  const filteredOrders = filterByCurrentPair && buyingAsset && sellingAsset
    ? orders.filter(order => {
        // Check if this trade is for the current pair (in either direction)
        const orderHasCurrentPair = 
          (order.baseCode === sellingAsset && order.counterCode === buyingAsset) ||
          (order.baseCode === buyingAsset && order.counterCode === sellingAsset);
        return orderHasCurrentPair;
      })
    : orders;

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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Trade History</h3>
              <p className="text-xs text-muted-foreground">Completed trades</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {buyingAsset && sellingAsset && (
              <Button
                variant={filterByCurrentPair ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterByCurrentPair(!filterByCurrentPair)}
                className={`flex items-center gap-1.5 text-xs sm:text-sm ${
                  filterByCurrentPair
                    ? 'bg-primary hover:bg-primary/90'
                    : 'border-border/50 hover:border-border'
                }`}
                title={filterByCurrentPair ? `Showing ${sellingAsset}/${buyingAsset} only` : `Filter to ${sellingAsset}/${buyingAsset}`}
              >
                <Filter className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{sellingAsset}/{buyingAsset}</span>
              </Button>
            )}
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {filterByCurrentPair ? `${filteredOrders.length}/${orders.length}` : `${orders.length}`}
              </p>
              <p className="text-xs text-muted-foreground">trades</p>
            </div>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {filterByCurrentPair && orders.length > 0 
              ? `No trades for ${sellingAsset}/${buyingAsset}`
              : 'No completed trades yet'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {filterByCurrentPair && orders.length > 0
              ? 'Try a different pair or clear the filter'
              : 'Your filled orders will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-3 sm:p-4 max-h-[700px] overflow-y-auto">
          {filteredOrders.map((order) => {
            const baseAmt = parseFloat(order.baseAmount);
            const counterAmt = parseFloat(order.counterAmount);

            const userWasBuyer = order.isBuyer;
            const soldAsset = userWasBuyer ? order.counterCode : order.baseCode;
            const soldAmount = userWasBuyer ? counterAmt : baseAmt;
            const receivedAsset = userWasBuyer ? order.baseCode : order.counterCode;
            const receivedAmount = userWasBuyer ? baseAmt : counterAmt;
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
                <div className={`h-1 ${userWasBuyer ? 'bg-primary' : 'bg-destructive'}`} />
                
                <div className="p-4 space-y-3">
                  {/* Header Row: Badge + Trading Pair + Time */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        userWasBuyer 
                          ? 'bg-primary/15 text-primary border border-primary/30' 
                          : 'bg-destructive/15 text-destructive border border-destructive/30'
                      }`}>
                        {userWasBuyer ? 'BUY' : 'SELL'}
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
