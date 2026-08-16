import { Directory, File, Paths } from "expo-file-system";

import { decryptData, encryptData } from "./encryption";

const AUDIT_DIRECTORY_NAME = "tsvault-encrypted-security-audit";
const AUDIT_FILE_NAME = "events.tsaudit";
const AUDIT_AAD = "tsvaultkeysafe-local-security-audit-v1";
const AUDIT_FORMAT = "tsvaultkeysafe-security-audit";
const AUDIT_VERSION = 1;
const MAX_AUDIT_EVENTS = 200;

export type VaultAuditAction =
  | "unlock"
  | "biometric-unlock"
  | "pin-change"
  | "transfer-export"
  | "transfer-import"
  | "snapshot-create"
  | "snapshot-restore"
  | "attachment-integrity-check"
  | "vault-health-check"
  | "vault-wipe"
  | "protected-value-copy"
  | "protected-attachment-open";

export type VaultAuditOutcome = "started" | "succeeded" | "blocked" | "failed";

export interface VaultAuditEvent {
  id: string;
  occurredAt: string;
  action: VaultAuditAction;
  outcome: VaultAuditOutcome;
  detail?: string;
}

interface AuditEnvelope {
  format: typeof AUDIT_FORMAT;
  version: typeof AUDIT_VERSION;
  payload: ReturnType<typeof encryptData> extends Promise<infer T> ? T : never;
}

function auditDirectory(): Directory {
  return new Directory(Paths.document, AUDIT_DIRECTORY_NAME);
}

function auditFile(): File {
  const directory = auditDirectory();
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return new File(directory, AUDIT_FILE_NAME);
}

async function readEvents(auditKey: string): Promise<VaultAuditEvent[]> {
  const file = auditFile();
  if (!file.exists) return [];
  const envelope = JSON.parse(await file.text()) as AuditEnvelope;
  if (
    envelope.format !== AUDIT_FORMAT ||
    envelope.version !== AUDIT_VERSION ||
    !envelope.payload
  ) {
    throw new Error("The local security audit log format is invalid.");
  }
  const events = JSON.parse(
    await decryptData(envelope.payload, auditKey, AUDIT_AAD),
  ) as unknown;
  if (!Array.isArray(events)) {
    throw new Error("The local security audit log integrity check failed.");
  }
  return events.filter(isAuditEvent).slice(-MAX_AUDIT_EVENTS);
}

function isAuditEvent(value: unknown): value is VaultAuditEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<VaultAuditEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.action === "string" &&
    typeof event.outcome === "string" &&
    (event.detail === undefined || typeof event.detail === "string")
  );
}

export async function appendVaultAuditEvent(
  auditKey: string,
  action: VaultAuditAction,
  outcome: VaultAuditOutcome,
  detail?: string,
): Promise<void> {
  const events = await readEvents(auditKey);
  const event: VaultAuditEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    occurredAt: new Date().toISOString(),
    action,
    outcome,
    ...(detail ? { detail: detail.slice(0, 120) } : {}),
  };
  const payload = await encryptData(
    JSON.stringify([...events, event].slice(-MAX_AUDIT_EVENTS)),
    auditKey,
    AUDIT_AAD,
  );
  const file = auditFile();
  if (file.exists) file.delete();
  file.create();
  file.write(
    JSON.stringify({
      format: AUDIT_FORMAT,
      version: AUDIT_VERSION,
      payload,
    } satisfies AuditEnvelope),
  );
}

export async function listVaultAuditEvents(
  auditKey: string,
): Promise<VaultAuditEvent[]> {
  return (await readEvents(auditKey)).sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
}

export function clearVaultAuditEvents(): void {
  const directory = auditDirectory();
  if (directory.exists) directory.delete();
}

export function auditHistoryLimit(): number {
  return MAX_AUDIT_EVENTS;
}
