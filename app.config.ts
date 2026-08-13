import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'TSVaultKeySafe',
  slug: 'tsvaultkeysafe',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tsvaultkeysafe',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tangosplicer.tsvaultkeysafe',
  },
  android: {
    package: 'com.tangosplicer.tsvaultkeysafe',
    adaptiveIcon: {
      backgroundColor: '#0F172A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ['expo-secure-store', {
      configureAndroidBackup: true,
      faceIDPermission: 'Allow TSVaultKeySafe to unlock your encrypted vault with Face ID.',
    }],
    ['expo-local-authentication', {
      faceIDPermission: 'Allow TSVaultKeySafe to unlock your encrypted vault with Face ID.',
    }],
    ['expo-splash-screen', {
      image: './assets/images/splash-icon.png',
      imageWidth: 200,
      resizeMode: 'contain',
      backgroundColor: '#0F172A',
    }],
  ],
  experiments: { typedRoutes: true },
};

export default config;
