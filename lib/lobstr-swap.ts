/**
 * LOBSTR-style direct Horizon fetch for swap path finding
 * Bypasses SDK constructors, queries AMM pools and DEX directly
 * No Turbopack bundling issues, high-performance real-time quotes
 */

const HORIZON_URL = 'https://horizon.stellar.org';

export interface LobstrPath {
  destinationAmount: string;
  path: Array<{ code: string; issuer?: string }>;
  priceImpact: number;
}

/**
 * Format asset identifier for URL query params
 * XLM (native) = "native"
 * Credit assets = "code:issuer"
 */
function formatAssetParam(code: string, issuer?: string): string {
  if (code === 'XLM' || !issuer) {
    return 'native';
  }
  return `${code}:${issuer}`;
}

/**
 * Parse asset identifier from URL format
 * "native" -> { code: 'XLM', issuer: undefined }
 * "CODE:ISSUER" -> { code: 'CODE', issuer: 'ISSUER' }
 */
function parseAssetParam(param: string): { code: string; issuer?: string } {
  if (param === 'native') {
    return { code: 'XLM', issuer: undefined };
  }
  const [code, issuer] = param.split(':');
  return { code, issuer };
}

/**
 * Find best swap path using direct Horizon fetch
 * LOBSTR approach: query strictSendPaths endpoint with native fetch
 * 
 * @param sourceCode - Code of asset being sent
 * @param sourceIssuer - Issuer of asset being sent (undefined for XLM)
 * @param destCode - Code of asset being received
 * @param destIssuer - Issuer of asset being received (undefined for XLM)
 * @param sendAmount - Amount to send (formatted to 7 decimals)
 * @returns Path with destination amount and route
 */
export async function findLobstrSwapPath(
  sourceCode: string,
  sourceIssuer: string | undefined,
  destCode: string,
  destIssuer: string | undefined,
  sendAmount: string
): Promise<LobstrPath | null> {
  try {
    // Format amounts to exactly 7 decimal places (Stellar requirement)
    const formattedAmount = parseFloat(sendAmount).toFixed(7);

    // Build destination assets parameter
    const destAsset = formatAssetParam(destCode, destIssuer);

    // Build Horizon strictSendPaths URL with proper query parameters
    const params = new URLSearchParams();
    params.append('source_asset_type', sourceCode === 'XLM' ? 'native' : 'credit_alphanum4');
    
    if (sourceCode !== 'XLM') {
      params.append('source_asset_code', sourceCode);
      if (sourceIssuer) params.append('source_asset_issuer', sourceIssuer);
    }
    
    // Destination asset
    params.append('destination_asset_type', destCode === 'XLM' ? 'native' : 'credit_alphanum4');
    if (destCode !== 'XLM') {
      params.append('destination_asset_code', destCode);
      if (destIssuer) params.append('destination_asset_issuer', destIssuer);
    }
    
    // Amount - for strictSendPaths, destination_amount is what we control
    params.append('destination_amount', formattedAmount);

    const url = `${HORIZON_URL}/paths/strict-send?${params.toString()}`;

    console.log('[v0-lobstr] Fetching strict-send paths from Horizon:', url);

    const response = await fetch(url);
    if (!response.ok) {
      console.error('[v0-lobstr] Horizon response error:', response.status);
      return null;
    }

    const data = await response.json();
    const records = data._embedded?.records || [];

    if (records.length === 0) {
      console.warn('[v0-lobstr] No paths found from strict-send, trying fallback...');
      
      // Fallback: try strict-receive with estimated destination
      return await findLobstrSwapPathFallback(
        sourceCode,
        sourceIssuer,
        destCode,
        destIssuer,
        formattedAmount
      );
    }

    // Get the first (best) path from Horizon
    const bestRecord = records[0];

    console.log('[v0-lobstr] Best path record:', {
      destination_amount: bestRecord.destination_amount,
      path_length: bestRecord.path?.length || 0,
    });

    // Extract path assets
    const pathAssets: Array<{ code: string; issuer?: string }> = [];
    if (bestRecord.path && Array.isArray(bestRecord.path)) {
      for (const pathItem of bestRecord.path) {
        const assetParam = pathItem.asset_type === 'native' 
          ? 'native' 
          : `${pathItem.asset_code}:${pathItem.asset_issuer}`;
        
        const parsed = parseAssetParam(assetParam);
        pathAssets.push(parsed);
      }
    }

    // Calculate price impact (simplified)
    const actualRate = parseFloat(bestRecord.destination_amount) / parseFloat(formattedAmount);
    const directRate = 1;
    const priceImpact = Math.abs(((actualRate - directRate) / directRate) * 100);

    console.log('[v0-lobstr] Swap quote:', {
      source: `${sourceCode}${sourceIssuer ? `:${sourceIssuer}` : ''}`,
      destination: `${destCode}${destIssuer ? `:${destIssuer}` : ''}`,
      sendAmount: formattedAmount,
      receiveAmount: bestRecord.destination_amount,
      priceImpact: priceImpact.toFixed(2) + '%',
      intermediateHops: pathAssets.length,
    });

    return {
      destinationAmount: bestRecord.destination_amount,
      path: pathAssets,
      priceImpact: parseFloat(priceImpact.toFixed(2)),
    };
  } catch (error) {
    console.error('[v0-lobstr] Path finding error:', error);
    return null;
  }
}

