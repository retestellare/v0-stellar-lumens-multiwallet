/**
 * Token Data Service
 * Fetches and caches comprehensive token metadata from Stellar Expert and Horizon
 */

import { TokenMetadata, StellarExpertToken, CoinGeckoToken } from '@/types/token';

const STELLAR_EXPERT_API = 'https://api.stellar.expert/explorer/public/asset';
const HORIZON_URL = 'https://horizon.stellar.org';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedToken extends TokenMetadata {
  cachedAt: number;
}

/**
 * Get cached token from localStorage
 */
function getCachedToken(code: string, issuer: string): CachedToken | null {
  try {
    const key = `token_${code}_${issuer}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: CachedToken = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;
      if (age < CACHE_DURATION) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[v0] Error reading token cache:', error);
  }
  return null;
}

/**
 * Cache token to localStorage
 */
function cacheToken(token: TokenMetadata): void {
  try {
    const key = `token_${token.code}_${token.issuer}`;
    const cached: CachedToken = {
      ...token,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('[v0] Error caching token:', error);
  }
}

/**
 * Fetch tokens from Stellar Expert API
 */
async function fetchStellarExpertTokens(limit = 100): Promise<StellarExpertToken[]> {
  try {
    // Try Stellar Expert first
    const response = await fetch(`${STELLAR_EXPERT_API}?sort=rating&order=desc&limit=${limit}`, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      const records = data._embedded?.records || data.records || [];
      console.log('[v0] Stellar Expert returned', records.length, 'tokens');
      return records;
    }
    
    // Fallback to Horizon assets endpoint
    console.log('[v0] Stellar Expert failed, falling back to Horizon');
    const horizonResponse = await fetch(`${HORIZON_URL}/assets?limit=${limit}&order=desc`);
    if (!horizonResponse.ok) {
      throw new Error(`Horizon API error: ${horizonResponse.status}`);
    }
    
    const horizonData = await horizonResponse.json();
    const records = horizonData._embedded?.records || [];
    
    // Map Horizon response to StellarExpertToken format
    return records.map((r: any) => ({
      code: r.asset_code,
      issuer: r.asset_issuer,
      name: r.asset_code,
      domain: r._links?.toml?.href?.replace('/.well-known/stellar.toml', '').replace('https://', ''),
      verified: r.flags?.auth_required === false,
      num_accounts: r.num_accounts,
    }));
  } catch (error) {
    console.error('[v0] Error fetching tokens:', error);
    return [];
  }
}

/**
 * Fetch token image from CoinGecko
 */
async function fetchCoinGeckoImage(symbol: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${COINGECKO_API}/search?query=${symbol}`);
    if (!response.ok) return undefined;

    const data = await response.json();
    const result = data.coins?.[0];
    
    if (result?.large) {
      return result.large;
    }
  } catch (error) {
    console.error('[v0] Error fetching CoinGecko image:', error);
  }
  return undefined;
}

/**
 * Fetch a specific token's complete metadata
 */
export async function fetchTokenMetadata(code: string, issuer: string): Promise<TokenMetadata | null> {
  // Check cache first
  const cached = getCachedToken(code, issuer);
  if (cached) {
    return cached;
  }

  try {
    // Fetch from Stellar Expert
    const tokens = await fetchStellarExpertTokens(200);
    const found = tokens.find((t) => t.code === code && t.issuer === issuer);

    if (found) {
      const metadata: TokenMetadata = {
        code: found.code,
        issuer: found.issuer,
        name: found.name,
        domain: found.domain,
        image: found.image,
        verified: found.verified,
        source: 'stellar-expert',
        lastUpdated: Date.now(),
      };

      // Try to get image from CoinGecko if not available
      if (!metadata.image) {
        const image = await fetchCoinGeckoImage(code);
        if (image) {
          metadata.image = image;
        }
      }

      cacheToken(metadata);
      return metadata;
    }
  } catch (error) {
    console.error('[v0] Error fetching token metadata:', error);
  }

  return null;
}

/**
 * Search tokens by code, name, or issuer
 */
