# Bitrefill Integration - Complete Flow Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (React Components)                                    │
│  ├── amount-selection-modal.tsx (Checkout UI)                   │
│  │   ├── Region selector (EU/USA)                               │
│  │   ├── Amount input with validation                           │
│  │   └── Payment review screen                                  │
│  │                                                              │
│  └── Calls: POST /api/bitrefill/create-order                    │
│                                                                 │
│  Backend API Routes                                            │
│  ├── /api/bitrefill/create-order (POST)                        │
│  │   ├── Validates amount & region                             │
│  │   └── Calls bitrefill-utils.ts                              │
│  │                                                              │
│  ├── /api/bitrefill/status (GET)                               │
│  │   ├── Polls order status                                    │
│  │   └── Returns card details when ready                       │
│  │                                                              │
│  └── /api/bitrefill/webhook (POST)                             │
│      ├── Verifies HMAC signature                               │
│      ├── Processes card delivery                               │
│      └── Updates order status                                  │
│                                                                 │
│  Utilities                                                      │
│  └── lib/bitrefill-utils.ts                                    │
│      ├── createBitrefillOrder()                                │
│      ├── getBitrefillOrderStatus()                             │
│      ├── verifyBitrefillWebhook()                              │
│      └── parseCardDetailsFromWebhook()                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
           ↓                                           ↑
           │ HTTPS REST API calls                     │ Webhook callbacks
           │                                          │
┌──────────▼──────────────────────────────────────────┴──────────┐
│             BITREFILL SERVERS (bitrefill.com)                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Order Service                                                  │
│  ├── POST /v1/orders (Create order)                            │
│  │   ├── Generates payment address                             │
│  │   ├── Sets memo for settlement                              │
│  │   └── Returns order details                                 │
│  │                                                              │
│  ├── GET /v1/orders/{id} (Check status)                        │
│  │   └── Returns order & card details when complete            │
│  │                                                              │
│  └── Webhook Service                                           │
│      ├── Sends order.completed webhook                         │
│      ├── Includes card details                                 │
│      └── Signs with HMAC-SHA256                                │
│                                                                 │
└───────────────────────────────────────┬─────────────────────────┘
                                        │ (Payments)
                                        ↓
