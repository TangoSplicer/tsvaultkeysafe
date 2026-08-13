# TSVaultKeySafe Encryption Design

## Purpose and scope

TSVaultKeySafe is an offline mobile vault for product and licence information. This document describes the cryptographic construction implemented in version 1.1.0. It does **not** describe a network protocol, cloud-sync design, attachment-file system, or password-manager architecture.

## Cryptographic construction

| Function | Implementation | Parameters |
| --- | --- | --- |
| Record encryption | XChaCha20-Poly1305 AEAD | 256-bit key, unique random 192-bit nonce, 128-bit authentication tag. |
| Database subkey derivation | HKDF-SHA-256 | 256-bit master key, application-specific salt, distinct database purpose string. |
| Attachment subkey derivation | HKDF-SHA-256 | Same root key and salt, distinct attachment purpose string. Attachment storage is reserved for a future feature. |
| PIN verification | PBKDF2-HMAC-SHA-256 | 600,000 iterations, 256-bit random salt, 256-bit output, versioned verifier. |
| Encrypted export key | PBKDF2-HMAC-SHA-256 | 600,000 iterations, fresh 256-bit random salt, 256-bit output. |
| Randomness | `expo-crypto` | Operating-system cryptographic random-byte source. |

The implementation uses the audited `@noble/ciphers` XChaCha20-Poly1305 API. The library documentation recommends an authenticated cipher and specifically notes that XChaCha’s 192-bit nonce is appropriate for randomly generated nonces. [1]

## Key hierarchy

```text
CSPRNG → 256-bit vault master key
             │
             ├── HKDF-SHA-256("database-encryption") → database record key
             └── HKDF-SHA-256("attachment-encryption") → reserved attachment key
```

The master key is created on first successful vault setup. It is represented as hexadecimal only while in application memory and is stored in Expo SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility. Expo documents that SecureStore uses Android Keystore-backed encrypted preferences on Android and Keychain Services on iOS. [2]

The database and attachment keys are never persisted separately. They are derived only when a session requires them. A PIN change replaces the PIN verifier; it does not rotate the vault key because the PIN is an access-control verifier, not an input to record encryption.

## Record format and flow

Each product is serialized to JSON and encrypted separately. The product identifier is passed as associated authenticated data (AAD), binding the encrypted payload to its database row.

```text
validated product JSON + product UUID + database subkey
              │
              ├── generate new 24-byte random nonce
              └── XChaCha20-Poly1305 encrypt(AAD = product UUID)
                         │
                         ▼
SQLite row: id, ciphertext, nonce, tag, encryptionVersion = 2, timestamps
```

On retrieval, the application verifies the version and decrypts with the same product identifier as AAD. Any malformed ciphertext, incorrect tag, incorrect key, or altered identifier is reported as a generic decryption failure; the implementation intentionally does not disclose the detailed failure reason.

| Field | Encoding | Purpose |
| --- | --- | --- |
| `id` | UUID | Stable record identifier and AAD. |
| `ciphertext` | Hex | Encrypted JSON bytes, excluding authentication tag. |
| `nonce` | Hex | Fresh 24-byte XChaCha nonce. |
| `tag` | Hex | 16-byte Poly1305 authentication tag. |
| `encryptionVersion` | Integer `2` | Rejects retired record formats rather than silently attempting weak fallback decryption. |

## PIN and session controls

The vault requires an eight-digit PIN. A verifier uses a separate 256-bit random salt for every PIN setup or change. PBKDF2-HMAC-SHA-256 is configured at 600,000 iterations, matching OWASP’s current published PBKDF2-HMAC-SHA-256 work-factor guidance. [3]

The application performs an equality comparison with a constant-time byte comparator once the PBKDF2 calculation is complete. It applies a progressive lockout after five failures, beginning at 30 seconds and doubling to a maximum of 15 minutes. A successful PIN or biometric unlock clears the failure counters.

Unlock state exists only in memory. It is cleared when the app enters inactive or background state. The tab layout also prevents direct navigation to vault content when no in-memory session exists. Optional biometrics use the operating-system prompt with device fallback disabled.

## Clipboard and capture controls

A copied license key is cleared after 30 seconds only if the clipboard still contains the copied value. This prevents the timer from deleting a later clipboard value supplied by the user or another application. The vault requests native screen-capture prevention while a session is open; capability and enforcement remain subject to the operating system.

## Encrypted export service

The data layer supports a versioned JSON export envelope with the following form:

```json
{
  "format": "tsvaultkeysafe-encrypted-export",
  "version": 2,
  "createdAt": "ISO-8601 timestamp",
  "salt": "hex-encoded 32-byte salt",
  "payload": {
    "version": 2,
    "ciphertext": "hex",
    "nonce": "hex",
    "tag": "hex"
  }
}
```

The user’s export passphrase must have at least 12 characters. The passphrase is processed with the same PBKDF2 configuration, and the payload is authenticated using the constant AAD string `tsvaultkeysafe-export-v2`. The current version exposes this service to application code; a user-facing file export/import picker is intentionally not shipped until platform-specific secure file handling is fully implemented.

## Security boundaries and residual risk

> **No absolute security claim is appropriate for a client-side vault.** JavaScript cannot reliably zeroize immutable strings, and application controls cannot defend against a compromised, rooted, jailbroken, debugged, or already-unlocked device.

The implementation avoids claiming disk-level encrypted SQLite, secure deletion of individual SQLite pages, root detection, cloud backup, attachment encryption, or a recovery mechanism because these are not currently implemented. A permanent wipe performs database deletion and `VACUUM`, deletes the SecureStore master key and authentication entries, and clears the in-memory session. Native storage media may still retain data according to device and filesystem behavior.

## Verification

The test suite verifies subkey separation, authenticated-encryption round trips, rejection of altered data/AAD, and the versioned PIN policy. Before release, validate the native controls in signed development or production builds on physical iOS and Android devices. Expo notes that some SecureStore biometric behavior is unavailable in Expo Go. [2]

## References

[1]: https://github.com/paulmillr/noble-ciphers "noble-ciphers documentation"
[2]: https://docs.expo.dev/versions/latest/sdk/securestore/ "Expo SecureStore documentation"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html "OWASP Password Storage Cheat Sheet"
