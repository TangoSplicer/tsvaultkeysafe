# TSVaultKeySafe Encryption Design

## Purpose and scope

TSVaultKeySafe is an offline mobile vault for licences, credentials, identity references, financial references, recovery material, secure notes, and encrypted attachments. This document describes the cryptographic construction implemented in version 1.6.0, including authenticated records, encrypted attachments, encrypted local recovery snapshots, and owner-controlled encrypted transfer files. It does **not** describe a network protocol, cloud-sync design, key escrow, or hosted password-manager architecture because the application has none.

## Cryptographic construction

| Function                     | Implementation          | Parameters                                                                                      |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| Record encryption            | XChaCha20-Poly1305 AEAD | 256-bit key, unique random 192-bit nonce, 128-bit authentication tag.                           |
| Database subkey derivation   | HKDF-SHA-256            | 256-bit master key, application-specific salt, distinct database purpose string.                |
| Attachment subkey derivation | HKDF-SHA-256            | Same root key and salt, distinct attachment purpose string used for encrypted attachment blobs. |
| Snapshot subkey derivation   | HKDF-SHA-256            | Same root key and salt, distinct local-recovery-snapshot purpose string.                        |
| PIN verification             | PBKDF2-HMAC-SHA-256     | 600,000 iterations, 256-bit random salt, 256-bit output, versioned verifier.                    |
| Encrypted export key         | PBKDF2-HMAC-SHA-256     | 600,000 iterations, fresh 256-bit random salt, 256-bit output.                                  |
| Randomness                   | `expo-crypto`           | Operating-system cryptographic random-byte source.                                              |

The implementation uses the audited `@noble/ciphers` XChaCha20-Poly1305 API. The library documentation recommends an authenticated cipher and specifically notes that XChaCha’s 192-bit nonce is appropriate for randomly generated nonces. [1]

## Key hierarchy

```text
CSPRNG → 256-bit vault master key
             │
             ├── HKDF-SHA-256("database-encryption") → database record key
             ├── HKDF-SHA-256("attachment-encryption") → attachment-blob key
             └── HKDF-SHA-256("local-recovery-snapshot-encryption") → local snapshot key
```

The master key is created on first successful vault setup. It is represented as hexadecimal only while in application memory and is stored in Expo SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility. Expo documents that SecureStore uses Android Keystore-backed encrypted preferences on Android and Keychain Services on iOS. [2]

The database, attachment, and local snapshot keys are never persisted separately. They are derived only when a session requires them. A PIN change replaces the PIN verifier; it does not rotate the vault key because the PIN is an access-control verifier, not an input to record encryption.

## Record format and flow

Each secure item is serialized to JSON and encrypted separately. The secure-item identifier is passed as associated authenticated data (AAD), binding the encrypted payload to its database row. The encrypted JSON includes a validated record type; legacy records without a type are treated as Licence / product records.

```text
validated secure-item JSON + record UUID + database subkey
              │
              ├── generate new 24-byte random nonce
              └── XChaCha20-Poly1305 encrypt(AAD = record UUID)
                         │
                         ▼
SQLite row: id, ciphertext, nonce, tag, encryptionVersion = 2, timestamps
```

On retrieval, the application verifies the version and decrypts with the same record identifier as AAD. Any malformed ciphertext, incorrect tag, incorrect key, or altered identifier is reported as a generic decryption failure; the implementation intentionally does not disclose the detailed failure reason.

| Field               | Encoding    | Purpose                                                                                  |
| ------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `id`                | UUID        | Stable record identifier and AAD.                                                        |
| `ciphertext`        | Hex         | Encrypted JSON bytes, excluding authentication tag.                                      |
| `nonce`             | Hex         | Fresh 24-byte XChaCha nonce.                                                             |
| `tag`               | Hex         | 16-byte Poly1305 authentication tag.                                                     |
| `encryptionVersion` | Integer `2` | Rejects retired record formats rather than silently attempting weak fallback decryption. |

## PIN and session controls

The vault requires an eight-digit PIN. A verifier uses a separate 256-bit random salt for every PIN setup or change. PBKDF2-HMAC-SHA-256 is configured at 600,000 iterations, matching OWASP’s current published PBKDF2-HMAC-SHA-256 work-factor guidance. [3]

The application performs an equality comparison with a constant-time byte comparator once the PBKDF2 calculation is complete. It applies a progressive lockout after five failures, beginning at 30 seconds and doubling to a maximum of 15 minutes. A successful PIN or biometric unlock clears the failure counters.

Unlock state exists only in memory. It is cleared when the app enters inactive or background state. The tab layout also prevents direct navigation to vault content when no in-memory session exists. Optional biometrics use the operating-system prompt with device fallback disabled.

