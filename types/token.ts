/**
 * Complete token metadata from various sources
 */
export interface TokenMetadata {
  code: string;
  issuer: string;
  name?: string;
  domain?: string;
  image?: string;
  coingeckoId?: string;
  verified?: boolean;
  decimals?: number;
  supply?: string;
  lastUpdated?: number;
  source: 'stellar-expert' | 'coingecko' | 'manual' | 'wallet';
}

/**
 * Token for display in UI
 */
export interface Token {
  code: string;
  issuer?: string;
  name?: string;
  image?: string;
  verified?: boolean;
  source?: 'wallet' | 'picks' | 'all' | 'manual' | 'favorites';
}

/**
 * Stellar Expert token response
 */
export interface StellarExpertToken {
  code: string;
  issuer: string;
  domain?: string;
  name?: string;
  desc?: string;
  image?: string;
  verified?: boolean;
}

/**
 * CoinGecko token response
 */
export interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image?: {
    large?: string;
    small?: string;
    thumb?: string;
  };
}
