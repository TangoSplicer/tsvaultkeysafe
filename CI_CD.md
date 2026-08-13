# CI/CD and Android APK Builds

TSVaultKeySafe uses GitHub Actions to validate each pull request and every push to `main`. The pipeline is intentionally limited to build verification and artifact delivery: it does not create public releases or publish unsigned binaries automatically.

## What the pipeline does

| Stage             | Trigger                                             | Outcome                                                                                                                                              |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source validation | Pull requests, pushes, manual runs                  | Installs the locked dependency graph, runs linting, strict TypeScript checks, and cryptography tests.                                                |
| Android build     | After successful validation                         | Recreates the Android native project from Expo configuration, builds a debug APK, calculates SHA-256, and uploads both files as a workflow artifact. |
| Code scanning     | Pull requests, pushes, weekly schedule, manual runs | Runs CodeQL v4 against JavaScript and TypeScript using extended security and quality queries.                                                        |

The workflow uses **Node.js 24** and `pnpm@11.21.0`. Dependency installation is locked with `pnpm install --frozen-lockfile`, which prevents the runner from resolving a different package graph than the committed lockfile. The committed pnpm workspace policy also explicitly denies the unneeded `unrs-resolver` lifecycle build rather than allowing an interactive approval prompt in CI. [1]

## Downloading a CI-built APK

After a successful workflow run, open the **Actions** tab in GitHub, choose the run named **Validate and Build Android APK**, then download the artifact named `TSVaultKeySafe-debug-apk-<run-id>`. The artifact contains two files:

| File                                              | Purpose                                                      |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `TSVaultKeySafe-<version>-<sha>-debug.apk`        | Installable Android debug build for development and testing. |
| `TSVaultKeySafe-<version>-<sha>-debug.apk.sha256` | SHA-256 checksum for verifying the downloaded APK.           |

The debug APK is **unsigned** and is not suitable for Play Store publication. It is retained for 30 days. GitHub’s artifact actions support configurable retention and expose an artifact URL from a completed upload. [2]

## Running equivalent checks locally

Use Node 24 and the pnpm version declared in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run verify
```

To generate a debug APK locally, use a clean Android prebuild before Gradle:

```bash
CI=1 EXPO_NO_TELEMETRY=1 pnpm exec expo prebuild --platform android --clean --no-install
cd android
./gradlew assembleDebug
```

The resulting APK will normally be under `android/app/build/outputs/apk/debug/`.

## CodeQL v4 migration

The CodeQL workflow uses `github/codeql-action/init@v4` and `github/codeql-action/analyze@v4`. GitHub states that CodeQL Action v4 runs on Node.js 24 and that advanced CodeQL workflows should replace their v3 action references before v3 is deprecated in December 2026. [3]

## References

[1]: https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md "actions/setup-node advanced usage"
[2]: https://github.com/actions/upload-artifact "actions/upload-artifact documentation"
[3]: https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/ "GitHub CodeQL Action v3 deprecation notice"
