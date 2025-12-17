# TSVaultKeySafe — Build Instructions

## Overview

TSVaultKeySafe is built with React Native and Expo, providing a unified codebase for both iOS and Android platforms. This document provides step-by-step instructions for building, testing, and deploying the application to the Google Play Store and Apple App Store.

---

## Prerequisites

Before building TSVaultKeySafe, ensure you have the following installed on your development machine:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm or pnpm | Latest | Package manager |
| Expo CLI | 54+ | Expo development tools |
| Android Studio | Latest | Android SDK and emulator |
| Xcode | 14+ | iOS SDK and simulator |
| CocoaPods | Latest | iOS dependency manager |
| Git | Latest | Version control |

### macOS (for iOS development)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Expo CLI globally
npm install -g expo-cli

# Install Xcode Command Line Tools
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods
```

### Linux/Windows (for Android development)

```bash
# Install Node.js (follow official instructions for your OS)
# https://nodejs.org/

# Install Expo CLI globally
npm install -g expo-cli

# Install Android Studio
# https://developer.android.com/studio

# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/tsvaultkeysafe/app.git
cd tsvaultkeysafe
```

### 2. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_NAME=TSVaultKeySafe
EXPO_PUBLIC_APP_SLUG=tsvaultkeysafe
```

### 4. Start Development Server

```bash
# Start Expo development server
pnpm start

# Or using npm
npm start
```

This will display a QR code. You can:
- Scan with Expo Go app on your phone
- Press `i` for iOS simulator
- Press `a` for Android emulator

---

## Building for Android

### Prerequisites

- Android Studio installed
- Android SDK (API level 31+)
- Android Emulator or physical device

### Build Steps

#### 1. Create Android Build Credentials

```bash
# Generate or use existing keystore
eas credentials

# Follow prompts to create/select Android credentials
```

#### 2. Build APK (for testing)

```bash
# Build APK for local testing
eas build --platform android --local

# Or build on EAS servers
eas build --platform android
```

#### 3. Build AAB (for Play Store)

```bash
# Build Android App Bundle for Play Store
eas build --platform android --release

# This generates an AAB file ready for Play Store submission
```

#### 4. Test on Emulator

```bash
# Start Android emulator
emulator -avd Pixel_5_API_31

# Run app on emulator
pnpm android

# Or using npm
npm run android
```

#### 5. Test on Physical Device

```bash
# Enable USB Debugging on device
# Connect device via USB

# Run app on device
pnpm android

# View logs
adb logcat
```

### Signing Configuration

Android apps must be signed with a keystore. The build process handles this automatically through EAS, but you can also sign manually:

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias tsvault

# Build and sign APK locally
./gradlew assembleRelease

# Sign APK with jarsigner
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore release.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk tsvault

# Align APK
zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release.apk
```

---

## Building for iOS

### Prerequisites

- macOS 12+
- Xcode 14+
- Apple Developer Account
- iOS device or simulator

### Build Steps

#### 1. Create iOS Build Credentials

```bash
# Generate or use existing iOS credentials
eas credentials

# Follow prompts to create/select iOS certificates and provisioning profiles
```

#### 2. Build IPA (for App Store)

```bash
# Build IPA for App Store
eas build --platform ios --release

# This generates an IPA file ready for App Store submission
```

#### 3. Test on Simulator

```bash
# Start iOS simulator
open -a Simulator

# Run app on simulator
pnpm ios

# Or using npm
npm run ios
```

#### 4. Test on Physical Device

```bash
# Connect iOS device via USB
# Trust device certificate when prompted

# Run app on device
pnpm ios

# View logs
xcrun simctl spawn booted log stream --predicate 'process == "TSVaultKeySafe"'
```

### Code Signing

iOS apps require code signing with Apple Developer certificates:

```bash
# Create signing certificate
eas credentials

# Manage provisioning profiles
eas credentials --platform ios

# View signing details
security find-identity -v -p codesigning
```

---

## Testing

### Unit Tests

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Generate coverage report
pnpm test --coverage
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration

# Run specific test file
pnpm test:integration -- --testNamePattern="unlock"
```

### Manual Testing Checklist

