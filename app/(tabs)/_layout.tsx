import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { disableVaultScreenProtection, enableVaultScreenProtection } from '@/lib/privacy';
import { endVaultSession, isVaultSessionUnlocked } from '@/lib/vault-session';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    const lock = async () => {
      endVaultSession();
      await disableVaultScreenProtection();
      router.replace('/unlock');
    };
    const secureActiveSession = async () => {
      if (!isVaultSessionUnlocked()) {
        router.replace('/unlock');
        return;
      }
      await enableVaultScreenProtection();
    };

    void secureActiveSession();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') void lock();
      else void secureActiveSession();
    });
    return () => {
      subscription.remove();
      void disableVaultScreenProtection();
    };
  }, [router]);

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      headerShown: false,
      tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      tabBarStyle: { paddingBottom: insets.bottom, height: 54 + insets.bottom },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Vault' }} />
      <Tabs.Screen name="security" options={{ title: 'Security' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
