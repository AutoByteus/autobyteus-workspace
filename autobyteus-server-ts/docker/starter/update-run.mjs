// One in-place update and its rollback (DS-006). It calls each mechanism itself, in this order:
//
// Before the point of no return (the old server keeps serving; a refusal or failure changes nothing):
//   description → signature and binding → fit → needsCopy → space (package, and the copy when needed)
//   → download → archive SHA-256 → unpack → package matches description → install → self-check
// From the point of no return:
//   beginUpdate → stop the old server → [space again, data copy] → beginTrial → start the new server
//   → confirm (health within the limit, then alive for a while)
//   → commit: state, delete the copy, delete other packages, endUpdate → succeeded
//   → or roll back: stop the new server, [restore the data], state, delete the copy, start the old
//     server, endUpdate → failed: FAILED_AFTER_SWITCH (the failed version is not retried by itself)
//
// Each step is written to update.json before it runs. Before the point of no return the run can be
// aborted (the old server exited by itself, or the starter is stopping); it then removes its files.
import { exitCodeOf, sleep, waitForHealth } from './server-process.mjs'
import { fail, refuse, UpdateError } from './update-error.mjs'

const GB = 1024 ** 3
const gigabytes = (bytes) => `${(bytes / GB).toFixed(2)} GB`

export class UpdateRun {
  #deps
  #version
  #requestedFrom
  #controller = new AbortController()
  #pastPointOfNoReturn = false
  #halted = false
  /** Settles when the run has ended and recorded its outcome; never rejects. */
  done = null

  constructor(deps, { version, requestedFrom }) {
    this.#deps = deps
    this.#version = version
    this.#requestedFrom = requestedFrom
  }

  get version() {
    return this.#version
  }

  start() {
    this.done = this.#run()
    return this.done
  }

  /**
   * Ends the run before the point of no return with `code` (failed). Resolves true once it has cleaned
   * up, or false when the run is already past the point of no return (it then goes on).
   */
  async abort(code, message) {
    if (this.#pastPointOfNoReturn) return false
    this.#controller.abort(fail(code, message))
    await this.done
    return true
  }

  /**
   * The starter is stopping past the point of no return: the run takes no further step. A recorded
   * trial stays in state.json, and the next boot rolls it back (DS-007).
   */
  halt() {
    this.#halted = true
  }

  #checkAborted() {
    const { signal } = this.#controller
    if (signal.aborted) throw signal.reason
  }

