import { NextRequest, NextResponse } from 'next/server';
import {
  verifyBitrefillWebhook,
  parseCardDetailsFromWebhook,
  getOrderStatusMessage,
} from '@/lib/bitrefill-utils';

/**
 * Webhook handler for Bitrefill order status updates
 * This receives notifications when:
 * - Order status changes (pending → processing → completed)
 * - Virtual card is issued and ready
 * - Payment confirmation received
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-bitrefill-signature') || '';

    console.log('[v0] Webhook received from Bitrefill');

    // Verify webhook signature
    if (!verifyBitrefillWebhook(rawBody, signature)) {
      console.warn('[v0] Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(rawBody);

    const { id, status, product, amount, currency, card_details } = data;

    console.log('[v0] Webhook verified:', {
      orderId: id,
      status,
      product,
      amount,
      currency,
    });

    // Parse card details if order is completed
    let cardDetails = null;
    if (status === 'completed') {
      cardDetails = parseCardDetailsFromWebhook(data);
      if (cardDetails) {
        console.log('[v0] Card details extracted:', {
          cardNumber: cardDetails.cardNumber.substring(0, 4) + '****' + cardDetails.cardNumber.slice(-4),
          cardholder: cardDetails.cardholder,
          activated: cardDetails.activated,
        });
      }
    }

    // TODO: Store order and card details in database
    // In a production app, you would:
    // 1. Save order to database with user association
    // 2. Store encrypted card details
    // 3. Update order status in real-time dashboard
    // 4. Send user notification/email with card details
    // 5. Create audit log entry

    // For now, log the webhook data
    console.log('[v0] Webhook data:', {
      orderId: id,
      status: status,
      statusMessage: getOrderStatusMessage(status),
      cardIssued: status === 'completed' && !!cardDetails,
    });

    // Respond with success to acknowledge receipt
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook received and processed',
        orderId: id,
        status,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Webhook error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for webhook configuration
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      message: 'Bitrefill webhook endpoint is active',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
