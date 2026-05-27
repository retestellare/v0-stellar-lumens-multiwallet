import { Keypair, Networks, TransactionBuilder, BASE_FEE, Asset, Operation, Account, Memo, Horizon } from '@stellar/stellar-sdk';
import nacl from 'tweetnacl';

export const HORIZON_URL = 'https://horizon.stellar.org';
export const NETWORK_PASSPHRASE = Networks.PUBLIC;

/**
 * Determine asset type based on code length
 * native = XLM
 * credit_alphanum4 = 1-4 character codes
 * credit_alphanum12 = 5-12 character codes
 */
function getAssetType(code: string): string {
  if (code === 'XLM' || code === 'native') return 'native';
  return code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
}

// Simple uint8 to string conversion
const uint8ToString = (arr: Uint8Array): string => {
  return String.fromCharCode.apply(null, Array.from(arr));
};

const stringToUint8 = (str: string): Uint8Array => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
};

// Encryption utilities for local key storage
export const encryptSecret = (secret: string, password: string): string => {
  const salt = nacl.randomBytes(16);
  const key = new Uint8Array(32);
  
  // Simple key derivation (in production, use proper PBKDF2)
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  for (let i = 0; i < 32; i++) {
    key[i] = (passwordBytes[i % passwordBytes.length] ^ salt[i]) ^ (i * 7);
  }
  
  const nonce = nacl.randomBytes(24);
  const box = nacl.secretbox(stringToUint8(secret), nonce, key);
  
  // Combine salt, nonce, and ciphertext
  const combined = new Uint8Array(salt.length + nonce.length + box.length);
  combined.set(salt);
  combined.set(nonce, salt.length);
  combined.set(box, salt.length + nonce.length);
  
  return btoa(uint8ToString(combined));
};

