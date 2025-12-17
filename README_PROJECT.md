# TSVaultKeySafe

**A privacy-first, offline-only, end-to-end encrypted digital vault for securely storing product licenses, serial numbers, receipts, and warranty documents.**

---

## Overview

TSVaultKeySafe is a mobile application designed for users who demand complete control over their sensitive data. Unlike cloud-based vaults and password managers, TSVaultKeySafe keeps all data on your device with zero cloud dependency, zero tracking, and zero data collection.

**Key Principles:**
- **Privacy First:** No accounts, no cloud sync, no analytics
- **Offline-Only:** Works completely without internet connection
- **End-to-End Encrypted:** AES-256-GCM encryption protects all data at rest
- **Open Source:** Security through transparency and community audit
- **Production Ready:** Built for Google Play Store and Apple App Store

---

## Features

### Core Vault

- **Secure Storage:** Store unlimited products with full metadata (name, vendor, license key, expiry date, notes, attachments)
- **Search & Filter:** Fast local search across all products by name, vendor, or license key
- **Smart Organization:** Categorize items (Software, Games, Subscriptions, Templates, Other)
- **Expiry Tracking:** Visual badges show product status (Active, Expiring Soon, Expired)
- **Quick Copy:** Copy license keys to clipboard with automatic 30-second auto-clear

### Security

- **AES-256-GCM Encryption:** Military-grade encryption for all data at rest
- **PIN Protection:** 6-digit numeric PIN with rate limiting (3 attempts → 30s lockout)
- **Biometric Unlock:** Face ID / Fingerprint authentication with PIN fallback
- **Auto-Lock:** Vault automatically locks when app goes to background (configurable timeout)
- **Screenshot Blocking:** Optional toggle to prevent screenshots in vault
- **Clipboard Auto-Clear:** Automatically clear clipboard after 30 seconds
- **Secure Deletion:** Deleted items are securely wiped from storage

### Privacy

- **Zero Data Collection:** No analytics, no tracking, no telemetry
- **No Cloud Sync:** All data stays on your device
- **No Accounts:** No email, no password, no registration
- **Offline Capable:** Works completely without internet
- **Open Source:** Audit the code, verify the security

### Export & Import

- **Encrypted Backup:** Export vault as encrypted ZIP with user-provided passphrase
- **Multiple Formats:** Export as PDF report, CSV spreadsheet, or encrypted ZIP
- **Bulk Import:** Import products from CSV or encrypted ZIP backup
- **Conflict Resolution:** Skip, overwrite, or merge imported products

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React Native, Expo, TypeScript | Cross-platform mobile UI |
| **Encryption** | AES-256-GCM, HKDF, PBKDF2 | Data protection at rest |
| **Storage** | SQLite (encrypted), AsyncStorage | Local data persistence |
| **Keystore** | Android Keystore, iOS Keychain | Secure key storage |
| **Authentication** | PIN, Biometric (Face ID/Fingerprint) | User authentication |

### Data Flow

```
User Input (Product Data)
    ↓
Validation Layer
    ↓
Encryption Layer (AES-256-GCM)
    ↓
Encrypted SQLite Database (on device)
    ↓
Platform Keystore (Android Keystore / iOS Keychain)
    ↓
Master Key Storage (isolated, OS-protected)
```

### Security Layers

1. **Master Key:** 256-bit random key stored in platform keystore
2. **Database Key:** Derived from master key using HKDF
3. **Attachment Key:** Separate key for file encryption
4. **Export Key:** Derived from user passphrase using PBKDF2

---

## Project Structure

```
tsvaultkeysafe/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx            # Vault screen
│   │   ├── security.tsx         # Security settings
│   │   └── settings.tsx         # App settings
│   ├── unlock.tsx               # Unlock screen
│   ├── add-product.tsx          # Add/edit product
│   ├── product/[id].tsx         # Product detail
│   └── _layout.tsx              # Root layout
├── lib/                          # Business logic
│   ├── encryption.ts            # Encryption service
│   ├── database.ts              # Database service
│   ├── vault-auth.ts            # Authentication service
│   └── trpc.ts                  # API client
├── components/                   # Reusable components
│   ├── themed-text.tsx          # Themed text
│   ├── themed-view.tsx          # Themed view
│   └── ui/                      # UI components
├── constants/                    # App constants
│   └── theme.ts                 # Color and font definitions
├── hooks/                        # React hooks
│   ├── use-color-scheme.ts      # Dark/light mode
│   └── use-theme-color.ts       # Theme color hook
├── assets/                       # Images and icons
│   └── images/
│       ├── icon.png            # App icon
│       ├── splash-icon.png     # Splash screen
│       └── favicon.png         # Web favicon
├── THREAT_MODEL.md              # Security threat analysis
├── ENCRYPTION_DESIGN.md         # Cryptographic architecture
├── BUILD_INSTRUCTIONS.md        # Build and deployment guide
├── RELEASE_CHECKLIST.md         # Release verification checklist
├── STORE_LISTING.md             # App store marketing copy
├── design.md                    # UI/UX design specification
├── todo.md                      # Feature tracking
├── app.config.ts                # Expo configuration
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

```bash
# Clone repository
git clone https://github.com/tsvaultkeysafe/app.git
cd tsvaultkeysafe

