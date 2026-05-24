'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
    <div className="glow-border p-6 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-foreground">My Active Orders</h3>
      
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No active orders</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {orders.map((order: ActiveOrder, idx: number) => {
            const remaining = (parseFloat(order.amount) - parseFloat(order.filled)).toFixed(4);
            const progress = (parseFloat(order.filled) / parseFloat(order.amount) * 100).toFixed(0);
            
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  order.type === 'buy'
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-destructive/5 border-destructive/30'
                } space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      order.type === 'buy'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {order.type.toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {parseFloat(order.price).toFixed(6)} {buyingAsset}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {remaining} {sellingAsset} remaining
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelOrder(order.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Filled</span>
                    <span className="text-foreground font-medium">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        order.type === 'buy' ? 'bg-primary' : 'bg-destructive'
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
