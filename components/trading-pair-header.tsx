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
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-4 backdrop-blur-md sm:p-5">
      {/* XLM/USD Label - Market Reference Price */}
      <div className="mb-3 border-b border-zinc-800/70 pb-3 text-center">
        <p className="text-xs text-zinc-400">XLM / USD Market Stats</p>
      </div>
      
      {/* 24h Statistics Only - No Duplicate Pair Display */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-400">% Change (24h)</p>
          <p className={`text-sm font-bold font-mono tabular-nums ${stats.priceChange24h >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {stats.priceChange24h >= 0 ? '+' : ''}{stats.priceChange24h.toFixed(2)}%
          </p>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-400">Volume (24h)</p>
          <p className="text-sm font-bold text-foreground font-mono tabular-nums">{stats.volume24h}</p>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-400">Low (24h)</p>
          <p className="text-sm font-bold text-foreground font-mono tabular-nums">{parseFloat(stats.low24h).toFixed(6)}</p>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-400">High (24h)</p>
          <p className="text-sm font-bold text-foreground font-mono tabular-nums">{parseFloat(stats.high24h).toFixed(6)}</p>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-400">Open (24h)</p>
          <p className="text-sm font-bold text-foreground font-mono tabular-nums">{parseFloat(stats.open24h).toFixed(6)}</p>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-400">Close (24h)</p>
          <p className="text-sm font-bold text-foreground font-mono tabular-nums">{parseFloat(stats.close24h).toFixed(6)}</p>
        </div>
      </div>
    </div>
  );
}
