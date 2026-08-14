import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { hashPin, verifyPin } from "./encryption";

const VAULT_PIN_HASH_KEY = "tsvault.pin-verifier.v2";
const VAULT_BIOMETRIC_ENABLED_KEY = "tsvault.biometric-enabled.v2";
const VAULT_LAST_UNLOCK_KEY = "tsvault.last-unlock.v2";
const VAULT_AUTO_LOCK_TIMEOUT_KEY = "tsvault.auto-lock-timeout.v2";
const VAULT_FAILED_ATTEMPTS_KEY = "tsvault.failed-attempts.v2";
const VAULT_LOCKOUT_TIME_KEY = "tsvault.lockout-until.v2";
const KEYCHAIN_SERVICE = "com.tsvaultkeysafe.authentication";
const DEFAULT_AUTO_LOCK_MS = 60_000;
const MIN_AUTO_LOCK_MS = 15_000;
const MAX_AUTO_LOCK_MS = 15 * 60_000;
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const INITIAL_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

function options(): SecureStore.SecureStoreOptions {
  return {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

async function getNumber(key: string): Promise<number> {
  const value = await SecureStore.getItemAsync(key, options());
  const parsed = value ? Number.parseInt(value, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function setNumber(key: string, value: number): Promise<void> {
  await SecureStore.setItemAsync(key, String(value), options());
}

export interface VaultAuthState {
  isPinSet: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  failedAttempts: number;
  isLockedOut: boolean;
  lockoutRemainingTime: number;
}

export async function initializeVaultAuth(): Promise<void> {
  const available = await isVaultBiometricAvailable();
  if (
    !available &&
    (await SecureStore.getItemAsync(VAULT_BIOMETRIC_ENABLED_KEY, options())) ===
      null
  ) {
    await SecureStore.setItemAsync(
      VAULT_BIOMETRIC_ENABLED_KEY,
      "false",
      options(),
    );
  }
}

export async function setVaultPin(pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await SecureStore.setItemAsync(VAULT_PIN_HASH_KEY, pinHash, options());
  await clearVaultFailedAttempts();
}

export async function verifyVaultPin(pin: string): Promise<boolean> {
  if (await checkVaultLockout()) {
    throw new Error("Too many failed attempts. Try again later.");
  }

  const pinHash = await SecureStore.getItemAsync(VAULT_PIN_HASH_KEY, options());
  if (!pinHash) {
    throw new Error("PIN not set");
  }

  const isValid = await verifyPin(pin, pinHash);
  if (!isValid) {
    await incrementVaultFailedAttempts();
    throw new Error("Invalid PIN");
  }

  await clearVaultFailedAttempts();
  await recordVaultLastUnlock();
  return true;
}

export async function isVaultBiometricAvailable(): Promise<boolean> {
  const hardwareAvailable = await LocalAuthentication.hasHardwareAsync();
  if (!hardwareAvailable) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function enableVaultBiometric(): Promise<void> {
  if (!(await isVaultBiometricAvailable())) {
    throw new Error("Biometric authentication is not available on this device");
  }
  await SecureStore.setItemAsync(
    VAULT_BIOMETRIC_ENABLED_KEY,
    "true",
    options(),
  );
}

export async function disableVaultBiometric(): Promise<void> {
  await SecureStore.setItemAsync(
    VAULT_BIOMETRIC_ENABLED_KEY,
    "false",
    options(),
  );
}

export async function authenticateVaultWithBiometric(): Promise<boolean> {
  if (!(await isVaultBiometricEnabled())) {
    throw new Error("Biometric unlock is not enabled");
  }
  if (!(await isVaultBiometricAvailable())) {
    throw new Error("Biometric authentication is not available");
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock TSVaultKeySafe",
    cancelLabel: "Use PIN",
    disableDeviceFallback: true,
  });
  if (!result.success) {
    throw new Error("Biometric authentication was not completed");
  }

  await clearVaultFailedAttempts();
  await recordVaultLastUnlock();
  return true;
}

export async function isVaultPinSet(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(VAULT_PIN_HASH_KEY, options()));
}

export async function isVaultBiometricEnabled(): Promise<boolean> {
  return (
    (await SecureStore.getItemAsync(VAULT_BIOMETRIC_ENABLED_KEY, options())) ===
    "true"
  );
}

export async function getVaultAuthState(): Promise<VaultAuthState> {
  const [
    isPinSet,
    isBiometricEnabled,
    isBiometricAvailable,
    failedAttempts,
    isLockedOut,
    lockoutRemainingTime,
  ] = await Promise.all([
    isVaultPinSet(),
    isVaultBiometricEnabled(),
    isVaultBiometricAvailable(),
    getVaultFailedAttempts(),
    checkVaultLockout(),
    getVaultLockoutRemainingTime(),
  ]);

  return {
    isPinSet,
    isBiometricEnabled,
    isBiometricAvailable,
    failedAttempts,
    isLockedOut,
    lockoutRemainingTime,
  };
}

async function recordVaultLastUnlock(): Promise<void> {
  await setNumber(VAULT_LAST_UNLOCK_KEY, Date.now());
}

export async function getVaultLastUnlockTime(): Promise<number> {
  return getNumber(VAULT_LAST_UNLOCK_KEY);
}

export async function shouldVaultAutoLock(): Promise<boolean> {
  const timeout = await getVaultAutoLockTimeout();
  const lastUnlock = await getVaultLastUnlockTime();
  return lastUnlock === 0 || Date.now() - lastUnlock >= timeout;
}

export async function getVaultAutoLockTimeout(): Promise<number> {
  const timeout = await getNumber(VAULT_AUTO_LOCK_TIMEOUT_KEY);
  return timeout || DEFAULT_AUTO_LOCK_MS;
}

export async function setVaultAutoLockTimeout(
  timeoutMs: number,
): Promise<void> {
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < MIN_AUTO_LOCK_MS ||
    timeoutMs > MAX_AUTO_LOCK_MS
  ) {
    throw new Error("Auto-lock timeout is outside the allowed range");
  }
  await setNumber(VAULT_AUTO_LOCK_TIMEOUT_KEY, timeoutMs);
}

async function incrementVaultFailedAttempts(): Promise<void> {
  const attempts = (await getVaultFailedAttempts()) + 1;
  await setNumber(VAULT_FAILED_ATTEMPTS_KEY, attempts);

  if (attempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    const exponent = Math.min(attempts - MAX_ATTEMPTS_BEFORE_LOCKOUT, 4);
    const duration = Math.min(
      INITIAL_LOCKOUT_MS * 2 ** exponent,
      MAX_LOCKOUT_MS,
    );
    await setNumber(VAULT_LOCKOUT_TIME_KEY, Date.now() + duration);
  }
}

async function getVaultFailedAttempts(): Promise<number> {
  return getNumber(VAULT_FAILED_ATTEMPTS_KEY);
}

async function clearVaultFailedAttempts(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(VAULT_FAILED_ATTEMPTS_KEY, options()),
    SecureStore.deleteItemAsync(VAULT_LOCKOUT_TIME_KEY, options()),
  ]);
}

