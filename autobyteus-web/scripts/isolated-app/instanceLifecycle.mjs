import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AppExecutableNotFoundError,
  AppImageExtractionRequiredError,
  AppIsolationUnsupportedError,
  discoverWorktreeExecutable,
  readIsolatedLaunchContract,
  resolveExplicitExecutable,
  resolveInstalledExecutable,
} from '../electron-launch/appExecutable.mjs'
import { buildIsolatedLaunchEnvironment } from '../electron-launch/launchEnvironment.mjs'
import {
  assertValidListenerPort,
  isPortAvailable,
  selectListenerPort,
} from '../electron-launch/launchPorts.mjs'
import { createPosixProcessGroupController } from '../electron-launch/processGroupControl.mjs'
import { createInstanceRegistry, INSTANCE_RECORD_SCHEMA_VERSION } from './instanceRegistry.mjs'
import {
  buildInstanceArgs,
  isRecordedInstanceRunning,
  readLogTail,
  spawnDetachedInstance,
  waitForInstanceReady,
} from './instanceProcess.mjs'
import { environmentError, operationError, usageError } from './isolatedAppErrors.mjs'

export const AUTO_DATA_ROOT_PREFIX = 'autobyteus-isolated-root-'
const AUTO_CONTROL_PORT_ATTEMPTS = 10

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const defaultWebRoot = path.resolve(moduleDir, '..', '..')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function describeError(error) {
  return error instanceof Error ? error.message : String(error)
}

function buildCommandForPlatform(platform) {
  if (platform === 'darwin') return 'build:electron:mac'
  if (platform === 'linux') return 'build:electron:linux'
  throw environmentError('UNSUPPORTED_PLATFORM', `Isolated app lifecycle supports macOS and Linux, not ${platform}`)
}

function runBuild({ webRoot, platform, sourceEnv, spawnProcess = spawn }) {
  const script = buildCommandForPlatform(platform)
  const env = { ...sourceEnv }
  delete env.ELECTRON_RUN_AS_NODE
  return new Promise((resolve, reject) => {
    // Build output goes to stderr so stdout stays one JSON value.
    const child = spawnProcess('pnpm', [script], { cwd: webRoot, env, stdio: ['ignore', 2, 2] })
    child.once('error', (error) => reject(environmentError('BUILD_FAILED', `Could not run pnpm ${script}: ${error.message}`)))
    child.once('close', (code) => {
      if (code === 0) resolve()
      else reject(environmentError('BUILD_FAILED', `pnpm ${script} failed with exit code ${code} in ${webRoot}`))
    })
  })
}

/** Instance facts derived from a record, as returned to callers. */
export function describeInstance(record) {
  const backendUrl = `http://127.0.0.1:${record.serverPort}`
  return {
    instanceId: record.id,
    pid: record.pid,
    executablePath: record.executablePath,
    backendUrl,
    graphqlUrl: `${backendUrl}/graphql`,
    controlEndpoint: `http://127.0.0.1:${record.controlPort}`,
    controlPort: record.controlPort,
    serverPort: record.serverPort,
    dataRoot: record.dataRoot,
    ownsDataRoot: record.ownsDataRoot,
    keepDataRoot: record.keepDataRoot,
    databaseUrl: `file:${path.join(record.dataRoot, 'server-data', 'db', 'production.db')}`,
    logPath: record.logPath,
  }
}

/**
 * Owner of isolated-instance lifecycles across CLI invocations: start, list, stop and restart.
 * It knows nothing about pages, helpers or recordings.
 */
