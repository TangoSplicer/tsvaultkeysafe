import { Directory, File, Paths } from "expo-file-system";

import {
  clearAllProducts,
  createProduct,
  getAllProducts,
  Product,
} from "./database";
import { decryptData, encryptData, EncryptedData } from "./encryption";
import {
  clearEncryptedAttachments,
  collectEncryptedAttachmentsForTransfer,
  restoreEncryptedAttachmentFromTransfer,
  VaultTransferAttachment,
} from "./vault-attachments";

const SNAPSHOT_DIRECTORY_NAME = "tsvault-encrypted-recovery-snapshots";
const SNAPSHOT_FORMAT = "tsvaultkeysafe-local-recovery-snapshot";
const SNAPSHOT_VERSION = 1;
const SNAPSHOT_AAD = "tsvaultkeysafe-local-recovery-snapshot-v1";
const MAX_LOCAL_SNAPSHOTS = 3;

interface EncryptedVaultSnapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: typeof SNAPSHOT_VERSION;
  createdAt: string;
  reason: string;
  recordCount: number;
  attachmentCount: number;
  payload: EncryptedData;
}

interface VaultSnapshotPayload {
  products: Product[];
  attachments: VaultTransferAttachment[];
}

export interface LocalSnapshotSummary {
  fileName: string;
  createdAt: string;
  reason: string;
  recordCount: number;
  attachmentCount: number;
}

function snapshotDirectory(): Directory {
  return new Directory(Paths.document, SNAPSHOT_DIRECTORY_NAME);
}

function ensureSnapshotDirectory(): Directory {
  const directory = snapshotDirectory();
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

function snapshotFileName(createdAt: string): string {
  return `snapshot-${createdAt.replace(/[:.]/g, "-")}.tsrecovery`;
}

function parseSnapshotSummary(file: File): LocalSnapshotSummary | null {
  try {
    const value = JSON.parse(file.textSync()) as EncryptedVaultSnapshot;
    if (
      value.format !== SNAPSHOT_FORMAT ||
      value.version !== SNAPSHOT_VERSION ||
      typeof value.createdAt !== "string" ||
      typeof value.reason !== "string" ||
      !Number.isInteger(value.recordCount) ||
      !Number.isInteger(value.attachmentCount)
    ) {
      return null;
    }
    return {
      fileName: file.name,
      createdAt: value.createdAt,
      reason: value.reason,
      recordCount: value.recordCount,
      attachmentCount: value.attachmentCount,
    };
  } catch {
    return null;
  }
}

function listSnapshotFiles(): File[] {
  const directory = snapshotDirectory();
  if (!directory.exists) return [];
  return directory
    .list()
    .filter((item): item is File => item instanceof File)
    .filter((file) => file.name.endsWith(".tsrecovery"));
}

function pruneSnapshotHistory(): void {
  const snapshots = listSnapshotFiles()
    .map((file) => ({ file, summary: parseSnapshotSummary(file) }))
    .filter(
      (entry): entry is { file: File; summary: LocalSnapshotSummary } =>
        entry.summary !== null,
    )
    .sort((a, b) => b.summary.createdAt.localeCompare(a.summary.createdAt));
  for (const entry of snapshots.slice(MAX_LOCAL_SNAPSHOTS)) {
    entry.file.delete();
  }
}

export function listLocalRecoverySnapshots(): LocalSnapshotSummary[] {
  return listSnapshotFiles()
    .map((file) => parseSnapshotSummary(file))
    .filter((summary): summary is LocalSnapshotSummary => summary !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLocalRecoverySnapshot(
  databaseKey: string,
  attachmentKey: string,
  snapshotKey: string,
  reason: string,
): Promise<LocalSnapshotSummary> {
  const products = await getAllProducts(databaseKey);
  const attachments = await collectEncryptedAttachmentsForTransfer(
    products,
    attachmentKey,
  );
  const createdAt = new Date().toISOString();
  const payload: VaultSnapshotPayload = { products, attachments };
  const snapshot: EncryptedVaultSnapshot = {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    createdAt,
    reason,
    recordCount: products.length,
    attachmentCount: attachments.length,
    payload: await encryptData(
      JSON.stringify(payload),
      snapshotKey,
      SNAPSHOT_AAD,
    ),
  };
  const file = new File(ensureSnapshotDirectory(), snapshotFileName(createdAt));
  file.create();
  file.write(JSON.stringify(snapshot));
  pruneSnapshotHistory();
  return {
    fileName: file.name,
    createdAt,
    reason,
    recordCount: products.length,
    attachmentCount: attachments.length,
  };
}

async function readSnapshot(
  summary: LocalSnapshotSummary,
  snapshotKey: string,
): Promise<VaultSnapshotPayload> {
  const file = new File(snapshotDirectory(), summary.fileName);
  if (!file.exists)
    throw new Error("The selected local snapshot is unavailable.");
  const encrypted = JSON.parse(await file.text()) as EncryptedVaultSnapshot;
  if (
    encrypted.format !== SNAPSHOT_FORMAT ||
    encrypted.version !== SNAPSHOT_VERSION ||
    encrypted.createdAt !== summary.createdAt ||
    encrypted.reason !== summary.reason
  ) {
    throw new Error("The local snapshot format is invalid.");
  }
  const payload = JSON.parse(
    await decryptData(encrypted.payload, snapshotKey, SNAPSHOT_AAD),
  ) as VaultSnapshotPayload;
  if (
    !Array.isArray(payload.products) ||
    !Array.isArray(payload.attachments) ||
    payload.products.length !== encrypted.recordCount ||
    payload.attachments.length !== encrypted.attachmentCount
  ) {
    throw new Error("The local snapshot integrity check failed.");
  }
  return payload;
}

export async function restoreLocalRecoverySnapshot(
  summary: LocalSnapshotSummary,
  databaseKey: string,
  attachmentKey: string,
  snapshotKey: string,
): Promise<void> {
  const payload = await readSnapshot(summary, snapshotKey);
  const sourceToDestination = new Map<string, string>();
  clearEncryptedAttachments();
  await clearAllProducts();

  try {
    for (const product of payload.products) {
      const {
        id: sourceId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...input
      } = product;
      const created = await createProduct(input, databaseKey);
      sourceToDestination.set(sourceId, created.id);
    }
    for (const attachment of payload.attachments) {
      const destinationProductId = sourceToDestination.get(
        attachment.productId,
      );
      if (!destinationProductId) {
        throw new Error("A snapshot attachment refers to an unknown record.");
      }
      await restoreEncryptedAttachmentFromTransfer(
        destinationProductId,
        attachment,
        attachmentKey,
      );
    }
  } catch (error) {
    clearEncryptedAttachments();
    await clearAllProducts();
    throw error;
  }
}

export function clearLocalRecoverySnapshots(): void {
  const directory = snapshotDirectory();
  if (directory.exists) directory.delete();
}

export function localSnapshotHistoryLimit(): number {
  return MAX_LOCAL_SNAPSHOTS;
}
