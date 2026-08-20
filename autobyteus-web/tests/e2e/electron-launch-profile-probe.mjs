#!/usr/bin/env node
import { spawn, execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { launchPreparedElectronDirect } from '../../scripts/electron-e2e/directElectronProcessAdapter.mjs'
import { prepareElectronE2ELaunch } from '../../scripts/electron-e2e/electronE2ELaunchPreparation.mjs'
import { launchPreparedElectronWithPlaywright } from '../../scripts/electron-e2e/playwrightElectronProcessAdapter.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, '../..')

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1]
  }
  return fallback
}

const hasFlag = (name) => process.argv.includes(`--${name}`)
const timeoutMs = Number(getArg('timeout-ms', '120000'))
const outputDir = path.resolve(webRoot, getArg('output-dir', 'test-results/electron-launch-profile'))
const explicitExecutablePath = getArg('executable')
const skipBuild = hasFlag('skip-build')
const evidencePath = path.join(outputDir, 'electron-launch-profile-evidence.json')
const providerScreenshotPath = path.join(outputDir, 'provider-settings.png')

const evidence = {
  startedAt: new Date().toISOString(),
  completedAt: null,
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  webRoot,
  skipBuild,
  artifact: null,
  ordinaryApplication: {},
  scenarios: {},
  failures: [],
  cleanup: [],
}

const activeCleanups = []

