# TSVaultKeySafe Review and Enhancement Report

**Reviewed repository:** `TangoSplicer/tsvaultkeysafe`

**Review date:** 13 August 2026

**Reviewed release candidate:** `1.1.0`

## Executive conclusion

TSVaultKeySafe began as an incomplete security-oriented scaffold. Its original encryption code documented AES-256-GCM but used `crypto-js` without GCM support, while its product routes, screenshot controls, PIN setup, and main navigation were incomplete or non-functional. I have replaced that design with a smaller, native-only offline vault and implemented the missing core workflow.

The application is now **materially safer and more professional for continued development**. It has real authenticated record encryption, device-protected key storage, a protected session boundary, required onboarding, working product CRUD, a refined visual system, and a purpose-created app icon. However, it is **not ready for public-store release** until its obsolete Expo SDK 50 dependency tree has been upgraded and native controls have been tested on physical devices.

| Assessment area | Before review | After implementation | Release assessment |
| --- | --- | --- | --- |
| Record cryptography | Placeholder implementation falsely labelled AES-GCM | Versioned XChaCha20-Poly1305 authenticated encryption with record ID AAD | Implemented and tested |
| PIN protection | Six digits, 100,000 PBKDF2 rounds, three-attempt fixed lockout | Eight digits, 600,000 PBKDF2-HMAC-SHA-256 rounds, progressive lockouts | Implemented and tested |
| Key storage | Default secure-store options | Device-only, unlocked-device SecureStore policy | Implemented; verify in signed native builds |
| Vault navigation | Vault tabs reachable before a secure session; missing product routes | In-memory session guard, required setup/unlock, immediate background locking | Implemented and export-validated |
| Privacy controls | Screenshot and clipboard settings were visual placeholders | Active native screen-capture prevention and safe clipboard auto-clear | Implemented; device validation required |
| Product workflow | Broken add/open routing | Add, edit, archive, search, copy, delete, expiry status | Implemented |
| Branding | Generic assets and generated bundle identity | Custom vault icon; production naming, package IDs, splash, and favicon | Implemented |
| Attack surface | Unused OAuth, server, tRPC, database, and backend scaffold remained | Removed unused online/backend paths and unencrypted-storage dependency | Implemented |

## High-priority fixes implemented

The record layer now uses XChaCha20-Poly1305 with a new 24-byte random nonce for every encrypted product. The record UUID is passed as associated authenticated data, so substituting a ciphertext into another database row is detected. The `@noble/ciphers` documentation supports authenticated encryption and highlights the advantages of XChaCha’s extended nonce for random-nonce use cases. [1]

The master vault key is a 256-bit operating-system-random value. It is stored through Expo SecureStore with a device-only accessibility level and is separated into database and reserved attachment keys using HKDF-SHA-256. Expo documents that SecureStore is backed by Android Keystore-protected encrypted storage on Android and Keychain Services on iOS. [2]

PIN protection was upgraded to a versioned PBKDF2-HMAC-SHA-256 verifier with a unique 256-bit salt and 600,000 iterations. This follows OWASP’s PBKDF2-HMAC-SHA-256 work-factor guidance. [3] The vault now rejects repeated-digit PINs, applies progressive lockouts after five failures, and uses a constant-time byte comparison after derivation.

The application now locks its in-memory session whenever it becomes inactive or backgrounded. Deep navigation to vault tabs without an active session redirects to the unlock flow. Native screen capture is prevented while the vault session is open, and copied license keys clear after 30 seconds only when the clipboard still contains the key that TSVaultKeySafe copied.

## Product and experience improvements

A complete product workflow now exists. Users can create validated product records, browse active records, search locally, open detail records, edit fields, archive items, copy a key, and delete an item. All fields persist only after record-level encryption. The form validates required fields, categories, date formats, import boundaries, and HTTPS download URL entries.

The user interface now has a consistent midnight-and-teal visual identity. It includes a new custom app icon, a secure onboarding screen, an explicit unlock flow, professional copy, accurate security settings, better empty states, focused destructive actions, and a native-only web boundary. The browser build intentionally displays an informational page instead of exposing vault behavior without native secure-storage guarantees.

