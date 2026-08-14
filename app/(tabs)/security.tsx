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
import { ThemedView } from "@/components/themed-view";
import { clearAllProducts, getDatabaseStats } from "@/lib/database";
import { wipeEncryptionData } from "@/lib/encryption";
import {
  AUTO_LOCK_LIMITS,
  clearVaultAuthData,
  disableVaultBiometric,
  enableVaultBiometric,
  getVaultAutoLockTimeout,
  getVaultAuthState,
  setVaultAutoLockTimeout,
} from "@/lib/vault-auth";
import { endVaultSession } from "@/lib/vault-session";

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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [state, stats, timeout] = await Promise.all([
        getVaultAuthState(),
        getDatabaseStats(),
        getVaultAutoLockTimeout(),
      ]);
      setPinSet(state.isPinSet);
      setBiometricAvailable(state.isBiometricAvailable);
      setBiometricEnabled(state.isBiometricEnabled);
      setProductCount(stats.productCount);
      setAutoLock(timeout);
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

  const lockNow = () => {
    endVaultSession();
    router.replace("/unlock");
  };

  const transferVault = () => {
    router.push("/transfer");
  };

  const wipeVault = () => {
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

  if (loading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  return (
    <ThemedView
      style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}
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
            <StatusRow label="Data storage" value="Local only" active divider />
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
          </Card>
        </Section>
        <Section title="Auto-lock">
          <Card>
            <ThemedText style={styles.helper}>
              The vault always locks when the app leaves the foreground. Choose
              the inactivity limit while it remains open.
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
        <Section title="Vault management">
          <Card>
            <StatusRow label="Encrypted records" value={String(productCount)} />
            <ThemedText style={styles.transferHelper}>
              Create a separately passphrase-protected transfer file for a new
              device. The file remains unreadable until it is verified and
              imported into another unlocked vault.
            </ThemedText>
            <Pressable onPress={transferVault} style={styles.transferButton}>
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
            onPress={wipeVault}
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
            This action deletes all local encrypted records and access keys. No
            cloud copy exists.
          </ThemedText>
        </Section>
      </ScrollView>
    </ThemedView>
  );
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
  content: { paddingBottom: 110 },
  header: { marginBottom: 24 },
  title: { fontSize: 30 },
  subtitle: { marginTop: 5, opacity: 0.66 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 17, marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
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
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: "#0F766E",
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
  warning: { fontSize: 12, lineHeight: 18, opacity: 0.65, marginTop: 10 },
  pressed: { opacity: 0.65 },
});
