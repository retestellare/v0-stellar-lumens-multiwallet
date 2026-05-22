'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getOrderBook, searchAssets } from '@/lib/stellar-utils';
import { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

interface OrderBookData {
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
}

export default function ExchangePage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [sellingAsset, setSellingAsset] = useState('XLM');
  const [buyingAsset, setBuyingAsset] = useState('USDC');
  const [sellingIssuer, setSellingIssuer] = useState('');
  const [buyingIssuer, setBuyingIssuer] = useState('GA5ZSEJYB37JRC5AVCIA5MOP4MY5KU4ERRJLKZLCC5HR52IRXLWDGQDA');
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchOrderBook = async () => {
      setLoading(true);
      try {
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data);
      } catch (error) {
        console.error('[v0] Error fetching order book:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderBook();
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer]);

  useEffect(() => {
    const searchAssetsFunc = async () => {
      if (searchQuery.length < 2) {
        setAssets([]);
        return;
      }
      try {
        const results = await searchAssets(searchQuery.toUpperCase(), undefined, 5);
        setAssets(results);
      } catch (error) {
        console.error('[v0] Error searching assets:', error);
      }
    };

    searchAssetsFunc();
  }, [searchQuery]);

  if (!mounted) return null;

  const activeWallet = wallets.find(w => w.id === activeWalletId);

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
            <h1 className="text-3xl font-bold text-foreground mb-2">Stellar DEX</h1>
            <p className="text-muted-foreground text-sm">Browse and trade on the Stellar Decentralized Exchange</p>
          </div>

          {/* Trading Pair Selector */}
          <div className="glow-border p-6 rounded-lg space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Select Trading Pair</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Selling Asset */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-muted-foreground">Selling</label>
                <div className="space-y-2">
                  <Input
                    placeholder="Asset code"
                    value={sellingAsset}
                    onChange={(e) => setSellingAsset(e.target.value.toUpperCase())}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                  />
                  <Input
                    placeholder="Issuer (leave empty for native XLM)"
                    value={sellingIssuer}
                    onChange={(e) => setSellingIssuer(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 text-xs"
                  />
                </div>
              </div>

              {/* Buying Asset */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-muted-foreground">Buying</label>
                <div className="space-y-2">
                  <Input
                    placeholder="Asset code"
                    value={buyingAsset}
                    onChange={(e) => setBuyingAsset(e.target.value.toUpperCase())}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                  />
                  <Input
                    placeholder="Issuer"
                    value={buyingIssuer}
                    onChange={(e) => setBuyingIssuer(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Asset Search */}
          <div className="glow-border p-6 rounded-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Search Assets</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 pl-10"
              />
            </div>
            {assets.length > 0 && (
              <div className="space-y-2">
                {assets.map((asset: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBuyingAsset(asset.asset_code);
                      setBuyingIssuer(asset.asset_issuer);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-3 bg-background/30 border border-border/50 rounded hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{asset.asset_code}</p>
                        <p className="text-xs text-muted-foreground truncate">{asset.asset_issuer}</p>
                      </div>
                      {asset.num_accounts && (
                        <p className="text-xs text-muted-foreground">{asset.num_accounts} holders</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Order Book */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Bids */}
            <div className="glow-border p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Buy Orders (Bids)</h3>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : orderBook.bids.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No buy orders</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium mb-2 sticky top-0">
                    <span>Price</span>
                    <span>Amount</span>
                    <span>Total</span>
                  </div>
                  {orderBook.bids.slice(0, 20).map((bid: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 text-xs p-2 bg-background/30 rounded border border-border/50">
                      <span className="text-primary font-semibold">{parseFloat(bid.price).toFixed(6)}</span>
                      <span className="text-foreground">{parseFloat(bid.amount).toFixed(4)}</span>
                      <span className="text-accent">{(parseFloat(bid.price) * parseFloat(bid.amount)).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Asks */}
            <div className="glow-border p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Sell Orders (Asks)</h3>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : orderBook.asks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No sell orders</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium mb-2 sticky top-0">
                    <span>Price</span>
                    <span>Amount</span>
                    <span>Total</span>
                  </div>
                  {orderBook.asks.slice(0, 20).map((ask: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 text-xs p-2 bg-background/30 rounded border border-border/50">
                      <span className="text-destructive font-semibold">{parseFloat(ask.price).toFixed(6)}</span>
                      <span className="text-foreground">{parseFloat(ask.amount).toFixed(4)}</span>
                      <span className="text-accent">{(parseFloat(ask.price) * parseFloat(ask.amount)).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trading Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="glow-border p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Spread</p>
              <p className="text-xl font-bold text-primary">
                {orderBook.bids.length > 0 && orderBook.asks.length > 0
                  ? (((parseFloat(orderBook.asks[0].price) - parseFloat(orderBook.bids[0].price)) / parseFloat(orderBook.bids[0].price) * 100).toFixed(2))
                  : 'N/A'}%
              </p>
            </div>
            <div className="glow-border p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Best Bid</p>
              <p className="text-xl font-bold text-primary">
                {orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0].price).toFixed(6) : 'N/A'}
              </p>
            </div>
            <div className="glow-border p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Best Ask</p>
              <p className="text-xl font-bold text-primary">
                {orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0].price).toFixed(6) : 'N/A'}
              </p>
            </div>
            <div className="glow-border p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Total Orders</p>
              <p className="text-xl font-bold text-primary">{orderBook.bids.length + orderBook.asks.length}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
