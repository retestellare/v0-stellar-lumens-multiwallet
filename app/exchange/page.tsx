'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { getOrderBook, submitManageSellOffer, submitManageBuyOffer, decryptSecret } from '@/lib/stellar-utils';
import { TradingPairHeader } from '@/components/trading-pair-header';
import { OrderBook } from '@/components/order-book';
import { TradeHistory } from '@/components/trade-history';
import { MyOrders } from '@/components/my-orders';
import { TokenSelectorModal } from '@/components/token-selector-modal';
import { CompactOrderForm } from '@/components/compact-order-form';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, ArrowRightLeft, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [buyingIssuer, setBuyingIssuer] = useState('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
  
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
  
  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ type: 'buy' | 'sell'; price: string; amount: string } | null>(null);
  const [password, setPassword] = useState('');
  
  // Mock data for trades and orders
  const [trades] = useState<any[]>([
    { id: '1', price: '0.1452265', amount: '1.5000000', timestamp: new Date().toISOString(), direction: 'buy' },
    { id: '2', price: '0.1452265', amount: '0.1223806', timestamp: new Date().toISOString(), direction: 'sell' },
  ]);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    
    // Load last selected pair from localStorage
    try {
      const lastPair = localStorage.getItem('lastSelectedPair');
      if (lastPair) {
        const { selling, sellingIssuer: sIssuer, buying, buyingIssuer: bIssuer } = JSON.parse(lastPair);
        setSellingAsset(selling || 'XLM');
        setSellingIssuer(sIssuer || '');
        setBuyingAsset(buying || 'USDC');
        setBuyingIssuer(bIssuer || 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
      }
    } catch (error) {
      console.error('[v0] Error loading last pair:', error);
    }
  }, []);

  // Save pair to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      try {
        const pairData = {
          selling: sellingAsset,
          sellingIssuer,
          buying: buyingAsset,
          buyingIssuer,
        };
        localStorage.setItem('lastSelectedPair', JSON.stringify(pairData));
      } catch (error) {
        console.error('[v0] Error saving pair:', error);
      }
    }
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted]);

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
  
  // Get balance for selling asset - handle XLM (native) separately
  const getAssetBalance = (assetCode: string, assetIssuer: string) => {
    if (!activeWallet?.balances) return '0';
    
    if (assetCode === 'XLM' || assetCode === 'native') {
      // Native XLM has asset_type === 'native' and no asset_code
      const nativeBalance = activeWallet.balances.find((b: any) => b.asset_type === 'native');
      return nativeBalance?.balance || '0';
    }
    
    // For non-native assets, match by code and optionally issuer
    const assetBalance = activeWallet.balances.find((b: any) => 
      b.asset_code === assetCode && 
      (!assetIssuer || b.asset_issuer === assetIssuer)
    );
    return assetBalance?.balance || '0';
  };
  
  const sellingBalance = getAssetBalance(sellingAsset, sellingIssuer);
  const buyingBalance = getAssetBalance(buyingAsset, buyingIssuer);

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
    if (!price || !amount || parseFloat(amount) <= 0) {
      setTxResult({ success: false, message: 'Please enter valid price and amount' });
      return;
    }
    setPendingOrder({ type: 'buy', price, amount });
    setShowPasswordModal(true);
  };

  const handleSellClick = (price: string, amount: string) => {
    if (!price || !amount || parseFloat(amount) <= 0) {
      setTxResult({ success: false, message: 'Please enter valid price and amount' });
      return;
    }
    setPendingOrder({ type: 'sell', price, amount });
    setShowPasswordModal(true);
  };
  
  const handleConfirmOrder = async () => {
    if (!pendingOrder || !activeWallet || !password) return;
    
    setIsSubmitting(true);
    setTxResult(null);
    setShowPasswordModal(false);
    
    try {
      // Decrypt the secret key
      const secret = decryptSecret(activeWallet.encryptedSecret, password);
      
      let result;
      if (pendingOrder.type === 'buy') {
        // Buy order: we're buying sellingAsset with buyingAsset
        // For a BUY order on DEX: we sell buyingAsset to get sellingAsset
        result = await submitManageBuyOffer(
          secret,
          buyingAsset,    // selling (paying with)
          buyingIssuer,
          sellingAsset,   // buying (receiving)
          sellingIssuer,
          pendingOrder.amount,
          pendingOrder.price,
        );
      } else {
        // Sell order: we're selling sellingAsset for buyingAsset
        result = await submitManageSellOffer(
          secret,
          sellingAsset,   // selling
          sellingIssuer,
          buyingAsset,    // buying
          buyingIssuer,
          pendingOrder.amount,
          pendingOrder.price,
        );
      }
      
      if (result.success) {
        setTxResult({ success: true, message: `Order submitted! TX: ${result.hash?.substring(0, 8)}...` });
        // Clear form
        if (pendingOrder.type === 'buy') {
          setBuyPrice('');
          setBuyAmount('');
        } else {
          setSellPrice('');
          setSellAmount('');
        }
        // Refresh order book
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data);
      } else {
        setTxResult({ success: false, message: result.error || 'Order failed' });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to submit order' });
    } finally {
      setIsSubmitting(false);
      setPassword('');
      setPendingOrder(null);
    }
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

          {/* Token Pair Selector - Integrated Oval Design */}
          <div className="flex flex-col items-center gap-4">
            <div className="glow-border rounded-full px-8 py-6 sm:px-12 sm:py-8 flex items-center justify-center gap-4 sm:gap-8 border-2">
              {/* Selling Token */}
              <button
                onClick={() => setTokenModal('selling')}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center border border-primary/50 hover:border-primary/80 transition-colors">
                  <p className="text-lg sm:text-xl font-bold text-primary">{sellingAsset.charAt(0).toUpperCase()}</p>
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground">{sellingAsset}</p>
              </button>

              {/* Swap Button */}
              <button
                onClick={handleSwapPair}
                className="p-2 sm:p-3 rounded-full border border-primary/40 hover:border-primary/60 hover:bg-primary/20 transition-all"
              >
                <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </button>

              {/* Buying Token */}
              <button
                onClick={() => setTokenModal('buying')}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-accent/40 to-accent/20 flex items-center justify-center border border-accent/50 hover:border-accent/80 transition-colors">
                  <p className="text-lg sm:text-xl font-bold text-accent">{buyingAsset.charAt(0).toUpperCase()}</p>
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground">{buyingAsset}</p>
              </button>
            </div>

            {/* Spread Display - Below Selector */}
            <div className="glow-border p-3 sm:p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Spread</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{spread.toFixed(3)}%</p>
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
      
      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/20 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Confirm Order</h3>
              <button onClick={() => { setShowPasswordModal(false); setPendingOrder(null); setPassword(''); }}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {pendingOrder?.type === 'buy' ? 'BUY' : 'SELL'} {pendingOrder?.amount} {sellingAsset}
              </p>
              <p className="text-muted-foreground">
                at {pendingOrder?.price} {buyingAsset} per {sellingAsset}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Enter wallet password</label>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border-border"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowPasswordModal(false); setPendingOrder(null); setPassword(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmOrder}
                disabled={!password || isSubmitting}
                className={`flex-1 ${pendingOrder?.type === 'buy' ? 'bg-primary' : 'bg-destructive'}`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Result Toast */}
      {txResult && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg border ${
          txResult.success 
            ? 'bg-green-900/80 border-green-500 text-green-100' 
            : 'bg-red-900/80 border-red-500 text-red-100'
        }`}>
          <div className="flex items-center gap-2">
            <span>{txResult.message}</span>
            <button onClick={() => setTxResult(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-foreground">Submitting order...</span>
          </div>
        </div>
      )}
    </main>
  );
}


