'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ChartDataPoint {
  timestamp: string | number;
  open: string;
  high: string;
  low: string;
  close: string;
  base_volume: string;
  counter_volume: string;
  avg: string;
  trade_count: number;
}

interface PriceChartProps {
  data: ChartDataPoint[];
  loading: boolean;
  sellingAsset: string;
  buyingAsset: string;
}

export function PriceChart({ data, loading, sellingAsset, buyingAsset }: PriceChartProps) {
  if (loading) {
    return (
      <div className="glow-border p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
        <div className="w-full h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glow-border p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
        <div className="w-full h-64 flex items-center justify-center border border-border/50 rounded bg-background/30">
          <p className="text-muted-foreground">No trading data available for this pair</p>
        </div>
      </div>
    );
  }

  // Calculate chart bounds
  const prices = data.map(d => parseFloat(d.close));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const padding = priceRange * 0.1;
  const chartMin = minPrice - padding;
  const chartMax = maxPrice + padding;
  const chartRange = chartMax - chartMin;

  // Chart dimensions
  const width = 100; // percentage
  const height = 200;
  const barWidth = width / data.length;

  // Generate SVG path for line chart
  const linePath = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = ((chartMax - parseFloat(d.close)) / chartRange) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Area path (for gradient fill)
  const areaPath = `${linePath} L 100 ${height} L 0 ${height} Z`;

  // Latest price info
  const latestPrice = data.length > 0 ? parseFloat(data[data.length - 1].close) : 0;
  const firstPrice = data.length > 0 ? parseFloat(data[0].close) : 0;
  const priceChange = firstPrice ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Total volume
  const totalVolume = data.reduce((sum, d) => sum + parseFloat(d.base_volume || '0'), 0);

  return (
    <div className="glow-border p-6 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {sellingAsset}/{buyingAsset} Price Chart
        </h3>
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">{latestPrice.toFixed(6)}</p>
          <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}% (48h)
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative w-full h-52 border border-border/50 rounded bg-background/30 overflow-hidden">
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={height * ratio}
              x2="100"
              y2={height * ratio}
              stroke="currentColor"
              strokeOpacity="0.1"
              className="text-muted-foreground"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#chartGradient)"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-2 top-2 text-xs text-muted-foreground">
          {chartMax.toFixed(6)}
        </div>
        <div className="absolute left-2 bottom-2 text-xs text-muted-foreground">
          {chartMin.toFixed(6)}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">High</p>
          <p className="font-medium text-foreground">{maxPrice.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Low</p>
          <p className="font-medium text-foreground">{minPrice.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="font-medium text-foreground">{totalVolume.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trades</p>
          <p className="font-medium text-foreground">
            {data.reduce((sum, d) => sum + (d.trade_count || 0), 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
