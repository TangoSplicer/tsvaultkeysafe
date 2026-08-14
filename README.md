# TSVaultKeySafe

> **A private, offline-first mobile vault for product licenses, serial numbers, subscriptions, and related purchase information.**

TSVaultKeySafe stores encrypted product records on the device. It does not require an account, cloud sync, analytics, or a network service in its vault workflow. The application is intentionally designed as a local inventory tool rather than a password manager or a cloud backup service.

## Core capabilities

| Area                  | Included capability                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vault workflow        | Create, search, edit, archive, copy, and delete encrypted product records.                                                                                                                              |
| Access control        | Required eight-digit PIN, optional device biometrics, progressive lockouts, and automatic background locking.                                                                                           |
| Record protection     | Versioned XChaCha20-Poly1305 authenticated encryption with a unique 192-bit nonce for every record.                                                                                                     |
| Key handling          | A randomly generated 256-bit vault key in platform secure storage, with HKDF-SHA-256 purpose-separated database and attachment keys.                                                                    |
| Privacy controls      | Screen-capture prevention while the vault is active and clipboard clearing when a copied license key remains unchanged for 30 seconds.                                                                  |
| Data portability      | A user-facing `.tsvault` encrypted transfer and import flow with a separate passphrase, authenticated manifest, verification fingerprint, managed encrypted attachments, and non-secret recovery guide. |
| Encrypted attachments | Up to 12 selected receipts or warranty files per product, each bounded to 8 MB and encrypted with a separate attachment subkey in private app storage.                                                  |
| Local organization    | Favourites, tags, warranty dates, archive state, and local tag search.                                                                                                                                  |
| Local resilience      | Opt-in generic on-device date reminders and a local SQLite plus authenticated-record health check.                                                                                                      |

## Security model

Each record is encrypted independently and authenticated with its record identifier as associated data. This detects ciphertext substitution as well as unauthorised modification. The implementation uses an audited XChaCha20-Poly1305 construction from `@noble/ciphers`; its extended nonce permits safe random nonce generation for the application’s local-record use case. [1]

The PIN is stored only as a versioned PBKDF2-HMAC-SHA-256 verifier using a unique 256-bit salt and 600,000 iterations. This work factor follows OWASP’s published PBKDF2-HMAC-SHA-256 guidance. [2] The vault key and PIN verifier are stored through Expo SecureStore using device-only, unlocked-device accessibility. On Android this is backed by the Android Keystore; on iOS it uses Keychain Services. [3]

| Control               | Implementation                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN policy            | Exactly eight numeric digits; a single repeated digit is rejected.                                                                                         |
| Failed attempts       | A five-attempt threshold, followed by progressive temporary lockouts from 30 seconds to 15 minutes.                                                        |
| Biometrics            | Optional biometric-only prompt with OS passcode fallback disabled.                                                                                         |
| Session scope         | Unlock state exists in memory only and is cleared when the app leaves the foreground.                                                                      |
| Screen privacy        | Native screen-capture prevention while a vault session is open, subject to operating-system support.                                                       |
| Destructive reset     | The permanent-wipe action deletes managed attachment ciphertext, records, access credentials, and the vault key.                                           |
| Transfer verification | The destination vault validates passphrase encryption, authenticated manifest, protected record count, and transfer fingerprint before it commits records. |

> **Security boundary:** A mobile application cannot protect data from a compromised, rooted, jailbroken, or already-unlocked device. Users should maintain a device passcode and current operating-system updates. Screenshots and clipboard contents are also ultimately subject to operating-system capabilities and user-controlled software.

## Technology

| Layer                    | Technology                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Application              | React Native, Expo, Expo Router, TypeScript                                                                                   |
| Local database           | Expo SQLite asynchronous API                                                                                                  |
| Authenticated encryption | XChaCha20-Poly1305 via `@noble/ciphers`                                                                                       |
| Key derivation           | HKDF-SHA-256 and PBKDF2-HMAC-SHA-256                                                                                          |
| Secure storage           | Expo SecureStore, Android Keystore, iOS Keychain                                                                              |
| Platform controls        | Expo Local Authentication, Screen Capture, Clipboard, Haptics, Document Picker, File System, Sharing, and local Notifications |

## Development

```bash
git clone https://github.com/TangoSplicer/tsvaultkeysafe.git
cd tsvaultkeysafe
pnpm install
pnpm start
```

Use a development build or simulator for biometric and screen-capture controls. Expo Go does not provide the complete SecureStore biometric configuration required for a release build. [3]

```bash
# Strict TypeScript validation
./node_modules/.bin/tsc --noEmit

# Crypto and PIN policy tests
./node_modules/.bin/jest --runInBand

# Linting
./node_modules/.bin/eslint .
```

## Offline transfer and recovery

To move to a new device, create an encrypted transfer in **Security → Transfer vault** using a separate passphrase of at least 16 characters. Save or share the resulting ciphertext file using the owner-selected Android share sheet, then separately save the non-secret recovery guide. On the new device, create and unlock a new empty local vault before selecting the transfer file and entering its separate passphrase. Confirm the displayed record count, attachment count, and fingerprint after import, then remove temporary transfer copies you no longer need. Attachment-inclusive packages are capped at 12 files and 24 MB of source attachment content.

TSVaultKeySafe does not create an account, upload a vault, synchronize automatically, hold a recovery secret, or operate a transfer relay. The owner remains responsible for choosing where an encrypted transfer file is stored or shared.

## Release notes

This repository targets version **1.3.1** on Expo SDK 54 and React Native 0.81. The Android workflow builds a self-contained release APK, confirms the embedded JavaScript bundle, and verifies Android 16 KB page-size alignment. Before app-store publication, validate setup, lock/unlock, transfer, attachment, reminder, and health-check flows on physical devices; complete export-compliance questions accurately; and rerun the dependency and threat-model review.

## References

[1]: https://github.com/paulmillr/noble-ciphers "noble-ciphers documentation"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html "OWASP Password Storage Cheat Sheet"
[3]: https://docs.expo.dev/versions/latest/sdk/securestore/ "Expo SecureStore documentation"

## License

TSVaultKeySafe is distributed under the [MIT License](./LICENSE).
