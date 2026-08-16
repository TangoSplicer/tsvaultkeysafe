import React, { useEffect, useState } from "react";
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
import { validatePin } from "@/lib/encryption";
import { changeVaultPin } from "@/lib/vault-auth";
import { isVaultSessionUnlocked } from "@/lib/vault-session";

export default function ChangePinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!isVaultSessionUnlocked()) {
      router.replace("/unlock");
      return;
    }
    setReady(true);
  }, [router]);

  const save = async () => {
    if (!isVaultSessionUnlocked()) {
      router.replace("/unlock");
      return;
    }
    if (!validatePin(newPin)) {
      Alert.alert(
        "Choose a stronger PIN",
        "Use exactly eight digits and avoid one repeated digit.",
      );
      return;
    }
    if (newPin !== confirmation) {
      Alert.alert("PINs do not match", "Enter the same new PIN twice.");
      return;
    }
    if (newPin === currentPin) {
      Alert.alert(
        "Choose a new PIN",
        "Your new vault PIN must be different from the current PIN.",
      );
      return;
    }

    try {
      setWorking(true);
      await changeVaultPin(currentPin, newPin);
      setCurrentPin("");
      setNewPin("");
      setConfirmation("");
      Alert.alert(
        "Vault PIN updated",
        "Your vault data, device-protected key, biometric setting, transfers, and local recovery snapshots were not changed.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "PIN change blocked",
        error instanceof Error
          ? error.message
          : "The vault PIN could not be changed safely.",
      );
    } finally {
      setWorking(false);
    }
  };

  if (!ready) {
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
              Change vault PIN
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Confirm the current PIN before choosing a new eight-digit PIN.
              This does not decrypt, copy, or move any vault data.
            </ThemedText>
          </View>

          <View style={styles.notice}>
            <ThemedText style={styles.noticeTitle}>Security check</ThemedText>
            <ThemedText style={styles.noticeCopy}>
              Incorrect current-PIN attempts use the same progressive lockout
              protection as vault unlock. Do not share either PIN.
            </ThemedText>
          </View>

          <PinField
            label="Current vault PIN"
            value={currentPin}
            onChangeText={setCurrentPin}
            accessibilityLabel="Current vault PIN"
          />
          <PinField
            label="New vault PIN"
            value={newPin}
            onChangeText={setNewPin}
            accessibilityLabel="New vault PIN"
          />
          <PinField
            label="Confirm new vault PIN"
            value={confirmation}
            onChangeText={setConfirmation}
            accessibilityLabel="Confirm new vault PIN"
          />

          <View style={styles.boundary}>
            <ThemedText style={styles.boundaryTitle}>
              What stays unchanged
            </ThemedText>
            <ThemedText style={styles.boundaryCopy}>
              The PIN protects the device-local unlock check. Your master key,
              encrypted records, encrypted attachments, device-transfer files,
              and local recovery snapshots remain unchanged and on this device.
            </ThemedText>
          </View>

          <Pressable
            disabled={working}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || working) && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Verify current PIN and update vault PIN"
          >
            <ThemedText style={styles.primaryButtonText}>
              {working ? "Verifying securely…" : "Update vault PIN"}
            </ThemedText>
          </Pressable>
          <Pressable
            disabled={working}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cancelButton,
              (pressed || working) && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function PinField({
  label,
  value,
  onChangeText,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={(value) =>
          onChangeText(value.replace(/\D/g, "").slice(0, 8))
        }
        secureTextEntry
        keyboardType="number-pad"
        autoComplete="off"
        placeholder="8 digits"
        placeholderTextColor="#64748B"
        style={styles.input}
        accessibilityLabel={accessibilityLabel}
        maxLength={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  content: { paddingTop: 8, paddingBottom: 128 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 25 },
  title: { fontSize: 29 },
  subtitle: { marginTop: 7, fontSize: 14, lineHeight: 21, opacity: 0.7 },
  notice: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#ECFDF5",
    padding: 15,
    marginBottom: 22,
  },
  noticeTitle: { color: "#0F766E", fontWeight: "800" },
  noticeCopy: { color: "#475569", fontSize: 13, lineHeight: 19, marginTop: 5 },
  field: { marginBottom: 17 },
  label: { fontWeight: "800", fontSize: 14, marginBottom: 8 },
  input: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 4,
  },
  boundary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 15,
    marginTop: 3,
    marginBottom: 22,
  },
  boundaryTitle: { color: "#334155", fontWeight: "800" },
  boundaryCopy: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cancelButton: { alignItems: "center", paddingVertical: 16, marginTop: 3 },
  cancelButtonText: { color: "#475569", fontWeight: "800" },
  pressed: { opacity: 0.68 },
});
