import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDatabase } from '@/lib/database';
import { initializeEncryption } from '@/lib/encryption';
import {
  authenticateVaultWithBiometric,
  getVaultAuthState,
  initializeVaultAuth,
  isVaultBiometricEnabled,
  isVaultPinSet,
  verifyVaultPin,
} from '@/lib/vault-auth';
import { beginVaultSession } from '@/lib/vault-session';

const PIN_LENGTH = 8;

export default function UnlockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [lockoutRemainingTime, setLockoutRemainingTime] = useState(0);
  const isLockedOut = lockoutRemainingTime > 0;

  const refreshAuthState = async () => {
    const state = await getVaultAuthState();
    setLockoutRemainingTime(state.lockoutRemainingTime);
    return state;
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
        await initializeVaultAuth();
        if (!(await isVaultPinSet())) {
          router.replace('/setup');
          return;
        }
        const enabled = await isVaultBiometricEnabled();
        setBiometricEnabled(enabled);
        await refreshAuthState();
      } catch {
        Alert.alert('Vault unavailable', 'The vault could not be initialized. Restart the app and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    void initialize();
  }, [router]);

  useEffect(() => {
    if (!isLockedOut) return;
    const timer = setInterval(() => {
      setLockoutRemainingTime((remaining) => Math.max(0, remaining - 1_000));
    }, 1_000);
    return () => clearInterval(timer);
  }, [isLockedOut]);

  const completeUnlock = async () => {
    await initializeEncryption();
    beginVaultSession();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const attemptBiometricUnlock = async () => {
    try {
      setIsVerifying(true);
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
    try {
      setIsVerifying(true);
      await verifyVaultPin(candidate);
      await completeUnlock();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const state = await refreshAuthState();
      if (state.isLockedOut) {
        Alert.alert('Vault temporarily locked', `Try again in ${Math.ceil(state.lockoutRemainingTime / 1_000)} seconds.`);
      } else {
        const remaining = Math.max(0, 5 - state.failedAttempts);
        Alert.alert('Incorrect PIN', `${remaining} attempt${remaining === 1 ? '' : 's'} before a temporary lockout.`);
      }
    } finally {
      setPin('');
      setIsVerifying(false);
    }
  };

  const appendDigit = (digit: string) => {
    if (isVerifying || lockoutRemainingTime > 0 || pin.length >= PIN_LENGTH) return;
    const next = `${pin}${digit}`;
    setPin(next);
    if (next.length === PIN_LENGTH) void verifyPin(next);
  };

  if (isLoading) {
    return <ThemedView style={styles.center}><ActivityIndicator size="large" color="#14B8A6" /></ThemedView>;
  }

  const numbers = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'delete']];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.center}>
      <ThemedView style={[styles.center, { paddingTop: Math.max(insets.top, 44), paddingBottom: Math.max(insets.bottom, 28) }]}>
        <View>
          <View style={styles.lockMark}><View style={styles.shackle} /><View style={styles.lockBody}><View style={styles.keyhole} /></View></View>
          <ThemedText type="title" style={styles.title}>Unlock vault</ThemedText>
          <ThemedText style={styles.subtitle}>Enter your 8-digit PIN to continue.</ThemedText>
          <View style={styles.pinDots}>{Array.from({ length: PIN_LENGTH }, (_, index) => <View key={index} style={[styles.pinDot, index < pin.length && styles.pinDotFilled]} />)}</View>
          {lockoutRemainingTime > 0 && <ThemedText style={styles.lockout}>Temporarily locked — try again in {Math.ceil(lockoutRemainingTime / 1_000)}s</ThemedText>}
          {isVerifying && <View style={styles.verifying}><ActivityIndicator size="small" color="#14B8A6" /><ThemedText>Verifying securely…</ThemedText></View>}
          {biometricEnabled && !isVerifying && lockoutRemainingTime === 0 && (
            <Pressable onPress={() => void attemptBiometricUnlock()} style={({ pressed }) => [styles.biometricButton, pressed && styles.pressed]}>
              <ThemedText style={styles.biometricText}>Use biometrics</ThemedText>
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
                  accessibilityLabel={value === 'delete' ? 'Delete PIN digit' : value ? `PIN digit ${value}` : 'Empty'}
                  disabled={!value || isVerifying || lockoutRemainingTime > 0}
                  onPress={() => value === 'delete' ? setPin((current) => current.slice(0, -1)) : appendDigit(value)}
                  style={({ pressed }) => [styles.key, !value && styles.emptyKey, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.keyText}>{value === 'delete' ? 'Delete' : value}</ThemedText>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <ThemedText style={styles.footer}>For your privacy, the vault locks whenever the app leaves the foreground.</ThemedText>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },
  lockMark: { width: 72, height: 76, alignSelf: 'center', marginBottom: 22 },
  shackle: { position: 'absolute', top: 0, left: 17, width: 38, height: 36, borderWidth: 7, borderColor: '#14B8A6', borderBottomWidth: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lockBody: { position: 'absolute', bottom: 0, left: 7, width: 58, height: 47, borderRadius: 14, backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#2DD4BF', alignItems: 'center', justifyContent: 'center' },
  keyhole: { width: 8, height: 16, borderRadius: 8, backgroundColor: '#5EEAD4' },
  title: { textAlign: 'center', fontSize: 30, marginBottom: 8 },
  subtitle: { textAlign: 'center', opacity: 0.7 },
  pinDots: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 32 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(45, 212, 191, 0.6)' },
  pinDotFilled: { backgroundColor: '#14B8A6' },
  lockout: { color: '#DC2626', textAlign: 'center', marginTop: 20, fontWeight: '700' },
  verifying: { alignItems: 'center', gap: 8, marginTop: 20 },
  biometricButton: { alignItems: 'center', borderWidth: 1, borderColor: '#14B8A6', borderRadius: 14, marginHorizontal: 32, marginTop: 24, paddingVertical: 12 },
  biometricText: { color: '#0F766E', fontWeight: '800' },
  numpad: { gap: 14 },
  numpadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  key: { height: 64, width: '29%', alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(15, 118, 110, 0.10)' },
  emptyKey: { backgroundColor: 'transparent' },
  keyText: { fontSize: 20, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 12, lineHeight: 18, opacity: 0.6 },
  pressed: { opacity: 0.65 },
});
