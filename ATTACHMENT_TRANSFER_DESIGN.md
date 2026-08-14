# TSVaultKeySafe Attachment Transfer Design

## Decision

Attachment transfer will use **destination-key re-encryption**. The old vault master key will never be exported, copied, or wrapped for transfer. Each attachment is decrypted only while the old vault is unlocked, then protected with the already established transfer passphrase; on import it is authenticated, decrypted in memory, and immediately encrypted with the new device’s attachment-specific key.

This preserves the existing security model: every installed vault owns its own device-stored master key, while the transfer passphrase protects only the temporary migration package.

## Format and limits

The transfer package remains a single `.tsvault` JSON file with a versioned authenticated manifest. The payload contains encrypted product records and a list of per-attachment transfer blobs. The manifest binds product IDs, attachment IDs, sizes, and a SHA-256 digest of each transfer blob. Import validates the outer transfer passphrase, authenticated manifest, product count, attachment count, identifiers, sizes, and digests before creating local attachment files.

The implementation will limit a single attachment-transfer package to **24 MB of source attachment content** and **12 attachments**. This keeps the JavaScript and JSON serialization work bounded on a mobile device. The owner can create more than one transfer package only after the first import has been validated, rather than risking an unbounded memory-heavy migration.

## Privacy and safety properties

| Property                   | Approach                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| No cloud or account        | Packages are created in temporary local storage and delivered only through the owner-selected operating-system share sheet.      |
| No old-master-key export   | The original device key stays in its SecureStore entry and is never included in a transfer.                                      |
| Confidentiality            | Each attachment transfer blob is encrypted under the separate transfer-passphrase key using XChaCha20-Poly1305.                  |
| Integrity                  | Outer and per-attachment authentication, manifest metadata, and SHA-256 digests are checked before import.                       |
| Destination key separation | Imported attachment data is immediately re-encrypted with the new device’s attachment key and new product UUID binding.          |
| Resource safety            | Attachment count and aggregate source size are capped; a package that exceeds them is rejected before it is created or imported. |
| Failure behavior           | Records and attachments are imported only after all package validation succeeds. The destination vault must still be empty.      |

## Why this design

A transfer that carries old attachment ciphertext would require preserving or exporting the old vault master key, which would weaken the clean new-device trust boundary. A third-party ZIP native module would add another Android binary to validate for the app’s 16 KB page-size requirement. A pure JavaScript ZIP approach still requires reading every source file into memory and does not reduce the outer authenticated-encryption work. The chosen bounded package is simpler to audit and is suitable for a privacy-first solo-developer application.

## Sources

1. Expo FileSystem documentation: https://docs.expo.dev/versions/latest/sdk/filesystem/
2. fflate FAQ: https://github.com/101arrowz/fflate/wiki/FAQ
3. fflate overview: https://101arrowz.github.io/fflate/
