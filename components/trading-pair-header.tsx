'use client';

import React from 'react';

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
  stats
}: TradingPairHeaderProps) {
  // Only show 24h statistics - pair display is handled by the main token selector
  if (!stats) return null;
  
  return (
    <div className="glow-border p-4 rounded-lg">
      {/* 24h Statistics Only - No Duplicate Pair Display */}
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
    </div>
  );
}
