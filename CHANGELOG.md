# Changelog

All notable changes to TSVaultKeySafe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] — 2026-08-15

### Added

- **Broader encrypted secure items:** The vault can now classify encrypted records as licences and products, credentials, identity documents, financial references, recovery items, or secure notes. Every type uses the existing XChaCha20-Poly1305 encrypted record path, device-local secure key, local search, encrypted attachments, authenticated transfer, and local recovery snapshot workflow.
- **Context-sensitive private fields:** Entry and editing screens now label the encrypted primary and secondary fields for the selected item type, such as a primary secret for credentials, a document number for identity items, a recovery secret, or protected note content.
- **Legacy compatibility:** Existing vault records without a type are treated as Licence / product records automatically and remain readable, searchable, transferable, recoverable, and editable.

### Changed

- Vault search and record cards now describe secure items and their providers instead of assuming every entry is a product licence.
- The About screen now reflects the broader offline encrypted-item scope.

### Data-minimization boundary

- The vault does not need payment-card PINs, card security codes, or one-time authentication codes. The entry and edit screens explicitly discourage storing them. No accounts, cloud storage, telemetry, analytics, remote recovery key, or network synchronization was added.

---

## [1.5.0] — 2026-08-15

### Added

- **Verified vault PIN rotation:** Security settings now provide a dedicated PIN-change flow. It requires the current eight-digit PIN under the existing progressive lockout policy before a new verifier is stored. The vault master key, encrypted records, attachments, biometric setting, encrypted transfers, and local snapshots are not copied, rewrapped, or exported.
- **Local vault filters:** The vault list now supports instant on-device filters for active records, favourites, expiring or expired records, and archived records. The result count makes the active local scope clear.

### Changed

- Deleting a record from the vault list now removes its managed encrypted attachment ciphertext as well, matching deletion from the detail screen and preventing orphaned private-storage files.
- The PIN-rotation and vault-filter controls include explicit accessibility roles, selection state, and descriptive labels for assistive technologies.

### Privacy boundary

- PIN rotation changes only the device-local PIN verifier in secure storage. Local filtering sends no query, metadata, product, vendor, license, or date information to a service.

---

## [1.4.0] — 2026-08-14

### Added

- **Transfer preflight:** Before a `.tsvault` export starts, the app now reports the encrypted record count, managed-attachment count, estimated temporary package storage, and locally available device space. It blocks the operation when a managed attachment is missing, attachment limits are exceeded, or there is not enough local free space to prepare the package safely.
- **Encrypted local recovery snapshots:** Owners can create up to three private, device-local recovery points from Security settings. Each point includes encrypted records and managed attachments, remains in private app storage, and is never uploaded or shared automatically.
- **Restore safeguard:** Restoring the latest local recovery point first creates a fresh encrypted snapshot of the current vault before replacement begins, allowing the immediately preceding state to remain recoverable.
- **Purpose-separated snapshot key:** Local recovery payloads use a dedicated HKDF-SHA-256 subkey with the context string `local-recovery-snapshot-encryption`, separate from database and attachment keys.

### Changed

- A permanent vault wipe now also removes all local encrypted recovery snapshots.
- Transfer assembly independently enforces the same 12-file and 24 MB attachment package limits reported by preflight, preventing a stale screen state from bypassing the bound.

### Privacy boundary

- Local recovery snapshots add no cloud backup, account, telemetry, remote recovery key, sync service, or automatic export. They can only be decrypted while the original vault’s local device-protected key remains available.

---

## [1.3.1] — 2026-08-14

### Changed

- Encrypted `.tsvault` packages now include bounded encrypted attachment content as well as product records. Attachments are decrypted only inside an unlocked source vault and re-encrypted with the destination device’s separate attachment key during import.
- Transfer summaries and recovery guides now report the verified attachment count alongside record count and fingerprint.
- Attachment-inclusive packages are limited to 12 files and 24 MB of source attachment content to bound mobile memory and package size.
- If an attachment cannot be restored after a verified import begins, the empty destination vault is cleared instead of retaining a partial record-and-attachment state.
- Existing record-only version-3 transfer files remain importable.

### Privacy boundary

- The source vault master key is never exported, copied, wrapped, or shared. The owner-selected transfer passphrase protects only the temporary migration package.

---

## [1.3.0] — 2026-08-14

### Added

- **Owner-controlled continuity:** Encrypted `.tsvault` exports now use a versioned authenticated manifest containing a protected record count and verification fingerprint. Imports validate the authenticated payload, count, and fingerprint before records are committed.
- **Offline recovery guide:** Owners can save or print a separate recovery guide that contains transfer instructions and a verification fingerprint, but never a PIN, transfer passphrase, master key, or readable record.
- **Secure attachment vault:** Receipts and warranty files can be selected through the operating-system picker, encrypted with the purpose-separated attachment key, and stored as ciphertext in private app storage. The interface enforces a 12-file-per-record limit and an 8 MB-per-file limit.
- **Local organization:** Products support favourites, tags, warranty-expiry dates, encrypted attachment references, local tag search, and favourite-first ordering.
- **Generic local reminders:** The owner can opt in to device-scheduled reminders for renewal, expiry, and warranty dates. Notifications contain no product, vendor, licence, PIN, or secret; no push token or remote notification service is used.
- **Vault health check:** Security settings can run a local SQLite quick check and authenticated read of every encrypted record without exposing records or communicating with a service.
- **Direct nearby-device workflow:** The transfer screen explains use of the Android system share sheet to send an already encrypted transfer file to a nearby device. TSVaultKeySafe does not request broad nearby-device, location, or Bluetooth permissions.