┌────────────────────────────────────────────────────────────────┐
│               STELLAR MAINNET (blockchain)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User's Stellar Wallet                                         │
│  ├── Account: GXXXXXX... (User's public key)                   │
│  ├── Balance: USDC (Centre-issued)                             │
│  └── Signs transaction with secret key                         │
│                    │                                           │
│                    │ Submits signed transaction                │
│                    ↓                                           │
│  Stellar Network                                               │
│  ├── Validates transaction                                     │
│  ├── Checks signatures                                         │
│  ├── Verifies USDC balance                                     │
│  ├── Executes payment                                          │
│  └── Broadcasts ledger entry                                   │
│                    │                                           │
│                    │ Bitrefill detects payment                 │
│                    ↓                                           │
│  Bitrefill's Merchant Account                                  │
│  ├── Account: GXXXXXX... (Bitrefill's Stellar address)        │
│  ├── Receives USDC payment                                     │
│  ├── Matches memo to order ID                                  │
│  └── Triggers card issuance                                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Complete User Journey

### Step 1: User Initiates Purchase

```
User opens app
    ↓
Selects spending option (Virtual Mastercard)
    ↓
Chooses region (Europe EUR / United States USD)
    ↓
Selects amount (€50 or custom)
    ↓
Amount validated against minimum (€5 EU / $20 US)
    ↓
Clicks "Proceed to Stellar Payment"
```

### Step 2: Create Bitrefill Order

**Frontend → Backend:**
```javascript
POST /api/bitrefill/create-order
{
  "region": "EU",
  "amount": 50,
  "currency": "EUR",
  "productType": "mastercard",
  "refundAddress": "GXXXXXX..." // User's Stellar address
}
```

**Backend calls Bitrefill:**
```javascript
POST https://api.bitrefill.com/v1/orders
{
  "client_id": "...",
  "product": "mastercard-virtual-eu",
  "amount": "50.00",
  "currency": "EUR",
  "refund_address": "GXXXXXX...",
  "callback_url": "https://myapp.com/api/bitrefill/webhook"
}
Headers:
  X-API-Key: sk_live_...
  Authorization: Bearer sk_live_...
```

**Bitrefill Response:**
```json
{
  "id": "ORDER_ABC123",
  "status": "pending",
  "product": "mastercard-virtual-eu",
  "amount": 50,
  "currency": "EUR",
  "payment_address": "GBITREFILL1234567...",
  "payment_amount": "54.0",
  "payment_currency": "USDC",
  "memo": "ORDER_ABC123",
  "expires_at": "2026-06-28T14:30:00Z"
}
```

**Frontend receives:**
```json
{
  "success": true,
  "order": {
    "id": "ORDER_ABC123",
    "payment_address": "GBITREFILL1234567...",
    "payment_amount": "54.0",
    "payment_currency": "USDC",
    "memo": "ORDER_ABC123"
  }
}
```

### Step 3: Review Transaction Details

Frontend displays:
```
┌─────────────────────────────────────┐
│   Transaction Details               │
├─────────────────────────────────────┤
│ From:          Your Wallet (2026)   │
│ To:            Bitrefill Merchant   │
│ Amount:        54.0000000 USDC      │
│ Memo:          ORDER_ABC123         │
│ Network:       Stellar Mainnet      │
│ Fee:           0.00001 XLM          │
└─────────────────────────────────────┘

[Cancel]  [Sign & Send Payment]
```

User clicks "Sign & Send Payment"

### Step 4: Sign & Submit Stellar Transaction

**Frontend:**
```typescript
1. Retrieves user's secret key (unlocked from encrypted storage)
2. Creates Stellar transaction:
   - From: User's public key
   - To: Bitrefill's payment address
   - Asset: USDC (Centre)
   - Amount: 54.0000000 (exactly 7 decimal places)
   - Memo: ORDER_ABC123
   - Fee: 100 stroops
   - Network: Stellar Public Network
   
3. Signs transaction with user's secret key
   - Uses Stellar SDK: Transaction.sign(keypair)
   - Never exposes secret key
   
4. Submits to Stellar network
   - Posts to: https://horizon.stellar.org
   - Receives: Transaction hash (e.g., "4M4KUC7GWNS1BEX8")
```

**Display during signing:**
```
┌─────────────────────────────────────┐
│  🔄 Generating Stellar USDC         │
│     transaction...                  │
│                                     │
│  Creating and signing payment on    │
│  the Stellar network                │
└─────────────────────────────────────┘
```

### Step 5: Stellar Network Processing

```
1. Stellar network validates transaction
   ✓ Checks signature is valid
   ✓ Verifies user has 54 USDC
   ✓ Verifies memo text
   ✓ Checks account sequence
   
2. Transaction included in ledger
   - Assigned ledger sequence number
   - Assigned transaction hash
   - Marked as successful
   
3. Network broadcasts
   - All Stellar nodes update their ledger
   - Payment is permanent (immutable)
```

### Step 6: Bitrefill Receives & Processes Payment

```
1. Bitrefill Horizon monitoring
   - Detects incoming USDC to merchant account
   - Reads memo: ORDER_ABC123
   - Matches to pending order
   
2. Validates payment
   ✓ Amount matches order (54 USDC)
   ✓ Account is verified merchant
   ✓ Currency is correct (USDC)
   
3. Processes order
   - Sends to card processor (Mastercard)
   - Receives card details back
   - Stores encrypted
   
4. Card activation
   - Generates:
     * Card number: 5412 7845 1234 5678
     * Expiry: 12/27
     * CVV: 346
     * PIN: 1234 (if applicable)
   - Sets balance: €50.00 or equivalent
   - Marks as ACTIVE
```

### Step 7: Webhook Delivery to Application

**Bitrefill → Your Server:**
```
POST https://myapp.com/api/bitrefill/webhook
Headers:
  X-Bitrefill-Signature: sha256_hmac_signature
  Content-Type: application/json

Payload:
{
  "id": "ORDER_ABC123",
  "status": "completed",
  "product": "mastercard-virtual-eu",
  "amount": 50,
  "currency": "EUR",
  "card_details": {
    "card_number": "5412784512345678",
    "cardholder": "STELLAR USER",
    "expiry": "12/27",
    "cvv": "346",
    "pin": "1234"
  }
}
```

**Your Server Webhook Handler:**
```typescript
1. Receives webhook
2. Extracts X-Bitrefill-Signature header
3. Verifies HMAC-SHA256:
   - Computes: HMAC(payload, webhook_secret)
   - Compares with signature header
   - ✓ Signature valid → Process
   - ✗ Invalid → Reject (401)
   
4. Parses card details
5. Stores in database (encrypted)
6. Updates order status to "completed"
7. Sends email/notification to user
8. Responds 200 OK to Bitrefill
```

**Display during verification:**
```
┌─────────────────────────────────────┐
│  ✓ Verifying payment on Stellar     │
│    Network...                       │
│                                     │
│  Processing your transaction        │
└─────────────────────────────────────┘
```

### Step 8: Success - Card Ready to Use

**Frontend displays:**
```
┌─────────────────────────────────────┐
│  ✓ Virtual Card Issued!             │
├─────────────────────────────────────┤
│                                     │
│  Card Details                       │
│  ─────────────────────────────────  │
│  Card:  5412 •••• •••• 5678         │
│  Expires: 12/27                     │
│  CVV:   346                         │
│                                     │
│  Order ID: ORDER_ABC123             │
│                                     │
├─────────────────────────────────────┤
│  [Add to Apple / Google Wallet]     │
│  [Done]                             │
└─────────────────────────────────────┘
```

User can now:
- Add to Google Pay
- Add to Apple Pay
- Use online
- Use in-store (NFC)

## Error Handling Flows

### Scenario 1: Insufficient USDC Balance

```
User: 30 USDC balance
Order: 54 USDC required

Flow:
  Create order ✓
  Review details ✓
  Sign transaction →
    [Stellar validation]
      ✗ Insufficient balance
  
Result:
  Stellar rejects: "op_underfunded"
  User sees: "Insufficient USDC balance"
  Order stays pending
  
Fix: User deposits more USDC and retries
```

### Scenario 2: Webhook Delivery Failure

```
Card issued but webhook doesn't arrive (network issue)

Flow:
  Payment processed ✓
  Card activated ✓
  Webhook sent →
    [Network timeout]
  
Result:
  App doesn't know card is ready
  
Fallback:
  1. User sees "Card details arriving via email"
  2. User can click "Check Status" button
  3. App calls GET /api/bitrefill/status?orderId=ORDER_ABC123
  4. Bitrefill confirms order completed
  5. Card details retrieved and displayed
```

### Scenario 3: Wrong Memo Text

```
User manually creates transaction with wrong memo
Order ABC123, but sent with memo "ABC124"

Flow:
  Payment received ✓
  Bitrefill checks memo →
    [No matching order]
  
Result:
  Payment remains in Bitrefill account
  No card issued
  Order stays pending
  
Fix: User contacts Bitrefill support for refund
    (This is why we use our signing, not user manual)
```

## Data Flow Diagram

```
┌────────────┐
│   USER     │
│  WALLET    │
└─────┬──────┘
      │ 54 USDC
      │ (signed Tx)
      ↓
┌──────────────────────────┐
│   STELLAR NETWORK        │
│   (Mainnet Ledger)       │
└──────────┬───────────────┘
           │ Broadcasts
           ↓
┌────────────────────────────────────┐
│  BITREFILL SERVERS                 │
│  ├─ Receive USDC payment           │
│  ├─ Process with Mastercard        │
│  ├─ Issue virtual card             │
│  └─ Send webhook                   │
└────────────┬───────────────────────┘
             │ HTTPS callback
             ↓
┌──────────────────────────┐
│  YOUR APP SERVER         │
│  ├─ Verify signature     │
│  ├─ Store card details   │
│  └─ Notify user          │
└────────────┬─────────────┘
             │ Update UI
             ↓
┌──────────────────────────┐
│  USER'S BROWSER          │
│  Shows: "Card Ready!"    │
│  Card: 5412 •••• 5678    │
└──────────────────────────┘
```

## Transaction Lifecycle States

```
STATE MACHINE:

[Amount Selection]
    ↓
[Bitrefill Order Created] ← order.id generated
    ↓
[Waiting for Payment] ← memo sent to user
    ↓
[USDC Payment Received] ← Stellar transaction confirmed
    ↓
[Processing] ← Mastercard processor
    ↓
[Card Issued] ← Card generated
    ↓
[Webhook Delivered] ← App receives card details
    ↓
[Card Ready] ← User can use
```

## Security Checkpoints

```
1. Region Validation ✓
   - Ensure region is EU or USA
   
2. Amount Validation ✓
   - Ensure amount meets minimum
   - Ensure amount is positive
   
3. Stellar Signature ✓
   - Transaction signed with user's secret key
   - Never expose secret to server
   
4. USDC Precision ✓
   - Amount formatted to exactly 7 decimals
   - Prevents "OpInvalidAmount" errors
   
5. Webhook HMAC ✓
   - Verify signature with BITREFILL_WEBHOOK_SECRET
   - Prevent spoofed webhooks
   - Replay attack detection
   
6. Order Matching ✓
   - Memo in Stellar transaction matches order ID
   - Prevents payment to wrong merchant
   
7. Card Storage ✓
   - Card details encrypted in database
   - Never in localStorage
   - Access logged and audited
```

This completes the end-to-end flow for purchasing and receiving a virtual card using USDC on the Stellar Mainnet.
