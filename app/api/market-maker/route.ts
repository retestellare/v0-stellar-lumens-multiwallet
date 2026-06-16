import { NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getBotConfig } from '@/lib/bot-config';
import { executeMarketMakerOrder } from '@/lib/stellar-market-maker';

export const runtime = 'nodejs';

/**
 * Market Maker Cron Job API
 * Runs every minute (via Vercel Cron) to execute automated grid trading
 * Fetches real SDEX order book and places market maker orders
 */
export async function GET(request: Request) {
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
      orderbook = await horizonServer.orderbook(baseAsset, counterAsset).call();
    } catch (error) {
      console.error('[Market Maker Cron] Failed to fetch order book:', error);
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

    // Live execution: place buy order
    console.log(`[Market Maker Cron] Executing BUY order: ${orderSize} @ ${buyPrice}`);
    const buyResult = await executeMarketMakerOrder({
      userSecretKey: process.env.STELLAR_BOT_SECRET_KEY,
      calculatedAmount: orderSize,
      minOrderSize,
      targetPrice: parseFloat(buyPrice),
      assetBuying: baseAsset,
      assetSelling: counterAsset,
      isDryRun: false,
    });

    if (!buyResult.success) {
      console.error('[Market Maker Cron] Buy order failed:', buyResult.message);
    } else {
      console.log(`[Market Maker Cron] Buy order success: ${buyResult.txHash}`);
    }

    // Place sell order
    console.log(`[Market Maker Cron] Executing SELL order: ${orderSize} @ ${sellPrice}`);
    const sellResult = await executeMarketMakerOrder({
      userSecretKey: process.env.STELLAR_BOT_SECRET_KEY,
      calculatedAmount: orderSize,
      minOrderSize,
      targetPrice: parseFloat(sellPrice),
      assetBuying: counterAsset,
      assetSelling: baseAsset,
      isDryRun: false,
    });

    if (!sellResult.success) {
      console.error('[Market Maker Cron] Sell order failed:', sellResult.message);
    } else {
      console.log(`[Market Maker Cron] Sell order success: ${sellResult.txHash}`);
    }

    // Return execution results
    return NextResponse.json({
      success: buyResult.success && sellResult.success,
      mode: 'LIVE',
      timestamp: new Date().toISOString(),
      market: {
        bestBid,
        bestAsk,
        midPrice: midPrice.toFixed(7),
        spread: spreadPercent,
      },
      orders: {
        buy: {
          success: buyResult.success,
          price: buyPrice,
          size: orderSize,
          status: buyResult.status,
          txHash: buyResult.txHash,
          message: buyResult.message,
        },
        sell: {
          success: sellResult.success,
          price: sellPrice,
          size: orderSize,
          status: sellResult.status,
          txHash: sellResult.txHash,
          message: sellResult.message,
        },
      },
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Market Maker Cron] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Also support POST requests for manual trigger
 */
export async function POST(request: Request) {
  return GET(request);
}
