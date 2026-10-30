#!/usr/bin/env node
// The starter: the program supervisord runs in a Docker node. It runs the node's server package and
// (from a later build step) replaces it on request.
//
// Boot (DS-003), in order:
//   1. recovery: an update trial that a container stop or crash interrupted is rolled back (the data
//      copy restored when one was taken), and the update is recorded as failed: INTERRUPTED;
//   2. cleanup: leftovers of an interrupted download, unpack, self-check or data copy are removed;
//   3. selection (PackageStore.choose): run the installed or the built-in package, or NEEDS_NEW_IMAGE;
//   4. start (ServerSupervisor) or refuse: on NEEDS_NEW_IMAGE no server runs and the starter stays up,
//      serving its status, so supervisord does not restart it in a loop;
//   5. the socket (C2) serves the status.
// Then it supervises: the server's exit ends the starter with the server's exit code (supervisord
// starts it again); SIGTERM or SIGINT stops the server and ends the starter with 0.
import { pathToFileURL } from 'node:url'
import { DataCopy } from './data-copy.mjs'
import { PackageStore } from './package-store.mjs'
import { exitCodeOf, ServerSupervisor } from './server-supervisor.mjs'
import { starterLog } from './starter-log.mjs'
import { STARTER_LIMITS, STARTER_PATHS } from './starter-paths.mjs'
import { StarterSocket } from './starter-socket.mjs'
import { readSystemFacts } from './system-facts.mjs'
import { UpdateStatus } from './update-status.mjs'

export class NodeStarter {
  #paths
  #log
  #exit
  #store
  #dataCopy
  #updateStatus
  #supervisor
  #socket
  #stopping = false

  constructor({ paths, limits, server, log = starterLog, exit = (code) => process.exit(code) }) {
    this.#paths = paths
    this.#log = log
    this.#exit = exit
    this.#store = new PackageStore({ root: paths.packagesRoot, builtInDir: paths.builtInPackage, log })
    this.#dataCopy = new DataCopy({ packagesRoot: paths.packagesRoot, dataDir: server.dataDir })
    this.#updateStatus = new UpdateStatus(paths.packagesRoot)
    this.#supervisor = new ServerSupervisor({ ...server, socketPath: paths.socket, ...limits, log })
    this.#socket = new StarterSocket({ socketPath: paths.socket, updateStatus: this.#updateStatus })
  }

  async run() {
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void this.stop(signal) })
    this.#recoverAndClean()
    const choice = this.#store.choose(readSystemFacts(this.#paths.systemLevelFile))
    if (choice.outcome === 'needsNewImage') {
      this.#updateStatus.setNeedsNewImage({ version: choice.newest, message: choice.message })
      await this.#socket.listen()
      this.#log('needs-new-image', { code: 'NEEDS_NEW_IMAGE', message: choice.message })
      return
    }
    const { pid, exited } = await this.#supervisor.start(choice.package)
    this.#updateStatus.setRunning({ version: choice.package.version, source: choice.package.source, pid })
    await this.#socket.listen()
    const ended = await exited
    if (this.#stopping) return
    await this.#socket.close()
    this.#exit(exitCodeOf(ended))
  }

  async stop(signal) {
    if (this.#stopping) return
    this.#stopping = true
    this.#log('stopping', { signal })
    await this.#supervisor.stop()
    await this.#socket.close()
    this.#exit(0)
  }

  #recoverAndClean() {
    const { trial } = this.#store.readState()
    if (trial) {
      if (trial.dataCopy) this.#dataCopy.restore()
      this.#store.rollBackTrial()
      this.#updateStatus.markInterrupted(
        `The update to ${trial.version} was interrupted; this node runs ${trial.previous.version} again.`)
      this.#log('trial-rolled-back', { version: trial.version, previous: trial.previous.version, dataRestored: Boolean(trial.dataCopy) })
    } else if (this.#updateStatus.readUpdate().state === 'running') {
      this.#updateStatus.markInterrupted('The update was interrupted before the switch; nothing changed on this node.')
    }
    this.#dataCopy.delete()
    this.#store.removeLeftovers()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env
  const starter = new NodeStarter({
    paths: STARTER_PATHS,
    limits: STARTER_LIMITS,
    server: {
      host: env.AUTOBYTEUS_BIND_HOST || '0.0.0.0',
      port: Number(env.AUTOBYTEUS_SERVER_PORT || 8000),
      dataDir: env.AUTOBYTEUS_DATA_DIR || '/home/autobyteus/data',
    },
  })
  starter.run().catch((error) => {
    starterLog('failed', { message: error.message })
    process.exit(1)
  })
}
