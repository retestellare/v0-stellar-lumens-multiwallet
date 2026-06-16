import { NextResponse, NextRequest } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getBotConfig } from '@/lib/bot-config';

export const runtime = 'nodejs';

/**
 * Validate incoming request has valid Authorization header
 * Prevents unauthorized emergency stops
 */
function validateAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET_KEY;

  if (!cronSecret) {
    console.warn('[Kill Switch] CRON_SECRET_KEY not configured');
    return false;
  }

  if (!authHeader) {
    console.warn('[Kill Switch] Request missing Authorization header');
    return false;
  }

  const expectedBearer = `Bearer ${cronSecret}`;
  if (authHeader !== expectedBearer) {
    console.warn('[Kill Switch] Invalid Bearer token');
    return false;
  }

  return true;
}

/**
 * Emergency Kill Switch - Cancels all active market maker offers
 * Called when user clicks STOP BOT or during emergencies
 * Iterates through existing offers and sets amount=0 to cancel each
 */
export async function POST(request: NextRequest) {
  // SECURITY: Validate request authorization
  if (!validateAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - invalid or missing Bearer token' },
      { status: 401 }
    );
  }

  try {
    const config = getBotConfig();

    // Validate bot secret key exists
    if (!process.env.STELLAR_BOT_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'STELLAR_BOT_SECRET_KEY not configured' },
        { status: 500 }
      );
    }

    const horizonServer = new StellarSdk.Server(config.horizonUrl);
    const botKeypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_BOT_SECRET_KEY);
    const botPublicKey = botKeypair.publicKey();

    console.log('[Kill Switch] Starting emergency shutdown for all offers');

    // Fetch all active offers for this account
    let activeOffers;
    try {
      const response = await horizonServer.offers().forAccount(botPublicKey).call();
      activeOffers = response.records;
    } catch (error) {
      console.error('[Kill Switch] Failed to fetch active offers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch active offers', details: String(error) },
        { status: 500 }
      );
    }

    if (activeOffers.length === 0) {
      console.log('[Kill Switch] No active offers to cancel');
      return NextResponse.json({
        success: true,
        message: 'No active offers to cancel',
        offersCanceled: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Kill Switch] Found ${activeOffers.length} offers to cancel`);

    // Load fresh account for transaction building
    let account;
    try {
      account = await horizonServer.loadAccount(botPublicKey);
    } catch (error) {
      console.error('[Kill Switch] Failed to load account:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load account', details: String(error) },
        { status: 500 }
      );
    }

    // Build transaction with cancel operations for all offers
    const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    }).setTimeout(30);

    // Add manageSellOffer operation with amount=0 for each active offer
    activeOffers.forEach((offer) => {
      transactionBuilder.addOperation(
        StellarSdk.Operation.manageSellOffer({
          selling: offer.selling.native
            ? StellarSdk.Asset.native()
            : new StellarSdk.Asset(offer.selling.asset_code, offer.selling.asset_issuer),
          buying: offer.buying.native
            ? StellarSdk.Asset.native()
            : new StellarSdk.Asset(offer.buying.asset_code, offer.buying.asset_issuer),
          amount: '0', // Setting amount to 0 cancels the offer
          price: offer.price,
          offerId: offer.id,
        })
      );
    });

    const transaction = transactionBuilder.build();
    transaction.sign(botKeypair);

    // Submit the cancellation transaction
    let response;
    try {
      response = await horizonServer.submitTransaction(transaction);
      console.log(`[Kill Switch] Transaction submitted: ${response.hash}`);
    } catch (error) {
      console.error('[Kill Switch] Failed to submit cancellation transaction:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit cancellation', details: String(error) },
        { status: 500 }
      );
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Emergency shutdown complete - ${activeOffers.length} offers canceled`,
      offersCanceled: activeOffers.length,
      offers: activeOffers.map((o) => ({
        id: o.id,
        selling: `${o.selling.asset_code || 'XLM'}`,
        buying: `${o.buying.asset_code || 'XLM'}`,
        price: o.price,
        amount: o.amount,
      })),
      transaction: {
        hash: response.hash,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Kill Switch] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', details: error.stack },
      { status: 500 }
    );
  }
}

/**
 * GET support for testing/validation
 */
export async function GET(request: NextRequest) {
  if (!validateAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - invalid or missing Bearer token' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Kill switch endpoint ready. Send POST request to trigger emergency shutdown.',
    environment: {
      botKeyConfigured: !!process.env.STELLAR_BOT_SECRET_KEY,
      cronSecretConfigured: !!process.env.CRON_SECRET_KEY,
    },
  });
}
