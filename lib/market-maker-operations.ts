import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Fetches active offers for the bot account with timeout protection
 * Queries Horizon API for existing buy/sell offers to enable order replacement
 */
export async function getActiveOffers(
  horizonServer: StellarSdk.Server,
  publicKey: string,
  timeoutMs: number = 8000
): Promise<StellarSdk.OfferRecord[]> {
  return Promise.race([
    horizonServer.offers().forAccount(publicKey).call(),
    new Promise<StellarSdk.OfferRecord[]>((_, reject) =>
      setTimeout(() => reject(new Error('Offer fetch timeout')), timeoutMs)
    ),
  ]).then((response: any) => response.records || []);
}

/**
 * Loads fresh account data to get current sequence number
 * Critical for avoiding txBadSeq errors in concurrent executions
 */
export async function loadFreshAccount(
  horizonServer: StellarSdk.Server,
  publicKey: string,
  timeoutMs: number = 8000
): Promise<StellarSdk.Account> {
  return Promise.race([
    horizonServer.loadAccount(publicKey),
    new Promise<StellarSdk.Account>((_, reject) =>
      setTimeout(() => reject(new Error('Account load timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Finds existing offer for a trading pair to enable replacement
 * Returns the offerID if found, or '0' to create new offer
 */
export function findExistingOfferID(
  offers: StellarSdk.OfferRecord[],
  buyingAsset: StellarSdk.Asset,
  sellingAsset: StellarSdk.Asset,
  isBuyOrder: boolean
): string {
  for (const offer of offers) {
    const buyingMatches =
      offer.buying.asset_type === 'native'
        ? buyingAsset.isNative()
        : offer.buying.asset_code === buyingAsset.getCode() &&
          offer.buying.asset_issuer === buyingAsset.getIssuer();

    const sellingMatches =
      offer.selling.asset_type === 'native'
        ? sellingAsset.isNative()
        : offer.selling.asset_code === sellingAsset.getCode() &&
          offer.selling.asset_issuer === sellingAsset.getIssuer();

    if (buyingMatches && sellingMatches) {
      return offer.id;
    }
  }
  return '0'; // Create new offer
}

/**
 * Builds a manage offer operation with order replacement support
 * Uses fresh sequence number and existing offerID for updates
 */
export function buildManageOfferOp(
  isBuyOrder: boolean,
  amount: string,
  price: string,
  buyingAsset: StellarSdk.Asset,
  sellingAsset: StellarSdk.Asset,
  offerId: string = '0'
): StellarSdk.Operation {
  if (isBuyOrder) {
    return StellarSdk.Operation.manageBuyOffer({
      selling: sellingAsset,
      buying: buyingAsset,
      buyAmount: amount,
      price,
      offerId,
    });
  } else {
    return StellarSdk.Operation.manageSellOffer({
      selling: sellingAsset,
      buying: buyingAsset,
      amount,
      price,
      offerId,
    });
  }
}

/**
 * Submits transaction with timeout protection to prevent hanging
 * Critical for Vercel's strict function execution limits
 */
export async function submitWithTimeout(
  horizonServer: StellarSdk.Server,
  transaction: StellarSdk.Transaction,
  timeoutMs: number = 8000
): Promise<StellarSdk.Horizon.SubmitTransactionResponse> {
  return Promise.race([
    horizonServer.submitTransaction(transaction),
    new Promise<StellarSdk.Horizon.SubmitTransactionResponse>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction submission timeout')), timeoutMs)
    ),
  ]);
}