export function createInstanceLifecycle({
  registry = createInstanceRegistry(),
  sourceEnv = process.env,
  platform = process.platform,
  webRoot = defaultWebRoot,
  tmpDir = os.tmpdir(),
  readinessTimeoutMs = 120_000,
  stopTimeouts = { gracefulTimeoutMs: 10_000, forceTimeoutMs: 5_000 },
  processDeps = {},
} = {}) {
  const spawnInstance = processDeps.spawnDetachedInstance ?? spawnDetachedInstance
  const waitReady = processDeps.waitForInstanceReady ?? waitForInstanceReady
  const isRunning = processDeps.isRecordedInstanceRunning ?? isRecordedInstanceRunning
  const createGroupController = processDeps.createProcessGroupController ?? createPosixProcessGroupController
  const portAvailable = processDeps.isPortAvailable ?? isPortAvailable
  const pickListenerPort = processDeps.selectListenerPort ?? selectListenerPort
  const build = processDeps.runBuild ?? runBuild
  const isolationGate = processDeps.readIsolatedLaunchContract ?? readIsolatedLaunchContract

  if (platform === 'win32') {
    throw environmentError('UNSUPPORTED_PLATFORM', 'Isolated app lifecycle supports macOS and Linux only')
  }

  async function resolveExecutable({ app, fromWorktree }) {
    try {
      if (app) return await resolveExplicitExecutable(app)
      if (fromWorktree) return await discoverWorktreeExecutable({ webRoot, platform })
      const installed = await resolveInstalledExecutable({ platform })
      if (installed) return installed
    } catch (error) {
      if (error instanceof AppExecutableNotFoundError) throw environmentError('APP_NOT_FOUND', error.message)
      throw error
    }
    throw environmentError(
      'APP_NOT_FOUND',
      platform === 'darwin'
        ? 'AutoByteus.app is not installed in /Applications or ~/Applications; pass --app <path> or --from-worktree'
        : 'No installed AutoByteus location is standard on this platform; pass --app <path> or --from-worktree',
    )
  }

  /** Refuse app builds that cannot honor an isolated launch (before any port, root or spawn work). */
  async function assertIsolatedLaunchSupported(executablePath) {
    try {
      await isolationGate(executablePath)
    } catch (error) {
      if (error instanceof AppImageExtractionRequiredError) throw usageError(error.code, error.message)
      if (error instanceof AppIsolationUnsupportedError) {
        throw environmentError(error.code, error.message, { executablePath })
      }
      throw error
    }
  }

  async function assertControlPortFree(controlPort) {
    if (await portAvailable(controlPort)) return
    const owner = registry.findByControlPort(controlPort)
    throw environmentError(
      'CONTROL_PORT_IN_USE',
      owner
        ? `Control port ${controlPort} is used by isolated instance ${owner.id}; omit --control-port to use a free port, or pass another port`
        : `Control port ${controlPort} is already in use; omit --control-port to use a free port, or pass another port`,
      owner ? { instanceId: owner.id } : undefined,
    )
  }

  /**
   * Pick a free control port (no fixed default, so parallel instances never share one). A
   * candidate is accepted only when it is also free on loopback, where Chromium binds CDP.
   * An explicitly requested server port is excluded.
   */
  async function selectAutoControlPort(serverPort) {
    const exclude = serverPort === undefined ? [] : [serverPort]
    for (let attempt = 0; attempt < AUTO_CONTROL_PORT_ATTEMPTS; attempt += 1) {
      const candidate = await pickListenerPort(undefined, { exclude })
      if (await portAvailable(candidate)) return candidate
    }
    throw environmentError(
      'CONTROL_PORT_IN_USE',
      `Could not find a free control port after ${AUTO_CONTROL_PORT_ATTEMPTS} attempts; pass --control-port <n>`,
    )
  }

  async function selectServerPort(requestedPort, controlPort) {
    if (requestedPort === controlPort) {
      throw usageError('USAGE_ERROR', '--server-port must differ from the control port')
    }
    if (requestedPort === undefined) {
      return pickListenerPort(undefined, { exclude: [controlPort] })
    }
    try {
      assertValidListenerPort(requestedPort, '--server-port')
    } catch (error) {
      throw usageError('USAGE_ERROR', describeError(error))
    }
    if (!(await portAvailable(requestedPort))) {
      throw environmentError('SERVER_PORT_IN_USE', `Server port ${requestedPort} is already in use`)
    }
    return requestedPort
  }

  function resolveCallerDataRoot(dataRoot) {
    let stat
    try {
      stat = fs.lstatSync(dataRoot)
    } catch {
      throw usageError('DATA_ROOT_INVALID', `Data root must be an existing directory: ${dataRoot}`)
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw usageError('DATA_ROOT_INVALID', `Data root must be a directory (not a symbolic link): ${dataRoot}`)
    }
    return fs.realpathSync(dataRoot)
  }

  function createAutoDataRoot() {
    const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpDir), AUTO_DATA_ROOT_PREFIX))
    fs.chmodSync(root, 0o700)
    return root
  }

  function disposeDataRoot(record, keep) {
    if (!record.ownsDataRoot || keep) return false
    fs.rmSync(record.dataRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    return true
  }

  async function closeGroup(pid) {
    return createGroupController(pid).closeAndConfirmTree(stopTimeouts)
  }

  /**
   * Spawn and await readiness for a fully planned record. On failure the process group is closed;
   * `onFailure` decides what happens to the record and data root.
   */
  async function launchRecord(plan, { onFailure }) {
    const logPath = registry.logPath(plan.id)
    const args = buildInstanceArgs({ instanceId: plan.id, controlPort: plan.controlPort })
    const env = buildIsolatedLaunchEnvironment({
      sourceEnv,
      launch: { port: plan.serverPort, dataRoot: plan.dataRoot },
    })
    fs.mkdirSync(registry.dir, { recursive: true, mode: 0o700 })

    let pid
    try {
      pid = await spawnInstance({ executablePath: plan.executablePath, args, env, logPath })
    } catch (error) {
      onFailure(null)
      throw environmentError('APP_LAUNCH_FAILED', `Could not start ${plan.executablePath}: ${describeError(error)}`)
    }

    const record = registry.write({
      schemaVersion: INSTANCE_RECORD_SCHEMA_VERSION,
      id: plan.id,
      pid,
      executablePath: plan.executablePath,
      args,
      controlPort: plan.controlPort,
      serverPort: plan.serverPort,
      dataRoot: plan.dataRoot,
      ownsDataRoot: plan.ownsDataRoot,
      keepDataRoot: plan.keepDataRoot,
      logPath,
      startedAt: new Date().toISOString(),
    })

    const readiness = await waitReady({
      pid,
      serverPort: plan.serverPort,
      controlPort: plan.controlPort,
      timeoutMs: readinessTimeoutMs,
    })
    if (readiness.ready) return describeInstance(record)

    let cleanupNote = ''
    try {
      await closeGroup(pid)
    } catch (error) {
      cleanupNote = `\nCleanup could not confirm the process group ended: ${describeError(error)}`
    }
    onFailure(record)
    const logTail = readLogTail(logPath)
    const reason = readiness.reason === 'exited'
      ? 'The app exited before it became ready'
      : `The app did not become ready within ${Math.round(readinessTimeoutMs / 1000)} s (${readiness.lastState})`
    throw operationError(
      readiness.reason === 'exited' ? 'APP_EXITED_BEFORE_READY' : 'READINESS_TIMEOUT',
      `${reason}.${cleanupNote}${logTail ? `\nLast log lines (${logPath}):\n${logTail}` : ''}`,
      { logPath },
    )
  }

  async function resolveControlPort(requestedPort, serverPort) {
    if (requestedPort === undefined) return selectAutoControlPort(serverPort)
    await assertControlPortFree(requestedPort)
    return requestedPort
  }

  async function start(options = {}) {
    if (options.app && (options.fromWorktree || options.build)) {
      throw usageError('USAGE_ERROR', '--app cannot be combined with --from-worktree or --build')
    }
    if (options.controlPort !== undefined) {
      try {
        assertValidListenerPort(options.controlPort, '--control-port')
      } catch (error) {
        throw usageError('USAGE_ERROR', describeError(error))
      }
    }
    if (options.build) {
      await build({ webRoot, platform, sourceEnv })
    }
    const executablePath = await resolveExecutable({
      app: options.app,
      fromWorktree: options.fromWorktree || options.build,
    })
    await assertIsolatedLaunchSupported(executablePath)
    const controlPort = await resolveControlPort(options.controlPort, options.serverPort)
    const serverPort = await selectServerPort(options.serverPort, controlPort)
    const ownsDataRoot = !options.dataRoot
    const dataRoot = ownsDataRoot ? createAutoDataRoot() : resolveCallerDataRoot(options.dataRoot)

    const plan = {
      id: registry.generateId(controlPort),
      executablePath,
      controlPort,
      serverPort,
      dataRoot,
      ownsDataRoot,
      keepDataRoot: Boolean(options.keep),
    }
    return launchRecord(plan, {
      onFailure: (record) => {
        if (record) registry.remove(record.id)
        disposeDataRoot(plan, false)
      },
    })
  }

  async function list() {
    const instances = []
    for (const record of registry.list()) {
      instances.push({
        ...describeInstance(record),
        startedAt: record.startedAt,
        running: await isRunning(record),
      })
    }
    return { instances }
  }

  /** End the instance's process group; returns whether it was running and was forced. */
  async function endInstanceProcess(record) {
    const wasRunning = await isRunning(record)
    if (!wasRunning) return { wasRunning: false, forced: false }
    try {
      const completion = await closeGroup(record.pid)
      return { wasRunning: true, forced: Boolean(completion.forced) }
    } catch (error) {
      throw operationError(
        'STOP_UNCONFIRMED',
        `Could not confirm that instance ${record.id} (process group ${record.pid}) ended: ${describeError(error)}`,
        { instanceId: record.id },
      )
    }
  }

  async function stop({ instanceId, keep = false } = {}) {
    const id = registry.resolveId(instanceId)
    const record = registry.read(id)
    const { wasRunning, forced } = await endInstanceProcess(record)
    const dataRootRemoved = disposeDataRoot(record, keep || record.keepDataRoot)
    const [controlPortReleased, serverPortReleased] = await Promise.all([
      portAvailable(record.controlPort),
      portAvailable(record.serverPort),
    ])
    registry.remove(id, { removeLog: dataRootRemoved })
    return {
      instanceId: id,
      wasRunning,
      forced,
      dataRoot: record.dataRoot,
      dataRootRemoved,
      controlPortReleased,
      serverPortReleased,
      logPath: dataRootRemoved ? null : record.logPath,
    }
  }

  async function waitForPortsReleased(ports, timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const states = await Promise.all(ports.map((port) => portAvailable(port)))
      if (states.every(Boolean)) return
      await delay(250)
    }
  }

  /**
   * Stop keeping the data root, then start again with the recorded settings (same instance id,
   * ports, data root and ownership flags). Used after importing credentials into the instance.
   */
  async function restart({ instanceId } = {}) {
    const id = registry.resolveId(instanceId)
    const record = registry.read(id)
    // Checked before stopping: a refused app leaves the running instance untouched.
    await assertIsolatedLaunchSupported(record.executablePath)
    await endInstanceProcess(record)
    await waitForPortsReleased([record.controlPort, record.serverPort])
    for (const [code, port] of [['CONTROL_PORT_IN_USE', record.controlPort], ['SERVER_PORT_IN_USE', record.serverPort]]) {
      if (!(await portAvailable(port))) {
        throw environmentError(code, `Port ${port} of instance ${id} is still in use after it stopped`)
      }
    }
    return launchRecord({
      id,
      executablePath: record.executablePath,
      controlPort: record.controlPort,
      serverPort: record.serverPort,
      dataRoot: record.dataRoot,
      ownsDataRoot: record.ownsDataRoot,
      keepDataRoot: record.keepDataRoot,
    }, {
      // The record stays (not running) so a later `stop` still applies the data-root rule.
      onFailure: () => undefined,
    })
  }

  return Object.freeze({ start, list, stop, restart })
}

