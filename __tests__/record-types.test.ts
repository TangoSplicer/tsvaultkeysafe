import {
  isVaultRecordType,
  normalizeVaultRecordType,
  recordTypeLabel,
  secureRecordFieldLabels,
} from "../lib/vault-record-types";

describe("secure vault record types", () => {
  it("defaults legacy records to the licence type", () => {
    expect(normalizeVaultRecordType()).toBe("License");
    expect(recordTypeLabel()).toBe("Licence / product");
  });

  it("recognizes only supported encrypted record types", () => {
    expect(isVaultRecordType("Credential")).toBe(true);
    expect(isVaultRecordType("Identity")).toBe(true);
    expect(isVaultRecordType("Financial")).toBe(true);
    expect(isVaultRecordType("Recovery")).toBe(true);
    expect(isVaultRecordType("SecureNote")).toBe(true);
    expect(isVaultRecordType("Password")).toBe(false);
    expect(isVaultRecordType(undefined)).toBe(false);
  });

  it("uses non-licence field labels without altering stored field names", () => {
    const labels = secureRecordFieldLabels("Credential");
    expect(labels.primaryLabel).toBe("Primary secret");
    expect(labels.secondaryLabel).toBe("Secondary secret or reference");
    expect(secureRecordFieldLabels("Identity").primaryLabel).toBe(
      "Document number",
    );
    expect(secureRecordFieldLabels("SecureNote").primaryLabel).toBe(
      "Protected content",
    );
  });
});
