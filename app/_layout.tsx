import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.webContainer}>
        <View style={styles.webCard}>
          <ThemedText type="title" style={styles.webTitle}>
            TSVaultKeySafe is native-only
          </ThemedText>
          <ThemedText style={styles.webCopy}>
            For your protection, the encrypted vault runs only in the iOS and
            Android application where device secure storage and capture controls
            are available.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack
            initialRouteName="unlock"
            screenOptions={{ headerShown: false, animation: "fade" }}
          >
            <Stack.Screen name="unlock" options={{ gestureEnabled: false }} />
            <Stack.Screen name="setup" options={{ gestureEnabled: false }} />
            <Stack.Screen name="transfer" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  webCard: {
    maxWidth: 460,
    borderRadius: 18,
    padding: 24,
    backgroundColor: "#0F172A",
  },
  webTitle: { color: "#FFFFFF", textAlign: "center", marginBottom: 12 },
  webCopy: { color: "#CCFBF1", textAlign: "center", lineHeight: 22 },
});
