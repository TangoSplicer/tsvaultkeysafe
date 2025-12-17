import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashPin, verifyPin } from './encryption';

/**
 * Vault Authentication Service
 * Handles PIN setup, biometric authentication, and unlock logic for the vault
 */

const VAULT_PIN_HASH_KEY = 'vault_pin_hash';
const VAULT_BIOMETRIC_ENABLED_KEY = 'vault_biometric_enabled';
const VAULT_LAST_UNLOCK_KEY = 'vault_last_unlock';
const VAULT_AUTO_LOCK_TIMEOUT_KEY = 'vault_auto_lock_timeout';
const VAULT_FAILED_ATTEMPTS_KEY = 'vault_failed_attempts';
const VAULT_LOCKOUT_TIME_KEY = 'vault_lockout_time';

const LOCKOUT_DURATION_MS = 30000; // 30 seconds
const MAX_FAILED_ATTEMPTS = 3;

export interface VaultAuthState {
  isPinSet: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  failedAttempts: number;
  isLockedOut: boolean;
  lockoutRemainingTime: number;
}

/**
 * Initialize vault authentication system
 */
export async function initializeVaultAuth(): Promise<void> {
  try {
    // Check if biometric is available
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (compatible) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        await AsyncStorage.setItem(VAULT_BIOMETRIC_ENABLED_KEY, 'false');
      }
    } else {
      await AsyncStorage.setItem(VAULT_BIOMETRIC_ENABLED_KEY, 'false');
    }
  } catch (error) {
    console.error('Vault auth initialization failed:', error);
  }
}

/**
 * Set vault PIN (first-time setup or change)
 */
export async function setVaultPin(pin: string): Promise<void> {
  try {
    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be 6 digits');
    }

    // Hash PIN
    const pinHash = await hashPin(pin);

    // Store in secure storage
    await SecureStore.setItemAsync(VAULT_PIN_HASH_KEY, pinHash);

    console.log('Vault PIN set successfully');
  } catch (error) {
    console.error('Failed to set vault PIN:', error);
    throw new Error('Failed to set PIN');
  }
}

/**
 * Verify vault PIN
 */
export async function verifyVaultPin(pin: string): Promise<boolean> {
  try {
    // Check if locked out
    const isLockedOut = await checkVaultLockout();
    if (isLockedOut) {
      throw new Error('Too many failed attempts. Try again later.');
    }

    // Get stored PIN hash
    const pinHash = await SecureStore.getItemAsync(VAULT_PIN_HASH_KEY);
    if (!pinHash) {
      throw new Error('PIN not set');
    }

    // Verify PIN
    const isValid = await verifyPin(pin, pinHash);

    if (!isValid) {
      // Increment failed attempts
      await incrementVaultFailedAttempts();
      throw new Error('Invalid PIN');
    }

    // Clear failed attempts on successful verification
    await clearVaultFailedAttempts();
    await recordVaultLastUnlock();

    return true;
  } catch (error) {
    console.error('Vault PIN verification failed:', error);
    throw error;
  }
}

/**
 * Check if biometric is available
 */
export async function isVaultBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Biometric check failed:', error);
    return false;
  }
}

/**
 * Enable vault biometric authentication
 */
export async function enableVaultBiometric(): Promise<void> {
  try {
    const available = await isVaultBiometricAvailable();
    if (!available) {
      throw new Error('Biometric not available on this device');
    }

    await AsyncStorage.setItem(VAULT_BIOMETRIC_ENABLED_KEY, 'true');
    console.log('Vault biometric enabled');
  } catch (error) {
    console.error('Failed to enable vault biometric:', error);
    throw new Error('Failed to enable biometric');
  }
}

/**
 * Disable vault biometric authentication
 */
export async function disableVaultBiometric(): Promise<void> {
  try {
    await AsyncStorage.setItem(VAULT_BIOMETRIC_ENABLED_KEY, 'false');
    console.log('Vault biometric disabled');
  } catch (error) {
    console.error('Failed to disable vault biometric:', error);
    throw new Error('Failed to disable biometric');
  }
}

/**
 * Authenticate vault with biometric
 */
export async function authenticateVaultWithBiometric(): Promise<boolean> {
  try {
    // Check if biometric is enabled
    const enabled = await AsyncStorage.getItem(VAULT_BIOMETRIC_ENABLED_KEY);
    if (enabled !== 'true') {
      throw new Error('Biometric not enabled');
    }

    // Check if available
    const available = await isVaultBiometricAvailable();
    if (!available) {
      throw new Error('Biometric not available');
    }

    // Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
    });

    if (result.success) {
      await recordVaultLastUnlock();
      return true;
    } else {
      throw new Error('Biometric authentication failed');
    }
  } catch (error) {
    console.error('Vault biometric authentication failed:', error);
    throw error;
  }
}

/**
 * Check if vault PIN is set
 */
export async function isVaultPinSet(): Promise<boolean> {
  try {
    const pinHash = await SecureStore.getItemAsync(VAULT_PIN_HASH_KEY);
    return !!pinHash;
  } catch (error) {
    console.error('Failed to check vault PIN:', error);
    return false;
  }
}

/**
 * Check if vault biometric is enabled
 */
export async function isVaultBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(VAULT_BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to check vault biometric:', error);
    return false;
  }
}

/**
 * Get vault authentication state
 */
