import { File, Paths } from "expo-file-system/next";
import * as Crypto from "expo-crypto";
import { bytesToHex } from "@noble/ciphers/utils";

import type { Product } from "./database";
import {
  decryptData,
  deriveExportKey,
  encryptData,
  EncryptedData,
  validatePin,
} from "./encryption";

const DECOY_FILE_NAME = "tsvault-decoy-vault.v1";
const DECOY_FORMAT = "tsvaultkeysafe-decoy-vault" as const;
const DECOY_VERSION = 1 as const;
const DECOY_ADDITIONAL_DATA = "tsvaultkeysafe/decoy-vault/v1";

interface StoredDecoyVault {
  format: typeof DECOY_FORMAT;
  version: typeof DECOY_VERSION;
  salt: string;
  payload: EncryptedData;
}

let activeDecoyKey: string | null = null;

function decoyFile(): File {
  return new File(Paths.document, DECOY_FILE_NAME);
}

function seededDecoyProducts(): Product[] {
  const now = new Date().toISOString();
  return [
    {
      id: "decoy-office-suite",
      name: "Office Suite",
      vendor: "Example Software",
      licenseKey: "DECOY-2026-OFFICE-0001",
      category: "Software",
      recordType: "License",
      tags: ["work", "software"],
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      notes: "Local office software subscription.",
    },
    {
      id: "decoy-home-internet",
      name: "Home Internet",
      vendor: "Example Broadband",
      licenseKey: "example-home-account",
      category: "Subscription",
      recordType: "Credential",
      tags: ["home", "monthly"],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      notes: "Support contact and account reminder.",
    },
  ];
}

async function deriveDecoyKey(pin: string, salt: string): Promise<string> {
  const result = await deriveExportKey(
    `TSVaultKeySafe decoy vault/${pin}`,
    salt,
  );
  return result.key;
}

async function readStoredDecoy(): Promise<StoredDecoyVault | null> {
  const file = decoyFile();
  if (!file.exists) return null;
  const parsed = JSON.parse(await file.text()) as StoredDecoyVault;
  if (
    parsed.format !== DECOY_FORMAT ||
    parsed.version !== DECOY_VERSION ||
    typeof parsed.salt !== "string" ||
    !parsed.payload
  ) {
    throw new Error("The decoy vault is unavailable.");
  }
  return parsed;
}

async function writeStoredDecoy(
  pin: string,
  products: Product[],
): Promise<string> {
  const salt = bytesToHex(Crypto.getRandomBytes(32));
  const key = await deriveDecoyKey(pin, salt);
  const payload = await encryptData(
    JSON.stringify({ products }),
    key,
    DECOY_ADDITIONAL_DATA,
  );
  const stored: StoredDecoyVault = {
    format: DECOY_FORMAT,
    version: DECOY_VERSION,
    salt,
    payload,
  };
  const file = decoyFile();
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(stored));
  return key;
}

export async function openDecoyVault(pin: string): Promise<Product[]> {
  if (!validatePin(pin)) throw new Error("Invalid decoy PIN");
  const stored = await readStoredDecoy();
  if (!stored) {
    activeDecoyKey = await writeStoredDecoy(pin, seededDecoyProducts());
    return seededDecoyProducts();
  }

  const key = await deriveDecoyKey(pin, stored.salt);
  const plaintext = await decryptData(
    stored.payload,
    key,
    DECOY_ADDITIONAL_DATA,
  );
  const decoded = JSON.parse(plaintext) as { products?: Product[] };
  if (!Array.isArray(decoded.products)) {
    throw new Error("The decoy vault is unavailable.");
  }
  activeDecoyKey = key;
  return decoded.products;
}

export async function getActiveDecoyProducts(): Promise<Product[]> {
  if (!activeDecoyKey) throw new Error("Decoy session is locked");
  const stored = await readStoredDecoy();
  if (!stored) return [];
  const plaintext = await decryptData(
    stored.payload,
    activeDecoyKey,
    DECOY_ADDITIONAL_DATA,
  );
  const decoded = JSON.parse(plaintext) as { products?: Product[] };
  return Array.isArray(decoded.products) ? decoded.products : [];
}

export async function saveActiveDecoyProducts(
  products: Product[],
): Promise<void> {
  if (!activeDecoyKey) throw new Error("Decoy session is locked");
  const stored = await readStoredDecoy();
  if (!stored) throw new Error("The decoy vault is unavailable.");
  const plaintext = await decryptData(
    stored.payload,
    activeDecoyKey,
    DECOY_ADDITIONAL_DATA,
  );
  const decoded = JSON.parse(plaintext) as { products?: Product[] };
  if (!Array.isArray(decoded.products)) {
    throw new Error("The decoy vault is unavailable.");
  }
  const nextPayload = await encryptData(
    JSON.stringify({ products }),
    activeDecoyKey,
    DECOY_ADDITIONAL_DATA,
  );
  const nextStored: StoredDecoyVault = {
    ...stored,
    payload: nextPayload,
  };
  const file = decoyFile();
  file.delete();
  file.create();
  file.write(JSON.stringify(nextStored));
}

export function clearActiveDecoyKey(): void {
  activeDecoyKey = null;
}

export async function wipeDecoyVault(): Promise<void> {
  clearActiveDecoyKey();
  const file = decoyFile();
  if (file.exists) file.delete();
}

export const DECOY_VAULT_FILE_NAME = DECOY_FILE_NAME;
