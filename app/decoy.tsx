import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getActiveDecoyProducts, clearActiveDecoyKey } from "@/lib/decoy-vault";
import {
  disableVaultScreenProtection,
  enableVaultScreenProtection,
} from "@/lib/privacy";
import { recordTypeLabel } from "@/lib/vault-record-types";
import { endVaultSession, isDecoyVaultSession } from "@/lib/vault-session";
import type { Product } from "@/lib/database";

export default function DecoyVaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isDecoyVaultSession()) {
      router.replace("/unlock");
      return;
    }
    try {
      setProducts(await getActiveDecoyProducts());
    } catch {
      endVaultSession();
      clearActiveDecoyKey();
      router.replace("/unlock");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    void enableVaultScreenProtection();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        clearActiveDecoyKey();
        endVaultSession();
      } else if (!isDecoyVaultSession()) {
        router.replace("/unlock");
      }
    });
    return () => {
      subscription.remove();
      void disableVaultScreenProtection();
    };
  }, [load, router]);

  const lockDecoyVault = () => {
    clearActiveDecoyKey();
    endVaultSession();
    void disableVaultScreenProtection();
    router.replace("/unlock");
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 14, 30) }]}
      >
        <View style={styles.eyebrow}>
          <Ionicons name="shield-checkmark" size={14} color="#5EEAD4" />
          <ThemedText style={styles.eyebrowText}>
            PRIVATE FALLBACK SPACE
          </ThemedText>
        </View>
        <View style={styles.titleRow}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Your vault
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {products.length} protected local record
              {products.length === 1 ? "" : "s"}
            </ThemedText>
          </View>
          <Pressable
            onPress={lockDecoyVault}
            style={styles.lockButton}
            accessibilityRole="button"
          >
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            <ThemedText style={styles.lockText}>Lock</ThemedText>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom + 28, 44) },
        ]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#0F766E"
              />
            </View>
            <View style={styles.cardCopy}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText style={styles.vendor}>
                {recordTypeLabel(item.recordType)} · {item.vendor}
              </ThemedText>
              <ThemedText style={styles.note}>
                {item.notes ?? "Local reference"}
              </ThemedText>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText type="subtitle">No records available</ThemedText>
            <ThemedText style={styles.emptyText}>
              This protected space contains no visible records.
            </ThemedText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 18, paddingBottom: 20 },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  eyebrowText: {
    color: "#5EEAD4",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#FFFFFF" },
  subtitle: { color: "#CBD5E1", marginTop: 5 },
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: "#0F766E",
  },
  lockText: { color: "#FFFFFF", fontWeight: "900" },
  list: { paddingHorizontal: 18, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 17,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E2EA",
  },
  cardIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#CCFBF1",
  },
  cardCopy: { flex: 1, gap: 3 },
  vendor: { color: "#475569", fontSize: 12 },
  note: { color: "#64748B", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 90, gap: 8 },
  emptyText: { color: "#64748B", textAlign: "center" },
});