## Clipboard and capture controls

A copied protected value is cleared after 30 seconds only if the clipboard still contains the copied value. This prevents the timer from deleting a later clipboard value supplied by the user or another application. The vault requests native screen-capture prevention while a session is open; capability and enforcement remain subject to the operating system.

## Encrypted attachments

A selected attachment is copied through the operating-system document picker, encoded for local storage, encrypted with the attachment subkey using XChaCha20-Poly1305, and stored in the app-private document directory. The attachment UUID and parent record UUID are supplied as AAD in the form `recordId:attachmentId`, binding the ciphertext to its owner record. Metadata such as attachment name, MIME type, size, and creation time is protected inside the encrypted secure-item record.

Attachment import is bounded to 8 MB per file and 12 attachments per secure item to avoid unbounded device storage and memory pressure. Opening an attachment requires an explicit warning because the temporary readable copy is handed to the operating-system share sheet; deleting a record or permanently wiping the vault removes the managed attachment ciphertext.

## Encrypted export and recovery service

The user-facing transfer flow creates an encrypted `.tsvault` file using a separate passphrase of at least 16 characters. The v3 envelope uses a fresh 256-bit salt, PBKDF2-HMAC-SHA-256 at 600,000 iterations, XChaCha20-Poly1305 with AAD `tsvaultkeysafe-export-v3`, and an authenticated inner manifest.

```json
{
  "format": "tsvaultkeysafe-encrypted-export",
  "version": 3,
  "createdAt": "ISO-8601 timestamp",
  "recordCount": 3,
  "fingerprint": "24 uppercase hex characters",
  "salt": "hex-encoded 32-byte salt",
  "payload": {
    "version": 2,
    "ciphertext": "hex",
    "nonce": "hex",
    "tag": "hex"
  }
}
```

The protected payload contains records, bounded attachment transfer content, and an authenticated manifest with export time, record count, attachment count, and SHA-256 digests. The importer decrypts and verifies the manifest, digests, public count, attachment count, and fingerprint before committing records or recreating attachment ciphertext.

Attachments are read only while the source vault is unlocked, protected by the temporary transfer-passphrase package, and then immediately re-encrypted using the destination vault’s separate attachment key. The source vault master key is never exported, copied, wrapped, or shared. Packages are limited to 12 attachments and 24 MB of source attachment content to bound mobile resource use. Existing record-only version-3 and legacy version-2 transfers remain importable.

The separate recovery guide contains only a file name, export date, format, record count, attachment count where available, fingerprint, and restore steps. It intentionally contains no PIN, transfer passphrase, vault master key, or readable vault record. The app transfers only ciphertext through the owner-selected Android share sheet; it has no account, upload, sync, or recovery service.

## Encrypted local recovery snapshots

Security settings can create up to three owner-controlled local recovery points in the app-private document directory. Each snapshot serializes the current secure items and managed attachment content, then encrypts the payload with the dedicated snapshot subkey using XChaCha20-Poly1305 and fixed snapshot AAD `tsvaultkeysafe-local-recovery-snapshot-v1`. Snapshot files are never uploaded or added to a transfer package.

Restoring a snapshot creates a new encrypted safeguard snapshot first. If a restore fails after data replacement begins, the safeguard is used to attempt recovery of the immediately preceding vault state. Permanent vault wipe removes local snapshots along with managed attachment ciphertext, encrypted records, and secure-storage authentication material.

## Security boundaries and residual risk

> **No absolute security claim is appropriate for a client-side vault.** JavaScript cannot reliably zeroize immutable strings, and application controls cannot defend against a compromised, rooted, jailbroken, debugged, or already-unlocked device.

The implementation does not claim disk-level encrypted SQLite, secure deletion of individual SQLite pages, root detection, perfect removal of temporary plaintext created outside the app by an owner, cloud backup, account recovery, or a recovery key escrow service. A permanent wipe removes managed attachment ciphertext, performs database deletion and `VACUUM`, deletes the SecureStore master key and authentication entries, and clears the in-memory session. Native storage media, operating-system document providers, and external locations chosen by an owner for an encrypted export may retain data according to device and filesystem behavior.

## Verification

The test suite verifies subkey separation, authenticated-encryption round trips, rejection of altered data/AAD, and the versioned PIN policy. Before release, validate the native controls in signed development or production builds on physical iOS and Android devices. Expo notes that some SecureStore biometric behavior is unavailable in Expo Go. [2]

## References

[1]: https://github.com/paulmillr/noble-ciphers "noble-ciphers documentation"
[2]: https://docs.expo.dev/versions/latest/sdk/securestore/ "Expo SecureStore documentation"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html "OWASP Password Storage Cheat Sheet"
