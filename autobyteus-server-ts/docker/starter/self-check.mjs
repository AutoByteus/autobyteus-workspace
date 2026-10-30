// A candidate package is started once on loopback, in an environment of its own, before the node's
// server is stopped: it must answer its health check within the limit. It is a separate process,
// not the node's server, and touches nothing of the node:
//   <server-packages>/self-check-<random>/ holding data/ (with its own .env), workspace/ and home/;
//   an environment built from scratch: PATH, NODE_ENV, HOME and AUTOBYTEUS_TEMP_WORKSPACE_DIR only
//   (no inherited AUTOBYTEUS_* variable, no starter socket);
//   host 127.0.0.1 and a free port.
// The folder is deleted afterwards, whatever the result.
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { freePort, spawnServer, stopServer, waitForHealth } from './server-process.mjs'
import { fail } from './update-error.mjs'

export class SelfCheck {
  #packagesRoot
  #timeoutMs
  #stopMs
  #log

  constructor({ packagesRoot, timeoutMs, stopMs, log }) {
    this.#packagesRoot = packagesRoot
    this.#timeoutMs = timeoutMs
    this.#stopMs = stopMs
    this.#log = log
  }

  /** Resolves when the candidate answered its health check; throws SELF_CHECK_FAILED otherwise. */
  async run(serverPackage, signal) {
    const folder = path.join(this.#packagesRoot, `self-check-${randomBytes(6).toString('hex')}`)
    const dataDir = path.join(folder, 'data')
    for (const dir of [dataDir, path.join(folder, 'workspace'), path.join(folder, 'home')]) mkdirSync(dir, { recursive: true })
    const port = await freePort()
    writeFileSync(path.join(dataDir, '.env'),
      `APP_ENV=production\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}\nDB_TYPE=sqlite\nLOG_LEVEL=INFO\n`)
    const env = {
      PATH: process.env.PATH,
      NODE_ENV: 'production',
      HOME: path.join(folder, 'home'),
      AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(folder, 'workspace'),
    }
    let candidate = null
    const onAbort = () => { if (candidate) void stopServer(candidate, this.#stopMs, this.#log) }
    signal?.addEventListener('abort', onAbort)
    try {
      candidate = await spawnServer({ packageDir: serverPackage.dir, host: '127.0.0.1', port, dataDir, env, stdio: 'ignore', log: this.#log })
      const healthy = await waitForHealth(port, this.#timeoutMs, candidate.exited)
      if (signal?.aborted) throw signal.reason
      if (!healthy) {
        throw fail('SELF_CHECK_FAILED',
          `The server package ${serverPackage.version} did not start: no health answer within ${this.#timeoutMs / 1000} s.`)
      }
      this.#log('self-check-passed', { version: serverPackage.version })
    } finally {
      signal?.removeEventListener('abort', onAbort)
      if (candidate) await stopServer(candidate, this.#stopMs, this.#log)
      rmSync(folder, { recursive: true, force: true })
    }
  }
}
