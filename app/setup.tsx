import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { initializeDatabase } from "@/lib/database";
import { initializeEncryption, validatePin } from "@/lib/encryption";
import { setVaultPin } from "@/lib/vault-auth";
import { beginVaultSession } from "@/lib/vault-session";

const SLOW_CREATION_SECONDS = 8;

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [creationStage, setCreationStage] = useState(
    "Preparing your secure vault",
  );
  const [creationProgress, setCreationProgress] = useState(10);
  const [creationElapsedSeconds, setCreationElapsedSeconds] = useState(0);
  const [creationError, setCreationError] = useState<string | null>(null);
  const creationId = useRef(0);

  useEffect(() => {
    if (!isSaving) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setCreationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => clearInterval(timer);
  }, [isSaving]);

  const createVault = async () => {
    if (!validatePin(pin)) {
      Alert.alert(
        "Choose a stronger PIN",
        "Use an 8-digit PIN and avoid a single digit repeated throughout.",
      );
      return;
    }
    if (pin !== confirmation) {
      Alert.alert("PINs do not match", "Enter the same PIN in both fields.");
      return;
    }

    const runId = creationId.current + 1;
    creationId.current = runId;
    const isCurrentRun = () => creationId.current === runId;

    try {
      setCreationError(null);
      setCreationElapsedSeconds(0);
      setCreationProgress(10);
      setCreationStage("Preparing your secure vault");
      setIsSaving(true);
      await yieldToUi();

      setCreationProgress(32);
      setCreationStage("Opening encrypted local storage");
      await initializeDatabase();
      if (!isCurrentRun()) return;
      await yieldToUi();

      setCreationProgress(54);
      setCreationStage("Creating your device-bound vault key");
      await initializeEncryption();
      if (!isCurrentRun()) return;
      await yieldToUi();

      setCreationProgress(78);
      setCreationStage("Protecting your PIN with strong encryption");
      await setVaultPin(pin);
      if (!isCurrentRun()) return;
      await yieldToUi();

      setCreationProgress(96);
      setCreationStage("Finalizing your private vault");
      beginVaultSession();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!isCurrentRun()) return;

      setCreationProgress(100);
      setCreationStage("Vault ready");
      router.replace("/(tabs)");
    } catch {
      if (!isCurrentRun()) return;
      setCreationProgress(100);
      setCreationStage("Vault setup needs attention");
      setCreationError(
        "The secure-vault setup did not complete. Your PIN was not shown or sent anywhere. You can safely retry this setup.",
      );
    } finally {
      if (!isCurrentRun()) return;
      setIsSaving(false);
      setPin("");
      setConfirmation("");
    }
  };

  const isSlow = creationElapsedSeconds >= SLOW_CREATION_SECONDS;
  if (isSaving || creationError) {
    return (
      <ThemedView style={styles.creationScreen}>
        <View style={styles.creationCard}>
          <View
            style={styles.mark}
            accessibilityLabel="TSVaultKeySafe secure vault mark"
          >
            <View style={styles.shackle} />
            <View style={styles.lockBody} />
          </View>
          <ThemedText type="title" style={styles.creationTitle}>
            Creating your vault
          </ThemedText>
          <ThemedText style={styles.creationStage}>{creationStage}</ThemedText>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: creationProgress }}
            style={styles.progressTrack}
          >
            <View
              style={[styles.progressFill, { width: `${creationProgress}%` }]}
            />
          </View>
          <View style={styles.creationMeta}>
            {isSaving && <ActivityIndicator size="small" color="#14B8A6" />}
            <ThemedText style={styles.creationMetaText}>
              {creationElapsedSeconds === 0
                ? "Starting now"
                : `${creationElapsedSeconds}s elapsed`}
            </ThemedText>
          </View>
          {isSlow && !creationError && (
            <ThemedText style={styles.creationHint}>
              PIN protection is intentionally intensive. Please keep this screen
              open while your device finishes this one-time safety step.
            </ThemedText>
          )}
          {creationError && (
            <View style={styles.recoveryArea}>
              <ThemedText style={styles.creationError}>
                {creationError}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCreationError(null);
                  setPin("");
                  setConfirmation("");
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Return to PIN setup
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
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
          {
            paddingTop: Math.max(insets.top, 56),
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
      >
        <View>
          <View
            style={styles.mark}
            accessibilityLabel="TSVaultKeySafe secure vault mark"
          >
            <View style={styles.shackle} />
            <View style={styles.lockBody} />
          </View>
          <ThemedText type="title" style={styles.title}>
            Create your vault
          </ThemedText>
          <ThemedText style={styles.description}>
            Your data remains on this device and is protected with authenticated
            encryption.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText style={styles.label}>Vault PIN</ThemedText>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoComplete="off"
            textContentType="newPassword"
            style={styles.input}
            placeholder="8 digits"
            accessibilityLabel="Vault PIN"
          />
          <ThemedText style={styles.label}>Confirm PIN</ThemedText>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoComplete="off"
            textContentType="newPassword"
            style={styles.input}
            placeholder="Re-enter PIN"
            accessibilityLabel="Confirm vault PIN"
          />
          <ThemedText style={styles.hint}>
            There is no cloud account or recovery key. Keep this PIN private;
            clearing the app data permanently removes the vault.
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create secure vault"
          onPress={createVault}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.primaryButtonText}>
            Create secure vault
          </ThemedText>
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  creationScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  creationCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.22)",
    borderRadius: 24,
    padding: 28,
    backgroundColor: "rgba(15, 118, 110, 0.06)",
  },
  mark: { width: 72, height: 76, marginBottom: 24, alignSelf: "center" },
  shackle: {
    position: "absolute",
    top: 0,
    left: 17,
    width: 38,
    height: 36,
    borderWidth: 7,
    borderColor: "#14B8A6",
    borderBottomWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lockBody: {
    position: "absolute",
    bottom: 0,
    left: 7,
    width: 58,
    height: 47,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 2,
    borderColor: "#2DD4BF",
  },
  creationTitle: { textAlign: "center", fontSize: 26, marginBottom: 10 },
  creationStage: { minHeight: 22, textAlign: "center", opacity: 0.72 },
  progressTrack: {
    width: "100%",
    height: 8,
    overflow: "hidden",
    borderRadius: 99,
    marginTop: 24,
    backgroundColor: "rgba(20, 184, 166, 0.16)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#14B8A6",
  },
  creationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  creationMetaText: { fontSize: 13, opacity: 0.62 },
  creationHint: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.64,
  },
  recoveryArea: { width: "100%", alignItems: "center", marginTop: 22 },
  creationError: {
    textAlign: "center",
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: { width: "100%", marginTop: 16 },
  title: { textAlign: "center", fontSize: 30, marginBottom: 12 },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.72,
  },
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: "700", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.45)",
    borderRadius: 14,
    color: "#E2E8F0",
    paddingHorizontal: 16,
    height: 54,
    fontSize: 18,
    letterSpacing: 3,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  hint: { fontSize: 12, lineHeight: 18, opacity: 0.66, marginTop: 6 },
  primaryButton: {
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