- [ ] App launches without errors
- [ ] PIN setup works correctly
- [ ] Biometric authentication works (if available)
- [ ] Vault unlock with PIN succeeds
- [ ] Product CRUD operations work
- [ ] Search and filtering work
- [ ] Export/import functionality works
- [ ] Auto-lock timeout works
- [ ] Clipboard auto-clear works
- [ ] Screenshot blocking works (Android)
- [ ] App survives device reboot
- [ ] Data persists after app restart
- [ ] Encryption/decryption works correctly
- [ ] Error handling is user-friendly

---

## Deployment

### Google Play Store

#### 1. Create Play Store Listing

- Go to [Google Play Console](https://play.google.com/console)
- Create new app
- Fill in app details (name, description, screenshots, etc.)
- Set content rating
- Configure pricing and distribution

#### 2. Upload Build

```bash
# Build and upload to Play Store
eas submit --platform android

# Or upload manually via Play Console
```

#### 3. Review and Publish

- Review app details
- Add release notes
- Submit for review
- Wait for approval (typically 24-48 hours)
- Publish to production

### Apple App Store

#### 1. Create App Store Listing

- Go to [App Store Connect](https://appstoreconnect.apple.com)
- Create new app
- Fill in app details (name, description, screenshots, etc.)
- Set content rating
- Configure pricing and distribution

#### 2. Upload Build

```bash
# Build and upload to App Store
eas submit --platform ios

# Or upload manually via Xcode/Transporter
```

#### 3. Review and Publish

- Review app details
- Add release notes
- Submit for review
- Wait for approval (typically 24-48 hours)
- Publish to App Store

---

## Release Checklist

Before releasing to production, verify the following:

| Item | Status | Notes |
|------|--------|-------|
| All tests passing | [ ] | Run full test suite |
| No TypeScript errors | [ ] | Run `tsc --noEmit` |
| No console warnings | [ ] | Check dev console |
| Version bumped | [ ] | Update `app.config.ts` |
| Release notes written | [ ] | Document changes |
| Screenshots updated | [ ] | 5-8 per platform |
| Privacy policy updated | [ ] | Review compliance |
| Terms of service updated | [ ] | Review compliance |
| Data safety disclosure | [ ] | Play Store compliance |
| Privacy label | [ ] | App Store compliance |
| Build signed correctly | [ ] | Verify signatures |
| Build tested on devices | [ ] | iOS and Android |
| Crash reporting enabled | [ ] | Sentry or similar |
| Analytics disabled | [ ] | Verify no tracking |

---

## Troubleshooting

### Common Issues

#### Build Fails with "Module not found"

```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install

# Clear Expo cache
expo start --clear
```

#### iOS Build Fails

```bash
# Update CocoaPods
sudo gem install cocoapods
cd ios && pod install && cd ..

# Clear Xcode cache
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

#### Android Build Fails

```bash
# Clear Gradle cache
rm -rf ~/.gradle/caches

# Clear Android build
rm -rf android/build

# Rebuild
eas build --platform android --local
```

#### App Crashes on Startup

```bash
# Check logs
adb logcat | grep TSVaultKeySafe  # Android
xcrun simctl spawn booted log stream --predicate 'process == "TSVaultKeySafe"'  # iOS

# Check for TypeScript errors
tsc --noEmit

# Check for runtime errors in dev console
```

---

## Performance Optimization

### Bundle Size

```bash
# Analyze bundle size
expo-optimize

# Check bundle size
eas build --platform android --analyze
```

### Runtime Performance

- Use `React.memo` for expensive components
- Implement `FlatList` virtualization for long lists
- Lazy load screens with `React.lazy`
- Profile with React DevTools

### Memory Management

- Clear sensitive data after use
- Unsubscribe from listeners
- Clean up timers and intervals
- Use `useCallback` and `useMemo` appropriately

---

## Continuous Integration

### GitHub Actions

Create `.github/workflows/build.yml`:

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm test
      - run: tsc --noEmit
      - run: eas build --platform android --local
```

---

## Support and Resources

- **Expo Documentation:** https://docs.expo.dev
- **React Native Documentation:** https://reactnative.dev
- **Google Play Console:** https://play.google.com/console
- **App Store Connect:** https://appstoreconnect.apple.com
- **EAS Build Documentation:** https://docs.expo.dev/build/introduction/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial release |

---

## License

TSVaultKeySafe is released under the MIT License. See LICENSE file for details.
