import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  createEncryptedExport,
  getEncryptedExportSummary,
  importEncryptedExport,
  VaultExportSummary,
} from "./database";

export const VAULT_TRANSFER_EXTENSION = ".tsvault";
export const VAULT_TRANSFER_MIME_TYPE =
  "application/vnd.tsvaultkeysafe.transfer+json";
export const MIN_TRANSFER_PASSPHRASE_LENGTH = 16;
const MAX_TRANSFER_FILE_BYTES = 64 * 1024 * 1024;

export interface VaultTransferResult {
  recordCount: number;
  fileName?: string;
  summary?: VaultExportSummary;
}

export interface RecoveryGuideDetails {
  fileName: string;
  summary: VaultExportSummary;
}

export function createRecoveryGuide({
  fileName,
  summary,
}: RecoveryGuideDetails): string {
  const recordDescription =
    summary.recordCount === null
      ? "Record count is not available for this legacy transfer format."
      : `${summary.recordCount} encrypted vault record${summary.recordCount === 1 ? "" : "s"} are included.`;
  const fingerprintDescription = summary.fingerprint
    ? `Verification fingerprint: ${summary.fingerprint}`
    : "No transfer fingerprint is available for this legacy transfer format.";

  return [
    "TSVaultKeySafe offline recovery guide",
    "",
    "This guide contains no PIN, passphrase, master key, or readable vault record.",
    "Keep it separately from the encrypted .tsvault transfer file.",
    "",
    `Transfer file: ${fileName}`,
    `Created: ${summary.createdAt}`,
    `Format: v${summary.version}`,
    recordDescription,
    fingerprintDescription,
    "",
    "To restore on a new device:",
    "1. Install TSVaultKeySafe and create a new local vault PIN.",
    "2. Unlock the new, empty vault and open Security > Transfer vault.",
    "3. Select the encrypted .tsvault file and enter its separate transfer passphrase.",
    "4. Confirm the record count and verification fingerprint after import.",
    "5. After confirming records, delete temporary transfer copies you no longer need.",
    "",
    "TSVaultKeySafe never stores this transfer, its passphrase, or a recovery key on a service.",
  ].join("\n");
}

export async function shareRecoveryGuide(
  details: RecoveryGuideDetails,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Secure file sharing is not available on this device.");
  }
  const fileName = `${details.fileName.replace(/\.tsvault$/i, "")}-recovery-guide.txt`;
  const guideFile = new File(Paths.cache, fileName);
  if (guideFile.exists) guideFile.delete();
  try {
    guideFile.create();
    guideFile.write(createRecoveryGuide(details));
    await Sharing.shareAsync(guideFile.uri, {
      dialogTitle: "Save TSVaultKeySafe recovery guide",
      mimeType: "text/plain",
    });
  } finally {
    if (guideFile.exists) guideFile.delete();
  }
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
    const summary = getEncryptedExportSummary(encryptedTransfer);
    transferFile.create();
    transferFile.write(encryptedTransfer);
    await Sharing.shareAsync(transferFile.uri, {
      dialogTitle: "Save encrypted TSVaultKeySafe transfer",
      mimeType: VAULT_TRANSFER_MIME_TYPE,
    });
    return { recordCount, fileName, summary };
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

  const summary = getEncryptedExportSummary(serializedTransfer);
  const recordCount = await importEncryptedExport(
    serializedTransfer,
    passphrase,
    vaultKey,
  );
  if (summary.recordCount !== null && summary.recordCount !== recordCount) {
    throw new Error("Transfer record-count verification failed");
  }
  return { recordCount, summary };
}
