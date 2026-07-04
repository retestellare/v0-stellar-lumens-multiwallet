/**
 * Token Price Service
 * Fetches token prices and 24h price change from CoinGecko API
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface TokenPrice {
  usd: number;
  usd_24h_change: number;
}

interface CachedPrice extends TokenPrice {
  cachedAt: number;
}

// Mapping of Stellar token codes to CoinGecko IDs
const TOKEN_COINGECKO_IDS: Record<string, string> = {
  'XLM': 'stellar',
  'USDC': 'usd-coin',
  'EURC': 'euro-coin',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'AQUA': 'aqua',
  'SHX': 'stronghold',
  'VELO': 'velo',
  'RIO': 'realio-token',
  'ARST': 'ars-token',
  'BRLT': 'brl-token',
  'DBTK': 'digibank-token',
  'DOGE': 'dogecoin',
  'FORGE': 'stellarforge',
  'GRAT': 'grat-token',
  'yXLM': 'ultrastellar-yield-xlm',
};

/**
 * Get CoinGecko ID for a token
 */
function getCoingeckoId(code: string): string | null {
  return TOKEN_COINGECKO_IDS[code] || null;
}

/**
 * Get cached price from localStorage
 */
function getCachedPrice(code: string): CachedPrice | null {
  try {
    const key = `price_${code}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: CachedPrice = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;
      if (age < PRICE_CACHE_DURATION) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[v0] Error reading price cache:', error);
  }
  return null;
}

/**
 * Cache price to localStorage
 */
function cachePrice(code: string, price: TokenPrice): void {
  try {
    const key = `price_${code}`;
    const cached: CachedPrice = {
      ...price,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('[v0] Error caching price:', error);
  }
}

/**
 * Fetch token price from CoinGecko
 */
export async function fetchTokenPrice(code: string): Promise<TokenPrice | null> {
  // Check cache first
  const cached = getCachedPrice(code);
  if (cached) {
    return cached;
  }

  const coingeckoId = getCoingeckoId(code);
  if (!coingeckoId) {
    // Token not found in mapping, return null silently
    return null;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.warn(`[v0] CoinGecko API error for ${code}:`, response.status);
      return null;
    }

    const data = await response.json();
    const priceData = data[coingeckoId];

    if (!priceData || priceData.usd === undefined) {
      console.warn(`[v0] No price data for ${code} from CoinGecko`);
      return null;
    }

    const price: TokenPrice = {
      usd: priceData.usd,
      usd_24h_change: priceData.usd_24h_change || 0,
    };

    cachePrice(code, price);
    return price;
  } catch (error) {
    console.error(`[v0] Error fetching price for ${code}:`, error);
    return null;
  }
}

/**
 * Fetch prices for multiple tokens in parallel
 */
export async function fetchTokenPrices(codes: string[]): Promise<Record<string, TokenPrice | null>> {
  const results: Record<string, TokenPrice | null> = {};
  const promises = codes.map(async (code) => {
    const price = await fetchTokenPrice(code);
    results[code] = price;
  });

  await Promise.all(promises);
  return results;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toExponential(2)}`;
  }
}

/**
 * Format 24h change percentage for display
 */
export function formatChange(change: number): { text: string; isPositive: boolean } {
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  return {
    text: `${sign}${change.toFixed(2)}%`,
    isPositive,
  };
}
