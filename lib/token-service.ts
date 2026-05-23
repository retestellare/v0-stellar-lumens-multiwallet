/**
 * Token Data Service
 * Fetches and caches comprehensive token metadata from Stellar Expert and CoinGecko
 */

import { TokenMetadata, StellarExpertToken, CoinGeckoToken } from '@/types/token';

const STELLAR_EXPERT_API = 'https://api.stellar.expert/v2/mainnet/assets';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
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
    const response = await fetch(`${STELLAR_EXPERT_API}?sort=trades_7d&order=desc&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Stellar Expert API error: ${response.status}`);
    }
    const data = await response.json();
    return data._embedded?.records || [];
  } catch (error) {
    console.error('[v0] Error fetching Stellar Expert tokens:', error);
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
 * Get curated token picks
 */
export const getTokenPicks = (): TokenMetadata[] => [
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4MY5KU4ERRJLKZLCC5HR52IRXLWDGQDA',
    name: 'USD Coin',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'EURC',
    issuer: 'CHANGETRUSTLINEKEY',
    name: 'Euro Coin',
    verified: true,
    source: 'stellar-expert',
  },
  {
    code: 'SRT',
    issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQSTBE2EURIDVXL6B',
    name: 'Stellar Rewards Token',
    verified: false,
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