### Changed

- Product deletion and permanent vault wipe now remove associated encrypted attachment ciphertext.
- The transfer screen displays an import/export verification fingerprint after successful authenticated processing.
- Security and About screens now describe the local reminder, recovery, attachment, and health-check boundaries accurately.

### Privacy boundary

- This release adds no account, analytics, cloud vault, remote key escrow, automatic sync, push token, or server-side recovery capability.
- The owner chooses where an already encrypted transfer file or non-secret recovery guide is saved or shared.

---

## [1.0.0] — 2024-01-15

### Added

#### Core Features

- Vault home screen with product list and search functionality
- Product CRUD operations (Create, Read, Update, Delete)
- Product metadata storage (name, vendor, license key, expiry date, notes)
- Expiry date tracking with status badges (Active, Expiring Soon, Expired)
- Quick copy license key to clipboard with automatic 30-second auto-clear
- Product search and filtering by name, vendor, or license key

#### Security Features

- PIN-based vault protection (6-digit numeric PIN)
- Biometric authentication support (Face ID / Fingerprint)
- Rate limiting for failed PIN attempts (3 attempts → 30-second lockout)
- Auto-lock functionality with configurable timeout (1min / 5min / 15min / Never)
- Clipboard auto-clear timer (automatic clearing after 30 seconds)
- Screenshot blocking toggle (Android)
- Secure deletion of products with cryptographic erasure

#### Encryption & Storage

- AES-256-GCM encryption for all data at rest
- HKDF key derivation for database keys
- PBKDF2 PIN hashing (100,000 iterations)
- Encrypted SQLite database for local storage
- Platform keystore integration (Android Keystore / iOS Keychain)
- Secure memory hygiene (clearing sensitive data after use)

#### User Interface

- Three-tab navigation (Vault, Security, Settings)
- Security settings screen with encryption status and biometric management
- Settings screen with app information and legal links
- Unlock screen with numeric PIN entry and biometric fallback
- Dark mode support with light mode fallback
- Accessibility features (high contrast, large text, haptic feedback)
- Loading states, error messages, and empty states
- Responsive design for all screen sizes

#### Documentation

- Comprehensive README with project overview
- Threat Model (STRIDE analysis)
- Encryption Design document
- Build Instructions for Android and iOS
- Release Checklist for production deployment
- Store Listing Copy for Google Play and App Store
- Contributing guidelines
- Privacy Policy
- This Changelog

### Technical Details

#### Technology Stack

- React Native 0.81 with Expo SDK 54
- TypeScript 5.9 for type safety
- Expo Router 6 for navigation
- React Native Reanimated 4.x for animations
- crypto-js for cryptographic operations
- expo-secure-store for secure key storage
- expo-sqlite for encrypted database
- expo-local-authentication for biometric support
- @react-native-async-storage/async-storage for local storage

#### Dependencies

- 50+ production dependencies
- Comprehensive error handling
- Platform-specific implementations (Android/iOS)
- Expo-managed build system

### Known Limitations

- Advanced features not yet implemented (QR scanner, bulk import, reminders, export/import)
- Product detail screen not yet implemented
- Add/Edit product modal not yet implemented
- Stealth mode (decoy vault) not yet implemented
- Multiple vaults not yet supported
- Custom categories not yet supported

### Security Notes

- All encryption uses NIST-approved algorithms
- No external APIs or cloud services
- Zero data collection or tracking
- Offline-first architecture
- Open-source for community audit
- Threat model documented and available

### Browser Support

- iOS 14+
- Android API 31+

### Installation

```bash
git clone https://github.com/tsvaultkeysafe/app.git
cd tsvaultkeysafe
pnpm install
pnpm start
```

### Breaking Changes

None (initial release)

### Migration Guide

Not applicable (initial release)

---

## [Unreleased]

### Planned Features

#### Advanced Features

- QR code scanner for license card capture
- Bulk CSV import functionality
- Expiry reminders with local notifications
- Attachment storage and encryption (PDFs, images)
- Encrypted export (ZIP, PDF, CSV)
- Import from encrypted backup
- Stealth mode (decoy vault)
- Multiple vaults support
- Custom product categories

#### Improvements

- Product detail screen with full metadata editing
- Add/Edit product modal with validation
- Advanced search filters (category, expiry range, vendor)
- Product sorting options
- Product archiving (soft delete)
- Read-only view mode
- Offline widgets
- Browser extension for license capture
- Desktop companion app
- Optional encrypted cloud sync (user-controlled)

#### Performance

- Bundle size optimization
- Runtime performance improvements
- Memory usage optimization

#### Testing

- Expanded unit test coverage
- Integration test suite
- E2E testing framework
- Performance benchmarks

---

## Version Format

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

---

## Support

For questions or issues, please visit:

- **GitHub Issues:** https://github.com/tsvaultkeysafe/app/issues
- **Email:** support@tsvaultkeysafe.com
- **Website:** https://tsvaultkeysafe.com

---

## License

TSVaultKeySafe is released under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- Expo team for the excellent development framework
- React Native community for the mobile development foundation
- CryptoJS for cryptographic operations
- All contributors and users who help improve TSVaultKeySafe
