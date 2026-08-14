import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import {
  decryptData,
  deriveExportKey,
  encryptData,
  EncryptedData,
} from "./encryption";

export type ProductCategory =
  | "Software"
  | "Game"
  | "Subscription"
  | "Template"
  | "Other";

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
  category: ProductCategory;
  attachments?: string[];
  downloadUrls?: string[];
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

interface StoredProduct {
  id: string;
  ciphertext: string;
  nonce: string;
  tag: string;
  encryptionVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedVaultExport {
  format: "tsvaultkeysafe-encrypted-export";
  version: 2;
  createdAt: string;
  salt: string;
  payload: EncryptedData;
}

const DB_NAME = "tsvault.db";
const MAX_PRODUCT_TEXT_LENGTH = 4_000;
const MAX_PRODUCTS_PER_IMPORT = 10_000;
let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      ciphertext TEXT NOT NULL,
      nonce TEXT NOT NULL,
      tag TEXT NOT NULL,
      encryptionVersion INTEGER NOT NULL DEFAULT 2,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updatedAt);
  `);

  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(products)",
  );
  if (!columns.some((column) => column.name === "encryptionVersion")) {
    await db.execAsync(
      "ALTER TABLE products ADD COLUMN encryptionVersion INTEGER NOT NULL DEFAULT 1",
    );
  }
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized");
  return db;
}

function trimRequired(value: unknown, field: string, limit = 256): string {
  if (typeof value !== "string") throw new Error(`${field} is required`);
  const result = value.trim();
  if (!result || result.length > limit) throw new Error(`${field} is invalid`);
  return result;
}

function trimOptional(
  value: unknown,
  field: string,
  limit = MAX_PRODUCT_TEXT_LENGTH,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > limit)
    throw new Error(`${field} is invalid`);
  return value.trim() || undefined;
}

function isIsoDate(value: string | undefined): boolean {
  return value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeProductInput(
  input: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Omit<Product, "id" | "createdAt" | "updatedAt"> {
  const category: ProductCategory[] = [
    "Software",
    "Game",
    "Subscription",
    "Template",
    "Other",
  ];
  if (!category.includes(input.category))
    throw new Error("Category is invalid");

  const purchaseDate = trimOptional(input.purchaseDate, "Purchase date", 10);
  const expiryDate = trimOptional(input.expiryDate, "Expiry date", 10);
  const renewalDate = trimOptional(input.renewalDate, "Renewal date", 10);
  if (![purchaseDate, expiryDate, renewalDate].every(isIsoDate)) {
    throw new Error("Dates must use YYYY-MM-DD format");
  }

  return {
    name: trimRequired(input.name, "Name"),
    vendor: trimRequired(input.vendor, "Vendor"),
    licenseKey: trimRequired(
      input.licenseKey,
      "License key",
      MAX_PRODUCT_TEXT_LENGTH,
    ),
    serialNumber: trimOptional(input.serialNumber, "Serial number"),
    purchaseDate,
    expiryDate,
    renewalDate,
    notes: trimOptional(input.notes, "Notes"),
    category: input.category,
    attachments: Array.isArray(input.attachments)
      ? input.attachments
          .filter((item): item is string => typeof item === "string")
          .slice(0, 32)
      : undefined,
    downloadUrls: Array.isArray(input.downloadUrls)
      ? input.downloadUrls
          .filter((item): item is string => /^https:\/\//.test(item))
          .slice(0, 32)
      : undefined,
    isArchived: Boolean(input.isArchived),
  };
}

function toEncryptedData(record: StoredProduct): EncryptedData {
  if (record.encryptionVersion !== 2) {
    throw new Error(
      "This record uses a retired encryption format and must be restored from a legacy build before upgrading",
    );
  }
  return {
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    tag: record.tag,
    version: 2,
  };
}

export async function createProduct(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
  encryptionKey: string,
): Promise<Product> {
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const fullProduct: Product = {
    ...sanitizeProductInput(product),
    id,
    createdAt: now,
    updatedAt: now,
  };
  const encrypted = await encryptData(
    JSON.stringify(fullProduct),
    encryptionKey,
    id,
  );

  await getDb().runAsync(
    `INSERT INTO products (id, ciphertext, nonce, tag, encryptionVersion, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      encrypted.ciphertext,
      encrypted.nonce,
      encrypted.tag,
      encrypted.version,
      now,
      now,
    ],
  );
  return fullProduct;
}

export async function getProduct(
  id: string,
  encryptionKey: string,
): Promise<Product | null> {
  const record = await getDb().getFirstAsync<StoredProduct>(
    "SELECT * FROM products WHERE id = ?",
    [id],
  );
  if (!record) return null;
  const plaintext = await decryptData(
    toEncryptedData(record),
    encryptionKey,
    id,
  );
  return JSON.parse(plaintext) as Product;
}

