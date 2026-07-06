'use client';

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Skeleton loaders to prevent Cumulative Layout Shift (CLS) during content loading
 * These components maintain consistent heights and spacing while data loads
 */

export function AssetItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/30 animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-muted/60" />
        <div className="flex-1">
          <div className="h-4 bg-muted/60 rounded w-20 mb-2" />
          <div className="h-3 bg-muted/50 rounded w-32" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 bg-muted/60 rounded w-24 mb-2" />
        <div className="h-3 bg-muted/50 rounded w-20" />
      </div>
    </div>
  );
}

export function AssetListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <AssetItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function WalletBalanceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-muted/40 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-muted/40 rounded-lg" />
        <div className="h-20 bg-muted/40 rounded-lg" />
      </div>
    </div>
  );
}

export function OrderBookSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
          <div className="h-4 bg-muted/60 rounded w-20" />
          <div className="h-4 bg-muted/60 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

export function PoolItemSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-muted/40 border border-border/30 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted/60" />
          <div className="w-8 h-8 rounded-full bg-muted/60 -ml-4" />
        </div>
        <div className="h-4 bg-muted/60 rounded w-24" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted/50 rounded w-full" />
        <div className="h-3 bg-muted/50 rounded w-4/5" />
      </div>
    </div>
  );
}

export function PoolListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PoolItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-muted/40 rounded-lg border border-border/30 animate-pulse flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading chart...</div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-muted/40 border border-border/30 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-muted/60 rounded w-32" />
        <div className="h-4 bg-muted/60 rounded w-24" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted/50 rounded w-full" />
        <div className="h-3 bg-muted/50 rounded w-3/4" />
      </div>
    </div>
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TransactionSkeleton key={i} />
      ))}
    </div>
  );
}

// Wrapper to ensure content doesn't shift
export function SkeletonWrapper({ 
  isLoading, 
  children, 
  skeleton 
}: { 
  isLoading: boolean
  children: React.ReactNode
  skeleton: React.ReactNode 
}) {
  if (isLoading) return <>{skeleton}</>;
  return <>{children}</>;
}

// ─── Error & Empty States ─────────────────────────────────────────────────────

/**
 * Generic error fallback — shows an icon, a message and an optional retry button.
 */
export function ErrorFallback({
  message = 'Something went wrong.',
  detail,
  onRetry,
}: {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center rounded-xl border border-destructive/30 bg-destructive/5">
      <AlertCircle className="w-8 h-8 text-destructive/70 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-destructive">{message}</p>
        {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Network / connectivity error state.
 */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center rounded-xl border border-border/50 bg-muted/20">
      <WifiOff className="w-8 h-8 text-muted-foreground/60 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-foreground">No connection</p>
        <p className="text-xs text-muted-foreground mt-1">
          Check your internet connection and try again.
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state — shown when data loaded successfully but the list is empty.
 */
export function EmptyState({
  message = 'Nothing here yet.',
  detail,
  action,
}: {
  message?: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <PackageOpen className="w-8 h-8 text-muted-foreground/50 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-foreground">{message}</p>
        {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Inline loading indicator — a subtle pulsing dot useful inside table cells
 * or next to price values while data is loading.
 */
export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse ${className}`}
      aria-label="Loading…"
    />
  );
}