export const decryptSecret = (encrypted: string, password: string): string => {
  try {
    const combined = stringToUint8(atob(encrypted));
    const salt = combined.slice(0, 16);
    const nonce = combined.slice(16, 40);
    const box = combined.slice(40);
    
    const key = new Uint8Array(32);
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    for (let i = 0; i < 32; i++) {
      key[i] = (passwordBytes[i % passwordBytes.length] ^ salt[i]) ^ (i * 7);
    }
    
    const decrypted = nacl.secretbox.open(box, nonce, key);
    if (!decrypted) throw new Error('Decryption failed');
    
    return uint8ToString(decrypted);
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
};

// Wallet generation and management
export const generateKeyPair = (): { publicKey: string; secret: string } => {
  const pair = Keypair.random();
  return {
    publicKey: pair.publicKey(),
    secret: pair.secret(),
  };
};

export const getPublicKeyFromSecret = (secret: string): string => {
  const pair = Keypair.fromSecret(secret);
  return pair.publicKey();
};

// Transaction building
export const buildSendTransaction = async (
  sourceSecret: string,
  destination: string,
  amount: string,
  asset: Asset,
  memo?: string
): Promise<string> => {
  const sourceKeypair = Keypair.fromSecret(sourceSecret);
  const account = await getAccountDetails(sourceKeypair.publicKey());
  
  let transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (memo) {
    transaction = transaction.addMemo({
      id: memo,
    } as any);
  }

  transaction = transaction
    .addOperation(
      Operation.payment({
        destination,
        asset,
        amount,
      })
    )
    .setTimeout(30);

  return transaction.build().toEnvelope().toXDR();
};

// Fetch account details
export const getAccountDetails = async (publicKey: string) => {
  const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  if (!response.ok) {
    throw new Error('Account not found');
  }
  return response.json();
};

// Fetch account balances (raw, may include LP shares)
export const getAccountBalances = async (publicKey: string) => {
  try {
    const account = await getAccountDetails(publicKey);
    return account.balances || [];
  } catch {
    return [];
  }
};

// Fetch account balances, deduplicated (excludes LP shares)
export const getAccountBalancesClean = async (publicKey: string) => {
  try {
    const account = await getAccountDetails(publicKey);
    const balances = account.balances || [];
    // Inline deduplication to avoid forward reference
    const seen = new Set<string>();
    return balances.filter((b: any) => {
      if (b.asset_type === 'liquidity_pool_shares') return false;
      const key = `${b.asset_code || 'XLM'}_${b.asset_issuer || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
};

// Fetch transactions
export const getAccountTransactions = async (publicKey: string, limit = 10) => {
  try {
    const response = await fetch(
      `${HORIZON_URL}/accounts/${publicKey}/transactions?limit=${limit}&order=desc`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data._embedded?.records || data.records || [];
  } catch {
    return [];
  }
};

/**
 * Get account payment operations (sent/received)
 */
export const getAccountPayments = async (publicKey: string, limit = 50) => {
  try {
    const response = await fetch(
      `${HORIZON_URL}/accounts/${publicKey}/payments?limit=${limit}&order=desc`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data._embedded?.records || data.records || [];
  } catch {
    return [];
  }
};

// Fetch order book for trading pair
export const getOrderBook = async (
  sellingAssetCode: string,
  sellingAssetIssuer: string,
  buyingAssetCode: string,
  buyingAssetIssuer: string
) => {
  try {
    const params = new URLSearchParams();
    
    // Determine selling asset type based on code length
    const sellingType = getAssetType(sellingAssetCode);
    if (sellingType === 'native') {
      params.append('selling_asset_type', 'native');
    } else {
      params.append('selling_asset_type', sellingType);
      params.append('selling_asset_code', sellingAssetCode);
      if (sellingAssetIssuer) {
        params.append('selling_asset_issuer', sellingAssetIssuer);
      }
    }
    
    // Determine buying asset type based on code length
    const buyingType = getAssetType(buyingAssetCode);
    if (buyingType === 'native') {
      params.append('buying_asset_type', 'native');
    } else {
      params.append('buying_asset_type', buyingType);
      params.append('buying_asset_code', buyingAssetCode);
      if (buyingAssetIssuer) {
        params.append('buying_asset_issuer', buyingAssetIssuer);
      }
    }
    
    const url = `${HORIZON_URL}/order_book?${params}`;
    console.log('[v0] Fetching order book from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[v0] Order book API error:', response.status, errorData);
      return { bids: [], asks: [] };
    }
    
    const data = await response.json();
    console.log('[v0] Order book fetched:', { bids: data.bids?.length || 0, asks: data.asks?.length || 0 });
    return data;
  } catch (error) {
    console.error('[v0] Error fetching order book:', error);
    return { bids: [], asks: [] };
  }
};

// Search assets
export const searchAssets = async (code?: string, issuer?: string, limit = 10) => {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (code) params.append('asset_code', code);
    if (issuer) params.append('asset_issuer', issuer);
    
    const response = await fetch(`${HORIZON_URL}/assets?${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.records || [];
  } catch {
    return [];
  }
};

// Common token metadata cache for fast lookups
const KNOWN_TOKENS: Record<string, { domain: string; image: string; name: string }> = {
  'XLM_': { domain: 'stellar.org', image: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png', name: 'Stellar Lumens' },
  'USDC_GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN': { domain: 'circle.com', image: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png', name: 'USD Coin' },
  'EURC_GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2': { domain: 'circle.com', image: 'https://assets.coingecko.com/coins/images/26045/small/euro-coin.png', name: 'Euro Coin' },
  'yXLM_GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55': { domain: 'ultrastellar.com', image: 'https://ultrastellar.com/static/images/icons/yXLM.png', name: 'Yield XLM' },
  'AQUA_GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA': { domain: 'aqua.network', image: 'https://aqua.network/assets/img/aqua-logo.png', name: 'Aquarius' },
  'BTC_GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM': { domain: 'ultrastellar.com', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', name: 'Bitcoin' },
  'ETH_GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM': { domain: 'ultrastellar.com', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', name: 'Ethereum' },
  };

// Token icon cache interface
interface TokenIconCache {
  url: string;
  expiresAt: number;
}

// Default fallback icon - gradient circle placeholder
const FALLBACK_ICON = '/placeholder-token.svg';

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get token icon URL with 24-hour localStorage caching
 * Checks: 1) Known tokens, 2) Lobstr API, 3) stellar.toml
 */
export const getIssuerTokenIcon = async (code: string, issuer: string): Promise<string> => {
  // Handle XLM native asset
  if (!issuer || code === 'XLM' || code === 'native') {
    return KNOWN_TOKENS['XLM_'].image;
  }

  // Check known tokens first (no caching needed)
  const knownKey = `${code}_${issuer}`;
  if (KNOWN_TOKENS[knownKey]) {
    return KNOWN_TOKENS[knownKey].image;
  }

  // Generate cache key
  const cacheKey = `token_icon_${code}_${issuer}`;

  // Check localStorage cache (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cacheData: TokenIconCache = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() < cacheData.expiresAt) {
          return cacheData.url;
        }
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // Helper to save to cache
  const saveToCache = (url: string) => {
    if (typeof window !== 'undefined') {
      try {
        const cacheData: TokenIconCache = {
          url,
          expiresAt: Date.now() + CACHE_DURATION_MS,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch {
        // Ignore localStorage errors (quota exceeded, etc.)
      }
    }
    return url;
  };

  // Try Lobstr API first (faster, more reliable)
  const lobstrUrl = `https://lobstr.co/api/v1/sep/assets/${code}-${issuer}/image.png`;
  try {
    const response = await fetch(lobstrUrl, { method: 'HEAD' });
    if (response.ok) {
      return saveToCache(lobstrUrl);
    }
  } catch {
    // Lobstr failed, continue to stellar.toml
  }

  // Try stellar.toml via issuer's home_domain
  try {
    // Get issuer account to find home_domain
    const accountResponse = await fetch(`${HORIZON_URL}/accounts/${issuer}`);
    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      const homeDomain = accountData.home_domain;
      
      if (homeDomain) {
        // Fetch stellar.toml
        const tomlUrl = `https://${homeDomain}/.well-known/stellar.toml`;
        const tomlResponse = await fetch(tomlUrl);
        
        if (tomlResponse.ok) {
          const tomlText = await tomlResponse.text();
          
          // Find currency block matching this issuer
          const currenciesMatch = tomlText.match(/\[\[CURRENCIES\]\]([\s\S]*?)(?=\[\[|$)/gi);
          if (currenciesMatch) {
            for (const currencyBlock of currenciesMatch) {
              if (currencyBlock.includes(issuer)) {
                const imageMatch = currencyBlock.match(/image\s*=\s*"([^"]+)"/i);
                if (imageMatch && imageMatch[1]) {
                  return saveToCache(imageMatch[1]);
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // stellar.toml failed
  }

  // Return fallback (don't cache fallback to allow retry)
  return FALLBACK_ICON;
};

/**
 * Fetch token metadata from stellar.toml file
 * Returns domain, image, and name if available
 */
export const fetchTokenMetadataFromToml = async (
  issuer: string
): Promise<{ 
  domain?: string; 
  image?: string; 
  name?: string; 
  desc?: string;
  orgName?: string;
  orgUrl?: string;
  orgEmail?: string;
  orgTwitter?: string;
  orgAddress?: string;
  orgDesc?: string;
  conditions?: string;
}> => {
  if (!issuer) {
    return {
      name: 'Stellar Lumens',
      desc: 'XLM is the native asset of the Stellar network.',
      orgName: 'Stellar Development Foundation',
      orgUrl: 'https://stellar.org',
    };
  }
  
  try {
    // Get issuer account to find home_domain
    const accountResponse = await fetch(`${HORIZON_URL}/accounts/${issuer}`);
    if (!accountResponse.ok) return {};
    
    const accountData = await accountResponse.json();
    const homeDomain = accountData.home_domain;
    if (!homeDomain) return {};
    
    // Fetch stellar.toml
    const tomlUrl = `https://${homeDomain}/.well-known/stellar.toml`;
    const tomlResponse = await fetch(tomlUrl);
    if (!tomlResponse.ok) return { domain: homeDomain };
    
    const tomlText = await tomlResponse.text();
    
    // Parse DOCUMENTATION section for organization info
    const docSection = tomlText.match(/\[DOCUMENTATION\]([\s\S]*?)(?=\[|$)/i);
    let orgName, orgUrl, orgEmail, orgTwitter, orgAddress, orgDesc;
    
    if (docSection) {
      const docBlock = docSection[1];
      orgName = docBlock.match(/ORG_NAME\s*=\s*"([^"]+)"/i)?.[1];
      orgUrl = docBlock.match(/ORG_URL\s*=\s*"([^"]+)"/i)?.[1];
      orgEmail = docBlock.match(/ORG_OFFICIAL_EMAIL\s*=\s*"([^"]+)"/i)?.[1];
      orgTwitter = docBlock.match(/ORG_TWITTER\s*=\s*"([^"]+)"/i)?.[1];
      orgAddress = docBlock.match(/ORG_PHYSICAL_ADDRESS\s*=\s*"([^"]+)"/i)?.[1];
      orgDesc = docBlock.match(/ORG_DESCRIPTION\s*=\s*"([^"]+)"/i)?.[1];
    }
    
    // Parse CURRENCIES section - find any currency from this issuer
    const currenciesMatch = tomlText.match(/\[\[CURRENCIES\]\]([\s\S]*?)(?=\[\[|$)/gi);
    let image, name, desc, conditions;
    
    if (currenciesMatch) {
      for (const currencyBlock of currenciesMatch) {
        // Check if this currency block contains the issuer
        if (currencyBlock.includes(issuer)) {
          image = currencyBlock.match(/image\s*=\s*"([^"]+)"/i)?.[1];
          name = currencyBlock.match(/name\s*=\s*"([^"]+)"/i)?.[1];
          desc = currencyBlock.match(/desc\s*=\s*"([^"]+)"/i)?.[1];
          conditions = currencyBlock.match(/conditions\s*=\s*"([^"]+)"/i)?.[1];
          break;
        }
      }
    }
    
    return { 
      domain: homeDomain, 
      image, 
      name, 
      desc, 
      orgName, 
      orgUrl, 
      orgEmail, 
      orgTwitter, 
      orgAddress, 
      orgDesc,
      conditions 
    };
  } catch (error) {
    return {};
  }
};

/**
 * Create an Asset object from code and issuer
 */
export const createAsset = (code: string, issuer?: string): Asset => {
  if (code === 'XLM' || code === 'native' || !issuer) {
    return Asset.native();
  }
  return new Asset(code, issuer);
};

/**
 * Build and submit a manage sell offer transaction (limit order on DEX)
 * @param sourceSecret - Secret key of the account placing the order
 * @param sellingAsset - Asset being sold
 * @param buyingAsset - Asset being bought
 * @param amount - Amount of selling asset
 * @param price - Price in terms of buying asset per selling asset
 * @returns Transaction result
 */
export const submitManageSellOffer = async (
  sourceSecret: string,
  sellingCode: string,
  sellingIssuer: string,
  buyingCode: string,
  buyingIssuer: string,
  amount: string,
  price: string,
  offerId: string = '0' // 0 = new offer
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const sourceKeypair = Keypair.fromSecret(sourceSecret);
    const publicKey = sourceKeypair.publicKey();
    
    // Fetch current account info for sequence number
    const accountResponse = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!accountResponse.ok) {
      throw new Error('Failed to fetch account details');
    }
    const accountData = await accountResponse.json();
    
    // Create account object with sequence number
    const account = new Account(publicKey, accountData.sequence);
    
    // Create asset objects
    const selling = createAsset(sellingCode, sellingIssuer);
    const buying = createAsset(buyingCode, buyingIssuer);
    
    // Build transaction with manageSellOffer operation
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageSellOffer({
          selling,
          buying,
          amount,
          price,
          offerId: offerId,
        })
      )
      .setTimeout(30)
      .build();
    
    // Sign the transaction
    transaction.sign(sourceKeypair);
    
    // Submit to Horizon
    const response = await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `tx=${encodeURIComponent(transaction.toEnvelope().toXDR('base64'))}`,
    });
    
    const result = await response.json();
    
    if (response.ok && result.successful) {
      return { success: true, hash: result.hash };
    } else {
      const errorMessage = result.extras?.result_codes?.operations?.[0] || 
                          result.extras?.result_codes?.transaction ||
                          result.detail ||
                          'Transaction failed';
      return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    let errorMessage = error.message || 'Transaction failed';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Find strict send payment paths from Horizon
 * This shows how much you would receive for a given send amount
 */
export const findStrictSendPaths = async (
  sourceAssetCode: string,
  sourceAssetIssuer: string | undefined,
  destAssetCode: string,
  destAssetIssuer: string | undefined,
  sendAmount: string
): Promise<any[]> => {
  try {
    const sourceAsset = sourceAssetCode === 'XLM' || sourceAssetCode === 'native'
      ? 'native'
      : `${sourceAssetCode}:${sourceAssetIssuer}`;
    
    const destAsset = destAssetCode === 'XLM' || destAssetCode === 'native'
      ? 'native'
      : `${destAssetCode}:${destAssetIssuer}`;
    
    const url = `${HORIZON_URL}/paths/strict-send?source_asset_type=${
      sourceAssetCode === 'XLM' ? 'native' : getAssetType(sourceAssetCode)
    }${sourceAssetCode !== 'XLM' ? `&source_asset_code=${sourceAssetCode}&source_asset_issuer=${sourceAssetIssuer}` : ''}&destination_assets=${destAsset}&source_amount=${sendAmount}`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
};

/**
 * Execute a Path Payment Strict Send operation
 * This is the core of atomic arbitrage - send exact amount, receive at least destMin
 * If the path doesn't yield destMin, the transaction FAILS atomically (no loss)
 * 
 * @param secretKey - Secret key of the sender
 * @param sendAssetCode - Asset code to send (e.g., 'XLM')
 * @param sendAssetIssuer - Issuer of send asset (undefined for XLM)
 * @param sendAmount - Exact amount to send
 * @param destAssetCode - Asset code to receive (e.g., 'XLM' for round-trip)
 * @param destAssetIssuer - Issuer of dest asset (undefined for XLM)
 * @param destMin - MINIMUM amount to receive (anti-loss protection)
 * @param path - Intermediate assets for the path (the arbitrage route)
 * @param destPublicKey - Destination account (usually same as sender for arbitrage)
 */
export const pathPaymentStrictSend = async (
  secretKey: string,
  sendAssetCode: string,
  sendAssetIssuer: string | undefined,
  sendAmount: string,
  destAssetCode: string,
  destAssetIssuer: string | undefined,
  destMin: string,
  path: Array<{ code: string; issuer?: string }>,
  destPublicKey?: string
): Promise<{ success: boolean; hash?: string; destAmount?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    const destination = destPublicKey || sourcePublicKey; // Default: send to self (arbitrage)
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Create send asset
    const sendAsset = sendAssetCode === 'XLM' || sendAssetCode === 'native'
      ? Asset.native()
      : new Asset(sendAssetCode, sendAssetIssuer!);
    
    // Create destination asset
    const destAsset = destAssetCode === 'XLM' || destAssetCode === 'native'
      ? Asset.native()
      : new Asset(destAssetCode, destAssetIssuer!);
    
    // Create path assets (intermediate hops)
    const pathAssets = path.map(p => 
      p.code === 'XLM' || p.code === 'native'
        ? Asset.native()
        : new Asset(p.code, p.issuer!)
    );
    
    // Build pathPaymentStrictSend transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: sendAsset,
          sendAmount: sendAmount,
          destination: destination,
          destAsset: destAsset,
          destMin: destMin, // CRITICAL: Anti-loss protection
          path: pathAssets,
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    
    // Extract the actual amount received from the result
    let destAmount: string | undefined;
    try {
      const opResult = (result as any).result_xdr;
      // In practice, you'd parse the XDR to get exact amount
      // For now, we return success and let the UI refresh balances
    } catch {}
    
    return { success: true, hash: result.hash, destAmount };
  } catch (error: any) {
    let errorMessage = error.message || 'Path payment failed';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      const opCode = codes.operations?.[0];
      
      // Translate common error codes
      if (opCode === 'op_under_dest_min') {
        errorMessage = 'Arbitrage cancelled: profit below minimum threshold (anti-loss protection triggered)';
      } else if (opCode === 'op_too_few_offers') {
        errorMessage = 'No viable path found for this arbitrage';
      } else if (opCode === 'op_cross_self') {
        errorMessage = 'Cannot cross your own offers';
      } else if (opCode === 'op_over_source_max') {
        errorMessage = 'Insufficient balance for this operation';
      } else {
        errorMessage = opCode || codes.transaction || errorMessage;
      }
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Get orderbook price for an asset pair
 */
export const getOrderbookPrice = async (
  baseCode: string,
  baseIssuer: string | undefined,
  counterCode: string,
  counterIssuer: string | undefined
): Promise<{ bestBid: number; bestAsk: number } | null> => {
  try {
    let url = `${HORIZON_URL}/order_book?`;
    
    if (baseCode === 'XLM' || baseCode === 'native') {
      url += 'selling_asset_type=native';
    } else {
      url += `selling_asset_type=${getAssetType(baseCode)}&selling_asset_code=${baseCode}&selling_asset_issuer=${baseIssuer}`;
    }
    
    url += '&';
    
    if (counterCode === 'XLM' || counterCode === 'native') {
      url += 'buying_asset_type=native';
    } else {
      url += `buying_asset_type=${getAssetType(counterCode)}&buying_asset_code=${counterCode}&buying_asset_issuer=${counterIssuer}`;
    }
    
    url += '&limit=1';
    
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    const bestBid = data.bids?.[0]?.price ? parseFloat(data.bids[0].price) : 0;
    const bestAsk = data.asks?.[0]?.price ? parseFloat(data.asks[0].price) : 0;
    
    return { bestBid, bestAsk };
  } catch {
    return null;
  }
};

/**
 * Get liquidity pools for an account
 */
export const getAccountLiquidityPools = async (publicKey: string): Promise<any[]> => {
  try {
    const url = `${HORIZON_URL}/accounts/${publicKey}/liquidity_pools?limit=200`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
};

/**
 * Get details of a specific liquidity pool
 */
export const getLiquidityPoolDetails = async (poolId: string): Promise<any | null> => {
  try {
    const url = `${HORIZON_URL}/liquidity_pools/${poolId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

/**
 * Deposit assets into a Liquidity Pool
 * @param secretKey - Secret key of the depositing account
 * @param poolId - The liquidity pool ID (SHA256 hash)
 * @param maxAmountA - Maximum amount of asset A to deposit
 * @param maxAmountB - Maximum amount of asset B to deposit
 * @param minPrice - Minimum price (assetA/assetB) willing to accept
 * @param maxPrice - Maximum price (assetA/assetB) willing to accept
 */
export const depositToLiquidityPool = async (
  secretKey: string,
  poolId: string,
  maxAmountA: string,
  maxAmountB: string,
  minPrice: { n: number; d: number },
  maxPrice: { n: number; d: number }
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Build liquidityPoolDeposit transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: maxAmountA,
          maxAmountB: maxAmountB,
          minPrice: minPrice,
          maxPrice: maxPrice,
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to deposit to liquidity pool';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Withdraw assets from a Liquidity Pool
 * @param secretKey - Secret key of the withdrawing account
 * @param poolId - The liquidity pool ID
 * @param amount - Amount of pool shares to redeem
 * @param minAmountA - Minimum amount of asset A to receive
 * @param minAmountB - Minimum amount of asset B to receive
 */
export const withdrawFromLiquidityPool = async (
  secretKey: string,
  poolId: string,
  amount: string,
  minAmountA: string,
  minAmountB: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Build liquidityPoolWithdraw transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.liquidityPoolWithdraw({
          liquidityPoolId: poolId,
          amount: amount,
          minAmountA: minAmountA,
          minAmountB: minAmountB,
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to withdraw from liquidity pool';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Parse wallet balances to separate regular assets from pool shares
 * This prevents balance multiplication bugs
 */
export const parseWalletBalances = (balances: any[]): {
  assets: any[];
  poolShares: any[];
} => {
  const assets: any[] = [];
  const poolShares: any[] = [];
  
  // Use a Set to track unique assets (code + issuer)
  const seenAssets = new Set<string>();
  
  for (const balance of balances) {
    if (balance.asset_type === 'liquidity_pool_shares') {
      // This is a pool share, not a regular asset
      poolShares.push({
        poolId: balance.liquidity_pool_id,
        balance: balance.balance,
      });
    } else {
      // Regular asset - deduplicate
      const code = balance.asset_code || 'XLM';
      const issuer = balance.asset_issuer || '';
      const key = `${code}_${issuer}`;
      
      if (!seenAssets.has(key)) {
        seenAssets.add(key);
        assets.push(balance);
      }
    }
  }
  
  return { assets, poolShares };
};

/**
 * Check if an account has a trustline for a specific asset
 */
export const hasTrustline = (balances: any[], assetCode: string, assetIssuer: string): boolean => {
  if (assetCode === 'XLM' || assetCode === 'native') return true; // Native XLM doesn't need trustline
  return balances.some((b: any) => 
    b.asset_code === assetCode && b.asset_issuer === assetIssuer
  );
};

/**
 * Add a trustline for a specific asset
 */
export const addTrustline = async (
  secretKey: string,
  assetCode: string,
  assetIssuer: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Create asset
    const asset = new Asset(assetCode, assetIssuer);
    
    // Build changeTrust transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: asset,
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to add trustline';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};


/**
 * Fetch trade history for a specific account (filled orders)
 */
export const getAccountTrades = async (
  publicKey: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const url = `${HORIZON_URL}/accounts/${publicKey}/trades?limit=${limit}&order=desc`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
};

/**
 * Fetch recent trades for a trading pair from Horizon
 */
export const getRecentTrades = async (
  baseAssetCode: string,
  baseAssetIssuer: string,
  counterAssetCode: string,
  counterAssetIssuer: string,
  limit: number = 30
): Promise<any[]> => {
  try {
    // Build base asset params
    const baseType = getAssetType(baseAssetCode);
    const baseParams = baseType === 'native'
      ? 'base_asset_type=native'
      : `base_asset_type=${baseType}&base_asset_code=${baseAssetCode}&base_asset_issuer=${baseAssetIssuer}`;
    
    // Build counter asset params
    const counterType = getAssetType(counterAssetCode);
    const counterParams = counterType === 'native'
      ? 'counter_asset_type=native'
      : `counter_asset_type=${counterType}&counter_asset_code=${counterAssetCode}&counter_asset_issuer=${counterAssetIssuer}`;
    
    const url = `${HORIZON_URL}/trades?${baseParams}&${counterParams}&order=desc&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
};

/**
 * Fetch open offers for a specific account
 */
export const getAccountOffers = async (
  publicKey: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const url = `${HORIZON_URL}/accounts/${publicKey}/offers?limit=${limit}&order=desc`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
};

/**
 * Cancel an open offer by submitting a manage_sell_offer with amount 0
 */
export const cancelOffer = async (
  secretKey: string,
  offerId: string,
  sellingAssetCode: string,
  sellingAssetIssuer: string,
  buyingAssetCode: string,
  buyingAssetIssuer: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Build selling and buying assets
    const sellingAsset = sellingAssetCode === 'XLM' || sellingAssetCode === 'native'
      ? Asset.native()
      : new Asset(sellingAssetCode, sellingAssetIssuer);
    
    const buyingAsset = buyingAssetCode === 'XLM' || buyingAssetCode === 'native'
      ? Asset.native()
      : new Asset(buyingAssetCode, buyingAssetIssuer);
    
    // Build cancel offer transaction (amount: 0 deletes the offer)
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageSellOffer({
          selling: sellingAsset,
          buying: buyingAsset,
          amount: '0',
          price: '1', // Price doesn't matter when canceling
          offerId: offerId,
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to cancel offer';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Fetch trade aggregations (OHLC data) for price charts
 */
export const getTradeAggregations = async (
  baseAssetCode: string,
  baseAssetIssuer: string,
  counterAssetCode: string,
  counterAssetIssuer: string,
  resolution: number = 3600000, // 1 hour in ms
  limit: number = 48
): Promise<any[]> => {
  try {
    // Build base asset params
    const baseType = getAssetType(baseAssetCode);
    const baseParams = baseType === 'native'
      ? 'base_asset_type=native'
      : `base_asset_type=${baseType}&base_asset_code=${baseAssetCode}&base_asset_issuer=${baseAssetIssuer}`;
    
    // Build counter asset params
    const counterType = getAssetType(counterAssetCode);
    const counterParams = counterType === 'native'
      ? 'counter_asset_type=native'
      : `counter_asset_type=${counterType}&counter_asset_code=${counterAssetCode}&counter_asset_issuer=${counterAssetIssuer}`;
    
    // Calculate start time (limit * resolution ms ago)
    const endTime = Date.now();
    const startTime = endTime - (limit * resolution);
    
    const url = `${HORIZON_URL}/trade_aggregations?${baseParams}&${counterParams}&resolution=${resolution}&start_time=${startTime}&end_time=${endTime}&order=asc&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
};

/**
 * Fetch XLM/USD 24h market stats from trade aggregations
 * Uses USDC as USD proxy (Centre's USDC on Stellar)
 */
export const getXLMUSDStats = async (): Promise<{
  priceChange24h: number;
  volume24h: string;
  high24h: string;
  low24h: string;
  open24h: string;
  close24h: string;
} | null> => {
  try {
    // Use USDC (Centre) as USD proxy - most liquid USD stablecoin on Stellar
    const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    
    // Fetch 24h of hourly aggregations for XLM/USDC
    const endTime = Date.now();
    const startTime = endTime - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const url = `${HORIZON_URL}/trade_aggregations?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code=USDC&counter_asset_issuer=${USDC_ISSUER}&resolution=3600000&start_time=${startTime}&end_time=${endTime}&order=asc&limit=24`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const records = data._embedded?.records || [];
    
    if (records.length === 0) return null;
    
    // Calculate stats from aggregations
    const firstRecord = records[0];
    const lastRecord = records[records.length - 1];
    
    const open24h = parseFloat(firstRecord.open);
    const close24h = parseFloat(lastRecord.close);
    const priceChange24h = open24h > 0 ? ((close24h - open24h) / open24h) * 100 : 0;
    
    let high24h = 0;
    let low24h = Infinity;
    let totalVolume = 0;
    
    for (const record of records) {
      const high = parseFloat(record.high);
      const low = parseFloat(record.low);
      const volume = parseFloat(record.base_volume);
      
      if (high > high24h) high24h = high;
      if (low < low24h) low24h = low;
      totalVolume += volume;
    }
    
    // Format volume
    let volumeStr: string;
    if (totalVolume >= 1000000) {
      volumeStr = (totalVolume / 1000000).toFixed(2) + 'M';
    } else if (totalVolume >= 1000) {
      volumeStr = (totalVolume / 1000).toFixed(2) + 'K';
    } else {
      volumeStr = totalVolume.toFixed(0);
    }
    
    return {
      priceChange24h,
      volume24h: volumeStr,
      high24h: high24h.toFixed(6),
      low24h: low24h === Infinity ? '0' : low24h.toFixed(6),
      open24h: open24h.toFixed(6),
      close24h: close24h.toFixed(6),
    };
  } catch {
    return null;
  }
};


/**
 * Build and submit a manage buy offer transaction
 */
export const submitManageBuyOffer = async (
  sourceSecret: string,
  sellingCode: string,
  sellingIssuer: string,
  buyingCode: string,
  buyingIssuer: string,
  buyAmount: string,
  price: string,
  offerId: string = '0'
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const sourceKeypair = Keypair.fromSecret(sourceSecret);
    const publicKey = sourceKeypair.publicKey();
    
    const accountResponse = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!accountResponse.ok) {
      throw new Error('Failed to fetch account details');
    }
    const accountData = await accountResponse.json();
    
    const account = new Account(publicKey, accountData.sequence);
    
    const selling = createAsset(sellingCode, sellingIssuer);
    const buying = createAsset(buyingCode, buyingIssuer);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageBuyOffer({
          selling,
          buying,
          buyAmount,
          price,
          offerId: offerId,
        })
      )
      .setTimeout(30)
      .build();
    
    transaction.sign(sourceKeypair);
    
    const response = await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `tx=${encodeURIComponent(transaction.toEnvelope().toXDR('base64'))}`,
    });
    
    const result = await response.json();
    
    if (response.ok && result.successful) {
      return { success: true, hash: result.hash };
    } else {
      const errorMessage = result.extras?.result_codes?.operations?.[0] || 
                          result.extras?.result_codes?.transaction ||
                          result.detail ||
                          'Transaction failed';
      return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    console.error('[v0] Error submitting buy offer:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Submit a payment transaction
 */
export const submitPayment = async (
  secretKey: string,
  destinationAddress: string,
  assetCode: string,
  assetIssuer: string,
  amount: string,
  memo?: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Create asset
    const asset = assetCode === 'XLM' || !assetIssuer 
      ? Asset.native() 
      : new Asset(assetCode, assetIssuer);
    
    // Build transaction
    let txBuilder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: asset,
          amount: amount,
        })
      );
    
    // Add memo if provided
    if (memo) {
      txBuilder = txBuilder.addMemo(Memo.text(memo.substring(0, 28)));
    }
    
    const transaction = txBuilder.setTimeout(180).build();
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Payment failed';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Get the home_domain set on a Stellar account
 */
export const getAccountHomeDomain = async (publicKey: string): Promise<string | null> => {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.home_domain || null;
  } catch {
    return null;
  }
};

/**
 * Set the home_domain on a Stellar account via setOptions transaction
 */
export const setHomeDomain = async (
  secretKey: string,
  homeDomain: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Build setOptions transaction with home_domain
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.setOptions({
          homeDomain: homeDomain.toLowerCase().trim(),
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to set home domain';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Clear the home_domain from a Stellar account
 */
export const clearHomeDomain = async (
  secretKey: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const keypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = keypair.publicKey();
    
    // Load source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Build setOptions transaction to clear home_domain (empty string)
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.setOptions({
          homeDomain: '',
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(keypair);
    
    const result = await server.submitTransaction(transaction);
    return { success: true, hash: result.hash };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to clear home domain';
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = codes.operations?.[0] || codes.transaction || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};
