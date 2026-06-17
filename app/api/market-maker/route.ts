import { NextResponse, NextRequest } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getBotConfig } from '@/lib/bot-config';
import { executeMarketMakerOrder } from '@/lib/stellar-market-maker';
import {
  getActiveOffers,
  loadFreshAccount,
  findExistingOfferID,
  submitWithTimeout,
} from '@/lib/market-maker-operations';
import { logTradeExecution, logError, logInfo } from '@/lib/telegram-logger';

export const runtime = 'nodejs';
const OPERATION_TIMEOUT_MS = 8000; // 8 second timeout per operation

/**
 * Market Maker Cron Job API
 * Secured with Bearer token validation from CRON_SECRET_KEY environment variable
 * Uses Upstash QStash for minute-level automation (replaces Vercel crons)
 */

/**
 * Validate incoming request has valid Authorization header
 * Prevents unauthorized calls from outside Upstash QStash
 */
function validateAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET_KEY;

  if (!cronSecret) {
    console.warn('[Security] CRON_SECRET_KEY not configured - requests will be rejected');
    return false;
  }

  if (!authHeader) {
    console.warn('[Security] Request missing Authorization header');
    return false;
  }

  const expectedBearer = `Bearer ${cronSecret}`;
  if (authHeader !== expectedBearer) {
    console.warn('[Security] Invalid Bearer token');
    return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  // SECURITY: Validate request authorization
  if (!validateAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - invalid or missing Bearer token' },
      { status: 401 }
    );
  }

  try {
    // Get bot configuration from environment variables
    const config = getBotConfig();

    // Validate bot secret key exists
    if (!process.env.STELLAR_BOT_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'STELLAR_BOT_SECRET_KEY not configured in environment' },
        { status: 500 }
      );
    }

    const horizonServer = new StellarSdk.Server(config.horizonUrl);
    const botKeypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_BOT_SECRET_KEY);
    const botPublicKey = botKeypair.publicKey();

    // Get order size from environment or use default
    const orderSize = parseFloat(process.env.BOT_ORDER_SIZE || '50');
    const minOrderSize = parseFloat(process.env.BOT_MIN_ORDER_SIZE || '10');
    const gridStepPercent = parseFloat(process.env.BOT_GRID_STEP || '0.20');
    const isDryRun = process.env.BOT_DRY_RUN === 'true';

    // Define trading pair (XLM vs native by default, or custom asset)
    const baseAsset = StellarSdk.Asset.native(); // XLM
    let counterAsset = StellarSdk.Asset.native();

    // Support custom trading assets via environment variable
    const TRADING_ASSET = process.env.BOT_TRADING_ASSET;
    if (TRADING_ASSET === 'usdc') {
      counterAsset = new StellarSdk.Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5T36C2YNE7');
    } else if (TRADING_ASSET === 'eurc') {
      counterAsset = new StellarSdk.Asset('EURC', 'GDHU6W2FSTZ7N6D7S5S7N7GFF6AL66S7X4K6P4K3K3K3K3K3K3K3');
    }

    console.log(`[Market Maker Cron] Starting execution for ${TRADING_ASSET || 'XLM'} at ${new Date().toISOString()}`);

    // Fetch real order book from Stellar SDEX
    let orderbook;
    try {
      // OPTIMIZATION 1: Timeout protection for order book fetch
      orderbook = await Promise.race([
        horizonServer.orderbook(baseAsset, counterAsset).call(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Order book fetch timeout')), OPERATION_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.error('[Market Maker Cron] Failed to fetch order book:', error);
      logError('Order Book Fetch Failed', `Failed to fetch SDEX order book: ${String(error)}`);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch order book from SDEX', details: String(error) },
        { status: 500 }
      );
    }

    // Validate order book has liquidity
    if (!orderbook.bids.length || !orderbook.asks.length) {
      console.warn('[Market Maker Cron] Order book has no bids or asks');
      return NextResponse.json(
        { success: false, error: 'Order book empty - no liquidity available' },
        { status: 503 }
      );
    }

    const bestBid = parseFloat(orderbook.bids[0].price);
    const bestAsk = parseFloat(orderbook.asks[0].price);
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = ((spread / midPrice) * 100).toFixed(4);

    console.log(`[Market Maker Cron] Order book: Best Bid=${bestBid}, Best Ask=${bestAsk}, Spread=${spreadPercent}%`);

    // Calculate market maker prices (slightly inside the spread)
    const stepMultiplier = gridStepPercent / 100;
    const buyPrice = (bestBid * (1 + stepMultiplier)).toFixed(7);
    const sellPrice = (bestAsk * (1 - stepMultiplier)).toFixed(7);

    // In dry-run mode, just log what would happen
    if (isDryRun) {
      console.log('[Market Maker Cron] DRY-RUN mode - simulating orders');
      return NextResponse.json({
        success: true,
        mode: 'DRY-RUN',
        midPrice: midPrice.toFixed(7),
        spread: spreadPercent,
        buyPrice,
        sellPrice,
        orderSize,
        minOrderSize,
        message: `[DRY-RUN] Would place: BUY ${orderSize} @ ${buyPrice}, SELL ${orderSize} @ ${sellPrice}`,
      });
    }

    // OPTIMIZATIONS 2 & 3: Load fresh account and fetch active offers for order replacement
    console.log('[Market Maker Cron] Loading fresh account and active offers...');
    let account, activeOffers;
    try {
      [account, activeOffers] = await Promise.all([
        loadFreshAccount(horizonServer, botPublicKey, OPERATION_TIMEOUT_MS),
        getActiveOffers(horizonServer, botPublicKey, OPERATION_TIMEOUT_MS),
      ]);
    } catch (error) {
      console.error('[Market Maker Cron] Failed to load account or offers:', error);
      logError('Account Load Failed', `Failed to load fresh account data: ${String(error)}`);
      return NextResponse.json(
        { success: false, error: 'Failed to load account data', details: String(error) },
        { status: 500 }
      );
    }

    // Find existing offer IDs to replace instead of creating duplicates
    const existingBuyOfferID = findExistingOfferID(activeOffers, baseAsset, counterAsset, true);
    const existingSellOfferID = findExistingOfferID(activeOffers, baseAsset, counterAsset, false);

    console.log(
      `[Market Maker Cron] Fresh sequence=${account.sequence}, existing offers: Buy=${existingBuyOfferID}, Sell=${existingSellOfferID}`
    );

    // Build transaction with order replacement
    const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    }).setTimeout(30);

    // Add buy and sell orders (will replace if offerID exists)
    transactionBuilder
      .addOperation(
        StellarSdk.Operation.manageBuyOffer({
          selling: counterAsset,
          buying: baseAsset,
          buyAmount: orderSize.toString(),
          price: buyPrice,
          offerId: existingBuyOfferID,
        })
      )
      .addOperation(
        StellarSdk.Operation.manageSellOffer({
          selling: baseAsset,
          buying: counterAsset,
          amount: orderSize.toString(),
          price: sellPrice,
          offerId: existingSellOfferID,
        })
      );

    const transaction = transactionBuilder.build();
    transaction.sign(botKeypair);

    // Submit with timeout protection
    let response;
    try {
      response = await submitWithTimeout(horizonServer, transaction, OPERATION_TIMEOUT_MS);
      console.log(`[Market Maker Cron] Transaction submitted: ${response.hash}`);

      // Send Telegram notification for successful trade (fire-and-forget)
      logTradeExecution({
        txHash: response.hash,
        buyPrice,
        sellPrice,
        orderSize,
        spread: spreadPercent,
        action: existingBuyOfferID === '0' ? 'CREATE' : 'REPLACE',
      });
    } catch (error) {
      console.error('[Market Maker Cron] Submit error:', error);

      // Send Telegram error notification (fire-and-forget)
      logError('Market Maker Trade Failed', String(error));

      return NextResponse.json(
        { success: false, error: 'Transaction submission failed', details: String(error) },
        { status: 500 }
      );
    }

    // Return execution results
    return NextResponse.json({
      success: true,
      mode: 'LIVE',
      timestamp: new Date().toISOString(),
      market: {
        bestBid,
        bestAsk,
        midPrice: midPrice.toFixed(7),
        spread: spreadPercent,
      },
      orderReplacement: {
        buyOfferID: existingBuyOfferID,
        sellOfferID: existingSellOfferID,
        activeOffers: activeOffers.length,
      },
      transaction: {
        hash: response.hash,
      },
      orders: {
        buy: {
          price: buyPrice,
          size: orderSize,
          action: existingBuyOfferID === '0' ? 'CREATE' : 'REPLACE',
        },
        sell: {
          price: sellPrice,
          size: orderSize,
          action: existingSellOfferID === '0' ? 'CREATE' : 'REPLACE',
        },
      },
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Market Maker Cron] Unexpected error:', error);
    logError('Unexpected Market Maker Error', error.message || String(error));
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Also support POST requests for manual trigger or testing (still requires auth)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
