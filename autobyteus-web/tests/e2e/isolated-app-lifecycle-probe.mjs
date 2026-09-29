#!/usr/bin/env node
// Executable probe for the `pnpm isolated-app` lifecycle against a real packaged build.
//
// It runs the real CLI process from a caller environment that looks like an agent shell inside a
// production AutoByteus (inherited ELECTRON_RUN_AS_NODE=1 plus production-specific server settings
// pointing at a controlled "production" root) and proves: start JSON and readiness, loopback-only
// listeners, the isolated server environment, zero open files under production roots, concurrent
// instances, control-port conflicts, restart, stop (process group gone, ports free, owned root
// removed), dead-process stop, the capability-gate/AppImage refusals that launch nothing, and
// concurrent starts without --control-port getting distinct, loopback-only control ports.
//
// Usage: node tests/e2e/isolated-app-lifecycle-probe.mjs [--app <.app or executable>] [--output-dir <dir>]
// Without --app it uses the current worktree build (`start --from-worktree`). macOS/Linux only.
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const cliPath = path.join(webRoot, 'scripts', 'isolated-app', 'cli.mjs')
const getArg = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 ? process.argv[index + 1] : undefined
}
const appArg = getArg('app') ? path.resolve(getArg('app')) : null
const outputDir = path.resolve(webRoot, getArg('output-dir') ?? 'test-results/isolated-app-lifecycle')
const evidencePath = path.join(outputDir, 'isolated-app-lifecycle-evidence.json')
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, scenarios: {}, failures: [] }
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class ProbeError extends Error {
  constructor(message, details) {
    super(message)
    this.details = details
  }
}
function assert(condition, message, details) {
  if (!condition) throw new ProbeError(message, details)
}

function execText(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { maxBuffer: 16 * 1024 * 1024, ...options }, (error, stdout) => {
      resolve(error && !stdout ? '' : stdout)
    })
  })
}

async function runScenario(id, title, callback) {
  const record = { id, title, startedAt: new Date().toISOString() }
  evidence.scenarios[id] = record
  try {
    record.details = await callback()
    record.result = 'pass'
  } catch (error) {
    record.result = 'fail'
    evidence.failures.push({ id, message: error.message, details: error.details })
    throw error
  } finally {
    record.completedAt = new Date().toISOString()
  }
}

/** Run the real lifecycle CLI; returns the parsed JSON value and exit code. */
function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (exitCode) => {
      try {
        resolve({ exitCode, payload: JSON.parse(stdout), stderr })
      } catch {
        reject(new ProbeError(`CLI ${args.join(' ')} did not print one JSON value`, { stdout, stderr, exitCode }))
      }
    })
  })
}
async function cliOk(args, env) {
  const { exitCode, payload } = await runCli(args, env)
  assert(exitCode === 0 && payload.ok === true && payload.schemaVersion === 1, `isolated-app ${args[0]} failed`, payload)
  return payload.result
}
async function cliError(args, env, code, exitCode) {
  const result = await runCli(args, env)
  assert(result.exitCode === exitCode && result.payload.ok === false && result.payload.error?.code === code,
    `isolated-app ${args.join(' ')} did not fail with ${code}/${exitCode}`, result)
  return result.payload.error
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}
async function freePort(exclude = []) {
  for (;;) {
    const port = await new Promise((resolve) => {
      const server = net.createServer()
      server.listen(0, '127.0.0.1', () => {
        const { port: selected } = server.address()
        server.close(() => resolve(selected))
      })
    })
    if (!exclude.includes(port)) return port
  }
}

