'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getOrderBook, searchAssets } from '@/lib/stellar-utils';
import { TradingPairHeader } from '@/components/trading-pair-header';
import { OrderForm } from '@/components/order-form';
import { OrderBook } from '@/components/order-book';
import { TradeHistory } from '@/components/trade-history';
import { MyOrders } from '@/components/my-orders';
import { useState, useEffect } from 'react';
import { ArrowLeft, Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface OrderBookData {
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
}

type TabType = 'markets' | 'form' | 'history' | 'my-orders' | 'charts';

export default function ExchangePage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('form');
  
  // Trading pair state
  const [sellingAsset, setSellingAsset] = useState('XLM');
  const [buyingAsset, setBuyingAsset] = useState('USDC');
  const [sellingIssuer, setSellingIssuer] = useState('');
  const [buyingIssuer, setBuyingIssuer] = useState('GA5ZSEJYB37JRC5AVCIA5MOP4MY5KU4ERRJLKZLCC5HR52IRXLWDGQDA');
  
  // Order book state
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Mock data for trades and orders
  const [trades, setTrades] = useState<any[]>([
    { id: '1', price: '0.1452265', amount: '1.5000000', timestamp: new Date().toISOString(), direction: 'buy' },
    { id: '2', price: '0.1452265', amount: '0.1223806', timestamp: new Date().toISOString(), direction: 'sell' },
  ]);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch order book
  useEffect(() => {
    const fetchOrderBook = async () => {
      setLoading(true);
      try {
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data);
      } catch (error) {
        console.error('[v0] Error fetching order book:', error);
        setOrderBook({ bids: [], asks: [] });
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      fetchOrderBook();
    }
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted]);

  // Search assets
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await searchAssets(searchQuery.toUpperCase(), undefined, 10);
        setSearchResults(results);
      } catch (error) {
        console.error('[v0] Error searching assets:', error);
      }
    };

    search();
  }, [searchQuery]);

  if (!mounted) return null;

  const activeWallet = wallets.find(w => w.id === activeWalletId);
  const sellingBalance = activeWallet?.balances.find((b: any) => b.asset_code === sellingAsset || (sellingAsset === 'XLM' && b.asset_type === 'native'))?.balance || '0';
  const buyingBalance = activeWallet?.balances.find((b: any) => b.asset_code === buyingAsset)?.balance || '0';

  // Calculate spread
  const spread = orderBook.bids.length > 0 && orderBook.asks.length > 0
    ? (((parseFloat(orderBook.asks[0].price) - parseFloat(orderBook.bids[0].price)) / parseFloat(orderBook.bids[0].price)) * 100)
    : 0;

  const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : null;
  const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : null;

  const handleSwapPair = () => {
    const tempAsset = sellingAsset;
    const tempIssuer = sellingIssuer;
    setSellingAsset(buyingAsset);
    setSellingIssuer(buyingIssuer);
    setBuyingAsset(tempAsset);
    setBuyingIssuer(tempIssuer);
  };

  const handleBuyClick = (price: string, amount: string) => {
    console.log('[v0] Buy order:', { price, amount, asset: sellingAsset });
    // TODO: Implement actual order submission
  };

  const handleSellClick = (price: string, amount: string) => {
    console.log('[v0] Sell order:', { price, amount, asset: sellingAsset });
    // TODO: Implement actual order submission
  };

  const handleCancelOrder = (id: string) => {
    setMyOrders(myOrders.filter(o => o.id !== id));
  };

  const tabs = [
    { id: 'form', label: 'Order Form', icon: '🛒' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'my-orders', label: 'My Orders', icon: '📋' },
    { id: 'charts', label: 'Charts', icon: '📈' },
  ] as const;

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
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-4xl font-bold text-foreground">Stellar DEX</h1>
                <p className="text-muted-foreground">Trade on the Stellar Decentralized Exchange</p>
              </div>
            </div>
          </div>

          {/* Trading Pair Header */}
          <TradingPairHeader
            sellingAsset={sellingAsset}
            sellingIssuer={sellingIssuer}
            buyingAsset={buyingAsset}
            buyingIssuer={buyingIssuer}
            onSwap={handleSwapPair}
            stats={{
              priceChange24h: 2.34,
              volume24h: '1.23M',
              high24h: '0.1453',
              low24h: '0.1419',
              open24h: '0.1452',
              close24h: '0.1453',
            }}
          />

          {/* Order Book Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Order Book (spans 2 columns) */}
            <div className="lg:col-span-2">
              <OrderBook
                bids={orderBook.bids}
                asks={orderBook.asks}
                loading={loading}
                sellingAsset={sellingAsset}
                buyingAsset={buyingAsset}
                spread={spread}
                bestBid={bestBid}
                bestAsk={bestAsk}
              />
            </div>

            {/* Right: Quick Stats */}
            <div className="space-y-4">
              <div className="glow-border p-4 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-2">Best Bid</p>
                <p className="text-2xl font-bold text-primary">
                  {bestBid ? parseFloat(bestBid).toFixed(6) : 'N/A'}
                </p>
              </div>
              <div className="glow-border p-4 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-2">Best Ask</p>
                <p className="text-2xl font-bold text-destructive">
                  {bestAsk ? parseFloat(bestAsk).toFixed(6) : 'N/A'}
                </p>
              </div>
              <div className="glow-border p-4 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-2">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">
                  {orderBook.bids.length + orderBook.asks.length}
                </p>
              </div>
            </div>
          </div>

          {/* Trading Pair Selector & Asset Search */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pair Selector */}
            <div className="glow-border p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Select Trading Pair</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Selling Asset</label>
                  <Input
                    placeholder="Asset code (e.g., XLM)"
                    value={sellingAsset}
                    onChange={(e) => setSellingAsset(e.target.value.toUpperCase())}
                    className="bg-input border-border text-foreground"
                  />
                  {sellingAsset !== 'XLM' && (
                    <Input
                      placeholder="Issuer address"
                      value={sellingIssuer}
                      onChange={(e) => setSellingIssuer(e.target.value)}
                      className="bg-input border-border text-foreground text-xs mt-2"
                    />
                  )}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Buying Asset</label>
                  <Input
                    placeholder="Asset code (e.g., USDC)"
                    value={buyingAsset}
                    onChange={(e) => setBuyingAsset(e.target.value.toUpperCase())}
                    className="bg-input border-border text-foreground"
                  />
                  <Input
                    placeholder="Issuer address"
                    value={buyingIssuer}
                    onChange={(e) => setBuyingIssuer(e.target.value)}
                    className="bg-input border-border text-foreground text-xs mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Asset Search */}
            <div className="glow-border p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Search Assets</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by asset code or issuer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-input border-border text-foreground pl-10"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((asset: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setBuyingAsset(asset.asset_code);
                        setBuyingIssuer(asset.asset_issuer || '');
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-3 bg-background/30 border border-border/50 rounded hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground text-sm">{asset.asset_code}</p>
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
          </div>

          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {activeTab === 'form' && (
              <OrderForm
                sellingAsset={sellingAsset}
                buyingAsset={buyingAsset}
                sellingBalance={sellingBalance}
                buyingBalance={buyingBalance}
                onBuyClick={handleBuyClick}
                onSellClick={handleSellClick}
              />
            )}

            {activeTab === 'history' && (
              <TradeHistory
                trades={trades}
                loading={false}
                buyingAsset={buyingAsset}
                sellingAsset={sellingAsset}
              />
            )}

            {activeTab === 'my-orders' && (
              <MyOrders
                orders={myOrders}
                loading={false}
                onCancelOrder={handleCancelOrder}
                buyingAsset={buyingAsset}
                sellingAsset={sellingAsset}
              />
            )}

            {activeTab === 'charts' && (
              <div className="glow-border p-6 rounded-lg space-y-4 text-center">
                <p className="text-muted-foreground text-lg">Advanced Charts</p>
                <p className="text-sm text-muted-foreground">Coming soon - Candlestick charts with RSI and MACD indicators</p>
                <div className="w-full h-64 bg-background/30 rounded flex items-center justify-center border border-border/50">
                  <p className="text-muted-foreground">Chart placeholder</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

