import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import {
  bytesToHex,
  equalBytes,
  hexToBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils";
import { hkdf } from "@noble/hashes/hkdf";
import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";

const MASTER_KEY_STORAGE_KEY = "tsvault.master-key.v2";
const KEYCHAIN_SERVICE = "com.tsvaultkeysafe.vault";
const KEY_DERIVATION_SALT = utf8ToBytes("TSVaultKeySafe/v2/key-separation");
const PIN_ITERATIONS = 600_000;
const PIN_SALT_BYTES = 32;
const DATA_KEY_BYTES = 32;
const NONCE_BYTES = 24;
const TAG_BYTES = 16;

interface AndroidVaultPbkdf2Module {
  deriveVaultPbkdf2Sha256Async(
    password: string,
    saltHex: string,
  ): Promise<string>;
}

function getAndroidVaultPbkdf2Module(): AndroidVaultPbkdf2Module | null {
  try {
    // Native lookup is deliberately lazy: unavailable platforms and unit-test runtimes use the audited fallback.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo") as {
      requireNativeModule: <T>(moduleName: string) => T;
    };
    return requireNativeModule<AndroidVaultPbkdf2Module>("ExpoVaultPbkdf2");
  } catch {
    return null;
  }
}

async function derivePinVerifier(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const nativeModule = getAndroidVaultPbkdf2Module();
  if (nativeModule) {
    try {
      const nativeResult = hexToBytes(
        await nativeModule.deriveVaultPbkdf2Sha256Async(
          password,
          bytesToHex(salt),
        ),
      );
      if (nativeResult.length === DATA_KEY_BYTES) return nativeResult;
    } catch {
      // Preserve availability with the audited JavaScript implementation if a platform service is unavailable.
    }
  }

  return pbkdf2Async(sha256, utf8ToBytes(password), salt, {
    c: PIN_ITERATIONS,
    dkLen: DATA_KEY_BYTES,
  });
}

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  tag: string;
  version: 2;
}

export interface EncryptionKeys {
  masterKey: string;
  databaseKey: string;
  attachmentKey: string;
  snapshotKey: string;
  auditKey: string;
}