export async function getAllProducts(
  encryptionKey: string,
): Promise<Product[]> {
  const records = await getDb().getAllAsync<StoredProduct>(
    "SELECT * FROM products ORDER BY updatedAt DESC",
  );
  const products: Product[] = [];
  for (const record of records) {
    const plaintext = await decryptData(
      toEncryptedData(record),
      encryptionKey,
      record.id,
    );
    products.push(JSON.parse(plaintext) as Product);
  }
  return products;
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
  encryptionKey: string,
): Promise<Product> {
  const existing = await getProduct(id, encryptionKey);
  if (!existing) throw new Error("Product not found");

  const updated: Product = {
    ...sanitizeProductInput({ ...existing, ...updates }),
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const encrypted = await encryptData(
    JSON.stringify(updated),
    encryptionKey,
    id,
  );
  await getDb().runAsync(
    `UPDATE products SET ciphertext = ?, nonce = ?, tag = ?, encryptionVersion = ?, updatedAt = ? WHERE id = ?`,
    [
      encrypted.ciphertext,
      encrypted.nonce,
      encrypted.tag,
      encrypted.version,
      updated.updatedAt,
      id,
    ],
  );
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  await getDb().runAsync("DELETE FROM products WHERE id = ?", [id]);
}

export async function searchProducts(
  query: string,
  encryptionKey: string,
): Promise<Product[]> {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return getAllProducts(encryptionKey);
  const products = await getAllProducts(encryptionKey);
  return products.filter((product) =>
    [
      product.name,
      product.vendor,
      product.licenseKey,
      product.serialNumber ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(normalized)),
  );
}

export async function getProductsByCategory(
  category: ProductCategory,
  encryptionKey: string,
): Promise<Product[]> {
  return (await getAllProducts(encryptionKey)).filter(
    (product) => product.category === category,
  );
}

export async function getExpiringProducts(
  days: number,
  encryptionKey: string,
): Promise<Product[]> {
  if (!Number.isInteger(days) || days < 0 || days > 3650)
    throw new Error("Invalid expiry window");
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 86_400_000);
  return (await getAllProducts(encryptionKey)).filter((product) => {
    const candidate = product.expiryDate ?? product.renewalDate;
    if (!candidate) return false;
    const date = new Date(`${candidate}T00:00:00.000Z`);
    return date >= now && date <= futureDate;
  });
}

/** Creates a passphrase-protected export rather than exposing records as plaintext JSON or CSV. */
export async function createEncryptedExport(
  encryptionKey: string,
  passphrase: string,
): Promise<string> {
  if (passphrase.length < 12)
    throw new Error("Use an export passphrase of at least 12 characters");
  const products = await getAllProducts(encryptionKey);
  const { key, salt } = await deriveExportKey(passphrase);
  const payload = await encryptData(
    JSON.stringify(products),
    key,
    "tsvaultkeysafe-export-v2",
  );
  const exportBundle: EncryptedVaultExport = {
    format: "tsvaultkeysafe-encrypted-export",
    version: 2,
    createdAt: new Date().toISOString(),
    salt,
    payload,
  };
  return JSON.stringify(exportBundle);
}

export async function importEncryptedExport(
  serializedExport: string,
  passphrase: string,
  encryptionKey: string,
): Promise<number> {
  const parsed = JSON.parse(serializedExport) as EncryptedVaultExport;
  if (
    parsed.format !== "tsvaultkeysafe-encrypted-export" ||
    parsed.version !== 2 ||
    !parsed.salt ||
    !parsed.payload
  ) {
    throw new Error("Invalid encrypted export file");
  }
  const { key } = await deriveExportKey(passphrase, parsed.salt);
  const products = JSON.parse(
    await decryptData(parsed.payload, key, "tsvaultkeysafe-export-v2"),
  ) as unknown;
  if (!Array.isArray(products) || products.length > MAX_PRODUCTS_PER_IMPORT) {
    throw new Error("Export has an invalid number of products");
  }

  let imported = 0;
  await getDb().withTransactionAsync(async () => {
    for (const product of products) {
      if (!product || typeof product !== "object")
        throw new Error("Export contains an invalid product");
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...input
      } = product as Product;
      await createProduct(input, encryptionKey);
      imported += 1;
    }
  });
  return imported;
}

export async function clearAllProducts(): Promise<void> {
  await getDb().execAsync("DELETE FROM products; VACUUM;");
}

export async function getDatabaseStats(): Promise<{
  productCount: number;
  totalSize: number;
}> {
  const result = await getDb().getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM products",
  );
  return { productCount: result?.count ?? 0, totalSize: 0 };
}