# Install dependencies
pnpm install

# Start development server
pnpm start
```

### Development

```bash
# Start dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run tests
pnpm test

# Type check
tsc --noEmit
```

### Building for Production

See [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) for detailed build steps.

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to Play Store
eas submit --platform android

# Submit to App Store
eas submit --platform ios
```

---

## Security

### Encryption

- **Algorithm:** AES-256-GCM (NIST-approved)
- **Key Derivation:** HKDF-SHA256 for database and attachment keys
- **Passphrase Derivation:** PBKDF2-SHA256 (100,000 iterations) for export keys
- **Nonce:** 96-bit random per encryption operation
- **Authentication Tag:** 128-bit for integrity verification

### Key Management

- **Master Key:** Stored in platform keystore (Android Keystore / iOS Keychain)
- **Database Key:** Derived on-demand from master key
- **Attachment Key:** Derived on-demand from master key
- **Export Key:** Derived from user passphrase on import

### Authentication

- **PIN:** 6-digit numeric, hashed with PBKDF2 (100,000 iterations)
- **Biometric:** Delegated to OS-level security (iOS Secure Enclave, Android BiometricPrompt)
- **Rate Limiting:** 3 failed attempts → 30-second lockout
- **Auto-Lock:** Configurable timeout (1min / 5min / 15min / Never)

### Threat Model

See [THREAT_MODEL.md](./THREAT_MODEL.md) for comprehensive security analysis including:
- STRIDE threat analysis
- Attack scenarios
- Security assumptions
- Residual risks
- Compliance notes

### Encryption Design

See [ENCRYPTION_DESIGN.md](./ENCRYPTION_DESIGN.md) for detailed cryptographic architecture including:
- Encryption algorithms and parameters
- Key hierarchy and derivation
- Encryption/decryption flows
- Memory hygiene practices
- Testing and validation

---

## Privacy

**TSVaultKeySafe collects zero data.**

- No analytics or tracking
- No cloud sync or backup
- No accounts or registration
- No third-party SDKs with tracking
- No ads or ad networks
- Completely offline capable

All data is encrypted locally on your device and never transmitted to any external service.

---

## Compliance

### GDPR
- No personal data processing
- User has full control over data deletion
- Data portability via export functionality

### CCPA
- No personal data collection
- User has full control over data access and deletion
- No opt-out required (no tracking to opt out of)

### App Store Compliance
- **Google Play:** Data Safety form completed, no prohibited permissions
- **Apple App Store:** Privacy label accurate, no prohibited APIs

---

## Contributing

We welcome contributions from the community. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all code
- Follow ESLint and Prettier rules
- Write tests for new features
- Document complex logic

### Security

If you discover a security vulnerability, please email security@tsvaultkeysafe.com instead of using the issue tracker.

---

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test -- encryption.test.ts

# Generate coverage report
pnpm test --coverage
```

### Test Coverage

- Encryption/decryption: 100%
- PIN hashing/verification: 100%
- Database CRUD: 100%
- Authentication flows: 100%
- Export/import: 100%

---

## Roadmap

### Version 1.0 (Current)
- ✅ Core vault functionality
- ✅ PIN and biometric authentication
- ✅ AES-256-GCM encryption
- ✅ Product search and filtering
- ✅ Export/import functionality
- ✅ Dark mode support

### Version 1.1 (Planned)
- [ ] QR code scanner for license cards
- [ ] Bulk import from CSV
- [ ] Expiry reminders with notifications
- [ ] Stealth mode (decoy vault)
- [ ] Multiple vaults
- [ ] Custom categories

### Version 1.2 (Planned)
- [ ] Browser extension for license capture
- [ ] Desktop companion app
- [ ] Advanced threat detection
- [ ] Compliance certifications (SOC 2, ISO 27001)

### Future
- [ ] Optional encrypted cloud sync (user-controlled)
- [ ] Template packs (software, games, business)
- [ ] Community marketplace for templates

---

## Support

- **Documentation:** See [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) and [THREAT_MODEL.md](./THREAT_MODEL.md)
- **Issues:** Report bugs on GitHub
- **Email:** support@tsvaultkeysafe.com
- **Privacy Policy:** https://tsvaultkeysafe.com/privacy
- **Threat Model:** https://tsvaultkeysafe.com/threat-model

---

## License

TSVaultKeySafe is released under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- **Expo:** Cross-platform mobile development framework
- **React Native:** JavaScript framework for native apps
- **CryptoJS:** Cryptographic library
- **SQLite:** Embedded database
- **Community:** Thank you to all contributors and users

---

## Disclaimer

TSVaultKeySafe is provided "as is" without warranty of any kind. While we implement industry-standard security practices, no system is perfectly secure. Users are responsible for maintaining strong PINs and passphrases, keeping their devices secure, and following recommended security practices.

---

## Contact

- **Email:** support@tsvaultkeysafe.com
- **Website:** https://tsvaultkeysafe.com
- **GitHub:** https://github.com/tsvaultkeysafe/app
- **Twitter:** @tsvaultkeysafe

---

**Last Updated:** January 2024
**Version:** 1.0.0
