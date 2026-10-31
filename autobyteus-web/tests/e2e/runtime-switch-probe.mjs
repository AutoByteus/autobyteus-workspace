#!/usr/bin/env node
// Agent runtime switch of a stopped standalone Agent run in the real app surface (autobyteus-316: REQ-001, REQ-002, REQ-011,
// REQ-014; AC-001, AC-002, AC-010). Real browser (Chrome via playwright-core) -> real Nuxt dev -> real built backend
// (`dist/app.js`) on an owned temp data root, free ports and a sanitized environment (a running desktop app and `~/.autobyteus`
// are never touched). Only the models are scripted: the native runtime talks to a test-owned LM Studio stand-in
// (`LMSTUDIO_HOSTS`), Antigravity is the scripted CLI `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.
//
// RSW-01  A native run answers once (first message typed in the composer). It is stopped; in the saved run's settings the
//         runtime menu offers the other agent runtimes (not locked); Antigravity and its model are chosen and saved; the hint says
//         the runtime changes with the next message and the server holds the pending switch. The next message is sent from the
//         composer: the chat shows the marker "Agent runtime changed from AutoByteus ... to Antigravity CLI ..." and the answer.
//         After a page reload the chat shows the earlier conversation (the native message and reply), the marker and the new
//         agent's answer, and the settings show Antigravity with no pending hint.
//
// Prerequisites: pnpm -C autobyteus-server-ts build; Google Chrome (--browser-executable or PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
//   ANTIGRAVITY_CLI_COMMAND = the absolute path of the scripted CLI (default: the repository's fixture).
// Run: pnpm -C autobyteus-web test:e2e:runtime-switch   [--output-dir <dir>] [--keep]
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const serverDir = path.join(path.resolve(webDir, '..'), 'autobyteus-server-ts')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/runtime-switch'))
const keep = process.argv.includes('--keep')
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const fakeAgy = process.env.ANTIGRAVITY_CLI_COMMAND || path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const AGY = 'antigravity_cli'
const AGY_MODEL = 'gemini-3.8-flash-low'
const NATIVE = 'autobyteus'

