import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { PRODUCTION_SERVER_PORT } from '../../electron-launch/launchPorts.mjs'
import { createInstanceLifecycle } from '../instanceLifecycle.mjs'
import { createInstanceRegistry } from '../instanceRegistry.mjs'

/**
 * Lifecycle with a fake app process: spawning records the call, readiness is scripted and
 * process-group control marks the fake group as ended.
 */
function lifecycleFixture(t, overrides = {}) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'isolated-lifecycle-test-')))
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))
  const appPath = path.join(base, 'app', 'AutoByteus')
  fs.mkdirSync(path.join(base, 'app', 'resources'), { recursive: true })
  fs.writeFileSync(appPath, '')
  fs.writeFileSync(path.join(base, 'app', 'resources', 'isolated-launch.json'), '{"isolatedLaunchContract": 1}')
  const tmpDir = path.join(base, 'tmp')
  fs.mkdirSync(tmpDir)
  const registry = createInstanceRegistry({ dir: path.join(base, 'registry') })
  const state = {
    nextPid: 7000,
    running: new Set(),
    spawned: [],
    closed: [],
    busyPorts: new Set(),
    ready: true,
  }
  const lifecycle = createInstanceLifecycle({
    registry,
    tmpDir,
    webRoot: path.join(base, 'web'),
    platform: 'darwin',
    sourceEnv: { HOME: '/home/tester', ELECTRON_RUN_AS_NODE: '1', AUTOBYTEUS_MEMORY_DIR: '/prod/memory' },
    readinessTimeoutMs: 50,
    processDeps: {
      spawnDetachedInstance: async (launch) => {
        const pid = state.nextPid++
        state.spawned.push({ ...launch, pid })
        state.running.add(pid)
        fs.appendFileSync(launch.logPath, `started ${pid}\n`)
        return pid
      },
      waitForInstanceReady: async () => (state.ready
        ? { ready: true, mainPage: { id: 'T' } }
        : { ready: false, reason: 'exited', lastState: 'x' }),
      isRecordedInstanceRunning: async (record) => state.running.has(record.pid),
      createProcessGroupController: (pid) => ({
        closeAndConfirmTree: async () => {
          state.closed.push(pid)
          state.running.delete(pid)
          return { status: 'complete', forced: false }
        },
      }),
      isPortAvailable: async (port) => !state.busyPorts.has(port),
      runBuild: async () => { state.built = true },
      ...overrides,
    },
  })
  return { lifecycle, registry, state, appPath, tmpDir, base }
}

/** Free-port picker that hands out `candidates` in order, skipping excluded ports. */
function scriptedPicker(candidates) {
  const queue = [...candidates]
  const calls = []
  const pick = async (requested, { exclude = [] } = {}) => {
    calls.push({ requested, exclude })
    while (queue.length > 0) {
      const port = queue.shift()
      if (!exclude.includes(port)) return port
    }
    throw new Error('scripted picker exhausted')
  }
  return { pick, calls }
}

test('start launches detached with the isolated overlay, records the instance and reports its facts', async (t) => {
  const { lifecycle, registry, state, appPath, tmpDir } = lifecycleFixture(t)

  const result = await lifecycle.start({ app: appPath })

  assert.ok(Number.isInteger(result.controlPort) && result.controlPort >= 1024)
  assert.notEqual(result.controlPort, PRODUCTION_SERVER_PORT)
  assert.notEqual(result.serverPort, result.controlPort)
  assert.match(result.instanceId, new RegExp(`^iso-${result.controlPort}-[0-9a-f]{4}$`))
  assert.equal(result.executablePath, fs.realpathSync(appPath))
  assert.equal(result.controlEndpoint, `http://127.0.0.1:${result.controlPort}`)
  assert.equal(result.backendUrl, `http://127.0.0.1:${result.serverPort}`)
  assert.equal(result.graphqlUrl, `${result.backendUrl}/graphql`)
  assert.ok(result.dataRoot.startsWith(path.join(tmpDir, 'autobyteus-isolated-root-')))
  assert.equal(result.ownsDataRoot, true)
  assert.equal(result.keepDataRoot, false)
  assert.equal(result.databaseUrl, `file:${result.dataRoot}/server-data/db/production.db`)
  assert.ok(fs.statSync(result.dataRoot).isDirectory())

  const [launch] = state.spawned
  assert.equal(launch.env.ELECTRON_RUN_AS_NODE, undefined)
  assert.equal(launch.env.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE, 'e2e')
  assert.equal(launch.env.AUTOBYTEUS_ELECTRON_SERVER_PORT, String(result.serverPort))
  assert.equal(launch.env.AUTOBYTEUS_ELECTRON_DATA_ROOT, result.dataRoot)
  assert.ok(launch.args.includes(`--remote-debugging-port=${result.controlPort}`))
  assert.equal(registry.read(result.instanceId).pid, launch.pid)
})

