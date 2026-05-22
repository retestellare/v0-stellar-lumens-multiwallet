import { Keypair, Networks, TransactionBuilder, BASE_FEE, Asset, Operation } from '@stellar/stellar-sdk';
import nacl from 'tweetnacl';

export const HORIZON_URL = 'https://horizon.stellar.org';
export const NETWORK_PASSPHRASE = Networks.PUBLIC_NETWORK_PASSPHRASE;

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
    const params = new URLSearchParams({
      selling_asset_code: sellingAssetCode,
      selling_asset_issuer: sellingAssetIssuer,
      buying_asset_code: buyingAssetCode,
      buying_asset_issuer: buyingAssetIssuer,
    });
    
    const response = await fetch(`${HORIZON_URL}/order_book?${params}`);
    if (!response.ok) return { bids: [], asks: [] };
    return response.json();
  } catch {
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
