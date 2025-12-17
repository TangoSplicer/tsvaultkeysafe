# Changelog

All notable changes to TSVaultKeySafe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
