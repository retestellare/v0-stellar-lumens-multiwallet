'use client';

import React from 'react';
import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { getOrderBook, submitManageSellOffer, submitManageBuyOffer, fetchTokenMetadataFromToml, getIssuerTokenIcon, getRecentTrades, getAccountOffers, cancelOffer, getTradeAggregations, getAccountTrades, getXLMUSDStats, hasTrustline, addTrustline, calculateAvailableBalance } from '@/lib/stellar-utils';
import { OrderBook } from '@/components/order-book';
import { TradeHistory } from '@/components/trade-history';
import { MyOrders } from '@/components/my-orders';
import { FilledOrders } from '@/components/filled-orders';
import { PriceChart } from '@/components/price-chart';
import { TokenSelectorModal } from '@/components/token-selector-modal';
import { CompactOrderForm } from '@/components/compact-order-form';
import { OrderBookSkeleton, ChartSkeleton } from '@/components/skeleton-loaders';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, ArrowRightLeft, X, Loader2, History, ClipboardList, CheckCircle2, BarChart3 } from 'lucide-react';
import { WalletSelectorDropdown } from '@/components/wallet-selector-dropdown';
import Link from 'next/link';

interface OrderBookData {
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
}

type TabType = 'history' | 'my-orders' | 'charts' | 'filled';
type TokenModalType = 'selling' | 'buying' | null;

