# Telegram Notifications Setup Guide

This guide will walk you through setting up real-time Telegram notifications for your Stellar Market Maker bot.

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a conversation with BotFather and send `/start`
3. Send the command `/newbot`
4. BotFather will ask for a name. Enter something like "Stellar Market Maker Bot"
5. BotFather will ask for a username. Enter something like `StellarMarketMakerBot` (must end with "bot")
6. **Save the token** that BotFather provides. It will look like: `123456789:ABCdefGHIjklmnoPQRstuvwxyzABCDEFG`

This is your **TELEGRAM_BOT_TOKEN**.

## Step 2: Get Your Chat ID

### Option A: Get Chat ID from Bot (Recommended)

1. Start a conversation with your newly created bot (search by username)
2. Send any message to the bot
3. Go to: `https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getUpdates`
   - Replace `{YOUR_BOT_TOKEN}` with your actual bot token from Step 1
4. Look for the response JSON and find the `"id"` field under `"chat"`
5. This **id** is your **TELEGRAM_CHAT_ID**

Example response:
```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "date": 1234567890,
        "chat": {
          "id": 987654321,  <-- This is your TELEGRAM_CHAT_ID
          "first_name": "Your Name",
          "type": "private"
        },
        "text": "test"
      }
    }
  ]
}
```

### Option B: Get Chat ID from Group

If you want bot notifications in a group:
1. Create a Telegram group
2. Add your bot to the group
3. Send a message to the group
4. Use the same API call as above to find the chat ID (it will be negative for groups)

## Step 3: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add two new environment variables:

```
TELEGRAM_BOT_TOKEN = 123456789:ABCdefGHIjklmnoPQRstuvwxyzABCDEFG
TELEGRAM_CHAT_ID = 987654321
```

4. Make sure these are set for **Production** environment
5. Click "Save"

## Step 4: Deploy and Test

The bot will automatically send notifications when:

### Successful Trades
✅ When a market maker order is successfully placed
- Shows transaction hash
- Shows buy/sell prices
- Shows market spread
- Indicates if order was created or replaced

### Errors
🚨 When critical errors occur:
- Order book fetch failures
- Account loading failures
- Transaction submission failures
- Unexpected runtime errors

### Emergency Stop
⛔ When the emergency kill-switch is triggered:
- Shows number of offers canceled
- Shows transaction hash
- Confirms all orders were removed

### Order Book Warnings
⚠️ When issues are detected:
- Empty order book (no liquidity)
- Low balance warnings
- Other operational issues

## Testing Notifications

To test that your setup works before the bot starts trading:

1. Make sure your Vercel deployment is complete
2. Use curl to trigger the market maker endpoint manually:

```bash
curl -X GET "https://your-app.vercel.app/api/market-maker" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

You should receive a Telegram notification within a few seconds.

## Notification Examples

### Trade Execution
```
✅ Market Maker Trade Executed

Transaction: 3d2f5e8...
Buy Price: 1.2345
Sell Price: 1.2355
Order Size: 50 XLM
Spread: 0.08%
Action: REPLACE
```

### Error Notification
```
🚨 Order Book Fetch Failed

Failed to fetch SDEX order book: Network timeout
Timestamp: 2024-06-17 21:30:45 UTC
```

### Emergency Stop
```
⛔ Emergency Stop Triggered

Market maker has been shut down
Canceled Offers: 8
Transaction: a1b2c3d4e5f6...
```

## Troubleshooting

### Notifications not received?

1. **Verify bot token is correct**
   - Check it matches exactly in Vercel environment variables
   - No spaces before or after the token

2. **Verify chat ID is correct**
   - Use the API endpoint to double-check: `https://api.telegram.org/bot{TOKEN}/getUpdates`
   - For groups, chat IDs are negative (e.g., -123456789)

3. **Check Vercel logs**
   - Go to Vercel dashboard > Deployments > Logs
   - Search for "Telegram" to see if messages are being sent
   - Look for any error messages

4. **Test bot directly**
   - Send a test message: `https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text=test`
   - If this works but notifications don't, the issue is in the market maker logic

5. **Permissions issue?**
   - Make sure you've sent at least one message to the bot first
   - This "activates" the chat for the bot

### Need to disable notifications?

Simply remove the environment variables from Vercel. The bot will continue to work normally but won't send Telegram messages. No code changes needed.

## Security Notes

- Keep your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID secret
- Never share these values or commit them to git
- Use Vercel's encrypted environment variables
- You can rotate tokens anytime by creating a new bot with @BotFather

## Support

For Telegram API issues, refer to: https://core.telegram.org/bots/api

For market maker notifications code, see: `lib/telegram-logger.ts`
