'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const COLORS = ['#facc15', '#06b6d4', '#10b981', '#f43f5e', '#a78bfa', '#0ea5e9'];

export default function PortfolioPage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  if (!activeWallet) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="page-container py-8">
          <p className="text-muted-foreground">No active wallet selected.</p>
        </div>
      </main>
    );
  }

  const chartData = activeWallet.balances
    .filter((b: any) => parseFloat(b.balance) > 0)
    .map((b: any) => ({
      name: b.asset_code || 'XLM',
      value: parseFloat(b.balance),
    }));

  const totalValue = chartData.reduce((sum: number, item: any) => sum + item.value, 0);
  const largestAsset = chartData.length > 0
    ? chartData.reduce((max: any, current: any) => current.value > max.value ? current : max)
    : null;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="page-container py-6">

        {/* Back nav */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="section-label mb-1">Portfolio</p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{activeWallet.name}</h1>
          </div>
          <div className="text-right">
            <p className="section-label mb-1">Total balance</p>
            <p className="text-xl font-bold text-primary num">{totalValue.toFixed(4)} <span className="text-sm font-normal text-muted-foreground">XLM</span></p>
          </div>
        </div>

        {/* Summary stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Assets', value: chartData.length.toString() },
            { label: 'Largest Position', value: largestAsset?.name || 'N/A' },
            { label: 'Total XLM Value', value: totalValue.toFixed(2) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <p className="section-label mb-2">{stat.label}</p>
              <p className="text-xl font-bold text-foreground num truncate">{stat.value}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 ? (
          <div className="grid lg:grid-cols-[280px_1fr] gap-5">

            {/* Donut chart */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center">
              <h2 className="section-label mb-4 self-start">Distribution</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    innerRadius={52}
                    dataKey="value"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(4)} (${(Number(value) / totalValue * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="w-full mt-2 space-y-1.5">
                {chartData.slice(0, 5).map((asset: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-muted-foreground">{asset.name}</span>
                    </div>
                    <span className="font-medium text-foreground num">{(asset.value / totalValue * 100).toFixed(1)}%</span>
                  </div>
                ))}
                {chartData.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{chartData.length - 5} more</p>
                )}
              </div>
            </div>

            {/* Asset list */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold text-foreground">Asset Details</h2>
              </div>
              <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
                {chartData.map((asset: any, idx: number) => {
                  const pct = (asset.value / totalValue * 100);
                  return (
                    <div key={idx} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold text-sm text-foreground">{asset.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-foreground num">{asset.value.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                          <span className="text-xs text-muted-foreground ml-1">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <p className="text-muted-foreground">No assets to display. Fund your wallet to see your portfolio.</p>
          </div>
        )}

      </div>
    </main>
  );
}
