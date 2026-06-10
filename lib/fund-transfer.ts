'use client';

import {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Asset,
  Operation,
  Horizon,
  Account,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon.stellar.org';
const TRANSACTION_TIMEOUT_SECONDS = 30;
const MINIMUM_BALANCE_XLM = 1; // Minimum to create account

export interface FundTransferConfig {
  fromSecretKey: string; // Main wallet secret
  toBotPublicKey: string;
  amountXlm: number;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  accountCreated?: boolean;
}

/**
 * Transfer XLM from main wallet to bot wallet
 * If bot wallet doesn't exist, creates it with minimum balance
 */
export async function transferFundsToBotWallet(config: FundTransferConfig): Promise<TransactionResult> {
  try {
    const horizon = new Horizon.Server(HORIZON_URL);
    const fromKeypair = Keypair.fromSecret(config.fromSecretKey);
    const fromPublicKey = fromKeypair.publicKey();

    // Check if bot wallet exists
    let botAccountExists = false;
    try {
      await horizon.loadAccount(config.toBotPublicKey);
      botAccountExists = true;
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    // Load source account
    const sourceAccount = await horizon.loadAccount(fromPublicKey);
    const transactionBuilder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC_NETWORK,
      timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + TRANSACTION_TIMEOUT_SECONDS },
    });

    // If bot account doesn't exist, create it first with create_account operation
    if (!botAccountExists) {
      if (config.amountXlm < MINIMUM_BALANCE_XLM) {
        return {
          success: false,
          error: `Insufficient amount to create bot wallet. Minimum required: ${MINIMUM_BALANCE_XLM} XLM, provided: ${config.amountXlm} XLM`,
        };
      }

      transactionBuilder.addOperation(
        Operation.createAccount({
          destination: config.toBotPublicKey,
          startingBalance: config.amountXlm.toString(),
        })
      );

      const transaction = transactionBuilder.build();
      transaction.sign(fromKeypair);
      const signedTx = transaction.toEnvelope().toXDR('base64');

      try {
        const result = await horizon.submitTransaction(signedTx);
        console.log('[v0] Bot wallet created and funded:', result.hash);
        return {
          success: true,
          hash: result.hash,
          accountCreated: true,
        };
      } catch (error: any) {
        const errorMessage = error.response?.data?.extras?.result_codes?.operations?.[0] || error.message;
        return {
          success: false,
          error: `Failed to create and fund bot wallet: ${errorMessage}`,
        };
      }
    }

    // Bot wallet exists, send payment
    transactionBuilder.addOperation(
      Operation.payment({
        destination: config.toBotPublicKey,
        asset: Asset.native(),
        amount: config.amountXlm.toString(),
      })
    );

    const transaction = transactionBuilder.build();
    transaction.sign(fromKeypair);
    const signedTx = transaction.toEnvelope().toXDR('base64');

    try {
      const result = await horizon.submitTransaction(signedTx);
      console.log('[v0] Funds transferred to bot wallet:', result.hash);
      return {
        success: true,
        hash: result.hash,
        accountCreated: false,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.extras?.result_codes?.operations?.[0] || error.message;
      return {
        success: false,
        error: `Failed to transfer funds: ${errorMessage}`,
      };
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during fund transfer';
    console.error('[v0] Fund transfer error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fetch bot wallet balance on Mainnet
 */
export async function getBotWalletBalance(publicKey: string): Promise<number> {
  try {
    const horizon = new Horizon.Server(HORIZON_URL);
    const account = await horizon.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return parseFloat(nativeBalance?.balance || '0');
  } catch (error: any) {
    if (error.response?.status === 404) {
      return 0; // Account doesn't exist yet
    }
    throw error;
  }
}

/**
 * Fetch main wallet balance on Mainnet
 */
export async function getMainWalletBalance(publicKey: string): Promise<{ xlm: number; assets: any[] }> {
  try {
    const horizon = new Horizon.Server(HORIZON_URL);
    const account = await horizon.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    const xlmBalance = parseFloat(nativeBalance?.balance || '0');
    const otherAssets = account.balances.filter((b) => b.asset_type !== 'native');

    return {
      xlm: xlmBalance,
      assets: otherAssets,
    };
  } catch (error) {
    console.error('[v0] Error fetching balance:', error);
    throw error;
  }
}
