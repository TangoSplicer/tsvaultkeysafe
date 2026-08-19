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

## Runtime security enhancements

### Recovery and migration

Encrypted transfer import now authenticates the payload and transfer passphrase before displaying the import preview. The user must review the verified record count, attachment count, filename, and fingerprint before any database mutation occurs. Imports remain restricted to empty vaults, and attachment restoration failures trigger cleanup of partial target state.

### Duress PIN

The optional duress PIN is stored as a separate PBKDF2 verifier in device-only secure storage. If entered at the unlock screen, it records a one-shot local trigger, fails through the same generic invalid-PIN path, and never starts a vault session. It is non-destructive by design: it does not delete records, create a decoy vault, or claim protection against every coercion scenario. Changing or removing it requires the existing sensitive-action re-authentication gate.

### Attachment lifecycle

Opening an encrypted attachment creates a temporary readable cache copy only after sensitive-action re-authentication. A bounded cleanup timer removes that copy after five minutes; the encrypted attachment remains the authoritative source. The receiving Android application may retain its own copy after sharing, which is explained in the local security model.

### Local transparency

The Security hub exposes the bounded encrypted audit history, can expand from the latest eight events to the full retained history, reports local record and attachment health, and links to an in-app threat model explaining protection and operating-system boundaries. No event includes record names, protected values, PINs, transfer passphrases, or attachment contents.

## Build-tool dependency mitigations

### Metro `image-size` safeguard

Metro uses `image-size` only while deriving dimensions for recognised build-time image assets. The application APK does not ship Metro or its Node.js asset parser. Metro 0.83.x currently resolves `image-size@1.2.1`; upstream Metro and Expo releases available at the time of this release continue to declare the same `^1.0.2` dependency range.

The repository applies the reviewable pnpm patch at [`patches/image-size@1.2.1.patch`](patches/image-size@1.2.1.patch). It rejects ICNS records with non-finite or fewer-than-eight-byte entry lengths before offset advancement, preventing the malformed zero-length-entry loop. The patch is registered in `pnpm-workspace.yaml` and pinned in `pnpm-lock.yaml` so `pnpm install --frozen-lockfile` applies it deterministically.

`pnpm run verify:dependency-patches` confirms that the expected version, patch registration, installed ICNS guard, and existing zero-length-box offset guard are present. The process-isolated Metro regression test in `__tests__/metro-image-size.test.ts` passes malformed ICNS and JXL payloads through Metro's recognised-image path and requires bounded completion rather than a hang. GitHub Actions runs the patch verifier before linting, type checking, unit tests, and Android compilation.

Automated dependency scanners may still identify the original advisory because they inspect the package version rather than local patch contents. This is a documented temporary exception, not a suppression: retain the patch and regression test until an official Metro release either removes `image-size`, adopts a maintained replacement, or resolves to a published non-vulnerable release. Do not map untrusted opaque assets to Metro's recognised image extensions.

## Reporting Vulnerabilities

Please open a private GitHub Security Advisory.
