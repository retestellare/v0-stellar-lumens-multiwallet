# Stellar Market Maker Bot - Deployment Checklist

## Pre-Deployment Verification

### Build Status
- [x] TypeScript compilation: **CLEAN** (no errors or warnings)
- [x] All imports resolved correctly
- [x] Environment variables handled gracefully at runtime
- [x] API routes compiled: `/api/market-maker` and `/api/market-maker/stop`

## Required Environment Variables

### Security
- `CRON_SECRET_KEY` - Bearer token for API requests (32+ characters recommended)
  - Used to prevent unauthorized calls to market-maker endpoints
  - Must be set in Vercel project settings before deployment

### Stellar Blockchain
- `STELLAR_BOT_SECRET_KEY` - Bot wallet Stellar secret key (starts with 'S')
  - Required for transaction signing
  - Keep this secret and never commit to version control

### Market Maker Configuration
- `BOT_ORDER_SIZE` - Order size per level in XLM (default: 50)
- `BOT_MIN_ORDER_SIZE` - Minimum order size threshold (default: 10)
- `BOT_GRID_STEP` - Grid spacing percentage (default: 0.20%)
- `BOT_TRADING_ASSET` - Trading asset: 'usdc', 'eurc', or leave blank for XLM (default: XLM)
- `BOT_DRY_RUN` - Set to 'true' to simulate without placing real orders

### Telegram Notifications
- `TELEGRAM_BOT_TOKEN` - Telegram bot API token from @BotFather
- `TELEGRAM_CHAT_ID` - Destination chat ID for notifications
- Both optional - if not set, notifications will be skipped silently

## Deployment Steps

### 1. Connect Upstash QStash Integration
```bash
# In Vercel Dashboard:
# 1. Go to Project Settings > Integrations
# 2. Click "Add Integration"
# 3. Search for "Upstash" and select "Upstash QStash"
# 4. Authorize and configure for 1-minute intervals
# 5. Set Schedule: /api/market-maker with Bearer token from CRON_SECRET_KEY
```

### 2. Set Environment Variables in Vercel

```bash
# Production Environment
CRON_SECRET_KEY=<generate-32-char-random-string>
STELLAR_BOT_SECRET_KEY=S<your-stellar-secret-key>
BOT_ORDER_SIZE=50
BOT_MIN_ORDER_SIZE=10
BOT_GRID_STEP=0.20
BOT_DRY_RUN=false

# Optional - Telegram
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
TELEGRAM_CHAT_ID=<your-chat-id>
```

### 3. Deploy to Vercel

```bash
# All changes are automatically deployed when pushed to main branch
git push origin main
```

## API Endpoints

### Market Maker Automation
- **GET/POST** `/api/market-maker`
- **Security**: Requires `Authorization: Bearer {CRON_SECRET_KEY}`
- **Triggered by**: Upstash QStash every 1 minute
- **Functionality**:
  - Fetches real SDEX order book
  - Places buy/sell orders with grid spacing
  - Replaces existing orders (prevents ghost order accumulation)
  - Sends Telegram notification on success/error

### Emergency Kill Switch
- **POST** `/api/market-maker/stop`
- **Security**: Requires `Authorization: Bearer {CRON_SECRET_KEY}`
- **Functionality**:
  - Fetches all active offers for bot account
  - Cancels each offer (sets amount=0)
  - Returns list of canceled offers with transaction hash

### Manual Testing
```bash
# Test market-maker (requires CRON_SECRET_KEY)
curl -X GET https://your-app.vercel.app/api/market-maker \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"

# Test kill switch
curl -X POST https://your-app.vercel.app/api/market-maker/stop \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

## Monitoring & Logs

### Real-Time Monitoring
- Telegram notifications sent after each trade execution
- Includes transaction hash, prices, spread percentage, order action (CREATE/REPLACE)
- Error notifications sent for failed orders

### Vercel Logs
- Access via Vercel Dashboard > Deployments > Logs
- All API calls logged with timing information
- Market data logged: Best bid/ask, spread, order count

## Troubleshooting

### Build Fails with "STELLAR_BOT_SECRET_KEY not found"
- This is expected during build - env vars are not available at compile time
- The check is at runtime only and won't cause build failure

### "Unauthorized - invalid or missing Bearer token"
- Verify CRON_SECRET_KEY is set in Vercel environment
- Verify QStash is configured with correct Bearer token header
- Check Authorization header format: `Bearer {token}` (not "token {token}")

### Telegram notifications not working
- Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
- Create a telegram bot via @BotFather and get token
- Send a message to the bot to activate the chat
- Get chat ID by messaging the bot and checking Telegram API

### "Order book empty - no liquidity available"
- SDEX may have low liquidity for trading pair
- Check network connectivity
- Verify trading asset is supported on Stellar SDEX

## Security Notes

1. **Bearer Token**: Generate a strong random string (32+ chars)
   - Use: `openssl rand -base64 32`
   - Never share this token
   - Rotate periodically

2. **Stellar Secret Key**: Never commit to repository
   - Use Vercel's encrypted environment variables only
   - Never log or expose in error messages

3. **Telegram Token**: Keep secure
   - Use dedicated bot, not personal account token
   - Rotate if accidentally exposed

## Rollback Plan

If issues occur:
1. Pause QStash scheduling in Vercel/Upstash dashboard
2. Call `/api/market-maker/stop` to cancel all active offers
3. Investigate logs in Vercel dashboard
4. Fix issues and redeploy