export default function ExchangePage() {
  const { wallets, activeWalletId, updateBalances, globalDecryptedSecret } = useWallet();
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
  const [pendingOrder, setPendingOrder] = useState<{ type: 'buy' | 'sell'; price: string; amount: string } | null>(null);
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState<string | null>(null);
  
  // Token metadata (domain, image, name)
  const [sellingMeta, setSellingMeta] = useState<{ domain?: string; image?: string; name?: string }>({});
  const [buyingMeta, setBuyingMeta] = useState<{ domain?: string; image?: string; name?: string }>({});
  
  // Trade history and orders from blockchain
  const [trades, setTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState<'1h' | '4h' | '1d' | '1w' | '1m'>('1h');
  const [filledOrders, setFilledOrders] = useState<any[]>([]);
  const [filledLoading, setFilledLoading] = useState(false);
  
  // XLM/USD market stats
  const [xlmUsdStats, setXlmUsdStats] = useState<{
    priceChange24h: number;
    volume24h: string;
    high24h: string;
    low24h: string;
    open24h: string;
    close24h: string;
  } | null>(null);

  // Available balances (accounting for committed orders and network reserve)
  const [availableSellingBalance, setAvailableSellingBalance] = useState('0');
  const [availableBuyingBalance, setAvailableBuyingBalance] = useState('0');
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Trustline retry state


  const router = useRouter();

  // Handle hash-based navigation for quick-access links from sidebar
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.slice(1); // Remove the #
        if (hash === 'history') setActiveTab('history');
        else if (hash === 'orders') setActiveTab('my-orders');
        else if (hash === 'filled') setActiveTab('filled');
        else if (hash === 'charts') setActiveTab('charts');
      }
    };

    // Handle initial hash on mount/ready
    // Use a small delay to ensure the router is ready and hash is set
    const timer = setTimeout(handleHashChange, 100);

    // Listen for hash changes when clicking menu links
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [router]);

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

  // Refresh balances when wallet changes
  const prevWalletIdRef = React.useRef(activeWalletId);
  useEffect(() => {
    if (prevWalletIdRef.current !== activeWalletId && activeWalletId && mounted) {
      setPendingOrder(null);
      setTxResult(null);
      updateBalances(activeWalletId);
    }
    prevWalletIdRef.current = activeWalletId;
  }, [activeWalletId, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch order book
  useEffect(() => {
    const fetchOrderBook = async () => {
      setLoading(true);
      try {
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data || { bids: [], asks: [] });
      } catch (error) {
        console.warn('[v0] Order book fetch error, using empty data:', error);
        setOrderBook({ bids: [], asks: [] });
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      // Use a small timeout to allow page to render first
      const timer = setTimeout(fetchOrderBook, 100);
      return () => clearTimeout(timer);
    }
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted]);
  
  // Fetch token metadata and icons when assets change
  useEffect(() => {
    const fetchMeta = async () => {
      // Fetch metadata and icons in parallel
      const [sellMeta, buyMeta, sellIcon, buyIcon] = await Promise.all([
        fetchTokenMetadataFromToml(sellingIssuer),
        fetchTokenMetadataFromToml(buyingIssuer),
        getIssuerTokenIcon(sellingAsset, sellingIssuer),
        getIssuerTokenIcon(buyingAsset, buyingIssuer),
      ]);
      
      // Merge icon into metadata
      setSellingMeta({ ...sellMeta, image: sellMeta.image || sellIcon });
      setBuyingMeta({ ...buyMeta, image: buyMeta.image || buyIcon });
    };
    
    if (mounted) {
      fetchMeta();
    }
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted]);

  // Fetch trade history when pair changes
  useEffect(() => {
    const fetchTrades = async () => {
      setTradesLoading(true);
      try {
        const tradesData = await getRecentTrades(
          sellingAsset, sellingIssuer,
          buyingAsset, buyingIssuer,
          30
        );
        // Transform Horizon trades to component format
        const formattedTrades = tradesData.map((trade: any) => ({
          id: trade.id,
          price: trade.price?.n && trade.price?.d 
            ? (parseFloat(trade.price.n) / parseFloat(trade.price.d)).toFixed(7)
            : '0',
          amount: trade.base_amount || '0',
          timestamp: trade.ledger_close_time,
          direction: trade.base_is_seller ? 'sell' : 'buy',
        }));
        setTrades(formattedTrades);
      } catch {
        setTrades([]);
      } finally {
        setTradesLoading(false);
      }
    };

    if (mounted) {
      fetchTrades();
    }
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted]);

  // Fetch user's open offers - clear immediately when wallet changes
  useEffect(() => {
    // Immediately clear orders when wallet changes to prevent stale data
    setMyOrders([]);
    // Note: Don't clear filledOrders here - it's managed by its own effect
    
    const fetchOffers = async () => {
      if (!activeWalletId) return;
      const wallet = wallets.find(w => w.id === activeWalletId);
      if (!wallet) return;

      setOrdersLoading(true);
      try {
        const offersData = await getAccountOffers(wallet.publicKey);
        // Transform Horizon offers to component format
        // Determine type based on what the offer is selling vs the current pair's base asset
        const formattedOrders = offersData.map((offer: any) => {
          const offerSellingCode = offer.selling?.asset_type === 'native' ? 'XLM' : offer.selling?.asset_code;
          const offerBuyingCode = offer.buying?.asset_type === 'native' ? 'XLM' : offer.buying?.asset_code;
          
          // If offer is selling the base asset (sellingAsset), it's a SELL order
          // If offer is buying the base asset (sellingAsset), it's a BUY order
          // This ensures consistency regardless of pair direction
          let orderType: 'buy' | 'sell';
          if (offerSellingCode === sellingAsset) {
            orderType = 'sell'; // Selling base = SELL
          } else if (offerBuyingCode === sellingAsset) {
            orderType = 'buy'; // Buying base = BUY
          } else {
            // Order is for a different pair - use the raw offer direction
            orderType = 'sell';
          }
          
          return {
            id: offer.id,
            type: orderType,
            price: offer.price,
            amount: offer.amount,
            filled: '0', // Horizon doesn't track partial fills on open offers
            timestamp: offer.last_modified_time,
            sellingCode: offerSellingCode,
            sellingIssuer: offer.selling?.asset_issuer || '',
            buyingCode: offerBuyingCode,
            buyingIssuer: offer.buying?.asset_issuer || '',
          };
        });
        setMyOrders(formattedOrders);
      } catch {
        setMyOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    if (mounted) {
      fetchOffers();
    }
  }, [activeWalletId, wallets, mounted, sellingAsset]);

  // Fetch chart data (trade aggregations)
  useEffect(() => {
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        // Configure resolution and limit based on time range
        let resolution: number;
        let limit: number;

        switch (chartTimeRange) {
          case '1h':
            resolution = 300000; // 5-minute candles
            limit = 12; // 12 * 5min = 1 hour
            break;
          case '4h':
            resolution = 900000; // 15-minute candles
            limit = 16; // 16 * 15min = 4 hours
            break;
          case '1d':
            resolution = 3600000; // 1-hour candles
            limit = 24; // 24 * 1h = 1 day
            break;
          case '1w':
            resolution = 86400000; // 1-day candles
            limit = 7; // 7 * 1d = 1 week
            break;
          case '1m':
            resolution = 604800000; // 1-week candles
            limit = 4; // 4 * 1w = ~1 month
            break;
          default:
            resolution = 3600000;
            limit = 24;
        }

        const aggregations = await getTradeAggregations(
          sellingAsset, sellingIssuer,
          buyingAsset, buyingIssuer,
          resolution,
          limit
        );
        setChartData(aggregations);
      } catch {
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    };

    if (mounted) {
      fetchChartData();
    }
  }, [sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted, chartTimeRange]);

  // Fetch user's filled orders (trade history) - also clears on wallet change
  useEffect(() => {
    const fetchFilledOrders = async () => {
      if (!activeWalletId) {
        setFilledOrders([]);
        return;
      }
      const wallet = wallets.find(w => w.id === activeWalletId);
      if (!wallet) {
        setFilledOrders([]);
        return;
      }

      setFilledLoading(true);
      try {
        const tradesData = await getAccountTrades(wallet.publicKey, 50);
        // Transform Horizon trades to component format
        const formattedOrders = tradesData.map((trade: any) => {
          // Determine if the current user was the buyer or seller of the BASE asset
          // For regular trades: check base_is_seller and which account we are
          // For LP trades: liquidity_pool_id is present, and direction is determined differently
          let isBuyer: boolean;
          
          if (trade.liquidity_pool_id) {
            // This is a trade against a liquidity pool
            // In LP trades, the user account is always "base_account" when they initiate
            // base_is_seller=true means user sent base to LP (SELL)
            // base_is_seller=false means user received base from LP (BUY)
            isBuyer = !trade.base_is_seller;
          } else {
            // Regular order book trade
            const isBaseAccount = trade.base_account === wallet.publicKey;
            
            if (isBaseAccount) {
              // We are the base account
              // base_is_seller=true means we sold base asset
              // base_is_seller=false means we bought base asset
              isBuyer = !trade.base_is_seller;
            } else {
              // We are the counter account
              // If base sold base, we (counter) bought base
              // If base bought base, we (counter) sold base
              isBuyer = trade.base_is_seller;
            }
          }
          
          const price = trade.price?.n && trade.price?.d 
            ? (parseFloat(trade.price.n) / parseFloat(trade.price.d)).toFixed(7)
            : '0';
          return {
            id: trade.id,
            price,
            baseAmount: trade.base_amount || '0',
            counterAmount: trade.counter_amount || '0',
            baseCode: trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code,
            counterCode: trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code,
            timestamp: trade.ledger_close_time,
            isBuyer,
            isLPTrade: !!trade.liquidity_pool_id, // Flag for visual inversion in component
          };
        });
        setFilledOrders(formattedOrders);
      } catch {
        setFilledOrders([]);
      } finally {
        setFilledLoading(false);
      }
    };

    if (mounted) {
      fetchFilledOrders();
    }
  }, [activeWalletId, wallets, mounted]);

  // Fetch XLM/USD market stats
  useEffect(() => {
    const fetchXlmStats = async () => {
      const stats = await getXLMUSDStats();
      if (stats) {
        setXlmUsdStats(stats);
      }
    };

    if (mounted) {
      fetchXlmStats();
      // Refresh every 60 seconds
      const interval = setInterval(fetchXlmStats, 60000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  // Fetch available balances (accounting for committed orders and network reserve)
  useEffect(() => {
    // Don't fetch if not mounted - will be called again when mounted becomes true
    if (!mounted || !activeWalletId) return;
    
    const wallet = wallets.find(w => w.id === activeWalletId);
    if (!wallet) return;

    const fetchAvailableBalances = async () => {
      setBalancesLoading(true);
      try {
        // Use Promise.allSettled to prevent one failure from blocking both
        const results = await Promise.allSettled([
          calculateAvailableBalance(wallet.publicKey, sellingAsset, sellingIssuer),
          calculateAvailableBalance(wallet.publicKey, buyingAsset, buyingIssuer),
        ]);
        
        // Extract values, defaulting to '0' if promise was rejected
        const sellingAvail = results[0].status === 'fulfilled' ? results[0].value : '0';
        const buyingAvail = results[1].status === 'fulfilled' ? results[1].value : '0';
        
        setAvailableSellingBalance(sellingAvail);
        setAvailableBuyingBalance(buyingAvail);
      } catch (error) {
        console.error('[v0] Error fetching available balances:', error);
        // Set default values on error
        setAvailableSellingBalance('0');
        setAvailableBuyingBalance('0');
      } finally {
        setBalancesLoading(false);
      }
    };

    fetchAvailableBalances();
  }, [activeWalletId, wallets, sellingAsset, sellingIssuer, buyingAsset, buyingIssuer, mounted]);

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
    if (!globalDecryptedSecret) {
      setTxResult({ success: false, message: 'Wallet is locked. Please restart the app to unlock.' });
      return;
    }
    submitOrder({ type: 'buy', price, amount }, globalDecryptedSecret);
  };

  const handleSellClick = (price: string, amount: string) => {
    if (!price || !amount || parseFloat(amount) <= 0) {
      setTxResult({ success: false, message: 'Please enter valid price and amount' });
      return;
    }
    if (!globalDecryptedSecret) {
      setTxResult({ success: false, message: 'Wallet is locked. Please restart the app to unlock.' });
      return;
    }
    submitOrder({ type: 'sell', price, amount }, globalDecryptedSecret);
  };
  
  // Inner helper — places the actual offer on-chain
  const placeOffer = async (order: { type: 'buy' | 'sell'; price: string; amount: string }, secret: string) => {
    let result;
    if (order.type === 'buy') {
      result = await submitManageBuyOffer(
        secret,
        buyingAsset,
        buyingIssuer,
        sellingAsset,
        sellingIssuer,
        order.amount,
        order.price,
      );
    } else {
      result = await submitManageSellOffer(
        secret,
        sellingAsset,
        sellingIssuer,
        buyingAsset,
        buyingIssuer,
        order.amount,
        order.price,
      );
    }
    return result;
  };

  const submitOrder = async (order: { type: 'buy' | 'sell'; price: string; amount: string }, secret: string) => {
    setIsSubmitting(true);
    setTxResult(null);
    setPendingOrder(order);

    try {
      // Show single unified message while processing both steps
      setTxResult({ success: false, message: 'Processing order...' });

      // ── Step 1: ensure trustline exists before placing the offer ──────────
      const assetCode   = buyingAsset;
      const assetIssuer = buyingIssuer;
      let needsTrustlineCreated = false;

      if (assetCode !== 'XLM' && assetIssuer) {
        const hasTrust = activeWallet?.balances
          ? hasTrustline(activeWallet.balances, assetCode, assetIssuer)
          : false;

        if (!hasTrust) {
          const trustResult = await addTrustline(secret, assetCode, assetIssuer);
          if (!trustResult.success) {
            setTxResult({ success: false, message: `Failed: ${trustResult.error}` });
            setPendingOrder(null);
            return;
          }
          // Trustline was successfully created on mainnet
          needsTrustlineCreated = true;
          // Refresh balances to reflect the new trustline
          if (activeWalletId) await updateBalances(activeWalletId);
          // Wait for ledger to fully process the trustline before attempting the offer
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      // ── Step 2: place the offer ───────────────────────────────────────────
      const result = await placeOffer(order, secret);

      if (result.success) {
        // Success! Clear form, refresh data, show final confirmation
        setTxResult({ success: true, message: `Order placed! TX: ${result.hash?.substring(0, 8)}...` });
        setPendingOrder(null);
        if (order.type === 'buy') {
          setBuyPrice('');
          setBuyAmount('');
        } else {
          setSellPrice('');
          setSellAmount('');
        }
        // Refresh order book and available balances
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data);
        if (activeWalletId && activeWallet) {
          await updateBalances(activeWalletId);
          const [sellingAvail, buyingAvail] = await Promise.all([
            calculateAvailableBalance(activeWallet.publicKey, sellingAsset, sellingIssuer),
            calculateAvailableBalance(activeWallet.publicKey, buyingAsset, buyingIssuer),
          ]);
          setAvailableSellingBalance(sellingAvail);
          setAvailableBuyingBalance(buyingAvail);
        }
      } else if (result.error && (result.error.includes('op_buy_no_trust') || result.error.includes('no_trust'))) {
        // Network rejected due to missing trustline (pre-check missed it due to stale balances).
        // Create trustline and retry the offer.
        const trustResult = await addTrustline(secret, buyingAsset, buyingIssuer);
        if (!trustResult.success) {
          setTxResult({ success: false, message: `Failed: ${trustResult.error}` });
          setPendingOrder(null);
        } else {
          // Trustline created successfully, now retry the offer
          if (activeWalletId) await updateBalances(activeWalletId);
          // Wait for ledger to fully confirm the trustline
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          const retry = await placeOffer(order, secret);
          if (retry.success) {
            setTxResult({ success: true, message: `Order placed! TX: ${retry.hash?.substring(0, 8)}...` });
            setPendingOrder(null);
            if (order.type === 'buy') { setBuyPrice(''); setBuyAmount(''); }
            else { setSellPrice(''); setSellAmount(''); }
            const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
            setOrderBook(data);
            if (activeWalletId && activeWallet) {
              await updateBalances(activeWalletId);
              const [sa, ba] = await Promise.all([
                calculateAvailableBalance(activeWallet.publicKey, sellingAsset, sellingIssuer),
                calculateAvailableBalance(activeWallet.publicKey, buyingAsset, buyingIssuer),
              ]);
              setAvailableSellingBalance(sa);
              setAvailableBuyingBalance(ba);
            }
          } else {
            setTxResult({ success: false, message: `Failed: ${retry.error || 'Order failed after trustline creation'}` });
            setPendingOrder(null);
          }
        }
      } else {
        setTxResult({ success: false, message: result.error || 'Failed to submit order' });
        setPendingOrder(null);
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to submit order' });
      setPendingOrder(null);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancelOrder = (id: string) => {
    if (!globalDecryptedSecret) {
      setTxResult({ success: false, message: 'Wallet is locked. Please restart the app to unlock.' });
      return;
    }
    
    // If already unlocked, proceed directly to cancel
    proceedWithCancelOrder(id);
  };

  const proceedWithCancelOrder = async (id: string) => {
    const order = myOrders.find(o => o.id === id);
    if (!order || !globalDecryptedSecret) return;
    
    setIsSubmitting(true);
    try {
      const result = await cancelOffer(
        globalDecryptedSecret,
        id,
        order.sellingCode,
        order.sellingIssuer,
        order.buyingCode,
        order.buyingIssuer
      );
      
      if (result.success) {
        setMyOrders(myOrders.filter(o => o.id !== id));
        setTxResult({ success: true, message: 'Order cancelled successfully' });
        // Refresh available balances after cancellation
        if (activeWalletId && activeWallet) {
          const [sellingAvail, buyingAvail] = await Promise.all([
            calculateAvailableBalance(activeWallet.publicKey, sellingAsset, sellingIssuer),
            calculateAvailableBalance(activeWallet.publicKey, buyingAsset, buyingIssuer),
          ]);
          setAvailableSellingBalance(sellingAvail);
          setAvailableBuyingBalance(buyingAvail);
        }
      } else {
        setTxResult({ success: false, message: result.error || 'Failed to cancel order' });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to cancel order' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [cancellingAll, setCancellingAll] = useState(false);

  const handleCancelAllOrders = async () => {
    if (!globalDecryptedSecret) {
      setTxResult({ success: false, message: 'Wallet is locked. Please restart the app to unlock.' });
      return;
    }
    const ordersToCancel = myOrders.slice(0, 99);
    if (ordersToCancel.length === 0) return;

    setCancellingAll(true);
    setTxResult(null);
    let cancelled = 0;
    let failed = 0;

    for (const order of ordersToCancel) {
      try {
        const result = await cancelOffer(
          globalDecryptedSecret,
          order.id,
          order.sellingCode,
          order.sellingIssuer,
          order.buyingCode,
          order.buyingIssuer
        );
        if (result.success) {
          cancelled++;
          setMyOrders(prev => prev.filter(o => o.id !== order.id));
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Refresh available balances after bulk cancellation
    if (activeWalletId && activeWallet) {
      const [sellingAvail, buyingAvail] = await Promise.all([
        calculateAvailableBalance(activeWallet.publicKey, sellingAsset, sellingIssuer),
        calculateAvailableBalance(activeWallet.publicKey, buyingAsset, buyingIssuer),
      ]);
      setAvailableSellingBalance(sellingAvail);
      setAvailableBuyingBalance(buyingAvail);
    }

    if (failed === 0) {
      setTxResult({ success: true, message: `Cancelled ${cancelled} order${cancelled !== 1 ? 's' : ''}` });
    } else {
      setTxResult({ success: false, message: `Cancelled ${cancelled}, failed ${failed}` });
    }
    setCancellingAll(false);
  };

  // Smart number formatter to remove excessive decimals
  const formatNumber = (num: string | number): string => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (!n || n === 0) return '0';
    
    // For very small numbers (< 0.01), use up to 7 decimals
    if (n < 0.01) {
      return n.toFixed(7).replace(/\.?0+$/, '');
    }
    
    // For standard numbers, use up to 6 decimals
    return n.toFixed(6).replace(/\.?0+$/, '');
  };

  // Clicking a BID order = someone wants to BUY, so you can SELL to them
  const handleSelectBidOrder = (price: string, amount: string) => {
    const formattedPrice = formatNumber(price);
    const formattedAmount = formatNumber(amount);
    setSellPrice(formattedPrice);
    setSellAmount(formattedAmount);
    // Also populate BUY side with the same price for comparison
    setBuyPrice(formattedPrice);
  };

  // Clicking an ASK order = someone wants to SELL, so you can BUY from them
  const handleSelectAskOrder = (price: string, amount: string) => {
    const formattedPrice = formatNumber(price);
    const formattedAmount = formatNumber(amount);
    setBuyPrice(formattedPrice);
    setBuyAmount(formattedAmount);
    // Also populate SELL side with the same price for comparison
    setSellPrice(formattedPrice);
  };

  const tabs = [
    { id: 'history', label: 'History', Icon: History },
    { id: 'my-orders', label: 'My Orders', Icon: ClipboardList },
    { id: 'filled', label: 'Filled', Icon: CheckCircle2 },
    { id: 'charts', label: 'Charts', Icon: BarChart3 },
  ] as const;

  return (
    <main className="min-h-dvh bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <WalletSelectorDropdown />
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Stellar DEX</h1>
                <p className="text-muted-foreground text-sm">Trade on the Stellar Decentralized Exchange</p>
              </div>
            </div>
          </div>

          {/* Token Pair Selector - Integrated Oval Design */}
          <div className="flex flex-col items-center gap-4">
            <div className="glow-border rounded-full px-8 py-6 sm:px-12 sm:py-8 flex items-center justify-center gap-4 sm:gap-8 border-2">
              {/* Selling Token */}
              <button
                onClick={() => setTokenModal('selling')}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center border border-primary/50 hover:border-primary/80 transition-colors overflow-hidden">
                  {sellingMeta.image ? (
                    <img src={sellingMeta.image} alt={sellingAsset} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : (
                    <p className="text-lg sm:text-xl font-bold text-primary">{sellingAsset.charAt(0).toUpperCase()}</p>
                  )}
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground">{sellingAsset}</p>
                {sellingMeta.domain && (
                  <p className="text-xs text-muted-foreground">{sellingMeta.domain}</p>
                )}
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
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-accent/40 to-accent/20 flex items-center justify-center border border-accent/50 hover:border-accent/80 transition-colors overflow-hidden">
                  {buyingMeta.image ? (
                    <img src={buyingMeta.image} alt={buyingAsset} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : (
                    <p className="text-lg sm:text-xl font-bold text-accent">{buyingAsset.charAt(0).toUpperCase()}</p>
                  )}
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground">{buyingAsset}</p>
                {buyingMeta.domain && (
                  <p className="text-xs text-muted-foreground">{buyingMeta.domain}</p>
                )}
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
            sellingBalance={availableSellingBalance}
            buyingBalance={availableBuyingBalance}
            bestBid={bestBid ?? undefined}
            bestAsk={bestAsk ?? undefined}
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
              {/* Market Stats */}
              {xlmUsdStats && (
                <div className="glow-border p-4 rounded-lg">
                  <div className="text-center mb-3 pb-3 border-b border-border/50">
                    <p className="text-xs text-muted-foreground">XLM / USD Market Stats</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">% Change (24h)</p>
                      <p className={`font-bold text-sm ${xlmUsdStats.priceChange24h >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {xlmUsdStats.priceChange24h >= 0 ? '+' : ''}{xlmUsdStats.priceChange24h.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Volume (24h)</p>
                      <p className="font-bold text-sm text-foreground">{xlmUsdStats.volume24h}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Low (24h)</p>
                        <p className="font-bold text-xs text-foreground">{parseFloat(xlmUsdStats.low24h).toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">High (24h)</p>
                        <p className="font-bold text-xs text-foreground">{parseFloat(xlmUsdStats.high24h).toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Open (24h)</p>
                        <p className="font-bold text-xs text-foreground">{parseFloat(xlmUsdStats.open24h).toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Close (24h)</p>
                        <p className="font-bold text-xs text-foreground">{parseFloat(xlmUsdStats.close24h).toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 font-medium transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content — only the active tab is rendered */}
          <div className="mt-2 min-h-96">
            {activeTab === 'history' && (
              tradesLoading
                ? <OrderBookSkeleton />
                : <TradeHistory
                    trades={trades}
                    loading={tradesLoading}
                    buyingAsset={buyingAsset}
                    sellingAsset={sellingAsset}
                  />
            )}

            {activeTab === 'my-orders' && (
              ordersLoading
                ? <OrderBookSkeleton />
                : <MyOrders
                    orders={myOrders}
                    loading={ordersLoading}
                    onCancelOrder={handleCancelOrder}
                    onCancelAll={handleCancelAllOrders}
                    cancellingAll={cancellingAll}
                    buyingAsset={buyingAsset}
                    sellingAsset={sellingAsset}
                  />
            )}

            {activeTab === 'filled' && (
              filledLoading
                ? <OrderBookSkeleton />
                : <FilledOrders
                    orders={filledOrders}
                    loading={filledLoading}
                  />
            )}

            {activeTab === 'charts' && (
              chartLoading
                ? <ChartSkeleton />
                : <PriceChart
                    data={chartData}
                    loading={chartLoading}
                    sellingAsset={sellingAsset}
                    buyingAsset={buyingAsset}
                    timeRange={chartTimeRange}
                    onTimeRangeChange={setChartTimeRange}
                  />
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


