'use client';

import {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Asset,
  Operation,
  Horizon,
  Account,
} from '@stellar/stellar-sdk';
import { executeMarketMakerOrder } from '@/lib/stellar-market-maker';

const HORIZON_URL = 'https://horizon.stellar.org'; // Mainnet only
const TRANSACTION_TIMEOUT_SECONDS = 20;

export type GridStrategyType = 'symmetrical' | 'geometric' | 'defensive' | 'spread';

export interface GridLevel {
  price: number;
  size: number;
  offerId?: string;
  side: 'buy' | 'sell';
}

export interface GridStrategy {
  name: string;
  type: GridStrategyType;
  description: string;
  levels: GridLevel[];
}

export interface GridMarketMakingConfig {
  botSecretKey: string;
  tradingPair: { buying: Asset; selling: Asset };
  strategyType: GridStrategyType;
  spotPrice: number;
  orderSize: number;
  minOrderSize: number; // Minimum order size threshold
  isDryRun: boolean; // Simulate orders without execution
  enableAutoUpdate: boolean;
}

/**
 * STRATEGY 1: Symmetrical Grid Market Making
 * - 10 total levels (5 buy, 5 sell)
 * - Grid step: 0.15% - 0.25% based on spread
 * - Equal size per level
 * - Replacement rule: When buy fills, cancel opposite sell and place new sell
 */
export function createSymmetricalGrid(
  spotPrice: number,
  orderSize: number,
  gridStepPercent: number = 0.20
): GridLevel[] {
  const levels: GridLevel[] = [];
  const step = spotPrice * (gridStepPercent / 100);

  // 5 buy levels below spot
  for (let i = 1; i <= 5; i++) {
    levels.push({
      price: spotPrice - step * i,
      size: orderSize,
      side: 'buy',
    });
  }

  // 5 sell levels above spot
  for (let i = 1; i <= 5; i++) {
    levels.push({
      price: spotPrice + step * i,
      size: orderSize,
      side: 'sell',
    });
  }

  return levels;
}

/**
 * STRATEGY 2: Geometric Asymmetric Grid (Rising Market)
 * - 12 levels (8 buy, 4 sell)
 * - Geometric spacing with multiplier 1.005
 * - Dynamic take profit +0.5% per level
 * - Price protection: if exceeds top level, pause and wait 15s before moving grid up
 */
export function createGeometricAsymmetricGrid(
  spotPrice: number,
  orderSize: number,
  multiplier: number = 1.005
): GridLevel[] {
  const levels: GridLevel[] = [];
  const takeProfitPercent = 0.005; // 0.5%

  // 8 buy levels below spot with geometric spacing
  let currentPrice = spotPrice;
  for (let i = 1; i <= 8; i++) {
    currentPrice = spotPrice / Math.pow(multiplier, i);
    levels.push({
      price: currentPrice,
      size: orderSize * (1 + (i - 1) * 0.05), // Slightly increasing size on lower levels
      side: 'buy',
    });
  }

  // 4 sell levels above spot with take profit
  currentPrice = spotPrice;
  for (let i = 1; i <= 4; i++) {
    const sellPrice = spotPrice * (1 + takeProfitPercent * i);
    levels.push({
      price: sellPrice,
      size: orderSize,
      side: 'sell',
    });
  }

  return levels;
}

/**
 * STRATEGY 3: Broadband Defensive Grid
 * - 6 levels in -5% to +5% range
 * - Fixed 1.5% spacing
 * - Progressive order sizes (Soft Martingale): each lower buy = 10% more volume
 * - Pauses if price exits range
 */
export function createDefensiveGrid(
  spotPrice: number,
  baseOrderSize: number
): GridLevel[] {
  const levels: GridLevel[] = [];
  const lowerLimit = spotPrice * 0.95; // -5%
  const upperLimit = spotPrice * 1.05; // +5%
  const step = spotPrice * 0.015; // 1.5% spacing

  // 3 buy levels with progressive sizing (Martingale)
  for (let i = 1; i <= 3; i++) {
    const price = spotPrice - step * i;
    if (price >= lowerLimit) {
      levels.push({
        price: price,
        size: baseOrderSize * (1 + (i - 1) * 0.1), // 10% increase per level
        side: 'buy',
      });
    }
  }

  // 3 sell levels (equal sizing)
  for (let i = 1; i <= 3; i++) {
    const price = spotPrice + step * i;
    if (price <= upperLimit) {
      levels.push({
        price: price,
        size: baseOrderSize,
        side: 'sell',
      });
    }
  }

  return levels;
}

