# TSVaultKeySafe

> **A privacy-first, offline-only, end-to-end encrypted digital vault for securely storing product licenses, serial numbers, receipts, and warranty documents.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-54-black.svg)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-green.svg)](./ENCRYPTION_DESIGN.md)

---

## 🔒 Privacy First

TSVaultKeySafe is designed with privacy as the core principle:

- **Zero Data Collection** — We don't collect any information about you
- **Offline-Only** — Works completely without internet connection
- **No Cloud Sync** — All data stays on your device
- **No Accounts** — No email, no password, no registration
- **No Tracking** — No analytics, no telemetry, no ads
- **Open Source** — Audit the code, verify the security

---

## ✨ Features

### 🔐 Security

- **Military-Grade Encryption** — AES-256-GCM encryption for all data at rest
- **PIN Protection** — 6-digit numeric PIN with rate limiting (3 attempts → 30s lockout)
- **Biometric Authentication** — Face ID / Fingerprint unlock with PIN fallback
- **Auto-Lock** — Vault automatically locks when app goes to background
- **Clipboard Auto-Clear** — Automatically clear copied keys after 30 seconds
- **Screenshot Blocking** — Optional toggle to prevent screenshots
- **Secure Deletion** — Cryptographic erasure of deleted items

### 📦 Vault Management

- **Organize Products** — Store unlimited software licenses, game keys, subscriptions, receipts
- **Quick Copy** — Copy license keys with one tap
- **Search & Filter** — Fast local search across all products
- **Expiry Tracking** — Visual badges show product status (Active, Expiring, Expired)
- **Metadata** — Store name, vendor, license key, expiry date, notes, and more

### 🎨 User Experience

- **Dark Mode** — Full dark mode support with light mode fallback
- **Responsive Design** — Works on all screen sizes
- **Accessibility** — High contrast, large text, haptic feedback
- **Offline Capable** — Works completely without internet
- **Fast Performance** — Optimized for smooth 60 FPS animations

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm or npm
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

```bash
# Clone the repository
git clone https://github.com/tsvaultkeysafe/app.git
cd tsvaultkeysafe

# Install dependencies
pnpm install

# Start development server
pnpm start
```

### Running on Device

```bash
# iOS Simulator
pnpm ios

# Android Emulator
pnpm android

# Web Browser
pnpm web
```

---

## 📱 Screenshots

| Vault | Security | Settings | Unlock |
|-------|----------|----------|--------|
| Browse and search products | Manage encryption and biometric | App settings and legal info | PIN entry with biometric |
| [Screenshot] | [Screenshot] | [Screenshot] | [Screenshot] |

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React Native, Expo, TypeScript | Cross-platform mobile UI |
| **Encryption** | AES-256-GCM, HKDF, PBKDF2 | Data protection at rest |
| **Storage** | SQLite (encrypted), AsyncStorage | Local data persistence |
| **Keystore** | Android Keystore, iOS Keychain | Secure key storage |
| **Authentication** | PIN, Biometric | User authentication |

### Data Flow

```
User Input (Product Data)
    ↓
Encryption (AES-256-GCM)
    ↓
Encrypted SQLite Database (on device)
    ↓
Platform Keystore (Master Key)
```

---

## 📚 Documentation

- **[README_PROJECT.md](./README_PROJECT.md)** — Comprehensive project overview
- **[THREAT_MODEL.md](./THREAT_MODEL.md)** — Security threat analysis (STRIDE)
- **[ENCRYPTION_DESIGN.md](./ENCRYPTION_DESIGN.md)** — Cryptographic architecture
- **[BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md)** — Build and deployment guide
- **[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)** — Pre-release verification
- **[STORE_LISTING.md](./STORE_LISTING.md)** — App store marketing copy
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Contribution guidelines
- **[PRIVACY_POLICY.md](./PRIVACY_POLICY.md)** — Privacy policy
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** — File organization
- **[CHANGELOG.md](./CHANGELOG.md)** — Version history
- **[design.md](./design.md)** — UI/UX design specification

