'use client';

import React, { useState } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  timeRange?: '1h' | '4h' | '1d' | '1w' | '1m';
  onTimeRangeChange?: (range: '1h' | '4h' | '1d' | '1w' | '1m') => void;
}

// Utility function to format large numbers
const formatNumber = (num: number | string): string => {
  let numValue: number;
  
  if (typeof num === 'string') {
    numValue = parseFloat(num);
  } else {
    numValue = num;
  }
  
  // Handle invalid, special, or extremely large numbers
  if (!isFinite(numValue) || numValue < 0 || numValue > 1e15) {
    return '0';
  }
  
  if (numValue >= 1_000_000_000) {
    return (numValue / 1_000_000_000).toFixed(1) + 'B';
  }
  if (numValue >= 1_000_000) {
    return (numValue / 1_000_000).toFixed(1) + 'M';
  }
  if (numValue >= 1_000) {
    return (numValue / 1_000).toFixed(1) + 'K';
  }
  return Math.round(numValue).toString();
};

export function PriceChart({ 
  data, 
  loading, 
  sellingAsset, 
  buyingAsset,
  timeRange = '1h',
  onTimeRangeChange
}: PriceChartProps) {
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');

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
  const width = 100;
  const height = 200;

  // Generate SVG path for line chart
  const linePath = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = ((chartMax - parseFloat(d.close)) / chartRange) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate candlestick data
  const candleSticks = data.map((d, i) => {
    const open = parseFloat(d.open);
    const high = parseFloat(d.high);
    const low = parseFloat(d.low);
    const close = parseFloat(d.close);
    
    const x = (i / (data.length - 1)) * 100;
    const candleWidth = Math.max(1.5, 100 / (data.length + 2));
    
    const y_high = ((chartMax - high) / chartRange) * height;
    const y_low = ((chartMax - low) / chartRange) * height;
    const y_open = ((chartMax - open) / chartRange) * height;
    const y_close = ((chartMax - close) / chartRange) * height;
    
    const isUp = close >= open;
    
    return { x, candleWidth, y_high, y_low, y_open, y_close, isUp };
  });



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
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}% ({timeRange})
          </p>
        </div>
      </div>

      {/* Chart Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={chartType === 'area' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setChartType('area')}
          className="text-xs h-8 px-4"
          title="Area chart"
        >
          Area
        </Button>
        <Button
          variant={chartType === 'candlestick' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setChartType('candlestick')}
          className="text-xs h-8 px-4"
          title="Candlestick chart"
        >
          <BarChart3 className="w-4 h-4 mr-1" />
          Candlestick
        </Button>
      </div>

      {/* Chart */}
      <div className="relative w-full h-64 border border-border/40 rounded-lg bg-gradient-to-br from-background to-background/50 overflow-hidden shadow-lg">
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.4" />
              <stop offset="50%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.15" />
              <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.08" />
              <stop offset="100%" stopColor="white" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid background */}
          <rect width="100" height={height} fill="url(#gridGradient)" />

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={height * ratio}
              x2="100"
              y2={height * ratio}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="0.3"
              className="text-muted-foreground"
            />
          ))}



          {/* Candlestick Chart */}
          {chartType === 'candlestick' && (
            <>
              {candleSticks.map((candle, i) => (
                <g key={i}>
                  {/* Wick (high-low line) */}
                  <line
                    x1={candle.x}
                    y1={candle.y_high}
                    x2={candle.x}
                    y2={candle.y_low}
                    stroke={candle.isUp ? '#10b981' : '#ef4444'}
                    strokeWidth="0.2"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Body (open-close) */}
                  <rect
                    x={candle.x - candle.candleWidth / 2}
                    y={Math.min(candle.y_open, candle.y_close)}
                    width={candle.candleWidth}
                    height={Math.abs(candle.y_close - candle.y_open) || 1}
                    fill={candle.isUp ? '#10b981' : '#ef4444'}
                    opacity="0.8"
                  />
                </g>
              ))}
            </>
          )}

          {/* Area Chart */}
          {chartType === 'area' && (
            <>
              <path
                d={areaPath}
                fill="url(#chartGradient)"
              />
              <path
                d={linePath}
                fill="none"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
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
      <div className="grid grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-lg bg-background/50 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">High</p>
          <p className="font-semibold text-foreground text-sm">{maxPrice.toFixed(6)}</p>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">Low</p>
          <p className="font-semibold text-foreground text-sm">{minPrice.toFixed(6)}</p>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">Volume</p>
          <p className="font-semibold text-foreground text-sm">{formatNumber(totalVolume)}</p>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">Trades</p>
          <p className="font-semibold text-foreground text-sm">
            {formatNumber(data.reduce((sum, d) => sum + (d.trade_count || 0), 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
