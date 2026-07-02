/**
 * LOBSTR-style direct Horizon fetch for swap path finding.
 * Bypasses all SDK constructors — pure native fetch against Horizon REST API.
 * 
 * Correct strict-send URL format:
 *   /paths/strict-send
 *     ?source_asset_type=native|credit_alphanum4|credit_alphanum12
 *     &source_asset_code=CODE          (omit for native)
 *     &source_asset_issuer=GXXX        (omit for native)
 *     &source_amount=10.0000000        (amount being sent — 7 decimals)
 *     &destination_assets=CODE:ISSUER  (or "native" for XLM)
 */

const HORIZON_URL = 'https://horizon.stellar.org';

export interface LobstrPath {
  destinationAmount: string;
  path: Array<{ code: string; issuer?: string }>;
  priceImpact: number;
}

/** Returns the asset_type string Horizon expects */
function assetType(code: string): string {
  if (code === 'XLM') return 'native';
  return code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
}

/**
 * Build the destination_assets query value.
 * XLM  → "native"
 * other → "CODE:ISSUER"
 */
function destinationAssetParam(code: string, issuer?: string): string {
  if (code === 'XLM') return 'native';
  return `${code}:${issuer}`;
}

/** Parse a Horizon path asset record into our internal shape */
function parsePathAsset(item: any): { code: string; issuer?: string } {
  if (item.asset_type === 'native') return { code: 'XLM' };
  return { code: item.asset_code, issuer: item.asset_issuer };
}

/**
 * Find the best swap path using a direct fetch to Horizon /paths/strict-send.
 * This is the LOBSTR approach: no SDK Server, no constructors, no bundler issues.
 *
 * @param sourceCode    "XLM" or asset code
 * @param sourceIssuer  undefined for XLM
 * @param destCode      "XLM" or asset code
 * @param destIssuer    undefined for XLM
 * @param sendAmount    amount to send, already formatted to 7 dp
 */
export async function findLobstrSwapPath(
  sourceCode: string,
  sourceIssuer: string | undefined,
  destCode: string,
  destIssuer: string | undefined,
  sendAmount: string
): Promise<LobstrPath | null> {
  // Ensure exactly 7 decimal places
  const amount = parseFloat(sendAmount).toFixed(7);

  // ── Build strict-send URL ──────────────────────────────────────────────────
  const params = new URLSearchParams();

  // Source asset
  const srcType = assetType(sourceCode);
  params.set('source_asset_type', srcType);
  if (srcType !== 'native') {
    params.set('source_asset_code', sourceCode);
    params.set('source_asset_issuer', sourceIssuer!);
  }

  // The amount we are sending (strict-send param)
  params.set('source_amount', amount);

  // Destination asset — passed as a single "CODE:ISSUER" or "native" value
  params.set('destination_assets', destinationAssetParam(destCode, destIssuer));

  const url = `${HORIZON_URL}/paths/strict-send?${params.toString()}`;
  console.log('[lobstr-swap] strict-send URL:', url);

  const response = await fetch(url);
  if (!response.ok) {
    console.error('[lobstr-swap] Horizon error:', response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const records: any[] = data._embedded?.records ?? [];
  console.log('[lobstr-swap] strict-send records:', records.length);

  if (records.length > 0) {
    return buildResult(records[0], amount);
  }

  // ── Fallback: strict-receive ───────────────────────────────────────────────
  console.warn('[lobstr-swap] strict-send returned 0 records — trying strict-receive fallback');
  return fallbackStrictReceive(sourceCode, sourceIssuer, destCode, destIssuer, amount);
}

/** Build our LobstrPath from a Horizon path record */
function buildResult(record: any, sendAmount: string): LobstrPath {
  // destination_amount is taken verbatim from Horizon — no multiplication or division applied
  const destAmount: string = record.destination_amount;

  const path: Array<{ code: string; issuer?: string }> =
    (record.path ?? []).map(parsePathAsset);

  // Price impact: percentage difference between the best available path and the
  // direct spot rate returned by Horizon in source_amount vs destination_amount.
  // Horizon's strict-send already gives the optimal route, so impact is the
  // deviation from a zero-fee direct exchange at the same rate.
  // We compare source_amount (what we send) vs destination_amount (what we get)
  // relative to the quoted rate itself — not relative to a 1:1 baseline.
  // For cross-asset pairs (e.g. XLM/USDC) the rate is never near 1:1, so
  // comparing to 1:1 produces nonsense numbers like 51000%.
  // Instead, we simply report the fee cost as a fraction of the output:
  // impact ≈ 0 when there is no DEX spread, up to a few percent with spread.
  const sentFloat = parseFloat(sendAmount);
  const gotFloat  = parseFloat(destAmount);
  // Use the implied mid-rate from the record's own source/dest amounts
  const impliedRate = gotFloat / sentFloat;
  // Horizon includes fee & spread in the quote; impact is how much the user
  // loses to routing overhead vs a hypothetical zero-spread direct trade.
  // We approximate it as: (spread) = fee_bps / 10000, typically ~0.3%
  // Since we don't have a reference orderbook price here, we report the
  // proportional routing overhead by checking if path has hops (each hop
  // adds ~0.3% AMM fee). Direct path = 0 hops ≈ 0.3% base DEX fee.
  const hopCount = Math.max(path.length, 0);
  const estimatedImpact = (hopCount + 1) * 0.3; // ~0.3% per hop including base

  console.log('[lobstr-swap] quote:', {
    sendAmount,
    destAmount,
    impliedRate: impliedRate.toFixed(7),
    intermediateHops: path.length,
    estimatedImpact: estimatedImpact.toFixed(2) + '%',
  });

  return {
    destinationAmount: destAmount,   // printed verbatim into receive field
    path,
    priceImpact: parseFloat(estimatedImpact.toFixed(2)),
  };
}

/** Strict-receive fallback: we ask "how much source do I need to get destAmount?" */
async function fallbackStrictReceive(
  sourceCode: string,
  sourceIssuer: string | undefined,
  destCode: string,
  destIssuer: string | undefined,
  sendAmount: string
): Promise<LobstrPath | null> {
  const params = new URLSearchParams();

  // Destination asset
  const dstType = assetType(destCode);
  params.set('destination_asset_type', dstType);
  if (dstType !== 'native') {
    params.set('destination_asset_code', destCode);
    params.set('destination_asset_issuer', destIssuer!);
  }

  // Ask for the same amount as destination
  params.set('destination_amount', sendAmount);

  // Source assets
  params.set('source_assets', destinationAssetParam(sourceCode, sourceIssuer));

  const url = `${HORIZON_URL}/paths/strict-receive?${params.toString()}`;
  console.log('[lobstr-swap] strict-receive fallback URL:', url);

  const response = await fetch(url);
  if (!response.ok) {
    console.error('[lobstr-swap] strict-receive error:', response.status);
    return null;
  }

  const data = await response.json();
  const records: any[] = data._embedded?.records ?? [];
  console.log('[lobstr-swap] strict-receive records:', records.length);

  if (records.length === 0) return null;

  // For strict-receive the source_amount is what we'd spend; re-use buildResult
  return buildResult(records[0], records[0].source_amount ?? sendAmount);
}

/**
 * LOBSTR slippage protection.
 * Multiply the quoted destination amount by (1 - slippage%) and format to 7 dp.
 * This becomes destMin in pathPaymentStrictSend.
 */
export function calculateLobstrSlippageAmount(
  destinationAmount: string,
  slippagePercent: number = 1
): string {
  const multiplier = 1 - slippagePercent / 100;
  return (parseFloat(destinationAmount) * multiplier).toFixed(7);
}
