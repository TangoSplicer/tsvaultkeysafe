import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { deleteProduct, getAllProducts, Product } from "@/lib/database";
import { deleteEncryptedAttachment } from "@/lib/vault-attachments";
import { requireVaultDatabaseKey } from "@/lib/vault-service";
import { recordTypeLabel } from "@/lib/vault-record-types";
import { isVaultSessionUnlocked } from "@/lib/vault-session";

type VaultFilter = "all" | "active" | "favorites" | "archived" | "expiring";

const vaultFilters: { key: VaultFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "favorites", label: "Favourites" },
  { key: "expiring", label: "Expiring" },
  { key: "archived", label: "Archived" },
];

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        setLoadError(null);
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const key = await requireVaultDatabaseKey();
        setProducts(await getAllProducts(key));
      } catch {
        if (!isVaultSessionUnlocked()) {
          router.replace("/unlock");
        } else {
          setLoadError(
            "Your secure session is open, but the vault records could not be loaded. Try again without re-entering your PIN.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const matching = !normalized
      ? products
      : products.filter((product) =>
          [
            product.name,
            product.vendor,
            product.licenseKey,
            product.category,
            recordTypeLabel(product.recordType),
            ...(product.tags ?? []),
          ].some((value) => value.toLocaleLowerCase().includes(normalized)),
        );
    const scoped = matching.filter((product) => {
      if (filter === "active") return !product.isArchived;
      if (filter === "favorites")
        return product.isFavorite && !product.isArchived;
      if (filter === "archived") return product.isArchived;
      if (filter === "expiring") {
        const label = expiryStatus(product).label;
        return label === "Expired" || label.endsWith("remaining");
      }
      return true;
    });
    return [...scoped].sort(
      (left, right) => Number(right.isFavorite) - Number(left.isFavorite),
    );
  }, [filter, products, query]);

  const copyLicenseKey = async (product: Product) => {
    await Clipboard.setStringAsync(product.licenseKey);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      if ((await Clipboard.getStringAsync()) === product.licenseKey)
        await Clipboard.setStringAsync("");
    }, 30_000);
    Alert.alert(
      "Protected value copied",
      "For your privacy, it will clear from the clipboard after 30 seconds if the clipboard has not changed.",
    );
  };

  const removeProduct = (product: Product) => {
    Alert.alert("Delete product", `Permanently delete “${product.name}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProduct(product.id);
            (product.attachments ?? []).forEach(deleteEncryptedAttachment);
            await load(true);
          } catch {
            Alert.alert(
              "Unable to delete",
              "Unlock the vault again and retry.",
            );
          }
        },
      },
    ]);
  };

  if (loading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  if (loadError)
    return (
      <ThemedView style={styles.center}>
        <View style={styles.errorCard}>
          <ThemedText type="subtitle" style={styles.errorTitle}>
            Vault loading needs attention
          </ThemedText>
          <ThemedText style={styles.errorText}>{loadError}</ThemedText>
          <Pressable onPress={() => void load()} style={styles.errorRetry}>
            <ThemedText style={styles.errorRetryText}>
              Retry vault loading
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );

  return (
    <ThemedView
      style={[styles.container, { paddingTop: Math.max(insets.top + 10, 28) }]}
    >
      <View style={styles.header}>
        <View>
          <View style={styles.eyebrow}>
            <Ionicons name="shield-checkmark" size={14} color="#5EEAD4" />
            <ThemedText style={styles.eyebrowText}>ON-DEVICE VAULT</ThemedText>
          </View>
          <ThemedText type="title" style={styles.heroTitle}>
            Your vault
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            {products.filter((product) => !product.isArchived).length} active
            records · encrypted on device
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push("/add-product")}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add product"
        >
          <ThemedText style={styles.addText}>Add</ThemedText>
        </Pressable>
      </View>
      <View style={styles.search}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search secure items, providers, or values"
          placeholderTextColor="#64748B"
          style={styles.searchInput}
          autoCorrect={false}
          accessibilityLabel="Search vault"
        />
      </View>
      <View style={styles.filterRow} accessibilityRole="tablist">
        {vaultFilters.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => setFilter(option.key)}
            style={({ pressed }) => [
              styles.filter,
              filter === option.key && styles.filterSelected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === option.key }}
            accessibilityLabel={`Show ${option.label.toLocaleLowerCase()} records`}
          >
            <ThemedText
              style={[
                styles.filterText,
                filter === option.key && styles.filterTextSelected,
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <ThemedText style={styles.resultSummary}>
        Showing {filtered.length} of {products.length} encrypted record
        {products.length === 1 ? "" : "s"}
      </ThemedText>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onOpen={() =>
              router.push({
                pathname: "/product/[id]",
                params: { id: item.id },
              })
            }
            onCopy={() => void copyLicenseKey(item)}
            onDelete={() => removeProduct(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor="#14B8A6"
          />
        }
        ListEmptyComponent={
          <EmptyState
            hasFilter={filter !== "all"}
            hasQuery={Boolean(query)}
            onAdd={() => router.push("/add-product")}
          />
        }
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

function ProductCard({
  product,
  onOpen,
  onCopy,
  onDelete,
}: {
  product: Product;
  onOpen: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const status = expiryStatus(product);
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.name}`}
      accessibilityHint={`${product.vendor}, ${status.label}. Opens the encrypted record.`}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitle}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {product.isFavorite ? "★ " : ""}
            {product.name}
          </ThemedText>
          <ThemedText style={styles.vendor} numberOfLines={1}>
            {recordTypeLabel(product.recordType)} · {product.vendor}
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: status.color + "1A" }]}>
          <ThemedText style={[styles.badgeText, { color: status.color }]}>
            {status.label}
          </ThemedText>
        </View>
      </View>
      {(product.tags?.length ?? 0) > 0 && (
        <ThemedText style={styles.tags} numberOfLines={1}>
          {(product.tags ?? []).map((tag) => `#${tag}`).join(" · ")}
        </ThemedText>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={onCopy}
          style={styles.secondaryAction}
          accessibilityRole="button"
          accessibilityLabel={`Copy protected value for ${product.name}`}
          accessibilityHint="The copied value clears from the clipboard after 30 seconds when unchanged."
        >
          <ThemedText style={styles.secondaryActionText}>Copy value</ThemedText>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${product.name}`}
          accessibilityHint="Permanently deletes this encrypted record after confirmation."
        >
          <ThemedText style={styles.deleteActionText}>Delete</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState({
  hasFilter,
  hasQuery,
  onAdd,
}: {
  hasFilter: boolean;
  hasQuery: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <View style={styles.emptyShackle} />
        <View style={styles.emptyBody} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {hasQuery || hasFilter ? "No matching records" : "Your vault is ready"}
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        {hasQuery || hasFilter
          ? "Try changing your search or local filter."
          : "Add your first product or license to begin building your private inventory."}
      </ThemedText>
      {!hasQuery && !hasFilter && (
        <Pressable onPress={onAdd} style={styles.emptyButton}>
          <ThemedText style={styles.emptyButtonText}>
            Add your first product
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function expiryStatus(product: Product): { label: string; color: string } {
  if (product.isArchived) return { label: "Archived", color: "#64748B" };
  const candidate = product.expiryDate ?? product.renewalDate;
  if (!candidate) return { label: "No renewal", color: "#64748B" };
  const days = Math.ceil(
    (new Date(`${candidate}T00:00:00`).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0) return { label: "Expired", color: "#DC2626" };
  if (days <= 30) return { label: `${days}d remaining`, color: "#D97706" };
  return { label: "Active", color: "#0F766E" };
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    padding: 22,
    backgroundColor: "#FFFBEB",
  },
  errorTitle: { textAlign: "center" },
  errorText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.75,
  },
  errorRetry: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0F766E",
  },
  errorRetryText: { color: "#FFFFFF", fontWeight: "800" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#0F172A",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  eyebrowText: {
    color: "#99F6E4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: { fontSize: 30, color: "#FFFFFF" },
  heroSubtitle: { marginTop: 4, fontSize: 13, color: "#CBD5E1" },
  addButton: {
    backgroundColor: "#14B8A6",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 13,
    shadowColor: "#5EEAD4",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 2,
  },
  addText: { color: "#042F2E", fontWeight: "900" },
  search: {
    height: 54,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7E1EA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: { fontSize: 16, color: "#0F172A" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 9,
  },
  filter: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  filterSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  filterText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  filterTextSelected: { color: "#FFFFFF" },
  resultSummary: { color: "#64748B", fontSize: 12, marginBottom: 12 },
  list: { paddingBottom: 128 },
  emptyList: { flexGrow: 1, paddingBottom: 128 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardTitle: { flex: 1 },
  vendor: { fontSize: 13, opacity: 0.63, marginTop: 4 },
  tags: { fontSize: 11, color: "#0F766E", marginTop: 10, fontWeight: "700" },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  secondaryAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#CCFBF1",
  },
  secondaryActionText: { color: "#0F766E", fontWeight: "800", fontSize: 13 },
  deleteAction: {
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  deleteActionText: { color: "#DC2626", fontWeight: "800", fontSize: 13 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyMark: { width: 58, height: 61, marginBottom: 20 },
  emptyShackle: {
    position: "absolute",
    top: 0,
    left: 14,
    width: 30,
    height: 28,
    borderWidth: 5,
    borderColor: "#14B8A6",
    borderBottomWidth: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  emptyBody: {
    position: "absolute",
    bottom: 0,
    left: 4,
    width: 50,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#0F172A",
  },
  emptyTitle: { textAlign: "center" },
  emptyText: {
    textAlign: "center",
    marginTop: 10,
    opacity: 0.66,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 22,
    backgroundColor: "#0F766E",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "800" },
  pressed: { opacity: 0.68 },
});
