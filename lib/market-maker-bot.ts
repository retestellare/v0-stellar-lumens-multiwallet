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

export interface MarketMakingConfig {
  spreadThresholdPercent: number;
  minProfitTargetXlm: number;
  orderUpdateIntervalSeconds: number;
  dailySpendingLimitXlm: number;
  isTestnet: boolean; // Deprecated - always false (mainnet)
  microStep: string;
}

export class MarketMakerBot {
  private botKeypair: Keypair;
  private botPublicKey: string;
  private config: MarketMakingConfig;
  private horizon: Horizon.Server;
  private activeOffers: Map<string, ActiveOffer> = new Map();
  private dailyVolume: number = 0;
  private lastUpdateTimestamp: number = 0;
  private tradingLoopInterval: NodeJS.Timeout | null = null;
  private logs: string[] = [];

  constructor(botSecretKey: string, config: MarketMakingConfig) {
    this.botKeypair = Keypair.fromSecret(botSecretKey);
    this.botPublicKey = this.botKeypair.publicKey();
    this.config = config;
    // Always use Mainnet
    this.horizon = new Horizon.Server(HORIZON_URL);
  }

  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push(`[${timestamp}] ${message}`);
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
    console.log(`[v0-MarketMaker] ${message}`);
  }

  getLogs(): string[] {
    return this.logs;
  }

  /**
   * Fetch order book for a trading pair
   */
  async fetchOrderBook(
    buyingAsset: Asset,
    sellingAsset: Asset
  ): Promise<OrderBook | null> {
    try {
      const response = await this.horizon.orderbook(buyingAsset, sellingAsset).call();
      return {
        bids: response.bids,
        asks: response.asks,
      };
    } catch (error) {
      this.addLog(`Error fetching order book: ${error}`);
      return null;
    }
  }

  /**
   * Fetch active offers for the bot wallet
   */
  async fetchActiveOffers(): Promise<ActiveOffer[]> {
    try {
      const response = await this.horizon.offers().forAccount(this.botPublicKey).call();
      const offers = response.records as ActiveOffer[];
      
      // Clear and repopulate the map
      this.activeOffers.clear();
      offers.forEach(offer => {
        this.activeOffers.set(offer.id, offer);
      });

      this.addLog(`Fetched ${offers.length} active offers`);
      return offers;
    } catch (error) {
      this.addLog(`Error fetching active offers: ${error}`);
      return [];
    }
  }

  /**
   * Calculate spread percentage: (ask - bid) / midprice * 100
   */
  private calculateSpread(bid: number, ask: number): number {
    if (bid === 0) return 0;
    const midPrice = (bid + ask) / 2;
    return ((ask - bid) / midPrice) * 100;
  }

  /**
   * Calculate net profit margin after fees
   * profit = (sellPrice - buyPrice) * amount - (2 * BASE_FEE in XLM)
   */
  private calculateNetProfit(
    buyPrice: number,
    sellPrice: number,
    amount: number
  ): number {
    const baseFeeXlm = BASE_FEE / 10000000; // 100 stroops = 0.00001 XLM
    const totalFeeXlm = 2 * baseFeeXlm; // 2 operations (buy + sell)
    const grossProfit = (sellPrice - buyPrice) * amount;
    const netProfit = grossProfit - totalFeeXlm;
    return netProfit;
  }

  /**
   * Validate market conditions for trading
   */
  private validateMarketConditions(
    bid: number,
    ask: number,
    buyAmount: number
  ): { valid: boolean; reason?: string } {
    // Check spread
    const spread = this.calculateSpread(bid, ask);
    if (spread < this.config.spreadThresholdPercent) {
      return {
        valid: false,
        reason: `Spread ${spread.toFixed(2)}% below threshold ${this.config.spreadThresholdPercent}%`,
      };
    }

    // Check profit (buy at bid + microStep, sell at ask - microStep)
    const buyPrice = bid + parseFloat(this.config.microStep);
    const sellPrice = ask - parseFloat(this.config.microStep);
    const netProfit = this.calculateNetProfit(buyPrice, sellPrice, buyAmount);

    if (netProfit < this.config.minProfitTargetXlm) {
      return {
        valid: false,
        reason: `Net profit ${netProfit.toFixed(6)} XLM below minimum ${this.config.minProfitTargetXlm} XLM`,
      };
    }

    // Check daily spending limit
    if (this.dailyVolume + buyAmount > this.config.dailySpendingLimitXlm) {
      return {
        valid: false,
        reason: `Daily spending limit would be exceeded: ${(this.dailyVolume + buyAmount).toFixed(2)} > ${this.config.dailySpendingLimitXlm}`,
      };
    }

    return { valid: true };
  }

  /**
   * Submit or update orders
   */
  async submitOrUpdateOrders(
    buyingAsset: Asset,
    sellingAsset: Asset,
    bid: number,
    ask: number,
    buyAmount: string
  ): Promise<boolean> {
    try {
      const sourceAccount = await this.horizon.loadAccount(this.botPublicKey);
      const networkPassphrase = this.config.isTestnet
        ? Networks.TESTNET_NETWORK_PASSPHRASE
        : Networks.PUBLIC_NETWORK_PASSPHRASE;

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      });

      const buyPrice = bid + parseFloat(this.config.microStep);
      const sellPrice = ask - parseFloat(this.config.microStep);

      // Check for existing offers to update
      const existingOffers = Array.from(this.activeOffers.values());
      let hasBuyOffer = false;
      let hasSellOffer = false;

      // Update or create buy offer
      if (existingOffers.some(o => o.buying.asset_code === buyingAsset.code)) {
        const offer = existingOffers.find(o => o.buying.asset_code === buyingAsset.code);
        if (offer) {
          tx.addOperation(
            Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount,
              price: buyPrice.toString(),
              offerId: offer.id,
            })
          );
          hasBuyOffer = true;
        }
      } else {
        tx.addOperation(
          Operation.manageBuyOffer({
            selling: sellingAsset,
            buying: buyingAsset,
            buyAmount,
            price: buyPrice.toString(),
            offerId: '0',
          })
        );
        hasBuyOffer = true;
      }

      // Update or create sell offer
      if (existingOffers.some(o => o.selling.asset_code === buyingAsset.code)) {
        const offer = existingOffers.find(o => o.selling.asset_code === buyingAsset.code);
        if (offer) {
          tx.addOperation(
            Operation.manageSellOffer({
              selling: buyingAsset,
              buying: sellingAsset,
              amount: buyAmount,
              price: sellPrice.toString(),
              offerId: offer.id,
            })
          );
          hasSellOffer = true;
        }
      } else {
        tx.addOperation(
          Operation.manageSellOffer({
            selling: buyingAsset,
            buying: sellingAsset,
            amount: buyAmount,
            price: sellPrice.toString(),
            offerId: '0',
          })
        );
        hasSellOffer = true;
      }

      const transaction = tx.setTimeout(30).build();
      const transactionXdr = transaction.toXDR();

      this.addLog(
        `Submitted orders: Buy @ ${buyPrice.toFixed(6)}, Sell @ ${sellPrice.toFixed(6)}`
      );
      this.dailyVolume += parseFloat(buyAmount);

      return true;
    } catch (error) {
      this.addLog(`Error submitting orders: ${error}`);
      return false;
    }
  }

  /**
   * Cancel all active offers
   */
  async cancelAllOffers(): Promise<boolean> {
    try {
      if (this.activeOffers.size === 0) {
        this.addLog('No active offers to cancel');
        return true;
      }

      const sourceAccount = await this.horizon.loadAccount(this.botPublicKey);
      const networkPassphrase = this.config.isTestnet
        ? Networks.TESTNET_NETWORK_PASSPHRASE
        : Networks.PUBLIC_NETWORK_PASSPHRASE;

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE * (this.activeOffers.size + 1),
        networkPassphrase,
      });

      // Add operation to cancel each offer (set amount to 0)
      for (const offer of this.activeOffers.values()) {
        tx.addOperation(
          Operation.manageSellOffer({
            selling: new Asset(offer.selling.asset_code, offer.selling.asset_issuer),
            buying: new Asset(offer.buying.asset_code, offer.buying.asset_issuer),
            amount: '0',
            price: offer.price,
            offerId: offer.id,
          })
        );
      }

      const transaction = tx.setTimeout(30).build();
      this.addLog(`Cancelled ${this.activeOffers.size} active offers`);
      this.activeOffers.clear();

      return true;
    } catch (error) {
      this.addLog(`Error cancelling offers: ${error}`);
      return false;
    }
  }

  /**
   * Start the trading loop
   */
  startTradingLoop(
    buyingAsset: Asset,
    sellingAsset: Asset,
    buyAmount: string,
    onUpdate?: (logs: string[]) => void
  ): void {
    if (this.tradingLoopInterval) {
      this.addLog('Trading loop already running');
      return;
    }

    this.addLog('Starting trading loop...');

    this.tradingLoopInterval = setInterval(async () => {
      try {
        // Fetch order book
        const orderBook = await this.fetchOrderBook(buyingAsset, sellingAsset);
        if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
          this.addLog('No bids or asks available');
          return;
        }

        const bid = parseFloat(orderBook.bids[0].price);
        const ask = parseFloat(orderBook.asks[0].price);

        // Fetch active offers
        await this.fetchActiveOffers();

        // Validate market conditions
        const validation = this.validateMarketConditions(bid, ask, parseFloat(buyAmount));
        if (!validation.valid) {
          this.addLog(`Conditions not met: ${validation.reason}`);
          return;
        }

        // Submit or update orders
        const success = await this.submitOrUpdateOrders(
          buyingAsset,
          sellingAsset,
          bid,
          ask,
          buyAmount
        );

        if (onUpdate) {
          onUpdate(this.logs);
        }
      } catch (error) {
        this.addLog(`Trading loop error: ${error}`);
      }
    }, this.config.orderUpdateIntervalSeconds * 1000);
  }

  /**
   * Stop the trading loop
   */
  async stopTradingLoop(): Promise<void> {
    if (this.tradingLoopInterval) {
      clearInterval(this.tradingLoopInterval);
      this.tradingLoopInterval = null;
      await this.cancelAllOffers();
      this.addLog('Trading loop stopped, all offers cancelled');
    }
  }
}
