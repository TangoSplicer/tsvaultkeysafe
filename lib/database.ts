import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptData, decryptData, EncryptedData } from './encryption';

/**
 * Database Service
 * Handles encrypted SQLite storage for vault products
 */

export interface Product {
  id: string;
  name: string;
  vendor: string;
  licenseKey: string;
  serialNumber?: string;
  purchaseDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  notes?: string;
  category: 'Software' | 'Game' | 'Subscription' | 'Template' | 'Other';
  attachments?: string[]; // File paths
  downloadUrls?: string[];
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface StoredProduct {
  id: string;
  ciphertext: string;
  nonce: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'tsvault.db';
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database
 */
export async function initializeDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create products table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        nonce TEXT NOT NULL,
        tag TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_createdAt ON products(createdAt);
      CREATE INDEX IF NOT EXISTS idx_updatedAt ON products(updatedAt);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Error('Failed to initialize database');
  }
}

/**
 * Get database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * Create a new product
 */
export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  encryptionKey: string
): Promise<Product> {
  try {
    if (!db) throw new Error('Database not initialized');

    const id = generateId();
    const now = new Date().toISOString();

    const fullProduct: Product = {
      ...product,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Encrypt product data
    const encrypted = await encryptData(
      JSON.stringify(fullProduct),
      encryptionKey,
      id // Use product ID as additional authenticated data
    );

    // Store encrypted data
    await db.runAsync(
      `INSERT INTO products (id, ciphertext, nonce, tag, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, encrypted.ciphertext, encrypted.nonce, encrypted.tag, now, now]
    );

    return fullProduct;
  } catch (error) {
    console.error('Failed to create product:', error);
    throw new Error('Failed to create product');
  }
}

/**
 * Get product by ID
 */
export async function getProduct(
  id: string,
  encryptionKey: string
): Promise<Product | null> {
  try {
    if (!db) throw new Error('Database not initialized');

    const result = await db.getFirstAsync<StoredProduct>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (!result) {
      return null;
    }

    // Decrypt product data
    const decrypted = await decryptData(
      {
        ciphertext: result.ciphertext,
        nonce: result.nonce,
        tag: result.tag,
      },
      encryptionKey,
      id
    );

    const product = JSON.parse(decrypted) as Product;
    return product;
  } catch (error) {
    console.error('Failed to get product:', error);
    throw new Error('Failed to retrieve product');
  }
}

/**
 * Get all products
 */
export async function getAllProducts(
  encryptionKey: string
): Promise<Product[]> {
  try {
    if (!db) throw new Error('Database not initialized');

    const results = await db.getAllAsync<StoredProduct>(
      'SELECT * FROM products ORDER BY updatedAt DESC'
    );

    const products: Product[] = [];

    for (const result of results) {
      try {
        const decrypted = await decryptData(
          {
            ciphertext: result.ciphertext,
            nonce: result.nonce,
            tag: result.tag,
          },
          encryptionKey,
          result.id
        );

        const product = JSON.parse(decrypted) as Product;
        products.push(product);
      } catch (error) {
        console.error(`Failed to decrypt product ${result.id}:`, error);
        // Skip corrupted products
      }
    }

    return products;
  } catch (error) {
    console.error('Failed to get all products:', error);
    throw new Error('Failed to retrieve products');
  }
}

/**
 * Update product
 */
export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>,
  encryptionKey: string
): Promise<Product> {
  try {
    if (!db) throw new Error('Database not initialized');

    // Get existing product
    const existing = await getProduct(id, encryptionKey);
    if (!existing) {
      throw new Error('Product not found');
    }

    // Merge updates
    const updated: Product = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Encrypt updated product
    const encrypted = await encryptData(
      JSON.stringify(updated),
      encryptionKey,
      id
    );

    // Update in database
    await db.runAsync(
      `UPDATE products SET ciphertext = ?, nonce = ?, tag = ?, updatedAt = ?
       WHERE id = ?`,
      [
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.tag,
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  } catch (error) {
    console.error('Failed to update product:', error);
    throw new Error('Failed to update product');
  }
}

/**
 * Delete product
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    if (!db) throw new Error('Database not initialized');

    await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete product:', error);
    throw new Error('Failed to delete product');
  }
}

/**
 * Search products by name, vendor, or license key
 */
export async function searchProducts(
  query: string,
  encryptionKey: string
): Promise<Product[]> {
  try {
    const allProducts = await getAllProducts(encryptionKey);

    const lowerQuery = query.toLowerCase();

    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.vendor.toLowerCase().includes(lowerQuery) ||
        product.licenseKey.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Failed to search products:', error);
    throw new Error('Failed to search products');
  }
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  category: string,
  encryptionKey: string
): Promise<Product[]> {
  try {
    const allProducts = await getAllProducts(encryptionKey);
    return allProducts.filter((p) => p.category === category);
  } catch (error) {
    console.error('Failed to get products by category:', error);
    throw new Error('Failed to retrieve products');
  }
}

/**
 * Get expiring products (within N days)
 */
export async function getExpiringProducts(
  days: number,
  encryptionKey: string
): Promise<Product[]> {
  try {
    const allProducts = await getAllProducts(encryptionKey);
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return allProducts.filter((p) => {
      if (!p.expiryDate && !p.renewalDate) return false;

      const checkDate = p.expiryDate || p.renewalDate;
      const expiryDate = new Date(checkDate!);

      return expiryDate <= futureDate && expiryDate >= now;
    });
  } catch (error) {
    console.error('Failed to get expiring products:', error);
    throw new Error('Failed to retrieve expiring products');
  }
}

/**
 * Export products to JSON
 */
export async function exportProductsToJson(
  encryptionKey: string
): Promise<string> {
  try {
    const products = await getAllProducts(encryptionKey);
    return JSON.stringify(products, null, 2);
  } catch (error) {
    console.error('Failed to export products:', error);
    throw new Error('Failed to export products');
  }
}

/**
 * Export products to CSV
 */
export async function exportProductsToCsv(
  encryptionKey: string
): Promise<string> {
  try {
    const products = await getAllProducts(encryptionKey);

    if (products.length === 0) {
      return 'No products to export';
    }

    // CSV headers
    const headers = [
      'Product Name',
      'Vendor',
      'License Key',
      'Serial Number',
      'Purchase Date',
      'Expiry Date',
      'Renewal Date',
      'Category',
      'Notes',
    ];

    // CSV rows
    const rows = products.map((p) => [
      escapeCsv(p.name),
      escapeCsv(p.vendor),
      escapeCsv(p.licenseKey),
      escapeCsv(p.serialNumber || ''),
      p.purchaseDate || '',
      p.expiryDate || '',
      p.renewalDate || '',
      p.category,
      escapeCsv(p.notes || ''),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  } catch (error) {
    console.error('Failed to export products to CSV:', error);
    throw new Error('Failed to export products');
  }
}

/**
 * Import products from JSON
 */
export async function importProductsFromJson(
  jsonData: string,
  encryptionKey: string
): Promise<number> {
  try {
    if (!db) throw new Error('Database not initialized');

    const products = JSON.parse(jsonData) as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[];

    let imported = 0;

    for (const product of products) {
      try {
        await createProduct(product, encryptionKey);
        imported++;
      } catch (error) {
        console.error('Failed to import product:', error);
        // Continue with next product
      }
    }

    return imported;
  } catch (error) {
    console.error('Failed to import products:', error);
    throw new Error('Failed to import products');
  }
}

/**
 * Clear all products (factory reset)
 */
export async function clearAllProducts(): Promise<void> {
  try {
    if (!db) throw new Error('Database not initialized');

    await db.runAsync('DELETE FROM products');
    console.log('All products cleared');
  } catch (error) {
    console.error('Failed to clear products:', error);
    throw new Error('Failed to clear products');
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  productCount: number;
  totalSize: number;
}> {
  try {
    if (!db) throw new Error('Database not initialized');

    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM products'
    );

    return {
      productCount: result?.count || 0,
      totalSize: 0, // TODO: Calculate actual size
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw new Error('Failed to get database statistics');
  }
}

/**
 * Helper: Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper: Escape CSV values
 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
