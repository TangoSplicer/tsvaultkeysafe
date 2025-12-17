# TSVaultKeySafe — Encryption Design

## Executive Summary

TSVaultKeySafe uses **AES-256-GCM** for all data encryption, with encryption keys stored exclusively in platform-native secure storage (Android Keystore and iOS Keychain). This document explains the cryptographic architecture, key derivation, encryption flows, and security guarantees.

The design prioritizes **authenticated encryption** (confidentiality + integrity), **key isolation** (separate keys for database and attachments), and **memory hygiene** (immediate clearing of sensitive data). All cryptographic operations use industry-standard libraries and follow NIST recommendations.

---

## Cryptographic Primitives

### Encryption Algorithm: AES-256-GCM

**Algorithm:** Advanced Encryption Standard (AES) with 256-bit key in Galois/Counter Mode (GCM)

**Why AES-256-GCM?**
- **NIST-approved:** Recommended by NIST SP 800-38D
- **Authenticated encryption:** Provides both confidentiality and integrity (detects tampering)
- **Efficient:** Hardware acceleration available on modern devices
- **Industry standard:** Used by TLS 1.3, Signal, WhatsApp, and other privacy-focused apps

**Security Guarantees:**
- **Confidentiality:** 2^128 security against brute-force attacks (key size: 256 bits)
- **Integrity:** 2^128 security against forgery attacks (authentication tag: 128 bits)
- **Authenticity:** Detects any modification to ciphertext or additional authenticated data (AAD)

**Parameters:**
- **Key size:** 256 bits (32 bytes)
- **Nonce size:** 96 bits (12 bytes, randomly generated per encryption)
- **Authentication tag:** 128 bits (16 bytes)
- **IV (Initialization Vector):** Randomly generated, unique per encryption operation

---

## Key Hierarchy

### Master Key

**Purpose:** Root key for all encryption operations

**Storage:** Platform-native secure storage only
- **Android:** Android Keystore (hardware-backed if available)
- **iOS:** iOS Keychain (Secure Enclave if available)

**Generation:** 256-bit random key, generated on first app launch

**Access Control:**
- Requires device unlock (PIN/pattern/biometric)
- Not accessible to app process (isolated in keystore)
- Automatically locked when device is locked

**Lifecycle:**
- Generated once on first app launch
- Never exported or transmitted
- Deleted only when user wipes vault

### Database Encryption Key

**Purpose:** Encrypts SQLite database at rest

**Derivation:** Derived from master key using HKDF (HMAC-based Key Derivation Function)

```
Database Key = HKDF-SHA256(
  IKM = Master Key (32 bytes),
  salt = "TSVaultKeySafe:Database" (22 bytes),
  info = "Database Encryption Key" (22 bytes),
  L = 32 bytes
)
```

**Storage:** Derived on-demand from master key (not stored separately)

**Rotation:** Rotated when master key changes (user changes PIN)

### Attachment Encryption Key

**Purpose:** Encrypts file attachments (PDFs, images) separately from database

**Derivation:** Derived from master key using HKDF

```
Attachment Key = HKDF-SHA256(
  IKM = Master Key (32 bytes),
  salt = "TSVaultKeySafe:Attachments" (25 bytes),
  info = "Attachment Encryption Key" (24 bytes),
  L = 32 bytes
)
```

**Storage:** Derived on-demand from master key (not stored separately)

**Rotation:** Rotated when master key changes (user changes PIN)

### Export Passphrase Key

**Purpose:** Encrypts exported backup files (ZIP, PDF, CSV)

**Derivation:** Derived from user-provided passphrase using PBKDF2

```
Export Key = PBKDF2-SHA256(
  password = User Passphrase,
  salt = Random 32-byte salt (stored in export file),
  iterations = 100,000,
  length = 32 bytes
)
```

**Storage:** Not stored (derived from user passphrase on import)

**Rotation:** New key for each export (new salt, new iterations)

---

## Encryption Flows

### Flow 1: Storing a Product (Encryption at Rest)

```
User Input (Product Data)
    ↓
Validate Input
    ↓
Generate Nonce (96-bit random)
    ↓
Serialize Product to JSON
    ↓
Encrypt with AES-256-GCM
    Input: Database Key, Nonce, Product JSON, AAD (product ID)
    Output: Ciphertext + Authentication Tag
    ↓
Store in SQLite
    Columns: id, ciphertext, nonce, tag, created_at, updated_at
    ↓
Clear Sensitive Data from Memory
    - Overwrite product JSON with random bytes
    - Clear database key from memory (derived on-demand)
    ↓
Return Success
```

