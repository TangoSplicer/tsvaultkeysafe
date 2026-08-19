import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getDatabaseStats } from "@/lib/database";
import {
  requireVaultAttachmentKey,
  requireVaultAuditKey,
  requireVaultDatabaseKey,
} from "@/lib/vault-service";
import {
  createAndShareVaultTransfer,
  getTransferPassphraseStrength,
  getVaultTransferPreflight,
  MIN_TRANSFER_PASSPHRASE_LENGTH,
  RecoveryGuideDetails,
  selectAndImportVaultTransfer,
  VaultTransferPreview,
  VaultTransferPreflight,
  shareRecoveryGuide,
  validateTransferPassphrase,
} from "@/lib/vault-transfer";
import {
  appendVaultAuditEvent,
  VaultAuditAction,
  VaultAuditOutcome,
} from "@/lib/vault-audit";

function logSecurityEvent(
  action: VaultAuditAction,
  outcome: VaultAuditOutcome,
): void {
  void requireVaultAuditKey()
    .then((key) => appendVaultAuditEvent(key, action, outcome))
    .catch(() => undefined);
}

export default function TransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [preflight, setPreflight] = useState<VaultTransferPreflight | null>(
    null,
  );
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportConfirmation, setExportConfirmation] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [status, setStatus] = useState("");
  const [recoveryGuide, setRecoveryGuide] =
    useState<RecoveryGuideDetails | null>(null);
  const passphraseStrength = getTransferPassphraseStrength(exportPassphrase);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const key = await requireVaultDatabaseKey();
      const [stats, transferPreflight] = await Promise.all([
        getDatabaseStats(),
        getVaultTransferPreflight(key),
      ]);
      setProductCount(stats.productCount);
      setPreflight(transferPreflight);
    } catch {
      router.replace("/unlock");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const createTransfer = async () => {
    if (preflight && !preflight.canCreateTransfer) {
      Alert.alert(
        "Transfer needs attention",
        preflight.blockingReason ??
          "The local transfer preflight did not complete.",
      );
      return;
    }
    if (!validateTransferPassphrase(exportPassphrase)) {
      Alert.alert(
        "Use a stronger transfer passphrase",
        `Choose at least ${MIN_TRANSFER_PASSPHRASE_LENGTH} characters. This passphrase is required to open the transfer on the new device.`,
      );
      return;
    }
    if (exportPassphrase !== exportConfirmation) {
      Alert.alert(
        "Passphrases do not match",
        "Enter the same transfer passphrase twice.",
      );
      return;
    }

    try {
      logSecurityEvent("transfer-export", "started");
      setWorking(true);
      setStatus("Requiring an active secure session");
      const [key, attachmentKey] = await Promise.all([
        requireVaultDatabaseKey(),
        requireVaultAttachmentKey(),
      ]);
      setStatus("Encrypting vault records and attachments for transfer");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const result = await createAndShareVaultTransfer(
        key,
        attachmentKey,
        exportPassphrase,
        productCount,
      );
      setStatus("Encrypted transfer ready");
      setExportPassphrase("");
      setExportConfirmation("");
      if (result.fileName && result.summary) {
        setRecoveryGuide({
          fileName: result.fileName,
          summary: result.summary,
        });
      }
      const fingerprint = result.summary?.fingerprint
        ? `\nVerification fingerprint: ${result.summary.fingerprint}`
        : "";
      const attachmentCount = result.summary?.attachmentCount ?? 0;
      logSecurityEvent("transfer-export", "succeeded");
      Alert.alert(
        "Encrypted transfer ready",
        `${result.recordCount} encrypted record${result.recordCount === 1 ? "" : "s"} and ${attachmentCount} encrypted attachment${attachmentCount === 1 ? "" : "s"} were prepared. Save the .tsvault file and keep its transfer passphrase separate from the file.${fingerprint}`,
      );
    } catch (error) {
      logSecurityEvent("transfer-export", "failed");
      Alert.alert(
        "Unable to create transfer",
        error instanceof Error
          ? error.message
          : "Try again while the vault remains unlocked.",
      );
    } finally {
      setWorking(false);
    }
  };

  const importTransfer = async () => {
    if (productCount > 0) {
      Alert.alert(
        "Import needs an empty vault",
        "For safety, imports are allowed only into a newly created, empty vault. Export your current records first if you need to keep them.",
      );
      return;
    }
    if (!validateTransferPassphrase(importPassphrase)) {
      Alert.alert(
        "Transfer passphrase required",
        `Enter the transfer passphrase of at least ${MIN_TRANSFER_PASSPHRASE_LENGTH} characters.`,
      );
      return;
    }

    try {
      logSecurityEvent("transfer-import", "started");
      setWorking(true);
      setStatus("Requiring an active secure session");
      const [key, attachmentKey] = await Promise.all([
        requireVaultDatabaseKey(),
        requireVaultAttachmentKey(),
      ]);
      setStatus("Choose your encrypted transfer file");
      const result = await selectAndImportVaultTransfer(
        key,
        attachmentKey,
        importPassphrase,
        async ({ fileName, summary }: VaultTransferPreview) =>
          new Promise((resolve) => {
            const records =
              summary.recordCount === null
                ? "legacy/unknown"
                : summary.recordCount;
            const attachments =
              summary.attachmentCount === null
                ? "legacy/unknown"
                : summary.attachmentCount;
            const fingerprint = summary.fingerprint
              ? `\nFingerprint: ${summary.fingerprint}`
              : "";
            Alert.alert(
              "Review secure import",
              `${fileName}\n\nRecords: ${records}\nAttachments: ${attachments}${fingerprint}\n\nThe encrypted payload and transfer passphrase have been checked. Import into this empty vault now?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                { text: "Import securely", onPress: () => resolve(true) },
              ],
            );
          }),
      );
      if (!result) {
        setStatus("Import cancelled");
        return;
      }
      setStatus("Checking transfer integrity and restoring records");
      setImportPassphrase("");
      await load();
      const fingerprint = result.summary?.fingerprint
        ? `\nVerification fingerprint confirmed: ${result.summary.fingerprint}`
        : "";
      const attachmentCount = result.summary?.attachmentCount ?? 0;
      logSecurityEvent("transfer-import", "succeeded");
      Alert.alert(
        "Transfer restored",
        `${result.recordCount} encrypted record${result.recordCount === 1 ? "" : "s"} and ${attachmentCount} encrypted attachment${attachmentCount === 1 ? "" : "s"} were verified and restored to this device.${fingerprint}`,
      );
      router.back();
    } catch (error) {
      logSecurityEvent("transfer-import", "failed");
      Alert.alert(
        "Import blocked",
        error instanceof Error
          ? error.message
          : "The transfer could not be verified.",
      );
    } finally {
      setWorking(false);
    }
  };

  const shareGuide = async () => {
    if (!recoveryGuide) return;
    try {
      setWorking(true);
      setStatus("Preparing non-secret recovery guide");
      await shareRecoveryGuide(recoveryGuide);
      setStatus("Recovery guide ready");
    } catch (error) {
      Alert.alert(
        "Unable to create recovery guide",
        error instanceof Error
          ? error.message
          : "Try again while the vault remains unlocked.",
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ThemedView
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top + 10, 28) },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Transfer vault
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Move ciphertext, not readable records. No account or service
              receives this file.
            </ThemedText>
          </View>

          <Section title="How the security check works">
            <Card>
              <ThemedText style={styles.copy}>
                The .tsvault file is encrypted with a separate transfer
                passphrase using PBKDF2-SHA-256 and authenticated encryption.
                The file alone cannot reveal your licenses. Import is allowed
                only after this device has a locally unlocked vault and the
                file’s integrity and passphrase have both been verified.
              </ThemedText>
            </Card>
          </Section>

          <Section title="Create encrypted transfer">
            <Card>
              <ThemedText style={styles.helper}>
                {productCount} record{productCount === 1 ? "" : "s"} will be
                encrypted into a .tsvault file. Use a new transfer passphrase;
                do not reuse your 8-digit vault PIN. The Android share sheet can
                send this ciphertext directly to a nearby device without an app
                account. Managed receipt and warranty attachments are included
                and re-encrypted for the new device. Transfer packages are
                limited to 24 MB of source attachment content.
              </ThemedText>
              {preflight && (
                <View
                  style={[
                    styles.preflight,
                    !preflight.canCreateTransfer && styles.preflightBlocked,
                  ]}
                >
                  <ThemedText style={styles.preflightTitle}>
                    {preflight.canCreateTransfer
                      ? "Local transfer preflight passed"
                      : "Local transfer preflight needs attention"}
                  </ThemedText>
                  <ThemedText style={styles.preflightCopy}>
                    {preflight.recordCount} record
                    {preflight.recordCount === 1 ? "" : "s"} ·{" "}
                    {preflight.attachmentCount} attachment
                    {preflight.attachmentCount === 1 ? "" : "s"} · about{" "}
                    {formatBytes(preflight.estimatedPackageBytes)} temporary
                    storage required.
                  </ThemedText>
                  {!preflight.canCreateTransfer && (
                    <ThemedText style={styles.preflightCopy}>
                      {preflight.blockingReason}
                    </ThemedText>
                  )}
                </View>
              )}
              <ThemedText style={styles.label}>Transfer passphrase</ThemedText>
              <TextInput
                value={exportPassphrase}
                onChangeText={setExportPassphrase}
                secureTextEntry
                autoComplete="off"
                textContentType="newPassword"
                placeholder={`At least ${MIN_TRANSFER_PASSPHRASE_LENGTH} characters`}
                placeholderTextColor="#64748B"
                style={styles.input}
                accessibilityLabel="Transfer passphrase"
              />
              <ThemedText style={styles.passphraseStrength}>
                Passphrase strength: {passphraseStrength}
              </ThemedText>
              <ThemedText style={styles.label}>
                Confirm transfer passphrase
              </ThemedText>
              <TextInput
                value={exportConfirmation}
                onChangeText={setExportConfirmation}
                secureTextEntry
                autoComplete="off"
                textContentType="newPassword"
                placeholder="Re-enter transfer passphrase"
                placeholderTextColor="#64748B"
                style={styles.input}
                accessibilityLabel="Confirm transfer passphrase"
              />
              <Pressable
                disabled={
                  working ||
                  (preflight !== null && !preflight.canCreateTransfer)
                }
                onPress={() => void createTransfer()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed ||
                    working ||
                    (preflight !== null && !preflight.canCreateTransfer)) &&
                    styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.primaryButtonText}>
                  Create encrypted transfer
                </ThemedText>
              </Pressable>
            </Card>
          </Section>

          {recoveryGuide && (
            <Section title="Offline recovery guide">
              <Card>
                <ThemedText style={styles.helper}>
                  Save or print this separate guide after creating the encrypted
                  transfer. It contains restore instructions and a verification
                  fingerprint, but never your PIN, passphrase, master key, or
                  readable vault records.
                </ThemedText>
                <ThemedText style={styles.fingerprint}>
                  Fingerprint:{" "}
                  {recoveryGuide.summary.fingerprint ?? "Legacy transfer"}
                </ThemedText>
                <Pressable
                  disabled={working}
                  onPress={() => void shareGuide()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    (pressed || working) && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.secondaryButtonText}>
                    Save offline recovery guide
                  </ThemedText>
                </Pressable>
              </Card>
            </Section>
          )}

          <Section title="Restore on a new device">
            <Card>
              <ThemedText style={styles.helper}>
                First install TSVaultKeySafe and create a new local vault PIN on
                the new device. Then return here while that vault is unlocked.
                Import is intentionally blocked if this vault already has
                records, preventing accidental mixing or overwriting.
              </ThemedText>
              <ThemedText style={styles.label}>Transfer passphrase</ThemedText>
              <TextInput
                value={importPassphrase}
                onChangeText={setImportPassphrase}
                secureTextEntry
                autoComplete="off"
                textContentType="password"
                placeholder="Passphrase used for the transfer"
                placeholderTextColor="#64748B"
                style={styles.input}
                accessibilityLabel="Transfer passphrase for import"
              />
              <Pressable
                disabled={working || productCount > 0}
                onPress={() => void importTransfer()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (pressed || working || productCount > 0) && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Select and verify transfer file
                </ThemedText>
              </Pressable>
              {productCount > 0 && (
                <ThemedText style={styles.blockedNote}>
                  Import is available only in an empty vault.
                </ThemedText>
              )}
            </Card>
          </Section>

          {working && (
            <View style={styles.status}>
              <ActivityIndicator size="small" color="#14B8A6" />
              <ThemedText style={styles.statusText}>{status}</ThemedText>
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingTop: 8, paddingBottom: 128 },
  header: { marginBottom: 24 },
  title: { fontSize: 30 },
  subtitle: { marginTop: 6, lineHeight: 21, opacity: 0.68 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 17, marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    padding: 15,
  },
  copy: { fontSize: 14, lineHeight: 21, opacity: 0.76 },
  helper: { fontSize: 12, lineHeight: 18, opacity: 0.66, marginBottom: 14 },
  preflight: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#99F6E4",
    marginBottom: 4,
  },
  preflightBlocked: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  preflightTitle: { color: "#0F766E", fontSize: 12, fontWeight: "800" },
  preflightCopy: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  label: { fontSize: 13, fontWeight: "800", marginTop: 10, marginBottom: 7 },
  passphraseStrength: {
    fontSize: 12,
    lineHeight: 18,
    color: "#0F766E",
    marginTop: -2,
    marginBottom: 2,
    textTransform: "capitalize",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.48)",
    borderRadius: 12,
    color: "#0F172A",
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 18,
    backgroundColor: "#0F766E",
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#14B8A6",
    borderRadius: 12,
    marginTop: 18,
    backgroundColor: "#ECFDF5",
  },
  secondaryButtonText: { color: "#0F766E", fontWeight: "800" },
  fingerprint: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#0F766E",
    marginBottom: 4,
  },
  blockedNote: {
    marginTop: 10,
    color: "#B45309",
    fontSize: 12,
    lineHeight: 18,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    justifyContent: "center",
    paddingVertical: 14,
  },
  statusText: { fontSize: 13, opacity: 0.7 },
  pressed: { opacity: 0.62 },
});
