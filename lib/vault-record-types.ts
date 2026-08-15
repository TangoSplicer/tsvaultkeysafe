export type VaultRecordType =
  | "License"
  | "Credential"
  | "Identity"
  | "Financial"
  | "Recovery"
  | "SecureNote";

export const vaultRecordTypes: { type: VaultRecordType; label: string }[] = [
  { type: "License", label: "Licence / product" },
  { type: "Credential", label: "Credential" },
  { type: "Identity", label: "Identity document" },
  { type: "Financial", label: "Financial reference" },
  { type: "Recovery", label: "Recovery item" },
  { type: "SecureNote", label: "Secure note" },
];

export interface SecureRecordFieldLabels {
  title: string;
  provider: string;
  primaryLabel: string;
  primaryPlaceholder: string;
  secondaryLabel: string;
  secondaryPlaceholder: string;
}

export function normalizeVaultRecordType(
  recordType?: VaultRecordType,
): VaultRecordType {
  return recordType ?? "License";
}

export function recordTypeLabel(recordType?: VaultRecordType): string {
  const normalized = normalizeVaultRecordType(recordType);
  return (
    vaultRecordTypes.find((entry) => entry.type === normalized)?.label ??
    "Licence / product"
  );
}

export function secureRecordFieldLabels(
  recordType?: VaultRecordType,
): SecureRecordFieldLabels {
  switch (normalizeVaultRecordType(recordType)) {
    case "Credential":
      return {
        title: "Credential name",
        provider: "Service or provider",
        primaryLabel: "Primary secret",
        primaryPlaceholder: "Password, API key, or access token",
        secondaryLabel: "Secondary secret or reference",
        secondaryPlaceholder: "Username, recovery code, or account reference",
      };
    case "Identity":
      return {
        title: "Document name",
        provider: "Issuing authority",
        primaryLabel: "Document number",
        primaryPlaceholder: "Passport, licence, or ID number",
        secondaryLabel: "Secondary reference",
        secondaryPlaceholder: "Issue reference or additional identifier",
      };
    case "Financial":
      return {
        title: "Financial item name",
        provider: "Institution or provider",
        primaryLabel: "Primary reference",
        primaryPlaceholder: "Account, policy, or customer reference",
        secondaryLabel: "Secondary reference",
        secondaryPlaceholder: "Support reference or secure note",
      };
    case "Recovery":
      return {
        title: "Recovery item name",
        provider: "Service or source",
        primaryLabel: "Recovery secret",
        primaryPlaceholder: "Backup code, recovery key, or phrase reference",
        secondaryLabel: "Secondary recovery reference",
        secondaryPlaceholder: "Location hint or additional code",
      };
    case "SecureNote":
      return {
        title: "Secure note title",
        provider: "Source or context",
        primaryLabel: "Protected content",
        primaryPlaceholder: "Private content to encrypt",
        secondaryLabel: "Optional reference",
        secondaryPlaceholder: "Related identifier or short reference",
      };
    case "License":
    default:
      return {
        title: "Product name",
        provider: "Vendor",
        primaryLabel: "License key",
        primaryPlaceholder: "Paste key",
        secondaryLabel: "Serial number",
        secondaryPlaceholder: "Optional",
      };
  }
}

export function isVaultRecordType(value: unknown): value is VaultRecordType {
  return vaultRecordTypes.some((entry) => entry.type === value);
}
