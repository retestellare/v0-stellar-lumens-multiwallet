'use client';

import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TradingPairHeaderProps {
  sellingAsset: string;
  sellingIssuer: string;
  buyingAsset: string;
  buyingIssuer: string;
  onSwap: () => void;
  stats?: {
    priceChange24h: number;
    volume24h: string;
    high24h: string;
    low24h: string;
    open24h: string;
    close24h: string;
  };
}

export function TradingPairHeader({
  sellingAsset,
  buyingAsset,
  onSwap,
  stats
}: TradingPairHeaderProps) {
  return (
    <div className="glow-border p-6 rounded-lg space-y-6">
      {/* Pair Display */}
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-lg font-bold text-primary">{sellingAsset.charAt(0)}</span>
          </div>
          <p className="text-xl font-bold text-foreground">{sellingAsset}</p>
        </div>
        <Button
          onClick={onSwap}
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10"
        >
          <ArrowUpDown className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-lg font-bold text-secondary">{buyingAsset.charAt(0)}</span>
          </div>
          <p className="text-xl font-bold text-foreground">{buyingAsset}</p>
        </div>
      </div>

      {/* 24h Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">% Change (24h)</p>
            <p className={`font-bold text-sm ${stats.priceChange24h >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {stats.priceChange24h >= 0 ? '+' : ''}{stats.priceChange24h.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Volume (24h)</p>
            <p className="font-bold text-sm text-foreground">{stats.volume24h}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Low (24h)</p>
            <p className="font-bold text-sm text-foreground">{parseFloat(stats.low24h).toFixed(6)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">High (24h)</p>
            <p className="font-bold text-sm text-foreground">{parseFloat(stats.high24h).toFixed(6)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Open (24h)</p>
            <p className="font-bold text-sm text-foreground">{parseFloat(stats.open24h).toFixed(6)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Close (24h)</p>
            <p className="font-bold text-sm text-foreground">{parseFloat(stats.close24h).toFixed(6)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
