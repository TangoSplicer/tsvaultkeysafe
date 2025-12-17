# TSVaultKeySafe — Project TODO

## Core Infrastructure
- [x] Set up encryption layer (AES-256-GCM, crypto-js)
- [x] Implement secure local storage (SQLite with encryption, AsyncStorage)
- [x] Implement platform keystore integration (Android Keystore / iOS Keychain)
- [x] Set up memory hygiene utilities (zero sensitive strings after use)
- [x] Create encryption/decryption service layer

## Authentication & Security
- [x] Implement PIN setup and validation (6-digit numeric)
- [x] Implement biometric authentication (Face ID / Fingerprint)
- [ ] Implement PIN recovery flow (backup code generation)
- [x] Implement auto-lock on background (configurable timeout)
- [x] Implement screenshot blocking toggle
- [x] Implement clipboard auto-clear timer (30s / 60s / 2min / Never)
- [ ] Implement root/jailbreak detection and warning
- [ ] Implement Stealth Mode (decoy vault, paid feature)

## Vault Core Features
- [x] Implement product CRUD operations (Create, Read, Update, Delete)
- [x] Implement product list view with expiry status badges
- [ ] Implement product detail view with all metadata
- [x] Implement product search and filtering (by name, vendor, key)
- [x] Implement quick copy with auto-clear
- [ ] Implement product categories (Software, Game, Subscription, Template, Other)
- [ ] Implement product archiving (soft delete)
- [ ] Implement product sorting (by name, expiry date, creation date)

## Advanced Features
- [ ] Implement QR code scanner (camera integration)
- [ ] Implement CSV bulk import
- [ ] Implement expiry / renewal reminders (local notifications)
- [ ] Implement attachment storage and encryption (PDFs, images)
- [ ] Implement attachment preview and download
- [ ] Implement read-only "view mode" toggle
- [ ] Implement offline widgets (expiry reminders, quick access)

## Export & Import
- [ ] Implement encrypted ZIP export (with passphrase)
- [ ] Implement PDF export (formatted report)
- [ ] Implement CSV export (flat file)
- [ ] Implement encrypted ZIP import (with passphrase validation)
- [ ] Implement CSV import (bulk add with preview)
- [ ] Implement import conflict resolution (skip / overwrite / merge)

## Monetization
- [ ] Implement free tier limits (10 products, no attachments)
- [ ] Implement paid unlock (one-time purchase via IAP)
- [ ] Implement feature gating (attachments, export, stealth mode, multiple vaults)
- [ ] Implement in-app purchase flow (Google Play Billing / App Store)
- [ ] Implement receipt validation and license verification

## UI & UX
- [x] Design and implement Vault tab (home, product list, search)
- [x] Design and implement Security tab (PIN, biometric, encryption settings)
- [x] Design and implement Settings tab (preferences, about, legal)
- [x] Design and implement Unlock screen (PIN entry, biometric)
- [ ] Design and implement Product Detail screen
- [ ] Design and implement Add/Edit Product modal
- [ ] Design and implement QR Scanner screen
- [ ] Design and implement Import/Export screen
- [x] Implement dark mode (primary) and light mode (secondary)
- [x] Implement theme customization (colors, fonts, spacing)
- [x] Implement accessibility (VoiceOver, haptic feedback, contrast)
- [x] Implement loading states and error handling
- [x] Implement empty states and onboarding

## Testing
- [x] Unit tests for encryption/decryption
- [x] Unit tests for PIN validation and biometric flow
- [ ] Unit tests for import/export roundtrip
- [x] Unit tests for product CRUD operations
- [ ] Integration tests for vault lock/unlock under backgrounding
- [ ] Integration tests for device reboot recovery
- [ ] Integration tests for biometric failure fallback
- [ ] Integration tests for clipboard auto-clear
- [ ] Manual testing on Android (primary platform)
- [ ] Manual testing on iOS (secondary platform)

## Documentation
- [x] Write Threat Model (STRIDE-style analysis)
- [x] Write Encryption Design explanation
- [x] Write Build Instructions (Android & iOS)
- [x] Write Release Checklist
- [x] Write Store Listing Copy (Google Play & App Store)
- [ ] Create App Icon (custom design)
- [ ] Create Screenshots (5-8 per platform)
- [ ] Write Privacy Policy (offline-first, no tracking)
- [ ] Write Terms of Service
- [ ] Document data safety (Play Store compliance)

## Branding & Assets
- [ ] Generate custom app icon (square, iconic design)
- [ ] Create splash screen icon
- [ ] Create Android adaptive icon (foreground, background, monochrome)
- [ ] Create favicon for web
- [ ] Update app.config.ts with branding (appName, logoUrl)
- [ ] Create app screenshots (Vault, Security, Settings, Unlock, Detail, Add Product)

## Compliance & Production
- [ ] Verify no prohibited permissions (location, contacts, calendar)
- [ ] Verify Play Store Data Safety disclosure
- [ ] Verify App Store privacy label compliance
- [ ] Verify no analytics SDKs or telemetry by default
- [ ] Verify no ads or ad SDKs
- [ ] Verify no external API dependencies
- [ ] Create root/jailbreak warning copy
- [ ] Set up IAP pricing tiers
- [ ] Configure app signing and certificates
- [ ] Create app store listings (Google Play & App Store)

## Future Enhancements (Post-Launch)
- [ ] Optional encrypted cloud sync (explicitly opt-in, paid)
- [ ] Template packs (software, games, business licenses)
- [ ] Extra vault slots (paid add-on)
- [ ] Browser extension for license capture
- [ ] Desktop companion app (Windows, macOS, Linux)
- [ ] Multi-device backup (encrypted, user-controlled)
- [ ] Advanced search filters (by category, expiry range, vendor)
- [ ] Product recommendations (niche templates)
