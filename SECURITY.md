# Security Policy

## Supported Versions
Only the `main` branch is actively supported.

## Threat Model
- Attacker has filesystem access
- Attacker may attempt brute force PIN
- Attacker may reverse engineer JS bundle

## Protections
- AES-256-GCM encryption
- PBKDF2 key derivation
- Keys stored in platform keystore
- Biometric + PIN gating
- No plaintext secrets on disk

## Reporting Vulnerabilities
Please open a private GitHub Security Advisory.
