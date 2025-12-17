import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  isVaultPinSet,
  isVaultBiometricEnabled,
  verifyVaultPin,
  authenticateVaultWithBiometric,
  getVaultAuthState,
} from '@/lib/vault-auth';
import { initializeDatabase } from '@/lib/database';
import { initializeEncryption } from '@/lib/encryption';

export default function UnlockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const accentColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemainingTime, setLockoutRemainingTime] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (isLockedOut) {
      const timer = setInterval(() => {
        setLockoutRemainingTime((prev) => {
          if (prev <= 1000) {
            setIsLockedOut(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLockedOut]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);

      // Initialize encryption and database
      await initializeEncryption();
      await initializeDatabase();

      // Check auth state
      const pinIsSet = await isVaultPinSet();
      const bioEnabled = await isVaultBiometricEnabled();
      const authState = await getVaultAuthState();

      setPinSet(pinIsSet);
      setBiometricEnabled(bioEnabled && pinIsSet);
      setFailedAttempts(authState.failedAttempts);
      setIsLockedOut(authState.isLockedOut);
      setLockoutRemainingTime(authState.lockoutRemainingTime);

      // If no PIN is set, show setup screen
      if (!pinIsSet) {
        router.replace('/(tabs)' as any);
      } else if (bioEnabled) {
        // Auto-attempt biometric unlock
        setTimeout(() => attemptBiometricUnlock(), 500);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Error', 'Failed to initialize vault');
    } finally {
      setIsLoading(false);
    }
  };

  const attemptBiometricUnlock = async () => {
    try {
      setIsVerifying(true);
      await authenticateVaultWithBiometric();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)' as any);
    } catch (error) {
      console.error('Biometric unlock failed:', error);
      // Fall back to PIN entry
      setIsVerifying(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (enteredPin: string) => {
    if (isLockedOut) {
      Alert.alert(
        'Locked Out',
        `Too many failed attempts. Try again in ${Math.ceil(lockoutRemainingTime / 1000)}s.`
      );
      return;
    }

    try {
      setIsVerifying(true);
      await verifyVaultPin(enteredPin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin('');
      router.replace('/(tabs)' as any);
    } catch (error) {
      console.error('PIN verification failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      const authState = await getVaultAuthState();
      setFailedAttempts(authState.failedAttempts);
      setIsLockedOut(authState.isLockedOut);
      setLockoutRemainingTime(authState.lockoutRemainingTime);

      setPin('');
      Alert.alert('Invalid PIN', `${3 - authState.failedAttempts} attempts remaining`);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDots}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < pin.length ? accentColor : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumpad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'del'],
    ];

    return (
      <View style={styles.numpad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numpadRow}>
            {row.map((num, colIndex) => (
              <Pressable
                key={colIndex}
                onPress={() => {
                  if (num === 'del') {
                    handlePinDelete();
                  } else if (num !== '') {
                    handlePinInput(num);
                  }
                }}
                disabled={isVerifying || isLockedOut}
                style={({ pressed }) => [
                  styles.numpadButton,
                  num === '' && styles.numpadButtonEmpty,
                  pressed && styles.numpadButtonPressed,
                  isVerifying && styles.numpadButtonDisabled,
                ]}
              >
                {num === 'del' ? (
                  <ThemedText style={styles.numpadButtonText}>⌫</ThemedText>
                ) : (
                  <ThemedText style={styles.numpadButtonText}>{num}</ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={accentColor} />
      </ThemedView>
    );
  }

  if (!pinSet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Set Up Vault</ThemedText>
        <ThemedText style={styles.footer}>Create a 6-digit PIN to protect your vault</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 40) }]}>
        {/* Lock Icon */}
        <View style={styles.lockIconContainer}>
          <ThemedText style={styles.lockIcon}>🔒</ThemedText>
        </View>

        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          Unlock Vault
        </ThemedText>

        {/* PIN Dots */}
        {renderPinDots()}

        {/* Status Messages */}
        {isLockedOut && (
          <ThemedText style={styles.lockoutMessage}>
            Locked out. Try again in {Math.ceil(lockoutRemainingTime / 1000)}s
          </ThemedText>
        )}

        {failedAttempts > 0 && !isLockedOut && (
          <ThemedText style={styles.attemptsMessage}>
            {3 - failedAttempts} attempt{3 - failedAttempts !== 1 ? 's' : ''} remaining
          </ThemedText>
        )}

        {isVerifying && (
          <View style={styles.verifyingContainer}>
            <ActivityIndicator size="small" color={accentColor} />
            <ThemedText style={styles.verifyingText}>Verifying...</ThemedText>
          </View>
        )}

        {/* Biometric Button */}
        {biometricEnabled && !isVerifying && (
          <Pressable
            onPress={attemptBiometricUnlock}
            disabled={isLockedOut}
            style={({ pressed }) => [
              styles.biometricButton,
              pressed && styles.biometricButtonPressed,
            ]}
          >
            <ThemedText style={styles.biometricButtonText}>👆 Use Biometric</ThemedText>
          </Pressable>
        )}

        {/* Numpad */}
        {renderNumpad()}

        {/* Footer */}
        <ThemedText style={styles.footer}>
          Enter your 6-digit PIN to unlock the vault
        </ThemedText>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  lockIconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 64,
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  lockoutMessage: {
    textAlign: 'center',
    color: '#FF3B30',
    marginBottom: 16,
    fontWeight: '600',
  },
  attemptsMessage: {
    textAlign: 'center',
    color: '#FFB800',
    marginBottom: 16,
    fontWeight: '600',
  },
  verifyingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  verifyingText: {
    fontSize: 14,
  },
  biometricButton: {
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#00D084',
  },
  biometricButtonPressed: {
    opacity: 0.7,
  },
  biometricButtonText: {
    color: '#00D084',
    fontWeight: '600',
    fontSize: 16,
  },
  numpad: {
    marginBottom: 24,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  numpadButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  numpadButtonPressed: {
    backgroundColor: 'rgba(0, 208, 132, 0.2)',
  },
  numpadButtonDisabled: {
    opacity: 0.5,
  },
  numpadButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.6,
    marginTop: 16,
  },
});
