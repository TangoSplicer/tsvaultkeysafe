import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { SensitiveActionGate } from "@/components/sensitive-action-gate";
import { ThemedView } from "@/components/themed-view";
import {
  clearAllProducts,
  getAllProducts,
  getDatabaseStats,
  runVaultHealthCheck,
} from "@/lib/database";
import { wipeEncryptionData } from "@/lib/encryption";
import {
  AUTO_LOCK_LIMITS,
  clearVaultAuthData,
  disableVaultBiometric,
  enableVaultBiometric,
  getVaultAutoLockTimeout,
  getVaultAuthState,
  isVaultLocalRemindersEnabled,
  setVaultAutoLockTimeout,
  setVaultLocalRemindersEnabled,
} from "@/lib/vault-auth";
import {
  cancelLocalVaultReminders,
  getLocalVaultReminderCount,
  scheduleLocalVaultReminders,
} from "@/lib/local-reminders";
import {
  requireVaultAttachmentKey,
  requireVaultAuditKey,
  requireVaultDatabaseKey,
  requireVaultSnapshotKey,
} from "@/lib/vault-service";
import {
  clearEncryptedAttachments,
  verifyEncryptedAttachments,
} from "@/lib/vault-attachments";
import {
  clearLocalRecoverySnapshots,
  createLocalRecoverySnapshot,
  listLocalRecoverySnapshots,
  LocalSnapshotSummary,
  localSnapshotHistoryLimit,
  restoreLocalRecoverySnapshot,
} from "@/lib/vault-snapshots";
import { endVaultSession } from "@/lib/vault-session";
import {
  appendVaultAuditEvent,
  clearVaultAuditEvents,
  listVaultAuditEvents,
  VaultAuditEvent,
} from "@/lib/vault-audit";

