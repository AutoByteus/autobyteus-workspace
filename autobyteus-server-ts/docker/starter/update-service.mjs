// The single entry for update requests, from the server (C1 → C2) and from the host command
// (cli.mjs → C2) alike. It owns the gates, the request log line and one UpdateRun at a time.
//
// Gates, in order, each an explicit refusal:
//   a version in the release grammar, or a track (`stable`, `beta`), but not both  INVALID_VERSION
//   this node's own blocker (also reported in the status as `updateBlocker`):
//     the server-packages folder is not its own volume                             NO_PACKAGES_VOLUME
//     no server runs because this image is too old for the node                     NEEDS_NEW_IMAGE
//   no update is running                                                            UPDATE_RUNNING
//   the track resolves to a version (network)                                       DOWNLOAD_FAILED
//   the version is newer than the node's                                            NOT_NEWER
import { compareReleaseVersions, isReleaseVersion } from './release-version.mjs'
import { isOwnMount } from './system-facts.mjs'
import { refuse, UpdateError } from './update-error.mjs'
import { UpdateRun } from './update-run.mjs'

const TRACKS = new Set(['stable', 'beta'])

export class UpdateService {
  #deps
  #packagesRoot
  #mountinfo
  #run = null

  constructor(deps, { packagesRoot, mountinfo }) {
    this.#deps = deps
    this.#packagesRoot = packagesRoot
    this.#mountinfo = mountinfo
  }

  /** Why this node refuses any update now, or null. The status reports the same answer. */
  nodeBlocker() {
    if (!isOwnMount(this.#packagesRoot, this.#mountinfo)) {
      return {
        code: 'NO_PACKAGES_VOLUME',
        message: `${this.#packagesRoot} is not this node's own volume, so an update would be lost when the container ` +
          'is recreated. Reinstall the launcher, then run: autobyteus-docker upgrade --all',
      }
    }
    if (this.#deps.updateStatus.needsNewImage) {
      return { code: 'NEEDS_NEW_IMAGE', message: this.#deps.updateStatus.status().message }
    }
    return null
  }

  /** The C2 status (UpdateStatus) with this node's update blocker. */
  status(target) {
    return this.#deps.updateStatus.status(target, this.nodeBlocker() ?? undefined)
  }

  /** { accepted: true, version } when an update starts, or { refused: code, message }. */
  async request({ version, track, requestedFrom }) {
    const { releaseSource, updateStatus, log } = this.#deps
    log('update-requested', { version, track, requestedFrom })
    try {
      if ((version === undefined) === (track === undefined)) {
        throw refuse('INVALID_VERSION', 'Name exactly one of a version or a track.')
      }
      if (version !== undefined && !isReleaseVersion(version)) {
        throw refuse('INVALID_VERSION', `'${version}' is not a release version (X.Y.Z or X.Y.Z-beta.N).`)
      }
      if (track !== undefined && !TRACKS.has(track)) throw refuse('INVALID_VERSION', `'${track}' is not a track (stable or beta).`)
      const blocker = this.nodeBlocker()
      if (blocker) throw refuse(blocker.code, blocker.message)
      if (this.#run) throw refuse('UPDATE_RUNNING', `An update to ${this.#run.version} is running.`)
      const target = version ?? await releaseSource.resolveTrack(track)
      if (this.#run) throw refuse('UPDATE_RUNNING', `An update to ${this.#run.version} is running.`)
      if (compareReleaseVersions(target, updateStatus.nodeVersion) <= 0) {
        throw refuse('NOT_NEWER', `This node runs ${updateStatus.nodeVersion}; ${target} is not newer.`)
      }
      const run = new UpdateRun(this.#deps, { version: target, requestedFrom })
      this.#run = run
      void run.start().finally(() => { if (this.#run === run) this.#run = null })
      return { accepted: true, version: target }
    } catch (error) {
      if (!(error instanceof UpdateError)) throw error
      log('update-refused', { code: error.code, message: error.message, requestedFrom })
      return { refused: error.code, message: error.message }
    }
  }

  /**
   * The starter is stopping: a running update is aborted before its point of no return (it removes its
   * files and records `code`), and halted after it (the next boot finishes the job).
   */
  async stopRun(code, message) {
    const run = this.#run
    if (run && !(await run.abort(code, message))) run.halt()
  }

  /** Ends a running update before its point of no return (see UpdateRun.abort); false otherwise. */
  async abort(code, message) {
    return this.#run ? this.#run.abort(code, message) : false
  }
}
