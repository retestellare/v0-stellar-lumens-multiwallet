/**
 * Price Service
 * Fetches and caches token prices in XLM from CoinGecko and other sources
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface PriceCache {
  [key: string]: {
    priceInXLM: number;
    timestamp: number;
  };
}

const priceCache: PriceCache = {};

// Known token prices in XLM (fallback values)
const KNOWN_PRICES: Record<string, number> = {
  'XLM': 1,
  'USDC': 13.5, // ~1 USDC = 13.5 XLM (approximate, will be updated from CoinGecko)
  'EURC': 14.5, // ~1 EURC = 14.5 XLM (approximate)
  'BTC': 620000, // ~1 BTC = 620000 XLM (approximate)
  'ETH': 35000, // ~1 ETH = 35000 XLM (approximate)
  'AQUA': 1.2,
  'yXLM': 1.1,
  'SHX': 0.5,
  'VELO': 0.8,
  'RIO': 2.5,
};

/**
 * Get cached price for a token
 */
function getCachedPrice(code: string): number | null {
  const cached = priceCache[code];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.priceInXLM;
  }
  return null;
}

/**
 * Cache a price
 */
function cachePrice(code: string, priceInXLM: number): void {
  priceCache[code] = {
    priceInXLM,
    timestamp: Date.now(),
  };
}

/**
 * Fetch XLM price from CoinGecko
 */
async function fetchXLMPrice(): Promise<number> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=stellar&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.stellar?.usd || 0.15; // Default fallback
  } catch (error) {
    console.error('[v0] Error fetching XLM price:', error);
    return 0.15; // Default fallback price
  }
}

/**
 * Fetch token price in USD from CoinGecko
 */
async function fetchTokenPriceUSD(tokenId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${tokenId}&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false`,
      { cache: 'no-store' }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data[tokenId]?.usd || null;
  } catch (error) {
    console.error(`[v0] Error fetching price for ${tokenId}:`, error);
    return null;
  }
}

/**
 * Get price of a token in XLM
 */
export async function getTokenPriceInXLM(code: string): Promise<number> {
  // Return 1 for XLM
  if (code === 'XLM') {
    return 1;
  }

  // Check cache first
  const cachedPrice = getCachedPrice(code);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // Check known prices
  if (KNOWN_PRICES[code]) {
    cachePrice(code, KNOWN_PRICES[code]);
    return KNOWN_PRICES[code];
  }

  // Try to fetch from CoinGecko
  try {
    // Map token codes to CoinGecko IDs
    const coinGeckoId = getCoingeckoId(code);
    if (!coinGeckoId) {
      // Return 1 as default if unknown token
      return 1;
    }

    const xlmPriceUSD = await fetchXLMPrice();
    const tokenPriceUSD = await fetchTokenPriceUSD(coinGeckoId);

    if (tokenPriceUSD && xlmPriceUSD > 0) {
      const priceInXLM = tokenPriceUSD / xlmPriceUSD;
      cachePrice(code, priceInXLM);
      return priceInXLM;
    }
  } catch (error) {
    console.error(`[v0] Error calculating price for ${code}:`, error);
  }

  // Return fallback
  return KNOWN_PRICES[code] || 1;
}

/**
 * Map token codes to CoinGecko IDs
 */
function getCoingeckoId(code: string): string | null {
  const mapping: Record<string, string> = {
    'XLM': 'stellar',
    'USDC': 'usd-coin',
    'EURC': 'euro-coin',
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'AQUA': 'aquarius',
    'VELO': 'velo',
    'SHX': 'stronghold',
  };
  return mapping[code] || null;
}

/**
 * Calculate token value in XLM
 */
export async function calculateValueInXLM(balance: string, tokenCode: string): Promise<string> {
  const balanceNum = parseFloat(balance);
  if (isNaN(balanceNum)) return '0.0000';

  const priceInXLM = await getTokenPriceInXLM(tokenCode);
  const valueInXLM = balanceNum * priceInXLM;

  return valueInXLM.toFixed(4);
}

/**
 * Batch calculate prices for multiple tokens
 */
export async function getPricesInXLM(tokens: { code: string }[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  await Promise.all(
    tokens.map(async (token) => {
      prices[token.code] = await getTokenPriceInXLM(token.code);
    })
  );

  return prices;
}
