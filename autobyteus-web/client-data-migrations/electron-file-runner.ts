import * as fs from 'fs'
import * as path from 'path'
import {
  NODE_REGISTRY_ENTRY_NAMES,
  convertNodeRegistryText,
} from './migrations/node-registry-entry-names/node-registry-entry-names'

/**
 * The desktop shell's client-data migrations (autobyteus-290; Data Migration Guideline § 3, "Client-side stores").
 * Called once by the Electron main process before it first reads the node list. Current code imports only this file
 * and `browser-storage-runner.ts`; old names live only in `migrations/` and `frozen/`.
 */
export type ClientMigrationLog = {
  info(message: string): void
  warn(message: string): void
}

type Conversion = { ok: true; text: string } | { ok: false; reason: string }

/**
 * Renames one file by structure: the old file present and the new one absent. The order is: read and convert (a
 * failure writes nothing), copy the old file to `<old>.bak`, write the new file (temporary file, then rename), remove
 * the old file. A crash after the new file is written leaves the old file and its backup; the next start finds both
 * files with the backup and removes the old one. Both files without a backup means the new file did not come from
 * the old one (the app started without it after a failure), so the old file is kept for recovery. The backup is
 * removed at the next start that finds only the new file. Never throws: a failure is logged and the original kept.
 */
function migrateFile(
  directory: string,
  sourceName: string,
  targetName: string,
  convert: (text: string) => Conversion,
  log: ClientMigrationLog,
): void {
  const source = path.join(directory, sourceName)
  const target = path.join(directory, targetName)
  const backup = `${source}.bak`
  try {
    const hasSource = fs.existsSync(source)
    const hasTarget = fs.existsSync(target)
    const hasBackup = fs.existsSync(backup)
    if (!hasSource) {
      if (hasTarget && hasBackup) fs.rmSync(backup, { force: true })
      return
    }
    if (hasTarget) {
      if (hasBackup) {
        fs.rmSync(source)
        log.info(`Removed ${source}: it was already converted to ${target}.`)
      } else {
        log.warn(`Kept ${source} for recovery: ${target} exists and was not converted from it.`)
      }
      return
    }
    const converted = convert(fs.readFileSync(source, 'utf8'))
    if (!converted.ok) {
      log.warn(`Could not convert ${source} to ${target}: ${converted.reason}. The file is kept unchanged.`)
      return
    }
    fs.copyFileSync(source, backup)
    const temporary = `${target}.tmp`
    fs.writeFileSync(temporary, converted.text, 'utf8')
    fs.renameSync(temporary, target)
    fs.rmSync(source)
    log.info(`Converted ${source} to ${target}; the backup ${backup} is removed at the next start.`)
  } catch (error) {
    log.warn(`Could not convert ${source} to ${target}: ${error instanceof Error ? error.message : String(error)}. The file is kept.`)
  }
}

export function runElectronFileMigrations(userDataPath: string, log: ClientMigrationLog): void {
  migrateFile(
    userDataPath,
    NODE_REGISTRY_ENTRY_NAMES.sourceFileName,
    NODE_REGISTRY_ENTRY_NAMES.targetFileName,
    convertNodeRegistryText,
    log,
  )
}