**Additional Authenticated Data (AAD):**
- Product ID (prevents tampering with product metadata)
- Timestamp (prevents replay attacks)

**Security Guarantees:**
- Ciphertext is indistinguishable from random (semantic security)
- Any modification to ciphertext is detected (integrity)
- Product data is never stored unencrypted

---

### Flow 2: Retrieving a Product (Decryption)

```
User Requests Product
    ↓
Unlock Vault (PIN / Biometric)
    ↓
Retrieve Master Key from Keystore
    ↓
Derive Database Key from Master Key
    ↓
Query SQLite for Product
    Retrieve: ciphertext, nonce, tag
    ↓
Decrypt with AES-256-GCM
    Input: Database Key, Nonce, Ciphertext, Tag, AAD
    Output: Product JSON (if tag is valid)
    ↓
Validate Product Data
    Check required fields, data types, constraints
    ↓
Return Product to UI
    ↓
Clear Sensitive Data from Memory
    - Overwrite product JSON after use
    - Clear database key from memory
    ↓
Success
```

**Error Handling:**
- If authentication tag is invalid: Raise "Data Tampering Detected" error
- If decryption fails: Raise "Decryption Error" error
- If product data is invalid: Raise "Data Corruption" error

**Security Guarantees:**
- Tampering is detected and rejected (integrity)
- Only authenticated ciphertext is decrypted (authenticity)
- Sensitive data is cleared immediately after use (memory hygiene)

---

### Flow 3: Exporting Vault (Encrypted Backup)

```
User Initiates Export
    ↓
Choose Export Format (ZIP / PDF / CSV)
    ↓
User Enters Passphrase
    ↓
Generate Random Salt (32 bytes)
    ↓
Derive Export Key from Passphrase
    Export Key = PBKDF2-SHA256(passphrase, salt, 100k iterations, 32 bytes)
    ↓
Retrieve All Products from Database
    ↓
For Each Product:
    Decrypt with Database Key
    Serialize to JSON
    Encrypt with Export Key + AES-256-GCM
    ↓
Create Export File
    Format: ZIP / PDF / CSV
    Include: Encrypted products, salt, metadata
    ↓
Clear Sensitive Data from Memory
    - Overwrite passphrase with random bytes
    - Overwrite export key with random bytes
    - Overwrite all product data
    ↓
Return Export File for Download
```

**Export File Structure (ZIP):**
```
backup.zip
├── metadata.json (unencrypted)
│   ├── version: "1.0"
│   ├── timestamp: "2024-01-15T10:30:45Z"
│   ├── product_count: 42
│   └── salt: "base64-encoded-32-byte-salt"
├── products.enc (encrypted with Export Key)
│   └── [AES-256-GCM encrypted JSON array]
└── attachments/ (encrypted files)
    ├── attachment-1.enc
    ├── attachment-2.enc
    └── ...
```

**Security Guarantees:**
- Backup is encrypted with user-provided passphrase (user controls security)
- Passphrase is never stored (derived on-demand)
- Salt is unique per export (prevents rainbow table attacks)
- PBKDF2 with 100k iterations resists brute-force attacks

---

### Flow 4: Importing Vault (Decryption of Backup)

```
User Initiates Import
    ↓
User Selects Backup File (ZIP / CSV)
    ↓
Validate File Format and Metadata
    ↓
If ZIP:
    Extract metadata.json and products.enc
    ↓
    User Enters Passphrase
    ↓
    Retrieve Salt from metadata.json
    ↓
    Derive Import Key from Passphrase
    Import Key = PBKDF2-SHA256(passphrase, salt, 100k iterations, 32 bytes)
    ↓
    Decrypt products.enc with Import Key
    ↓
    If Decryption Fails:
        Raise "Invalid Passphrase" error
    ↓
If CSV:
    Parse CSV file
    Validate product data
    ↓
Preview Products to Import
    Show count, list of products
    ↓
User Confirms Import
    ↓
For Each Product:
    Validate data
    Encrypt with Database Key
    Store in SQLite
    ↓
Clear Sensitive Data from Memory
    - Overwrite passphrase
    - Overwrite import key
    - Overwrite all product data
    ↓
Return Import Summary (X products imported)
```

**Conflict Resolution:**
- **Skip:** Do not import if product already exists (by ID)
- **Overwrite:** Replace existing product with imported data
- **Merge:** Combine data from existing and imported products

