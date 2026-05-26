'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, Tag } from 'lucide-react';

interface ActiveOrder {
  id: string;
  type: 'buy' | 'sell';
  price: string;
  amount: string;
  filled: string;
  timestamp: string;
}

interface MyOrdersProps {
  orders: ActiveOrder[];
  loading: boolean;
  onCancelOrder: (id: string) => void;
  buyingAsset: string;
  sellingAsset: string;
}

export function MyOrders({ orders, loading, onCancelOrder, buyingAsset, sellingAsset }: MyOrdersProps) {
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span> Buy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive"></span> Sell
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
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No active orders</p>
          <p className="text-sm mt-1">Place a buy or sell order to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {orders.map((order: ActiveOrder, idx: number) => {
            const remaining = (parseFloat(order.amount) - parseFloat(order.filled)).toFixed(4);
            const progress = (parseFloat(order.filled) / parseFloat(order.amount) * 100).toFixed(0);
            const isBuy = order.type === 'buy';
            
            return (
              <div
                key={idx}
                className={`p-4 sm:p-5 ${
                  isBuy ? 'hover:bg-primary/5' : 'hover:bg-destructive/5'
                } transition-colors`}
              >
                {/* Order Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Type Badge */}
                    <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${
                      isBuy ? 'bg-primary/20' : 'bg-destructive/20'
                    }`}>
                      {isBuy ? (
                        <ShoppingCart className={`w-5 h-5 sm:w-6 sm:h-6 ${isBuy ? 'text-primary' : 'text-destructive'}`} />
                      ) : (
                        <Tag className={`w-5 h-5 sm:w-6 sm:h-6 ${isBuy ? 'text-primary' : 'text-destructive'}`} />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isBuy ? 'bg-primary/30 text-primary' : 'bg-destructive/30 text-destructive'
                        }`}>
                          {order.type.toUpperCase()}
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-foreground">
                          {parseFloat(order.amount).toFixed(4)}
                        </span>
                        <span className="text-sm text-muted-foreground">{sellingAsset}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        @ <span className="font-mono font-medium text-foreground">{parseFloat(order.price).toFixed(6)}</span> {buyingAsset}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelOrder(order.id)}
                    className="text-destructive hover:bg-destructive/10 h-10 w-10 p-0 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Progress Section */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Remaining: <span className="font-mono text-foreground">{remaining}</span> {sellingAsset}
                    </span>
                    <span className={`font-bold ${isBuy ? 'text-primary' : 'text-destructive'}`}>
                      {progress}% filled
                    </span>
                  </div>
                  <div className="w-full h-2 bg-background/80 rounded-full overflow-hidden border border-border/50">
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