test('start without --control-port skips a busy candidate and uses the next free port', async (t) => {
  const picker = scriptedPicker([41001, 41002, 41003])
  const { lifecycle, state, appPath } = lifecycleFixture(t, { selectListenerPort: picker.pick })
  state.busyPorts.add(41001)

  const result = await lifecycle.start({ app: appPath })

  assert.equal(result.controlPort, 41002)
  assert.equal(result.serverPort, 41003)
  assert.deepEqual(picker.calls.at(-1).exclude, [41002])
  assert.ok(state.spawned[0].args.includes('--remote-debugging-port=41002'))
})

test('start without --control-port fails cleanly when no free candidate is found', async (t) => {
  const candidates = Array.from({ length: 10 }, (_, index) => 42000 + index)
  const { lifecycle, registry, state, appPath, tmpDir } = lifecycleFixture(t, {
    selectListenerPort: scriptedPicker(candidates).pick,
  })
  for (const port of candidates) state.busyPorts.add(port)

  await assert.rejects(lifecycle.start({ app: appPath }), (error) => (
    error.code === 'CONTROL_PORT_IN_USE'
    && error.category === 'environment'
    && error.message.includes('Could not find a free control port')
  ))
  assert.equal(state.spawned.length, 0)
  assert.deepEqual(registry.list(), [])
  assert.deepEqual(fs.readdirSync(tmpDir), [])
})

test('parallel default starts get distinct control ports', async (t) => {
  const picker = scriptedPicker([43001, 43002, 43003, 43004])
  const { lifecycle, appPath } = lifecycleFixture(t, { selectListenerPort: picker.pick })

  const first = await lifecycle.start({ app: appPath })
  const second = await lifecycle.start({ app: appPath })

  assert.notEqual(first.controlPort, second.controlPort)
  assert.equal(new Set([first.controlPort, first.serverPort, second.controlPort, second.serverPort]).size, 4)
})

test('start without --control-port never picks an explicitly requested server port', async (t) => {
  const picker = scriptedPicker([44001, 44002])
  const { lifecycle, appPath } = lifecycleFixture(t, { selectListenerPort: picker.pick })

  const result = await lifecycle.start({ app: appPath, serverPort: 44001 })

  assert.equal(result.serverPort, 44001)
  assert.equal(result.controlPort, 44002)
  assert.deepEqual(picker.calls[0].exclude, [44001])
})

test('start honors an explicit --control-port', async (t) => {
  const { lifecycle, state, appPath } = lifecycleFixture(t)

  const result = await lifecycle.start({ app: appPath, controlPort: 9444 })

  assert.equal(result.controlPort, 9444)
  assert.match(result.instanceId, /^iso-9444-[0-9a-f]{4}$/)
  assert.ok(state.spawned[0].args.includes('--remote-debugging-port=9444'))
})

test('start refuses a busy explicit control port and names the owning instance', async (t) => {
  const { lifecycle, state, appPath } = lifecycleFixture(t)
  const first = await lifecycle.start({ app: appPath, controlPort: 9444 })
  state.busyPorts.add(9444)

  await assert.rejects(lifecycle.start({ app: appPath, controlPort: 9444 }), (error) => (
    error.code === 'CONTROL_PORT_IN_USE'
    && error.category === 'environment'
    && error.details?.instanceId === first.instanceId
    && error.message.includes(first.instanceId)
    && error.message.includes('omit --control-port')
    && !error.message.includes('stop it')
  ))
  state.busyPorts.add(9445)
  await assert.rejects(lifecycle.start({ app: appPath, controlPort: 9445 }), (error) => (
    error.code === 'CONTROL_PORT_IN_USE'
    && error.details === undefined
    && error.message.includes('omit --control-port')
  ))
  assert.equal(state.spawned.length, 1)
})

