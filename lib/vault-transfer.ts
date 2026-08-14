import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { createEncryptedExport, importEncryptedExport } from "./database";

export const VAULT_TRANSFER_EXTENSION = ".tsvault";
export const VAULT_TRANSFER_MIME_TYPE =
  "application/vnd.tsvaultkeysafe.transfer+json";
export const MIN_TRANSFER_PASSPHRASE_LENGTH = 16;
const MAX_TRANSFER_FILE_BYTES = 64 * 1024 * 1024;

export interface VaultTransferResult {
  recordCount: number;
  fileName?: string;
}

export function validateTransferPassphrase(passphrase: string): boolean {
  return passphrase.trim().length >= MIN_TRANSFER_PASSPHRASE_LENGTH;
}

function fileNameForTransfer(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `tsvaultkeysafe-transfer-${timestamp}${VAULT_TRANSFER_EXTENSION}`;
}

function verifyTransferFileName(name: string): void {
  if (!name.toLowerCase().endsWith(VAULT_TRANSFER_EXTENSION)) {
    throw new Error(
      "Select a TSVaultKeySafe transfer file ending in .tsvault.",
    );
  }
}

export async function createAndShareVaultTransfer(
  vaultKey: string,
  passphrase: string,
  recordCount: number,
): Promise<VaultTransferResult> {
  if (!validateTransferPassphrase(passphrase)) {
    throw new Error(
      `Use a transfer passphrase of at least ${MIN_TRANSFER_PASSPHRASE_LENGTH} characters.`,
    );
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Secure file sharing is not available on this device.");
  }

  const fileName = fileNameForTransfer();
  const transferFile = new File(Paths.cache, fileName);
  if (transferFile.exists) transferFile.delete();

  try {
    const encryptedTransfer = await createEncryptedExport(vaultKey, passphrase);
    transferFile.create();
    transferFile.write(encryptedTransfer);
    await Sharing.shareAsync(transferFile.uri, {
      dialogTitle: "Save encrypted TSVaultKeySafe transfer",
      mimeType: VAULT_TRANSFER_MIME_TYPE,
    });
    return { recordCount, fileName };
  } finally {
    if (transferFile.exists) transferFile.delete();
  }
}

export async function selectAndImportVaultTransfer(
  vaultKey: string,
  passphrase: string,
): Promise<VaultTransferResult | null> {
  if (!validateTransferPassphrase(passphrase)) {
    throw new Error(
      `Enter the transfer passphrase of at least ${MIN_TRANSFER_PASSPHRASE_LENGTH} characters.`,
    );
  }

  const selection = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [VAULT_TRANSFER_MIME_TYPE, "application/json", "*/*"],
  });
  if (selection.canceled) return null;

  const asset = selection.assets[0];
  verifyTransferFileName(asset.name);
  if (asset.size !== undefined && asset.size > MAX_TRANSFER_FILE_BYTES) {
    throw new Error("The selected transfer file is too large.");
  }

  const transferFile = new File(asset.uri);
  const serializedTransfer = await transferFile.text();
  if (serializedTransfer.length > MAX_TRANSFER_FILE_BYTES) {
    throw new Error("The selected transfer file is too large.");
  }

  const recordCount = await importEncryptedExport(
    serializedTransfer,
    passphrase,
    vaultKey,
  );
  return { recordCount };
}
