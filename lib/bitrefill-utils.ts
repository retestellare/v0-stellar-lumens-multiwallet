import crypto from 'crypto';

/**
 * Bitrefill API Integration Utilities
 * Handles virtual card creation, order management, and webhook verification
 */

const BITREFILL_API_URL = 'https://api.bitrefill.com/v1';
const BITREFILL_API_KEY = process.env.BITREFILL_API_KEY || 'sk_live_your_api_key_here';
const BITREFILL_CLIENT_ID = process.env.BITREFILL_CLIENT_ID || 'your_client_id_here';
const BITREFILL_WEBHOOK_SECRET = process.env.BITREFILL_WEBHOOK_SECRET || 'your_webhook_secret_here';

/**
 * Virtual Card Product IDs on Bitrefill
 * These map to specific virtual card products available via the API
 */
export const CARD_PRODUCTS = {
  EU: {
    MASTERCARD_VIRTUAL: 'mastercard-virtual-eu', // Virtual Mastercard for Europe
    VISA_VIRTUAL: 'visa-virtual-eu', // Virtual Visa for Europe
  },
  USA: {
    MASTERCARD_VIRTUAL: 'mastercard-virtual-us', // Virtual Mastercard for USA
    VISA_VIRTUAL: 'visa-virtual-us', // Virtual Visa for USA
  },
};

/**
 * Bitrefill Order Response Type
 */
export interface BitrefillOrder {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  product: string;
  amount: number;
  currency: string;
  refund_address: string;
  payment_address: string;
  payment_amount: number;
  payment_currency: string;
  memo: string;
  callback_url: string;
  created_at: string;
  expires_at: string;
}

/**
 * Virtual Card Details returned after order completion
 */
export interface VirtualCardDetails {
  cardNumber: string;
  cardholder: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardValue: number;
  cardValueCurrency: string;
  pin?: string;
  activated: boolean;
}

/**
 * Create a virtual card order via Bitrefill API
 * @param region - EU or USA
 * @param amount - Amount in local currency (EUR or USD)
 * @param currency - Currency code (EUR or USD)
 * @param productType - Type of card (mastercard or visa)
 * @param refundAddress - Stellar address for refunds
 */
export const createBitrefillOrder = async (
  region: 'EU' | 'USA',
  amount: number,
  currency: string,
  productType: 'mastercard' | 'visa' = 'mastercard',
  refundAddress: string
): Promise<{
  success: boolean;
  order?: BitrefillOrder;
  error?: string;
}> => {
  try {
    const productId =
      productType === 'visa'
        ? region === 'EU'
          ? CARD_PRODUCTS.EU.VISA_VIRTUAL
          : CARD_PRODUCTS.USA.VISA_VIRTUAL
        : region === 'EU'
          ? CARD_PRODUCTS.EU.MASTERCARD_VIRTUAL
          : CARD_PRODUCTS.USA.MASTERCARD_VIRTUAL;

    console.log('[v0] Creating Bitrefill order:', {
      region,
      amount,
      currency,
      productType,
      refundAddress: refundAddress.substring(0, 8) + '...',
    });

    const payload = {
      client_id: BITREFILL_CLIENT_ID,
      product: productId,
      amount: amount.toFixed(2),
      currency: currency,
      refund_address: refundAddress,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/bitrefill/webhook`,
    };

    const response = await fetch(`${BITREFILL_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BITREFILL_API_KEY,
        Authorization: `Bearer ${BITREFILL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[v0] Bitrefill API error:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `Bitrefill API error: ${response.statusText}`,
      };
    }

    const order = await response.json();
    console.log('[v0] Bitrefill order created successfully:', order.id);

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        product: order.product,
        amount: order.amount,
        currency: order.currency,
        refund_address: order.refund_address,
        payment_address: order.payment_address,
        payment_amount: order.payment_amount,
        payment_currency: order.payment_currency,
        memo: order.memo,
        callback_url: order.callback_url,
        created_at: order.created_at,
        expires_at: order.expires_at,
      },
    };
  } catch (error: any) {
    console.error('[v0] Error creating Bitrefill order:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to create virtual card order',
    };
  }
};

/**
 * Get order status from Bitrefill API
 */
export const getBitrefillOrderStatus = async (
  orderId: string
): Promise<{
  success: boolean;
  order?: BitrefillOrder;
  cardDetails?: VirtualCardDetails;
  error?: string;
}> => {
  try {
    console.log('[v0] Fetching Bitrefill order status:', orderId);

    const response = await fetch(`${BITREFILL_API_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': BITREFILL_API_KEY,
        Authorization: `Bearer ${BITREFILL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Failed to fetch order: ${response.statusText}`,
      };
    }

    const order = await response.json();

    // If order is completed, extract card details
    let cardDetails: VirtualCardDetails | undefined;
    if (order.status === 'completed' && order.card_details) {
      cardDetails = {
        cardNumber: order.card_details.card_number,
        cardholder: order.card_details.cardholder,
        expiryMonth: parseInt(order.card_details.expiry.split('/')[0]),
        expiryYear: parseInt(order.card_details.expiry.split('/')[1]),
        cvv: order.card_details.cvv,
        cardValue: order.amount,
        cardValueCurrency: order.currency,
        pin: order.card_details.pin,
        activated: true,
      };
    }

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        product: order.product,
        amount: order.amount,
        currency: order.currency,
        refund_address: order.refund_address,
        payment_address: order.payment_address,
        payment_amount: order.payment_amount,
        payment_currency: order.payment_currency,
        memo: order.memo,
        callback_url: order.callback_url,
        created_at: order.created_at,
        expires_at: order.expires_at,
      },
      cardDetails,
    };
  } catch (error: any) {
    console.error('[v0] Error fetching order status:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to fetch order status',
    };
  }
};

/**
 * Verify webhook signature from Bitrefill
 * @param payload - Raw webhook payload (string)
 * @param signature - X-Bitrefill-Signature header value
 */
export const verifyBitrefillWebhook = (payload: string, signature: string): boolean => {
  try {
    const hash = crypto
      .createHmac('sha256', BITREFILL_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    console.log('[v0] Webhook verification: comparing signatures');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    );

    console.log('[v0] Webhook signature valid:', isValid);
    return isValid;
  } catch (error: any) {
    console.error('[v0] Webhook verification failed:', error.message);
    return false;
  }
};

/**
 * Extract virtual card details from webhook payload
 */
export const parseCardDetailsFromWebhook = (
  webhookData: any
): VirtualCardDetails | null => {
  try {
    if (!webhookData.card_details) {
      return null;
    }

    const details = webhookData.card_details;
    return {
      cardNumber: details.card_number,
      cardholder: details.cardholder || 'STELLAR USER',
      expiryMonth: parseInt(details.expiry.split('/')[0]),
      expiryYear: parseInt(details.expiry.split('/')[1]),
      cvv: details.cvv,
      cardValue: webhookData.amount,
      cardValueCurrency: webhookData.currency,
      pin: details.pin,
      activated: true,
    };
  } catch (error: any) {
    console.error('[v0] Error parsing card details from webhook:', error.message);
    return null;
  }
};

/**
 * Map Bitrefill order status to user-friendly messages
 */
export const getOrderStatusMessage = (status: string): string => {
  const messages: Record<string, string> = {
    pending: 'Order created, waiting for payment',
    processing: 'Processing your payment',
    completed: 'Card issued and ready to use',
    failed: 'Order failed, please try again',
    expired: 'Order expired, please create a new one',
  };
  return messages[status] || 'Unknown status';
};