test('readiness failure closes the group, removes the owned root and record, and reports the log tail', async (t) => {
  const { lifecycle, registry, state, appPath, tmpDir } = lifecycleFixture(t)
  state.ready = false

  await assert.rejects(lifecycle.start({ app: appPath }), (error) => (
    error.code === 'APP_EXITED_BEFORE_READY'
    && error.category === 'operation'
    && error.message.includes('started 7000')
  ))
  assert.deepEqual(state.closed, [7000])
  assert.deepEqual(registry.list(), [])
  assert.deepEqual(fs.readdirSync(tmpDir), [])
})

test('usage and environment errors happen before anything is launched', async (t) => {
  const { lifecycle, state, appPath } = lifecycleFixture(t)
  await assert.rejects(lifecycle.start({ app: appPath, build: true }), { code: 'USAGE_ERROR' })
  await assert.rejects(lifecycle.start({ app: appPath, controlPort: 29695 }), { code: 'USAGE_ERROR' })
  await assert.rejects(lifecycle.start({ app: '/does/not/exist' }), { code: 'APP_NOT_FOUND' })
  await assert.rejects(lifecycle.start({ app: appPath, dataRoot: '/does/not/exist' }), { code: 'DATA_ROOT_INVALID' })
  state.busyPorts.add(45000)
  await assert.rejects(lifecycle.start({ app: appPath, serverPort: 45000 }), { code: 'SERVER_PORT_IN_USE' })
  assert.equal(state.spawned.length, 0)
})

test('Linux has no default installed app', async (t) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'isolated-lifecycle-linux-'))
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))
  const lifecycle = createInstanceLifecycle({
    registry: createInstanceRegistry({ dir: path.join(base, 'registry') }),
    platform: 'linux',
    processDeps: { isPortAvailable: async () => true },
  })
  await assert.rejects(lifecycle.start({}), { code: 'APP_NOT_FOUND', category: 'environment' })
})

test('stop ends the group, deletes an owned root and removes the record', async (t) => {
  const { lifecycle, registry, state, appPath } = lifecycleFixture(t)
  const started = await lifecycle.start({ app: appPath })

  const result = await lifecycle.stop({})

  assert.equal(result.instanceId, started.instanceId)
  assert.equal(result.wasRunning, true)
  assert.equal(result.dataRootRemoved, true)
  assert.equal(result.controlPortReleased, true)
  assert.equal(fs.existsSync(started.dataRoot), false)
  assert.deepEqual(state.closed, [started.pid])
  assert.deepEqual(registry.list(), [])
})

test('stop of an instance whose app already quit sends no signal and still applies root disposal', async (t) => {
  const { lifecycle, registry, state, appPath } = lifecycleFixture(t)
  const started = await lifecycle.start({ app: appPath })
  state.running.clear()

  const result = await lifecycle.stop({ instanceId: started.instanceId })

  assert.equal(result.wasRunning, false)
  assert.equal(result.dataRootRemoved, true)
  assert.deepEqual(state.closed, [])
  assert.equal(registry.read(started.instanceId), null)
})

test('caller-provided roots are never deleted and --keep retains owned roots', async (t) => {
  const { lifecycle, appPath, base } = lifecycleFixture(t)
  const callerRoot = path.join(base, 'caller-root')
  fs.mkdirSync(callerRoot)
  await lifecycle.start({ app: appPath, dataRoot: callerRoot, controlPort: 9401 })
  const callerStop = await lifecycle.stop({ instanceId: (await lifecycle.list()).instances[0].instanceId })
  assert.equal(callerStop.dataRootRemoved, false)
  assert.ok(fs.existsSync(callerRoot))

  const owned = await lifecycle.start({ app: appPath })
  const keptStop = await lifecycle.stop({ keep: true })
  assert.equal(keptStop.dataRootRemoved, false)
  assert.equal(keptStop.logPath, owned.logPath)
  assert.ok(fs.existsSync(owned.dataRoot))

  const keptAtStart = await lifecycle.start({ app: appPath, keep: true })
  assert.equal((await lifecycle.stop({})).dataRootRemoved, false)
  assert.ok(fs.existsSync(keptAtStart.dataRoot))
})