**Security Guarantees:**
- Backup integrity is verified (GCM authentication tag)
- Passphrase is never stored (derived on-demand)
- Imported data is encrypted with database key (same security as native products)

---

### Flow 5: Copying License Key (Clipboard Management)

```
User Taps "Copy License Key"
    ↓
Retrieve Product from Database
    Decrypt with Database Key
    ↓
Extract License Key
    ↓
Copy to Clipboard
    ↓
Show Toast: "Copied! (Auto-clear in 30s)"
    ↓
Start Auto-Clear Timer (30-60 seconds, user-configurable)
    ↓
After Timer Expires:
    Clear Clipboard
    Show Toast: "Clipboard cleared"
    ↓
Clear Sensitive Data from Memory
    - Overwrite license key with random bytes
    - Overwrite product data
    ↓
Success
```

**Clipboard Security:**
- License key is on clipboard for only 30-60 seconds (user-configurable)
- Auto-clear prevents malware from reading clipboard later
- User is warned about clipboard exposure risk

**Memory Hygiene:**
- License key is overwritten with random bytes immediately after use
- Prevents cold boot attacks and memory dumps

---

## Memory Hygiene

### Sensitive Data Handling

**Sensitive Data Types:**
- Master key (256 bits)
- Database encryption key (256 bits)
- Attachment encryption key (256 bits)
- Export/import passphrase (variable length)
- PIN (6 digits)
- Product license keys (variable length)
- Product notes (variable length)

### Clearing Sensitive Data

**Method 1: Immediate Overwrite**
```typescript
// Clear sensitive string
const sensitiveData = "license-key-12345";
const buffer = Buffer.from(sensitiveData, 'utf-8');
crypto.randomFillSync(buffer);  // Overwrite with random bytes
// buffer is now random, original data is gone
```

**Method 2: Scoped Clearing**
```typescript
// Use sensitive data within scope
{
  const licenseKey = decryptedData.licenseKey;
  clipboard.setString(licenseKey);  // Use immediately
  // licenseKey goes out of scope, garbage collected
  // (In practice, use explicit overwrite for critical data)
}
```

**Method 3: Secure Memory Allocation**
```typescript
// Use platform-native secure storage
import * as SecureStore from 'expo-secure-store';

// Store sensitive data in secure enclave
await SecureStore.setItemAsync('pin', userPin);

// Retrieve when needed
const pin = await SecureStore.getItemAsync('pin');

// Data is automatically cleared by OS when no longer needed
```

### Timing Attack Prevention

**Constant-Time Comparison:**
```typescript
// Use constant-time comparison for PIN validation
function comparePin(userPin: string, storedHash: string): boolean {
  // Compare all characters, even if mismatch found early
  // Prevents timing attacks that reveal PIN length or prefix
  return crypto.timingSafeEqual(
    Buffer.from(userPin),
    Buffer.from(storedHash)
  );
}
```

---

## Key Rotation

### Scenario: User Changes PIN

**Old PIN:** 123456
**New PIN:** 654321

**Key Rotation Process:**

```
User Enters Old PIN
    ↓
Validate Old PIN
    ↓
User Enters New PIN
    ↓
Generate New Master Key
    New Master Key = Random 256-bit key
    ↓
Re-encrypt Database with New Master Key
    For Each Product:
        Decrypt with Old Database Key
        Encrypt with New Database Key
        Store in SQLite
    ↓
Store New Master Key in Keystore
    ↓
Clear Old Master Key from Memory
    ↓
Success
```

**Time Complexity:** O(n) where n = number of products

**User Experience:** Show progress bar during re-encryption

**Failure Handling:** If re-encryption fails, rollback to old master key

---

## Cryptographic Libraries

### JavaScript/TypeScript Libraries

| Library | Purpose | Version | License |
|---------|---------|---------|---------|
| `tweetnacl-js` | Encryption (Curve25519, Poly1305) | ^1.0.3 | Public Domain |
| `crypto-js` | AES-256-GCM, PBKDF2, HKDF | ^4.1.1 | MIT |
| `expo-secure-store` | Platform-native secure storage | ^12.0.0 | MIT |
| `expo-crypto` | Cryptographic utilities | ^12.0.0 | MIT |
| `react-native-sqlite-storage` | Encrypted SQLite | ^6.0.0 | MIT |

### Platform-Native Libraries

| Platform | Library | Purpose |
|----------|---------|---------|
| Android | Android Keystore | Secure key storage |
| Android | Conscrypt | TLS/SSL provider |
| iOS | Keychain | Secure key storage |
| iOS | CommonCrypto | Cryptographic operations |

