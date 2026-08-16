export const MIN_TRANSFER_PASSPHRASE_LENGTH = 16;

export type TransferPassphraseStrength =
  | "too-short"
  | "fair"
  | "strong"
  | "excellent";

export function getTransferPassphraseStrength(
  passphrase: string,
): TransferPassphraseStrength {
  const trimmed = passphrase.trim();
  if (trimmed.length < MIN_TRANSFER_PASSPHRASE_LENGTH) return "too-short";
  const characterClasses = [
    /[a-z]/.test(trimmed),
    /[A-Z]/.test(trimmed),
    /\d/.test(trimmed),
    /[^A-Za-z\d]/.test(trimmed),
  ].filter(Boolean).length;
  if (trimmed.length >= 24 && characterClasses >= 3) return "excellent";
  if (trimmed.length >= 20 && characterClasses >= 2) return "strong";
  return "fair";
}