test('restart keeps id, ports, data root and ownership flags', async (t) => {
  const { lifecycle, state, appPath } = lifecycleFixture(t)
  const started = await lifecycle.start({ app: appPath })

  const restarted = await lifecycle.restart({})

  assert.equal(restarted.instanceId, started.instanceId)
  assert.equal(restarted.controlPort, started.controlPort)
  assert.equal(restarted.serverPort, started.serverPort)
  assert.equal(restarted.dataRoot, started.dataRoot)
  assert.equal(restarted.ownsDataRoot, true)
  assert.equal(restarted.keepDataRoot, false)
  assert.notEqual(restarted.pid, started.pid)
  assert.ok(fs.existsSync(started.dataRoot))
  assert.deepEqual(state.closed, [started.pid])

  const stopped = await lifecycle.stop({})
  assert.equal(stopped.dataRootRemoved, true)
})

test('list reports liveness per record', async (t) => {
  const { lifecycle, state, appPath } = lifecycleFixture(t)
  const first = await lifecycle.start({ app: appPath, controlPort: 9401 })
  await lifecycle.start({ app: appPath, controlPort: 9402 })
  state.running.delete(first.pid)

  const { instances } = await lifecycle.list()
  assert.deepEqual(instances.map((instance) => [instance.controlPort, instance.running]), [[9401, false], [9402, true]])
})

test('--build builds the worktree before resolving its executable', async (t) => {
  const { lifecycle, state } = lifecycleFixture(t)
  await assert.rejects(lifecycle.start({ build: true }), { code: 'APP_NOT_FOUND' })
  assert.equal(state.built, true)
})

test('start refuses an app without isolated-launch support before any port, root or spawn work', async (t) => {
  const { lifecycle, state, base, tmpDir } = lifecycleFixture(t)
  const oldApp = path.join(base, 'old', 'AutoByteus')
  fs.mkdirSync(path.dirname(oldApp))
  fs.writeFileSync(oldApp, '')

  await assert.rejects(lifecycle.start({ app: oldApp }), (error) => (
    error.code === 'APP_ISOLATION_UNSUPPORTED'
    && error.category === 'environment'
    && error.message.includes(fs.realpathSync(oldApp))
    && error.message.includes('--from-worktree')
  ))
  assert.equal(state.spawned.length, 0)
  assert.deepEqual(fs.readdirSync(tmpDir), [])
})

test('start refuses a packed AppImage with extraction guidance as a usage error', async (t) => {
  const { lifecycle, state, base } = lifecycleFixture(t)
  const appImage = path.join(base, 'AutoByteus-linux.AppImage')
  fs.writeFileSync(appImage, '')

  await assert.rejects(lifecycle.start({ app: appImage }), (error) => (
    error.code === 'APPIMAGE_EXTRACTION_REQUIRED'
    && error.category === 'usage'
    && error.message.includes('--appimage-extract')
    && error.message.includes('squashfs-root')
  ))
  assert.equal(state.spawned.length, 0)
})

test('restart re-checks isolated-launch support and leaves the instance running when refused', async (t) => {
  const { lifecycle, state, appPath } = lifecycleFixture(t)
  const started = await lifecycle.start({ app: appPath })
  fs.rmSync(path.join(path.dirname(appPath), 'resources', 'isolated-launch.json'))

  await assert.rejects(lifecycle.restart({}), { code: 'APP_ISOLATION_UNSUPPORTED' })
  assert.deepEqual(state.closed, [])
  assert.ok(state.running.has(started.pid))
})

test('--from-worktree launches the worktree build when it carries the marker', async (t) => {
  const { lifecycle, base } = lifecycleFixture(t)
  const contents = path.join(base, 'web', 'electron-dist', `mac-${process.arch}`, 'AutoByteus.app', 'Contents')
  fs.mkdirSync(path.join(contents, 'MacOS'), { recursive: true })
  fs.mkdirSync(path.join(contents, 'Resources'), { recursive: true })
  fs.writeFileSync(path.join(contents, 'MacOS', 'AutoByteus'), '')
  fs.writeFileSync(path.join(contents, 'Resources', 'isolated-launch.json'), '{"isolatedLaunchContract": 1}')

  const started = await lifecycle.start({ fromWorktree: true })
  assert.equal(started.executablePath, fs.realpathSync(path.join(contents, 'MacOS', 'AutoByteus')))
})
