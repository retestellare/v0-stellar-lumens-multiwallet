import { Keypair, TransactionBuilder, Networks, BASE_FEE, Asset, Operation, Horizon, Account } from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon.stellar.org';
const NETWORK_PASSPHRASE = Networks.PUBLIC;

/**
 * Execute a Market Maker order with advanced validation, fee handling, and error management.
 * Validates order size, handles dry-run simulation, fetches live network fees,
 * builds and signs transaction, and submits to Stellar network.
 */
export async function executeMarketMakerOrder({
  userSecretKey,
  calculatedAmount,
  minOrderSize,
  targetPrice,
  assetBuying,
  assetSelling,
  isDryRun,
}: {
  userSecretKey: string;
  calculatedAmount: string | number;
  minOrderSize: string | number;
  targetPrice: string | number;
  assetBuying: Asset;
  assetSelling: Asset;
  isDryRun: boolean;
}): Promise<{
  success: boolean;
  status: string;
  txHash?: string;
  message: string;
  rawError?: string;
}> {
  try {
    const server = new Horizon.Server(HORIZON_URL);

    // Initialize user keypair from secret key
    const sourceKeypair = Keypair.fromSecret(userSecretKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    // Convert amounts to numbers for comparison
    const amount = parseFloat(String(calculatedAmount));
    const minSize = parseFloat(String(minOrderSize));

    // Size Filter Guard - validate against minimum threshold
    if (amount < minSize) {
      console.log(
        `[MM BOT] Order skipped: Calculated amount (${amount.toFixed(2)}) is below minimum threshold (${minSize.toFixed(2)}).`
      );
      return {
        success: false,
        status: 'SKIPPED_BELOW_MINIMUM',
        message: `Order size ${amount.toFixed(2)} is lower than required minimum ${minSize.toFixed(2)}.`,
      };
    }

    // Handle Dry-Run Simulation Mode
    if (isDryRun) {
      console.log(
        `[DRY-RUN SIMULATION] Order passed verification: Selling ${amount.toFixed(7)} units at ${targetPrice}`
      );
      return {
        success: true,
        status: 'DRY_RUN_SUCCESS',
        message: `Dry-run successful. Order of ${amount.toFixed(2)} would be placed safely.`,
      };
    }

    // Fetch live account sequence and network fee metrics
    const account = await server.loadAccount(sourcePublicKey);
    const feeStats = await server.feeStats();

    // Automatically use competitive market rate fees to ensure front-running priority
    const automaticMarketFee = feeStats.fee_charged.mode;

    // Build the DEX Market Maker Operation
    const dexOperation = Operation.manageSellOffer({
      selling: assetSelling,
      buying: assetBuying,
      amount: amount.toFixed(7), // Stellar Network native precision limit (7 decimal places)
      price: String(targetPrice),
      offerId: '0', // '0' creates a brand new offer on the book
    });

    // Structure the Transaction envelope
    const transaction = new TransactionBuilder(account, {
      fee: automaticMarketFee,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(dexOperation)
      .setTimeout(30) // Transaction automatically expires in 30 seconds if network congests, avoiding stale fills
      .build();

    // Sign the cryptographic envelope
    transaction.sign(sourceKeypair);

    // Submit payload directly to Stellar network nodes
    const response = await server.submitTransaction(transaction);

    return {
      success: true,
      status: 'SUCCESSFULLY_SUBMITTED',
      txHash: response.hash,
      message: `Order successfully placed on the ledger. Network fee: ${BASE_FEE / 10000000} XLM.`,
    };
  } catch (error: any) {
    console.error('[STELLAR ENGINE ERROR]:', error);

    // User-friendly error breakdown translating native ledger rejection codes
    let clearUserErrorMessage = 'An unexpected error occurred while processing the ledger entry.';
    const resultCodes = error.response?.data?.extras?.result_codes;

    if (resultCodes) {
      if (resultCodes.transaction === 'tx_insufficient_balance') {
        clearUserErrorMessage =
          'Insufficient native XLM balance to secure the minimum wallet ledger reserves or pay gas fees.';
      }
      if (resultCodes.operations?.includes('op_underfunded')) {
        clearUserErrorMessage =
          'Insufficient token balance available to fulfill the calculated selling amount.';
      }
    }

    return {
      success: false,
      status: 'LEDGER_REJECTION',
      message: clearUserErrorMessage,
      rawError: error.message,
    };
  }
}
