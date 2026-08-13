import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDatabase } from '@/lib/database';
import { initializeEncryption, validatePin } from '@/lib/encryption';
import { setVaultPin } from '@/lib/vault-auth';
import { beginVaultSession } from '@/lib/vault-session';

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const createVault = async () => {
    if (!validatePin(pin)) {
      Alert.alert('Choose a stronger PIN', 'Use an 8-digit PIN and avoid a single digit repeated throughout.');
      return;
    }
    if (pin !== confirmation) {
      Alert.alert('PINs do not match', 'Enter the same PIN in both fields.');
      return;
    }

    try {
      setIsSaving(true);
      await initializeDatabase();
      await initializeEncryption();
      await setVaultPin(pin);
      beginVaultSession();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Unable to create vault', 'Your vault could not be initialized securely. Please try again.');
    } finally {
      setIsSaving(false);
      setPin('');
      setConfirmation('');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 56), paddingBottom: Math.max(insets.bottom, 28) }]}>
        <View>
          <View style={styles.mark} accessibilityLabel="TSVaultKeySafe secure vault mark">
            <View style={styles.shackle} />
            <View style={styles.lockBody} />
          </View>
          <ThemedText type="title" style={styles.title}>Create your vault</ThemedText>
          <ThemedText style={styles.description}>
            Your data remains on this device and is protected with authenticated encryption.
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
            There is no cloud account or recovery key. Keep this PIN private; clearing the app data permanently removes the vault.
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create secure vault"
          onPress={createVault}
          disabled={isSaving}
          style={({ pressed }) => [styles.primaryButton, (pressed || isSaving) && styles.pressed]}
        >
          <ThemedText style={styles.primaryButtonText}>{isSaving ? 'Securing vault…' : 'Create secure vault'}</ThemedText>
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },
  mark: { width: 72, height: 76, marginBottom: 24, alignSelf: 'center' },
  shackle: { position: 'absolute', top: 0, left: 17, width: 38, height: 36, borderWidth: 7, borderColor: '#14B8A6', borderBottomWidth: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lockBody: { position: 'absolute', bottom: 0, left: 7, width: 58, height: 47, borderRadius: 14, backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#2DD4BF' },
  title: { textAlign: 'center', fontSize: 30, marginBottom: 12 },
  description: { textAlign: 'center', fontSize: 16, lineHeight: 24, opacity: 0.72 },
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  input: { borderWidth: 1, borderColor: 'rgba(45, 212, 191, 0.45)', borderRadius: 14, color: '#E2E8F0', paddingHorizontal: 16, height: 54, fontSize: 18, letterSpacing: 3, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  hint: { fontSize: 12, lineHeight: 18, opacity: 0.66, marginTop: 6 },
  primaryButton: { minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#0F766E' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
