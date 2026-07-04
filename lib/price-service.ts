/**
 * Token Price Service
 * Fetches token prices and 24h price change from Horizon and CoinGecko APIs
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const HORIZON_API = 'https://horizon.stellar.org';
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface TokenPrice {
  usd: number;
  usd_24h_change: number;
}

interface CachedPrice extends TokenPrice {
  cachedAt: number;
}

export interface WalletAssetPriceInput {
  code: string;
  issuer?: string;
}

// Mapping of Stellar token codes to CoinGecko IDs
// This includes major Stellar-native tokens and popular assets
const TOKEN_COINGECKO_IDS: Record<string, string> = {
  // Major tokens
  XLM: 'stellar',
  USDC: 'usd-coin',
  EURC: 'euro-coin',

  // Cryptocurrencies
  BTC: 'bitcoin',
  ETH: 'ethereum',
  DOGE: 'dogecoin',

  // Stellar ecosystem tokens
  AQUA: 'aqua',
  SHX: 'stronghold',
  VELO: 'velo',
  RIO: 'realio-token',
  ARST: 'ars-token',
  BRLT: 'brl-token',
  DBTK: 'digibank-token',
  FORGE: 'stellarforge',
  GRAT: 'grat-token',
  yXLM: 'ultrastellar-yield-xlm',

  // StellarForge ecosystem
  OOPS: 'oops-token',
  SPARK: 'spark-token',
  STROLL: 'stroll-token',
  WEEDCOIN: 'weedcoin',

  // USD variants
  yUSDC: 'usd-coin',

  // Stablecoins and wrapped tokens
  USDT: 'tether',
  BUSD: 'binance-usd',
  LUMIN: 'luminex',
  CETES: 'cetes-token',

  // Additional tokens
  ETN: 'electroneum',
  HOLDING: 'holding-token',
  JOHN: 'john-token',
  KING: 'king-token',
  TERN: 'tern-token',
  USDH: 'usdh-token',
  MOBI: 'mobi-token',
};

/**
 * Get CoinGecko ID for a token
 */
function getCoingeckoId(code: string): string | null {
  return TOKEN_COINGECKO_IDS[code] || null;
}

function getAssetKey(code: string, issuer = ''): string {
  return `${code}_${issuer}`;
}

function getAssetType(code: string, issuer = ''): 'native' | 'credit_alphanum4' | 'credit_alphanum12' {
  if (code === 'XLM' || !issuer) {
    return 'native';
  }
  return code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
}

function buildAssetQuery(prefix: string, code: string, issuer = ''): string {
  const assetType = getAssetType(code, issuer);
  const params = new URLSearchParams();
  params.set(`${prefix}_asset_type`, assetType);

  if (assetType !== 'native') {
    params.set(`${prefix}_asset_code`, code);
    params.set(`${prefix}_asset_issuer`, issuer);
  }

  return params.toString();
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
      if (Date.now() - parsed.cachedAt < PRICE_CACHE_DURATION) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[v0] Error reading price cache:', error);
  }
  return null;
}

function getCachedAssetPrice(code: string, issuer = ''): CachedPrice | null {
  try {
    const key = `asset_price_${getAssetKey(code, issuer)}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: CachedPrice = JSON.parse(cached);
      if (Date.now() - parsed.cachedAt < PRICE_CACHE_DURATION) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[v0] Error reading asset price cache:', error);
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

function cacheAssetPrice(code: string, issuer = '', price: TokenPrice): void {
  try {
    const key = `asset_price_${getAssetKey(code, issuer)}`;
    const cached: CachedPrice = {
      ...price,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('[v0] Error caching asset price:', error);
  }
}

async function fetchAssetUsdPriceFromHorizon(code: string, issuer = ''): Promise<number | null> {
  if (code === 'USDC' && issuer === USDC_ISSUER) {
    return 1;
  }

  const sourceParams = buildAssetQuery('source', code, issuer);
  const destinationAsset = `credit_alphanum4:USDC:${USDC_ISSUER}`;
  const url = `${HORIZON_API}/paths/strict-send?${sourceParams}&source_amount=1&destination_assets=${encodeURIComponent(destinationAsset)}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const bestPath = data?._embedded?.records?.[0];
    if (!bestPath?.destination_amount) {
      return null;
    }

    const usdPrice = parseFloat(bestPath.destination_amount);
    return Number.isFinite(usdPrice) ? usdPrice : null;
  } catch (error) {
    console.error(`[v0] Error fetching Horizon USD path for ${code}:`, error);
    return null;
  }
}

async function fetchAsset24hChangeFromHorizon(code: string, issuer = ''): Promise<number> {
  if (code === 'USDC' && issuer === USDC_ISSUER) {
    return 0;
  }

  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1000;
  const baseParams = buildAssetQuery('base', code, issuer);
  const counterParams = new URLSearchParams({
    counter_asset_type: 'credit_alphanum4',
    counter_asset_code: 'USDC',
    counter_asset_issuer: USDC_ISSUER,
  }).toString();

  const url = `${HORIZON_API}/trade_aggregations?${baseParams}&${counterParams}&resolution=3600000&start_time=${startTime}&end_time=${now}&order=asc&limit=24`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    const records = data?._embedded?.records || [];
    if (!Array.isArray(records) || records.length < 1) {
      return 0;
    }

    const first = records[0];
    const last = records[records.length - 1];
    const open = parseFloat(first.open);
    const close = parseFloat(last.close);

    if (!Number.isFinite(open) || !Number.isFinite(close) || open <= 0) {
      return 0;
    }

    const change = ((close - open) / open) * 100;
    return Number.isFinite(change) ? change : 0;
  } catch (error) {
    console.error(`[v0] Error fetching 24h change for ${code}:`, error);
    return 0;
  }
}

export async function fetchAssetTokenPrice(code: string, issuer = ''): Promise<TokenPrice | null> {
  const cached = getCachedAssetPrice(code, issuer);
  if (cached) {
    return cached;
  }

  const usd = await fetchAssetUsdPriceFromHorizon(code, issuer);
  if (usd === null) {
    return null;
  }

  const usd_24h_change = await fetchAsset24hChangeFromHorizon(code, issuer);
  const price: TokenPrice = { usd, usd_24h_change };
  cacheAssetPrice(code, issuer, price);
  return price;
}

export async function fetchWalletAssetPrices(assets: WalletAssetPriceInput[]): Promise<Record<string, TokenPrice | null>> {
  const uniqueAssets = assets.filter((asset, index, arr) => {
    const key = getAssetKey(asset.code, asset.issuer || '');
    return index === arr.findIndex((candidate) => getAssetKey(candidate.code, candidate.issuer || '') === key);
  });

  const entries = await Promise.all(
    uniqueAssets.map(async ({ code, issuer = '' }) => {
      const key = getAssetKey(code, issuer);
      const price = await fetchAssetTokenPrice(code, issuer);
      return [key, price] as const;
    })
  );

  return Object.fromEntries(entries);
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