| Added capability | User benefit |
| --- | --- |
| Required secure setup | The vault cannot open before a PIN exists. |
| Session-guarded routes | Direct navigation cannot bypass unlock. |
| Add and detail screens | The primary product-management workflow is complete. |
| Active expiry labels | Renewal and expiry urgency are visible in the vault list. |
| Settings that reflect reality | No placeholder claims or broken legal/support links remain. |
| Versioned encrypted exports in the data layer | A safe foundation for a later native file-picker/import user interface. |
| Custom icon set | A recognisable store-ready visual identity across icon, splash, Android adaptive asset, and favicon. |

## Validation performed

| Check | Result | Notes |
| --- | --- | --- |
| Strict TypeScript compilation | Passed | `tsc --noEmit` completed without errors. |
| ESLint | Passed | No rule violations; the TypeScript parser emitted only a compatibility warning because TypeScript 5.9 is newer than that preset’s documented range. |
| Cryptography tests | Passed | 4 tests cover key separation, encrypt/decrypt round trip, tamper/AAD rejection, and PIN policy. |
| Expo configuration | Passed | Public Expo configuration resolved successfully. |
| Web static export | Passed | All static routes exported. The vault itself is deliberately disabled on web. |
| Diff integrity | Passed | `git diff --check` found no whitespace errors. |
| Static source scan | Passed | No old CryptoJS, AsyncStorage, network-call, example-domain, or token patterns remained in mobile source. |

## Residual risks and release blockers

The production dependency audit still reports **3 critical, 63 high, 32 moderate, and 5 low advisories**. The examined critical/high paths are primarily inherited through the out-of-date Expo SDK 50 CLI, React Native tooling, and Expo Router server tooling rather than the newly added vault cryptography. That distinction does not justify shipping the result: the correct remediation is a coordinated upgrade to a current supported Expo/React Native SDK, followed by a fresh audit and physical-device regression test. Avoid suppressing the audit or forcing individual transitive overrides without testing the upgraded toolchain.

The sandbox cannot validate Android Keystore behavior, iOS Keychain accessibility, biometric prompts, screenshot prevention, or clipboard timing on physical devices. These controls must be exercised in signed development or release builds on at least one current iOS device and one current Android device. SecureStore documentation specifically notes that biometric behavior differs in Expo Go. [2]

The export service is implemented only at the encrypted data layer. A user-facing export/import picker should be designed with secure native file handling and explicit warnings before it is released. The app also does not yet claim attachment encryption, root/jailbreak detection, database-page secure deletion, cloud recovery, or resistance to a compromised/unlocked device.

> **Release gate:** Complete the Expo SDK upgrade, resolve the dependency audit, test all native security controls on physical devices, and commission an independent mobile security review before public store submission.

## Files of primary interest

| File | Purpose |
| --- | --- |
| `lib/encryption.ts` | Versioned XChaCha20-Poly1305, HKDF, PBKDF2, secure key lifecycle. |
| `lib/vault-auth.ts` | PIN verification, biometric flow, progressive lockouts, auto-lock preferences. |
| `lib/database.ts` | Encrypted SQLite record lifecycle and encrypted export service. |
| `lib/vault-session.ts` | Non-persistent unlock state. |
| `app/setup.tsx` and `app/unlock.tsx` | First-run protection and controlled unlocking. |
| `app/(tabs)/_layout.tsx` | Session enforcement and capture prevention. |
| `app/add-product.tsx` and `app/product/[id].tsx` | Completed encrypted product CRUD. |
| `app.config.ts` | Production app identity, minimized permissions, native privacy plugins. |
| `assets/images/tsvaultkeysafe-icon.png` | New master app icon. |

## References

[1]: https://github.com/paulmillr/noble-ciphers "noble-ciphers documentation"
[2]: https://docs.expo.dev/versions/latest/sdk/securestore/ "Expo SecureStore documentation"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html "OWASP Password Storage Cheat Sheet"