function assert(condition, message, details = undefined) {
  if (condition) return
  const error = new Error(message)
  error.details = details
  throw error
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function withReferencedTimeout(promise, milliseconds, description) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${description} timed out after ${milliseconds}ms`)), milliseconds)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function waitFor(description, predicate, waitTimeoutMs = timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + waitTimeoutMs
  let lastValue
  let lastError
  while (Date.now() < deadline) {
    try {
      lastValue = await predicate()
      if (lastValue) return lastValue
      lastError = null
    } catch (error) {
      lastError = error
    }
    await delay(intervalMs)
  }
  throw new Error(
    `Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}`
    + (lastError ? `; error=${lastError.message}` : ''),
  )
}

function registerCleanup(label, callback) {
  const entry = { label, callback, active: true }
  activeCleanups.push(entry)
  return entry
}

async function runCleanup(entry) {
  if (!entry?.active) return null
  entry.active = false
  try {
    const result = await entry.callback()
    evidence.cleanup.push({ label: entry.label, result: 'pass' })
    return result
  } catch (error) {
    evidence.cleanup.push({
      label: entry.label,
      result: 'fail',
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

async function writeEvidence() {
  await fs.mkdir(outputDir, { recursive: true })
  const serializable = JSON.parse(JSON.stringify(evidence, (_key, value) => (
    typeof value === 'bigint' ? String(value) : value
  )))
  await fs.writeFile(evidencePath, `${JSON.stringify(serializable, null, 2)}\n`, 'utf8')
}

async function runScenario(id, title, callback) {
  const record = {
    id,
    title,
    startedAt: new Date().toISOString(),
    completedAt: null,
    result: 'running',
    details: null,
  }
  evidence.scenarios[id] = record
  await writeEvidence()
  try {
    record.details = await callback()
    record.result = 'pass'
    return record.details
  } catch (error) {
    record.result = 'fail'
    record.details = {
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    }
    evidence.failures.push({ id, ...record.details })
    throw error
  } finally {
    record.completedAt = new Date().toISOString()
    await writeEvidence()
  }
}

function execFileText(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: options.maxBuffer ?? 4 * 1024 * 1024,
      timeout: options.timeout ?? 15000,
    }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

async function sha256File(filePath) {
  const contents = await fs.readFile(filePath)
  return createHash('sha256').update(contents).digest('hex')
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function snapshotSentinel(filePath) {
  const [contents, stat] = await Promise.all([
    fs.readFile(filePath),
    fs.stat(filePath, { bigint: true }),
  ])
  return {
    sha256: createHash('sha256').update(contents).digest('hex'),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
  }
}

async function listRelativePaths(rootPath, maxEntries = 2000) {
  const paths = []
  async function walk(currentPath) {
    if (paths.length >= maxEntries) return
    for (const entry of await fs.readdir(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name)
      const relative = path.relative(rootPath, entryPath)
      paths.push(relative)
      if (entry.isDirectory()) await walk(entryPath)
      if (paths.length >= maxEntries) return
    }
  }
  if (await pathExists(rootPath)) await walk(rootPath)
  return paths
}

async function fetchHealth(baseUrl) {
  const response = await fetch(`${baseUrl}/rest/health`, {
    signal: AbortSignal.timeout(5000),
  })
  return { ok: response.ok, status: response.status }
}

async function getListenerPids(port) {
  if (process.platform === 'win32') return []
  try {
    const stdout = await execFileText('lsof', [
      '-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN',
    ])
    return [...new Set(stdout.split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger))]
  } catch (error) {
    if (error.code === 1) return []
    throw error
  }
}

async function getProcessIdentity(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null
  if (process.platform === 'win32') return { pid, platformInspection: 'not-implemented' }
  try {
    const stdout = await execFileText('ps', [
      '-p', String(pid), '-o', 'pid=', '-o', 'ppid=', '-o', 'pgid=', '-o', 'lstart=', '-o', 'command=',
    ])
    const normalized = stdout.trim().replace(/\s+/g, ' ')
    return {
      pid,
      fingerprint: createHash('sha256').update(normalized).digest('hex'),
      commandIsAutoByteus: /AutoByteus/.test(normalized),
    }
  } catch {
    return null
  }
}

async function ordinaryCheckpoint(label, expectedListenerPids = null) {
  const listenerPids = await getListenerPids(29695)
  assert(listenerPids.length > 0, `Ordinary listener on 29695 is not present at ${label}`)
  if (expectedListenerPids) {
    assert(
      expectedListenerPids.every((pid) => listenerPids.includes(pid)),
      `Ordinary listener identity changed at ${label}`,
      { expectedListenerPids, listenerPids },
    )
  }
  const health = await fetchHealth('http://127.0.0.1:29695')
  assert(health.ok, `Ordinary application health failed at ${label}`, health)
  const identities = await Promise.all(listenerPids.map(getProcessIdentity))
  return { label, listenerPids, health, identities }
}

async function listProcessTable() {
  if (process.platform === 'win32') return []
  const stdout = await execFileText('ps', ['-axo', 'pid=,ppid=,pgid=,command='])
  return stdout.split('\n').map((line) => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/)
    if (!match) return null
    return {
      pid: Number(match[1]),
      parentPid: Number(match[2]),
      processGroupId: Number(match[3]),
      command: match[4],
    }
  }).filter(Boolean)
}

async function processesInGroup(processGroupId) {
  return (await listProcessTable()).filter((entry) => entry.processGroupId === processGroupId)
}

async function inspectBackendEnvironment(pid, expectedMarkers) {
  if (process.platform === 'win32') {
    return { supported: false, reason: 'Windows environment inspection is not part of this host probe' }
  }
  const stdout = await execFileText('ps', ['eww', '-p', String(pid)], { maxBuffer: 8 * 1024 * 1024 })
  const matches = Object.fromEntries(
    Object.entries(expectedMarkers).map(([key, value]) => [key, stdout.includes(`${key}=${value}`)]),
  )
  return { supported: true, matches }
}

function expectedProfilePaths(rootPath) {
  return {
    baseDataRoot: rootPath,
    serverData: path.join(rootPath, 'server-data'),
    logs: path.join(rootPath, 'logs'),
    extensions: path.join(rootPath, 'extensions'),
    browserArtifacts: path.join(rootPath, 'browser-artifacts'),
    userData: path.join(rootPath, 'electron', 'user-data'),
    sessionData: path.join(rootPath, 'electron', 'session-data'),
    crashDumps: path.join(rootPath, 'electron', 'crash-dumps'),
    downloads: path.join(rootPath, 'electron', 'downloads'),
  }
}

async function inspectReadyProcessTree(session, dataRoot, expectedMarkers) {
  if (process.platform === 'win32') {
    return { supported: false, processTreeIdentity: session.processController.processTreeIdentity }
  }
  const rootPid = session.processController.pid
  const group = await waitFor('packaged backend and Chromium helpers', async () => {
    const entries = await processesInGroup(rootPid)
    const backend = entries.find((entry) => entry.command.includes('/server/dist/app.js'))
    const helper = entries.find((entry) => entry.command.includes('--user-data-dir='))
    return backend && helper ? { entries, backend, helper } : null
  }, 15000)
  const expected = expectedProfilePaths(dataRoot)
  assert(group.backend.command.includes(`--port ${session.metadata.port}`), 'Backend child did not receive selected port')
  assert(group.backend.command.includes(`--data-dir ${expected.serverData}`), 'Backend child did not receive isolated server-data path')
  assert(!/(?:^|\s)--host(?:\s|=)/.test(group.backend.command), 'Backend child unexpectedly received a host override')
  assert(
    group.helper.command.includes(`--user-data-dir=${expected.userData}`),
    'Chromium helper did not use isolated userData path',
  )
  const backendEnvironment = await inspectBackendEnvironment(group.backend.pid, expectedMarkers)
  if (backendEnvironment.supported) {
    for (const [key, matched] of Object.entries(backendEnvironment.matches)) {
      assert(matched, `Backend child did not preserve caller sentinel ${key}`)
    }
  }
  return {
    supported: true,
    rootPid,
    processTreeIdentity: session.processController.processTreeIdentity,
    processCount: group.entries.length,
    backendPid: group.backend.pid,
    backendSelectedPort: true,
    backendSelectedDataRoot: true,
    backendHostOverrideAbsent: true,
    chromiumUserDataIsolated: true,
    backendEnvironment,
  }
}

async function assertRootLayout(dataRoot) {
  const expected = expectedProfilePaths(dataRoot)
  const exists = {}
  for (const [name, directoryPath] of Object.entries(expected)) {
    exists[name] = await pathExists(directoryPath)
    assert(exists[name], `Expected isolated path was not created: ${name}=${directoryPath}`)
    const relative = path.relative(dataRoot, directoryPath)
    assert(relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)), `Isolated path escaped root: ${directoryPath}`)
  }
  assert(
    await pathExists(path.join(expected.userData, 'node-registry.v1.json')),
    'Node registry was not persisted under isolated userData',
  )
  const registry = JSON.parse(await fs.readFile(
    path.join(expected.userData, 'node-registry.v1.json'),
    'utf8',
  ))
  return { expected, exists, registry }
}

async function assertPreparedEnvironment(prepared, expectedMarkers) {
  for (const [key, value] of Object.entries(expectedMarkers)) {
    assert(prepared.env[key] === value, `Prepared environment did not preserve ${key}`)
  }
  assert(prepared.env.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE === 'e2e', 'Prepared profile was not forced to e2e')
  assert(prepared.env.AUTOBYTEUS_ELECTRON_SERVER_PORT === String(prepared.port), 'Prepared port was not forced')
  assert(prepared.env.AUTOBYTEUS_ELECTRON_DATA_ROOT === prepared.dataRoot, 'Prepared root was not forced')
  return {
    preservedMarkerKeys: Object.keys(expectedMarkers),
    isolationKeysForced: true,
  }
}

async function mainProcessSnapshot(electronApplication, expectedMarkers) {
  return electronApplication.evaluate(({ app }, expected) => ({
    isPackaged: app.isPackaged,
    paths: {
      userData: app.getPath('userData'),
      sessionData: app.getPath('sessionData'),
      logs: app.getPath('logs'),
      crashDumps: app.getPath('crashDumps'),
      downloads: app.getPath('downloads'),
    },
    environmentMatches: Object.fromEntries(
      Object.entries(expected).map(([key, value]) => [key, process.env[key] === value]),
    ),
  }), expectedMarkers)
}

async function waitForWindowReady(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs })
  await page.waitForFunction(() => Boolean(window.electronAPI), null, { timeout: timeoutMs })
  await page.waitForFunction(async () => {
    try {
      const status = await window.electronAPI.getServerStatus()
      return status?.status === 'running'
    } catch {
      return false
    }
  }, null, { timeout: timeoutMs })
}

function captureRendererTraffic(page, selectedBaseUrl) {
  const traffic = { requests: [], responses: [], websockets: [], failures: [], pageErrors: [] }
  const recordUrl = (url) => {
    if (/^(?:https?|wss?):\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i.test(url)) return url
    return null
  }
  page.on('request', (request) => {
    const url = recordUrl(request.url())
    if (url) traffic.requests.push({ method: request.method(), url })
  })
  page.on('response', (response) => {
    const url = recordUrl(response.url())
    if (url) traffic.responses.push({ status: response.status(), url })
  })
  page.on('websocket', (socket) => {
    const url = recordUrl(socket.url())
    if (url) traffic.websockets.push(url)
  })
  page.on('requestfailed', (request) => {
    const url = recordUrl(request.url())
    if (url) traffic.failures.push({ url, error: request.failure()?.errorText ?? 'unknown' })
  })
  page.on('pageerror', (error) => traffic.pageErrors.push(error.message))
  return {
    traffic,
    assertSelectedEndpoint() {
      const urls = [
        ...traffic.requests.map(({ url }) => url),
        ...traffic.responses.map(({ url }) => url),
        ...traffic.websockets,
      ]
      assert(urls.some((url) => url.startsWith(selectedBaseUrl)), 'No renderer request used the selected E2E endpoint', traffic)
      assert(!urls.some((url) => /(?:127\.0\.0\.1|localhost):29695\b/.test(url)), 'Renderer traffic reached production port 29695', traffic)
      return { observedSelectedEndpoint: true, observedProductionEndpoint: false }
    },
  }
}

async function exerciseRendererJourney(session, expectedMarkers) {
  const page = await session.firstWindow()
  const capture = captureRendererTraffic(page, session.metadata.clientBaseUrl)
  await waitForWindowReady(page)

  const bridge = await page.evaluate(async () => ({
    status: await window.electronAPI.getServerStatus(),
    registry: await window.electronAPI.getNodeRegistrySnapshot(),
    context: await window.electronAPI.getWindowContext(),
    health: await window.electronAPI.checkServerHealth(),
  }))
  assert(bridge.status.status === 'running', 'Preload server status is not running', bridge.status)
  assert(bridge.status.baseUrl === session.metadata.clientBaseUrl, 'Preload status baseUrl does not match selected endpoint', bridge.status)
  assert(bridge.status.urls.health === session.metadata.healthUrl, 'Preload health URL does not match selected endpoint', bridge.status)
  const embedded = bridge.registry.nodes.find((node) => node.nodeType === 'embedded')
  assert(embedded?.baseUrl === session.metadata.clientBaseUrl, 'Embedded registry URL does not match selected endpoint', bridge.registry)
  assert(bridge.health.status === 'ok', 'Preload health bridge did not reach selected backend', bridge.health)

  const rendererFetch = await page.evaluate(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query ElectronIsolationProbe { __typename }' }),
    })
    return { ok: response.ok, status: response.status, body: await response.json() }
  }, session.metadata.clientBaseUrl)
  assert(rendererFetch.ok, 'Renderer GraphQL request failed', rendererFetch)
  assert(rendererFetch.body?.data?.__typename === 'Query', 'Renderer GraphQL response was unexpected', rendererFetch)

  const graphqlWsUrl = session.metadata.clientBaseUrl.replace(/^http/, 'ws') + '/graphql'
  const websocket = await page.evaluate(async (url) => new Promise((resolve) => {
    const socket = new WebSocket(url, 'graphql-transport-ws')
    const timer = setTimeout(() => {
      socket.close()
      resolve({ opened: false, reason: 'timeout' })
    }, 5000)
    socket.addEventListener('open', () => {
      clearTimeout(timer)
      socket.close()
      resolve({ opened: true })
    }, { once: true })
    socket.addEventListener('error', () => {
      clearTimeout(timer)
      resolve({ opened: false, reason: 'error' })
    }, { once: true })
  }), graphqlWsUrl)
  assert(websocket.opened, 'Renderer GraphQL WebSocket did not open on selected endpoint', websocket)

  // The responsive shell renders either the compact strip button or the
  // docked AppLeftPanel footer button. Exercise whichever real control the
  // packaged window exposes rather than navigating the router directly.
  await page.locator(
    '[data-nav-key="settings"]:visible, [data-test="app-left-panel-shell"] footer button:visible',
  ).first().click({ timeout: timeoutMs })
  const manager = page.locator('.provider-api-key-manager')
  await manager.waitFor({ state: 'visible', timeout: timeoutMs })
  await waitFor('provider settings initial load', async () => {
    const text = await manager.innerText()
    const spinners = await manager.locator('.animate-spin').count()
    return spinners === 0 && /API Key Management/i.test(text) ? text : null
  }, timeoutMs, 250)
  const providerText = await manager.innerText()
  assert(!/Failed to load providers and models/i.test(providerText), 'Provider settings journey reported a load failure', { providerText })
  await page.screenshot({ path: providerScreenshotPath, fullPage: true })

  const updateBeforeDelay = await page.evaluate(async () => {
    try {
      await window.electronAPI.getAppUpdateState()
      return { handlerRegistered: true }
    } catch (error) {
      return { handlerRegistered: false, message: error instanceof Error ? error.message : String(error) }
    }
  })
  assert(!updateBeforeDelay.handlerRegistered, 'Updater IPC handler is registered in E2E mode', updateBeforeDelay)
  await delay(9000)
  const updateAfterDelay = await page.evaluate(async () => {
    try {
      await window.electronAPI.getAppUpdateState()
      return { handlerRegistered: true }
    } catch (error) {
      return { handlerRegistered: false, message: error instanceof Error ? error.message : String(error) }
    }
  })
  assert(!updateAfterDelay.handlerRegistered, 'Updater IPC handler appeared after the production auto-check delay', updateAfterDelay)

  const mainSnapshot = await mainProcessSnapshot(session.electronApplication, expectedMarkers)
  assert(mainSnapshot.isPackaged, 'Playwright did not launch a packaged Electron application')
  for (const [key, matches] of Object.entries(mainSnapshot.environmentMatches)) {
    assert(matches, `Electron main process did not preserve caller sentinel ${key}`)
  }
  const expectedPaths = expectedProfilePaths(session.metadata.dataRoot)
  for (const [name, actualPath] of Object.entries(mainSnapshot.paths)) {
    assert(actualPath === expectedPaths[name], `Electron path ${name} was not isolated`, { actualPath, expected: expectedPaths[name] })
  }

  const logPath = path.join(session.metadata.dataRoot, 'logs', 'app.log')
  const logText = await fs.readFile(logPath, 'utf8')
  assert(!logText.includes('[updater]'), 'E2E main log contains updater activity')
  assert(!/Checking for updates/i.test(logText), 'E2E main log contains an update check')
  const endpointTraffic = capture.assertSelectedEndpoint()

  return {
    bridge: {
      status: bridge.status.status,
      statusBaseUrlMatches: true,
      healthUrlMatches: true,
      registryBaseUrlMatches: true,
      health: bridge.health.status,
      windowNodeId: bridge.context.nodeId,
    },
    rendererGraphql: { ok: true, status: rendererFetch.status },
    rendererWebSocket: websocket,
    providerSettings: {
      visible: true,
      loadFailureAbsent: true,
      screenshot: providerScreenshotPath,
    },
    updater: {
      handlerAbsentBeforeDelay: true,
      handlerAbsentAfterDelay: true,
      logActivityAbsent: true,
    },
    mainSnapshot,
    endpointTraffic,
    traffic: capture.traffic,
  }
}

async function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const sockets = new Set()
    // Reply and close so a readiness fetch against this deliberately foreign
    // owner cannot leave an accepted socket pending during server.close().
    const server = net.createServer((socket) => {
      sockets.add(socket)
      socket.once('close', () => sockets.delete(socket))
      socket.on('error', () => undefined)
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
    })
    Object.defineProperty(server, 'probeSockets', { value: sockets })
    server.once('error', reject)
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => resolve(server))
  })
}

async function closeServer(server) {
  for (const socket of server?.probeSockets ?? []) socket.destroy()
  if (!server?.listening) return
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

function isPosixGroupAbsent(processGroupId) {
  try {
    process.kill(-processGroupId, 0)
    return false
  } catch (error) {
    if (error.code === 'ESRCH') return true
    if (error.code === 'EPERM') return false
    throw error
  }
}

async function killPosixGroup(processGroupId) {
  if (process.platform === 'win32' || isPosixGroupAbsent(processGroupId)) return
  try {
    process.kill(-processGroupId, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
  await waitFor(`process group ${processGroupId} absence`, () => isPosixGroupAbsent(processGroupId), 5000)
}

async function runRawPackagedFailure({ executablePath, env, expectedMessage }) {
  assert(process.platform !== 'win32', 'Raw invalid-profile executable checks require POSIX process-group support in this probe')
  const child = spawn(executablePath, [], {
    env,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const append = (chunk) => { output = `${output}${chunk}`.slice(-32000) }
  child.stdout?.on('data', append)
  child.stderr?.on('data', append)
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve)
    child.once('error', reject)
  })
  const cleanup = registerCleanup(`raw process group ${child.pid}`, () => killPosixGroup(child.pid))
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Raw packaged failure did not exit within 15000ms; output=${output}`)), 15000)
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal })
    })
  })
  await waitFor(`raw process group ${child.pid} absence`, () => isPosixGroupAbsent(child.pid), 5000)
  cleanup.active = false
  assert(result.code !== 0, 'Invalid packaged configuration exited successfully', { result, output })
  assert(output.includes(expectedMessage), 'Invalid packaged diagnostic did not identify the expected field/problem', { expectedMessage, output })
  return {
    exitCode: result.code,
    signal: result.signal,
    expectedDiagnosticObserved: true,
    processGroupAbsent: true,
  }
}

