import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";

import type { VaultAttachment } from "./database";
import { decryptData, encryptData, EncryptedData } from "./encryption";

const ATTACHMENT_DIRECTORY_NAME = "tsvault-encrypted-attachments";
const ATTACHMENT_FORMAT = "tsvaultkeysafe-attachment";
const ATTACHMENT_VERSION = 1;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENT_NAME_LENGTH = 120;

interface StoredAttachment {
  format: typeof ATTACHMENT_FORMAT;
  version: typeof ATTACHMENT_VERSION;
  metadata: VaultAttachment;
  payload: EncryptedData;
}

export interface VaultTransferAttachment {
  productId: string;
  reference: VaultAttachment;
  contentBase64: string;
}

const MAX_TRANSFER_ATTACHMENT_BYTES = 24 * 1024 * 1024;

function attachmentDirectory(): Directory {
  return new Directory(Paths.document, ATTACHMENT_DIRECTORY_NAME);
}

function ensureAttachmentDirectory(): Directory {
  const directory = attachmentDirectory();
  if (!directory.exists)
    directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function safeAttachmentName(value: string): string {
  const normalized = value
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .trim()
    .slice(0, MAX_ATTACHMENT_NAME_LENGTH);
  return normalized || "attachment";
}

function attachmentFile(id: string): File {
  return new File(ensureAttachmentDirectory(), `${id}.tsattachment`);
}

function assertAttachmentReference(reference: VaultAttachment): void {
  if (
    !reference.id ||
    !reference.name ||
    !Number.isInteger(reference.size) ||
    reference.size < 0 ||
    reference.size > MAX_ATTACHMENT_BYTES ||
    !reference.mimeType ||
    !reference.addedAt
  ) {
    throw new Error("Attachment metadata is invalid");
  }
}

export function attachmentLimits(): { maxBytes: number; maxCount: number } {
  return { maxBytes: MAX_ATTACHMENT_BYTES, maxCount: 12 };
}

export interface AttachmentTransferPreflight {
  attachmentCount: number;
  sourceBytes: number;
  missingAttachmentNames: string[];
  isWithinPackageLimit: boolean;
}

export function getAttachmentTransferPreflight(
  products: { attachments?: VaultAttachment[] }[],
): AttachmentTransferPreflight {
  let attachmentCount = 0;
  let sourceBytes = 0;
  const missingAttachmentNames: string[] = [];
  for (const product of products) {
    for (const attachment of product.attachments ?? []) {
      attachmentCount += 1;
      sourceBytes += attachment.size;
      if (!attachmentFile(attachment.id).exists) {
        missingAttachmentNames.push(attachment.name);
      }
    }
  }
  return {
    attachmentCount,
    sourceBytes,
    missingAttachmentNames,
    isWithinPackageLimit:
      attachmentCount <= 12 && sourceBytes <= MAX_TRANSFER_ATTACHMENT_BYTES,
  };
}

export async function selectAndEncryptAttachment(
  productId: string,
  attachmentKey: string,
): Promise<VaultAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (
    !asset.name ||
    (asset.size ?? 0) <= 0 ||
    (asset.size ?? 0) > MAX_ATTACHMENT_BYTES
  ) {
    throw new Error("Choose a file smaller than 8 MB.");
  }

  const source = new File(asset.uri);
  const base64 = await source.base64();
  const metadata: VaultAttachment = {
    id: Crypto.randomUUID(),
    name: safeAttachmentName(asset.name),
    mimeType: asset.mimeType || "application/octet-stream",
    size: asset.size ?? 0,
    addedAt: new Date().toISOString(),
  };
  const payload = await encryptData(
    base64,
    attachmentKey,
    `${productId}:${metadata.id}`,
  );
  const stored: StoredAttachment = {
    format: ATTACHMENT_FORMAT,
    version: ATTACHMENT_VERSION,
    metadata,
    payload,
  };

  const destination = attachmentFile(metadata.id);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(JSON.stringify(stored));
  return metadata;
}

