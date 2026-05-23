'use client';

/**
 * Direct Horizon API implementation for Stellar network queries
 * Avoids SDK overhead and provides reliable, fast access to mainnet data
 */

const HORIZON_URL = 'https://public-horizon.stellar.org';

/**
 * Fetch with retry logic and timeout
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 2,
  timeout: number = 10000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[v0] Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retries failed');
}

/**
 * Search for assets by code using Horizon API
 */
export async function searchAssetsByCode(
  assetCode: string,
  issuer?: string,
  limit: number = 50
): Promise<any[]> {
  try {
    if (!assetCode || assetCode.length < 1) {
      throw new Error('Asset code required');
    }

    const params = new URLSearchParams({ limit: String(limit) });
    params.append('asset_code', assetCode.toUpperCase());

    if (issuer) {
      params.append('asset_issuer', issuer);
    }

    const url = `${HORIZON_URL}/assets?${params}`;
    console.log('[v0] Searching assets:', { assetCode, url });

    const response = await fetchWithRetry(url, 2, 8000);

    if (!response.ok) {
      console.warn(`[v0] Asset search returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[v0] Found ${data.records?.length || 0} assets`);

    return data.records || [];
  } catch (error) {
    console.error('[v0] Error searching assets:', error);
    return [];
  }
}

/**
 * Get most used/traded assets
 */
export async function getMostUsedAssets(limit: number = 50): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      order: 'desc',
    });

    const url = `${HORIZON_URL}/assets?${params}`;
    console.log('[v0] Fetching most used assets');

    const response = await fetchWithRetry(url, 2, 8000);

    if (!response.ok) {
      console.warn(`[v0] Most used assets returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[v0] Found ${data.records?.length || 0} most used assets`);

    return data.records || [];
  } catch (error) {
    console.error('[v0] Error fetching most used assets:', error);
    return [];
  }
}

/**
 * Get order book for a trading pair
 */
export async function getOrderBook(
  sellingAssetCode: string,
  sellingAssetIssuer: string,
  buyingAssetCode: string,
  buyingAssetIssuer: string,
  limit: number = 50
): Promise<{ bids: any[]; asks: any[] }> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });

    // Selling asset parameters
    if (sellingAssetCode === 'XLM') {
      params.append('selling_asset_type', 'native');
    } else {
      params.append('selling_asset_type', 'credit_alphanum12');
      params.append('selling_asset_code', sellingAssetCode);
      if (sellingAssetIssuer) {
        params.append('selling_asset_issuer', sellingAssetIssuer);
      }
    }

    // Buying asset parameters
    if (buyingAssetCode === 'XLM') {
      params.append('buying_asset_type', 'native');
    } else {
      params.append('buying_asset_type', 'credit_alphanum12');
      params.append('buying_asset_code', buyingAssetCode);
      if (buyingAssetIssuer) {
        params.append('buying_asset_issuer', buyingAssetIssuer);
      }
    }

    const url = `${HORIZON_URL}/order_book?${params}`;
    console.log('[v0] Fetching order book:', { sellingAssetCode, buyingAssetCode, url });

    const response = await fetchWithRetry(url, 2, 8000);

    if (!response.ok) {
      console.warn(`[v0] Order book returned ${response.status}`);
      return { bids: [], asks: [] };
    }

    const data = await response.json();
    console.log('[v0] Order book fetched:', {
      bids: data.bids?.length || 0,
      asks: data.asks?.length || 0,
    });

    return {
      bids: (data.bids || []).map((bid: any) => ({
        price: bid.price,
        amount: bid.amount,
      })),
      asks: (data.asks || []).map((ask: any) => ({
        price: ask.price,
        amount: ask.amount,
      })),
    };
  } catch (error) {
    console.error('[v0] Error fetching order book:', error);
    return { bids: [], asks: [] };
  }
}

/**
 * Get asset details
 */
export async function getAssetDetails(code: string, issuer: string): Promise<any | null> {
  try {
    const params = new URLSearchParams();
    params.append('asset_code', code);
    if (issuer) {
      params.append('asset_issuer', issuer);
    }
    params.append('limit', '1');

    const url = `${HORIZON_URL}/assets?${params}`;
    const response = await fetchWithRetry(url, 2, 8000);

    if (!response.ok) return null;

    const data = await response.json();
    return data.records?.[0] || null;
  } catch (error) {
    console.error('[v0] Error fetching asset details:', error);
    return null;
  }
}

/**
 * In-memory cache implementation
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttl: number = 300000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

export function clearCache(): void {
  cache.clear();
}
