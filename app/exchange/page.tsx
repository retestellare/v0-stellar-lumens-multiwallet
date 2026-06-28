'use client';

import React from 'react';
import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { getOrderBook, submitManageSellOffer, submitManageBuyOffer, decryptSecret, fetchTokenMetadataFromToml, getIssuerTokenIcon, getRecentTrades, getAccountOffers, cancelOffer, getTradeAggregations, getAccountTrades, getXLMUSDStats, hasTrustline, addTrustline, calculateAvailableBalance } from '@/lib/stellar-utils';
import { TradingPairHeader } from '@/components/trading-pair-header';
import { OrderBook } from '@/components/order-book';
import { TradeHistory } from '@/components/trade-history';
import { MyOrders } from '@/components/my-orders';
import { FilledOrders } from '@/components/filled-orders';
import { PriceChart } from '@/components/price-chart';
import { TokenSelectorModal } from '@/components/token-selector-modal';
import { CompactOrderForm } from '@/components/compact-order-form';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, ArrowRightLeft, X, Loader2, Wallet } from 'lucide-react';
import { WalletSelectorDropdown } from '@/components/wallet-selector-dropdown';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface OrderBookData {
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
}

type TabType = 'history' | 'my-orders' | 'charts';
type TokenModalType = 'selling' | 'buying' | null;