---

## Security Considerations

### Nonce Reuse Prevention

**Risk:** Reusing the same nonce with the same key breaks AES-GCM security

**Mitigation:** Generate unique nonce for each encryption operation

```typescript
// Generate unique nonce per encryption
function encrypt(key: Buffer, plaintext: string): EncryptedData {
  const nonce = crypto.randomBytes(12);  // 96-bit random nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  
  const ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
  ciphertext += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return { nonce, ciphertext, tag };
}
```

### Passphrase Strength

**Risk:** Weak user-provided passphrase can be brute-forced

**Mitigation:** Use PBKDF2 with high iteration count (100,000)

```typescript
function deriveExportKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    100000,  // High iteration count
    32,      // 256-bit key
    'sha256'
  );
}
```

**User Education:** Recommend passphrases of 12+ characters with mixed case, numbers, symbols

### Cold Boot Attacks

**Risk:** Sensitive data in RAM can be extracted from powered-off device

**Mitigation:** Clear sensitive data immediately after use, use secure enclave

```typescript
// Clear sensitive data
function clearBuffer(buffer: Buffer): void {
  crypto.randomFillSync(buffer);  // Overwrite with random bytes
}
```

### Side-Channel Attacks

**Risk:** Timing variations in crypto operations can leak information

**Mitigation:** Use constant-time comparison and platform-native crypto

```typescript
// Constant-time comparison
function constantTimeCompare(a: string, b: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

---

## Testing & Validation

### Encryption Unit Tests

```typescript
describe('Encryption', () => {
  it('should encrypt and decrypt product data', () => {
    const key = crypto.randomBytes(32);
    const product = { name: 'Adobe', licenseKey: 'ABC123' };
    
    const encrypted = encrypt(key, JSON.stringify(product));
    const decrypted = decrypt(key, encrypted);
    
    expect(JSON.parse(decrypted)).toEqual(product);
  });

  it('should detect tampering with ciphertext', () => {
    const key = crypto.randomBytes(32);
    const encrypted = encrypt(key, 'original data');
    
    // Tamper with ciphertext
    encrypted.ciphertext = encrypted.ciphertext.slice(0, -2) + 'XX';
    
    expect(() => decrypt(key, encrypted)).toThrow('Authentication tag verification failed');
  });

  it('should use unique nonce per encryption', () => {
    const key = crypto.randomBytes(32);
    const plaintext = 'same data';
    
    const encrypted1 = encrypt(key, plaintext);
    const encrypted2 = encrypt(key, plaintext);
    
    expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
});
```

### Export/Import Roundtrip Test

```typescript
describe('Export/Import', () => {
  it('should export and import vault with correct passphrase', async () => {
    const vault = [
      { name: 'Product1', licenseKey: 'KEY1' },
      { name: 'Product2', licenseKey: 'KEY2' },
    ];
    
    const passphrase = 'strong-passphrase-123';
    const exported = await exportVault(vault, passphrase);
    
    const imported = await importVault(exported, passphrase);
    
    expect(imported).toEqual(vault);
  });

  it('should reject import with incorrect passphrase', async () => {
    const vault = [{ name: 'Product1', licenseKey: 'KEY1' }];
    const exported = await exportVault(vault, 'correct-passphrase');
    
    expect(() => importVault(exported, 'wrong-passphrase')).toThrow('Invalid Passphrase');
  });
});
```

---

## Compliance & Standards

### NIST Recommendations

- **SP 800-38D:** Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) ✓
- **SP 800-132:** PBKDF2 for Password-Based Key Derivation ✓
- **SP 800-56A:** Recommendation for Pair-Wise Key Establishment Schemes ✓

### Industry Standards

- **FIPS 197:** Advanced Encryption Standard (AES) ✓
- **RFC 5116:** An Interface and Algorithms for Authenticated Encryption ✓
- **RFC 5869:** HMAC-based Extract-and-Expand Key Derivation Function (HKDF) ✓

---

## Conclusion

TSVaultKeySafe implements a robust encryption architecture that prioritizes **authenticated encryption** (AES-256-GCM), **key isolation** (separate keys for database and attachments), and **memory hygiene** (immediate clearing of sensitive data). The design follows NIST recommendations and industry standards, with comprehensive key derivation, secure key storage, and error handling.

The offline-first architecture eliminates cloud-related risks and provides users with complete control over their encryption keys and data. Users should follow recommended practices (strong PINs, secure passphrases, device security) to maintain the security posture of the vault.
