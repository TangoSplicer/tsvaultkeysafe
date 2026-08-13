# TSVaultKeySafe

> **A private, offline-first mobile vault for product licenses, serial numbers, subscriptions, and related purchase information.**

TSVaultKeySafe stores encrypted product records on the device. It does not require an account, cloud sync, analytics, or a network service in its vault workflow. The application is intentionally designed as a local inventory tool rather than a password manager or a cloud backup service.

## Core capabilities

| Area | Included capability |
| --- | --- |
| Vault workflow | Create, search, edit, archive, copy, and delete encrypted product records. |
| Access control | Required eight-digit PIN, optional device biometrics, progressive lockouts, and automatic background locking. |
| Record protection | Versioned XChaCha20-Poly1305 authenticated encryption with a unique 192-bit nonce for every record. |
| Key handling | A randomly generated 256-bit vault key in platform secure storage, with HKDF-SHA-256 purpose-separated database and attachment keys. |
| Privacy controls | Screen-capture prevention while the vault is active and clipboard clearing when a copied license key remains unchanged for 30 seconds. |
| Data portability | A passphrase-protected encrypted-export service is available in the data layer for a future file-picker interface. |

## Security model

Each record is encrypted independently and authenticated with its record identifier as associated data. This detects ciphertext substitution as well as unauthorised modification. The implementation uses an audited XChaCha20-Poly1305 construction from `@noble/ciphers`; its extended nonce permits safe random nonce generation for the application’s local-record use case. [1]

The PIN is stored only as a versioned PBKDF2-HMAC-SHA-256 verifier using a unique 256-bit salt and 600,000 iterations. This work factor follows OWASP’s published PBKDF2-HMAC-SHA-256 guidance. [2] The vault key and PIN verifier are stored through Expo SecureStore using device-only, unlocked-device accessibility. On Android this is backed by the Android Keystore; on iOS it uses Keychain Services. [3]

| Control | Implementation |
| --- | --- |
| PIN policy | Exactly eight numeric digits; a single repeated digit is rejected. |
| Failed attempts | A five-attempt threshold, followed by progressive temporary lockouts from 30 seconds to 15 minutes. |
| Biometrics | Optional biometric-only prompt with OS passcode fallback disabled. |
| Session scope | Unlock state exists in memory only and is cleared when the app leaves the foreground. |
| Screen privacy | Native screen-capture prevention while a vault session is open, subject to operating-system support. |
| Destructive reset | The permanent-wipe action deletes records, access credentials, and the vault key. |

> **Security boundary:** A mobile application cannot protect data from a compromised, rooted, jailbroken, or already-unlocked device. Users should maintain a device passcode and current operating-system updates. Screenshots and clipboard contents are also ultimately subject to operating-system capabilities and user-controlled software.

## Technology

| Layer | Technology |
| --- | --- |
| Application | React Native, Expo, Expo Router, TypeScript |
| Local database | Expo SQLite asynchronous API |
| Authenticated encryption | XChaCha20-Poly1305 via `@noble/ciphers` |
| Key derivation | HKDF-SHA-256 and PBKDF2-HMAC-SHA-256 |
| Secure storage | Expo SecureStore, Android Keystore, iOS Keychain |
| Platform controls | Expo Local Authentication, Screen Capture, Clipboard, and Haptics |

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

## Release notes

This repository targets version **1.1.0**. Before publishing to an app store, create a native production build, validate the user flow on a physical iOS and Android device, complete export-compliance questions accurately, and rerun a dependency audit. The current Expo SDK 50 toolchain is behind the latest supported SDK; upgrade the Expo/React Native stack and revalidate native behavior before a public release.

## References

[1]: https://github.com/paulmillr/noble-ciphers "noble-ciphers documentation"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html "OWASP Password Storage Cheat Sheet"
[3]: https://docs.expo.dev/versions/latest/sdk/securestore/ "Expo SecureStore documentation"

## License

TSVaultKeySafe is distributed under the [MIT License](./LICENSE).
