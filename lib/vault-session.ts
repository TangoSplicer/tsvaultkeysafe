let unlocked = false;

/**
 * The unlock state deliberately lives only in memory. It is cleared when the
 * process is terminated and is never written to device storage.
 */
export function beginVaultSession(): void {
  unlocked = true;
}

export function endVaultSession(): void {
  unlocked = false;
}

export function isVaultSessionUnlocked(): boolean {
  return unlocked;
}