const lockOptions = [
  { label: "15 sec", value: 15_000 },
  { label: "1 min", value: AUTO_LOCK_LIMITS.DEFAULT_AUTO_LOCK_MS },
  { label: "5 min", value: 5 * 60_000 },
  { label: "15 min", value: AUTO_LOCK_LIMITS.MAX_AUTO_LOCK_MS },
];

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [autoLock, setAutoLock] = useState(
    AUTO_LOCK_LIMITS.DEFAULT_AUTO_LOCK_MS,
  );
  const [localRemindersEnabled, setLocalRemindersEnabled] = useState(false);
  const [scheduledReminderCount, setScheduledReminderCount] = useState(0);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [snapshots, setSnapshots] = useState<LocalSnapshotSummary[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [snapshotWorking, setSnapshotWorking] = useState(false);
  const [auditEvents, setAuditEvents] = useState<VaultAuditEvent[]>([]);
  const [sensitiveAction, setSensitiveAction] = useState<
    "transfer" | "wipe" | null
  >(null);

  const logAudit = (
    action: VaultAuditEvent["action"],
    outcome: VaultAuditEvent["outcome"],
    detail?: string,
  ) => {
    void requireVaultAuditKey()
      .then((key) => appendVaultAuditEvent(key, action, outcome, detail))
      .catch(() => undefined);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [state, stats, timeout, remindersEnabled, reminderCount] =
        await Promise.all([
          getVaultAuthState(),
          getDatabaseStats(),
          getVaultAutoLockTimeout(),
          isVaultLocalRemindersEnabled(),
          getLocalVaultReminderCount(),
        ]);
      setPinSet(state.isPinSet);
      setBiometricAvailable(state.isBiometricAvailable);
      setBiometricEnabled(state.isBiometricEnabled);
      setProductCount(stats.productCount);
      setAutoLock(timeout);
      setLocalRemindersEnabled(remindersEnabled);
      setScheduledReminderCount(reminderCount);
      setSnapshots(listLocalRecoverySnapshots());
      try {
        const auditKey = await requireVaultAuditKey();
        setAuditEvents(await listVaultAuditEvents(auditKey));
      } catch {
        setAuditEvents([]);
      }
    } catch {
      router.replace("/unlock");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleBiometric = async (enabled: boolean) => {
    try {
      if (enabled) await enableVaultBiometric();
      else await disableVaultBiometric();
      setBiometricEnabled(enabled);
    } catch (error) {
      Alert.alert(
        "Unable to update biometrics",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const chooseAutoLock = async (value: number) => {
    try {
      await setVaultAutoLockTimeout(value);
      setAutoLock(value);
    } catch {
      Alert.alert("Unable to update auto-lock", "Please try again.");
    }
  };

  const toggleLocalReminders = async (enabled: boolean) => {
    try {
      if (enabled) {
        const key = await requireVaultDatabaseKey();
        const products = await getAllProducts(key);
        const count = await scheduleLocalVaultReminders(products);
        await setVaultLocalRemindersEnabled(true);
        setScheduledReminderCount(count);
      } else {
        await cancelLocalVaultReminders();
        await setVaultLocalRemindersEnabled(false);
        setScheduledReminderCount(0);
      }
      setLocalRemindersEnabled(enabled);
    } catch (error) {
      Alert.alert(
        "Unable to update local reminders",
        error instanceof Error
          ? error.message
          : "Try again while the vault remains unlocked.",
      );
    }
  };

  const checkVaultHealth = async () => {
    try {
      setCheckingHealth(true);
      setHealthStatus(
        "Checking records and encrypted attachments on this device…",
      );
      const [key, attachmentKey] = await Promise.all([
        requireVaultDatabaseKey(),
        requireVaultAttachmentKey(),
      ]);
      const report = await runVaultHealthCheck(key);
      const products = await getAllProducts(key);
      const attachments = await verifyEncryptedAttachments(
        products,
        attachmentKey,
      );
      const attachmentIssueCount =
        attachments.missingNames.length + attachments.corruptNames.length;
      if (attachmentIssueCount > 0) {
        logAudit(
          "attachment-integrity-check",
          "blocked",
          `${attachmentIssueCount} attachment issue${attachmentIssueCount === 1 ? "" : "s"}`,
        );
        setHealthStatus(
          `${report.productCount} record${report.productCount === 1 ? "" : "s"} verified, but ${attachmentIssueCount} managed attachment${attachmentIssueCount === 1 ? "" : "s"} need attention.`,
        );
      } else {
        logAudit(
          "attachment-integrity-check",
          "succeeded",
          "All attachments verified",
        );
        setHealthStatus(
          `${report.productCount} record${report.productCount === 1 ? "" : "s"} and ${attachments.verifiedCount} attachment${attachments.verifiedCount === 1 ? "" : "s"} verified locally at ${new Date(report.checkedAt).toLocaleTimeString()}.`,
        );
      }
      logAudit("vault-health-check", "succeeded");
    } catch (error) {
      logAudit("vault-health-check", "failed");
      setHealthStatus(null);
      Alert.alert(
        "Vault health needs attention",
        error instanceof Error
          ? error.message
          : "The local integrity check could not complete.",
      );
    } finally {
      setCheckingHealth(false);
    }
  };

  const createSnapshot = async (reason: string) => {
    try {
      setSnapshotWorking(true);
      setSnapshotStatus("Creating encrypted local recovery snapshot…");
      const [databaseKey, attachmentKey, snapshotKey] = await Promise.all([
        requireVaultDatabaseKey(),
        requireVaultAttachmentKey(),
        requireVaultSnapshotKey(),
      ]);
      const snapshot = await createLocalRecoverySnapshot(
        databaseKey,
        attachmentKey,
        snapshotKey,
        reason,
      );
      setSnapshots(listLocalRecoverySnapshots());
      setSnapshotStatus(
        `${snapshot.recordCount} record${snapshot.recordCount === 1 ? "" : "s"} and ${snapshot.attachmentCount} attachment${snapshot.attachmentCount === 1 ? "" : "s"} protected locally at ${new Date(snapshot.createdAt).toLocaleTimeString()}.`,
      );
      logAudit("snapshot-create", "succeeded");
    } catch (error) {
      logAudit("snapshot-create", "failed");
      setSnapshotStatus(null);
      Alert.alert(
        "Unable to create local snapshot",
        error instanceof Error
          ? error.message
          : "Try again while the vault remains unlocked.",
      );
    } finally {
      setSnapshotWorking(false);
    }
  };

  const restoreLatestSnapshot = () => {
    const latest = snapshots[0];
    if (!latest) return;
    Alert.alert(
      "Restore local snapshot?",
      `This replaces the current vault records and managed attachments with the local snapshot from ${new Date(latest.createdAt).toLocaleString()}. A fresh snapshot is created first so the current state can still be recovered.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create safeguard and restore",
          style: "destructive",
          onPress: async () => {
            let safeguard: LocalSnapshotSummary | null = null;
            let keys: [string, string, string] | null = null;
            try {
              setSnapshotWorking(true);
              setSnapshotStatus("Creating safeguard snapshot before restore…");
              keys = await Promise.all([
                requireVaultDatabaseKey(),
                requireVaultAttachmentKey(),
                requireVaultSnapshotKey(),
              ]);
              const [databaseKey, attachmentKey, snapshotKey] = keys;
              safeguard = await createLocalRecoverySnapshot(
                databaseKey,
                attachmentKey,
                snapshotKey,
                "Before restoring a local snapshot",
              );
              setSnapshotStatus(
                "Verifying and restoring encrypted local snapshot…",
              );
              await restoreLocalRecoverySnapshot(
                latest,
                databaseKey,
                attachmentKey,
                snapshotKey,
              );
              await load();
              setSnapshotStatus("Local snapshot restored and verified.");
              logAudit("snapshot-restore", "succeeded");
            } catch (error) {
              logAudit("snapshot-restore", "failed");
              let message =
                error instanceof Error
                  ? error.message
                  : "The local snapshot could not be restored safely.";
              if (safeguard && keys) {
                try {
                  setSnapshotStatus(
                    "Restore stopped. Recovering the prior vault state…",
                  );
                  await restoreLocalRecoverySnapshot(safeguard, ...keys);
                  await load();
                  message = `${message}\n\nThe prior vault state was restored from the automatic safeguard.`;
                } catch {
                  message = `${message}\n\nThe automatic safeguard could not be restored. Do not make further changes; retry from Security settings.`;
                }
              }
              setSnapshotStatus(null);
              Alert.alert("Snapshot restore blocked", message);
            } finally {
              setSnapshotWorking(false);
            }
          },
        },
      ],
    );
  };

  const lockNow = () => {
    endVaultSession();
    router.replace("/unlock");
  };

  const requestTransfer = () => {
    setSensitiveAction("transfer");
  };

  const requestWipe = () => {
    setSensitiveAction("wipe");
  };

  const confirmWipeVault = () => {
    Alert.alert(
      "Permanently wipe vault?",
      `This removes all ${productCount} encrypted records, the vault key, PIN, and security preferences from this device. It cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe permanently",
          style: "destructive",
          onPress: async () => {
            try {
              clearEncryptedAttachments();
              clearLocalRecoverySnapshots();
              clearVaultAuditEvents();
              await clearAllProducts();
              await clearVaultAuthData();
              await wipeEncryptionData();
              endVaultSession();
              router.replace("/setup");
            } catch {
              Alert.alert(
                "Wipe incomplete",
                "The vault could not be fully cleared. Restart the app and try again.",
              );
            }
          },
        },
      ],
    );
  };

  const completeSensitiveAction = () => {
    const action = sensitiveAction;
    setSensitiveAction(null);
    if (action === "transfer") {
      router.push("/transfer");
    } else if (action === "wipe") {
      logAudit("vault-wipe", "started");
      confirmWipeVault();
    }
  };

  if (loading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  return (
    <>
      <ThemedView
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top + 10, 28) },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Security
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Controls protecting this vault on this device.
            </ThemedText>
          </View>
          <Section title="Protection status">
            <Card>
              <StatusRow
                label="Vault encryption"
                value="XChaCha20-Poly1305"
                active
              />
              <StatusRow
                label="Data storage"
                value="Local only"
                active
                divider
              />
              <StatusRow
                label="Screen capture"
                value="Blocked while open"
                active
                divider
              />
              <StatusRow
                label="Background handling"
                value="Locks immediately"
                active
                divider
              />
            </Card>
          </Section>
          <Section title="Authentication">
            <Card>
              <StatusRow
                label="8-digit vault PIN"
                value={pinSet ? "Enabled" : "Missing"}
                active={pinSet}
              />
              {biometricAvailable && (
                <View style={[styles.row, styles.divider]}>
                  <View>
                    <ThemedText style={styles.rowLabel}>
                      Biometric unlock
                    </ThemedText>
                    <ThemedText style={styles.helper}>
                      Uses the device biometric prompt only.
                    </ThemedText>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={(value) => void toggleBiometric(value)}
                    trackColor={{ false: "#94A3B8", true: "#14B8A6" }}
                  />
                </View>
              )}
              <Pressable
                onPress={() => router.push("/change-pin")}
                style={({ pressed }) => [
                  styles.pinChangeButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Change vault PIN"
              >
                <ThemedText style={styles.pinChangeText}>
                  Change vault PIN
                </ThemedText>
                <ThemedText style={styles.pinChangeHelper}>
                  Verify the current PIN before changing the unlock check.
                </ThemedText>
              </Pressable>
            </Card>
          </Section>
          <Section title="Auto-lock">
            <Card>
              <ThemedText style={styles.helper}>
                The vault always locks when the app leaves the foreground.
                Choose the inactivity limit while it remains open.
              </ThemedText>
              <View style={styles.optionGrid}>
                {lockOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => void chooseAutoLock(option.value)}
                    style={[
                      styles.option,
                      autoLock === option.value && styles.optionSelected,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        autoLock === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </Card>
          </Section>
          <Section title="Private local reminders">
            <Card>
              <View style={styles.row}>
                <View style={styles.reminderCopy}>
                  <ThemedText style={styles.rowLabel}>
                    Upcoming date reminders
                  </ThemedText>
                  <ThemedText style={styles.helperInline}>
                    The phone schedules generic local alerts 30 and 7 days
                    before a renewal, expiry, or warranty date. Alerts never
                    show product names, vendors, or licence details.
                  </ThemedText>
                </View>
                <Switch
                  value={localRemindersEnabled}
                  onValueChange={(value) => void toggleLocalReminders(value)}
                  trackColor={{ false: "#94A3B8", true: "#14B8A6" }}
                />
              </View>
              <StatusRow
                label="Scheduled on this device"
                value={`${scheduledReminderCount} generic alert${scheduledReminderCount === 1 ? "" : "s"}`}
                active={localRemindersEnabled}
                divider
              />
            </Card>
          </Section>
          <Section title="Vault health">
            <Card>
              <ThemedText style={styles.helper}>
                Check the local SQLite structure and authenticate-read every
                encrypted record. Nothing leaves this device.
              </ThemedText>
              {healthStatus && (
                <ThemedText style={styles.healthStatus}>
                  {healthStatus}
                </ThemedText>
              )}
              <Pressable
                disabled={checkingHealth}
                onPress={() => void checkVaultHealth()}
                style={({ pressed }) => [
                  styles.healthButton,
                  (pressed || checkingHealth) && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.healthButtonText}>
                  {checkingHealth
                    ? "Checking vault…"
                    : "Run local vault health check"}
                </ThemedText>
              </Pressable>
            </Card>
          </Section>
          <Section title="Local recovery snapshots">
            <Card>
              <ThemedText style={styles.helper}>
                Keep up to {localSnapshotHistoryLimit()} encrypted recovery
                points in this app’s private storage. Snapshots use a separate
                local key, are never uploaded, and are removed with a permanent
                vault wipe.
              </ThemedText>
              <StatusRow
                label="Local recovery points"
                value={`${snapshots.length} of ${localSnapshotHistoryLimit()}`}
                active={snapshots.length > 0}
                divider
              />
              {snapshots[0] && (
                <ThemedText style={styles.snapshotInfo}>
                  Latest: {snapshots[0].recordCount} record
                  {snapshots[0].recordCount === 1 ? "" : "s"},{" "}
                  {snapshots[0].attachmentCount} attachment
                  {snapshots[0].attachmentCount === 1 ? "" : "s"} ·{" "}
                  {new Date(snapshots[0].createdAt).toLocaleString()}
                </ThemedText>
              )}
              {snapshots[0] && snapshotAgeDays(snapshots[0].createdAt) > 7 && (
                <ThemedText style={styles.snapshotWarning}>
                  This recovery point is more than a week old. Create a fresh
                  snapshot after important vault changes.
                </ThemedText>
              )}
              {snapshotStatus && (
                <ThemedText style={styles.healthStatus}>
                  {snapshotStatus}
                </ThemedText>
              )}
              <Pressable
                disabled={snapshotWorking}
                onPress={() =>
                  void createSnapshot("Manual owner-created recovery point")
                }
                style={({ pressed }) => [
                  styles.healthButton,
                  (pressed || snapshotWorking) && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.healthButtonText}>
                  {snapshotWorking
                    ? "Working…"
                    : "Create encrypted local snapshot"}
                </ThemedText>
              </Pressable>
              {snapshots.length > 0 && (
                <Pressable
                  disabled={snapshotWorking}
                  onPress={restoreLatestSnapshot}
                  style={({ pressed }) => [
                    styles.snapshotRestoreButton,
                    (pressed || snapshotWorking) && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.snapshotRestoreText}>
                    Restore latest local snapshot
                  </ThemedText>
                </Pressable>
              )}
            </Card>
          </Section>
          <Section title="Security activity">
            <Card>
              <ThemedText style={styles.helper}>
                The last {auditEvents.length} security events are encrypted
                locally. Names, protected values, PINs, passphrases, and file
                contents are never recorded.
              </ThemedText>
              {auditEvents.length === 0 ? (
                <ThemedText style={styles.snapshotInfo}>
                  No security events have been recorded yet.
                </ThemedText>
              ) : (
                auditEvents.slice(0, 8).map((event) => (
                  <View key={event.id} style={styles.auditRow}>
                    <View style={styles.auditCopy}>
                      <ThemedText style={styles.rowLabel}>
                        {auditActionLabel(event.action)}
                      </ThemedText>
                      <ThemedText style={styles.helperInline}>
                        {new Date(event.occurredAt).toLocaleString()}
                        {event.detail ? ` · ${event.detail}` : ""}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.auditOutcome}>
                      {event.outcome}
                    </ThemedText>
                  </View>
                ))
              )}
            </Card>
          </Section>
          <Section title="Vault management">
            <Card>
              <StatusRow
                label="Encrypted records"
                value={String(productCount)}
              />
              <ThemedText style={styles.transferHelper}>
                Create a separately passphrase-protected transfer file for a new
                device. The file remains unreadable until it is verified and
                imported into another unlocked vault.
              </ThemedText>
              <Pressable
                onPress={requestTransfer}
                style={styles.transferButton}
              >
                <ThemedText style={styles.transferButtonText}>
                  Transfer vault to another device
                </ThemedText>
              </Pressable>
              <Pressable onPress={lockNow} style={styles.lockButton}>
                <ThemedText style={styles.lockButtonText}>
                  Lock vault now
                </ThemedText>
              </Pressable>
            </Card>
          </Section>
          <Section title="Danger zone">
            <Pressable
              onPress={requestWipe}
              style={({ pressed }) => [
                styles.wipeButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.wipeText}>
                Wipe vault permanently
              </ThemedText>
            </Pressable>
            <ThemedText style={styles.warning}>
              This action deletes all local encrypted records and access keys.
              No cloud copy exists.
            </ThemedText>
          </Section>
        </ScrollView>
      </ThemedView>
      <SensitiveActionGate
        visible={sensitiveAction !== null}
        title={
          sensitiveAction === "wipe"
            ? "Verify before wiping"
            : "Verify before transfer"
        }
        description={
          sensitiveAction === "wipe"
            ? "This extra check protects the permanent-wipe action. You will still need to confirm the deletion separately."
            : "Verify that the unlocked vault owner is starting a device-transfer flow."
        }
        onCancel={() => setSensitiveAction(null)}
        onAuthenticated={completeSensitiveAction}
      />
    </>
  );
}

function snapshotAgeDays(createdAt: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000),
  );
}

function auditActionLabel(action: VaultAuditEvent["action"]): string {
  const labels: Record<VaultAuditEvent["action"], string> = {
    unlock: "PIN unlock",
    "biometric-unlock": "Biometric unlock",
    "pin-change": "PIN change",
    "transfer-export": "Transfer export",
    "transfer-import": "Transfer import",
    "snapshot-create": "Snapshot creation",
    "snapshot-restore": "Snapshot restore",
    "attachment-integrity-check": "Attachment integrity check",
    "vault-health-check": "Vault health check",
    "vault-wipe": "Vault wipe",
    "protected-value-copy": "Protected value copy",
    "protected-attachment-open": "Protected attachment open",
  };
  return labels[action];
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
function StatusRow({
  label,
  value,
  active,
  divider,
}: {
  label: string;
  value: string;
  active?: boolean;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={[styles.value, active && styles.active]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingTop: 8, paddingBottom: 128 },
  header: { marginBottom: 24 },
  title: { fontSize: 30 },
  subtitle: { marginTop: 5, opacity: 0.66 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, marginBottom: 10, color: "#0F766E" },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  row: {
    minHeight: 60,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  divider: { borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  rowLabel: { fontWeight: "700", flex: 1 },
  value: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    textAlign: "right",
  },
  active: { color: "#0F766E" },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.64,
    padding: 15,
    paddingBottom: 4,
  },
  reminderCopy: { flex: 1, paddingRight: 4 },
  helperInline: { fontSize: 12, lineHeight: 17, opacity: 0.64, marginTop: 4 },
  healthStatus: {
    fontSize: 12,
    lineHeight: 18,
    color: "#0F766E",
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  healthButton: {
    margin: 15,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#CCFBF1",
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  healthButtonText: { color: "#0F766E", fontWeight: "800" },
  pinChangeButton: {
    margin: 15,
    marginTop: 0,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#ECFDF5",
  },
  pinChangeText: { color: "#0F766E", fontWeight: "800" },
  pinChangeHelper: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  snapshotInfo: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  snapshotRestoreButton: {
    marginHorizontal: 15,
    marginBottom: 15,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  snapshotRestoreText: { color: "#B45309", fontWeight: "800" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 15 },
  option: {
    minWidth: "45%",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  optionSelected: { backgroundColor: "#0F766E" },
  optionText: { fontSize: 13, fontWeight: "800", color: "#334155" },
  optionTextSelected: { color: "#FFFFFF" },
  transferHelper: {
    paddingHorizontal: 15,
    paddingTop: 2,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.64,
  },
  transferButton: {
    margin: 15,
    marginBottom: 10,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#0F766E",
    shadowColor: "#0F766E",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  transferButtonText: { color: "#FFFFFF", fontWeight: "800" },
  lockButton: {
    margin: 15,
    marginTop: 0,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: "#CCFBF1",
  },
  lockButtonText: { color: "#0F766E", fontWeight: "800" },
  wipeButton: {
    borderRadius: 13,
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  wipeText: { color: "#B91C1C", fontWeight: "800" },
  auditRow: {
    minHeight: 58,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  auditCopy: { flex: 1 },
  auditOutcome: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F766E",
    textTransform: "uppercase",
  },
  snapshotWarning: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    color: "#B45309",
    fontSize: 12,
    lineHeight: 18,
  },
  warning: { fontSize: 12, lineHeight: 18, opacity: 0.65, marginTop: 10 },
  pressed: { opacity: 0.65 },
});
