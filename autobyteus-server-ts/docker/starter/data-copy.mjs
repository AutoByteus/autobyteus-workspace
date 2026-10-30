// The copy of the node's data folder an update takes before it starts a version that brings data
// migrations (DEC-005), kept at <server-packages>/data-copy/ in the node's own volume because it
// holds the vault. Boot recovery restores it after an interrupted trial and then deletes it.
import { cpSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

export class DataCopy {
  #copyDir
  #dataDir

  constructor({ packagesRoot, dataDir }) {
    this.#copyDir = path.join(packagesRoot, 'data-copy')
    this.#dataDir = dataDir
  }

  /** Puts the data folder back as copied. Repeatable: it clears the folder's contents, then copies. */
  restore() {
    for (const name of readdirSync(this.#dataDir)) rmSync(path.join(this.#dataDir, name), { recursive: true, force: true })
    cpSync(this.#copyDir, this.#dataDir, { recursive: true, verbatimSymlinks: true, preserveTimestamps: true })
  }

  delete() {
    rmSync(this.#copyDir, { recursive: true, force: true })
  }
}