async function checkVaultLockout(): Promise<boolean> {
  const lockoutUntil = await getNumber(VAULT_LOCKOUT_TIME_KEY);
  if (!lockoutUntil) return false;
  if (Date.now() >= lockoutUntil) {
    await SecureStore.deleteItemAsync(VAULT_LOCKOUT_TIME_KEY, options());
    return false;
  }
  return true;
}

async function getVaultLockoutRemainingTime(): Promise<number> {
  return Math.max(0, (await getNumber(VAULT_LOCKOUT_TIME_KEY)) - Date.now());
}

export async function changeVaultPin(
  oldPin: string,
  newPin: string,
): Promise<void> {
  await verifyVaultPin(oldPin);
  await setVaultPin(newPin);
}

export async function clearVaultAuthData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(VAULT_PIN_HASH_KEY, options()),
    SecureStore.deleteItemAsync(VAULT_BIOMETRIC_ENABLED_KEY, options()),
    SecureStore.deleteItemAsync(VAULT_LAST_UNLOCK_KEY, options()),
    SecureStore.deleteItemAsync(VAULT_AUTO_LOCK_TIMEOUT_KEY, options()),
    SecureStore.deleteItemAsync(VAULT_FAILED_ATTEMPTS_KEY, options()),
    SecureStore.deleteItemAsync(VAULT_LOCKOUT_TIME_KEY, options()),
  ]);
}

export const AUTO_LOCK_LIMITS = {
  DEFAULT_AUTO_LOCK_MS,
  MIN_AUTO_LOCK_MS,
  MAX_AUTO_LOCK_MS,
};
