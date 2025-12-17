# Privacy Policy

**Last Updated:** January 2024  
**Effective Date:** January 2024

---

## Introduction

TSVaultKeySafe ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we handle information in relation to our mobile application TSVaultKeySafe (the "App").

**Our Core Principle:** TSVaultKeySafe is designed as a privacy-first application. We collect zero personal data, perform zero tracking, and maintain zero cloud dependency.

---

## What Data We Collect

**We collect ZERO personal data.**

TSVaultKeySafe does not collect, store, or transmit any personal information about you, including:

- Your name, email address, or phone number
- Your location or device information
- Your usage patterns or behavior
- Your vault contents or encrypted data
- Any analytics or telemetry data
- Any cookies or tracking identifiers

---

## How Your Data is Stored

All data in TSVaultKeySafe is stored **exclusively on your device**:

- **Local Storage:** Products and vault data are stored in an encrypted SQLite database on your device
- **Encryption:** All data is encrypted with AES-256-GCM encryption
- **No Cloud Sync:** Your data never leaves your device
- **No Backup:** We do not back up your data to cloud services
- **No Transmission:** Your data is never transmitted to any external server

---

## How Your Data is Protected

### Encryption

- **Algorithm:** AES-256-GCM (military-grade encryption)
- **Key Storage:** Master encryption keys are stored in your device's secure keystore (Android Keystore / iOS Keychain)
- **At Rest:** All data is encrypted when stored on your device
- **In Transit:** N/A (data never leaves your device)

### Authentication

- **PIN Protection:** Your vault is protected with a 6-digit PIN
- **Biometric Authentication:** Optional Face ID or Fingerprint authentication
- **Rate Limiting:** Failed PIN attempts are rate-limited to prevent brute force attacks
- **Auto-Lock:** Your vault automatically locks when the app goes to background

### Memory Management

- Sensitive data (encryption keys, PINs) are cleared from memory after use
- No sensitive data is logged or cached
- Secure deletion is used when removing products

---

## Third-Party Services

TSVaultKeySafe does **not** integrate with any third-party services that collect data:

- No analytics services (Google Analytics, Mixpanel, etc.)
- No crash reporting services (Sentry, Crashlytics, etc.)
- No advertising networks
- No social media trackers
- No cloud storage services
- No external APIs that process your data

---

## Permissions

TSVaultKeySafe requests only the minimum necessary permissions:

### Android Permissions

- `INTERNET` — For optional app updates (can be disabled)
- `POST_NOTIFICATIONS` — For optional expiry reminders

### iOS Permissions

- `NSFaceIDUsageDescription` — For optional Face ID authentication
- `NSLocalNetworkUsageDescription` — Not used; included by Expo framework

**Note:** We do NOT request permissions for:
- Location (GPS)
- Contacts
- Calendar
- Photos
- Microphone
- Camera (unless you enable QR scanner feature)

---

## Your Rights

You have full control over your data:

### Access

- You can view all your vault data within the app
- You can export your data in multiple formats (JSON, CSV, PDF)

### Modification

- You can edit or update any product in your vault
- You can delete any product at any time

### Deletion

- You can delete individual products
- You can wipe your entire vault with the "Wipe All Data" option
- Deleted data is securely removed from your device

### Portability

- You can export your vault as encrypted ZIP, PDF, or CSV
- You can import your vault from a backup
- You can switch to another app and take your data with you

---

## Data Retention

**We do not retain any data.** All data is stored exclusively on your device:

- When you delete a product, it is permanently removed from your device
- When you uninstall the app, all data is removed from your device
- We have no servers or databases storing your information

---

## Children's Privacy

TSVaultKeySafe is not intended for children under 13. We do not knowingly collect information from children. If we become aware that we have collected information from a child under 13, we will delete such information immediately.

---

## Security

We implement industry-standard security practices:

- **Encryption:** AES-256-GCM encryption for all data
- **Key Management:** Secure key storage in platform keystore
- **Authentication:** PIN and biometric protection
- **Rate Limiting:** Protection against brute force attacks
- **Secure Deletion:** Cryptographic erasure of deleted data
- **Memory Hygiene:** Sensitive data cleared from memory

However, no security system is perfect. We encourage you to:

- Use a strong, unique PIN
- Enable biometric authentication
- Keep your device secure
- Keep your operating system updated
- Back up your vault regularly

---

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:

- Updating the "Last Updated" date at the top of this policy
- Posting the updated policy in the app
- Requesting your consent if required by law

Your continued use of the app after changes constitutes your acceptance of the updated Privacy Policy.

---

## Open Source

TSVaultKeySafe is open-source software. You can:

- Review the source code on GitHub
- Verify our security claims
- Audit the codebase
- Contribute improvements

**GitHub:** https://github.com/tsvaultkeysafe/app

---

## Contact Us

If you have questions about this Privacy Policy or our privacy practices:

- **Email:** privacy@tsvaultkeysafe.com
- **Website:** https://tsvaultkeysafe.com
- **GitHub Issues:** https://github.com/tsvaultkeysafe/app/issues

---

## Compliance

### GDPR (General Data Protection Regulation)

TSVaultKeySafe complies with GDPR because:

- We collect zero personal data
- We perform zero processing of personal data
- We have no data retention policies (data is stored locally)
- You have full control over your data

### CCPA (California Consumer Privacy Act)

TSVaultKeySafe complies with CCPA because:

- We collect zero personal information
- We share zero personal information
- We do not sell personal information
- You have full control over your data

### HIPAA (Health Insurance Portability and Accountability Act)

While TSVaultKeySafe is not a HIPAA-covered entity, it can be used to store health-related information securely due to its encryption and offline-first design.

### SOC 2

While not formally certified, TSVaultKeySafe implements SOC 2 principles:

- **Security:** Military-grade encryption and secure key storage
- **Availability:** App works offline and is always available
- **Processing Integrity:** Encrypted data ensures integrity
- **Confidentiality:** End-to-end encryption ensures confidentiality
- **Privacy:** Zero data collection ensures privacy

---

## Disclaimer

TSVaultKeySafe is provided "as is" without warranty. While we implement industry-standard security practices, no system is perfectly secure. We are not responsible for:

- Loss of data due to device failure
- Loss of data due to forgotten PIN
- Loss of data due to app uninstallation
- Loss of data due to device theft
- Any other loss or damage to your data

We strongly recommend:

- Using a strong PIN
- Enabling biometric authentication
- Regularly backing up your vault
- Keeping your device secure

---

## Acknowledgments

This Privacy Policy is inspired by privacy-first principles and best practices from:

- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Privacy by Design principles
- Open-source community standards

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2024 | Initial privacy policy |

---

**Thank you for trusting TSVaultKeySafe with your data.**

We are committed to maintaining your privacy and security. If you have any concerns or questions, please don't hesitate to contact us.
