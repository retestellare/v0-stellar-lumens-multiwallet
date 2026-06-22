import { Wallet } from './wallet-context';
import { getPublicKeyFromSecret } from './stellar-utils';

export interface BulkWalletEntry {
  privateKey: string;
  publicKey: string;
  accountName: string;
}

export interface BulkImportResult {
  valid: BulkWalletEntry[];
  errors: { line: number; error: string }[];
}

/**
 * Parse pipe-delimited wallet entries from file content
 * Format: private_key | public_key | account_name
 */
export function parseBulkWalletFile(content: string): BulkImportResult {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const valid: BulkWalletEntry[] = [];
  const errors: { line: number; error: string }[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    try {
      const parts = line.split('|').map(part => part.trim());
      
      if (parts.length !== 3) {
        errors.push({
          line: lineNumber,
          error: `Expected 3 fields (private_key | public_key | account_name), got ${parts.length}`,
        });
        return;
      }

      const [privateKey, publicKey, accountName] = parts;

      // Validate required fields
      if (!privateKey) {
        errors.push({ line: lineNumber, error: 'Private key is required' });
        return;
      }
      if (!publicKey) {
        errors.push({ line: lineNumber, error: 'Public key is required' });
        return;
      }
      if (!accountName) {
        errors.push({ line: lineNumber, error: 'Account name is required' });
        return;
      }

      // Validate Stellar key formats (should start with S for secret, G for public)
      if (!privateKey.startsWith('S')) {
        errors.push({ line: lineNumber, error: 'Invalid private key format (must start with S)' });
        return;
      }
      if (!publicKey.startsWith('G')) {
        errors.push({ line: lineNumber, error: 'Invalid public key format (must start with G)' });
        return;
      }

      // Verify that the private key corresponds to the public key
      try {
        const derivedPublicKey = getPublicKeyFromSecret(privateKey);
        if (derivedPublicKey !== publicKey) {
          errors.push({
            line: lineNumber,
            error: 'Private key does not match the provided public key',
          });
          return;
        }
      } catch (e) {
        errors.push({ line: lineNumber, error: 'Invalid private key' });
        return;
      }

      valid.push({ privateKey, publicKey, accountName });
    } catch (e: any) {
      errors.push({ line: lineNumber, error: e.message || 'Failed to parse line' });
    }
  });

  return { valid, errors };
}

/**
 * Generate pipe-delimited wallet export from wallets array and decrypted secrets
 */
export function generateBulkWalletFile(
  wallets: Wallet[],
  decryptedSecrets: Record<string, string>
): string {
  const lines = wallets.map(wallet => {
    const secret = decryptedSecrets[wallet.id];
    if (!secret) {
      throw new Error(`Missing decrypted secret for wallet: ${wallet.name}`);
    }
    return `${secret} | ${wallet.publicKey} | ${wallet.name}`;
  });

  return lines.join('\n');
}

/**
 * Validate a single wallet entry
 */
export function validateWalletEntry(entry: BulkWalletEntry): string | null {
  if (!entry.privateKey) return 'Private key is required';
  if (!entry.publicKey) return 'Public key is required';
  if (!entry.accountName) return 'Account name is required';

  if (!entry.privateKey.startsWith('S')) return 'Invalid private key format';
  if (!entry.publicKey.startsWith('G')) return 'Invalid public key format';

  try {
    const derivedPublicKey = getPublicKeyFromSecret(entry.privateKey);
    if (derivedPublicKey !== entry.publicKey) {
      return 'Private key does not match the public key';
    }
  } catch (e) {
    return 'Invalid private key';
  }

  return null;
}