const evidence = { startedAt: new Date().toISOString(), steps: [], processes: [], cleanup: [], browserErrors: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const step = (text, details) => { evidence.steps.push({ text, details: details ?? null }); console.log(`  · ${text}`) }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 500) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`), { flags: 'a' })
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log)
  owned.push(child); evidence.processes.push({ label, pid: child.pid })
  return child
}
const stopOwned = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  return exited ? 'SIGTERM' : 'SIGKILL'
}
const sel = (t) => `[data-test="${t}"]`

/** A stand-in for LM Studio: the model list on GET, a streamed chat completion on POST. */
const startFakeLmStudio = async () => {
  let calls = 0
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ models: [{ key: 'rsw-native', max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] }))
      return
    }
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw); calls += 1
    const chunk = (delta, finish) => ({ id: `rsw-${calls}`, object: 'chat.completion.chunk', created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    res.end(`data: ${JSON.stringify(chunk({ role: 'assistant', content: `NATIVE-REPLY-${calls}` }, null))}\n\ndata: ${JSON.stringify(chunk({}, 'stop'))}\n\ndata: [DONE]\n\n`)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => { server.closeAllConnections(); return new Promise((r) => server.close(r)) } }
}

let ownedRoot, dataRoot, backend, frontend, browser, backendUrl, frontUrl, fake
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const runFolder = (runId) => path.join(dataRoot, 'memory', 'agents', runId)
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const settle = async (page, ms = 600) => { await delay(ms); await page.waitForLoadState('domcontentloaded').catch(() => {}) }
const composer = (page) => page.locator('main textarea[aria-autocomplete="list"]').last()
const sendFromComposer = async (page, text) => {
  const input = composer(page)
  await input.waitFor({ timeout: 60000 })
  await input.click(); await page.keyboard.type(text); await settle(page, 300)
  await page.keyboard.press('Enter')
}
const pageText = (page) => page.locator('main').innerText()

const journey = async (page) => {
  const r = {}
  await gql('mutation($p:String!,$r:String){reloadProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}', { p: 'LMSTUDIO', r: NATIVE })
  const nativeModels = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: NATIVE })).providerModelCatalogSnapshots.flatMap((x) => x.llmModels.map((m) => m.modelIdentifier))
  const nativeModel = nativeModels.find((id) => id.startsWith('rsw-native:'))
  assert(nativeModel, 'the native stand-in model is not offered', nativeModels.slice(0, 5))
  const definitionId = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: 'Switch Probe Agent', description: 'Runtime switch probe.', role: 'assistant', instructions: 'Reply briefly.', category: 'runtime-e2e', toolNames: [] } })).createAgentDefinition.id
  const workspace = path.join(ownedRoot, 'workspace'); await fs.mkdir(workspace, { recursive: true })
  const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: nativeModel, llmConfig: null, autoExecuteTools: true, runtimeKind: NATIVE } })).createAgentRun
  assert(created.success, created.message)
  const runId = created.runId; r.runId = runId

  // 1. The native agent answers the first message typed in the composer.
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 2000)
  await sendFromComposer(page, 'NATIVE-UI-ONE please answer')
  await waitFor('native reply in the chat', async () => (await pageText(page)).includes('NATIVE-REPLY-1'), 120000, 1000)
  await shot(page, 'RSW-01-native-answered')
  step('the native agent answered in the chat')

  // 2. Stop the run (the settings of a running run are locked) and open its settings.
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 2500)
  await page.locator(sel('workspace-header-edit-config')).click()
  const view = page.locator(sel('existing-run-settings')); await view.waitFor({ timeout: 60000 })
  await waitFor('model editable', async () => (await view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`).count()) > 0, 60000, 1000)
  await view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`).click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  // The runtimes appear as each availability check finishes (the node publishes them one by one).
  const rows = () => page.locator('[data-test^="chat-runtime-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-runtime-', '')))
  r.firstRuntimeRows = await rows()
  await waitFor('the Antigravity runtime row', async () => (await rows()).includes(AGY), 120000, 1000).catch(() => undefined)
  r.runtimeRows = await rows()
  r.lockedRuntimeBanner = await page.locator(sel('chat-model-locked-runtime')).count()
  assert(r.lockedRuntimeBanner === 0 && r.runtimeRows.includes(AGY), 'the saved run\'s runtime menu is locked or does not offer Antigravity', r)
  step('the runtime menu of the stopped run offers the other agent runtimes', r.runtimeRows)
  await shot(page, 'RSW-01-runtime-menu')

  // 3. Choose Antigravity and its model, then Save.
  await page.locator(sel(`chat-runtime-${AGY}`)).hover(); await delay(500)
  if (!(await page.locator(sel(`chat-model-list-${AGY}`)).isVisible().catch(() => false))) await page.locator(sel(`chat-runtime-${AGY}`)).click()
  await page.locator(sel(`chat-model-list-${AGY}`)).waitFor({ timeout: 60000 })
  const option = page.locator(sel(`chat-model-list-${AGY}`)).locator(sel(`chat-model-option-${AGY_MODEL}`)).first()
  await option.waitFor({ timeout: 60000 }); await option.scrollIntoViewIfNeeded().catch(() => {})
  const list = await page.locator(sel(`chat-model-list-${AGY}`)).boundingBox(); const row = await page.locator(sel(`chat-runtime-${AGY}`)).boundingBox()
  if (list && row && list.x > row.x) await page.mouse.move(list.x + 12, Math.min(Math.max(row.y + row.height / 2, list.y + 6), list.y + list.height - 6))
  await option.click(); await settle(page, 800)
  r.hint = await view.locator(sel('existing-run-runtime-change-hint')).innerText().catch(() => null)
  assert(r.hint && /next message/i.test(r.hint), 'no runtime-change hint after choosing another runtime', r.hint)
  await shot(page, 'RSW-01-unsaved-switch')
  await page.locator(sel('save-existing-model-config')).click()
  await waitFor('saved', async () => { const bar = await view.locator(sel('existing-run-save-bar')).innerText().catch(() => ''); return /\bSaved\b/.test(bar) && !/Unsaved|Saving/.test(bar) }, 60000, 500)
  const pending = await readJson(path.join(runFolder(runId), 'run_metadata.json'))
  r.pending = { runtimeKind: pending.runtimeKind, model: pending.llmModelIdentifier, platformAgentRunId: pending.platformAgentRunId, pendingFrom: pending.pendingRuntimeSwitch?.from?.runtimeKind }
  assert(pending.runtimeKind === AGY && pending.llmModelIdentifier === AGY_MODEL && pending.pendingRuntimeSwitch?.from?.runtimeKind === NATIVE && pending.platformAgentRunId === null, 'the server did not record the pending switch', r.pending)
  step('saved: the server holds the pending switch', r.pending)
  await shot(page, 'RSW-01-saved')

  // 4. The next message makes the switch: the chat shows the marker and the new agent's answer.
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 2500)
  await sendFromComposer(page, 'ECHO_INPUT')
  await waitFor('marker in the chat', async () => /Agent runtime changed from AutoByteus/.test(await pageText(page)), 180000, 1000)
  r.liveChat = (await pageText(page)).replace(/\s+/g, ' ').slice(0, 1200)
  await shot(page, 'RSW-01-after-switch-live')
  step('the chat shows the marker after the first message')

  // 5. After a reload the chat shows the earlier conversation, the marker and the new agent's answer.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 })
  const reloaded = await waitFor('the reloaded chat', async () => {
    const text = await pageText(page)
    return /NATIVE-UI-ONE/.test(text) && /NATIVE-REPLY-1/.test(text) && /Agent runtime changed from AutoByteus/.test(text) && /hand-over/.test(text) ? text : null
  }, 120000, 1000)
  r.reloadedChat = reloaded.replace(/\s+/g, ' ').slice(0, 1600)
  r.markerCount = (reloaded.match(/Agent runtime changed from/g) ?? []).length
  assert(r.markerCount === 1, 'the reloaded chat does not show exactly one marker', r.markerCount)
  await shot(page, 'RSW-01-after-reload')
  const settings = await readJson(path.join(runFolder(runId), 'run_metadata.json'))
  assert(settings.runtimeKind === AGY && !('pendingRuntimeSwitch' in settings), 'the switch was not committed', settings)
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('existing-run-settings')).waitFor({ timeout: 60000 }); await settle(page, 1500)
  r.hintAfter = await page.locator(sel('existing-run-runtime-change-hint')).count()
  assert(r.hintAfter === 0, 'the settings still show the runtime-change hint after the switch')
  // The run is running again on the new agent runtime: its settings show the runtime and model (locked while it runs).
  r.settingsRuntime = (await page.locator(sel('existing-run-root-card')).innerText()).replace(/\s+/g, ' ')
  assert(/Antigravity CLI/i.test(r.settingsRuntime), 'the settings do not show the new agent runtime', r.settingsRuntime)
  await shot(page, 'RSW-01-settings-after')
  step('after the reload the chat shows everything and the settings show the new runtime')
  return r
}

let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  assert(existsSync(fakeAgy), `the scripted Antigravity CLI is missing: ${fakeAgy}`)
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-switch-probe-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true }); await fs.mkdir(path.join(ownedRoot, 'home'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  fake = await startFakeLmStudio()
  const env = { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', LMSTUDIO_HOSTS: fake.origin, ANTIGRAVITY_CLI_COMMAND: fakeAgy, AGY_FAKE_CASE: 'linked_skills' }
  backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 1000)
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => evidence.browserErrors.push(e.message))
  for (const route of ['/chat', '/workspace', '/agents']) { await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000) }
  const started = Date.now()
  try {
    evidence.RSW01 = { result: 'Pass', details: await journey(page), ms: Date.now() - started }
  } catch (error) {
    exitCode = 1
    await page.screenshot({ path: path.join(outDir, 'RSW-01-failure.png') }).catch(() => {})
    evidence.RSW01 = { result: 'Fail', error: error.message, details: error.details ?? null, ms: Date.now() - started }
  }
  console.log(`RSW-01 ${evidence.RSW01.result}${evidence.RSW01.error ? ` — ${evidence.RSW01.error}` : ''}`)
  if (evidence.browserErrors.length) console.log(`  browser page errors: ${evidence.browserErrors.length} (see the evidence file)`)
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[runtime-switch-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  await fake?.close().catch(() => {})
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'runtime-switch-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
