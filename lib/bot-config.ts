/**
 * Bot Configuration - Loads credentials from Vercel environment variables
 * This provides secure server-side access to the bot's Stellar secret key
 * without storing sensitive data in the browser or session storage.
 */

interface BotConfig {
  stellarSecretKey: string;
  horizonUrl: string;
  networkPassphrase: string;
  isDryRun: boolean;
}

/**
 * Load bot configuration from Vercel protected environment variables.
 * Called on server startup to validate all required credentials are available.
 */
export function loadBotConfig(): BotConfig {
  // Stellar secret key - NEVER expose this to the client
  const stellarSecretKey = process.env.STELLAR_BOT_SECRET_KEY;
  if (!stellarSecretKey) {
    throw new Error(
      'STELLAR_BOT_SECRET_KEY is not configured. Add it to Vercel environment variables.'
    );
  }

  // Horizon API endpoint - defaults to Mainnet
  const horizonUrl = process.env.HORIZON_URL || 'https://horizon.stellar.org';

  // Network passphrase - ensure we're connecting to the correct Stellar network
  const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Public Global Stellar Network ; September 2015';

  // Dry-run mode flag - for testing without live trading
  const isDryRun = process.env.BOT_DRY_RUN === 'true';

  return {
    stellarSecretKey,
    horizonUrl,
    networkPassphrase,
    isDryRun,
  };
}

/**
 * Get bot configuration with validation.
 * Singleton pattern ensures config is only loaded once on server startup.
 */
let cachedConfig: BotConfig | null = null;

export function getBotConfig(): BotConfig {
  if (!cachedConfig) {
    cachedConfig = loadBotConfig();
  }
  return cachedConfig;
}

/**
 * Validate that the Stellar secret key is properly formatted.
 * Stellar secret keys start with 'S' and are 56 characters long.
 */
export function isValidStellarSecret(secret: string): boolean {
  return secret.startsWith('S') && secret.length === 56;
}

/**
 * Check if all required environment variables are configured.
 * Called during application startup to fail fast on configuration issues.
 */
export function validateBotConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.STELLAR_BOT_SECRET_KEY) {
    errors.push('STELLAR_BOT_SECRET_KEY is not configured');
  } else if (!isValidStellarSecret(process.env.STELLAR_BOT_SECRET_KEY)) {
    errors.push('STELLAR_BOT_SECRET_KEY format is invalid (must start with S and be 56 characters)');
  }

  if (!process.env.HORIZON_URL) {
    // Optional - uses default if not provided
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
