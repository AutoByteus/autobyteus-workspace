// The one owner of the node's server child that runs now: it spawns it, stops it and reports its exit.
//
// Start (C4): the package's server in its own process group, with AUTOBYTEUS_STARTER_SOCKET in its
// environment, after the server port is free. Stop: SIGTERM, at most `stopMs`, then SIGKILL of the
// group. After every exit the group is killed too, so nothing the server left behind outlives it.
//
// Modes (DS-007), one awaiter of an exit at a time:
//   supervising  an exit resolves `supervisedExit`; the boot awaits it and ends the starter with the
//                server's exit code (supervisord starts it again);
//   updating     between beginUpdate() and endUpdate() an exit is only a step result: UpdateRun
//                awaits the `exited` promise start() returned.
import { portInUse, sleep, spawnServer, stopServer } from './server-process.mjs'

export class ServerSupervisor {
  #host
  #port
  #dataDir
  #socketPath
  #stopMs
  #portFreeMs
  #log
  #mode = 'supervising'
  #child = null
  #lastExit = null
  #closed = false
  #resolveSupervisedExit
  /** Resolves with { code, signal } when the server exits while supervising. */
  supervisedExit = new Promise((resolve) => { this.#resolveSupervisedExit = resolve })

  constructor({ host, port, dataDir, socketPath, stopMs, portFreeMs, log }) {
    this.#host = host
    this.#port = port
    this.#dataDir = dataDir
    this.#socketPath = socketPath
    this.#stopMs = stopMs
    this.#portFreeMs = portFreeMs
    this.#log = log
  }

  get port() {
    return this.#port
  }

  /** The package of the server running now, or null. */
  get running() {
    return this.#child?.serverPackage ?? null
  }

  /** Starts a package's server. Resolves once it is spawned, with its pid and its `exited` promise. */
  async start(serverPackage) {
    if (this.#closed) throw new Error('The starter is stopping; no server is started')
    if (this.#child) throw new Error('A server is already running')
    await this.#waitForFreePort()
    const child = await spawnServer({
      packageDir: serverPackage.dir, host: this.#host, port: this.#port, dataDir: this.#dataDir,
      env: { ...process.env, AUTOBYTEUS_STARTER_SOCKET: this.#socketPath }, log: this.#log,
    })
    const pid = child.process.pid
    const exited = child.exited.then((ended) => {
      if (this.#child?.process === child.process) this.#child = null
      this.#lastExit = ended
      this.#log('server-exited', { pid, version: serverPackage.version, ...ended })
      if (this.#mode === 'supervising') this.#resolveSupervisedExit(ended)
      return ended
    })
    this.#child = { ...child, exited, serverPackage }
    this.#log('server-started', { pid, version: serverPackage.version, source: serverPackage.source })
    return { pid, exited }
  }

  /** Stops the running server. Resolves { forced } once it has exited. */
  async stop() {
    const running = this.#child
    if (!running) return { forced: false }
    return stopServer(running, this.#stopMs, this.#log)
  }

  /** The starter is stopping: stops the server, and no server is started from now on. */
  async shutdown() {
    this.#closed = true
    return this.stop()
  }

  /** From now on a server exit belongs to the update that called this. */
  beginUpdate() {
    this.#mode = 'updating'
  }

  /** Hands the server back to supervision; if it is already gone, supervision sees that exit now. */
  endUpdate() {
    this.#mode = 'supervising'
    if (!this.#child) this.#resolveSupervisedExit(this.#lastExit ?? { code: 1, signal: null })
  }

  async #waitForFreePort() {
    const deadline = Date.now() + this.#portFreeMs
    while (await portInUse(this.#port)) {
      if (Date.now() >= deadline) {
        this.#log('server-port-still-in-use', { port: this.#port, waitedMs: this.#portFreeMs })
        return
      }
      await sleep(250)
    }
  }
}