export async function getVaultAuthState(): Promise<VaultAuthState> {
  try {
    const pinSet = await isVaultPinSet();
    const biometricEnabled = await isVaultBiometricEnabled();
    const biometricAvailable = await isVaultBiometricAvailable();
    const failedAttempts = await getVaultFailedAttempts();
    const isLockedOut = await checkVaultLockout();
    const lockoutRemainingTime = await getVaultLockoutRemainingTime();

    return {
      isPinSet: pinSet,
      isBiometricEnabled: biometricEnabled,
      isBiometricAvailable: biometricAvailable,
      failedAttempts,
      isLockedOut,
      lockoutRemainingTime,
    };
  } catch (error) {
    console.error('Failed to get vault auth state:', error);
    return {
      isPinSet: false,
      isBiometricEnabled: false,
      isBiometricAvailable: false,
      failedAttempts: 0,
      isLockedOut: false,
      lockoutRemainingTime: 0,
    };
  }
}

/**
 * Record last vault unlock time
 */
async function recordVaultLastUnlock(): Promise<void> {
  try {
    await AsyncStorage.setItem(VAULT_LAST_UNLOCK_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to record last vault unlock:', error);
  }
}

/**
 * Get last vault unlock time
 */
export async function getVaultLastUnlockTime(): Promise<number> {
  try {
    const time = await AsyncStorage.getItem(VAULT_LAST_UNLOCK_KEY);
    return time ? parseInt(time, 10) : 0;
  } catch (error) {
    console.error('Failed to get last vault unlock time:', error);
    return 0;
  }
}

/**
 * Check if vault should auto-lock
 */
export async function shouldVaultAutoLock(): Promise<boolean> {
  try {
    const timeoutStr = await AsyncStorage.getItem(VAULT_AUTO_LOCK_TIMEOUT_KEY);
    const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 5 * 60 * 1000; // Default 5 minutes

    const lastUnlock = await getVaultLastUnlockTime();
    const now = Date.now();

    return now - lastUnlock > timeout;
  } catch (error) {
    console.error('Failed to check vault auto-lock:', error);
    return true; // Default to locked for safety
  }
}

/**
 * Set vault auto-lock timeout (in milliseconds)
 */
export async function setVaultAutoLockTimeout(timeoutMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(VAULT_AUTO_LOCK_TIMEOUT_KEY, timeoutMs.toString());
  } catch (error) {
    console.error('Failed to set vault auto-lock timeout:', error);
    throw new Error('Failed to set auto-lock timeout');
  }
}

/**
 * Increment failed vault PIN attempts
 */
async function incrementVaultFailedAttempts(): Promise<void> {
  try {
    const attempts = await getVaultFailedAttempts();
    const newAttempts = attempts + 1;

    await AsyncStorage.setItem(VAULT_FAILED_ATTEMPTS_KEY, newAttempts.toString());

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      // Lock out for 30 seconds
      await AsyncStorage.setItem(VAULT_LOCKOUT_TIME_KEY, Date.now().toString());
    }
  } catch (error) {
    console.error('Failed to increment vault failed attempts:', error);
  }
}

/**
 * Get failed vault PIN attempts
 */
async function getVaultFailedAttempts(): Promise<number> {
  try {
    const attempts = await AsyncStorage.getItem(VAULT_FAILED_ATTEMPTS_KEY);
    return attempts ? parseInt(attempts, 10) : 0;
  } catch (error) {
    console.error('Failed to get vault failed attempts:', error);
    return 0;
  }
}

/**
 * Clear failed vault PIN attempts
 */
async function clearVaultFailedAttempts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VAULT_FAILED_ATTEMPTS_KEY);
    await AsyncStorage.removeItem(VAULT_LOCKOUT_TIME_KEY);
  } catch (error) {
    console.error('Failed to clear vault failed attempts:', error);
  }
}

/**
 * Check if vault user is locked out
 */
async function checkVaultLockout(): Promise<boolean> {
  try {
    const lockoutTime = await AsyncStorage.getItem(VAULT_LOCKOUT_TIME_KEY);
    if (!lockoutTime) return false;

    const now = Date.now();
    const lockoutTimestamp = parseInt(lockoutTime, 10);

    if (now - lockoutTimestamp > LOCKOUT_DURATION_MS) {
      // Lockout expired, clear it
      await clearVaultFailedAttempts();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check vault lockout:', error);
    return false;
  }
}

/**
 * Get remaining vault lockout time (in milliseconds)
 */
async function getVaultLockoutRemainingTime(): Promise<number> {
  try {
    const lockoutTime = await AsyncStorage.getItem(VAULT_LOCKOUT_TIME_KEY);
    if (!lockoutTime) return 0;

    const now = Date.now();
    const lockoutTimestamp = parseInt(lockoutTime, 10);
    const remaining = LOCKOUT_DURATION_MS - (now - lockoutTimestamp);

    return Math.max(0, remaining);
  } catch (error) {
    console.error('Failed to get vault lockout remaining time:', error);
    return 0;
  }
}

/**
 * Change vault PIN
 */
export async function changeVaultPin(oldPin: string, newPin: string): Promise<void> {
  try {
    // Verify old PIN
    await verifyVaultPin(oldPin);

    // Set new PIN
    await setVaultPin(newPin);

    console.log('Vault PIN changed successfully');
  } catch (error) {
    console.error('Failed to change vault PIN:', error);
    throw new Error('Failed to change PIN');
  }
}

/**
 * Clear all vault authentication data (factory reset)
 */
export async function clearVaultAuthData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(VAULT_PIN_HASH_KEY);
    await AsyncStorage.removeItem(VAULT_BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.removeItem(VAULT_LAST_UNLOCK_KEY);
    await AsyncStorage.removeItem(VAULT_AUTO_LOCK_TIMEOUT_KEY);
    await AsyncStorage.removeItem(VAULT_FAILED_ATTEMPTS_KEY);
    await AsyncStorage.removeItem(VAULT_LOCKOUT_TIME_KEY);

    console.log('All vault authentication data cleared');
  } catch (error) {
    console.error('Failed to clear vault auth data:', error);
    throw new Error('Failed to clear authentication data');
  }
}
