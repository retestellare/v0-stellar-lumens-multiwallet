/**
 * Wallet verification module - checks bot wallet balances and trustlines
 * Reads secret key from environment variables via bot-config.ts
 */

import { Keypair, Horizon, BigNumber } from '@stellar/stellar-sdk';
import { getBotConfig } from '@/lib/bot-config';

interface BalanceInfo {
  rawXlm: string;
  availableXlm: string;
  token: string;
}

interface WalletVerificationResult {
  success: boolean;
  walletAddress?: string;
  balances?: BalanceInfo;
  hasTrustline?: boolean;
  canTrade?: boolean;
  message?: string;
}

/**
 * Fetch and verify bot wallet balances and trustlines
 * Validates XLM reserves, token balance, and trading readiness
 */
export async function verifyWalletBalances(
  targetAssetCode: string,
  targetAssetIssuer: string
): Promise<WalletVerificationResult> {
  try {
    const config = getBotConfig();
    const server = new Horizon.Server(config.horizonUrl);

    // Create keypair from environment secret key
    const keypair = Keypair.fromSecret(config.stellarSecretKey);
    const publicKey = keypair.publicKey();

    // Load account details from Stellar Mainnet
    const account = await server.loadAccount(publicKey);

    let xlmBalance = '0';
    let tokenBalance = '0';
    let hasTrustline = false;

    // Iterate through all balances in the wallet
    for (const balance of account.balances) {
      if (balance.asset_type === 'native') {
        xlmBalance = balance.balance;
      } else if (
        balance.asset_code === targetAssetCode &&
        balance.asset_issuer === targetAssetIssuer
      ) {
        tokenBalance = balance.balance;
        hasTrustline = true;
      }
    }

    // Calculate available XLM after reserves
    // Each offer requires 0.5 XLM reserve, plus 1 XLM minimum balance
    const sellingLiabilities = new BigNumber(account.subentry_count).multipliedBy(0.5);
    const availableXlm = new BigNumber(xlmBalance)
      .minus(sellingLiabilities)
      .minus(1.0);

    // Bot can trade if it has trustline and sufficient XLM reserves
    const canTrade = hasTrustline && availableXlm.isGreaterThan(5);

    return {
      success: true,
      walletAddress: publicKey,
      balances: {
        rawXlm: xlmBalance,
        availableXlm: availableXlm.toFixed(7),
        token: tokenBalance,
      },
      hasTrustline,
      canTrade,
    };
  } catch (error) {
    console.error('[WALLET VERIFICATION ERROR]:', error);
    return {
      success: false,
      message:
        'Failed to verify wallet balances. Check that STELLAR_BOT_SECRET_KEY is correctly configured.',
    };
  }
}