export async function searchTokens(query: string, limit = 50): Promise<TokenMetadata[]> {
  if (!query || query.length < 1) {
    return [];
  }

  const queryUpper = query.toUpperCase();
  const queryLower = query.toLowerCase();

  try {
    const tokens = await fetchStellarExpertTokens(500);

    // Filter and sort by relevance
    const matches = tokens
      .filter((t) => {
        const nameMatch = t.name?.toLowerCase().includes(queryLower);
        const codeMatch = t.code.includes(queryUpper);
        const issuerMatch = t.issuer.includes(queryUpper);
        return nameMatch || codeMatch || issuerMatch;
      })
      .sort((a, b) => {
        // Prioritize exact code match
        if (a.code === queryUpper && b.code !== queryUpper) return -1;
        if (b.code === queryUpper && a.code !== queryUpper) return 1;
        // Then by name match
        if (a.name?.toLowerCase().includes(queryLower)) return -1;
        if (b.name?.toLowerCase().includes(queryLower)) return 1;
        // Finally by verified status
        return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
      })
      .slice(0, limit);

    // Convert to TokenMetadata with caching
    const results = matches.map((t) => {
      const metadata: TokenMetadata = {
        code: t.code,
        issuer: t.issuer,
        name: t.name,
        domain: t.domain,
        image: t.image,
        verified: t.verified,
        source: 'stellar-expert',
        lastUpdated: Date.now(),
      };
      cacheToken(metadata);
      return metadata;
    });

    return results;
  } catch (error) {
    console.error('[v0] Error searching tokens:', error);
    return [];
  }
}

/**
 * Get most traded tokens
 */
export async function getMostTradedTokens(limit = 50): Promise<TokenMetadata[]> {
  try {
    const tokens = await fetchStellarExpertTokens(limit);
    
    const results = tokens.map((t) => {
      const metadata: TokenMetadata = {
        code: t.code,
        issuer: t.issuer,
        name: t.name,
        domain: t.domain,
        image: t.image,
        verified: t.verified,
        source: 'stellar-expert',
        lastUpdated: Date.now(),
      };
      cacheToken(metadata);
      return metadata;
    });

    return results;
  } catch (error) {
    console.error('[v0] Error fetching most traded tokens:', error);
    return [];
  }
}

/**
 * Get curated token picks - verified mainnet tokens
 */
export const getTokenPicks = (): TokenMetadata[] => [
  {
    code: 'XLM',
    issuer: '',
    name: 'Stellar Lumens (Native)',
    domain: 'stellar.org',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    name: 'USD Coin (Circle)',
    domain: 'circle.com',
    image: 'https://www.centre.io/images/usdc/usdc-icon-86074d9d49.png',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'EURC',
    issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
    name: 'Euro Coin (Circle)',
    domain: 'circle.com',
    image: 'https://www.circle.com/hubfs/Brand/EURC/EURC-icon.png',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'yXLM',
    issuer: 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55',
    name: 'UltraStellar Yield XLM',
    domain: 'ultrastellar.com',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'AQUA',
    issuer: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    name: 'Aquarius',
    domain: 'aqua.network',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'BTC',
    issuer: 'GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM',
    name: 'Bitcoin (UltraStellar)',
    domain: 'ultrastellar.com',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'ETH',
    issuer: 'GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM',
    name: 'Ethereum (UltraStellar)',
    domain: 'ultrastellar.com',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'SHX',
    issuer: 'GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEZ5PSQM6I2TBP2RSC6BQSSEVV',
    name: 'Stronghold SHX',
    domain: 'stronghold.co',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'RIO',
    issuer: 'GBNLJIYH34UWO5YZFA3A3HD3N76R6DOI33N4JONUOHEEYZYCAYTEJ5AK',
    name: 'Realio Token',
    domain: 'realio.fund',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'ARST',
    issuer: 'GCSAZVWXZKWS4XS223M5F54H2B6XPIBD3CAV7FZHH77DWVSTEPFHXFGY',
    name: 'ARS Token',
    domain: 'anclap.com',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'BRLT',
    issuer: 'GCHQ3F2BF5P74DMDNOOGHT5DUCKC773AW5DTOFINC26W4KGYFPLEJRFJ',
    name: 'BRL Token',
    domain: 'ntokens.com',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'FIDR',
    issuer: 'GBZQNUAGO2KFOSOOICFR36D5NX2TGFWFM5RFVV3Q7UCHC5XPWXNQFID',
    name: 'FidreCoin',
    domain: 'fidre.io',
    verified: true,
    source: 'stellar-expert',
  },
];

/**
 * Clear all cached tokens
 */
export function clearTokenCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('token_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log('[v0] Token cache cleared');
  } catch (error) {
    console.error('[v0] Error clearing token cache:', error);
  }
}
