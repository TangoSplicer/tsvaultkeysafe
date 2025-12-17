import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Product, getAllProducts, searchProducts, deleteProduct } from '@/lib/database';
import { getMasterKey, deriveKeys } from '@/lib/encryption';
import { shouldVaultAutoLock } from '@/lib/vault-auth';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const accentColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'icon');

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [clipboardTimer, setClipboardTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
    const interval = setInterval(checkAutoLock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter products when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      filterProducts();
    }
  }, [searchQuery, products]);

  const checkAutoLock = async () => {
    const shouldLock = await shouldVaultAutoLock();
      if (shouldLock && !isLocked) {
        setIsLocked(true);
        router.replace('/(tabs)' as any);
      }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      // Check auto-lock
      const shouldLock = await shouldVaultAutoLock();
      if (shouldLock) {
        setIsLocked(true);
        router.replace('/(tabs)' as any);
        return;
      }

      const masterKey = await getMasterKey();
      if (!masterKey) {
        router.replace('/(tabs)' as any);
        return;
      }

      const keys = await deriveKeys(masterKey);
      const allProducts = await getAllProducts(keys.databaseKey);
      setProducts(allProducts);
      setFilteredProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('Error', 'Failed to load vault');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = async () => {
    try {
      const masterKey = await getMasterKey();
      if (!masterKey) return;

      const keys = await deriveKeys(masterKey);
      const results = await searchProducts(searchQuery, keys.databaseKey);
      setFilteredProducts(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleCopyLicenseKey = useCallback(
    async (product: Product) => {
      try {
        await Clipboard.setString(product.licenseKey);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Clear clipboard after 30 seconds
        if (clipboardTimer) clearTimeout(clipboardTimer);
        const timer = setTimeout(() => {
          Clipboard.setString('');
        }, 30000);
        setClipboardTimer(timer);

        Alert.alert('Copied', 'License key copied to clipboard (auto-clear in 30s)');
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    },
    [clipboardTimer]
  );

  const handleDeleteProduct = useCallback(
    (product: Product) => {
      Alert.alert('Delete Product', `Are you sure you want to delete "${product.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadProducts();
            } catch (error) {
              console.error('Failed to delete product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]);
    },
    []
  );

  const getExpiryStatus = (product: Product) => {
    if (!product.expiryDate && !product.renewalDate) {
      return { label: 'No expiry', color: '#A0A0A0' };
    }

    const expiryDate = new Date(product.expiryDate || product.renewalDate!);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { label: 'Expired', color: '#FF3B30' };
    } else if (daysUntilExpiry < 30) {
      return { label: `Expires in ${daysUntilExpiry}d`, color: '#FFB800' };
    } else {
      return { label: 'Active', color: '#00D084' };
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const expiryStatus = getExpiryStatus(item);

    return (
      <Pressable
        onPress={() => router.push('/(tabs)' as any)}
        style={({ pressed }) => [
          styles.productCard,
          {
            backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText style={styles.vendor} numberOfLines={1}>
              {item.vendor}
            </ThemedText>
          </View>
          <View
            style={[
              styles.expiryBadge,
              { backgroundColor: expiryStatus.color + '20', borderColor: expiryStatus.color },
            ]}
          >
            <ThemedText style={[styles.expiryText, { color: expiryStatus.color }]}>
              {expiryStatus.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.productActions}>
          <Pressable
            onPress={() => handleCopyLicenseKey(item)}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          >
            <ThemedText style={[styles.actionButtonText, { color: accentColor }]}>
              Copy Key
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleDeleteProduct(item)}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          >
            <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ThemedText type="title" style={styles.emptyTitle}>
        No Products
      </ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Tap the + button to add your first product
      </ThemedText>
    </View>
  );

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
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Vault</ThemedText>
        <ThemedText style={styles.subtitle}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#E0E0E0' },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search products..."
          placeholderTextColor={secondaryTextColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* FAB - Add Product */}
      <Pressable
        onPress={() => router.push('/(tabs)' as any)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ThemedText style={styles.fabText}>+</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    height: 44,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  productCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  vendor: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  expiryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
