# Browser-Based Market Maker Bot

Run automated market making directly in your browser. The bot executes every 60 seconds while the page is open and automatically shuts down when you close it.

## Quick Start

### 1. Create or Import Bot Wallet
- Navigate to the Trading Bot page
- Click **Create or Import Bot Wallet**
- Either generate a new wallet or import an existing Stellar secret key

### 2. Fund the Bot Wallet
- Transfer XLM to your bot wallet address
- Minimum: Must be >= your configured Min Order Size (default 10 XLM)
- The wallet balance is displayed on the dashboard

### 3. Authenticate Your Session
- A password modal will appear when you load the page with a bot wallet
- Enter your wallet password to unlock trading
- This is required before launching the bot

### 4. Launch the Bot
- Scroll down to the **Browser Market Maker** section
- Configure trading parameters:
  - **Order Size**: Amount per order (default 50 XLM)
  - **Min Order Size**: Minimum order threshold (default 10 XLM)
  - **Grid Step**: Grid spacing percentage (default 0.20%)
- Click the green **LAUNCH BOT** button

### 5. Monitor Live Trading
The bot displays:
- **Status indicator**: Green (RUNNING) or Gray (STOPPED)
- **Trade count**: Number of successful executions
- **Error count**: Number of failures
- **Last run time**: Timestamp of last trading cycle
- **Live logs**: Real-time activity feed showing each cycle

### 6. Stop the Bot
Click the red **STOP BOT** button to:
- Immediately halt the trading loop
- Cancel all active orders on the SDEX
- Stop the browser automation

The bot also automatically stops if you:
- Close the browser tab
- Refresh the page
- Close the browser

## How It Works

Every 60 seconds, the bot:

1. **Fetches Real Order Book**
   - Queries Stellar SDEX for current bid/ask prices
   - Calculates market spread

2. **Calculates Market Maker Prices**
   - Places buy orders slightly above best bid
   - Places sell orders slightly below best ask
   - Grid step determines how far from midpoint

3. **Manages Orders**
   - Finds existing orders for this trading pair
   - **Replaces** existing orders with new prices (prevents ghost orders)
   - **Creates** new orders if none exist

4. **Submits Transaction**
   - Builds Stellar transaction with buy + sell operations
   - Signs with your bot keypair
   - Submits to Horizon network with 8-second timeout

5. **Logs Activity**
   - Each cycle logs market data and transaction result
   - Last 10 logs displayed in UI
   - Shows errors, trades, and execution time

## Configuration

### Order Size (XLM)
Controls how much you're willing to buy or sell per order.
- **Larger** = More aggressive, uses more balance
- **Smaller** = More conservative, more frequent fills
- Default: 50 XLM

### Min Order Size (XLM)
Minimum balance required to operate the bot.
- Must have at least this amount + base reserve (0.5 XLM)
- Default: 10 XLM

### Grid Step (%)
Controls how far from market midpoint your orders sit.
- **Larger** = Orders further from midpoint, less fills
- **Smaller** = Orders closer to midpoint, more fills, tighter margins
- Default: 0.20%

## Real-Time Monitoring

### Trade Count
Shows how many times the bot successfully placed/updated orders since launch.

### Error Count
Shows failures (network timeouts, bad sequence, etc). Bot retries next cycle.

### Last Run
Timestamp of the most recent trading cycle execution.

### Live Logs
Shows what happened in each cycle:
- 📊 Order book fetched with bid/ask prices
- 💼 Active offer count and IDs
- ✅ Successful transaction with hash
- ❌ Errors with details

## Safety Features

- **Session Password**: Required to unlock bot trading
- **Page Close Cleanup**: Automatically stops bot when you leave
- **Timeout Protection**: 8-second timeout for all network operations
- **Fresh Sequence Loading**: Gets updated sequence number every cycle
- **Order Replacement**: Never accumulates ghost orders
- **No Manual Intervention**: Can't accidentally break anything once running

## Troubleshooting

### Bot won't launch
- Check bot wallet has sufficient balance (>= Min Order Size)
- Verify session password is correct
- Check browser console for network errors

### Bot keeps showing errors
- Check internet connection
- Verify bot wallet has enough balance for fees + reserve
- Check Stellar network status
- Logs show specific error details

### Order execution seems slow
- Stellar network can take 5-15 seconds to process
- Horizon API calls can be slow during high activity
- 60-second cycle gives plenty of time to complete

### How do I see my actual trades?
- Check the Stellar Expert website: https://stellar.expert
- Search for your bot wallet address
- View the "Trading" section to see all offers and fills

## Advanced: Custom Assets

Currently the browser bot trades XLM/XLM (native asset). To trade against other assets:

1. Edit the `launchBrowserBot` function in `components/trading-bot-panel.tsx`
2. Change `counterAsset` from `Asset.native()` to:
   ```typescript
   new StellarSdk.Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5T36C2YNE7')
   ```
3. Make sure your bot wallet has this asset with a trustline

## Notes

- The bot runs **only in the current browser tab** - no server involvement
- All trading happens on **Mainnet** by default
- Transactions are **signed locally** - your secret key never leaves your browser
- Each cycle costs **100 stroops** (0.00001 XLM) in Stellar base fees
- Orders can be **partially filled** - you may accumulate some assets

## Support

For issues or questions:
- Check TELEGRAM_SETUP.md for monitoring with notifications
- See DEPLOYMENT_CHECKLIST.md for production deployment notes
- Review lib/browser-market-maker.ts for technical details
