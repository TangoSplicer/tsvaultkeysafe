# TSVaultKeySafe — Threat Model

## Executive Summary

TSVaultKeySafe is a privacy-first, offline-only digital vault designed to store sensitive product licenses, serial numbers, and warranty documents without any cloud dependency or user accounts. This threat model identifies potential security risks and mitigation strategies using the STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

The app's security posture depends on three critical pillars: (1) **local encryption at rest** using AES-256-GCM, (2) **platform-native secure storage** for encryption keys, and (3) **memory hygiene** to prevent sensitive data leakage. Any compromise in these areas directly undermines the app's security promise.

---

## System Architecture Overview

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
Master Key Storage
```

### Trust Boundaries
- **Boundary 1:** User authentication (PIN / Biometric) ↔ Vault unlock
- **Boundary 2:** Encrypted data at rest ↔ Platform keystore
- **Boundary 3:** App process memory ↔ System memory
- **Boundary 4:** Device storage ↔ External storage (export/import)

---

## STRIDE Analysis

### 1. Spoofing (Identity Spoofing)

**Threat:** An attacker impersonates the user by bypassing PIN or biometric authentication.

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Brute-force PIN attack | Medium | Critical | Rate limiting (3 failed attempts → 30s lockout), PIN stored as salted hash in keystore |
| Biometric spoofing (fake fingerprint/face) | Low | Critical | Rely on OS-level biometric security, fallback to PIN, warn user if device is rooted/jailbroken |
| Keystore compromise | Low | Critical | Keys stored only in platform keystore (not accessible to app), require device unlock to access |

**Mitigations:**
- Implement rate limiting: 3 failed PIN attempts trigger 30-second lockout, exponential backoff on repeated failures
- Store PIN as PBKDF2-derived hash (100,000 iterations) in platform keystore
- Biometric authentication delegates to OS-level security (iOS Secure Enclave, Android BiometricPrompt)
- Warn users if device is rooted/jailbroken (non-blocking, informational)
- Require device PIN/pattern unlock to access app keystore

---

### 2. Tampering (Data Tampering)

**Threat:** An attacker modifies encrypted data or encryption keys to corrupt the vault or inject malicious data.

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| SQLite database tampering | Low | High | AES-256-GCM provides authenticated encryption (detects tampering) |
| Encryption key tampering | Very Low | Critical | Keys stored in platform keystore (read-only, OS-protected) |
| Attachment file tampering | Low | High | Separate encryption key for attachments, GCM authentication tag validates integrity |
| Memory tampering (cold boot attack) | Very Low | Critical | Clear sensitive strings immediately after use, use secure memory if available |

**Mitigations:**
- Use AES-256-GCM for all encryption (provides both confidentiality and authenticity)
- GCM authentication tag detects any tampering with ciphertext
- Store encryption keys in platform keystore (immutable, OS-protected)
- Implement secure deletion for sensitive data (overwrite with random bytes before freeing)
- Use React Native's SecureStore for sensitive values (platform-native secure storage)

---

### 3. Repudiation (Non-Repudiation)

**Threat:** A user denies performing an action (e.g., deleting a product, exporting data), or an attacker claims the user performed an action.

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| User denies deleting a product | Low | Low | No audit log (by design, offline-first) — user is sole authority |
| Attacker claims user exported data | Very Low | Low | No cloud sync, no external logging — local device is sole authority |

**Mitigations:**
- No audit logging by design (offline-first, privacy-first approach)
- User is sole authority over their data
- Optional: Implement local audit log (encrypted, user-controlled) for future versions
- Export/import operations are user-initiated and logged locally only

---

### 4. Information Disclosure (Data Leakage)

**Threat:** Sensitive data (license keys, encryption keys) is exposed to unauthorized parties.

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Unencrypted data in memory | Medium | Critical | Clear sensitive strings immediately after use, avoid string concatenation |
| Clipboard exposure | Medium | High | Auto-clear clipboard after 30-60 seconds, user-configurable |
| Screenshot capture | Medium | High | Screenshot blocking toggle (disables screenshots in vault) |
| Backup exposure (iCloud / Google Drive) | Medium | High | Encrypted export only (ZIP with passphrase), user controls backup location |
| Rooted/jailbroken device | Medium | Critical | Warn user, suggest security hardening, but do not block |
| Malware access to keystore | Low | Critical | Keys stored in platform keystore (isolated from app process), require device unlock |
| USB debugging / ADB access | Low | Critical | Rely on device security settings, warn user if device is compromised |

**Mitigations:**
- **Memory hygiene:** Clear sensitive strings (license keys, PINs, passphrases) immediately after use using `memset` or equivalent
- **Clipboard auto-clear:** Automatically clear clipboard 30-60 seconds after copy (user-configurable)
- **Screenshot blocking:** Toggle to disable screenshots in vault (uses platform APIs to block screenshot capture)
- **Encrypted export:** Only export encrypted ZIP with user-provided passphrase
- **No cloud backup:** Data never synced to cloud (iCloud, Google Drive, etc.)
- **Keystore isolation:** Encryption keys stored in platform keystore, not accessible to app
- **Root/jailbreak detection:** Warn user if device is compromised, suggest security hardening

---

### 5. Denial of Service (DoS)

**Threat:** An attacker prevents the user from accessing the vault or using the app.

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| App crash on corrupted database | Medium | High | Validate database integrity on startup, implement recovery mechanism |
| Memory exhaustion (large attachment) | Low | Medium | Limit attachment size (e.g., 50MB per file, 500MB total) |
| Infinite loop in encryption/decryption | Very Low | Medium | Set timeout on crypto operations, implement cancellation |
| Malware disabling app | Very Low | High | Rely on OS-level app protection, user can reinstall |
| Device storage full | Low | Medium | Warn user when storage is low, suggest cleanup |

**Mitigations:**
- Validate SQLite database integrity on startup (PRAGMA integrity_check)
- Implement recovery mechanism (rollback to last known good state)
- Limit attachment file size (50MB per file, 500MB total vault)
- Set timeout on crypto operations (5-second timeout, show progress UI)
- Implement graceful error handling and user-friendly error messages
- Suggest user to free up device storage if low

---

### 6. Elevation of Privilege (Privilege Escalation)

**Threat:** An attacker gains unauthorized access to the vault or system resources.

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Bypass PIN/biometric authentication | Low | Critical | Rate limiting, secure PIN storage in keystore, OS-level biometric security |
| Keystore compromise | Very Low | Critical | Keys isolated in platform keystore, require device unlock |
| App sandbox escape | Very Low | Critical | Rely on OS-level app sandboxing, no privileged operations |
| Stealth Mode bypass | Low | High | Stealth Mode is optional feature, not security-critical (decoy vault) |

**Mitigations:**
- Implement rate limiting on PIN attempts (3 failures → 30s lockout)
- Store PIN as salted hash in keystore (PBKDF2, 100k iterations)
- Delegate biometric auth to OS-level security (iOS Secure Enclave, Android BiometricPrompt)
- Use platform-native secure storage for all sensitive values
- No privileged operations (no root access, no system permissions abuse)
- Stealth Mode is optional, not security-critical

---

## Attack Scenarios

### Scenario 1: Stolen Device

**Attacker:** Thief with physical access to unlocked device

**Attack Path:**
1. Thief opens TSVaultKeySafe app
2. Vault is locked (auto-lock on background)
3. Thief attempts PIN brute-force (3 attempts → 30s lockout)
4. Thief cannot access keystore without device unlock
5. Encryption keys remain protected in platform keystore

**Outcome:** Vault remains secure. Attacker cannot access data without correct PIN and device unlock.

**Mitigations:** Rate limiting, auto-lock, keystore isolation

---

### Scenario 2: Malware on Device

**Attacker:** Malware with app-level permissions

**Attack Path:**
1. Malware attempts to read SQLite database
2. Database is encrypted with AES-256-GCM
3. Malware attempts to access encryption keys from keystore
4. Keystore requires device unlock (isolated from app process)
5. Malware cannot decrypt data without keys

**Outcome:** Data remains encrypted. Malware cannot access unencrypted sensitive data.

**Mitigations:** Encryption at rest, keystore isolation, memory hygiene

---

### Scenario 3: Clipboard Exposure

**Attacker:** Malware monitoring clipboard

**Attack Path:**
1. User copies license key from vault
2. Key is placed on clipboard
3. Malware reads clipboard immediately
4. Malware obtains license key
5. After 30-60 seconds, clipboard is auto-cleared

**Outcome:** Malware can capture key if it reads clipboard immediately. Auto-clear reduces exposure window.

**Mitigations:** Auto-clear clipboard (30-60 seconds), user awareness, optional clipboard monitoring

---

### Scenario 4: Backup Exposure

**Attacker:** Attacker gains access to device backup (iCloud, Google Drive)

**Attack Path:**
1. User exports vault as encrypted ZIP
2. User stores backup in cloud (user's choice)
3. Attacker gains access to cloud account
4. Attacker downloads encrypted ZIP
5. Attacker attempts to decrypt ZIP without passphrase
6. Encryption is AES-256 (passphrase-derived key)
7. Brute-force attack is computationally infeasible

**Outcome:** Backup is protected by strong encryption. Attacker cannot decrypt without passphrase.

**Mitigations:** Encrypted export, user-controlled backup location, strong passphrase derivation (PBKDF2)

---

### Scenario 5: Rooted/Jailbroken Device

**Attacker:** Attacker with root access to device

**Attack Path:**
1. Device is rooted/jailbroken
2. Attacker attempts to access platform keystore
3. TSVaultKeySafe detects root/jailbreak and warns user
4. Attacker can potentially extract keys from keystore (OS-dependent)
5. Attacker can decrypt SQLite database

**Outcome:** Security is compromised on rooted device. User is warned but not blocked (user's choice).

**Mitigations:** Root/jailbreak detection, user warning, suggest security hardening, user education

---

## Security Assumptions

The security of TSVaultKeySafe depends on the following assumptions:

1. **Platform Security:** iOS Secure Enclave and Android Keystore are secure and tamper-resistant
2. **Device Security:** User has set a strong device PIN/pattern/biometric
3. **User Behavior:** User does not share device with untrusted parties, does not install malware
4. **Encryption Libraries:** Cryptographic libraries (TweetNaCl, crypto-js) are correctly implemented
5. **OS Integrity:** Operating system is not compromised (no kernel-level malware)
6. **Backup Security:** User stores encrypted backups in secure locations
7. **Passphrase Strength:** User chooses strong passphrases for encrypted exports

---

## Residual Risks

The following risks remain despite mitigations:

| Risk | Likelihood | Impact | Acceptance |
|------|-----------|--------|-----------|
| Rooted/jailbroken device compromise | Medium | Critical | Accept (user's choice, warned) |
| Kernel-level malware | Very Low | Critical | Accept (beyond app scope) |
| Weak user-chosen passphrase | Medium | High | Accept (user education) |
| Clipboard monitoring by malware | Medium | High | Mitigate (auto-clear reduces window) |
| Device theft with unlocked screen | Low | Critical | Mitigate (auto-lock, rate limiting) |
| Backup exposure in cloud | Medium | High | Mitigate (encrypted export) |

---

## Security Best Practices for Users

TSVaultKeySafe recommends the following security practices:

1. **Set a strong device PIN/pattern/biometric** — Protects keystore access
2. **Enable biometric authentication** — Faster, equally secure as PIN
3. **Use auto-lock timeout** — Locks vault when app goes to background
4. **Enable screenshot blocking** — Prevents accidental exposure in screenshots
5. **Enable clipboard auto-clear** — Reduces clipboard exposure window
6. **Store encrypted backups securely** — Use strong passphrase, store offline or in encrypted cloud storage
7. **Avoid rooted/jailbroken devices** — Compromises platform security
8. **Keep device and app updated** — Patches security vulnerabilities
9. **Do not share device with untrusted parties** — Prevents unauthorized access
10. **Review app permissions** — TSVaultKeySafe requests minimal permissions

---

## Compliance Notes

### GDPR (General Data Protection Regulation)
- **Data Processing:** TSVaultKeySafe does not process personal data (no cloud sync, no analytics)
- **Data Retention:** User has full control over data deletion
- **Data Portability:** User can export data in standard formats (CSV, PDF, ZIP)
- **Privacy by Design:** Offline-first, no tracking, no third-party services

### CCPA (California Consumer Privacy Act)
- **Data Collection:** No personal data collected (offline-first)
- **User Rights:** User has full control over data access, deletion, and portability
- **Opt-out:** No tracking or analytics to opt out of

### App Store Compliance
- **Prohibited Permissions:** App does not request location, contacts, calendar, or other sensitive permissions
- **Data Safety:** App collects no data (offline-first)
- **Privacy Label:** App declares zero data collection

---

## Future Security Enhancements

1. **Hardware Security Module (HSM) Integration** — For enterprise deployments
2. **Multi-device Backup with End-to-End Encryption** — Optional, user-controlled
3. **Secure Enclave / Secure Processor Support** — Enhanced key protection
4. **Advanced Threat Detection** — Anomaly detection for suspicious access patterns
5. **Compliance Certifications** — SOC 2, ISO 27001 (for enterprise version)

---

## Conclusion

TSVaultKeySafe implements a defense-in-depth security architecture that protects sensitive data through encryption at rest, platform-native key storage, memory hygiene, and user authentication. While no system is perfectly secure, the app's design prioritizes privacy and security as core principles, with transparent communication of security assumptions and residual risks.

The app's offline-first architecture eliminates cloud-related risks (data interception, account compromise, third-party breaches) and provides users with complete control over their data. Users should follow the recommended security practices and keep their devices and apps updated to maintain the security posture of the vault.
