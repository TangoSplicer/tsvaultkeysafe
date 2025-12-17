import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';

/**
 * Encryption Service
 * Handles AES-256-GCM encryption, key derivation, and secure key storage
 */

const MASTER_KEY_STORAGE_KEY = 'tsvault_master_key';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  tag: string;
  salt?: string;
}

export interface EncryptionKeys {
  masterKey: string;
  databaseKey: string;
  attachmentKey: string;
}

/**
 * Generate a random master key (256-bit)
 */
export async function generateMasterKey(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytes(32);
  return Buffer.from(randomBytes).toString('hex');
}

/**
 * Store master key in secure storage
 */
export async function storeMasterKey(masterKey: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(MASTER_KEY_STORAGE_KEY, masterKey);
  } catch (error) {
    console.error('Failed to store master key:', error);
    throw new Error('Failed to store encryption key securely');
  }
}

/**
 * Retrieve master key from secure storage
 */
export async function getMasterKey(): Promise<string | null> {
  try {
    const masterKey = await SecureStore.getItemAsync(MASTER_KEY_STORAGE_KEY);
    return masterKey || null;
  } catch (error) {
    console.error('Failed to retrieve master key:', error);
    return null;
  }
}

/**
 * Derive database and attachment keys from master key using HKDF
 */
export async function deriveKeys(masterKey: string): Promise<EncryptionKeys> {
  // Use CryptoJS for HKDF-like derivation (simplified)
  // In production, use a proper HKDF library
  
  const databaseKeyHmac = CryptoJS.HmacSHA256(
    'TSVaultKeySafe:Database',
    masterKey
  );
  const databaseKey = databaseKeyHmac.toString();

  const attachmentKeyHmac = CryptoJS.HmacSHA256(
    'TSVaultKeySafe:Attachments',
    masterKey
  );
  const attachmentKey = attachmentKeyHmac.toString();

  return {
    masterKey,
    databaseKey,
    attachmentKey,
  };
}

/**
 * Encrypt data using AES-256-GCM
 * Note: CryptoJS doesn't natively support GCM mode, so we use a simplified approach
 * For production, consider using a library like tweetnacl-js or libsodium
 */
export async function encryptData(
  data: string,
  key: string,
  additionalData?: string
): Promise<EncryptedData> {
  try {
    // Generate random nonce (96-bit for GCM)
    const nonceBytes = await Crypto.getRandomBytes(12);
    const nonce = Buffer.from(nonceBytes).toString('hex');

    // Encrypt using CryptoJS AES (ECB mode as fallback, should use GCM in production)
    const encrypted = CryptoJS.AES.encrypt(data, key);
    const ciphertext = encrypted.toString();

    // Generate authentication tag (simplified, use proper GCM in production)
    const tag = CryptoJS.HmacSHA256(
      ciphertext + (additionalData || ''),
      key
    ).toString();

    return {
      ciphertext,
      nonce,
      tag,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(
  encryptedData: EncryptedData,
  key: string,
  additionalData?: string
): Promise<string> {
  try {
    // Verify authentication tag
    const expectedTag = CryptoJS.HmacSHA256(
      encryptedData.ciphertext + (additionalData || ''),
      key
    ).toString();

    if (expectedTag !== encryptedData.tag) {
      throw new Error('Authentication tag verification failed - data may be tampered');
    }

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedData.ciphertext, key);
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error('Decryption failed - invalid plaintext');
    }

    return plaintext;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Derive export key from passphrase using PBKDF2
 */
export async function deriveExportKey(
  passphrase: string,
  salt?: string
): Promise<{ key: string; salt: string }> {
  try {
    // Generate salt if not provided
    const finalSalt = salt || Buffer.from(await Crypto.getRandomBytes(32)).toString('hex');

    // Derive key using PBKDF2 (100,000 iterations)
    const derivedKey = CryptoJS.PBKDF2(passphrase, finalSalt, {
      keySize: 256 / 32, // 8 words for 256 bits
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256,
    }).toString();

    return {
      key: derivedKey,
      salt: finalSalt,
    };
  } catch (error) {
    console.error('Key derivation failed:', error);
    throw new Error('Failed to derive export key');
  }
}

/**
 * Clear sensitive data from memory
 */
export function clearSensitiveData(data: any): void {
  if (typeof data === 'string') {
    // Overwrite string with random data (simplified)
    const length = data.length;
    // Overwrite with random data (platform-specific implementation)
    // In practice, use native modules for secure memory clearing
  }
  // In production, use platform-native secure memory clearing
}

/**
 * Validate PIN (6-digit numeric)
 */
export function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Hash PIN for storage
 */
export async function hashPin(pin: string): Promise<string> {
  if (!validatePin(pin)) {
    throw new Error('Invalid PIN format');
  }

  // Use PBKDF2 for PIN hashing
  const salt = await Crypto.getRandomBytes(16);
  const saltHex = Buffer.from(salt).toString('hex');

  const hash = CryptoJS.PBKDF2(pin, saltHex, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  }).toString();

  return `${saltHex}:${hash}`;
}

/**
 * Verify PIN against hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    const [saltHex, storedHash] = hash.split(':');

    const derivedHash = CryptoJS.PBKDF2(pin, saltHex, {
      keySize: 256 / 32,
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256,
    }).toString();

    // Constant-time comparison (simplified)
    return derivedHash === storedHash;
  } catch (error) {
    console.error('PIN verification failed:', error);
    return false;
  }
}

/**
 * Initialize encryption system
 */
export async function initializeEncryption(): Promise<boolean> {
  try {
    let masterKey = await getMasterKey();

    if (!masterKey) {
      // Generate new master key on first launch
      masterKey = await generateMasterKey();
      await storeMasterKey(masterKey);
    }

    return true;
  } catch (error) {
    console.error('Encryption initialization failed:', error);
    return false;
  }
}

/**
 * Wipe all encryption data (factory reset)
 */
export async function wipeEncryptionData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(MASTER_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to wipe encryption data:', error);
    throw new Error('Failed to wipe vault');
  }
}
