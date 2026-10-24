import {
  NODE_REGISTRY_ENTRY_NAMES,
  convertNodeRegistryText,
} from './migrations/node-registry-entry-names/node-registry-entry-names'
import {
  MOBILE_SESSION_ENTRY_NAMES,
  convertMobileSessionText,
} from './migrations/mobile-session-entry-names/mobile-session-entry-names'

/**
 * The window's client-data migrations in browser storage (autobyteus-290; Data Migration Guideline § 3). Called once
 * per page load by `plugins/19.clientDataMigrations.client.ts`, before any store reads these keys. Several open tabs
 * are safe: each step is recognized by structure and is idempotent.
 */
export type BrowserMigrationLog = {
  info(message: string): void
  warn(message: string): void
}

type Conversion = { ok: true; text: string } | { ok: false; reason: string }

/**
 * The same order and recognition as the file runner: the old key present and the new one absent is converted (old
 * value to `<old>:backup`, the new key written, the old key removed); both keys with the backup is a finished step
 * whose old key is removed; both without the backup keeps the old key for recovery; the backup is removed at the next
 * load that finds only the new key. Never throws.
 */
function migrateKey(
  storage: Storage,
  sourceKey: string,
  targetKey: string,
  convert: (text: string) => Conversion,
  log: BrowserMigrationLog,
): void {
  const backupKey = `${sourceKey}:backup`
  try {
    const source = storage.getItem(sourceKey)
    const hasTarget = storage.getItem(targetKey) !== null
    const hasBackup = storage.getItem(backupKey) !== null
    if (source === null) {
      if (hasTarget && hasBackup) storage.removeItem(backupKey)
      return
    }
    if (hasTarget) {
      if (hasBackup) storage.removeItem(sourceKey)
      else log.warn(`Kept ${sourceKey} for recovery: ${targetKey} exists and was not converted from it.`)
      return
    }
    const converted = convert(source)
    if (!converted.ok) {
      log.warn(`Could not convert ${sourceKey} to ${targetKey}: ${converted.reason}. The value is kept unchanged.`)
      return
    }
    storage.setItem(backupKey, source)
    storage.setItem(targetKey, converted.text)
    storage.removeItem(sourceKey)
    log.info(`Converted ${sourceKey} to ${targetKey}.`)
  } catch (error) {
    log.warn(`Could not convert ${sourceKey} to ${targetKey}: ${error instanceof Error ? error.message : String(error)}. The value is kept.`)
  }
}

export function runBrowserStorageMigrations(storage: Storage, log: BrowserMigrationLog): void {
  migrateKey(storage, NODE_REGISTRY_ENTRY_NAMES.sourceStorageKey, NODE_REGISTRY_ENTRY_NAMES.targetStorageKey,
    convertNodeRegistryText, log)
  migrateKey(storage, MOBILE_SESSION_ENTRY_NAMES.sourceStorageKey, MOBILE_SESSION_ENTRY_NAMES.targetStorageKey,
    convertMobileSessionText, log)
}