function groupAbsent(pgid) {
  try {
    process.kill(-pgid, 0)
    return false
  } catch (error) {
    return error.code === 'ESRCH'
  }
}
async function groupProcesses(pgid) {
  const table = await execText('ps', ['-axo', 'pid=,pgid=,command='])
  return table.split('\n').map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean)
    .map(([, pid, group, command]) => ({ pid: Number(pid), pgid: Number(group), command }))
    .filter((entry) => entry.pgid === pgid)
}
async function groupListeners(pgid) {
  const pids = (await groupProcesses(pgid)).map(({ pid }) => pid)
  if (pids.length === 0) return []
  const out = await execText('lsof', ['-nP', '-a', '-p', pids.join(','), '-iTCP', '-sTCP:LISTEN', '-Fn'])
  return out.split('\n').filter((line) => line.startsWith('n')).map((line) => line.slice(1))
}
async function groupOpenPaths(pgid) {
  const pids = (await groupProcesses(pgid)).map(({ pid }) => pid)
  if (pids.length === 0) return []
  const out = await execText('lsof', ['-n', '-p', pids.join(','), '-Fn'])
  return out.split('\n').filter((line) => line.startsWith('n/')).map((line) => line.slice(1))
}
async function processEnvironment(pid) {
  return execText('ps', ['eww', '-o', 'command=', '-p', String(pid)])
}
async function listPageTargets(controlPort) {
  const response = await fetch(`http://127.0.0.1:${controlPort}/json/list`)
  return (await response.json()).filter((target) => target.type === 'page' && String(target.url).includes('/renderer/index.html'))
}
async function healthOk(backendUrl) {
  try {
    return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(3000) })).ok
  } catch {
    return false
  }
}
async function productionCheckpoint() {
  const pids = (await execText('lsof', ['-nP', '-tiTCP:29695', '-sTCP:LISTEN'])).trim().split('\n').filter(Boolean)
  return { productionListenerPids: pids.sort() }
}

async function createCallerEnvironment(runRoot) {
  const productionRoot = path.join(runRoot, 'caller-production', '.autobyteus')
  const serverData = path.join(productionRoot, 'server-data')
  await fs.mkdir(path.join(serverData, 'db'), { recursive: true, mode: 0o700 })
  const productionDatabase = path.join(serverData, 'db', 'production.db')
  const dropped = {
    AUTOBYTEUS_DATA_DIR: serverData,
    AUTOBYTEUS_MEMORY_DIR: path.join(serverData, 'memory'),
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: path.join(productionRoot, 'agent-packages'),
    AUTOBYTEUS_SKILLS_PATHS: path.join(productionRoot, 'skills'),
    AUTOBYTEUS_SERVER_HOST: 'http://127.0.0.1:29695',
    DB_NAME: productionDatabase,
    DATABASE_URL: `file:${productionDatabase}`,
    APP_ENV: 'isolated-app-probe-app-env',
    OPENAI_API_KEY: 'non-secret-isolated-app-probe-openai',
    AUTOBYTEUS_PROBE_CALLER_SENTINEL: 'non-secret-isolated-app-probe-caller',
  }
  const env = {
    ...process.env,
    ...dropped,
    ELECTRON_RUN_AS_NODE: '1',
    // Probe-owned registry and auto roots (the registry lives in the OS temp dir).
    TMPDIR: runRoot,
  }
  return { env, dropped, productionRoot }
}

async function makeFakeApp(runRoot, { name, marker }) {
  const bundle = path.join(runRoot, 'fake-apps', `${name}.app`)
  const executable = path.join(bundle, 'Contents', 'MacOS', 'AutoByteus')
  const sentinel = path.join(runRoot, 'fake-apps', `${name}.executed`)
  await fs.mkdir(path.dirname(executable), { recursive: true })
  await fs.mkdir(path.join(bundle, 'Contents', 'Resources'), { recursive: true })
  await fs.writeFile(executable, `#!/bin/sh\ntouch '${sentinel}'\nsleep 30\n`, { mode: 0o755 })
  if (marker) await fs.writeFile(path.join(bundle, 'Contents', 'Resources', 'isolated-launch.json'), JSON.stringify(marker))
  return { bundle, executable, sentinel }
}

