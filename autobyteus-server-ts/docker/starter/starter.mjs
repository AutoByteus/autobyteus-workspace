#!/usr/bin/env node
// The starter: the program supervisord runs in a Docker node. It runs the node's server package and
// replaces it on request (UpdateService, UpdateRun).
//
// Boot (DS-003), in order:
//   1. recovery: an update trial that a container stop or crash interrupted is rolled back (the data
//      copy restored when one was taken), and the update is recorded as failed: INTERRUPTED;
//   2. cleanup: leftovers of an interrupted download, unpack, self-check or data copy are removed,
//      and every installed package other than the current and the previous one;
//   3. selection (PackageStore.choose): run the installed or the built-in package, or NEEDS_NEW_IMAGE;
//   4. start (ServerSupervisor) or refuse: on NEEDS_NEW_IMAGE no server runs and the starter stays up,
//      serving its status, so supervisord does not restart it in a loop;
//   5. the socket (C2) serves the status and update requests.
// Then it supervises (DS-007): a server exit outside an update's switch aborts an update that has not
// reached its point of no return and ends the starter with the server's exit code (supervisord starts
// it again). SIGTERM or SIGINT aborts such an update too, stops the server and ends the starter with 0;
// past the point of no return the boot recovery of the next start finishes the job.
import { pathToFileURL } from 'node:url'
import { DataCopy } from './data-copy.mjs'
import { PackageStore } from './package-store.mjs'
import { PackageVerifier } from './package-verifier.mjs'
import { ReleaseSource } from './release-source.mjs'
import { SelfCheck } from './self-check.mjs'
import { exitCodeOf } from './server-process.mjs'
import { ServerSupervisor } from './server-supervisor.mjs'
import { starterLog } from './starter-log.mjs'
import { RELEASE_SOURCE_BASE, STARTER_LIMITS, STARTER_PATHS } from './starter-paths.mjs'
import { StarterSocket } from './starter-socket.mjs'
import { freeBytes, readSystemFacts } from './system-facts.mjs'
import { UpdateService } from './update-service.mjs'
import { UpdateStatus } from './update-status.mjs'

export class NodeStarter {
  #paths
  #limits
  #releaseSourceBase
  #log
  #exit
  #store
  #dataCopy
  #updateStatus
  #supervisor
  #updateService = null
  #socket = null
  #stopping = false

  constructor({ paths, limits, server, releaseSourceBase, log = starterLog, exit = (code) => process.exit(code) }) {
    this.#paths = paths
    this.#limits = limits
    this.#releaseSourceBase = releaseSourceBase
    this.#log = log
    this.#exit = exit
    this.#store = new PackageStore({ root: paths.packagesRoot, builtInDir: paths.builtInPackage, log })
    this.#dataCopy = new DataCopy({ packagesRoot: paths.packagesRoot, dataDir: server.dataDir })
    this.#updateStatus = new UpdateStatus(paths.packagesRoot)
    this.#supervisor = new ServerSupervisor({ ...server, socketPath: paths.socket, stopMs: limits.stopMs, portFreeMs: limits.portFreeMs, log })
  }

  async run() {
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void this.stop(signal) })
    this.#recoverAndClean()
    const facts = readSystemFacts(this.#paths.systemLevelFile)
    this.#updateService = new UpdateService({
      releaseSource: new ReleaseSource({ base: this.#releaseSourceBase }),
      verifier: new PackageVerifier({ publicKeyFile: this.#paths.publicKey }),
      selfCheck: new SelfCheck({ packagesRoot: this.#paths.packagesRoot, timeoutMs: this.#limits.selfCheckMs, stopMs: this.#limits.stopMs, log: this.#log }),
      store: this.#store,
      supervisor: this.#supervisor,
      dataCopy: this.#dataCopy,
      updateStatus: this.#updateStatus,
      facts,
      limits: this.#limits,
      freeBytes: () => freeBytes(this.#paths.packagesRoot),
      log: this.#log,
    }, { packagesRoot: this.#paths.packagesRoot, mountinfo: this.#paths.mountinfo })
    this.#socket = new StarterSocket({ socketPath: this.#paths.socket, updateService: this.#updateService })

    const choice = this.#store.choose(facts)
    if (choice.outcome === 'needsNewImage') {
      this.#updateStatus.setNeedsNewImage({ version: choice.newest, message: choice.message })
      await this.#socket.listen()
      this.#log('needs-new-image', { code: 'NEEDS_NEW_IMAGE', message: choice.message })
      return
    }
    const { pid } = await this.#supervisor.start(choice.package)
    this.#updateStatus.setRunning({ version: choice.package.version, source: choice.package.source, pid })
    await this.#socket.listen()
    const ended = await this.#supervisor.supervisedExit
    if (this.#stopping) return
    await this.#updateService.abort('SERVER_EXITED_DURING_UPDATE',
      'The server stopped by itself during the update; nothing was changed, and supervisord starts it again.')
    await this.#socket.close()
    this.#exit(exitCodeOf(ended))
  }

  async stop(signal) {
    if (this.#stopping) return
    this.#stopping = true
    this.#log('stopping', { signal })
    await this.#updateService?.stopRun('INTERRUPTED', 'The starter was stopped during the update; nothing was changed.')
    await this.#supervisor.shutdown()
    await this.#socket?.close()
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
    // An update stopped after its download keeps a package nothing refers to (DEC-013 keeps two).
    this.#store.deleteOthers()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env
  const starter = new NodeStarter({
    paths: STARTER_PATHS,
    limits: STARTER_LIMITS,
    releaseSourceBase: env.AUTOBYTEUS_SERVER_PACKAGE_SOURCE || RELEASE_SOURCE_BASE,
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
