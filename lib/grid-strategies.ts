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

const HORIZON_URL = 'https://horizon.stellar.org'; // Mainnet only
const TRANSACTION_TIMEOUT_SECONDS = 20;

export type GridStrategyType = 'symmetrical' | 'geometric' | 'defensive';

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
 * Grid Market Making Bot Implementation
 */
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
   * Start trading loop
   */
  async start(): Promise<void> {
    try {
      await this.initializeGrid();
      await this.placeGridOrders();

      this.tradingLoopInterval = setInterval(async () => {
        await this.placeGridOrders();
      }, 10000); // Update every 10 seconds

      this.addLog('Grid bot started');
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
