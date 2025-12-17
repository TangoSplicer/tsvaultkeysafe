import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const accentColor = useThemeColor({}, 'tint');

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open URL');
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const handleSendEmail = async (email: string, subject: string) => {
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    await openUrl(url);
  };

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
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText style={styles.subtitle}>
            App preferences and information
          </ThemedText>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>

          <View
            style={[
              styles.card,
              { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' },
            ]}
          >
            <View style={styles.cardRow}>
              <ThemedText>App Name</ThemedText>
              <ThemedText style={styles.cardValue}>TSVaultKeySafe</ThemedText>
            </View>
            <View style={[styles.cardRow, styles.cardRowBorder]}>
              <ThemedText>Version</ThemedText>
              <ThemedText style={styles.cardValue}>{APP_VERSION}</ThemedText>
            </View>
            <View style={styles.cardRow}>
              <ThemedText>Type</ThemedText>
              <ThemedText style={styles.cardValue}>Offline-First</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.description}>
            TSVaultKeySafe is a privacy-first, offline-only digital vault for securely storing
            product licenses, serial numbers, and warranty documents. No accounts, no cloud sync,
            no tracking.
          </ThemedText>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Legal
          </ThemedText>

          <Pressable
            onPress={() => openUrl('https://example.com/privacy')}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.linkButtonText, { color: accentColor }]}>
              Privacy Policy
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => openUrl('https://example.com/terms')}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.linkButtonText, { color: accentColor }]}>
              Terms of Service
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => openUrl('https://example.com/threat-model')}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.linkButtonText, { color: accentColor }]}>
              Threat Model
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => openUrl('https://github.com/tsvaultkeysafe/app')}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.linkButtonText, { color: accentColor }]}>
              Source Code (GitHub)
            </ThemedText>
          </Pressable>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Support
          </ThemedText>

          <Pressable
            onPress={() => handleSendEmail('support@tsvaultkeysafe.com', 'Bug Report')}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.linkButtonText, { color: accentColor }]}>
              Report Bug
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleSendEmail('support@tsvaultkeysafe.com', 'Feature Request')}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.linkButtonText, { color: accentColor }]}>
              Request Feature
            </ThemedText>
          </Pressable>
        </View>

        {/* Privacy Notice */}
        <View style={styles.section}>
          <View
            style={[
              styles.card,
              { backgroundColor: 'rgba(0, 208, 132, 0.1)' },
            ]}
          >
            <ThemedText style={styles.privacyNotice}>
              🔒 Your privacy is our priority. TSVaultKeySafe collects zero data. All information
              is encrypted locally on your device and never transmitted to cloud services.
            </ThemedText>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            © 2024 TSVaultKeySafe. All rights reserved.
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
  linkButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyNotice: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
  },
});
