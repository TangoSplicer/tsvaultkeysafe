import { deriveKeys, getMasterKey } from './encryption';
import { isVaultSessionUnlocked } from './vault-session';

export async function requireVaultDatabaseKey(): Promise<string> {
  if (!isVaultSessionUnlocked()) {
    throw new Error('Vault session is locked');
  }
  const masterKey = await getMasterKey();
  if (!masterKey) {
    throw new Error('Vault key is unavailable');
  }
  return (await deriveKeys(masterKey)).databaseKey;
}