async function createControlledEnvironment(runRoot) {
  const controlledHome = path.join(runRoot, 'caller-home')
  const productionRoot = path.join(controlledHome, '.autobyteus')
  const ordinaryProfileRoot = process.platform === 'darwin'
    ? path.join(controlledHome, 'Library', 'Application Support', 'autobyteus')
    : path.join(controlledHome, '.config', 'autobyteus')
  const codexHome = path.join(runRoot, 'caller-codex-home')
  await Promise.all([
    fs.mkdir(productionRoot, { recursive: true, mode: 0o700 }),
    fs.mkdir(ordinaryProfileRoot, { recursive: true, mode: 0o700 }),
    fs.mkdir(codexHome, { recursive: true, mode: 0o700 }),
  ])
  const sentinels = [
    path.join(productionRoot, 'api-e2e-production-sentinel.txt'),
    path.join(ordinaryProfileRoot, 'api-e2e-profile-sentinel.txt'),
    path.join(codexHome, 'api-e2e-codex-sentinel.txt'),
  ]
  await Promise.all(sentinels.map((filePath, index) => fs.writeFile(filePath, `unchanged-sentinel-${index}\n`, 'utf8')))
  const sentinelBefore = Object.fromEntries(await Promise.all(
    sentinels.map(async (filePath) => [filePath, await snapshotSentinel(filePath)]),
  ))

  const copiedKeys = [
    'PATH', 'SHELL', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM',
    'DISPLAY', 'WAYLAND_DISPLAY', 'XPC_FLAGS', 'XPC_SERVICE_NAME',
  ]
  const sourceEnv = Object.fromEntries(
    copiedKeys.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]),
  )
  Object.assign(sourceEnv, {
    HOME: controlledHome,
    CODEX_HOME: codexHome,
    OPENAI_API_KEY: 'non-secret-electron-e2e-openai-sentinel',
    GOOGLE_API_KEY: 'non-secret-electron-e2e-google-sentinel',
    SERPER_API_KEY: 'non-secret-electron-e2e-search-sentinel',
    AUTOBYTEUS_E2E_CALLER_SENTINEL: 'non-secret-electron-e2e-caller-sentinel',
    NO_PROXY: '127.0.0.1,localhost',
  })
  const expectedMarkers = {
    CODEX_HOME: sourceEnv.CODEX_HOME,
    OPENAI_API_KEY: sourceEnv.OPENAI_API_KEY,
    GOOGLE_API_KEY: sourceEnv.GOOGLE_API_KEY,
    SERPER_API_KEY: sourceEnv.SERPER_API_KEY,
    AUTOBYTEUS_E2E_CALLER_SENTINEL: sourceEnv.AUTOBYTEUS_E2E_CALLER_SENTINEL,
  }
  return {
    controlledHome,
    productionRoot,
    ordinaryProfileRoot,
    codexHome,
    sentinels,
    sentinelBefore,
    sourceEnv,
    expectedMarkers,
  }
}

