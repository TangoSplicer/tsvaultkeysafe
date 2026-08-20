import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const sections = [
  {
    title: "What the vault protects",
    body: "Records, managed attachments, recovery snapshots, audit events, and transfer packages are encrypted locally. The vault key is device-bound through secure storage and is not included in exports or backups.",
  },
  {
    title: "What it does not protect",
    body: "An already-unlocked device, a compromised operating system, malicious accessibility services, hostile keyboards, screenshots taken by another mechanism, or a transfer file and passphrase stored together can still expose information.",
  },
  {
    title: "Clipboard and sharing",
    body: "Copied values are temporary and are cleared when they remain unchanged after the short clipboard window. Opening an attachment creates a temporary readable copy for the Android share sheet and schedules local cleanup. The receiving application may retain its own copy.",
  },
  {
    title: "Recovery responsibility",
    body: "TSVaultKeySafe has no account, cloud recovery, synchronization service, or remote administrator. Keep encrypted transfer files and their passphrases separate, verify the import fingerprint, and delete temporary copies after migration.",
  },
  {
    title: "Duress PIN and decoy vault",
    body: "The optional duress PIN opens a separate encrypted decoy vault containing only generic fallback records. The real database, device-bound master key, attachments, transfers, audit history, and security settings remain inaccessible. This is a local concealment aid, not a guarantee of safety against a compromised operating system, forensic analysis, or every coercion scenario.",
  },
  {
    title: "Local audit evidence",
    body: "Security events are encrypted and bounded on the device. They record action categories and outcomes, not record names, secrets, PINs, transfer passphrases, or attachment contents.",
  },
];

export default function ThreatModelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + 10, 28) },
        ]}
      >
        <ThemedText type="title">Security model</ThemedText>
        <ThemedText style={styles.subtitle}>
          A clear description of the boundaries of this offline vault.
        </ThemedText>
        {sections.map((section) => (
          <ThemedView key={section.title} style={styles.card}>
            <ThemedText type="subtitle">{section.title}</ThemedText>
            <ThemedText style={styles.body}>{section.body}</ThemedText>
          </ThemedView>
        ))}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ThemedText style={styles.backText}>Back to Security</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 96 },
  subtitle: { marginTop: 8, marginBottom: 22, lineHeight: 21, opacity: 0.7 },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7E2EA",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  body: { lineHeight: 21, opacity: 0.76 },
  back: { alignItems: "center", paddingVertical: 20 },
  backText: { color: "#0F766E", fontWeight: "800" },
});
