'use client';

import * as StellarSdk from '@stellar/stellar-sdk';
import { getOrderBook, getAccountBalancesClean } from '@/lib/stellar-utils';
import { getActiveOffers, loadFreshAccount, findExistingOfferID } from '@/lib/market-maker-operations';

export interface BrowserBotConfig {
  orderSize: number;
  minOrderSize: number;
  gridStepPercent: number;
  baseAsset: StellarSdk.Asset;
  counterAsset: StellarSdk.Asset;
  onLog: (message: string) => void;
}

export interface BrowserBotState {
  isRunning: boolean;
  lastExecution: Date | null;
  tradeCount: number;
  errorCount: number;
}

/**
 * Browser-based Market Maker Bot
 * Runs directly in the browser, executes trades every minute
 * Stops automatically when page closes
 */
export class BrowserMarketMakerBot {
  private config: BrowserBotConfig;
  private state: BrowserBotState;
  private horizonServer: StellarSdk.Server;
  private botKeypair: StellarSdk.Keypair;
  private botPublicKey: string;
  private intervalId: NodeJS.Timeout | null = null;
  private OPERATION_TIMEOUT_MS = 8000;

  constructor(config: BrowserBotConfig, botSecretKey: string) {
    this.config = config;
    this.horizonServer = new StellarSdk.Server('https://horizon.stellar.org');
    this.botKeypair = StellarSdk.Keypair.fromSecret(botSecretKey);
    this.botPublicKey = this.botKeypair.publicKey();
    this.state = {
      isRunning: false,
      lastExecution: null,
      tradeCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Start the automated trading loop (runs every minute)
   */
  public start(): void {
    if (this.state.isRunning) {
      this.log('Bot already running');
      return;
    }

    this.log('🚀 Starting market maker bot...');
    this.state.isRunning = true;

    // Run immediately
    this.executeTradingCycle();

    // Then run every 60 seconds
    this.intervalId = setInterval(() => {
      this.executeTradingCycle();
    }, 60000);

    // Cleanup on page close
    window.addEventListener('beforeunload', () => {
      this.stop();
    });
  }

  /**
   * Stop the trading loop and cancel all active offers
   */
  public async stop(): Promise<void> {
    if (!this.state.isRunning) return;

    this.log('🛑 Stopping market maker bot...');
    this.state.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Cancel all active offers
    try {
      await this.cancelAllOffers();
    } catch (error) {
      this.log(`⚠️ Error canceling offers: ${error}`);
    }
  }

  /**
   * Execute one trading cycle
   */
  private async executeTradingCycle(): Promise<void> {
    try {
      this.log(`[${new Date().toLocaleTimeString()}] Starting trading cycle...`);

      // Step 1: Fetch order book
      let orderbook;
      try {
        orderbook = await Promise.race([
          getOrderBook(this.config.baseAsset, this.config.counterAsset),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Order book fetch timeout')), this.OPERATION_TIMEOUT_MS)
          ),
        ]);
      } catch (error) {
        this.log(`❌ Failed to fetch order book: ${error}`);
        this.state.errorCount++;
        return;
      }

      if (!orderbook.bids.length || !orderbook.asks.length) {
        this.log('⚠️ Order book empty - no liquidity');
        return;
      }

      const bestBid = parseFloat(orderbook.bids[0].price);
      const bestAsk = parseFloat(orderbook.asks[0].price);
      const midPrice = (bestBid + bestAsk) / 2;
      const spread = bestAsk - bestBid;
      const spreadPercent = ((spread / midPrice) * 100).toFixed(4);

      this.log(`📊 Bid: ${bestBid.toFixed(4)}, Ask: ${bestAsk.toFixed(4)}, Spread: ${spreadPercent}%`);

      // Step 2: Calculate prices
      const stepMultiplier = this.config.gridStepPercent / 100;
      const buyPrice = (bestBid * (1 + stepMultiplier)).toFixed(7);
      const sellPrice = (bestAsk * (1 - stepMultiplier)).toFixed(7);

      // Step 3: Load fresh account and get active offers
      let account, activeOffers;
      try {
        [account, activeOffers] = await Promise.all([
          loadFreshAccount(this.horizonServer, this.botPublicKey, this.OPERATION_TIMEOUT_MS),
          getActiveOffers(this.horizonServer, this.botPublicKey, this.OPERATION_TIMEOUT_MS),
        ]);
      } catch (error) {
        this.log(`❌ Failed to load account: ${error}`);
        this.state.errorCount++;
        return;
      }

      // Step 4: Find existing offer IDs for replacement
      const existingBuyOfferID = findExistingOfferID(activeOffers, this.config.baseAsset, this.config.counterAsset, true);
      const existingSellOfferID = findExistingOfferID(activeOffers, this.config.baseAsset, this.config.counterAsset, false);

      this.log(
        `💼 Active offers: Buy ID=${existingBuyOfferID}, Sell ID=${existingSellOfferID}, Total=${activeOffers.length}`
      );

      // Step 5: Build and submit transaction
      try {
        const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.PUBLIC,
        }).setTimeout(30);

        transactionBuilder
          .addOperation(
            StellarSdk.Operation.manageBuyOffer({
              selling: this.config.counterAsset,
              buying: this.config.baseAsset,
              buyAmount: this.config.orderSize.toString(),
              price: buyPrice,
              offerId: existingBuyOfferID,
            })
          )
          .addOperation(
            StellarSdk.Operation.manageSellOffer({
              selling: this.config.baseAsset,
              buying: this.config.counterAsset,
              amount: this.config.orderSize.toString(),
              price: sellPrice,
              offerId: existingSellOfferID,
            })
          );

        const transaction = transactionBuilder.build();
        transaction.sign(this.botKeypair);

        const response = await Promise.race([
          this.horizonServer.submitTransaction(transaction),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Submit timeout')), this.OPERATION_TIMEOUT_MS)
          ),
        ]);

        this.log(`✅ Trade executed! TX: ${(response as any).hash}`);
        this.state.tradeCount++;
        this.state.lastExecution = new Date();
      } catch (error) {
        this.log(`❌ Transaction failed: ${error}`);
        this.state.errorCount++;
      }
    } catch (error) {
      this.log(`❌ Cycle error: ${error}`);
      this.state.errorCount++;
    }
  }

  /**
   * Cancel all active offers
   */
  private async cancelAllOffers(): Promise<void> {
    try {
      const activeOffers = await getActiveOffers(this.horizonServer, this.botPublicKey, this.OPERATION_TIMEOUT_MS);

      if (!activeOffers.length) {
        this.log('No active offers to cancel');
        return;
      }

      this.log(`Canceling ${activeOffers.length} active offers...`);

      const account = await loadFreshAccount(this.horizonServer, this.botPublicKey, this.OPERATION_TIMEOUT_MS);

      const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      }).setTimeout(30);

      // Add cancel operation for each offer
      for (const offer of activeOffers) {
        transactionBuilder.addOperation(
          StellarSdk.Operation.manageSellOffer({
            selling: this.config.baseAsset,
            buying: this.config.counterAsset,
            amount: '0',
            price: '1',
            offerId: offer.id,
          })
        );
      }

      const transaction = transactionBuilder.build();
      transaction.sign(this.botKeypair);

      const response = await this.horizonServer.submitTransaction(transaction);
      this.log(`✅ All offers canceled! TX: ${(response as any).hash}`);
    } catch (error) {
      this.log(`⚠️ Error canceling offers: ${error}`);
      throw error;
    }
  }

  /**
   * Get current bot state
   */
  public getState(): BrowserBotState {
    return { ...this.state };
  }

  /**
   * Log message helper
   */
  private log(message: string): void {
    this.config.onLog(message);
  }
}
