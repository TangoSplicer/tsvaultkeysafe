import { clearActiveDecoyKey } from "./decoy-vault";

export type VaultSessionMode = "locked" | "real" | "decoy";

let sessionMode: VaultSessionMode = "locked";

/**
 * The unlock state deliberately lives only in memory. It is cleared when the
 * process is terminated and is never written to device storage.
 */
export function beginVaultSession(
  mode: Exclude<VaultSessionMode, "locked"> = "real",
): void {
  sessionMode = mode;
}

export function endVaultSession(): void {
  sessionMode = "locked";
  clearActiveDecoyKey();
}

export function isVaultSessionUnlocked(): boolean {
  return sessionMode !== "locked";
}

export function getVaultSessionMode(): VaultSessionMode {
  return sessionMode;
}

export function isRealVaultSession(): boolean {
  return sessionMode === "real";
}

export function isDecoyVaultSession(): boolean {
  return sessionMode === "decoy";
}
