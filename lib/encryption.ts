/**
 * Encryption utilities for securing wallet keys
 * Uses Web Crypto API for browser-safe encryption/decryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits for authentication tag
const SALT_LENGTH = 16; // 128 bits for key derivation

/**
 * Derives a cryptographic key from a password using PBKDF2
 * @param password - The password to derive the key from
 * @param salt - The salt for key derivation
 * @returns The derived CryptoKey
 */
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import the password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits from the password
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // NIST recommends 100,000+ iterations
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH
  );

  // Import the derived bits as a key for AES-GCM
  return await crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM with a password-derived key
 * @param secret - The data to encrypt
 * @param password - The password to derive the encryption key
 * @returns A JSON string containing the encrypted data, IV, salt, and authentication tag
 */
export async function encryptSecret(
  secret: string,
  password: string
): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from password
    const key = await deriveKeyFromPassword(password, salt);

    // Encrypt the secret
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      new TextEncoder().encode(secret)
    );

    // Combine salt + IV + encrypted data for storage
    // Format: base64(salt + iv + encryptedData)
    const combined = new Uint8Array(
      salt.length + iv.length + encryptedData.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    throw new Error(
      `Failed to encrypt secret: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypts data that was encrypted with encryptSecret
 * @param encryptedSecret - The base64-encoded encrypted data (from encryptSecret)
 * @param password - The password to derive the decryption key
 * @returns The decrypted plaintext
 */
export async function decryptSecret(
  encryptedSecret: string,
  password: string
): Promise<string> {
  try {
    // Decode base64
    const combined = Uint8Array.from(
      atob(encryptedSecret),
      (c) => c.charCodeAt(0)
    );

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from password using the same salt
    const key = await deriveKeyFromPassword(password, salt);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encryptedData
    );

    // Convert decrypted data back to string
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    throw new Error(
      `Failed to decrypt secret: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generates a random encryption password of specified length
 * @param length - The desired password length (default: 32 characters)
 * @returns A random password string suitable for key derivation
 */
export function generateEncryptionPassword(length: number = 32): string {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset.charAt(
      Math.floor(Math.random() * charset.length)
    );
  }

  return password;
}

/**
 * Validates that encryption/decryption works correctly
 * @returns true if encryption and decryption work correctly, false otherwise
 */
export async function validateEncryption(): Promise<boolean> {
  try {
    const testSecret = 'test-wallet-key-12345';
    const testPassword = 'test-password-12345';

    const encrypted = await encryptSecret(testSecret, testPassword);
    const decrypted = await decryptSecret(encrypted, testPassword);

    return decrypted === testSecret;
  } catch {
    return false;
  }
}
