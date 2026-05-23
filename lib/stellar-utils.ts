import { Keypair, Networks, TransactionBuilder, BASE_FEE, Asset, Operation } from '@stellar/stellar-sdk';
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

// Fetch account balances
export const getAccountBalances = async (publicKey: string) => {
  try {
    const account = await getAccountDetails(publicKey);
    return account.balances || [];
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
    return data.records || [];
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
