# TSVaultKeySafe Offline-First Roadmap Architecture

## Non-negotiable product boundary

TSVaultKeySafe remains a device-owned vault. It will not create accounts, sync a vault to a server, collect analytics, hold recovery secrets, escrow keys, or send user data to a service. Every feature described here is implemented locally on the owner’s device or through an explicit, encrypted file the owner chooses to move.

## Chosen designs

| Capability             | Design                                                                                                                                                                                                                                                                                                 | Security and privacy rationale                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Encrypted attachments  | Copy a user-selected file into the app’s private document directory, encrypt it with the existing purpose-separated attachment key and XChaCha20-Poly1305, then store encrypted metadata inside the protected product record.                                                                          | Document selection uses the operating system picker with a cache copy; attachment contents never remain as managed plaintext after import.                                                 |
| Local reminders        | Schedule one local OS notification per upcoming product event, containing only a generic privacy-safe prompt such as “A vault renewal is due soon.” The notification payload contains an opaque record identifier only.                                                                                | Notifications are scheduled by the device and do not require a push token, external service, or background network access. No license, vendor, or product name appears on the lock screen. |
| Backup verification    | Extend the encrypted `.tsvault` format with record count, manifest, integrity fingerprint, and export age. Verify decryption, schema, record count, and authenticated manifest before an import is committed.                                                                                          | The existing transfer passphrase and authenticated encryption remain mandatory. The app never uploads the export.                                                                          |
| Recovery kit           | Produce an owner-printable recovery guide that includes the encrypted-file name, creation date, checksum/fingerprint, and recovery steps, but never a PIN, master key, or transfer passphrase.                                                                                                         | It improves continuity without becoming a decryption backdoor.                                                                                                                             |
| Direct nearby transfer | Treat the existing Android system share sheet as the default direct-transfer mechanism: the encrypted `.tsvault` file can be shared using the owner’s Nearby Share/Bluetooth/local transfer choice. Add an explicit “nearby device” guided path and post-import verification.                          | It uses a well-supported OS transfer surface and transfers ciphertext only. It requires no new broad Bluetooth/location permissions or third-party P2P native binary.                      |
| Future peer pairing    | Do not add `expo-nearby-connections` in this release. It requires Bluetooth/location/nearby Wi-Fi runtime permissions and a third-party native module, expanding the attack surface and Android compatibility risk. Reconsider only after the mature encrypted file-transfer workflow is field-tested. | This is the lower-risk route for a solo developer and preserves the app’s present 16 KB native-binary compatibility discipline.                                                            |

## Implementation constraints

- Continue to use XChaCha20-Poly1305 authenticated encryption for encrypted files and attachment blobs.
- Use purpose-separated attachment keys derived through the existing HKDF-SHA-256 scheme.
- Store only encrypted attachment files under the app-private document directory.
- Enforce bounded attachment file sizes, file counts, and sanitized file names.
- Keep notification content generic. Require owner opt-in and avoid exact alarms; calendar notifications may be delivered late by the OS, which is acceptable for licence renewal reminders.
- Keep import operations transactional and create an encrypted recovery snapshot before destructive actions.
- Retain a safe JavaScript PBKDF2 fallback on non-Android or if the Android platform provider cannot load.

## Sources

1. Expo Notifications documentation: https://docs.expo.dev/versions/latest/sdk/notifications/
2. Expo DocumentPicker documentation: https://docs.expo.dev/versions/latest/sdk/document-picker/
3. Expo FileSystem documentation: https://docs.expo.dev/versions/latest/sdk/filesystem/
4. expo-nearby-connections repository: https://github.com/puguhsudarma/expo-nearby-connections