async function assertInstanceIsolated(instance, caller) {
  const processes = await groupProcesses(instance.pid)
  const leader = processes.find(({ pid }) => pid === instance.pid)
  const server = processes.find(({ command }) => command.includes('/server/dist/app.js'))
  assert(leader && server, 'Instance process group lacks the app leader or the embedded server', processes)
  assert(leader.command.includes(`--remote-debugging-port=${instance.controlPort}`)
    && leader.command.includes('--disable-backgrounding-occluded-windows')
    && leader.command.includes('--disable-renderer-backgrounding')
    && leader.command.includes(`--autobyteus-isolated-instance=${instance.instanceId}`), 'Leader arguments are incomplete', leader)

  const leaderEnv = await processEnvironment(instance.pid)
  assert(!/(?:^|\s)ELECTRON_RUN_AS_NODE=/.test(leaderEnv), 'Electron main inherited ELECTRON_RUN_AS_NODE')
  const serverEnv = await processEnvironment(server.pid)
  const leaked = Object.entries(caller.dropped).filter(([key, value]) => serverEnv.includes(`${key}=${value}`)).map(([key]) => key)
  assert(leaked.length === 0, 'Isolated server inherited production-specific caller settings', leaked)
  assert(serverEnv.includes(`DATABASE_URL=${instance.databaseUrl}`), 'Server DATABASE_URL is not the reported isolated database')
  assert(serverEnv.includes(`AUTOBYTEUS_DATA_DIR=${path.join(instance.dataRoot, 'server-data')}`), 'Server data dir is not isolated')

  // QR-002: the control (CDP) endpoint listens on loopback only. The embedded backend keeps the
  // server's own binding (unchanged by this feature), so only its presence is asserted.
  const listeners = await groupListeners(instance.pid)
  const controlListeners = listeners.filter((address) => address.endsWith(`:${instance.controlPort}`))
  assert(controlListeners.length > 0 && controlListeners.every((address) => /^(?:127\.0\.0\.1|\[::1\]):\d+$/.test(address)),
    'Control endpoint is not loopback-only', listeners)
  assert(listeners.some((address) => address.endsWith(`:${instance.serverPort}`)), 'Backend port is not held by the instance group', listeners)

  const protectedRoots = [caller.productionRoot, path.join(os.homedir(), '.autobyteus')]
  const openPaths = await groupOpenPaths(instance.pid)
  const productionOpen = openPaths.filter((openPath) => protectedRoots.some((root) => openPath === root || openPath.startsWith(`${root}/`)))
  assert(productionOpen.length === 0, 'Isolated instance opened files under production roots', productionOpen)
  return { processCount: processes.length, listeners, droppedChecked: Object.keys(caller.dropped), openFileCount: openPaths.length, productionOpen }
}

