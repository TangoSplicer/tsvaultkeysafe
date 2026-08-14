# Native PBKDF2 Acceleration Research Notes

## Objective

Reduce TSVaultKeySafe PIN verification latency without changing the existing verifier format or reducing the PBKDF2-HMAC-SHA-256 work factor of 600,000 iterations.

## Findings

| Candidate                                              | Assessment                                                                                                                                                                                                                      | Decision signal                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `@noble/hashes` JavaScript `pbkdf2Async`               | Current implementation. It preserves React Native responsiveness by yielding but still performs the full computation in JavaScript.                                                                                             | Secure baseline, but slower than platform cryptography.                                |
| `react-native-quick-crypto`                            | Provides a broad native crypto surface but has a tracked Android 16 KB page-size issue involving `libssl.so`. The current app has already required a 16 KB native compatibility remediation.                                    | Do not add while the tracked binary compatibility concern remains unresolved.          |
| Local Expo Module backed by Android `SecretKeyFactory` | Expo Modules API supports local Kotlin native modules and Expo SDK 54 / React Native 0.81 support modern native-module autolinking. Android's platform API exposes `PBKDF2WithHmacSHA256`, avoiding third-party C/C++ binaries. | Preferred Android acceleration option, subject to verifier-equivalence and APK checks. |

## Security constraints

The optimization must retain all of the following:

- PBKDF2-HMAC-SHA-256.
- 600,000 iterations.
- 32-byte random salts.
- 32-byte derived verifier output.
- Current versioned `v2:<salt-hex>:<hash-hex>` verifier format.
- Constant-time comparison in the JavaScript compatibility layer.
- Existing progressive lockout, SecureStore behavior, and no-network design.

OWASP lists PBKDF2-HMAC-SHA-256 at 600,000 iterations as a recommended setting when PBKDF2 is required. Android documents `SecretKeyFactory` as the platform factory API, and Android's published algorithm list includes `PBKDF2WithHmacSHA256`.

## Source links

1. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
2. https://developer.android.com/reference/javax/crypto/SecretKeyFactory
3. https://docs.expo.dev/modules/native-module-tutorial/
4. https://expo.dev/changelog/sdk-54
5. https://github.com/margelo/react-native-quick-crypto/issues/744

## Preliminary recommendation

Use a small local Expo Module that calls the Android framework `PBKDF2WithHmacSHA256` implementation. It should use no external native binary and therefore has a substantially lower 16 KB page-size and dependency-maintenance risk than a large third-party OpenSSL-based crypto bridge. Do not lower the work factor merely to improve perceived speed.

## Equivalence and local benchmark

A fixed-input verification compared the Android-compatible Java `SecretKeyFactory("PBKDF2WithHmacSHA256")` output with the current `@noble/hashes` output using the same password, 32-byte salt, 600,000 iterations, and 32-byte derived key. The outputs matched byte-for-byte.

A single local sandbox measurement of the same derivation produced:

| Implementation                                     |  Elapsed time |
| -------------------------------------------------- | ------------: |
| Java `SecretKeyFactory` platform implementation    | 0.796 seconds |
| Existing `@noble/hashes` JavaScript implementation | 1.431 seconds |

These measurements are directional only: the sandbox CPU and runtime differ from a Pixel 8. They show that moving the same work to the platform cryptography provider can reduce processing time without reducing the work factor. Device-side performance and Android package compatibility still require a clean CI build and physical-device test.
