import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  authenticateVaultWithBiometric,
  isVaultBiometricAvailable,
  isVaultBiometricEnabled,
  verifyVaultPin,
} from "@/lib/vault-auth";
import { ThemedText } from "@/components/themed-text";

interface SensitiveActionGateProps {
  visible: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onAuthenticated: () => void;
}

export function SensitiveActionGate({
  visible,
  title,
  description,
  onCancel,
  onAuthenticated,
}: SensitiveActionGateProps) {
  const [pin, setPin] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricReady, setBiometricReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPin("");
      setError(null);
      setWorking(false);
      return;
    }
    void Promise.all([isVaultBiometricEnabled(), isVaultBiometricAvailable()])
      .then(([enabled, available]) => setBiometricReady(enabled && available))
      .catch(() => setBiometricReady(false));
  }, [visible]);

  const finish = async (operation: () => Promise<boolean>) => {
    try {
      setWorking(true);
      setError(null);
      if (await operation()) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        setPin("");
        onAuthenticated();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Authentication was not completed.",
      );
    } finally {
      setWorking(false);
    }
  };

  const verifyWithPin = () => {
    if (pin.length !== 8) {
      setError("Enter the full 8-digit vault PIN.");
      return;
    }
    void finish(async () => verifyVaultPin(pin));
  };

  const verifyWithBiometric = () => {
    void finish(async () => authenticateVaultWithBiometric());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
          <TextInput
            value={pin}
            onChangeText={(value) =>
              setPin(value.replace(/\D/g, "").slice(0, 8))
            }
            secureTextEntry
            keyboardType="number-pad"
            autoComplete="off"
            placeholder="8-digit vault PIN"
            placeholderTextColor="#64748B"
            style={styles.input}
            accessibilityLabel="Vault PIN for sensitive action"
            editable={!working}
          />
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
          <Pressable
            disabled={working}
            onPress={verifyWithPin}
            style={({ pressed }) => [
              styles.primary,
              (pressed || working) && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            {working ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.primaryText}>Verify PIN</ThemedText>
            )}
          </Pressable>
          {biometricReady && (
            <Pressable
              disabled={working}
              onPress={verifyWithBiometric}
              style={({ pressed }) => [
                styles.biometric,
                (pressed || working) && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.biometricText}>
                Use biometrics
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            disabled={working}
            onPress={onCancel}
            style={styles.cancel}
          >
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
  },
  card: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { color: "#0F172A", fontSize: 20 },
  description: { marginTop: 8, lineHeight: 20, color: "#475569" },
  input: {
    height: 54,
    marginTop: 18,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    fontSize: 18,
    letterSpacing: 3,
  },
  error: { marginTop: 8, color: "#B91C1C", fontSize: 12, lineHeight: 18 },
  primary: {
    minHeight: 52,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#0F766E",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  biometric: {
    minHeight: 50,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#14B8A6",
    backgroundColor: "#ECFDF5",
  },
  biometricText: { color: "#0F766E", fontWeight: "900" },
  cancel: {
    minHeight: 44,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#64748B", fontWeight: "800" },
  pressed: { opacity: 0.65 },
});
