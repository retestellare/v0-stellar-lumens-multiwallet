import { NextRequest, NextResponse } from 'next/server';
import { Server, Asset } from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon.stellar.org';

/**
 * POST /api/stellar/swap-path
 * Server-side path finding using Stellar SDK strictSendPaths (v15+)
 * 
 * Accepts and returns amounts as strings with exactly 7 decimal places
 * 
 * Body:
 * {
 *   sourceCode: string,
 *   sourceIssuer?: string,
 *   destCode: string,
 *   destIssuer?: string,
 *   sendAmount: string (format: "10.0000000")
 * }
 */
export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    let { sourceCode, sourceIssuer, destCode, destIssuer, sendAmount } = body;

    // Validate inputs
    if (!sourceCode || !destCode || !sendAmount) {
      return NextResponse.json(
        { error: 'Missing required parameters: sourceCode, destCode, sendAmount' },
        { status: 400 }
      );
    }

    // Ensure sendAmount is formatted as string with exactly 7 decimal places (Stellar requirement)
    const formattedSendAmount = parseFloat(sendAmount).toFixed(7);

    console.log('[v0-api] Path finding request:', {
      sourceCode,
      sourceIssuer,
      destCode,
      destIssuer,
      sendAmount: formattedSendAmount,
    });

    const server = new Server(HORIZON_URL);

    // Create proper SDK Asset instances for source
    const sourceAsset = sourceCode === 'XLM' 
      ? Asset.native() 
      : new Asset(sourceCode, sourceIssuer);

    // Create proper SDK Asset instances for destination
    const destAsset = destCode === 'XLM' 
      ? Asset.native() 
      : new Asset(destCode, destIssuer);

    console.log('[v0-api] Source Asset:', {
      code: sourceAsset.code,
      issuer: sourceAsset.issuer,
      isNative: sourceAsset.isNative(),
    });

    console.log('[v0-api] Destination Asset:', {
      code: destAsset.code,
      issuer: destAsset.issuer,
      isNative: destAsset.isNative(),
    });

    // Destination assets MUST be passed as an array to strictSendPaths
    const destinationAssets = [destAsset];

    console.log('[v0-api] Calling server.strictSendPaths():', {
      source: sourceAsset.code + (sourceAsset.issuer ? `:${sourceAsset.issuer}` : ''),
      destinations: destinationAssets.map(a => a.code + (a.issuer ? `:${a.issuer}` : '')),
      amount: formattedSendAmount,
    });

    // Query using strictSendPaths: we specify the source amount, Horizon finds destination amount
    let pathsResponse = await server.strictSendPaths(sourceAsset, formattedSendAmount, destinationAssets).call();
    let paths = pathsResponse.records || [];

    console.log(`[v0-api] strictSendPaths returned ${paths.length} path(s)`);

    // Fallback: if strictSendPaths returns no paths, try strictReceivePaths
    if (paths.length === 0) {
      console.warn('[v0-api] strictSendPaths returned no results. Trying strictReceivePaths fallback...');
      
      // For strict receive, estimate destination amount using send amount (formatted)
      const estimatedDestAmount = formattedSendAmount;

      console.log('[v0-api] Calling server.strictReceivePaths() with estimated destination:', estimatedDestAmount);

      try {
        pathsResponse = await server.strictReceivePaths(destinationAssets, estimatedDestAmount, [sourceAsset]).call();
        paths = pathsResponse.records || [];
        console.log(`[v0-api] strictReceivePaths returned ${paths.length} path(s)`);
      } catch (receivePathError: any) {
        console.error('[v0-api] strictReceivePaths error:', receivePathError.message);
      }
    }

    // If still no paths found, return debugging info
    if (paths.length === 0) {
      console.error('[v0-api] No swap paths found from either method');
      console.error('[v0-api] Debugging Assets:', {
        source: {
          code: sourceAsset.code,
          issuer: sourceAsset.issuer,
          isNative: sourceAsset.isNative(),
        },
        destination: {
          code: destAsset.code,
          issuer: destAsset.issuer,
          isNative: destAsset.isNative(),
        },
      });
      return NextResponse.json({ error: 'No swap paths found', paths: [] });
    }

    // Get the best path (first is optimal)
    const bestPath = paths[0];

    console.log('[v0-api] Best path selected:', {
      destination_amount: bestPath.destination_amount,
      path_length: bestPath.path?.length || 0,
    });

    // Extract path sequence from Horizon response
    const pathSequence: Array<{ code: string; issuer?: string }> = [];
    
    if (bestPath.path && Array.isArray(bestPath.path)) {
      for (const pathAsset of bestPath.path) {
        if (pathAsset.asset_type === 'native') {
          pathSequence.push({
            code: 'XLM',
            issuer: undefined,
          });
          console.log('[v0-api] Path hop: XLM (native)');
        } else {
          const assetCode = pathAsset.asset_code || 'UNKNOWN';
          const assetIssuer = pathAsset.asset_issuer;
          pathSequence.push({
            code: assetCode,
            issuer: assetIssuer,
          });
          console.log(`[v0-api] Path hop: ${assetCode}:${assetIssuer}`);
        }
      }
    }

    // Ensure destination amount is formatted with exactly 7 decimal places
    const formattedDestAmount = parseFloat(bestPath.destination_amount).toFixed(7);

    // Calculate price impact
    const actualRate = parseFloat(formattedDestAmount) / parseFloat(formattedSendAmount);
    const priceImpact = Math.abs(((actualRate - 1) / 1) * 100);

    console.log('[v0-api] Swap path details:', {
      source: sourceCode + (sourceIssuer ? `:${sourceIssuer}` : ''),
      destination: destCode + (destIssuer ? `:${destIssuer}` : ''),
      sendAmount: formattedSendAmount,
      destinationAmount: formattedDestAmount,
      exchangeRate: actualRate.toFixed(7),
      priceImpact: priceImpact.toFixed(2),
      intermediateHops: pathSequence.length,
    });

    return NextResponse.json({
      path: pathSequence,
      destinationAmount: formattedDestAmount,
      priceImpact: parseFloat(priceImpact.toFixed(2)),
    });
  } catch (error: any) {
    console.error('[v0-api] Swap path error:', {
      message: error.message,
      stack: error.stack,
    });

    // Log Stellar-specific errors if available
    if (error.response?.data?.extras?.result_codes) {
      console.error('[v0-api] Stellar result codes:', error.response.data.extras.result_codes);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to find swap path' },
      { status: 500 }
    );
  }
}
