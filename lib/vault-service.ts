import { deriveKeys, EncryptionKeys, getMasterKey } from "./encryption";
import { isRealVaultSession } from "./vault-session";

export async function requireVaultKeys(): Promise<EncryptionKeys> {
  if (!isRealVaultSession()) {
    throw new Error("Real vault session is unavailable");
  }
  const masterKey = await getMasterKey();
  if (!masterKey) {
    throw new Error("Vault key is unavailable");
  }
  return deriveKeys(masterKey);
}

export async function requireVaultDatabaseKey(): Promise<string> {
  return (await requireVaultKeys()).databaseKey;
}

export async function requireVaultAttachmentKey(): Promise<string> {
  return (await requireVaultKeys()).attachmentKey;
}

export async function requireVaultSnapshotKey(): Promise<string> {
  return (await requireVaultKeys()).snapshotKey;
}

export async function requireVaultAuditKey(): Promise<string> {
  return (await requireVaultKeys()).auditKey;
}
