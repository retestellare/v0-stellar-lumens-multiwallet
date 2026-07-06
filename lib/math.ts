/**
 * Precision math utilities
 *
 * Wraps BigNumber.js (already a transitive dependency via @stellar/stellar-sdk)
 * to ensure that all balance and price calculations are free of IEEE-754
 * floating-point rounding errors.
 */

import BigNumber from 'bignumber.js';

// Configure BigNumber globally for this module:
//   - Round half-up (the most common financial convention)
//   - Never use exponential notation unless the number is extremely large/small
BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
  EXPONENTIAL_AT: [-15, 20],
});

// ─── Formatting helpers ──────────────────────────────────────────────────────

/**
 * Format a raw Stellar balance string for display.
 *
 * Stellar balances are always 7-decimal-place strings (e.g. "1234.5678900").
 * This function strips trailing zeros and applies locale-aware grouping for
 * the integer portion.
 *
 * @param raw       The balance string from Horizon (e.g. "12345.6789000")
 * @param maxDecimals Maximum number of decimal places to show (default 7)
 */
export function formatBalance(raw: string | number, maxDecimals = 7): string {
  const bn = new BigNumber(raw);
  if (bn.isNaN()) return '0';

  const abs = bn.abs();

  // For balances >= 1 000 000 we abbreviate to reduce visual noise
  if (abs.gte(1_000_000)) {
    return abs.dividedBy(1_000_000).toFixed(2, BigNumber.ROUND_DOWN) + 'M';
  }
  if (abs.gte(1_000)) {
    // Show up to 2 decimal places with thousand-separator
    return abs.toFormat(2);
  }
  if (abs.isZero()) {
    return '0';
  }
  // Strip trailing zeros, cap at maxDecimals
  const fixed = bn.toFixed(maxDecimals);
  return new BigNumber(fixed).toFormat();
}

/**
 * Format a balance for compact display in asset rows.
 *
 * - Zero            → "0"
 * - Whole number    → "1,234"
 * - < 1             → up to 7 significant decimals (no trailing zeros)
 * - >= 1 000        → "1,234.56" (2 dp)
 * - >= 1 000 000    → "1.23M"
 */
export function formatBalanceCompact(raw: string | number): string {
  const bn = new BigNumber(raw);
  if (bn.isNaN() || bn.isZero()) return '0';

  const abs = bn.abs();

  if (abs.gte(1_000_000)) {
    return abs.dividedBy(1_000_000).toFixed(2, BigNumber.ROUND_DOWN) + 'M';
  }
  if (abs.gte(1_000)) {
    return abs.toFormat(2);
  }
  if (abs.gte(1)) {
    // Strip trailing zeros after decimal
    const s = bn.toFixed(4);
    return new BigNumber(s).toFormat();
  }
  // Small value — show up to 7 decimal places, strip trailing zeros
  const s = bn.toFixed(7);
  return new BigNumber(s).toFormat();
}

/**
 * Compute the USD value of a balance.
 *
 * @param balance  Raw balance string or number
 * @param usdPrice Price per unit in USD
 * @returns Formatted USD string, e.g. "$1,234.56"
 */
export function balanceToUsd(balance: string | number, usdPrice: number): string {
  const value = new BigNumber(balance).multipliedBy(usdPrice);
  if (value.isNaN() || value.isZero()) return '$0.00';

  if (value.gte(1_000_000)) {
    return '$' + value.dividedBy(1_000_000).toFixed(2) + 'M';
  }
  if (value.gte(1_000)) {
    return '$' + value.toFormat(2);
  }
  if (value.gte(1)) {
    return '$' + value.toFixed(2);
  }
  if (value.gte(0.01)) {
    return '$' + value.toFixed(4);
  }
  // Very small value
  return '$' + value.toPrecision(2);
}

/**
 * Sum an array of balance strings with full precision.
 */
export function sumBalances(balances: (string | number)[]): BigNumber {
  return balances.reduce((acc: BigNumber, b) => acc.plus(new BigNumber(b)), new BigNumber(0));
}

/**
 * Safely parse a numeric string, returning BigNumber.ZERO on failure.
 */
export function parseBN(value: string | number): BigNumber {
  const bn = new BigNumber(value);
  return bn.isNaN() ? new BigNumber(0) : bn;
}

/**
 * Returns true when two balance strings represent the same value.
 */
export function balancesEqual(a: string | number, b: string | number): boolean {
  return new BigNumber(a).isEqualTo(new BigNumber(b));
}