async function assertControlledSentinelsUnchanged(controlled) {
  const after = Object.fromEntries(await Promise.all(
    controlled.sentinels.map(async (filePath) => [filePath, await snapshotSentinel(filePath)]),
  ))
  assert(JSON.stringify(after) === JSON.stringify(controlled.sentinelBefore), 'Controlled production/profile/Codex sentinels changed', {
    before: controlled.sentinelBefore,
    after,
  })
  return { unchanged: true, count: controlled.sentinels.length }
}

async function execute() {
  assert(Number.isFinite(timeoutMs) && timeoutMs >= 30000, '--timeout-ms must be at least 30000')
  await fs.mkdir(outputDir, { recursive: true })
  const runRoot = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'autobyteus-electron-profile-probe-'))
  await fs.chmod(runRoot, 0o700)
  registerCleanup('probe temporary root', () => fs.rm(runRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
  // Keep the controlled caller HOME outside os.tmpdir(). The reusable launch
  // preparation intentionally rejects an E2E root that is either above or
  // below a protected production root, so placing the fake HOME below the
  // default temp-root parent would make every preparation unsafe by design.
  const controlledRoot = await fs.mkdtemp(path.join(path.dirname(outputDir), 'controlled-caller-'))
  await fs.chmod(controlledRoot, 0o700)
  registerCleanup('controlled caller root', () => fs.rm(controlledRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
  const controlled = await createControlledEnvironment(controlledRoot)

  const ordinaryBefore = await ordinaryCheckpoint('before packaged validation')
  evidence.ordinaryApplication.before = ordinaryBefore
  const ordinaryListenerPids = ordinaryBefore.listenerPids

  let artifactPath = explicitExecutablePath ? path.resolve(explicitExecutablePath) : null
  const usedArtifactPaths = new Set()

  await runScenario('E2E-PKG-001', 'Direct same-artifact coexistence, isolated paths, and caller-root retention', async () => {
    const callerRoot = path.join(runRoot, 'caller-retained-direct-root')
    await fs.mkdir(callerRoot, { mode: 0o700 })
    const prepared = await prepareElectronE2ELaunch({
      webRoot,
      build: !skipBuild,
      executablePath: artifactPath,
      dataRoot: callerRoot,
      sourceEnv: controlled.sourceEnv,
    })
    artifactPath = prepared.executablePath
    usedArtifactPaths.add(artifactPath)
    assert(prepared.ownsDataRoot === false, 'Caller-supplied direct root was incorrectly marked preparation-owned')
    const preparedEnvironment = await assertPreparedEnvironment(prepared, controlled.expectedMarkers)
    let session
    let sessionCleanup
    try {
      session = await launchPreparedElectronDirect(prepared)
      sessionCleanup = registerCleanup('direct Electron session', () => session.cleanup())
      await session.waitUntilReady(timeoutMs)
      await delay(1500)
      const ordinaryDuring = await ordinaryCheckpoint('during direct E2E', ordinaryListenerPids)
      const processTree = await inspectReadyProcessTree(session, callerRoot, controlled.expectedMarkers)
      const layout = await assertRootLayout(callerRoot)
      const embedded = layout.registry.nodes.find((node) => node.nodeType === 'embedded')
      assert(embedded?.baseUrl === prepared.clientBaseUrl, 'Persisted registry did not use direct selected endpoint', layout.registry)
      const cleanupResult = await runCleanup(sessionCleanup)
      assert(await pathExists(callerRoot), 'Common session deleted a caller-supplied root')
      if (process.platform !== 'win32') {
        assert(isPosixGroupAbsent(session.processController.pid), 'Direct Electron process group remained after cleanup')
      }
      const ordinaryAfter = await ordinaryCheckpoint('after direct E2E', ordinaryListenerPids)
      const sentinel = await assertControlledSentinelsUnchanged(controlled)
      return {
        metadata: prepared.metadata,
        preparedEnvironment,
        ordinaryDuring,
        ordinaryAfter,
        processTree,
        isolatedPaths: layout.exists,
        registryBaseUrlMatches: true,
        cleanupResult,
        callerRootRetained: true,
        sentinel,
      }
    } finally {
      if (sessionCleanup?.active) await runCleanup(sessionCleanup)
    }
  })

  assert(artifactPath && existsSync(artifactPath), 'Packaged artifact was not discovered')
  const artifactStat = await fs.stat(artifactPath)
  evidence.artifact = {
    executablePath: artifactPath,
    size: artifactStat.size,
    sha256: await sha256File(artifactPath),
  }

  await runScenario('E2E-PKG-002', 'Playwright renderer endpoint, provider, environment, profile, and updater journey', async () => {
    const { _electron } = await import('playwright-core')
    const prepared = await prepareElectronE2ELaunch({
      webRoot,
      build: false,
      executablePath: artifactPath,
      sourceEnv: controlled.sourceEnv,
    })
    usedArtifactPaths.add(prepared.executablePath)
    const ownedRoot = prepared.dataRoot
    const preparedEnvironment = await assertPreparedEnvironment(prepared, controlled.expectedMarkers)
    let session
    let sessionCleanup
    try {
      session = await launchPreparedElectronWithPlaywright(prepared, _electron)
      sessionCleanup = registerCleanup('Playwright Electron session', () => session.cleanup())
      await session.waitUntilReady(timeoutMs)
      const journey = await exerciseRendererJourney(session, controlled.expectedMarkers)
      const processTree = await inspectReadyProcessTree(session, ownedRoot, controlled.expectedMarkers)
      const layout = await assertRootLayout(ownedRoot)
      const cleanupResult = await runCleanup(sessionCleanup)
      assert(!(await pathExists(ownedRoot)), 'Preparation-owned Playwright root remained after affirmative cleanup')
      const ordinaryAfter = await ordinaryCheckpoint('after Playwright E2E', ordinaryListenerPids)
      const sentinel = await assertControlledSentinelsUnchanged(controlled)
      return {
        metadata: prepared.metadata,
        preparedEnvironment,
        journey,
        processTree,
        isolatedPaths: layout.exists,
        cleanupResult,
        ownedRootDisposed: true,
        ordinaryAfter,
        sentinel,
      }
    } finally {
      if (sessionCleanup?.active) await runCleanup(sessionCleanup)
      else if (!session && prepared.getClaimState() === 'prepared') await prepared.disposeOwnedDataRoot()
    }
  })

  await runScenario('E2E-PKG-003', 'Two simultaneous Playwright instances keep ports, roots, and renderer state isolated', async () => {
    const { _electron } = await import('playwright-core')
    const preparations = await Promise.all([0, 1].map(() => prepareElectronE2ELaunch({
      webRoot,
      build: false,
      executablePath: artifactPath,
      sourceEnv: controlled.sourceEnv,
    })))
    preparations.forEach((prepared) => usedArtifactPaths.add(prepared.executablePath))
    assert(preparations[0].port !== preparations[1].port, 'Parallel preparations selected the same port')
    assert(preparations[0].dataRoot !== preparations[1].dataRoot, 'Parallel preparations selected the same root')
    const sessions = []
    const cleanupEntries = []
    try {
      for (const prepared of preparations) {
        const session = await launchPreparedElectronWithPlaywright(prepared, _electron)
        sessions.push(session)
        cleanupEntries.push(registerCleanup(`parallel Playwright session ${sessions.length}`, () => session.cleanup()))
      }
      await Promise.all(sessions.map((session) => session.waitUntilReady(timeoutMs)))
      const pages = await Promise.all(sessions.map((session) => session.firstWindow()))
      await Promise.all(pages.map(waitForWindowReady))
      const markers = ['parallel-instance-one', 'parallel-instance-two']
      await Promise.all(pages.map((page, index) => page.evaluate((marker) => {
        localStorage.setItem('electron-e2e-isolation-marker', marker)
      }, markers[index])))
      const observed = await Promise.all(pages.map((page) => page.evaluate(
        () => localStorage.getItem('electron-e2e-isolation-marker'),
      )))
      assert(observed[0] === markers[0] && observed[1] === markers[1], 'Parallel renderer localStorage state crossed profiles', { observed })
      const snapshots = await Promise.all(sessions.map((session) => mainProcessSnapshot(session.electronApplication, controlled.expectedMarkers)))
      assert(snapshots[0].paths.userData !== snapshots[1].paths.userData, 'Parallel Electron instances shared userData')
      const health = await Promise.all(sessions.map((session) => fetchHealth(session.metadata.clientBaseUrl)))
      assert(health.every(({ ok }) => ok), 'A parallel selected backend was not healthy', health)
      const ordinaryDuring = await ordinaryCheckpoint('during parallel E2E', ordinaryListenerPids)
      const cleanupResults = await Promise.all(cleanupEntries.map(runCleanup))
      for (const prepared of preparations) {
        assert(!(await pathExists(prepared.dataRoot)), `Parallel owned root remained: ${prepared.dataRoot}`)
      }
      const ordinaryAfter = await ordinaryCheckpoint('after parallel E2E', ordinaryListenerPids)
      return {
        exactArtifactPaths: preparations.map(({ executablePath }) => executablePath),
        distinctPorts: preparations.map(({ port }) => port),
        distinctRoots: preparations.map(({ dataRoot }) => dataRoot),
        localStorageMarkers: observed,
        distinctUserData: true,
        health,
        ordinaryDuring,
        ordinaryAfter,
        cleanupResults,
        ownedRootsDisposed: true,
      }
    } finally {
      for (const entry of cleanupEntries.reverse()) {
        if (entry.active) await runCleanup(entry)
      }
      for (const prepared of preparations) {
        if (prepared.getClaimState() === 'prepared') await prepared.disposeOwnedDataRoot()
      }
    }
  })

  await runScenario('E2E-PKG-004', 'Raw packaged invalid and partial profiles fail closed', async () => {
    if (process.platform === 'win32') {
      return { result: 'not-tested', reason: 'Raw failure probe currently requires POSIX process-group verification' }
    }
    const safeRoot = path.join(runRoot, 'invalid-profile-safe-root')
    const occupiedRoot = path.join(runRoot, 'invalid-profile-occupied-root')
    await Promise.all([
      fs.mkdir(safeRoot, { mode: 0o700 }),
      fs.mkdir(occupiedRoot, { mode: 0o700 }),
    ])
    const baseE2E = {
      ...controlled.sourceEnv,
      AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
    }
    const freeServer = await listenOnPort(0)
    const freeAddress = freeServer.address()
    assert(typeof freeAddress === 'object' && freeAddress, 'Could not select invalid-profile fixture port')
    const occupiedPort = freeAddress.port
    const serverCleanup = registerCleanup('invalid-profile occupied-port fixture', () => closeServer(freeServer))
    const cases = [
      {
        name: 'missing-root',
        env: { ...baseE2E, AUTOBYTEUS_ELECTRON_SERVER_PORT: '31001' },
        expectedMessage: 'are both required for e2e',
      },
      {
        name: 'missing-port',
        env: { ...baseE2E, AUTOBYTEUS_ELECTRON_DATA_ROOT: safeRoot },
        expectedMessage: 'are both required for e2e',
      },
      {
        name: 'production-port',
        env: { ...baseE2E, AUTOBYTEUS_ELECTRON_SERVER_PORT: '29695', AUTOBYTEUS_ELECTRON_DATA_ROOT: safeRoot },
        expectedMessage: 'must differ from production port 29695',
      },
      {
        name: 'production-root',
        env: { ...baseE2E, AUTOBYTEUS_ELECTRON_SERVER_PORT: '31002', AUTOBYTEUS_ELECTRON_DATA_ROOT: controlled.productionRoot },
        expectedMessage: 'overlaps protected production path',
      },
      {
        name: 'relative-root',
        env: { ...baseE2E, AUTOBYTEUS_ELECTRON_SERVER_PORT: '31003', AUTOBYTEUS_ELECTRON_DATA_ROOT: 'relative/e2e-root' },
        expectedMessage: 'must be an absolute path',
      },
      {
        name: 'occupied-port',
        env: { ...baseE2E, AUTOBYTEUS_ELECTRON_SERVER_PORT: String(occupiedPort), AUTOBYTEUS_ELECTRON_DATA_ROOT: occupiedRoot },
        expectedMessage: 'is unavailable',
      },
    ]
    const results = []
    try {
      for (const invalidCase of cases) {
        results.push({
          name: invalidCase.name,
          ...(await runRawPackagedFailure({
            executablePath: artifactPath,
            env: invalidCase.env,
            expectedMessage: invalidCase.expectedMessage,
          })),
        })
        assert(freeServer.listening, `Invalid profile ${invalidCase.name} signaled the foreign occupied-port fixture`)
      }
    } finally {
      await runCleanup(serverCleanup)
    }
    const sentinel = await assertControlledSentinelsUnchanged(controlled)
    const ordinaryAfter = await ordinaryCheckpoint('after invalid profiles', ordinaryListenerPids)
    return {
      cases: results,
      foreignFixtureSurvivedEveryCase: true,
      sentinel,
      ordinaryAfter,
    }
  })

  await runScenario('E2E-PKG-005', 'Foreign allocation-race owner survives and does not veto owned-root disposal', async () => {
    // This final scenario starts with no application-owned handles. Keep it
    // alive across preparation as well as the deliberately short-lived child;
    // otherwise Node can report an unsettled top-level await while a close or
    // spawn callback is still pending.
    const keepAlive = setInterval(() => undefined, 1000)
    let prepared
    let ownedRoot
    let foreignServer
    let serverCleanup
    let session
    let sessionCleanup
    let readinessError
    try {
      prepared = await prepareElectronE2ELaunch({
        webRoot,
        build: false,
        executablePath: artifactPath,
        sourceEnv: controlled.sourceEnv,
      })
      usedArtifactPaths.add(prepared.executablePath)
      ownedRoot = prepared.dataRoot
      foreignServer = await listenOnPort(prepared.port)
      serverCleanup = registerCleanup('allocation-race foreign listener', () => closeServer(foreignServer))
      session = await launchPreparedElectronDirect(prepared)
      sessionCleanup = registerCleanup('allocation-race direct session', () => session.cleanup())
      try {
        // Node's fetch timeout uses an unref'ed timer. Retain a referenced
        // outer deadline so a startup request accepted by the foreign bare
        // listener cannot leave this top-level await unsettled.
        await withReferencedTimeout(
          session.waitUntilReady(15000),
          20000,
          'allocation-race readiness rejection',
        )
      } catch (error) {
        readinessError = error
      }
      assert(readinessError, 'Allocation-race launch unexpectedly became ready')
      const cleanupResult = await runCleanup(sessionCleanup)
      assert(cleanupResult.portObservation.status === 'occupied-after-owned-tree-exit', 'Foreign port was not reported diagnostically', cleanupResult)
      assert(foreignServer.listening, 'Allocation-race foreign listener was signaled')
      assert(!(await pathExists(ownedRoot)), 'Foreign listener vetoed preparation-owned root disposal')
      const ordinaryAfter = await ordinaryCheckpoint('after allocation race', ordinaryListenerPids)
      return {
        startupFailedClosed: true,
        readinessErrorMentionsExit: /exited before readiness/i.test(readinessError.message),
        cleanupResult,
        foreignListenerStillRunning: true,
        ownedRootDisposed: true,
        ordinaryAfter,
      }
    } finally {
      if (sessionCleanup?.active) await runCleanup(sessionCleanup)
      if (!session && prepared?.getClaimState() === 'prepared') await prepared.disposeOwnedDataRoot()
      try {
        if (serverCleanup?.active) await runCleanup(serverCleanup)
      } finally {
        clearInterval(keepAlive)
      }
    }
  })

  assert(usedArtifactPaths.size === 1 && usedArtifactPaths.has(artifactPath), 'Scenarios did not reuse one exact packaged artifact', {
    artifactPath,
    usedArtifactPaths: [...usedArtifactPaths],
  })
  evidence.artifact.reusedAcrossAllPreparedScenarios = true
  evidence.ordinaryApplication.after = await ordinaryCheckpoint('after all packaged validation', ordinaryListenerPids)
  evidence.ordinaryApplication.identityPreserved = true
  evidence.controlledSentinels = await assertControlledSentinelsUnchanged(controlled)
}

async function main() {
  try {
    await execute()
  } catch (error) {
    if (!evidence.failures.length) {
      evidence.failures.push({
        id: 'probe',
        message: error instanceof Error ? error.message : String(error),
        details: error?.details,
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
    process.exitCode = 1
  } finally {
    for (const cleanup of [...activeCleanups].reverse()) {
      if (!cleanup.active) continue
      try {
        await runCleanup(cleanup)
      } catch (error) {
        evidence.failures.push({
          id: `cleanup:${cleanup.label}`,
          message: error instanceof Error ? error.message : String(error),
        })
        process.exitCode = 1
      }
    }
    evidence.completedAt = new Date().toISOString()
    await writeEvidence()
    if (process.exitCode) {
      console.error(`[electron-launch-profile-probe] failed; evidence=${evidencePath}`)
    } else {
      console.log(`[electron-launch-profile-probe] passed; evidence=${evidencePath}`)
    }
  }
}

await main()