export async function decryptAttachmentToCache(
  productId: string,
  reference: VaultAttachment,
  attachmentKey: string,
): Promise<File> {
  assertAttachmentReference(reference);
  const storedFile = attachmentFile(reference.id);
  if (!storedFile.exists)
    throw new Error("The encrypted attachment file is unavailable.");
  const stored = JSON.parse(await storedFile.text()) as StoredAttachment;
  if (
    stored.format !== ATTACHMENT_FORMAT ||
    stored.version !== ATTACHMENT_VERSION ||
    stored.metadata.id !== reference.id
  ) {
    throw new Error("The encrypted attachment integrity check failed.");
  }
  const plaintextBase64 = await decryptData(
    stored.payload,
    attachmentKey,
    `${productId}:${reference.id}`,
  );
  const temporaryFile = new File(Paths.cache, `tsvault-open-${reference.id}`);
  if (temporaryFile.exists) temporaryFile.delete();
  temporaryFile.create();
  temporaryFile.write(base64ToBytes(plaintextBase64));
  return temporaryFile;
}

export async function collectEncryptedAttachmentsForTransfer(
  products: { id: string; attachments?: VaultAttachment[] }[],
  attachmentKey: string,
): Promise<VaultTransferAttachment[]> {
  const transferAttachments: VaultTransferAttachment[] = [];
  let totalBytes = 0;
  for (const product of products) {
    for (const reference of product.attachments ?? []) {
      assertAttachmentReference(reference);
      if (transferAttachments.length >= attachmentLimits().maxCount) {
        throw new Error(
          "Attachment transfer is limited to 12 files per vault package.",
        );
      }
      totalBytes += reference.size;
      if (totalBytes > MAX_TRANSFER_ATTACHMENT_BYTES) {
        throw new Error(
          "Attachment transfer is limited to 24 MB per vault package.",
        );
      }
      const storedFile = attachmentFile(reference.id);
      if (!storedFile.exists) {
        throw new Error(
          `Encrypted attachment ${reference.name} is unavailable.`,
        );
      }
      const stored = JSON.parse(await storedFile.text()) as StoredAttachment;
      if (
        stored.format !== ATTACHMENT_FORMAT ||
        stored.version !== ATTACHMENT_VERSION ||
        stored.metadata.id !== reference.id
      ) {
        throw new Error(
          `Encrypted attachment ${reference.name} failed its integrity check.`,
        );
      }
      const contentBase64 = await decryptData(
        stored.payload,
        attachmentKey,
        `${product.id}:${reference.id}`,
      );
      transferAttachments.push({
        productId: product.id,
        reference,
        contentBase64,
      });
    }
  }
  return transferAttachments;
}

export async function restoreEncryptedAttachmentFromTransfer(
  productId: string,
  transferAttachment: VaultTransferAttachment,
  attachmentKey: string,
): Promise<void> {
  const { reference, contentBase64 } = transferAttachment;
  assertAttachmentReference(reference);
  if (reference.size > MAX_ATTACHMENT_BYTES || !contentBase64) {
    throw new Error("Attachment transfer content is invalid.");
  }
  const payload = await encryptData(
    contentBase64,
    attachmentKey,
    `${productId}:${reference.id}`,
  );
  const stored: StoredAttachment = {
    format: ATTACHMENT_FORMAT,
    version: ATTACHMENT_VERSION,
    metadata: reference,
    payload,
  };
  const destination = attachmentFile(reference.id);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(JSON.stringify(stored));
}

export function deleteEncryptedAttachment(reference: VaultAttachment): void {
  const file = attachmentFile(reference.id);
  if (file.exists) file.delete();
}

export function clearEncryptedAttachments(): void {
  const directory = attachmentDirectory();
  if (directory.exists) directory.delete();
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
