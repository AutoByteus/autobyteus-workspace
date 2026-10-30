// The node's update status (update.json, UpdateState) and the C2 status the starter serves.
// It is also the one owner of "which version this node is at": the version of the package the
// starter chose at boot (C2 `version`), and the server it runs (C2 `server`).
import path from 'node:path'
import { compareReleaseVersions, isReleaseVersion } from './release-version.mjs'
import { readJsonFile, writeJsonFile } from './state-file.mjs'

export const IDLE_UPDATE = Object.freeze({
  state: 'idle', targetVersion: null, step: null, code: null, message: null,
  startedAt: null, finishedAt: null, requestedFrom: null,
})

/** A `target` that is not a release version (C2 answers 400 with INVALID_VERSION). */
export class InvalidVersionError extends Error {
  code = 'INVALID_VERSION'
}

export class UpdateStatus {
  #file
  /** Set by the boot's selection, before the socket serves any status. */
  #node = null

  constructor(packagesRoot) {
    this.#file = path.join(packagesRoot, 'update.json')
  }

  /** The last update's state; fields this starter does not know are kept, missing ones are idle. */
  readUpdate() {
    return { ...IDLE_UPDATE, ...(readJsonFile(this.#file) ?? {}) }
  }

  /** Records that the update in progress ended without finishing (container stop, crash). */
  markInterrupted(message) {
    writeJsonFile(this.#file, {
      ...this.readUpdate(), state: 'failed', code: 'INTERRUPTED', message, finishedAt: new Date().toISOString(),
    })
  }

  setRunning({ version, source, pid }) {
    this.#node = { version, state: 'running', server: { pid, packageVersion: version, source }, message: null }
  }

  setNeedsNewImage({ version, message }) {
    this.#node = { version, state: 'needsNewImage', server: null, message }
  }

  /** The C2 status, with the relation of `target` to this node's version when one is given. */
  status(target) {
    const { version, state, server, message } = this.#node
    const result = { version, state }
    if (server) result.server = server
    if (target !== undefined && target !== null) {
      if (!isReleaseVersion(target)) throw new InvalidVersionError(`'${target}' is not a release version (X.Y.Z or X.Y.Z-beta.N)`)
      const order = compareReleaseVersions(target, version)
      result.target = { version: target, relation: order > 0 ? 'newer' : order === 0 ? 'same' : 'older' }
    }
    result.update = this.readUpdate()
    if (message) result.message = message
    return result
  }
}
