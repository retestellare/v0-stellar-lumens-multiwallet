'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const COLORS = ['#00d9ff', '#6b5bff', '#ff006e', '#00f5ff', '#b537f2', '#ff3b3b'];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-muted-foreground">No active wallet selected</p>
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

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div className="glow-border p-6 rounded-lg">
            <h1 className="text-3xl font-bold text-foreground mb-2">{activeWallet.name}</h1>
            <p className="text-muted-foreground text-sm">Portfolio Overview</p>
          </div>

          {/* Charts Section */}
          {chartData.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="glow-border p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-foreground mb-4">Asset Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${(value / totalValue * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#00d9ff"
                      dataKey="value"
                    >
                      {chartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1f3a',
                        border: '1px solid rgba(0, 217, 255, 0.2)',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value: any) => value.toFixed(4)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Asset Details */}
              <div className="glow-border p-6 rounded-lg space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Asset Details</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {chartData.map((asset: any, idx: number) => {
                    const percentage = (asset.value / totalValue * 100).toFixed(2);
                    return (
                      <div key={idx} className="bg-background/30 p-3 rounded border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="font-medium text-foreground">{asset.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Balance</span>
                          <span className="font-semibold text-primary">{asset.value.toFixed(4)} {asset.name}</span>
                        </div>
                        <div className="w-full bg-background/50 rounded-full h-1.5 mt-2">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[idx % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glow-border p-12 rounded-lg text-center">
              <p className="text-muted-foreground">No assets to display. Fund your wallet to see your portfolio.</p>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glow-border p-4 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Total Assets</p>
              <p className="text-2xl font-bold text-primary">{chartData.length}</p>
            </div>
            <div className="glow-border p-4 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Total Value</p>
              <p className="text-2xl font-bold text-primary">{totalValue.toFixed(4)} XLM</p>
            </div>
            <div className="glow-border p-4 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Largest Position</p>
              <p className="text-2xl font-bold text-primary">
                {chartData.length > 0
                  ? chartData.reduce((max: any, current: any) => current.value > max.value ? current : max).name
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
