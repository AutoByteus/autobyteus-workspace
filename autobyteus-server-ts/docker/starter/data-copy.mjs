// The copy of the node's data folder an update takes before it starts a version that brings data
// migrations the running one does not have (DEC-005). It lives at <server-packages>/data-copy/ in the
// node's own volume, because it holds the vault, and exists only from the stop until the new version
// is confirmed (then deleted) or rolled back (then restored and deleted).
import { cp, rename, rm } from 'node:fs/promises'
import { cpSync, lstatSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

/** Bytes of the regular files under a folder. */
export function folderSize(folder) {
  let total = 0
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const entryPath = path.join(folder, entry.name)
    if (entry.isDirectory()) total += folderSize(entryPath)
    else if (entry.isFile()) total += lstatSync(entryPath).size
  }
  return total
}

export class DataCopy {
  #copyDir
  #partialDir
  #dataDir

  constructor({ packagesRoot, dataDir }) {
    this.#copyDir = path.join(packagesRoot, 'data-copy')
    this.#partialDir = path.join(packagesRoot, 'data-copy.partial')
    this.#dataDir = dataDir
  }

  /** Whether the new package brings a data migration the running package does not have. */
  needsCopy(description, runningPackageJson) {
    const running = new Set(runningPackageJson.dataMigrations)
    return description.dataMigrations.some((migration) => !running.has(migration))
  }

  /** The space a copy needs: the data folder's size plus 10 %. */
  bytesNeeded() {
    return Math.ceil(folderSize(this.#dataDir) * 1.1)
  }

  /** Copies the data folder; the copy exists under its final name only once it is complete. */
  async take() {
    await rm(this.#partialDir, { recursive: true, force: true })
    await cp(this.#dataDir, this.#partialDir, { recursive: true, verbatimSymlinks: true, preserveTimestamps: true })
    await rename(this.#partialDir, this.#copyDir)
  }

  /** Puts the data folder back as copied. Repeatable: it clears the folder's contents, then copies. */
  restore() {
    for (const name of readdirSync(this.#dataDir)) rmSync(path.join(this.#dataDir, name), { recursive: true, force: true })
    cpSync(this.#copyDir, this.#dataDir, { recursive: true, verbatimSymlinks: true, preserveTimestamps: true })
  }

  delete() {
    rmSync(this.#partialDir, { recursive: true, force: true })
    rmSync(this.#copyDir, { recursive: true, force: true })
  }
}
