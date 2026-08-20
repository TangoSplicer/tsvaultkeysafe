import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { SensitiveActionGate } from "@/components/sensitive-action-gate";
import {
  clearVaultDuressPin,
  configureVaultDuressPin,
  isVaultDuressPinConfigured,
} from "@/lib/vault-auth";
import { isVaultSessionUnlocked } from "@/lib/vault-session";

export default function DuressPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [configured, setConfigured] = useState(false);
  const [working, setWorking] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "remove" | null>(
    null,
  );

  useEffect(() => {
    if (!isVaultSessionUnlocked()) {
      router.replace("/unlock");
      return;
    }
    void isVaultDuressPinConfigured().then(setConfigured);
  }, [router]);

  const saveAfterAuthentication = async () => {
    if (pin !== confirmation) {
      Alert.alert("PINs do not match", "Enter the same 8-digit PIN twice.");
      return;
    }
    try {
      setWorking(true);
      await configureVaultDuressPin(pin);
      setConfigured(true);
      setPin("");
      setConfirmation("");
      Alert.alert(
        "Duress PIN enabled",
        "If entered at the unlock screen, this PIN opens a separate encrypted decoy vault. The real vault key, records, attachments, transfers, and security settings remain inaccessible.",
      );
    } catch (error) {
      Alert.alert(
        "Unable to set duress PIN",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setWorking(false);
    }
  };

  const save = () => {
    setPendingAction("save");
    setAuthGateVisible(true);
  };

  const remove = () => {
    Alert.alert(
      "Remove duress PIN?",
      "The panic response will be disabled on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setPendingAction("remove");
            setAuthGateVisible(true);
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + 10, 28) },
        ]}
      >
        <ThemedText type="title">Duress PIN</ThemedText>
        <ThemedText style={styles.subtitle}>
          A separate, device-only PIN that opens an isolated encrypted decoy
          vault without opening the real vault.
        </ThemedText>
        <View style={styles.warning}>
          <ThemedText style={styles.warningTitle}>
            Important boundary
          </ThemedText>
          <ThemedText style={styles.copy}>
            The decoy vault uses a separate encrypted file and an independent
            key derived from this PIN. It contains only generic fallback
            records. It cannot read the real database or attachments, and it has
            no transfer, security-settings, or permanent-wipe controls.
          </ThemedText>
        </View>
        <ThemedText style={styles.label}>New duress PIN</ThemedText>
        <TextInput
          value={pin}
          onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 8))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          placeholder="8 digits"
          placeholderTextColor="#64748B"
          style={styles.input}
          accessibilityLabel="New duress PIN"
        />
        <ThemedText style={styles.label}>Confirm duress PIN</ThemedText>
        <TextInput
          value={confirmation}
          onChangeText={(value) =>
            setConfirmation(value.replace(/\D/g, "").slice(0, 8))
          }
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          placeholder="Repeat 8 digits"
          placeholderTextColor="#64748B"
          style={styles.input}
          accessibilityLabel="Confirm duress PIN"
        />
        <Pressable
          disabled={working}
          onPress={() => void save()}
          style={({ pressed }) => [
            styles.primary,
            (pressed || working) && styles.pressed,
          ]}
        >
          <ThemedText style={styles.primaryText}>
            {configured ? "Replace duress PIN" : "Enable duress PIN"}
          </ThemedText>
        </Pressable>
        {configured && (
          <Pressable onPress={remove} style={styles.secondary}>
            <ThemedText style={styles.secondaryText}>
              Remove duress PIN
            </ThemedText>
          </Pressable>
        )}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ThemedText>Back to Security</ThemedText>
        </Pressable>
      </ScrollView>
      <SensitiveActionGate
        visible={authGateVisible}
        title="Verify duress-PIN change"
        description="Re-authenticate before changing or removing the decoy-vault PIN."
        onCancel={() => {
          setPendingAction(null);
          setAuthGateVisible(false);
        }}
        onAuthenticated={() => {
          const action = pendingAction;
          setPendingAction(null);
          setAuthGateVisible(false);
          if (action === "remove") {
            void clearVaultDuressPin().then(() => setConfigured(false));
          } else if (action === "save") {
            void saveAfterAuthentication();
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 96 },
  subtitle: { marginTop: 8, lineHeight: 21, opacity: 0.7 },
  warning: {
    marginTop: 22,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  warningTitle: { color: "#9A3412", fontWeight: "800", marginBottom: 5 },
  copy: { color: "#7C2D12", lineHeight: 20 },
  label: { marginTop: 18, marginBottom: 7, fontWeight: "800" },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.48)",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    paddingHorizontal: 14,
    letterSpacing: 4,
  },
  primary: {
    minHeight: 52,
    marginTop: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F766E",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondary: {
    minHeight: 52,
    marginTop: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  secondaryText: { color: "#B91C1C", fontWeight: "800" },
  back: { alignItems: "center", paddingVertical: 20 },
  pressed: { opacity: 0.62 },
});
