# Android Compatibility Findings

The current build is based on Expo SDK 50 and React Native 0.73.6. The latter predates React Native 0.77, the release that added full Android 16 KB memory-page support.

Android devices configured for 16 KB pages can terminate native applications immediately when any bundled native library is not correctly aligned. Android documents that applications with native code must be rebuilt with compatible toolchains and dependencies; Pixel 8 devices are among the devices that can enable 16 KB page-size testing. This matches the reported immediate exit on a Pixel 8 running a modern Android release.

The replacement must therefore use an Expo/React Native generation that includes React Native 0.77 or later, regenerate Android native files, build the bundled release APK, and verify native-library packaging before delivery.

References:

1. https://developer.android.com/guide/practices/page-sizes
2. https://reactnative.dev/blog/2025/01/21/version-0.77
