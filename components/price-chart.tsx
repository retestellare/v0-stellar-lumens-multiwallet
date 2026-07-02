'use client';

import React, { useState } from 'react';
import { Loader2, BarChart3, TrendingUp } from 'lucide-react';
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
  const [showMA20, setShowMA20] = useState(false);
  const [showMA50, setShowMA50] = useState(false);
  const [showBB, setShowBB] = useState(false);
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

  // Calculate moving averages - always calculate for accurate rendering
  const calculateMA = (period: number): (number | null)[] => {
    if (prices.length < period) {
      return prices.map(() => null);
    }
    
    const ma: (number | null)[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ma.push(null);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        ma.push(sum / period);
      }
    }
    return ma;
  };

  // Always calculate, but only use when needed
  const ma20Full = calculateMA(Math.min(20, Math.max(2, prices.length)));
  const ma50Full = calculateMA(Math.min(50, Math.max(2, prices.length)));
  
  // Filter based on toggle state
  const ma20 = showMA20 ? ma20Full : [];
  const ma50 = showMA50 ? ma50Full : [];

  // Calculate Bollinger Bands
  const calculateBB = () => {
    const period = 20;
    const stdDev = 2;
    const bands: { upper: number | null; middle: number | null; lower: number | null }[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        bands.push({ upper: null, middle: null, lower: null });
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        bands.push({
          middle: mean,
          upper: mean + std * stdDev,
          lower: mean - std * stdDev
        });
      }
    }
    return bands;
  };

  const bollinger = showBB ? calculateBB() : [];

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

  // MA20 path - generate only non-null values
  const generateMAPath = (maValues: (number | null)[]): string => {
    const points: { x: number; y: number }[] = [];
    
    maValues.forEach((val, i) => {
      if (val !== null && val !== undefined) {
        const x = (i / Math.max(1, data.length - 1)) * 100;
        const y = ((chartMax - val) / chartRange) * height;
        // Only add valid points
        if (isFinite(x) && isFinite(y)) {
          points.push({ x, y });
        }
      }
    });
    
    if (points.length < 2) return '';
    
    // Generate SVG path from points
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  };

  const ma20Path = showMA20 ? generateMAPath(ma20Full) : '';
  const ma50Path = showMA50 ? generateMAPath(ma50Full) : '';

  // Bollinger Bands paths
  const bbUpperPath = bollinger
    .map((band, i) => {
      if (band.upper === null) return '';
      const x = (i / (data.length - 1)) * 100;
      const y = ((chartMax - band.upper) / chartRange) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter(p => p)
    .join(' ');

  const bbLowerPath = bollinger
    .map((band, i) => {
      if (band.lower === null) return '';
      const x = (i / (data.length - 1)) * 100;
      const y = ((chartMax - band.lower) / chartRange) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter(p => p)
    .join(' ');

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

      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-2">
        {(['1h', '4h', '1d', '1w', '1m'] as const).map(range => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTimeRangeChange?.(range)}
            className="text-xs h-7 px-3"
          >
            {range}
          </Button>
        ))}
      </div>

      {/* Analysis Tools and Chart Type */}
      <div className="flex flex-wrap gap-2">
        {/* Chart Type Toggle */}
        <Button
          variant={chartType === 'area' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setChartType('area')}
          className="text-xs h-7 px-3"
          title="Area chart"
        >
          Area
        </Button>
        <Button
          variant={chartType === 'candlestick' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setChartType('candlestick')}
          className="text-xs h-7 px-3"
          title="Candlestick chart"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </Button>

        {/* Divider */}
        <div className="w-px bg-border/30"></div>

        {/* Analysis Tools */}
        <Button
          variant={showMA20 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMA20(!showMA20)}
          className="text-xs h-7 px-3"
          title="Moving Average 20"
        >
          MA20
        </Button>
        <Button
          variant={showMA50 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMA50(!showMA50)}
          className="text-xs h-7 px-3"
          title="Moving Average 50"
        >
          MA50
        </Button>
        <Button
          variant={showBB ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowBB(!showBB)}
          className="text-xs h-7 px-3"
          title="Bollinger Bands"
        >
          BB
        </Button>
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

          {/* Bollinger Bands fill */}
          {showBB && bbUpperPath && bbLowerPath && (
            <path
              d={`${bbUpperPath} L 100 ${height} L 0 ${height} Z`}
              fill="#3b82f6"
              fillOpacity="0.05"
            />
          )}

          {/* Bollinger Bands lines */}
          {showBB && bbUpperPath && (
            <path
              d={bbUpperPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.3"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {showBB && bbLowerPath && (
            <path
              d={bbLowerPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.3"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* MA20 line with enhanced visibility */}
          {showMA20 && ma20Path && ma20Path.length > 0 && (
            <>
              <path
                d={ma20Path}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                opacity="1"
              />
              <path
                d={ma20Path}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="0.3"
                vectorEffect="non-scaling-stroke"
                opacity="0.4"
              />
            </>
          )}

          {/* MA50 line with enhanced visibility */}
          {showMA50 && ma50Path && ma50Path.length > 0 && (
            <>
              <path
                d={ma50Path}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                opacity="1"
              />
              <path
                d={ma50Path}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="0.3"
                vectorEffect="non-scaling-stroke"
                opacity="0.4"
              />
            </>
          )}

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
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
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

      {/* Legend */}
      {(showMA20 || showMA50 || showBB) && (
        <div className="flex flex-wrap gap-3 text-xs">
          {showMA20 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500"></div>
              <span className="text-muted-foreground">MA20</span>
            </div>
          )}
          {showMA50 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-violet-500"></div>
              <span className="text-muted-foreground">MA50</span>
            </div>
          )}
          {showBB && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-muted-foreground">Bollinger Bands</span>
            </div>
          )}
        </div>
      )}

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
          <p className="font-medium text-foreground">{formatNumber(totalVolume)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trades</p>
          <p className="font-medium text-foreground">
            {formatNumber(data.reduce((sum, d) => sum + (d.trade_count || 0), 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
