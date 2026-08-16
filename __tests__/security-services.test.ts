const files = new Map<string, string>();
const directories = new Set<string>();

type Parent = { path: string };

class MockDirectory {
  path: string;

  constructor(parent: Parent | null, name: string) {
    this.path = parent ? `${parent.path}/${name}` : name;
  }

  get exists(): boolean {
    return directories.has(this.path);
  }

  create(): void {
    directories.add(this.path);
  }

  delete(): void {
    for (const key of [...files.keys()]) {
      if (key.startsWith(`${this.path}/`)) files.delete(key);
    }
    for (const key of [...directories]) {
      if (key === this.path || key.startsWith(`${this.path}/`))
        directories.delete(key);
    }
  }
}

class MockFile {
  path: string;

  constructor(parent: Parent, name: string) {
    this.path = `${parent.path}/${name}`;
  }

  get exists(): boolean {
    return files.has(this.path);
  }

  create(): void {
    files.set(this.path, "");
  }

  delete(): void {
    files.delete(this.path);
  }

  text(): string {
    return files.get(this.path) ?? "";
  }

  write(value: string): void {
    files.set(this.path, value);
  }
}

jest.mock("expo-file-system", () => ({
  Directory: MockDirectory,
  File: MockFile,
  Paths: { document: { path: "document" } },
}));

jest.mock("expo-document-picker", () => ({}));
const secureStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  setItemAsync: async (key: string, value: string) => {
    secureStore.set(key, value);
  },
  getItemAsync: async (key: string) => secureStore.get(key) ?? null,
  deleteItemAsync: async (key: string) => {
    secureStore.delete(key);
  },
}));
jest.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) =>
    Uint8Array.from({ length }, (_, i) => i + 1),
}));

import { encryptData } from "../lib/encryption";
import {
  attachmentLimits,
  getAttachmentTransferPreflight,
  verifyEncryptedAttachments,
} from "../lib/vault-attachments";
import {
  appendVaultAuditEvent,
  auditHistoryLimit,
  clearVaultAuditEvents,
  listVaultAuditEvents,
} from "../lib/vault-audit";
import { getTransferPassphraseStrength } from "../lib/transfer-strength";

describe("security service boundaries", () => {
  beforeEach(() => {
    files.clear();
    directories.clear();
    secureStore.clear();
  });

  it("keeps attachment limits bounded", () => {
    expect(attachmentLimits()).toEqual({
      maxBytes: 8 * 1024 * 1024,
      maxCount: 12,
    });
  });

  it("reports missing attachments and package-limit blockers locally", () => {
    const products = [
      {
        id: "record-1",
        attachments: [
          {
            id: "attachment-1",
            name: "receipt.pdf",
            mimeType: "application/pdf",
            size: 8 * 1024 * 1024,
            addedAt: new Date(0).toISOString(),
          },
        ],
      },
    ];
    expect(getAttachmentTransferPreflight(products)).toEqual({
      attachmentCount: 1,
      sourceBytes: 8 * 1024 * 1024,
      missingAttachmentNames: ["receipt.pdf"],
      isWithinPackageLimit: true,
    });

    const oversized = Array.from({ length: 13 }, (_, index) => ({
      id: `attachment-${index}`,
      name: `file-${index}`,
      mimeType: "text/plain",
      size: 2 * 1024 * 1024,
      addedAt: new Date(0).toISOString(),
    }));
    expect(
      getAttachmentTransferPreflight([{ attachments: oversized }])
        .isWithinPackageLimit,
    ).toBe(false);
  });

  it("authenticates stored attachment envelopes and distinguishes corrupt files", async () => {
    const key = "22".repeat(32);
    const reference = {
      id: "attachment-1",
      name: "receipt.pdf",
      mimeType: "application/pdf",
      size: 12,
      addedAt: new Date(0).toISOString(),
    };
    const payload = await encryptData(
      "encrypted attachment bytes",
      key,
      "record-1:attachment-1",
    );
    const directory = new MockDirectory(
      { path: "document" },
      "tsvault-encrypted-attachments",
    );
    directory.create();
    const file = new MockFile(directory, "attachment-1.tsattachment");
    file.write(
      JSON.stringify({
        format: "tsvaultkeysafe-attachment",
        version: 1,
        metadata: reference,
        payload,
      }),
    );
    await expect(
      verifyEncryptedAttachments(
        [{ id: "record-1", attachments: [reference] }],
        key,
      ),
    ).resolves.toEqual({
      attachmentCount: 1,
      verifiedCount: 1,
      missingNames: [],
      corruptNames: [],
    });

    file.write("not-json");
    await expect(
      verifyEncryptedAttachments(
        [{ id: "record-1", attachments: [reference] }],
        key,
      ),
    ).resolves.toEqual({
      attachmentCount: 1,
      verifiedCount: 0,
      missingNames: [],
      corruptNames: ["receipt.pdf"],
    });
  });

  it("round-trips encrypted audit events and retains only the bounded tail", async () => {
    const key = "33".repeat(32);
    await appendVaultAuditEvent(
      key,
      "vault-health-check",
      "succeeded",
      "verified",
    );
    await expect(listVaultAuditEvents(key)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "vault-health-check",
          outcome: "succeeded",
          detail: "verified",
        }),
      ]),
    );
    expect(auditHistoryLimit()).toBe(200);

    for (let index = 0; index < 205; index += 1) {
      await appendVaultAuditEvent(
        key,
        "vault-health-check",
        "started",
        `${index}`,
      );
    }
    const events = await listVaultAuditEvents(key);
    expect(events).toHaveLength(200);
    expect(events.some((event) => event.detail === "0")).toBe(false);
    expect(events.some((event) => event.detail === "204")).toBe(true);

    clearVaultAuditEvents();
    await expect(listVaultAuditEvents(key)).resolves.toEqual([]);
  });

  it("classifies passphrases without accepting a short transfer secret", () => {
    expect(getTransferPassphraseStrength("123456789012345")).toBe("too-short");
    expect(getTransferPassphraseStrength("a".repeat(16))).toBe("fair");
    expect(getTransferPassphraseStrength("Longer phrase 2026!!")).toBe(
      "strong",
    );
    expect(
      getTransferPassphraseStrength("A much longer passphrase 2026!"),
    ).toBe("excellent");
  });
});
