import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/** Enables capture prevention only on native platforms where the OS supports it. */
export async function enableVaultScreenProtection(): Promise<void> {
  if (Platform.OS === 'web') return;
  await ScreenCapture.preventScreenCaptureAsync('tsvaultkeysafe-vault');
}

export async function disableVaultScreenProtection(): Promise<void> {
  if (Platform.OS === 'web') return;
  await ScreenCapture.allowScreenCaptureAsync('tsvaultkeysafe-vault');
}