function secureStoreOptions(): SecureStore.SecureStoreOptions {
  return {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

function normalizeKey(key: string): Uint8Array {
  const keyBytes = hexToBytes(key);
  if (keyBytes.length !== DATA_KEY_BYTES) {
    throw new Error("Invalid encryption key");
  }
  return keyBytes;
}

function encodeAdditionalData(additionalData?: string): Uint8Array | undefined {
  return additionalData ? utf8ToBytes(additionalData) : undefined;
}

/** Generates a CSPRNG-backed, 256-bit vault master key. */
export function generateMasterKey(): string {
  return bytesToHex(Crypto.getRandomBytes(DATA_KEY_BYTES));
}

/** Stores the key so it is only available while the device is unlocked and never migrates. */
export async function storeMasterKey(masterKey: string): Promise<void> {
  normalizeKey(masterKey);
  await SecureStore.setItemAsync(
    MASTER_KEY_STORAGE_KEY,
    masterKey,
    secureStoreOptions(),
  );
}

export async function getMasterKey(): Promise<string | null> {
  const masterKey = await SecureStore.getItemAsync(
    MASTER_KEY_STORAGE_KEY,
    secureStoreOptions(),
  );
  if (!masterKey) return null;
  normalizeKey(masterKey);
  return masterKey;
}

/** Derives purpose-separated data keys with HKDF-SHA-256. */
export async function deriveKeys(masterKey: string): Promise<EncryptionKeys> {
  const masterKeyBytes = normalizeKey(masterKey);
  const databaseKey = hkdf(
    sha256,
    masterKeyBytes,
    KEY_DERIVATION_SALT,
    utf8ToBytes("database-encryption"),
    DATA_KEY_BYTES,
  );
  const attachmentKey = hkdf(
    sha256,
    masterKeyBytes,
    KEY_DERIVATION_SALT,
    utf8ToBytes("attachment-encryption"),
    DATA_KEY_BYTES,
  );
  const snapshotKey = hkdf(
    sha256,
    masterKeyBytes,
    KEY_DERIVATION_SALT,
    utf8ToBytes("local-recovery-snapshot-encryption"),
    DATA_KEY_BYTES,
  );
  const auditKey = hkdf(
    sha256,
    masterKeyBytes,
    KEY_DERIVATION_SALT,
    utf8ToBytes("local-security-audit-log-encryption"),
    DATA_KEY_BYTES,
  );

  return {
    masterKey,
    databaseKey: bytesToHex(databaseKey),
    attachmentKey: bytesToHex(attachmentKey),
    snapshotKey: bytesToHex(snapshotKey),
    auditKey: bytesToHex(auditKey),
  };
}

/**
 * Encrypts one record using XChaCha20-Poly1305 AEAD. The record identifier is
 * authenticated as associated data, preventing ciphertext substitution.
 */
export async function encryptData(
  data: string,
  key: string,
  additionalData?: string,
): Promise<EncryptedData> {
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const cipher = xchacha20poly1305(
    normalizeKey(key),
    nonce,
    encodeAdditionalData(additionalData),
  );
  const sealed = cipher.encrypt(utf8ToBytes(data));
  const ciphertext = sealed.slice(0, -TAG_BYTES);
  const tag = sealed.slice(-TAG_BYTES);

  return {
    ciphertext: bytesToHex(ciphertext),
    nonce: bytesToHex(nonce),
    tag: bytesToHex(tag),
    version: 2,
  };
}

export async function decryptData(
  encryptedData: EncryptedData,
  key: string,
  additionalData?: string,
): Promise<string> {
  if (encryptedData.version !== 2) {
    throw new Error("Unsupported encrypted record version");
  }

  try {
    const nonce = hexToBytes(encryptedData.nonce);
    const ciphertext = hexToBytes(encryptedData.ciphertext);
    const tag = hexToBytes(encryptedData.tag);
    if (nonce.length !== NONCE_BYTES || tag.length !== TAG_BYTES) {
      throw new Error("Malformed encrypted record");
    }

    const cipher = xchacha20poly1305(
      normalizeKey(key),
      nonce,
      encodeAdditionalData(additionalData),
    );
    return new TextDecoder().decode(
      cipher.decrypt(new Uint8Array([...ciphertext, ...tag])),
    );
  } catch {
    // Do not disclose whether the key, tag, or ciphertext was invalid.
    throw new Error("Unable to decrypt vault record");
  }
}

/** Derives an export key with PBKDF2-HMAC-SHA-256 using the documented work factor. */
export async function deriveExportKey(
  passphrase: string,
  salt?: string,
): Promise<{ key: string; salt: string }> {
  const saltBytes = salt
    ? hexToBytes(salt)
    : Crypto.getRandomBytes(PIN_SALT_BYTES);
  const key = await pbkdf2Async(sha256, utf8ToBytes(passphrase), saltBytes, {
    c: PIN_ITERATIONS,
    dkLen: DATA_KEY_BYTES,
  });
  return { key: bytesToHex(key), salt: bytesToHex(saltBytes) };
}

/** Best-effort clearing for mutable buffers. JavaScript strings cannot be reliably zeroized. */
export function clearSensitiveData(data: Uint8Array): void {
  data.fill(0);
}

export function validatePin(pin: string): boolean {
  return /^\d{8}$/.test(pin) && !/(\d)\1{7,}/.test(pin);
}

/** Stores a versioned PBKDF2 verifier with a unique 256-bit salt. */
export async function hashPin(pin: string): Promise<string> {
  if (!validatePin(pin)) {
    throw new Error(
      "PIN must contain exactly 8 digits and cannot use one repeated digit",
    );
  }
  const salt = Crypto.getRandomBytes(PIN_SALT_BYTES);
  const derived = await derivePinVerifier(pin, salt);
  return `v2:${bytesToHex(salt)}:${bytesToHex(derived)}`;
}

export async function verifyPin(
  pin: string,
  storedValue: string,
): Promise<boolean> {
  if (!validatePin(pin)) return false;
  const [version, saltHex, hashHex] = storedValue.split(":");
  if (version !== "v2" || !saltHex || !hashHex) return false;

  try {
    const expected = hexToBytes(hashHex);
    if (expected.length !== DATA_KEY_BYTES) return false;
    const actual = await derivePinVerifier(pin, hexToBytes(saltHex));
    return equalBytes(actual, expected);
  } catch {
    return false;
  }
}

export async function initializeEncryption(): Promise<boolean> {
  let masterKey = await getMasterKey();
  if (!masterKey) {
    masterKey = generateMasterKey();
    await storeMasterKey(masterKey);
  }
  return true;
}

export async function wipeEncryptionData(): Promise<void> {
  await SecureStore.deleteItemAsync(
    MASTER_KEY_STORAGE_KEY,
    secureStoreOptions(),
  );
}

export const CRYPTOGRAPHY_VERSION = 2;
export const PIN_WORK_FACTOR = PIN_ITERATIONS;
