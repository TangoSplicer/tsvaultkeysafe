import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { initializeDatabase } from "@/lib/database";
import { openDecoyVault } from "@/lib/decoy-vault";
import { initializeEncryption } from "@/lib/encryption";
import {
  authenticateVaultWithBiometric,
  getVaultAuthState,
  initializeVaultAuth,
  isVaultBiometricEnabled,
  isVaultPinSet,
  verifyVaultPin,
  wasVaultDuressTriggered,
} from "@/lib/vault-auth";
import { beginVaultSession, endVaultSession } from "@/lib/vault-session";

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

const PIN_LENGTH = 8;
const SLOW_STARTUP_SECONDS = 8;

export default function UnlockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(
    "Checking vault PIN protection",
  );
  const [verificationElapsedSeconds, setVerificationElapsedSeconds] =
    useState(0);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [lockoutRemainingTime, setLockoutRemainingTime] = useState(0);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [startupMessage, setStartupMessage] = useState(
    "Preparing secure storage",
  );
  const [startupProgress, setStartupProgress] = useState(12);
  const [startupElapsedSeconds, setStartupElapsedSeconds] = useState(0);
  const [startupError, setStartupError] = useState<string | null>(null);
  const initializationId = useRef(0);
  const isLockedOut = lockoutRemainingTime > 0;

  const refreshAuthState = async () => {
    const state = await getVaultAuthState();
    setLockoutRemainingTime(state.lockoutRemainingTime);
    return state;
  };

  useEffect(() => {
    const runId = initializationId.current + 1;
    initializationId.current = runId;
    const isCurrentRun = () => initializationId.current === runId;

    const initialize = async () => {
      setIsLoading(true);
      setStartupError(null);
      setStartupElapsedSeconds(0);
      setStartupProgress(12);
      setStartupMessage("Preparing secure storage");

      try {
        setStartupProgress(36);
        setStartupMessage("Opening encrypted database");
        await initializeDatabase();
        if (!isCurrentRun()) return;

        setStartupProgress(62);
        setStartupMessage("Checking device protection");
        await initializeVaultAuth();
        if (!isCurrentRun()) return;

        setStartupProgress(78);
        setStartupMessage("Checking your vault settings");
        if (!(await isVaultPinSet())) {
          if (isCurrentRun()) {
            setStartupProgress(100);
            setStartupMessage("Opening first-time setup");
            router.replace("/setup");
          }
          return;
        }
        if (!isCurrentRun()) return;

        const enabled = await isVaultBiometricEnabled();
        if (!isCurrentRun()) return;
        setBiometricEnabled(enabled);

        setStartupProgress(92);
        setStartupMessage("Finalizing secure session");
        await refreshAuthState();
        if (!isCurrentRun()) return;

        setStartupProgress(100);
        setStartupMessage("Vault ready");
        setIsLoading(false);
      } catch {
        if (!isCurrentRun()) return;
        setStartupProgress(100);
        setStartupMessage("Vault initialization needs attention");
        setStartupError(
          "The secure storage service did not finish its startup check. You can try again without losing any vault data.",
        );
      }
    };

    void initialize();
    return () => {
      if (initializationId.current === runId) initializationId.current += 1;
    };
  }, [router, startupAttempt]);

  useEffect(() => {
    if (!isLoading) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setStartupElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => clearInterval(timer);
  }, [isLoading, startupAttempt]);

  useEffect(() => {
    if (!isLockedOut) return;
    const timer = setInterval(() => {
      setLockoutRemainingTime((remaining) => Math.max(0, remaining - 1_000));
    }, 1_000);
    return () => clearInterval(timer);
  }, [isLockedOut]);

  useEffect(() => {
    if (!isVerifying) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setVerificationElapsedSeconds(
        Math.floor((Date.now() - startedAt) / 1_000),
      );
    }, 1_000);
    return () => clearInterval(timer);
  }, [isVerifying]);

  const beginVerification = async (message: string) => {
    setVerificationElapsedSeconds(0);
    setVerificationMessage(message);
    setIsVerifying(true);
    await yieldToUi();
  };

  const completeUnlock = async () => {
    setVerificationMessage("Retrieving your device-bound vault key");
    await initializeEncryption();
    beginVaultSession();
    setVerificationMessage("PIN verified — opening your vault");
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptic feedback is optional and must never prevent a completed unlock.
    }
    router.replace("/(tabs)");
  };

  const attemptBiometricUnlock = async () => {
    try {
      await beginVerification("Waiting for your device biometric check");
      await authenticateVaultWithBiometric();
      await completeUnlock();
    } catch {
      // A declined biometric prompt intentionally falls back to PIN entry without exposing detail.
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPin = async (candidate: string) => {
    if (lockoutRemainingTime > 0) return;
    let pinVerified = false;
    try {
      await beginVerification(
        "Checking PIN protection — this is intentionally thorough",
      );
      await verifyVaultPin(candidate);
      pinVerified = true;
      await completeUnlock();
    } catch {
      const duressTriggered = await wasVaultDuressTriggered().catch(
        () => false,
      );
      if (duressTriggered) {
        endVaultSession();
        setVerificationMessage("Opening protected fallback vault");
        try {
          await openDecoyVault(candidate);
          beginVaultSession("decoy");
          router.replace("/decoy");
        } catch {
          endVaultSession();
          setVerificationMessage(
            "No vault session opened — ready for another PIN",
          );
          Alert.alert(
            "Unable to unlock",
            "The protected fallback vault could not be opened. No real vault session was started.",
            [{ text: "OK" }],
          );
        }
        return;
      }
      if (pinVerified) {
        Alert.alert(
          "Vault opening needs attention",
          "Your PIN was verified, but the vault could not finish opening. Please retry without changing your PIN.",
        );
      } else {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
        } catch {
          // Haptic feedback is optional.
        }
        const state = await refreshAuthState();
        if (state.isLockedOut) {
          Alert.alert(
            "Vault temporarily locked",
            `Try again in ${Math.ceil(state.lockoutRemainingTime / 1_000)} seconds.`,
          );
        } else {
          const remaining = Math.max(0, 5 - state.failedAttempts);
          Alert.alert(
            "Incorrect PIN",
            `${remaining} attempt${remaining === 1 ? "" : "s"} before a temporary lockout.`,
          );
        }
      }
    } finally {
      setPin("");
      setIsVerifying(false);
    }
  };

  const appendDigit = (digit: string) => {
    if (isVerifying || lockoutRemainingTime > 0 || pin.length >= PIN_LENGTH)
      return;
    const next = `${pin}${digit}`;
    setPin(next);
    if (next.length === PIN_LENGTH) void verifyPin(next);
  };

  if (isLoading) {
    const isSlow = startupElapsedSeconds >= SLOW_STARTUP_SECONDS;
    return (
      <ThemedView style={styles.startupScreen}>
        <View style={styles.startupCard}>
          <View style={styles.startupIcon}>
            <View style={styles.startupShackle} />
            <View style={styles.startupLockBody} />
          </View>
          <ThemedText type="title" style={styles.startupTitle}>
            Initializing vault
          </ThemedText>
          <ThemedText style={styles.startupMessage}>
            {startupMessage}
          </ThemedText>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: startupProgress }}
            style={styles.progressTrack}
          >
            <View
              style={[styles.progressFill, { width: `${startupProgress}%` }]}
            />
          </View>
          <View style={styles.startupMeta}>
            <ActivityIndicator size="small" color="#14B8A6" />
            <ThemedText style={styles.startupMetaText}>
              {startupElapsedSeconds === 0
                ? "Starting now"
                : `${startupElapsedSeconds}s elapsed`}
            </ThemedText>
          </View>
          {isSlow && !startupError && (
            <ThemedText style={styles.startupHint}>
              This can take a little longer after an app update. Your vault data
              remains on this device.
            </ThemedText>
          )}
          {startupError && (
            <View style={styles.startupRecovery}>
              <ThemedText style={styles.startupError}>
                {startupError}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStartupAttempt((attempt) => attempt + 1)}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.retryButtonText}>
                  Retry secure startup
                </ThemedText>
              </Pressable>
            </View>
          )}
          {isSlow && !startupError && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStartupAttempt((attempt) => attempt + 1)}
              style={({ pressed }) => [
                styles.secondaryRetryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.secondaryRetryText}>Retry</ThemedText>
            </Pressable>
          )}
        </View>
      </ThemedView>
    );
  }

  const numbers = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "delete"],
  ];
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.center}
    >
      <ThemedView
        style={[
          styles.center,
          {
            paddingTop: Math.max(insets.top, 44),
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
      >
        <View>
          <View style={styles.lockMark}>
            <View style={styles.shackle} />
            <View style={styles.lockBody}>
              <View style={styles.keyhole} />
            </View>
          </View>
          <ThemedText type="title" style={styles.title}>
            Unlock vault
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Enter your 8-digit PIN to continue.
          </ThemedText>
          <View style={styles.pinDots}>
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  index < pin.length && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>
          {lockoutRemainingTime > 0 && (
            <ThemedText style={styles.lockout}>
              Temporarily locked — try again in{" "}
              {Math.ceil(lockoutRemainingTime / 1_000)}s
            </ThemedText>
          )}
          {isVerifying && (
            <View style={styles.verifying}>
              <ActivityIndicator size="small" color="#14B8A6" />
              <ThemedText style={styles.verifyingMessage}>
                {verificationMessage}
              </ThemedText>
              <ThemedText style={styles.verifyingMeta}>
                {verificationElapsedSeconds === 0
                  ? "Starting now"
                  : `${verificationElapsedSeconds}s elapsed`}
              </ThemedText>
              {verificationElapsedSeconds >= 4 && (
                <ThemedText style={styles.verifyingHint}>
                  The PIN check deliberately uses a strong work factor. Please
                  keep the app open while it completes.
                </ThemedText>
              )}
            </View>
          )}
          {biometricEnabled && !isVerifying && lockoutRemainingTime === 0 && (
            <Pressable
              onPress={() => void attemptBiometricUnlock()}
              style={({ pressed }) => [
                styles.biometricButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.biometricText}>
                Use biometrics
              </ThemedText>
            </Pressable>
          )}
        </View>
        <View style={styles.numpad}>
          {numbers.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.numpadRow}>
              {row.map((value, index) => (
                <Pressable
                  key={`${rowIndex}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value === "delete"
                      ? "Delete PIN digit"
                      : value
                        ? `PIN digit ${value}`
                        : "Empty"
                  }
                  disabled={!value || isVerifying || lockoutRemainingTime > 0}
                  onPress={() =>
                    value === "delete"
                      ? setPin((current) => current.slice(0, -1))
                      : appendDigit(value)
                  }
                  style={({ pressed }) => [
                    styles.key,
                    !value && styles.emptyKey,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.keyText}>
                    {value === "delete" ? "Delete" : value}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <ThemedText style={styles.footer}>
          For your privacy, the vault locks whenever the app leaves the
          foreground.
        </ThemedText>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  startupScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  startupCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.22)",
    borderRadius: 24,
    padding: 28,
    backgroundColor: "rgba(15, 118, 110, 0.06)",
  },
  startupIcon: { width: 62, height: 68, marginBottom: 22 },
  startupShackle: {
    position: "absolute",
    top: 0,
    left: 14,
    width: 34,
    height: 33,
    borderWidth: 6,
    borderColor: "#14B8A6",
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  startupLockBody: {
    position: "absolute",
    bottom: 0,
    left: 4,
    width: 54,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0F766E",
  },
  startupTitle: { textAlign: "center", fontSize: 26, marginBottom: 10 },
  startupMessage: { textAlign: "center", opacity: 0.72, minHeight: 22 },
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
  startupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  startupMetaText: { fontSize: 13, opacity: 0.62 },
  startupHint: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.64,
  },
  startupRecovery: { width: "100%", alignItems: "center", marginTop: 22 },
  startupError: {
    textAlign: "center",
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    width: "100%",
    alignItems: "center",
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 13,
    backgroundColor: "#0F766E",
  },
  retryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryRetryButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  secondaryRetryText: { color: "#0F766E", fontWeight: "800" },
  center: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  lockMark: { width: 72, height: 76, alignSelf: "center", marginBottom: 22 },
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
    alignItems: "center",
    justifyContent: "center",
  },
  keyhole: {
    width: 8,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5EEAD4",
  },
  title: { textAlign: "center", fontSize: 30, marginBottom: 8 },
  subtitle: { textAlign: "center", opacity: 0.7 },
  pinDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 32,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.6)",
  },
  pinDotFilled: { backgroundColor: "#14B8A6" },
  lockout: {
    color: "#DC2626",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "700",
  },
  verifying: { alignItems: "center", gap: 7, marginTop: 20 },
  verifyingMessage: { textAlign: "center", fontWeight: "700" },
  verifyingMeta: { fontSize: 12, opacity: 0.62 },
  verifyingHint: {
    maxWidth: 270,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.62,
  },
  biometricButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#14B8A6",
    borderRadius: 14,
    marginHorizontal: 32,
    marginTop: 24,
    paddingVertical: 12,
  },
  biometricText: { color: "#0F766E", fontWeight: "800" },
  numpad: { gap: 14 },
  numpadRow: { flexDirection: "row", justifyContent: "space-between" },
  key: {
    height: 64,
    width: "29%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(15, 118, 110, 0.10)",
  },
  emptyKey: { backgroundColor: "transparent" },
  keyText: { fontSize: 20, fontWeight: "700" },
  footer: { textAlign: "center", fontSize: 12, lineHeight: 18, opacity: 0.6 },
  pressed: { opacity: 0.65 },
});