async function execute() {
  assert(process.platform === 'darwin' || process.platform === 'linux', 'This probe supports macOS and Linux')
  await fs.mkdir(outputDir, { recursive: true })
  // Short path: macOS limits Unix socket paths, and Chromium creates sockets under TMPDIR.
  const runRoot = await fs.realpath(await fs.mkdtemp(path.join('/tmp', 'abiso-')))
  evidence.runRoot = runRoot
  const caller = await createCallerEnvironment(runRoot)
  const appArgs = appArg ? ['--app', appArg] : ['--from-worktree']
  const started = []
  evidence.productionBefore = await productionCheckpoint()

  try {
    const [portA, portB] = [await freePort(), await freePort()]
    let instanceA
    let instanceB

    await runScenario('LC-001', 'Start from an agent-like shell: JSON, readiness, loopback-only, isolated server env, no production files', async () => {
      const began = Date.now()
      instanceA = await cliOk(['start', ...appArgs, '--control-port', String(portA)], caller.env)
      started.push(instanceA)
      const readySeconds = (Date.now() - began) / 1000
      for (const key of ['instanceId', 'pid', 'executablePath', 'backendUrl', 'graphqlUrl', 'controlEndpoint', 'dataRoot', 'databaseUrl', 'logPath']) {
        assert(instanceA[key], `Start result lacks ${key}`, instanceA)
      }
      assert(instanceA.controlPort === portA && instanceA.controlEndpoint === `http://127.0.0.1:${portA}`, 'Control endpoint mismatch', instanceA)
      assert(instanceA.ownsDataRoot === true && instanceA.keepDataRoot === false, 'Auto root flags wrong', instanceA)
      assert(path.dirname(instanceA.dataRoot) === runRoot && path.basename(instanceA.dataRoot).startsWith('autobyteus-isolated-root-'),
        'Auto data root not created in the temp dir', instanceA)
      assert(readySeconds < 60, `Readiness exceeded 60 s (QR-001): ${readySeconds}`)
      assert(await healthOk(instanceA.backendUrl), 'Backend health failed')
      assert((await listPageTargets(portA)).length === 1, 'Main window not listed on the control port')
      return { instance: instanceA, readySeconds, isolation: await assertInstanceIsolated(instanceA, caller) }
    })

    await runScenario('LC-002', 'Second concurrent instance, list, and control-port conflict', async () => {
      instanceB = await cliOk(['start', ...appArgs, '--control-port', String(portB)], caller.env)
      started.push(instanceB)
      assert(instanceB.serverPort !== instanceA.serverPort && instanceB.dataRoot !== instanceA.dataRoot, 'Instances share resources')
      const listed = await cliOk(['list'], caller.env)
      const running = Object.fromEntries(listed.instances.map((entry) => [entry.instanceId, entry.running]))
      assert(running[instanceA.instanceId] === true && running[instanceB.instanceId] === true && listed.instances.length === 2,
        'List does not show both running instances', listed)
      const conflict = await cliError(['start', ...appArgs, '--control-port', String(portA)], caller.env, 'CONTROL_PORT_IN_USE', 3)
      assert(conflict.message.includes(instanceA.instanceId) && conflict.message.includes('omit --control-port'),
        'Conflict does not name the owning instance or suggest omitting --control-port', conflict)
      assert((await cliOk(['list'], caller.env)).instances.length === 2, 'Refused start left a record')
      return { instanceB, listed, conflict }
    })

    await runScenario('LC-003', 'Restart keeps id, ports, root and flags; new tab id; still isolated', async () => {
      const tabBefore = (await listPageTargets(portA))[0].id
      const restarted = await cliOk(['restart', instanceA.instanceId], caller.env)
      assert(restarted.instanceId === instanceA.instanceId && restarted.controlPort === portA
        && restarted.serverPort === instanceA.serverPort && restarted.dataRoot === instanceA.dataRoot
        && restarted.ownsDataRoot === true && restarted.keepDataRoot === false, 'Restart changed recorded settings', { instanceA, restarted })
      assert(restarted.pid !== instanceA.pid && groupAbsent(instanceA.pid), 'Old process group survived restart')
      const tabAfter = (await listPageTargets(portA))[0].id
      assert(tabAfter !== tabBefore, 'Main window tab id did not change on restart')
      instanceA = restarted
      started.push(restarted)
      return { tabBefore, tabAfter, restarted, isolation: await assertInstanceIsolated(restarted, caller) }
    })

    await runScenario('LC-004', 'Stop ends the whole group, frees ports, removes the owned root; others keep running', async () => {
      const stopped = await cliOk(['stop', instanceB.instanceId], caller.env)
      assert(stopped.wasRunning === true && stopped.dataRootRemoved === true
        && stopped.controlPortReleased === true && stopped.serverPortReleased === true, 'Stop result incomplete', stopped)
      assert(groupAbsent(instanceB.pid), 'Stopped process group is still alive')
      assert(!existsSync(instanceB.dataRoot), 'Owned data root was not removed')
      assert(await portFree(portB) && await portFree(instanceB.serverPort), 'Ports not released')
      assert(await healthOk(instanceA.backendUrl), 'Stopping one instance affected the other')
      return { stopped }
    })

    await runScenario('LC-005', 'Dead-process stop after the app was ended outside the lifecycle', async () => {
      process.kill(-instanceA.pid, 'SIGKILL')
      for (let attempt = 0; attempt < 40 && !groupAbsent(instanceA.pid); attempt += 1) await delay(250)
      const listed = await cliOk(['list'], caller.env)
      assert(listed.instances.length === 1 && listed.instances[0].running === false, 'List does not report the dead instance', listed)
      const stopped = await cliOk(['stop'], caller.env)
      assert(stopped.instanceId === instanceA.instanceId && stopped.wasRunning === false && stopped.forced === false
        && stopped.dataRootRemoved === true, 'Dead-process stop result wrong', stopped)
      assert(!existsSync(instanceA.dataRoot), 'Dead instance root not removed')
      assert((await cliOk(['list'], caller.env)).instances.length === 0, 'Record not removed')
      return { listed, stopped }
    })

    await runScenario('LC-006', 'Refusals launch nothing: unknown id, missing marker, packed AppImage, invalid data root', async () => {
      const notFound = await cliError(['stop', 'iso-1-dead'], caller.env, 'INSTANCE_NOT_FOUND', 4)
      const rootsBefore = (await fs.readdir(runRoot)).filter((entry) => entry.startsWith('autobyteus-isolated-root-'))
      const unmarked = await makeFakeApp(runRoot, { name: 'Unmarked' })
      const unsupported = await cliError(['start', '--app', unmarked.bundle, '--control-port', String(await freePort())], caller.env, 'APP_ISOLATION_UNSUPPORTED', 3)
      const lowContract = await makeFakeApp(runRoot, { name: 'LowContract', marker: { isolatedLaunchContract: 0 } })
      await cliError(['start', '--app', lowContract.bundle, '--control-port', String(await freePort())], caller.env, 'APP_ISOLATION_UNSUPPORTED', 3)
      const appImage = path.join(runRoot, 'fake-apps', 'AutoByteus.AppImage')
      const appImageSentinel = `${appImage}.executed`
      await fs.writeFile(appImage, `#!/bin/sh\ntouch '${appImageSentinel}'\n`, { mode: 0o755 })
      await cliError(['start', '--app', appImage, '--control-port', String(await freePort())], caller.env, 'APPIMAGE_EXTRACTION_REQUIRED', 2)
      await cliError(['start', ...appArgs, '--control-port', String(await freePort()), '--data-root', path.join(runRoot, 'missing-root')],
        caller.env, 'DATA_ROOT_INVALID', 2)
      await delay(500)
      for (const sentinel of [unmarked.sentinel, lowContract.sentinel, appImageSentinel]) {
        assert(!existsSync(sentinel), `Refused app was executed: ${sentinel}`)
      }
      const rootsAfter = (await fs.readdir(runRoot)).filter((entry) => entry.startsWith('autobyteus-isolated-root-'))
      assert(rootsAfter.length === rootsBefore.length, 'A refused start created a data root', { rootsBefore, rootsAfter })
      assert((await cliOk(['list'], caller.env)).instances.length === 0, 'A refused start left a record')
      return { notFound, unsupported }
    })

    await runScenario('LC-007', 'Concurrent starts without --control-port get distinct loopback-only control ports', async () => {
      const PARALLEL_STARTS = 3
      const results = await Promise.allSettled(Array.from({ length: PARALLEL_STARTS }, () => cliOk(['start', ...appArgs], caller.env)))
      const instances = results.filter(({ status }) => status === 'fulfilled').map(({ value }) => value)
      started.push(...instances)
      const rejected = results.filter(({ status }) => status === 'rejected').map(({ reason }) => ({ message: reason.message, details: reason.details }))
      assert(rejected.length === 0, 'A concurrent default start failed', rejected)

      const controlPorts = instances.map(({ controlPort }) => controlPort)
      assert(new Set(controlPorts).size === PARALLEL_STARTS, 'Concurrent default starts share a control port', controlPorts)
      const perInstance = []
      for (const instance of instances) {
        assert(instance.instanceId.startsWith(`iso-${instance.controlPort}-`)
          && instance.controlEndpoint === `http://127.0.0.1:${instance.controlPort}`, 'Start result does not report its own control port', instance)
        const targets = await listPageTargets(instance.controlPort)
        assert(targets.length === 1, `Control port ${instance.controlPort} does not list exactly one main window`, targets)
        const listeners = await groupListeners(instance.pid)
        const controlListeners = listeners.filter((address) => address.endsWith(`:${instance.controlPort}`))
        assert(controlListeners.length > 0 && controlListeners.every((address) => /^(?:127\.0\.0\.1|\[::1\]):\d+$/.test(address)),
          `Control endpoint ${instance.controlPort} is not held loopback-only by its own instance`, listeners)
        perInstance.push({ instanceId: instance.instanceId, controlPort: instance.controlPort, serverPort: instance.serverPort, tabId: targets[0].id })
      }
      assert(new Set(perInstance.map(({ tabId }) => tabId)).size === PARALLEL_STARTS, 'Control ports expose the same main window', perInstance)

      const stops = []
      for (const instance of instances) {
        const stopped = await cliOk(['stop', instance.instanceId], caller.env)
        assert(stopped.instanceId === instance.instanceId && stopped.wasRunning === true && stopped.controlPortReleased === true,
          `Stopping ${instance.instanceId} by id failed`, stopped)
        assert(groupAbsent(instance.pid), `Stopped process group ${instance.pid} is still alive`)
        stops.push(stopped)
      }
      assert((await cliOk(['list'], caller.env)).instances.length === 0, 'Stopped instances left records')
      return { perInstance, stops }
    })
  } finally {
    for (const instance of started.reverse()) {
      if (!groupAbsent(instance.pid)) {
        await runCli(['stop', instance.instanceId], caller.env).catch(() => undefined)
        try {
          if (!groupAbsent(instance.pid)) process.kill(-instance.pid, 'SIGKILL')
        } catch {
          // Already gone.
        }
      }
    }
    evidence.productionAfter = await productionCheckpoint()
    await fs.rm(runRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  assert(JSON.stringify(evidence.productionBefore) === JSON.stringify(evidence.productionAfter),
    'The production app listener changed during the probe', { before: evidence.productionBefore, after: evidence.productionAfter })
}

try {
  await execute()
} catch (error) {
  if (!evidence.failures.length) evidence.failures.push({ id: 'probe', message: error.message, details: error.details })
  process.exitCode = 1
} finally {
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console[process.exitCode ? 'error' : 'log'](`[isolated-app-lifecycle-probe] ${process.exitCode ? 'failed' : 'passed'}; evidence=${evidencePath}`)
}