export default function ExchangePage() {
  const { wallets, activeWalletId, updateBalances } = useWallet();
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
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isPasswordUnlocked, setIsPasswordUnlocked] = useState(false); // Track if password entered this session
  const [decryptedSecret, setDecryptedSecret] = useState<string | null>(null); // Store decrypted secret
  
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

  // Reset password state when wallet changes (use ref to track previous wallet)
  const prevWalletIdRef = React.useRef(activeWalletId);
  useEffect(() => {
    if (prevWalletIdRef.current !== activeWalletId && activeWalletId && mounted) {
      // Clear password-related state when wallet changes
      setIsPasswordUnlocked(false);
      setDecryptedSecret(null);
      setPassword('');
      setPendingOrder(null);
      setTxResult(null);
      
      // Refresh balances for the new wallet
      updateBalances(activeWalletId);
    }
    prevWalletIdRef.current = activeWalletId;
  }, [activeWalletId, mounted, updateBalances]);

  // Fetch order book
  useEffect(() => {
    const fetchOrderBook = async () => {
      setLoading(true);
      try {
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data);
      } catch (error) {
        setOrderBook({ bids: [], asks: [] });
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      fetchOrderBook();
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
        const [sellingAvail, buyingAvail] = await Promise.all([
          calculateAvailableBalance(wallet.publicKey, sellingAsset, sellingIssuer),
          calculateAvailableBalance(wallet.publicKey, buyingAsset, buyingIssuer),
        ]);
        
        setAvailableSellingBalance(sellingAvail);
        setAvailableBuyingBalance(buyingAvail);
      } catch (error) {
        console.error('[v0] Error fetching available balances:', error);
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
    setPendingOrder({ type: 'buy', price, amount });
    // If already unlocked, submit directly; otherwise show password modal
    if (isPasswordUnlocked && decryptedSecret) {
      submitOrder({ type: 'buy', price, amount }, decryptedSecret);
    } else {
      setShowPasswordModal(true);
    }
  };

  const handleSellClick = (price: string, amount: string) => {
    if (!price || !amount || parseFloat(amount) <= 0) {
      setTxResult({ success: false, message: 'Please enter valid price and amount' });
      return;
    }
    setPendingOrder({ type: 'sell', price, amount });
    // If already unlocked, submit directly; otherwise show password modal
    if (isPasswordUnlocked && decryptedSecret) {
      submitOrder({ type: 'sell', price, amount }, decryptedSecret);
    } else {
      setShowPasswordModal(true);
    }
  };
  
  const submitOrder = async (order: { type: 'buy' | 'sell'; price: string; amount: string }, secret: string) => {
    setIsSubmitting(true);
    setTxResult(null);
    
    try {
      // Check trustline for the asset we're buying/receiving
      const assetToCheck = order.type === 'buy' 
        ? { code: buyingAsset, issuer: buyingIssuer }
        : { code: buyingAsset, issuer: buyingIssuer }; // When selling, we receive the buying asset
      
      if (assetToCheck.code !== 'XLM' && assetToCheck.issuer && activeWallet?.balances) {
        const hasTrust = hasTrustline(activeWallet.balances, assetToCheck.code, assetToCheck.issuer);
        
        if (!hasTrust) {
          // Auto-add trustline
          setTxResult({ success: false, message: `Creating trustline for ${assetToCheck.code}...` });
          const trustResult = await addTrustline(secret, assetToCheck.code, assetToCheck.issuer);
          
          if (!trustResult.success) {
            setTxResult({ success: false, message: `Failed to create trustline: ${trustResult.error}` });
            setIsSubmitting(false);
            return;
          }
          
          // Refresh balances after adding trustline
          if (activeWalletId) {
            await updateBalances(activeWalletId);
          }
          
          setTxResult({ success: true, message: `Trustline created for ${assetToCheck.code}. Submitting order...` });
          // Small delay to let the UI update and ensure balances are refreshed
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
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
      
      if (result.success) {
        setTxResult({ success: true, message: `Order submitted! TX: ${result.hash?.substring(0, 8)}...` });
        if (order.type === 'buy') {
          setBuyPrice('');
          setBuyAmount('');
        } else {
          setSellPrice('');
          setSellAmount('');
        }
        
        const data = await getOrderBook(sellingAsset, sellingIssuer, buyingAsset, buyingIssuer);
        setOrderBook(data);
        // Refresh balances and available balances after order
        if (activeWalletId && activeWallet) {
          await updateBalances(activeWalletId);
          // Recalculate available balances after order submission
          const [sellingAvail, buyingAvail] = await Promise.all([
            calculateAvailableBalance(activeWallet.publicKey, sellingAsset, sellingIssuer),
            calculateAvailableBalance(activeWallet.publicKey, buyingAsset, buyingIssuer),
          ]);
          setAvailableSellingBalance(sellingAvail);
          setAvailableBuyingBalance(buyingAvail);
        }
      } else {
        // Handle op_buy_no_trust error - trustline may have failed or been needed but not created
        if (result.error && (result.error.includes('op_buy_no_trust') || result.error.includes('no_trust'))) {
          setTxResult({ 
            success: false, 
            message: `Trustline for ${buyingAsset} needs to be created first. Please try again.` 
          });
        } else {
          setTxResult({ success: false, message: result.error || 'Failed to submit order' });
        }
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to submit order' });
    } finally {
      setIsSubmitting(false);
      setPendingOrder(null);
    }
  };
  
  const handleConfirmOrder = async () => {
    if (!activeWallet || !password) return;
    
    // Check if this is for an order submission or order cancellation
    if (!pendingOrder && !pendingCancelOrderId) return;
    
    setShowPasswordModal(false);
    
    try {
      // Decrypt and store the secret key for this session
      const secret = decryptSecret(activeWallet.encryptedSecret, password);
      setDecryptedSecret(secret);
      setIsPasswordUnlocked(true);
      setPassword(''); // Clear password from state
      
      // Handle order submission or cancellation
      if (pendingOrder) {
        await submitOrder(pendingOrder, secret);
      } else if (pendingCancelOrderId) {
        await proceedWithCancelOrder(pendingCancelOrderId);
        setPendingCancelOrderId(null);
      }
    } catch (error: any) {
      setTxResult({ success: false, message: 'Invalid password' });
      setPassword('');
      setPendingOrder(null);
      setPendingCancelOrderId(null);
    }
  };

  const handleCancelOrder = (id: string) => {
    if (!decryptedSecret) {
      setPendingCancelOrderId(id);
      setShowPasswordModal(true);
      return;
    }
    
    // If already unlocked, proceed directly to cancel
    proceedWithCancelOrder(id);
  };

  const proceedWithCancelOrder = async (id: string) => {
    const order = myOrders.find(o => o.id === id);
    if (!order || !decryptedSecret) return;
    
    setIsSubmitting(true);
    try {
      const result = await cancelOffer(
        decryptedSecret,
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

  // Clicking a BID order = someone wants to BUY, so you can SELL to them
  const handleSelectBidOrder = (price: string, amount: string) => {
    setSellPrice(price);
    setSellAmount(amount);
  };

  // Clicking an ASK order = someone wants to SELL, so you can BUY from them
  const handleSelectAskOrder = (price: string, amount: string) => {
    setBuyPrice(price);
    setBuyAmount(amount);
  };

  const tabs = [
    { id: 'history', label: 'History', icon: '����' },
    { id: 'my-orders', label: 'My Orders', icon: '📋' },
    { id: 'filled', label: 'Filled', icon: '✅' },
    { id: 'charts', label: 'Charts', icon: '📈' },
  ] as const;

  return (
    <main className="min-h-screen bg-background">
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

          {/* Trading Pair Header */}
          <TradingPairHeader
            sellingAsset={sellingAsset}
            sellingIssuer={sellingIssuer}
            buyingAsset={buyingAsset}
            buyingIssuer={buyingIssuer}
            onSwap={handleSwapPair}
            stats={xlmUsdStats || undefined}
          />

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
                loading={tradesLoading}
                buyingAsset={buyingAsset}
                sellingAsset={sellingAsset}
              />
            )}

            {activeTab === 'my-orders' && (
              <MyOrders
                orders={myOrders}
                loading={ordersLoading}
                onCancelOrder={handleCancelOrder}
                buyingAsset={buyingAsset}
                sellingAsset={sellingAsset}
              />
            )}

            {activeTab === 'filled' && (
              <FilledOrders
                orders={filledOrders}
                loading={filledLoading}
              />
            )}

            {activeTab === 'charts' && (
              <PriceChart
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
      
      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/20 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {pendingCancelOrderId ? 'Cancel Order' : 'Confirm Order'}
              </h3>
              <button onClick={() => { setShowPasswordModal(false); setPendingOrder(null); setPendingCancelOrderId(null); setPassword(''); }}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              {pendingCancelOrderId ? (
                <p className="text-muted-foreground">
                  Are you sure you want to cancel this order? Enter your password to confirm.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    {pendingOrder?.type === 'buy' ? 'BUY' : 'SELL'} {pendingOrder?.amount} {sellingAsset}
                  </p>
                  <p className="text-muted-foreground">
                    at {pendingOrder?.price} {buyingAsset} per {sellingAsset}
                  </p>
                </>
              )}
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
                autoComplete="current-password"
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowPasswordModal(false); setPendingOrder(null); setPendingCancelOrderId(null); setPassword(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmOrder}
                disabled={!password || isSubmitting}
                className={`flex-1 ${pendingCancelOrderId ? 'bg-destructive' : pendingOrder?.type === 'buy' ? 'bg-primary' : 'bg-destructive'}`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pendingCancelOrderId ? (
                  'Cancel Order'
                ) : (
                  'Confirm'
                )}
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


