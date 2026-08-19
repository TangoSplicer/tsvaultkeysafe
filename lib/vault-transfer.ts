import { MIN_TRANSFER_PASSPHRASE_LENGTH } from "./transfer-strength";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  clearAllProducts,
  createEncryptedExport,
  getAllProducts,
  getEncryptedExportSummary,
  importEncryptedExport,
  inspectEncryptedExport,
  VaultExportSummary,
} from "./database";
import {
  clearEncryptedAttachments,
  collectEncryptedAttachmentsForTransfer,
  getAttachmentTransferPreflight,
  restoreEncryptedAttachmentFromTransfer,
} from "./vault-attachments";

export const VAULT_TRANSFER_EXTENSION = ".tsvault";
export const VAULT_TRANSFER_MIME_TYPE =
  "application/vnd.tsvaultkeysafe.transfer+json";
export {
  getTransferPassphraseStrength,
  MIN_TRANSFER_PASSPHRASE_LENGTH,
} from "./transfer-strength";

const MAX_TRANSFER_FILE_BYTES = 64 * 1024 * 1024;

export interface VaultTransferPreview {
  fileName: string;
  summary: VaultExportSummary;
}

export interface VaultTransferResult {
  recordCount: number;
  fileName?: string;
  summary?: VaultExportSummary;
}

export interface VaultTransferPreflight {
  recordCount: number;
  attachmentCount: number;
  attachmentBytes: number;
  estimatedPackageBytes: number;
  availableDeviceBytes: number;
  missingAttachmentNames: string[];
  canCreateTransfer: boolean;
  blockingReason?: string;
}

function estimatedPackageBytes(
  recordBytes: number,
  attachmentBytes: number,
): number {
  // Attachment data is encoded and encrypted twice during package construction.
  // Reserve headroom for JSON, AEAD metadata, and the temporary share copy.
  return Math.ceil(recordBytes * 2 + attachmentBytes * 3 + 512 * 1024);
}

export async function getVaultTransferPreflight(
  vaultKey: string,
): Promise<VaultTransferPreflight> {
  const products = await getAllProducts(vaultKey);
  const attachmentReport = getAttachmentTransferPreflight(products);
  const packageEstimate = estimatedPackageBytes(
    JSON.stringify(products).length,
    attachmentReport.sourceBytes,
  );
  const availableDeviceBytes = Paths.availableDiskSpace;
  let blockingReason: string | undefined;
  if (attachmentReport.missingAttachmentNames.length > 0) {
    blockingReason =
      "One or more managed attachment files are unavailable on this device.";
  } else if (!attachmentReport.isWithinPackageLimit) {
    blockingReason =
      "This transfer exceeds the 12-attachment or 24 MB attachment package limit.";
  } else if (availableDeviceBytes < packageEstimate) {
    blockingReason =
      "This device does not have enough free local storage to safely prepare the transfer.";
  }
  return {
    recordCount: products.length,
    attachmentCount: attachmentReport.attachmentCount,
    attachmentBytes: attachmentReport.sourceBytes,
    estimatedPackageBytes: packageEstimate,
    availableDeviceBytes,
    missingAttachmentNames: attachmentReport.missingAttachmentNames,
    canCreateTransfer: !blockingReason,
    blockingReason,
  };
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
  const attachmentDescription =
    summary.attachmentCount === null
      ? "Attachment count is not available for this legacy transfer format."
      : `${summary.attachmentCount} encrypted attachment${summary.attachmentCount === 1 ? "" : "s"} are included.`;

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
    attachmentDescription,
    fingerprintDescription,
    "",
    "To restore on a new device:",
    "1. Install TSVaultKeySafe and create a new local vault PIN.",
    "2. Unlock the new, empty vault and open Security > Transfer vault.",
    "3. Select the encrypted .tsvault file and enter its separate transfer passphrase.",
    "4. Confirm the record count, attachment count, and verification fingerprint after import.",
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
  attachmentKey: string,
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
    const products = await getAllProducts(vaultKey);
    const attachments = await collectEncryptedAttachmentsForTransfer(
      products,
      attachmentKey,
    );
    const encryptedTransfer = await createEncryptedExport(
      vaultKey,
      passphrase,
      attachments,
    );
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
  attachmentKey: string,
  passphrase: string,
  confirmImport?: (preview: VaultTransferPreview) => Promise<boolean>,
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
  const verifiedSummary = await inspectEncryptedExport(
    serializedTransfer,
    passphrase,
  );
  if (
    confirmImport &&
    !(await confirmImport({ fileName: asset.name, summary: verifiedSummary }))
  ) {
    return null;
  }
  let imported;
  try {
    imported = await importEncryptedExport(
      serializedTransfer,
      passphrase,
      vaultKey,
      async (destinationProductId, attachment) =>
        restoreEncryptedAttachmentFromTransfer(
          destinationProductId,
          attachment,
          attachmentKey,
        ),
    );
  } catch (error) {
    // Imports are allowed only into an empty vault. Remove any partial target
    // state rather than leaving an incomplete record/attachment combination.
    clearEncryptedAttachments();
    await clearAllProducts();
    throw error;
  }
  if (
    summary.recordCount !== null &&
    summary.recordCount !== imported.recordCount
  ) {
    throw new Error("Transfer record-count verification failed");
  }
  return {
    recordCount: imported.recordCount,
    summary: { ...verifiedSummary, attachmentCount: imported.attachmentCount },
  };
}
