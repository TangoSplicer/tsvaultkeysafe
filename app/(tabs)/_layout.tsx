import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  disableVaultScreenProtection,
  enableVaultScreenProtection,
} from "@/lib/privacy";
import {
  endVaultSession,
  getVaultSessionMode,
  isVaultSessionUnlocked,
} from "@/lib/vault-session";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    const lock = async () => {
      endVaultSession();
      await disableVaultScreenProtection();
      router.replace("/unlock");
    };
    const secureActiveSession = async () => {
      const mode = getVaultSessionMode();
      if (mode === "decoy") {
        router.replace("/decoy");
        return;
      }
      if (!isVaultSessionUnlocked()) {
        router.replace("/unlock");
        return;
      }
      await enableVaultScreenProtection();
    };

    void secureActiveSession();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") void lock();
      else void secureActiveSession();
    });
    return () => {
      subscription.remove();
      void disableVaultScreenProtection();
    };
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
        tabBarStyle: {
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 64 + Math.max(insets.bottom, 8),
          borderTopWidth: 0,
          backgroundColor: colorScheme === "dark" ? "#111827" : "#FFFFFF",
          elevation: 10,
          shadowColor: "#0F172A",
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vault",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="key-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          title: "Security",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