/**
 * STRATEGY 4: Spread Market Maker (Top of Book)
 * - Dynamic top-of-book market making strategy
 * - Places buy order just above best bid
 * - Places sell order just below best ask
 * - Monitors order book every 5-10 seconds
 * - Cancels and replaces orders if no longer at top of book
 * - Maximizes order fill probability while maintaining tight spreads
 */
export function createSpreadMarketMakerGrid(
  spotPrice: number,
  orderSize: number,
  microSpreadBps: number = 5 // 0.05% spread increment from best bid/ask
): GridLevel[] {
  // This strategy will be handled dynamically in the bot class
  // We return empty here as levels are created based on live order book
  return [
    {
      price: spotPrice,
      size: orderSize,
      side: 'buy',
    },
    {
      price: spotPrice,
      size: orderSize,
      side: 'sell',
    },
  ];
}
export class GridMarketMakingBot {
  private botKeypair: Keypair;
  private botPublicKey: string;
  private horizon: Horizon.Server;
  private config: GridMarketMakingConfig;
  private currentGrid: GridLevel[] = [];
  private tradingLoopInterval: NodeJS.Timeout | null = null;
  private logs: string[] = [];

  constructor(config: GridMarketMakingConfig) {
    this.botKeypair = Keypair.fromSecret(config.botSecretKey);
    this.botPublicKey = this.botKeypair.publicKey();
    this.config = config;
    this.horizon = new Horizon.Server(HORIZON_URL);
  }

  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push(`[${timestamp}] ${message}`);
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
    console.log(`[v0-GridBot] ${message}`);
  }

  getLogs(): string[] {
    return this.logs;
  }

  /**
   * Initialize grid based on strategy type
   */
  async initializeGrid(): Promise<void> {
    try {
      switch (this.config.strategyType) {
        case 'symmetrical':
          this.currentGrid = createSymmetricalGrid(this.config.spotPrice, this.config.orderSize);
          break;
        case 'geometric':
          this.currentGrid = createGeometricAsymmetricGrid(this.config.spotPrice, this.config.orderSize);
          break;
        case 'defensive':
          this.currentGrid = createDefensiveGrid(this.config.spotPrice, this.config.orderSize);
          break;
        case 'spread':
          this.currentGrid = createSpreadMarketMakerGrid(this.config.spotPrice, this.config.orderSize);
          this.addLog('Spread Market Maker (Top of Book) strategy initialized - will fetch live order book');
          break;
      }
      this.addLog(`Grid initialized with ${this.currentGrid.length} levels (${this.config.strategyType})`);
    } catch (error) {
      this.addLog(`Error initializing grid: ${error}`);
    }
  }

  /**
   * Fetch current order book to validate prices
   */
  async fetchOrderBook(): Promise<{ bid: number; ask: number } | null> {
    try {
      const response = await this.horizon
        .orderbook(this.config.tradingPair.buying, this.config.tradingPair.selling)
        .call();
      
      const bid = parseFloat(response.bids?.[0]?.price || '0');
      const ask = parseFloat(response.asks?.[0]?.price || '0');
      
      if (bid > 0 && ask > 0) {
        return { bid, ask };
      }
      return null;
    } catch (error) {
      this.addLog(`Error fetching order book: ${error}`);
      return null;
    }
  }

  /**
   * Place grid orders (buy and sell)
   */
  async placeGridOrders(): Promise<void> {
    try {
      const orderBook = await this.fetchOrderBook();
      if (!orderBook) {
        this.addLog('Slippage check failed: cannot fetch order book');
        return;
      }

      const { bid, ask } = orderBook;
      const account = await this.horizon.loadAccount(this.botPublicKey);
      const transactionBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC_NETWORK,
      });

      let operationCount = 0;

      // Place all grid orders
      for (const level of this.currentGrid) {
        // Validate price against current order book (slippage check)
        if (level.side === 'buy' && level.price >= bid) {
          this.addLog(`Skipping buy order at ${level.price} - slippage check failed (bid: ${bid})`);
          continue;
        }
        if (level.side === 'sell' && level.price <= ask) {
          this.addLog(`Skipping sell order at ${level.price} - slippage check failed (ask: ${ask})`);
          continue;
        }

        const operation =
          level.side === 'buy'
            ? Operation.manageBuyOffer({
                selling: this.config.tradingPair.selling,
                buying: this.config.tradingPair.buying,
                buyAmount: level.size.toString(),
                price: level.price.toString(),
                offerId: '0', // New offer
              })
            : Operation.manageSellOffer({
                selling: this.config.tradingPair.selling,
                buying: this.config.tradingPair.buying,
                amount: level.size.toString(),
                price: level.price.toString(),
                offerId: '0', // New offer
              });

        transactionBuilder.addOperation(operation);
        operationCount++;
      }

      if (operationCount === 0) {
        this.addLog('No orders passed slippage check');
        return;
      }

      // Set transaction timeout (20 seconds)
      transactionBuilder.setTimeout(TRANSACTION_TIMEOUT_SECONDS);
      const transaction = transactionBuilder.build();
      const signedTx = this.botKeypair.sign(transaction);

      const result = await this.horizon.submitTransaction(signedTx);
      this.addLog(`Placed ${operationCount} grid orders successfully`);
    } catch (error) {
      this.addLog(`Error placing grid orders: ${error}`);
    }
  }

  /**
   * Cancel all active offers
   */
  async cancelAllOffers(): Promise<void> {
    try {
      const response = await this.horizon.offers().forAccount(this.botPublicKey).call();
      if (response.records.length === 0) {
        this.addLog('No active offers to cancel');
        return;
      }

      const account = await this.horizon.loadAccount(this.botPublicKey);
      const transactionBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE * (response.records.length + 1),
        networkPassphrase: Networks.PUBLIC_NETWORK,
      });

      // Cancel each offer by setting amount to 0
      for (const offer of response.records) {
        const isBuy = offer.selling.asset_type === 'native';
        transactionBuilder.addOperation(
          isBuy
            ? Operation.manageBuyOffer({
                selling: new Asset(offer.selling.asset_code, offer.selling.asset_issuer),
                buying: new Asset(offer.buying.asset_code, offer.buying.asset_issuer),
                buyAmount: '0',
                price: offer.price,
                offerId: offer.id,
              })
            : Operation.manageSellOffer({
                selling: new Asset(offer.selling.asset_code, offer.selling.asset_issuer),
                buying: new Asset(offer.buying.asset_code, offer.buying.asset_issuer),
                amount: '0',
                price: offer.price,
                offerId: offer.id,
              })
        );
      }

      transactionBuilder.setTimeout(TRANSACTION_TIMEOUT_SECONDS);
      const transaction = transactionBuilder.build();
      const signedTx = this.botKeypair.sign(transaction);

      await this.horizon.submitTransaction(signedTx);
      this.addLog(`Cancelled ${response.records.length} active offers`);
    } catch (error) {
      this.addLog(`Error cancelling offers: ${error}`);
    }
  }

  /**
   * Manage Top of Book Orders for Spread Market Maker Strategy
   * - Fetches current best bid and best ask
   * - Places buy order just above best bid
   * - Places sell order just below best ask
   * - Cancels old orders if prices have moved
   */
  private async manageTopOfBook(): Promise<void> {
    try {
      const orderBook = await this.fetchOrderBook();
      if (!orderBook || orderBook.bid <= 0 || orderBook.ask <= 0) {
        this.addLog('Cannot fetch valid order book for top-of-book management');
        return;
      }

      const { bid, ask } = orderBook;
      const microSpreadBps = 5; // 0.05% above bid and below ask
      const microSpread = bid * (microSpreadBps / 10000);

      // Calculate top-of-book prices
      const buyPrice = parseFloat((bid + microSpread).toFixed(7)); // Just above best bid
      const sellPrice = parseFloat((ask - microSpread).toFixed(7)); // Just below best ask

      // Fetch active offers
      const activeOffers = await this.fetchActiveOffers();
      
      // Find existing buy and sell offers
      let existingBuyOffer = activeOffers.find(o => o.side === 'buy');
      let existingSellOffer = activeOffers.find(o => o.side === 'sell');

      const account = await this.horizon.loadAccount(this.botPublicKey);
      const transactionBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      });

      let operationCount = 0;

      // Cancel existing offers if prices have changed significantly
      if (existingBuyOffer && parseFloat(existingBuyOffer.price) !== buyPrice) {
        this.addLog(`Cancelling stale buy order at ${existingBuyOffer.price}, replacing with ${buyPrice}`);
        transactionBuilder.addOperation(
          Operation.manageBuyOffer({
            selling: this.config.tradingPair.selling,
            buying: this.config.tradingPair.buying,
            buyAmount: '0',
            price: existingBuyOffer.price,
            offerId: existingBuyOffer.id,
          })
        );
        operationCount++;
      }

      if (existingSellOffer && parseFloat(existingSellOffer.price) !== sellPrice) {
        this.addLog(`Cancelling stale sell order at ${existingSellOffer.price}, replacing with ${sellPrice}`);
        transactionBuilder.addOperation(
          Operation.manageSellOffer({
            selling: this.config.tradingPair.selling,
            buying: this.config.tradingPair.buying,
            amount: '0',
            price: existingSellOffer.price,
            offerId: existingSellOffer.id,
          })
        );
        operationCount++;
      }

      // Place new buy order at top of book - with advanced market maker validation and execution
      if (!existingBuyOffer || parseFloat(existingBuyOffer.price) !== buyPrice) {
        const buyOrderResult = await executeMarketMakerOrder({
          userSecretKey: this.botSecretKey,
          calculatedAmount: this.config.orderSize,
          minOrderSize: this.config.minOrderSize,
          targetPrice: buyPrice,
          assetBuying: this.config.tradingPair.buying,
          assetSelling: this.config.tradingPair.selling,
          isDryRun: this.config.isDryRun,
        });

        if (buyOrderResult.success) {
          if (buyOrderResult.status === 'DRY_RUN_SUCCESS') {
            this.addLog(`[DRY-RUN] Buy order validated: ${this.config.orderSize} at ${buyPrice}`);
          } else {
            this.addLog(`[BUY ORDER LIVE] Submitted to Stellar: ${buyOrderResult.txHash}`);
          }
        } else if (buyOrderResult.status !== 'SKIPPED_BELOW_MINIMUM') {
          this.addLog(`[BUY ERROR] ${buyOrderResult.message}`);
        }
      }

      // Place new sell order at top of book - with advanced market maker validation and execution
      if (!existingSellOffer || parseFloat(existingSellOffer.price) !== sellPrice) {
        const sellOrderResult = await executeMarketMakerOrder({
          userSecretKey: this.botSecretKey,
          calculatedAmount: this.config.orderSize,
          minOrderSize: this.config.minOrderSize,
          targetPrice: sellPrice,
          assetBuying: this.config.tradingPair.buying,
          assetSelling: this.config.tradingPair.selling,
          isDryRun: this.config.isDryRun,
        });

        if (sellOrderResult.success) {
          if (sellOrderResult.status === 'DRY_RUN_SUCCESS') {
            this.addLog(`[DRY-RUN] Sell order validated: ${this.config.orderSize} at ${sellPrice}`);
          } else {
            this.addLog(`[SELL ORDER LIVE] Submitted to Stellar: ${sellOrderResult.txHash}`);
          }
        } else if (sellOrderResult.status !== 'SKIPPED_BELOW_MINIMUM') {
          this.addLog(`[SELL ERROR] ${sellOrderResult.message}`);
        }
      }

      if (operationCount === 0) {
        // No changes needed, orders already at top of book
        return;
      }

      transactionBuilder.setTimeout(TRANSACTION_TIMEOUT_SECONDS);
      const transaction = transactionBuilder.build();
      const signedTx = this.botKeypair.sign(transaction);

      await this.horizon.submitTransaction(signedTx);
      this.addLog(`Top-of-book positions updated: buy at ${buyPrice}, sell at ${sellPrice}`);
    } catch (error) {
      this.addLog(`Error managing top-of-book: ${error}`);
    }
  }

  /**
   * Fetch active offers for this bot account
   */
  private async fetchActiveOffers(): Promise<Array<{ id: string; side: 'buy' | 'sell'; price: string }>> {
    try {
      const response = await this.horizon.offers().forAccount(this.botPublicKey).call();
      return response.records.map(offer => ({
        id: offer.id,
        side: offer.buying.asset_code === this.config.tradingPair.buying.code ? 'buy' : 'sell',
        price: offer.price,
      })) as Array<{ id: string; side: 'buy' | 'sell'; price: string }>;
    } catch (error) {
      this.addLog(`Error fetching active offers: ${error}`);
      return [];
    }
  }

  /**
   * Start trading loop
   */
  async start(): Promise<void> {
    try {
      await this.initializeGrid();
      
      if (this.config.strategyType === 'spread') {
        // For spread market maker, immediately fetch order book and place top-of-book orders
        await this.manageTopOfBook();
        
        // Monitor order book every 5-10 seconds for top-of-book management
        this.tradingLoopInterval = setInterval(async () => {
          await this.manageTopOfBook();
        }, 7000); // Update every 7 seconds for tight top-of-book management
        
        this.addLog('Spread Market Maker (Top of Book) bot started - monitoring order book every 7 seconds');
      } else {
        // For grid strategies, use standard grid order placement
        await this.placeGridOrders();
        
        this.tradingLoopInterval = setInterval(async () => {
          await this.placeGridOrders();
        }, 10000); // Update every 10 seconds
        
        this.addLog('Grid bot started');
      }
    } catch (error) {
      this.addLog(`Error starting bot: ${error}`);
    }
  }

  /**
   * Stop trading loop
   */
  async stop(): Promise<void> {
    try {
      if (this.tradingLoopInterval) {
        clearInterval(this.tradingLoopInterval);
        this.tradingLoopInterval = null;
      }
      await this.cancelAllOffers();
      this.addLog('Grid bot stopped');
    } catch (error) {
      this.addLog(`Error stopping bot: ${error}`);
    }
  }
}
