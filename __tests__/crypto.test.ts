/* eslint-disable import/first */

const mockSecureStore = new Map<string, string>();

jest.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1)
      bytes[index] = (index * 31 + 17) % 256;
    return bytes;
  },
}));

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  setItemAsync: async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  },
  getItemAsync: async (key: string) => mockSecureStore.get(key) ?? null,
  deleteItemAsync: async (key: string) => {
    mockSecureStore.delete(key);
  },
}));

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: async () => false,
  isEnrolledAsync: async () => false,
  authenticateAsync: async () => ({ success: false }),
}));

import {
  decryptData,
  deriveKeys,
  encryptData,
  hashPin,
  validatePin,
  verifyPin,
} from "../lib/encryption";
import { changeVaultPin, setVaultPin, verifyVaultPin } from "../lib/vault-auth";
import { getTransferPassphraseStrength } from "../lib/transfer-strength";

describe("vault cryptography", () => {
  const masterKey = "11".repeat(32);

  beforeEach(() => {
    mockSecureStore.clear();
  });

  it("derives distinct subkeys for distinct vault purposes", async () => {
    const keys = await deriveKeys(masterKey);
    expect(keys.databaseKey).not.toEqual(keys.attachmentKey);
    expect(keys.databaseKey).not.toEqual(keys.snapshotKey);
    expect(keys.attachmentKey).not.toEqual(keys.snapshotKey);
    expect(keys.auditKey).not.toEqual(keys.databaseKey);
    expect(keys.auditKey).not.toEqual(keys.attachmentKey);
    expect(keys.auditKey).not.toEqual(keys.snapshotKey);
    expect(keys.databaseKey).toHaveLength(64);
    expect(keys.snapshotKey).toHaveLength(64);
    expect(keys.auditKey).toHaveLength(64);
  });

  it("classifies transfer passphrases locally without accepting short secrets", () => {
    expect(getTransferPassphraseStrength("short")).toBe("too-short");
    expect(getTransferPassphraseStrength("a".repeat(16))).toBe("fair");
    expect(getTransferPassphraseStrength("Longer phrase 2026!!")).toBe(
      "strong",
    );
    expect(
      getTransferPassphraseStrength("A much longer passphrase 2026!"),
    ).toBe("excellent");
  });

  it("round-trips authenticated encrypted data with associated data", async () => {
    const { databaseKey } = await deriveKeys(masterKey);
    const encrypted = await encryptData(
      "license-ABC-123",
      databaseKey,
      "product-1",
    );
    expect(encrypted.version).toBe(2);
    expect(await decryptData(encrypted, databaseKey, "product-1")).toBe(
      "license-ABC-123",
    );
  });

  it("rejects altered ciphertext and incorrect associated data", async () => {
    const { databaseKey } = await deriveKeys(masterKey);
    const encrypted = await encryptData(
      "private value",
      databaseKey,
      "product-1",
    );
    await expect(
      decryptData(
        { ...encrypted, tag: `${encrypted.tag.slice(0, -2)}ff` },
        databaseKey,
        "product-1",
      ),
    ).rejects.toThrow("Unable to decrypt vault record");
    await expect(
      decryptData(encrypted, databaseKey, "product-2"),
    ).rejects.toThrow("Unable to decrypt vault record");
  });

  it("enforces and verifies the versioned eight-digit PIN policy", async () => {
    expect(validatePin("12345678")).toBe(true);
    expect(validatePin("11111111")).toBe(false);
    expect(validatePin("123456")).toBe(false);
    const verifier = await hashPin("12345678");
    expect(verifier.startsWith("v2:")).toBe(true);
    await expect(verifyPin("12345678", verifier)).resolves.toBe(true);
    await expect(verifyPin("87654321", verifier)).resolves.toBe(false);
  }, 30_000);

  it("rotates the stored PIN only after current-PIN verification", async () => {
    await setVaultPin("12345678");
    await expect(changeVaultPin("87654321", "23456789")).rejects.toThrow(
      "Invalid PIN",
    );
    await changeVaultPin("12345678", "23456789");
    await expect(verifyVaultPin("12345678")).rejects.toThrow("Invalid PIN");
    await expect(verifyVaultPin("23456789")).resolves.toBe(true);
  }, 45_000);
});
