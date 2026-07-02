# Bitrefill API Integration Guide

## Overview

This guide explains how to set up and use the real Bitrefill API integration for purchasing virtual Mastercard and Visa cards on the Stellar Mainnet using USDC.

## Quick Start

### 1. Get Bitrefill API Credentials

1. Visit [https://bitrefill.com/developers](https://bitrefill.com/developers)
2. Create or sign into your Bitrefill merchant account
3. Generate API credentials:
   - **API Key** (sk_live_... or sk_test_...)
   - **Client ID** (for authentication)
   - **Webhook Secret** (for verifying incoming webhooks)

### 2. Set Environment Variables

Add the following to your `.env.local` or Vercel environment variables:

```bash
BITREFILL_API_KEY=sk_live_your_api_key_here
BITREFILL_CLIENT_ID=your_client_id_here
BITREFILL_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Configure Webhook URL

In your Bitrefill dashboard:
1. Go to **Settings** → **Webhooks**
2. Add webhook endpoint: `https://yourdomain.com/api/bitrefill/webhook`
3. Select events: `order.completed`, `order.failed`
4. Copy the webhook secret to your environment variables

## How It Works

### User Flow

```
1. User selects region (Europe/USA) and amount
   ↓
2. App creates Bitrefill order via /api/bitrefill/create-order
   - Bitrefill returns: payment_address, payment_amount, memo
   ↓
3. User signs USDC transaction on Stellar with their wallet
   - Transaction sent to: Bitrefill's Stellar address
   - Amount: USD equivalent in USDC (7 decimal places)
   - Memo: Bitrefill order reference
   ↓
4. Bitrefill receives payment and processes order
   - Generates virtual card details
   - Sends webhook to: /api/bitrefill/webhook
   ↓
5. App receives webhook with card details
   - Verifies HMAC-SHA256 signature
   - Stores card in database (encrypted)
   - Sends user notification/email
   ↓
6. User receives virtual card ready to use
   - Add to Google Pay / Apple Pay
   - Use online or in-store
```

## API Endpoints

### Create Order

**POST** `/api/bitrefill/create-order`

Request:
```json
{
  "region": "EU",
  "amount": 50,
  "currency": "EUR",
  "productType": "mastercard",
  "refundAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

Response:
```json
{
  "success": true,
  "order": {
    "id": "ORDER_ID_123",
    "status": "pending",
    "payment_address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "payment_amount": "54.000000",
    "payment_currency": "USDC",
    "memo": "ORDER_ID_123",
    "expires_at": "2026-06-28T14:30:00Z"
  }
}
```

### Check Order Status

**GET** `/api/bitrefill/status?orderId=ORDER_ID_123`

Response:
```json
{
  "success": true,
  "order": {
    "id": "ORDER_ID_123",
    "status": "completed"
  },
  "cardDetails": {
    "cardNumber": "5412784512345678",
    "cardholder": "STELLAR USER",
    "expiryMonth": 12,
    "expiryYear": 2027,
    "cvv": "123",
    "cardValue": 50,
    "cardValueCurrency": "EUR",
    "activated": true
  }
}
```

### Webhook Handler

**POST** `/api/bitrefill/webhook`

Headers:
```
X-Bitrefill-Signature: sha256_signature_here
Content-Type: application/json
```

Payload:
```json
{
  "id": "ORDER_ID_123",
  "status": "completed",
  "product": "mastercard-virtual-eu",
  "amount": 50,
  "currency": "EUR",
  "card_details": {
    "card_number": "5412784512345678",
    "cardholder": "STELLAR USER",
    "expiry": "12/27",
    "cvv": "123",
    "pin": "1234"
  }
}
```

## Payment Parameters

### EUR Region Configuration
- **Minimum Virtual Card**: €5.00
- **Minimum Top-up**: €2.00
- **Conversion Rate**: 1 EUR = 1.08 USDC
- **Supported Products**: Mastercard, Visa

### USD Region Configuration
- **Minimum Virtual Card**: $20.00
- **Minimum Top-up**: $5.00
- **Conversion Rate**: 1 USD = 1.00 USDC
- **Supported Products**: Mastercard, Visa

## Stellar Transaction Details

When user signs the USDC transaction:

- **Source**: User's wallet (Stellar account)
- **Destination**: Bitrefill's Stellar merchant address
- **Asset**: USDC (Centre - GA5ZSEJYB37JRC5AVCIA5MOP4IHTOJHW7PSMUEHC7TQWZ6GZJKMJDNJ)
- **Amount**: Currency converted to USDC with exactly 7 decimal places
- **Fee**: 100 stroops (standard Stellar fee)
- **Memo**: Bitrefill order ID for settlement matching
- **Network**: Stellar Public Network (Mainnet)

Example transaction:
```
Transaction: Stellar Mainnet
From: GXXXXXX... (User's Stellar wallet)
To: GXXXXXX... (Bitrefill Stellar address)
Asset: USDC (Centre issuer)
Amount: 54.0000000 USDC
Memo Text: ORDER_ID_123
Fee: 100 stroops
```

## Card Details Retrieval

After order completion, card details are available via:

1. **Webhook** (Real-time - Recommended)
   - Bitrefill sends webhook to your endpoint
   - App receives and processes card details
   - User can be immediately notified

2. **Status Polling** (Fallback)
   - App periodically calls `/api/bitrefill/status?orderId=XXX`
   - When status = "completed", card details are included
   - Useful if webhook delivery is delayed

3. **Email** (User-facing)
   - Bitrefill sends card details to user email
   - Can be used as backup if app-based delivery fails

## Using Your Virtual Card

### Online Shopping
1. Enter card details at checkout
2. Complete verification if required
3. Transaction processed immediately

### In-Store (NFC)
1. Add card to Google Pay or Apple Pay
2. Hold phone near NFC terminal
3. Authenticate with biometric or PIN
4. Transaction processed instantly

### ATM Withdrawal
- Most ATMs accept virtual cards
- Check with your bank for withdrawal limits
- Fees may apply per transaction

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API Key` | Wrong or expired credentials | Verify BITREFILL_API_KEY in env vars |
| `Insufficient Balance` | Wallet has insufficient USDC | Top up wallet with more USDC |
| `Invalid Region` | Region not EU or USA | Check region selection in UI |
| `Amount Below Minimum` | Amount less than regional minimum | Increase amount per validation rules |
| `Webhook Signature Invalid` | Tampering or wrong secret | Verify BITREFILL_WEBHOOK_SECRET |

### Retry Logic

- Failed Bitrefill API calls retry automatically (3 attempts)
- Webhook failures are logged and can be manually triggered
- Order status can be checked anytime with /api/bitrefill/status

## Testing

### Test Mode (Optional)

If Bitrefill provides test credentials:

1. Use `sk_test_...` API key
2. Test cards won't charge real money
3. Recommended before going live

### Test Scenarios

1. **Valid Order**
   - EUR €50 → 54 USDC
   - Order created successfully
   - Mock webhook simulated

2. **Below Minimum**
   - EUR €3 → Validation error
   - Button disabled
   - Error message displayed

3. **Invalid Credentials**
   - Wrong API key → 401 error
   - Check environment variables

## Troubleshooting

### Card Details Not Appearing

1. Check webhook delivery in Bitrefill dashboard
2. Verify webhook secret is correct
3. Check application logs at `/api/bitrefill/webhook`
4. Use `/api/bitrefill/status` to manually check order

### Transaction Not Submitted

1. Verify wallet has sufficient USDC balance
2. Check Stellar transaction on StellarChain
3. Ensure memo text matches Bitrefill order ID
4. Review transaction signing logs

### Order Stuck in "Pending"

1. Confirm USDC transfer completed on Stellar
2. Check payment address matches order
3. Verify transaction memo is correct
4. Wait up to 5 minutes for Bitrefill processing

## Support

- **Bitrefill Developers**: [https://bitrefill.com/developers](https://bitrefill.com/developers)
- **Stellar Documentation**: [https://developers.stellar.org](https://developers.stellar.org)
- **Bitrefill Support**: support@bitrefill.com

## Security Considerations

1. **API Keys**: Never commit credentials to version control
2. **Webhook Secrets**: Verify HMAC signatures on all webhooks
3. **Card Data**: Store encrypted in database, never in localStorage
4. **Transactions**: Use Stellar's native transaction signing
5. **PCI Compliance**: Let Bitrefill handle card compliance

## Production Checklist

- [ ] Obtain production API credentials from Bitrefill
- [ ] Set all environment variables
- [ ] Configure webhook URL in Bitrefill dashboard
- [ ] Test complete order flow end-to-end
- [ ] Set up error monitoring/alerting
- [ ] Configure database for card storage
- [ ] Set up email notifications for users
- [ ] Test refund flow (if applicable)
- [ ] Deploy to production
- [ ] Monitor webhook delivery and order success rates
