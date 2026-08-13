import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteProduct, getProduct, Product, ProductCategory, updateProduct } from '@/lib/database';
import { requireVaultDatabaseKey } from '@/lib/vault-service';

const categories: ProductCategory[] = ['Software', 'Game', 'Subscription', 'Template', 'Other'];

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const key = await requireVaultDatabaseKey();
      const record = await getProduct(id, key);
      if (!record) throw new Error('Product not found');
      setProduct(record);
    } catch {
      Alert.alert('Product unavailable', 'Unlock the vault again and try opening this product.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof Product>(key: K, value: Product[K]) => setProduct((current) => current ? { ...current, [key]: value } : current);

  const save = async () => {
    if (!product) return;
    try {
      setSaving(true);
      const key = await requireVaultDatabaseKey();
      const updated = await updateProduct(product.id, product, key);
      setProduct(updated);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved securely', 'Your product record has been updated.');
    } catch (error) {
      Alert.alert('Unable to save', error instanceof Error ? error.message : 'Please review the form and try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyKey = async () => {
    if (!product) return;
    await Clipboard.setStringAsync(product.licenseKey);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      if ((await Clipboard.getStringAsync()) === product.licenseKey) await Clipboard.setStringAsync('');
    }, 30_000);
    Alert.alert('Copied securely', 'The license key will be cleared from the clipboard after 30 seconds if it has not changed.');
  };

  const remove = () => {
    if (!product) return;
    Alert.alert('Delete product', `Permanently delete “${product.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteProduct(product.id);
          router.back();
        } catch { Alert.alert('Unable to delete', 'Please unlock the vault again and retry.'); }
      } },
    ]);
  };

  if (loading || !product) return <ThemedView style={styles.center}><ActivityIndicator size="large" color="#14B8A6" /></ThemedView>;
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><ThemedText type="title">Product details</ThemedText><ThemedText style={styles.subtitle}>Edit the encrypted record below.</ThemedText></View>
        <Field label="Product name" value={product.name} onChangeText={(value) => update('name', value)} required />
        <Field label="Vendor" value={product.vendor} onChangeText={(value) => update('vendor', value)} required />
        <Field label="License key" value={product.licenseKey} onChangeText={(value) => update('licenseKey', value)} multiline autoCapitalize="characters" required />
        <Pressable onPress={() => void copyKey()} style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}><ThemedText style={styles.copyText}>Copy license key for 30 seconds</ThemedText></Pressable>
        <Field label="Serial number" value={product.serialNumber ?? ''} onChangeText={(value) => update('serialNumber', value || undefined)} autoCapitalize="characters" />
        <ThemedText style={styles.label}>Category</ThemedText>
        <View style={styles.categoryGrid}>{categories.map((category) => <Pressable key={category} onPress={() => update('category', category)} style={[styles.category, product.category === category && styles.categorySelected]}><ThemedText style={[styles.categoryText, product.category === category && styles.categoryTextSelected]}>{category}</ThemedText></Pressable>)}</View>
        <Field label="Purchase date" value={product.purchaseDate ?? ''} onChangeText={(value) => update('purchaseDate', value || undefined)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <Field label="Expiry date" value={product.expiryDate ?? ''} onChangeText={(value) => update('expiryDate', value || undefined)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <Field label="Renewal date" value={product.renewalDate ?? ''} onChangeText={(value) => update('renewalDate', value || undefined)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <Field label="Private notes" value={product.notes ?? ''} onChangeText={(value) => update('notes', value || undefined)} multiline />
        <View style={styles.switchRow}><View><ThemedText style={styles.label}>Archived</ThemedText><ThemedText style={styles.helper}>Hide from your active vault list.</ThemedText></View><Switch value={product.isArchived} onValueChange={(value) => update('isArchived', value)} trackColor={{ false: '#94A3B8', true: '#14B8A6' }} /></View>
        <View style={styles.meta}><ThemedText style={styles.metaText}>Created {new Date(product.createdAt).toLocaleDateString()}</ThemedText><ThemedText style={styles.metaText}>Updated {new Date(product.updatedAt).toLocaleDateString()}</ThemedText></View>
        <Pressable onPress={remove} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}><ThemedText style={styles.deleteText}>Delete this product</ThemedText></Pressable>
      </ScrollView>
      <View style={styles.footer}><Pressable onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}><ThemedText style={styles.saveText}>{saving ? 'Encrypting…' : 'Save changes'}</ThemedText></Pressable></View>
    </ThemedView>
  );
}

function Field({ label, required, ...props }: { label: string; required?: boolean } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><ThemedText style={styles.label}>{label}{required ? ' *' : ''}</ThemedText><TextInput {...props} style={[styles.input, props.multiline && styles.textarea]} placeholderTextColor="#64748B" /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 20, paddingBottom: 130 }, header: { marginBottom: 24 }, subtitle: { marginTop: 6, opacity: 0.68 }, field: { marginBottom: 16 }, label: { fontWeight: '800', fontSize: 14, marginBottom: 8 }, input: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 14, color: '#0F172A', backgroundColor: '#FFFFFF', fontSize: 16 }, textarea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }, copyButton: { alignItems: 'center', borderWidth: 1, borderColor: '#14B8A6', borderRadius: 12, paddingVertical: 12, marginBottom: 20 }, copyText: { color: '#0F766E', fontWeight: '800' }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }, category: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#E2E8F0' }, categorySelected: { backgroundColor: '#0F766E' }, categoryText: { fontSize: 13, fontWeight: '700', color: '#334155' }, categoryTextSelected: { color: '#FFFFFF' }, switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingVertical: 12 }, helper: { fontSize: 12, opacity: 0.65 }, meta: { gap: 5, paddingVertical: 18 }, metaText: { fontSize: 12, opacity: 0.55 }, deleteButton: { alignItems: 'center', borderWidth: 1, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 13, marginTop: 8 }, deleteText: { color: '#DC2626', fontWeight: '800' }, footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: 'rgba(255,255,255,0.94)', borderTopWidth: 1, borderTopColor: '#E2E8F0' }, saveButton: { alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 14, backgroundColor: '#0F766E' }, saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 }, pressed: { opacity: 0.7 },
});