---

## 🔐 Security

### Encryption

- **Algorithm:** AES-256-GCM (NIST-approved)
- **Key Derivation:** HKDF-SHA256 for database keys
- **PIN Hashing:** PBKDF2-SHA256 (100,000 iterations)
- **Nonce:** 96-bit random per encryption operation
- **Authentication Tag:** 128-bit for integrity verification

### Key Management

- **Master Key:** Stored in platform keystore (Android Keystore / iOS Keychain)
- **Database Key:** Derived on-demand from master key
- **Attachment Key:** Derived on-demand from master key
- **Export Key:** Derived from user passphrase on import

### Authentication

- **PIN:** 6-digit numeric with rate limiting
- **Biometric:** Delegated to OS-level security
- **Rate Limiting:** 3 failed attempts → 30-second lockout
- **Auto-Lock:** Configurable timeout (1min / 5min / 15min / Never)

For detailed security analysis, see [THREAT_MODEL.md](./THREAT_MODEL.md).

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Generate coverage report
pnpm test --coverage
```

---

## 📦 Building for Production

### Android

```bash
# Build for Play Store
eas build --platform android --release

# Submit to Play Store
eas submit --platform android
```

### iOS

```bash
# Build for App Store
eas build --platform ios --release

# Submit to App Store
eas submit --platform ios
```

See [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) for detailed steps.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Reporting bugs
- Requesting features
- Submitting code
- Code style guidelines
- Testing requirements
- Documentation standards

### Development Setup

```bash
# Clone and install
git clone https://github.com/tsvaultkeysafe/app.git
cd tsvaultkeysafe
pnpm install

# Start development server
pnpm start

# Run tests
pnpm test

# Type check
tsc --noEmit

# Format code
pnpm format

# Lint code
pnpm lint
```

---

## 🗺️ Roadmap

### Version 1.0 (Current) ✅

- ✅ Core vault functionality
- ✅ PIN and biometric authentication
- ✅ AES-256-GCM encryption
- ✅ Product search and filtering
- ✅ Dark mode support
- ✅ Comprehensive documentation

### Version 1.1 (Planned)

- [ ] QR code scanner for license cards
- [ ] Bulk CSV import
- [ ] Expiry reminders with notifications
- [ ] Stealth mode (decoy vault)
- [ ] Multiple vaults
- [ ] Custom categories

### Version 1.2 (Planned)

- [ ] Browser extension
- [ ] Desktop companion app
- [ ] Advanced threat detection
- [ ] Compliance certifications (SOC 2, ISO 27001)

### Future

- [ ] Optional encrypted cloud sync (user-controlled)
- [ ] Template packs
- [ ] Community marketplace

---

## 📄 License

TSVaultKeySafe is released under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Expo** — Cross-platform mobile development framework
- **React Native** — JavaScript framework for native apps
- **CryptoJS** — Cryptographic library
- **SQLite** — Embedded database
- **Community** — All contributors and users

---

## 📞 Support

- **Documentation:** See [README_PROJECT.md](./README_PROJECT.md)
- **Issues:** [GitHub Issues](https://github.com/tsvaultkeysafe/app/issues)
- **Email:** support@tsvaultkeysafe.com
- **Website:** https://tsvaultkeysafe.com

---

## 🔒 Security Disclosure

If you discover a security vulnerability, please email **security@tsvaultkeysafe.com** instead of using the issue tracker. We take security seriously and will respond promptly.

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Language** | TypeScript |
| **Framework** | React Native + Expo |
| **Platforms** | iOS 14+, Android 31+ |
| **Encryption** | AES-256-GCM |
| **License** | MIT |
| **Status** | Active Development |

---

## 🌟 Star History

If you find TSVaultKeySafe useful, please consider starring the repository to help others discover it!

---

**Made with ❤️ by the TSVaultKeySafe Team**

*Your privacy is our priority. All data stays on your device.*