/**
 * Fallback path finding using strict-receive
 */
async function findLobstrSwapPathFallback(
  sourceCode: string,
  sourceIssuer: string | undefined,
  destCode: string,
  destIssuer: string | undefined,
  sendAmount: string
): Promise<LobstrPath | null> {
  try {
    // For strict-receive, we estimate the destination amount
    const estimatedDestAmount = sendAmount;

    const params = new URLSearchParams();
    
    // Source asset
    params.append('source_asset_type', sourceCode === 'XLM' ? 'native' : 'credit_alphanum4');
    if (sourceCode !== 'XLM') {
      params.append('source_asset_code', sourceCode);
      if (sourceIssuer) params.append('source_asset_issuer', sourceIssuer);
    }
    
    // Destination asset
    params.append('destination_asset_type', destCode === 'XLM' ? 'native' : 'credit_alphanum4');
    if (destCode !== 'XLM') {
      params.append('destination_asset_code', destCode);
      if (destIssuer) params.append('destination_asset_issuer', destIssuer);
    }
    
    // For strict-receive, source_amount is what we control
    params.append('source_amount', estimatedDestAmount);

    const url = `${HORIZON_URL}/paths/strict-receive?${params.toString()}`;

    console.log('[v0-lobstr] Trying strict-receive fallback:', url);

    const response = await fetch(url);
    if (!response.ok) {
      console.error('[v0-lobstr] Strict-receive fallback failed:', response.status);
      return null;
    }

    const data = await response.json();
    const records = data._embedded?.records || [];

    if (records.length === 0) {
      console.warn('[v0-lobstr] No paths found from either method');
      return null;
    }

    const bestRecord = records[0];

    // Extract path assets
    const pathAssets: Array<{ code: string; issuer?: string }> = [];
    if (bestRecord.path && Array.isArray(bestRecord.path)) {
      for (const pathItem of bestRecord.path) {
        const assetParam = pathItem.asset_type === 'native' 
          ? 'native' 
          : `${pathItem.asset_code}:${pathItem.asset_issuer}`;
        
        const parsed = parseAssetParam(assetParam);
        pathAssets.push(parsed);
      }
    }

    const actualRate = parseFloat(bestRecord.destination_amount) / parseFloat(bestRecord.source_amount);
    const directRate = 1;
    const priceImpact = Math.abs(((actualRate - directRate) / directRate) * 100);

    return {
      destinationAmount: bestRecord.destination_amount,
      path: pathAssets,
      priceImpact: parseFloat(priceImpact.toFixed(2)),
    };
  } catch (error) {
    console.error('[v0-lobstr] Fallback path finding error:', error);
    return null;
  }
}

/**
 * LOBSTR-style slippage protection
 * Apply 1% slippage buffer by multiplying by 0.99
 * Format to exactly 7 decimal places for Stellar
 */
export function calculateLobstrSlippageAmount(
  destinationAmount: string,
  slippagePercent: number = 1
): string {
  const slippageMultiplier = 1 - (slippagePercent / 100);
  const slippageAmount = parseFloat(destinationAmount) * slippageMultiplier;
  return slippageAmount.toFixed(7);
}
