'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { getOrderBook } from '@/lib/stellar-utils';
import { TradingPairHeader } from '@/components/trading-pair-header';
import { OrderBook } from '@/components/order-book';
import { TradeHistory } from '@/components/trade-history';
import { MyOrders } from '@/components/my-orders';
import { TokenSelectorModal } from '@/components/token-selector-modal';
import { CompactOrderForm } from '@/components/compact-order-form';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

interface OrderBookData {
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
}

type TabType = 'history' | 'my-orders' | 'charts';
type TokenModalType = 'selling' | 'buying' | null;

export default function ExchangePage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('history');
  
  // Trading pair state
  const [sellingAsset, setSellingAsset] = useState('XLM');
  const [buyingAsset, setBuyingAsset] = useState('USDC');
  const [sellingIssuer, setSellingIssuer] = useState('');
  const [buyingIssuer, setBuyingIssuer] = useState('GA5ZSEJYB37JRC5AVCIA5MOP4MY5KU4ERRJLKZLCC5HR52IRXLWDGQDA');
  
  // Order form state
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  
  // Order book state
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [loading, setLoading] = useState(false);
  
  // Token selector modal
  const [tokenModal, setTokenModal] = useState<TokenModalType>(null);
  
  // Mock data for trades and orders
  const [trades] = useState<any[]>([
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

  const handleTokenSelect = (token: any) => {
    if (tokenModal === 'selling') {
      setSellingAsset(token.code);
      setSellingIssuer(token.issuer || '');
    } else if (tokenModal === 'buying') {
      setBuyingAsset(token.code);
      setBuyingIssuer(token.issuer || '');
    }
    setTokenModal(null);
  };

  const handleBuyClick = (price: string, amount: string) => {
    console.log('[v0] Buy order:', { price, amount, asset: sellingAsset });
  };

  const handleSellClick = (price: string, amount: string) => {
    console.log('[v0] Sell order:', { price, amount, asset: sellingAsset });
  };

  const handleCancelOrder = (id: string) => {
    setMyOrders(myOrders.filter(o => o.id !== id));
  };

  const handleSelectBidOrder = (price: string, amount: string) => {
    setBuyPrice(price);
    setBuyAmount(amount);
  };

  const handleSelectAskOrder = (price: string, amount: string) => {
    setSellPrice(price);
    setSellAmount(amount);
  };

  const tabs = [
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

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-4xl font-bold text-foreground">Stellar DEX</h1>
              <p className="text-muted-foreground">Trade on the Stellar Decentralized Exchange</p>
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

          {/* Token Pair Selector - Compact Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6">
            {/* Selling Token Button */}
            <button
              onClick={() => setTokenModal('selling')}
              className="px-6 py-3 bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/40 rounded-lg hover:border-primary/60 hover:from-primary/30 hover:to-secondary/30 transition-all group min-w-32"
            >
              <p className="text-xs text-muted-foreground mb-1">Selling</p>
              <p className="text-2xl font-bold text-primary group-hover:text-accent transition-colors">{sellingAsset}</p>
            </button>

            {/* Swap Button */}
            <button
              onClick={handleSwapPair}
              className="p-3 rounded-full border-2 border-primary/40 hover:border-primary/60 hover:bg-primary/20 transition-all"
            >
              <ArrowRightLeft className="w-6 h-6 text-primary" />
            </button>

            {/* Buying Token Button */}
            <button
              onClick={() => setTokenModal('buying')}
              className="px-6 py-3 bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/40 rounded-lg hover:border-accent/60 hover:from-accent/30 hover:to-primary/30 transition-all group min-w-32"
            >
              <p className="text-xs text-muted-foreground mb-1">Buying</p>
              <p className="text-2xl font-bold text-accent group-hover:text-primary transition-colors">{buyingAsset}</p>
            </button>

            {/* Spread Display */}
            <div className="px-6 py-3 glow-border rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Spread</p>
              <p className="text-xl font-bold text-primary">{spread.toFixed(3)}%</p>
            </div>
          </div>

          {/* Compact Order Form - Side by Side */}
          <CompactOrderForm
            sellingAsset={sellingAsset}
            buyingAsset={buyingAsset}
            sellingBalance={sellingBalance}
            buyingBalance={buyingBalance}
            bestBid={bestBid}
            bestAsk={bestAsk}
            buyPrice={buyPrice}
            buyAmount={buyAmount}
            sellPrice={sellPrice}
            sellAmount={sellAmount}
            onBuyPriceChange={setBuyPrice}
            onBuyAmountChange={setBuyAmount}
            onSellPriceChange={setSellPrice}
            onSellAmountChange={setSellAmount}
            onBuyClick={handleBuyClick}
            onSellClick={handleSellClick}
          />

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Order Book */}
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
                onBidClick={handleSelectBidOrder}
                onAskClick={handleSelectAskOrder}
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

          {/* Tabs Navigation - History, My Orders, Charts only */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {tabs.filter(t => t.id !== 'form').map((tab) => (
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

      {/* Token Selector Modals */}
      <TokenSelectorModal
        isOpen={tokenModal === 'selling'}
        onClose={() => setTokenModal(null)}
        onSelect={handleTokenSelect}
        walletBalances={activeWallet?.balances || []}
        type="selling"
      />
      <TokenSelectorModal
        isOpen={tokenModal === 'buying'}
        onClose={() => setTokenModal(null)}
        onSelect={handleTokenSelect}
        walletBalances={activeWallet?.balances || []}
        type="buying"
      />
    </main>
  );
}


