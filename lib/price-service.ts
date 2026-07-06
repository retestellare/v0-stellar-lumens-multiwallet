/**
 * Token Price Service
 * Fetches token prices and 24h price change from CoinGecko API.
 *
 * Caching strategy (fastest → slowest):
 *   1. In-memory Map  — zero-cost, survives component unmounts
 *   2. localStorage   — persists across page reloads
 *   3. Network fetch  — updates both caches on success
 *
 * Stale-while-revalidate: if a cached value is older than PRICE_CACHE_DURATION
 * it is returned immediately and a background refresh is scheduled so the UI
 * stays responsive while the fresh value propagates on the next render cycle.
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Stale-while-revalidate window: return stale data for up to 10 extra minutes
// while a background re-fetch runs.
const PRICE_STALE_WINDOW = 10 * 60 * 1000;

interface TokenPrice {
  usd: number;
  usd_24h_change: number;
}

interface CachedPrice extends TokenPrice {
  cachedAt: number;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────
// Keyed by token code. Avoids JSON round-trips for repeated lookups.
const memoryCache = new Map<string, CachedPrice>();

// Track in-flight fetches to prevent duplicate network requests for the same token.
const inflight = new Map<string, Promise<TokenPrice | null>>();

// Mapping of Stellar token codes to CoinGecko IDs
// This includes major Stellar-native tokens and popular assets
const TOKEN_COINGECKO_IDS: Record<string, string> = {
  // Major tokens
  'XLM': 'stellar',
  'USDC': 'usd-coin',
  'EURC': 'euro-coin',
  
  // Cryptocurrencies
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'DOGE': 'dogecoin',
  
  // Stellar ecosystem tokens
  'AQUA': 'aqua',
  'SHX': 'stronghold',
  'VELO': 'velo',
  'RIO': 'realio-token',
  'ARST': 'ars-token',
  'BRLT': 'brl-token',
  'DBTK': 'digibank-token',
  'FORGE': 'stellarforge',
  'GRAT': 'grat-token',
  'yXLM': 'ultrastellar-yield-xlm',
  
  // StellarForge ecosystem
  'OOPS': 'oops-token',
  'SPARK': 'spark-token',
  'STROLL': 'stroll-token',
  'WEEDCOIN': 'weedcoin',
  
  // USD variants
  'yUSDC': 'usd-coin',
  
  // Stablecoins and wrapped tokens
  'USDT': 'tether',
  'BUSD': 'binance-usd',
  'LUMIN': 'luminex',
  'CETES': 'cetes-token',
  
  // Additional tokens
  'ETN': 'electroneum',
  'HOLDING': 'holding-token',
  'JOHN': 'john-token',
  'KING': 'king-token',
  'TERN': 'tern-token',
  'USDH': 'usdh-token',
  'MOBI': 'mobi-token',
};

/**
 * Get CoinGecko ID for a token
 */
function getCoingeckoId(code: string): string | null {
  return TOKEN_COINGECKO_IDS[code] || null;
}

// ─── Memory cache helpers ─────────────────────────────────────────────────────

function getMemoryCached(code: string): CachedPrice | null {
  const entry = memoryCache.get(code);
  if (!entry) return null;
  // Within the full stale window (fresh + stale-while-revalidate)
  if (Date.now() - entry.cachedAt < PRICE_CACHE_DURATION + PRICE_STALE_WINDOW) {
    return entry;
  }
  memoryCache.delete(code);
  return null;
}

function setMemoryCache(code: string, price: TokenPrice): void {
  memoryCache.set(code, { ...price, cachedAt: Date.now() });
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

/**
 * Read a price from localStorage. Returns the entry (even if stale so it can
 * be used for stale-while-revalidate) or null if absent / expired beyond the
 * stale window.
 */
function getLocalCached(code: string): CachedPrice | null {
  try {
    const raw = localStorage.getItem(`price_${code}`);
    if (!raw) return null;
    const parsed: CachedPrice = JSON.parse(raw);
    const age = Date.now() - parsed.cachedAt;
    if (age < PRICE_CACHE_DURATION + PRICE_STALE_WINDOW) {
      return parsed;
    }
    localStorage.removeItem(`price_${code}`);
  } catch {
    // Ignore localStorage errors (SSR, private browsing, quota, etc.)
  }
  return null;
}

function setLocalCache(code: string, price: TokenPrice): void {
  try {
    localStorage.setItem(
      `price_${code}`,
      JSON.stringify({ ...price, cachedAt: Date.now() })
    );
  } catch {
    // Ignore localStorage errors
  }
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function fetchFromNetwork(code: string, coingeckoId: string): Promise<TokenPrice | null> {
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

    // Populate both cache layers
    setMemoryCache(code, price);
    setLocalCache(code, price);
    return price;
  } catch (error) {
    console.error(`[v0] Error fetching price for ${code}:`, error);
    return null;
  }
}

/**
 * Fetch token price from CoinGecko with a two-tier cache and
 * stale-while-revalidate semantics.
 *
 * 1. Check in-memory cache (fastest)
 * 2. Check localStorage (survives page reload)
 * 3. Fetch from network (de-duplicated via `inflight` map)
 *
 * If cached data is within PRICE_CACHE_DURATION it is returned immediately.
 * If it falls in the stale-while-revalidate window the stale value is returned
 * while a background network request updates both caches.
 */
export async function fetchTokenPrice(code: string): Promise<TokenPrice | null> {
  const now = Date.now();

  // 1. In-memory cache — still fresh?
  const mem = memoryCache.get(code);
  if (mem) {
    const age = now - mem.cachedAt;
    if (age < PRICE_CACHE_DURATION) {
      return mem;
    }
    // Stale but within revalidate window — return stale and refresh in background
    if (age < PRICE_CACHE_DURATION + PRICE_STALE_WINDOW) {
      scheduleBackgroundRefresh(code);
      return mem;
    }
    memoryCache.delete(code);
  }

  // 2. localStorage — still fresh?
  const local = getLocalCached(code);
  if (local) {
    // Populate memory cache from localStorage
    setMemoryCache(code, local);
    const age = now - local.cachedAt;
    if (age < PRICE_CACHE_DURATION) {
      return local;
    }
    // Stale-while-revalidate
    scheduleBackgroundRefresh(code);
    return local;
  }

  const coingeckoId = getCoingeckoId(code);
  if (!coingeckoId) return null;

  // 3. Network fetch — de-duplicate concurrent requests for the same token
  const existing = inflight.get(code);
  if (existing) return existing;

  const promise = fetchFromNetwork(code, coingeckoId).finally(() => {
    inflight.delete(code);
  });
  inflight.set(code, promise);
  return promise;
}

/**
 * Fire a background re-fetch without blocking the caller.
 * Guarded so only one refresh runs at a time per token.
 */
function scheduleBackgroundRefresh(code: string): void {
  if (inflight.has(code)) return;
  const coingeckoId = getCoingeckoId(code);
  if (!coingeckoId) return;

  const promise = fetchFromNetwork(code, coingeckoId).finally(() => {
    inflight.delete(code);
  });
  inflight.set(code, promise);
}

/**
 * Invalidate the cache for a specific token (useful after known price events).
 */
export function invalidatePriceCache(code: string): void {
  memoryCache.delete(code);
  try {
    localStorage.removeItem(`price_${code}`);
  } catch {
    // Ignore localStorage errors
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
