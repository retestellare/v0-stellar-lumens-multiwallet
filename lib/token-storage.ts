/**
 * Token Storage - Manages user's favorite tokens
 */

import { TokenMetadata } from '@/types/token';

const FAVORITES_KEY = 'favorite_tokens';

/**
 * Get user's favorite tokens
 */
export function getFavoriteTokens(): TokenMetadata[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[v0] Error reading favorite tokens:', error);
  }
  return [];
}

/**
 * Save a token to favorites
 */
export function saveFavoriteToken(token: TokenMetadata): void {
  try {
    const favorites = getFavoriteTokens();
    
    // Check if already exists
    const exists = favorites.some((t) => t.code === token.code && t.issuer === token.issuer);
    if (!exists) {
      favorites.push(token);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('[v0] Error saving favorite token:', error);
  }
}

/**
 * Remove a token from favorites
 */
export function removeFavoriteToken(code: string, issuer: string): void {
  try {
    const favorites = getFavoriteTokens();
    const filtered = favorites.filter((t) => !(t.code === code && t.issuer === issuer));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[v0] Error removing favorite token:', error);
  }
}

/**
 * Check if a token is favorited
 */
export function isFavoriteToken(code: string, issuer: string): boolean {
  const favorites = getFavoriteTokens();
  return favorites.some((t) => t.code === code && t.issuer === issuer);
}

/**
 * Toggle favorite status for a token
 */
export function toggleFavoriteToken(token: TokenMetadata): boolean {
  if (isFavoriteToken(token.code, token.issuer)) {
    removeFavoriteToken(token.code, token.issuer);
    return false;
  } else {
    saveFavoriteToken(token);
    return true;
  }
}

/**
 * Clear all favorite tokens
 */
export function clearFavoriteTokens(): void {
  try {
    localStorage.removeItem(FAVORITES_KEY);
  } catch (error) {
    console.error('[v0] Error clearing favorite tokens:', error);
  }
}
