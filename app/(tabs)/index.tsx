import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteProduct, getAllProducts, Product } from '@/lib/database';
import { requireVaultDatabaseKey } from '@/lib/vault-service';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const key = await requireVaultDatabaseKey();
      setProducts(await getAllProducts(key));
    } catch {
      router.replace('/unlock');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return products;
    return products.filter((product) => [product.name, product.vendor, product.licenseKey, product.category].some((value) => value.toLocaleLowerCase().includes(normalized)));
  }, [products, query]);

  const copyLicenseKey = async (product: Product) => {
    await Clipboard.setStringAsync(product.licenseKey);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      if ((await Clipboard.getStringAsync()) === product.licenseKey) await Clipboard.setStringAsync('');
    }, 30_000);
    Alert.alert('License key copied', 'For your privacy, it will clear from the clipboard after 30 seconds if the clipboard has not changed.');
  };

  const removeProduct = (product: Product) => {
    Alert.alert('Delete product', `Permanently delete “${product.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteProduct(product.id);
          await load(true);
        } catch { Alert.alert('Unable to delete', 'Unlock the vault again and retry.'); }
      } },
    ]);
  };

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator size="large" color="#14B8A6" /></ThemedView>;

  return (
    <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}>
      <View style={styles.header}><View><ThemedText type="title" style={styles.title}>Your vault</ThemedText><ThemedText style={styles.subtitle}>{products.filter((product) => !product.isArchived).length} active records · encrypted on device</ThemedText></View><Pressable onPress={() => router.push('/add-product')} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Add product"><ThemedText style={styles.addText}>Add</ThemedText></Pressable></View>
      <View style={styles.search}><TextInput value={query} onChangeText={setQuery} placeholder="Search products, vendors, or keys" placeholderTextColor="#64748B" style={styles.searchInput} autoCorrect={false} accessibilityLabel="Search vault" /></View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} onOpen={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })} onCopy={() => void copyLicenseKey(item)} onDelete={() => removeProduct(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#14B8A6" />}
        ListEmptyComponent={<EmptyState hasQuery={Boolean(query)} onAdd={() => router.push('/add-product')} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

function ProductCard({ product, onOpen, onCopy, onDelete }: { product: Product; onOpen: () => void; onCopy: () => void; onDelete: () => void }) {
  const status = expiryStatus(product);
  return <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Open ${product.name}`}><View style={styles.cardTop}><View style={styles.cardTitle}><ThemedText type="defaultSemiBold" numberOfLines={1}>{product.name}</ThemedText><ThemedText style={styles.vendor} numberOfLines={1}>{product.vendor} · {product.category}</ThemedText></View><View style={[styles.badge, { backgroundColor: status.color + '1A' }]}><ThemedText style={[styles.badgeText, { color: status.color }]}>{status.label}</ThemedText></View></View><View style={styles.actions}><Pressable onPress={onCopy} style={styles.secondaryAction}><ThemedText style={styles.secondaryActionText}>Copy key</ThemedText></Pressable><Pressable onPress={onDelete} style={styles.deleteAction}><ThemedText style={styles.deleteActionText}>Delete</ThemedText></Pressable></View></Pressable>;
}

function EmptyState({ hasQuery, onAdd }: { hasQuery: boolean; onAdd: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyMark}><View style={styles.emptyShackle} /><View style={styles.emptyBody} /></View><ThemedText type="subtitle" style={styles.emptyTitle}>{hasQuery ? 'No matching records' : 'Your vault is ready'}</ThemedText><ThemedText style={styles.emptyText}>{hasQuery ? 'Try a different search term.' : 'Add your first product or license to begin building your private inventory.'}</ThemedText>{!hasQuery && <Pressable onPress={onAdd} style={styles.emptyButton}><ThemedText style={styles.emptyButtonText}>Add your first product</ThemedText></Pressable>}</View>;
}

function expiryStatus(product: Product): { label: string; color: string } {
  if (product.isArchived) return { label: 'Archived', color: '#64748B' };
  const candidate = product.expiryDate ?? product.renewalDate;
  if (!candidate) return { label: 'No renewal', color: '#64748B' };
  const days = Math.ceil((new Date(`${candidate}T00:00:00`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Expired', color: '#DC2626' };
  if (days <= 30) return { label: `${days}d remaining`, color: '#D97706' };
  return { label: 'Active', color: '#0F766E' };
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, title: { fontSize: 30 }, subtitle: { marginTop: 4, fontSize: 13, opacity: 0.65 }, addButton: { backgroundColor: '#0F766E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }, addText: { color: '#FFFFFF', fontWeight: '800' }, search: { height: 52, justifyContent: 'center', borderRadius: 14, backgroundColor: '#E2E8F0', paddingHorizontal: 14, marginBottom: 16 }, searchInput: { fontSize: 16, color: '#0F172A' }, list: { paddingBottom: 102 }, emptyList: { flexGrow: 1, paddingBottom: 96 }, card: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }, cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, cardTitle: { flex: 1 }, vendor: { fontSize: 13, opacity: 0.63, marginTop: 4 }, badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, badgeText: { fontSize: 11, fontWeight: '800' }, actions: { flexDirection: 'row', gap: 10, marginTop: 16 }, secondaryAction: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#CCFBF1' }, secondaryActionText: { color: '#0F766E', fontWeight: '800', fontSize: 13 }, deleteAction: { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FEF2F2' }, deleteActionText: { color: '#DC2626', fontWeight: '800', fontSize: 13 }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }, emptyMark: { width: 58, height: 61, marginBottom: 20 }, emptyShackle: { position: 'absolute', top: 0, left: 14, width: 30, height: 28, borderWidth: 5, borderColor: '#14B8A6', borderBottomWidth: 0, borderTopLeftRadius: 18, borderTopRightRadius: 18 }, emptyBody: { position: 'absolute', bottom: 0, left: 4, width: 50, height: 38, borderRadius: 11, backgroundColor: '#0F172A' }, emptyTitle: { textAlign: 'center' }, emptyText: { textAlign: 'center', marginTop: 10, opacity: 0.66, lineHeight: 20 }, emptyButton: { marginTop: 22, backgroundColor: '#0F766E', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 }, emptyButtonText: { color: '#FFFFFF', fontWeight: '800' }, pressed: { opacity: 0.68 },
});