  async #run() {
    const { updateStatus, log } = this.#deps
    updateStatus.startUpdate({ targetVersion: this.#version, requestedFrom: this.#requestedFrom })
    log('update-started', { version: this.#version, requestedFrom: this.#requestedFrom })
    let prepared
    try {
      prepared = await this.#prepare()
    } catch (error) {
      this.#removeFiles()
      return this.#finish(error)
    }
    this.#pastPointOfNoReturn = true
    // An error here comes from the rollback itself: a recorded trial stays in state.json, and the
    // next boot rolls it back.
    return this.#switch(prepared).catch((error) => this.#finish(error))
  }

  async #prepare() {
    const { releaseSource, verifier, store, selfCheck, supervisor, dataCopy, updateStatus, facts, limits, freeBytes } = this.#deps
    const { signal } = this.#controller
    const version = this.#version
    const signed = await releaseSource.fetchDescription(version, facts.arch, signal)
    const description = verifier.verifyDescription(signed, version, facts.arch)
    verifier.checkFit(description, facts)
    const running = supervisor.running
    const needsCopy = dataCopy.needsCopy(description, running.packageJson)
    const needed = description.archive.size + description.archive.unpackedSize + limits.spareBytes
      + (needsCopy ? dataCopy.bytesNeeded() + limits.spareBytes : 0)
    const free = freeBytes()
    if (free < needed) {
      throw refuse('NOT_ENOUGH_SPACE', `The update to ${version} needs ${gigabytes(needed)} free on the server-packages ` +
        `volume${needsCopy ? ' (the package and a copy of the data folder)' : ''}; ${gigabytes(free)} is free.`)
    }
    this.#checkAborted()

    updateStatus.setStep('downloading')
    const archiveFile = store.downloadPath(description.archive.name)
    await releaseSource.downloadArchive(version, description.archive, archiveFile, signal)
    await verifier.verifyArchive(archiveFile, description)
    this.#checkAborted()

    updateStatus.setStep('preparing')
    const partial = await store.unpack(archiveFile, version)
    store.removeDownload(description.archive.name)
    verifier.matchPackage(partial, description)
    const { archive, ...packageJson } = description
    const serverPackage = store.install(partial, version, packageJson)
    this.#checkAborted()
    await selfCheck.run(serverPackage, signal)
    this.#checkAborted()
    return { serverPackage, needsCopy, old: running, archiveName: archive.name }
  }

  async #switch({ serverPackage, needsCopy, old }) {
    const { store, supervisor, dataCopy, updateStatus, limits, freeBytes, log } = this.#deps
    const version = this.#version
    updateStatus.setStep('restarting')
    supervisor.beginUpdate()
    const { forced } = await supervisor.stop()
    if (forced) log('update-stop-timeout', { code: 'STOP_TIMEOUT', version: old.version })

    let trialStarted = false
    try {
      if (needsCopy) {
        if (freeBytes() < dataCopy.bytesNeeded() + limits.spareBytes) {
          throw fail('NOT_ENOUGH_SPACE', `The data folder no longer fits on the server-packages volume; ${old.version} runs again.`)
        }
        await dataCopy.take()
      }
      store.beginTrial({ version, previous: { source: old.source, version: old.version }, dataCopy: needsCopy })
      trialStarted = true
      const trial = await supervisor.start(serverPackage)
      updateStatus.setRunning({ version, source: serverPackage.source, pid: trial.pid })
      updateStatus.setStep('confirming')
      let ended = null
      trial.exited.then((exit) => { ended = exit })
      const healthy = await waitForHealth(supervisor.port, limits.confirmHealthMs, trial.exited)
      const stayed = healthy && await Promise.race([trial.exited.then(() => false), sleep(limits.confirmAliveMs).then(() => true)])
      if (!stayed) {
        const how = ended
          ? `it exited with code ${exitCodeOf(ended)} ${healthy ? `within ${limits.confirmAliveMs / 1000} s of answering` : 'before answering its health check'}`
          : `no health answer within ${limits.confirmHealthMs / 1000} s`
        throw fail('FAILED_AFTER_SWITCH', `${version} did not come up (${how}); ` +
          `${old.version} runs again${needsCopy ? ' on the data as it was before the update' : ''}.`)
      }
      store.commitTrial()
      dataCopy.delete()
      store.deleteOthers()
      supervisor.endUpdate()
      return this.#finish(null, `Updated to ${version}.${forced ? ` (${old.version} did not stop in time and was stopped by force.)` : ''}`)
    } catch (error) {
      if (this.#halted) return undefined
      updateStatus.setStep('rollingBack')
      await supervisor.stop()
      if (this.#halted) return undefined
      if (trialStarted) {
        if (needsCopy) dataCopy.restore()
        store.rollBackTrial()
      }
      dataCopy.delete()
      store.discard(version)
      // Stopping now leaves nothing to undo: the next boot starts the old version.
      if (!this.#halted) {
        const restarted = await supervisor.start(old)
        updateStatus.setRunning({ version: old.version, source: old.source, pid: restarted.pid })
      }
      supervisor.endUpdate()
      return this.#finish(error instanceof UpdateError ? error
        : fail('FAILED_AFTER_SWITCH', `${version} could not be switched to (${error.message}); ${old.version} runs again.`))
    }
  }

  /** Removes what this run downloaded and unpacked before the point of no return. */
  #removeFiles() {
    const { store } = this.#deps
    store.removeLeftovers()
    store.discard(this.#version)
  }

  #finish(error, successMessage) {
    const { updateStatus, log } = this.#deps
    if (!error) {
      updateStatus.finishUpdate({ state: 'succeeded', message: successMessage })
      log('update-succeeded', { version: this.#version })
      return
    }
    const known = error instanceof UpdateError
    const outcome = known ? error.outcome : 'failed'
    const code = known ? error.code : null
    updateStatus.finishUpdate({ state: outcome, code, message: error.message })
    log(`update-${outcome}`, { version: this.#version, code, message: error.message })
  }
}
