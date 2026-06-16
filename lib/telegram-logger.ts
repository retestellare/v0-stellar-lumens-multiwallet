import axios from 'axios';

interface TelegramMessage {
  type: 'trade' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Telegram Logger Module
 * Sends asynchronous notifications to Telegram chat after trades or errors
 * Does not block main execution - uses fire-and-forget pattern
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/**
 * Format trade execution message
 */
function formatTradeMessage(details: {
  txHash: string;
  buyPrice: string;
  sellPrice: string;
  orderSize: number;
  spread: string;
  action: 'CREATE' | 'REPLACE';
}): string {
  return `
✅ *Market Maker Trade Executed*

🔗 Transaction: \`${details.txHash.substring(0, 12)}...\`
💰 Buy Price: ${details.buyPrice}
💵 Sell Price: ${details.sellPrice}
📊 Spread: ${details.spread}%
📦 Order Size: ${details.orderSize} XLM
🔄 Action: ${details.action === 'REPLACE' ? 'Replaced existing order' : 'Created new order'}
⏰ Time: ${new Date().toISOString()}
  `.trim();
}

/**
 * Format error message
 */
function formatErrorMessage(details: { error: string; context?: string }): string {
  return `
❌ *Critical Error in Market Maker*

🚨 Error: ${details.error}
📝 Context: ${details.context || 'Unknown'}
⏰ Time: ${new Date().toISOString()}
  `.trim();
}

/**
 * Format info message
 */
function formatInfoMessage(title: string, details: Record<string, any>): string {
  const formattedDetails = Object.entries(details)
    .map(([key, value]) => `• ${key}: ${value}`)
    .join('\n');

  return `
ℹ️ *${title}*

${formattedDetails}
⏰ Time: ${new Date().toISOString()}
  `.trim();
}

/**
 * Format warning message
 */
function formatWarningMessage(title: string, message: string): string {
  return `
⚠️ *${title}*

${message}
⏰ Time: ${new Date().toISOString()}
  `.trim();
}

/**
 * Send message to Telegram (fire-and-forget, async)
 */
async function sendTelegramMessage(text: string): Promise<void> {
  if (!isTelegramConfigured()) {
    console.warn('[Telegram] Not configured - skipping message');
    return;
  }

  try {
    // Fire and forget - don't wait for response
    axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }).catch((error) => {
      console.error('[Telegram] Failed to send message:', error.message);
    });
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
  }
}

/**
 * Log successful trade execution
 * @param txHash Transaction hash on Stellar network
 * @param tradeDetails Order details (buy price, sell price, etc.)
 */
export async function logTradeExecution(
  txHash: string,
  tradeDetails: {
    buyPrice: string;
    sellPrice: string;
    orderSize: number;
    spread: string;
    action: 'CREATE' | 'REPLACE';
  }
): Promise<void> {
  const message = formatTradeMessage({ txHash, ...tradeDetails });
  sendTelegramMessage(message);
  console.log('[Telegram] Trade execution logged');
}

/**
 * Log critical error that requires attention
 * @param error Error message or Error object
 * @param context Additional context about where error occurred
 */
export async function logError(error: string | Error, context?: string): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const message = formatErrorMessage({
    error: errorMessage,
    context,
  });
  sendTelegramMessage(message);
  console.error('[Telegram] Error logged:', errorMessage);
}

/**
 * Log info message (order book update, liquidity check, etc.)
 * @param title Message title
 * @param details Key-value pairs to display
 */
export async function logInfo(title: string, details: Record<string, any>): Promise<void> {
  const message = formatInfoMessage(title, details);
  sendTelegramMessage(message);
  console.log('[Telegram] Info logged:', title);
}

/**
 * Log warning message (low balance, spread threshold not met, etc.)
 * @param title Warning title
 * @param message Warning message
 */
export async function logWarning(title: string, message: string): Promise<void> {
  const formattedMessage = formatWarningMessage(title, message);
  sendTelegramMessage(formattedMessage);
  console.warn('[Telegram] Warning logged:', title);
}

/**
 * Log bot startup
 */
export async function logStartup(details: {
  orderSize: number;
  minOrderSize: number;
  gridStep: string;
  tradingAsset: string;
}): Promise<void> {
  const message = formatInfoMessage('Market Maker Bot Started', {
    'Order Size': `${details.orderSize} XLM`,
    'Min Order Size': `${details.minOrderSize} XLM`,
    'Grid Step': `${details.gridStep}%`,
    'Trading Asset': details.tradingAsset || 'XLM',
    Mode: 'Live Trading',
  });
  sendTelegramMessage(message);
}

/**
 * Log bot shutdown
 */
export async function logShutdown(details: {
  offersCreated: number;
  tradesExecuted: number;
  runtime: string;
}): Promise<void> {
  const message = formatWarningMessage('Market Maker Bot Stopped', `
Offers Created: ${details.offersCreated}
Trades Executed: ${details.tradesExecuted}
Runtime: ${details.runtime}

Emergency stop initiated.
  `);
  sendTelegramMessage(message);
}

/**
 * Log order book liquidity check
 */
export async function logOrderBookCheck(details: {
  bestBid: number;
  bestAsk: number;
  spread: string;
  liquidityStatus: 'GOOD' | 'LOW' | 'CRITICAL';
}): Promise<void> {
  const emoji = details.liquidityStatus === 'GOOD' ? '✅' : details.liquidityStatus === 'LOW' ? '⚠️' : '❌';
  const message = formatInfoMessage(`${emoji} Order Book Check`, {
    'Best Bid': details.bestBid,
    'Best Ask': details.bestAsk,
    Spread: `${details.spread}%`,
    Liquidity: details.liquidityStatus,
  });
  sendTelegramMessage(message);
}

/**
 * Log insufficient balance warning
 */
export async function logInsufficientBalance(details: {
  requiredBalance: number;
  currentBalance: number;
  shortfallAmount: number;
}): Promise<void> {
  const message = formatWarningMessage('Insufficient Balance', `
Required: ${details.requiredBalance} XLM
Current: ${details.currentBalance} XLM
Shortfall: ${details.shortfallAmount} XLM

Bot paused until balance is restored.
  `);
  sendTelegramMessage(message);
}

/**
 * Log order replacement activity
 */
export async function logOrderReplacement(details: {
  buyOfferID: string;
  sellOfferID: string;
  buyPrice: string;
  sellPrice: string;
  reason: string;
}): Promise<void> {
  const message = formatInfoMessage('Orders Replaced', {
    'Buy Offer ID': details.buyOfferID,
    'Sell Offer ID': details.sellOfferID,
    'New Buy Price': details.buyPrice,
    'New Sell Price': details.sellPrice,
    'Reason': details.reason,
  });
  sendTelegramMessage(message);
}
