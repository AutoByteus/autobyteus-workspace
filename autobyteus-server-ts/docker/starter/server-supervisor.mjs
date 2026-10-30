// The one owner of the server child that runs now: it spawns it, stops it and reports its exit.
//
// Start (C4): `node <package>/dist/app.js --host --port --data-dir`, working directory the package,
// in its own process group, with AUTOBYTEUS_STARTER_SOCKET in its environment. Stop: SIGTERM to the
// server (its own shutdown is bounded), at most `stopMs`, then SIGKILL of its process group. After
// every exit the group is killed too, so nothing the server left behind outlives it, and a start
// first waits for the server port to be free.
//
// Mode `supervising` (DS-007): the `exited` promise that start() returns is the server's exit; its
// one awaiter (the boot) ends the starter with the server's exit code, and supervisord starts again.
import { spawn } from 'node:child_process'
import net from 'node:net'
import { constants as osConstants } from 'node:os'
import path from 'node:path'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The exit code that reports how the server ended: its own code, or 128 + the signal number. */
export function exitCodeOf({ code, signal }) {
  if (code !== null && code !== undefined) return code
  return 128 + (osConstants.signals[signal] ?? 0)
}

export class ServerSupervisor {
  #host
  #port
  #dataDir
  #socketPath
  #stopMs
  #portFreeMs
  #log
  #child = null

  constructor({ host, port, dataDir, socketPath, stopMs, portFreeMs, log }) {
    this.#host = host
    this.#port = port
    this.#dataDir = dataDir
    this.#socketPath = socketPath
    this.#stopMs = stopMs
    this.#portFreeMs = portFreeMs
    this.#log = log
  }

  /** Starts a package's server. Resolves once it is spawned, with its pid and its `exited` promise. */
  async start(serverPackage) {
    if (this.#child) throw new Error('A server is already running')
    await this.#waitForFreePort()
    const child = spawn(process.execPath, [
      path.join(serverPackage.dir, 'dist', 'app.js'),
      '--host', this.#host, '--port', String(this.#port), '--data-dir', this.#dataDir,
    ], {
      cwd: serverPackage.dir,
      detached: true,
      stdio: 'inherit',
      env: { ...process.env, AUTOBYTEUS_STARTER_SOCKET: this.#socketPath },
    })
    const exited = new Promise((resolve) => {
      child.once('exit', (code, signal) => {
        this.#killGroup(child.pid)
        this.#child = null
        this.#log('server-exited', { pid: child.pid, version: serverPackage.version, code, signal })
        resolve({ code, signal })
      })
    })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', reject)
    })
    this.#child = { process: child, exited }
    this.#log('server-started', { pid: child.pid, version: serverPackage.version, source: serverPackage.source })
    return { pid: child.pid, exited }
  }

  /** Stops the running server: SIGTERM, then after `stopMs` SIGKILL of its group. */
  async stop() {
    const running = this.#child
    if (!running) return { forced: false }
    running.process.kill('SIGTERM')
    let timer
    const limit = new Promise((resolve) => { timer = setTimeout(() => resolve('limit'), this.#stopMs) })
    const outcome = await Promise.race([running.exited.then(() => 'exited'), limit])
    clearTimeout(timer)
    if (outcome === 'limit') {
      this.#log('server-stop-timeout', { pid: running.process.pid, limitMs: this.#stopMs })
      this.#killGroup(running.process.pid)
      await running.exited
    }
    return { forced: outcome === 'limit' }
  }

  #killGroup(pid) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if (error.code !== 'ESRCH') this.#log('server-group-kill-failed', { pid, error: error.code })
    }
  }

  async #waitForFreePort() {
    const deadline = Date.now() + this.#portFreeMs
    while (await this.#portInUse()) {
      if (Date.now() >= deadline) {
        this.#log('server-port-still-in-use', { port: this.#port, waitedMs: this.#portFreeMs })
        return
      }
      await sleep(250)
    }
  }

  #portInUse() {
    return new Promise((resolve) => {
      const socket = net.connect({ host: '127.0.0.1', port: this.#port })
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => resolve(false))
    })
  }
}
