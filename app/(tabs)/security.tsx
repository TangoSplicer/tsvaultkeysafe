import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  isVaultPinSet,
  isVaultBiometricEnabled,
  isVaultBiometricAvailable,
  enableVaultBiometric,
  disableVaultBiometric,
  getVaultAuthState,
  clearVaultAuthData,
} from '@/lib/vault-auth';
import { clearAllProducts, getDatabaseStats } from '@/lib/database';
import { wipeEncryptionData } from '@/lib/encryption';

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const accentColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [isPinSet, setIsPinSet] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [screenshotBlocking, setScreenshotBlocking] = useState(false);
  const [clipboardAutoClears, setClipboardAutoClears] = useState(true);
  const [dbStats, setDbStats] = useState({ productCount: 0, totalSize: 0 });

  useEffect(() => {
    loadSecurityState();
  }, []);

  const loadSecurityState = async () => {
    try {
      setIsLoading(true);
      const pinSet = await isVaultPinSet();
      const bioEnabled = await isVaultBiometricEnabled();
      const bioAvailable = await isVaultBiometricAvailable();
      const stats = await getDatabaseStats();

      setIsPinSet(pinSet);
      setIsBiometricEnabled(bioEnabled);
      setIsBiometricAvailable(bioAvailable);
      setDbStats(stats);
    } catch (error) {
      console.error('Failed to load security state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        await enableVaultBiometric();
        setIsBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication enabled');
      } else {
        await disableVaultBiometric();
        setIsBiometricEnabled(false);
        Alert.alert('Success', 'Biometric authentication disabled');
      }
    } catch (error) {
      console.error('Failed to toggle biometric:', error);
      Alert.alert('Error', 'Failed to update biometric setting');
    }
  };

  const handleWipeVault = () => {
    Alert.alert(
      'Wipe All Data',
      'This will permanently delete all products and reset the vault. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllProducts();
              await clearVaultAuthData();
              await wipeEncryptionData();
              Alert.alert('Success', 'Vault wiped successfully');
              await loadSecurityState();
            } catch (error) {
              console.error('Failed to wipe vault:', error);
              Alert.alert('Error', 'Failed to wipe vault');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={accentColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Security</ThemedText>
          <ThemedText style={styles.subtitle}>
            Manage vault encryption and authentication
          </ThemedText>
        </View>

        {/* Encryption Status */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Encryption
          </ThemedText>
          <View
            style={[
              styles.card,
              { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' },
            ]}
          >
            <View style={styles.cardRow}>
              <ThemedText>Algorithm</ThemedText>
              <ThemedText style={styles.cardValue}>AES-256-GCM</ThemedText>
            </View>
            <View style={[styles.cardRow, styles.cardRowBorder]}>
              <ThemedText>Storage</ThemedText>
              <ThemedText style={styles.cardValue}>Local Only</ThemedText>
            </View>
            <View style={styles.cardRow}>
              <ThemedText>Status</ThemedText>
              <ThemedText style={[styles.cardValue, { color: '#00D084' }]}>
                🔒 Encrypted
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Authentication */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Authentication
          </ThemedText>

          {/* PIN Status */}
          <View
            style={[
              styles.card,
              { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' },
            ]}
          >
            <View style={styles.cardRow}>
              <ThemedText>PIN Protection</ThemedText>
              <ThemedText style={[styles.cardValue, { color: isPinSet ? '#00D084' : '#FFB800' }]}>
                {isPinSet ? '✓ Set' : '○ Not Set'}
              </ThemedText>
            </View>
          </View>

          {/* Biometric */}
          {isBiometricAvailable && (
            <View
              style={[
                styles.card,
                { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' },
                styles.cardMarginTop,
              ]}
            >
              <View style={styles.cardRow}>
                <ThemedText>Biometric Unlock</ThemedText>
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#767577', true: accentColor + '80' }}
                  thumbColor={isBiometricEnabled ? accentColor : '#f4f3f4'}
                />
              </View>
            </View>
          )}
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Privacy
          </ThemedText>

          <View
            style={[
              styles.card,
              { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' },
            ]}
          >
            <View style={styles.cardRow}>
              <ThemedText>Screenshot Blocking</ThemedText>
              <Switch
                value={screenshotBlocking}
                onValueChange={setScreenshotBlocking}
                trackColor={{ false: '#767577', true: accentColor + '80' }}
                thumbColor={screenshotBlocking ? accentColor : '#f4f3f4'}
              />
            </View>
            <View style={[styles.cardRow, styles.cardRowBorder]}>
              <ThemedText>Clipboard Auto-Clear</ThemedText>
              <Switch
                value={clipboardAutoClears}
                onValueChange={setClipboardAutoClears}
                trackColor={{ false: '#767577', true: accentColor + '80' }}
                thumbColor={clipboardAutoClears ? accentColor : '#f4f3f4'}
              />
            </View>
          </View>

          <ThemedText style={styles.description}>
            Screenshot blocking prevents screenshots while the vault is open. Clipboard auto-clear
            removes copied license keys after 30 seconds.
          </ThemedText>
        </View>

        {/* Vault Statistics */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Vault Statistics
          </ThemedText>

          <View
            style={[
              styles.card,
              { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' },
            ]}
          >
            <View style={styles.cardRow}>
              <ThemedText>Products Stored</ThemedText>
              <ThemedText style={styles.cardValue}>{dbStats.productCount}</ThemedText>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Danger Zone
          </ThemedText>

          <Pressable
            onPress={handleWipeVault}
            style={({ pressed }) => [
              styles.dangerButton,
              pressed && styles.dangerButtonPressed,
            ]}
          >
            <ThemedText style={styles.dangerButtonText}>Wipe All Data</ThemedText>
          </Pressable>

          <ThemedText style={styles.description}>
            This will permanently delete all products and reset the vault. This action cannot be
            undone.
          </ThemedText>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            All data is encrypted locally on your device. No information is sent to cloud services.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardMarginTop: {
    marginTop: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 12,
    opacity: 0.6,
    lineHeight: 18,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dangerButtonPressed: {
    opacity: 0.8,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    borderRadius: 8,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
  },
});
