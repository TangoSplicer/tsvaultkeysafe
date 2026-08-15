# Privacy Policy

**Last Updated:** August 2026
**Effective Date:** August 2026

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

- **Local Storage:** Secure items and vault data are stored in an encrypted SQLite database on your device
- **Encryption:** Secure-item records and managed attachments use authenticated XChaCha20-Poly1305 encryption with purpose-separated local keys
- **No Cloud Sync:** Your data never leaves the device unless you explicitly choose to share an already encrypted transfer file
- **No Service Backup:** We do not back up your data to cloud services or operate a backup service
- **No Server Transmission:** TSVaultKeySafe does not transmit vault data to an external server

---

## How Your Data is Protected

### Encryption

- **Algorithm:** XChaCha20-Poly1305 authenticated encryption for records, attachments, and transfer payloads
- **Key Storage:** Master encryption keys are stored in your device's secure keystore (Android Keystore / iOS Keychain)
- **At Rest:** Managed secure-item records and attachments are encrypted on device
- **Transfer:** A separately passphrase-protected ciphertext file may be shared only when you explicitly choose an operating-system share destination

### Authentication

- **PIN Protection:** Your vault is protected with an eight-digit PIN verifier hardened with PBKDF2-HMAC-SHA-256
- **Biometric Authentication:** Optional Face ID or Fingerprint authentication
- **Rate Limiting:** Failed PIN attempts are rate-limited to prevent brute force attacks
- **Auto-Lock:** Your vault automatically locks when the app goes to background

### Memory Management

- Sensitive data (encryption keys, PINs) are cleared from memory after use
- No sensitive data is logged or cached
- Managed encrypted attachment ciphertext is removed when its secure item is deleted

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

- `POST_NOTIFICATIONS` — Only if you opt in to generic local renewal, expiry, or warranty reminders. Notification text does not include product, vendor, licence, PIN, or secret details.

### iOS Permissions

- `NSFaceIDUsageDescription` — For optional Face ID authentication
- Local network, nearby-device, and Bluetooth permissions are not requested for the encrypted file-transfer workflow.

**Note:** We do NOT request permissions for:

- Location (GPS)
- Contacts
- Calendar
- Photos
- Microphone
- Camera

---

## Your Rights

You have full control over your data:

### Access

- You can view all your vault data within the app
- You can create a `.tsvault` encrypted transfer file and a separate non-secret recovery guide

### Modification

- You can edit or update any secure item in your vault
- You can delete any secure item at any time

### Deletion

- You can delete individual secure items
- You can wipe your entire vault with the "Wipe All Data" option
- Deleted data is securely removed from your device

### Portability

- You can export your vault as a separately passphrase-protected `.tsvault` ciphertext file
- You can import a verified `.tsvault` transfer into a newly created, empty vault on another device
- You choose where an encrypted transfer is stored or shared; we do not operate a transfer relay or recovery service

---

## Data Retention

**We do not retain any data.** All data is stored exclusively on your device:

- When you delete a secure item, it is permanently removed from your device
- When you uninstall the app, all data is removed from your device
- We have no servers or databases storing your information

---

## Children's Privacy

TSVaultKeySafe is not intended for children under 13. We do not knowingly collect information from children. If we become aware that we have collected information from a child under 13, we will delete such information immediately.

---

## Security

We implement industry-standard security practices:

- **Encryption:** XChaCha20-Poly1305 authenticated encryption for managed records, attachments, and transfers
- **Key Management:** Secure key storage in the platform keystore with purpose-separated derived keys
- **Authentication:** Eight-digit PIN protection and optional biometric unlock
- **Rate Limiting:** Progressive temporary lockouts after failed PIN attempts
- **Removal:** The app removes managed records and attachment ciphertext when you delete or permanently wipe a vault; underlying storage media may retain data according to the operating system and filesystem
- **Memory Hygiene:** The active-session guard is cleared when the app leaves the foreground

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

| Version | Date         | Changes                |
| ------- | ------------ | ---------------------- |
| 1.0     | January 2024 | Initial privacy policy |

---

**Thank you for trusting TSVaultKeySafe with your data.**

We are committed to maintaining your privacy and security. If you have any concerns or questions, please don't hesitate to contact us.
