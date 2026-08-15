import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CRYPTOGRAPHY_VERSION, PIN_WORK_FACTOR } from "@/lib/encryption";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView
      style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.mark}>
            <View style={styles.shackle} />
            <View style={styles.body}>
              <View style={styles.keyhole} />
            </View>
          </View>
          <ThemedText type="title" style={styles.title}>
            TSVaultKeySafe
          </ThemedText>
          <ThemedText style={styles.tagline}>
            Private license and product inventory, built to remain on your
            device.
          </ThemedText>
        </View>
        <Section title="Privacy promise">
          <Card>
            <ThemedText style={styles.copy}>
              TSVaultKeySafe does not require an account, send vault records to
              a service, or include analytics in the application flow. Your
              encrypted database, device-protected key, encrypted attachments,
              local reminders, and transfer files stay under your control on
              this device.
            </ThemedText>
          </Card>
        </Section>
        <Section title="Security design">
          <Card>
            <Row label="Record protection" value="XChaCha20-Poly1305" />
            <Row label="Key separation" value="HKDF-SHA-256" divider />
            <Row
              label="PIN verifier"
              value={`PBKDF2-SHA-256 · ${PIN_WORK_FACTOR.toLocaleString()} rounds`}
              divider
            />
            <Row
              label="Cryptography format"
              value={`v${CRYPTOGRAPHY_VERSION}`}
              divider
            />
            <Row label="Vault behavior" value="Locks on background" divider />
          </Card>
        </Section>
        <Section title="Important limitations">
          <Card>
            <ThemedText style={styles.copy}>
              No mobile application can fully protect data on a compromised,
              rooted, jailbroken, or unlocked device. Keep your operating system
              current, use a device passcode, and avoid sharing your vault PIN.
              Clearing app data or using the permanent wipe option cannot be
              reversed.
            </ThemedText>
          </Card>
        </Section>
        <Section title="About">
          <Card>
            <Row label="Version" value="1.5.0" />
            <Row label="Storage mode" value="Offline only" divider />
            <Row
              label="Continuity"
              value="Encrypted transfer and local recovery snapshots"
              divider
            />
            <Row label="License" value="MIT" divider />
          </Card>
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
function Row({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  content: { paddingBottom: 110 },
  brand: { alignItems: "center", paddingHorizontal: 10, marginBottom: 30 },
  mark: { width: 64, height: 67, marginBottom: 15 },
  shackle: {
    position: "absolute",
    top: 0,
    left: 15,
    width: 34,
    height: 30,
    borderWidth: 6,
    borderColor: "#14B8A6",
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  body: {
    position: "absolute",
    bottom: 0,
    left: 5,
    width: 54,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#0F172A",
    borderWidth: 2,
    borderColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  keyhole: {
    width: 7,
    height: 15,
    borderRadius: 7,
    backgroundColor: "#5EEAD4",
  },
  title: { fontSize: 28 },
  tagline: { marginTop: 7, textAlign: "center", opacity: 0.67, lineHeight: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 17, marginBottom: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  copy: { padding: 16, fontSize: 14, lineHeight: 21, opacity: 0.76 },
  row: {
    minHeight: 58,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
  },
  divider: { borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  rowLabel: { flex: 1, fontWeight: "700", fontSize: 14 },
  rowValue: {
    maxWidth: "55%",
    color: "#0F766E",
    textAlign: "right",
    fontWeight: "700",
    fontSize: 12,
  },
});
