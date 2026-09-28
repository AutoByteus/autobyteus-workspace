#!/usr/bin/env node
// D-14 evidence probe (ticket chat-interface-entry, IR-002).
//
// Real Chrome → real Nuxt dev → real backend (dist/app.js) → Codex, in an owned temp data root on
// free ports with a sanitized environment (same isolation as tests/e2e/chat-entry-live-probe.mjs).
//
// Scenarios:
//   stale  Deterministic reproduction of F-02: a quiet run-history refresh whose snapshot predates
//          activation of the prepared run P is delivered right after P's stream reaches CONNECTED.
//          Every agent-socket close is recorded with its JS call stack (no product instrumentation).
//   resend The C07 journey (failed first send → temp chat → resend) repeated N times with the
//          normal 5 s tree poll; a loss is a resend whose reply never streams.
//
// Usage: node d14-reconcile-probe.mjs --scenario stale|resend [--repeat 14] [--model gpt-5.5]
//        [--output-dir <dir>]
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '../../../..')
const webDir = path.join(rootDir, 'autobyteus-web')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const scenario = arg('scenario', 'stale')
const repeat = Number(arg('repeat', scenario === 'resend' ? '14' : '1'))
const runtime = 'codex_app_server'
const preferredModel = arg('model', 'gpt-5.5')
const outDir = path.resolve(arg('output-dir', path.join(scriptDir, `d14-${scenario}`)))
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync)

const evidence = { scenario, startedAt: new Date().toISOString(), runtime, iterations: [], processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 250) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`))
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
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

// In-page recorder: every agent-stream socket (url ends with /<runId>) records open/close with the
// JS stack of the close() call. `__d14.onOpen(runId, fn)` runs fn once that run's socket is open.
const initScript = () => {
  const d14 = { sockets: [], closes: [], waiters: [] }
  window.__d14 = d14
  const NativeWebSocket = window.WebSocket
  const nativeClose = NativeWebSocket.prototype.close
  NativeWebSocket.prototype.close = function (...args) {
    if (this.__d14) {
      let submissionPending = null, status = null
      try {
        const runId = this.url.split('?')[0].split('/').pop()
        const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia
        const context = pinia._s.get('agentContexts')?.runs?.get(runId)
        submissionPending = context?.submissionPending ?? null
        status = context?.state?.currentStatus ?? null
      } catch {}
      d14.closes.push({ url: this.url, at: Date.now(), submissionPending, status, stack: new Error('WebSocket.close').stack })
    }
    return nativeClose.apply(this, args)
  }
  window.WebSocket = new Proxy(NativeWebSocket, {
    construct(target, args) {
      const socket = new target(...args)
      const url = String(args[0])
      if (/\/ws\/agent\//.test(url) || /\/agent\/[^/?]+(\?|$)/.test(url)) {
        socket.__d14 = true
        const entry = { url, createdAt: Date.now(), openedAt: null, closedAt: null, code: null }
        d14.sockets.push(entry)
        socket.addEventListener('open', () => {
          entry.openedAt = Date.now()
          for (const waiter of d14.waiters.splice(0)) {
            if (url.split('?')[0].endsWith(`/${waiter.runId}`)) setTimeout(waiter.fn, 0); else d14.waiters.push(waiter)
          }
        })
        socket.addEventListener('close', (event) => { entry.closedAt = Date.now(); entry.code = event.code })
        entry.frames = []
        socket.addEventListener('message', (event) => {
          entry.frames.push({ at: Date.now(), data: String(event.data).slice(0, 300) })
        })
      }
      return socket
    },
  })
  d14.onOpen = (runId, fn) => {
    const open = d14.sockets.find((s) => s.url.split('?')[0].endsWith(`/${runId}`) && s.openedAt && !s.closedAt)
    if (open) setTimeout(fn, 0); else d14.waiters.push({ runId, fn })
  }
  d14.refreshTree = () => {
    const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia
    d14.refreshIssuedAt = Date.now()
    return pinia._s.get('runHistory').refreshTreeQuietly()
  }
}

let ownedRoot, dataRoot, backendUrl, frontUrl, browser, exitCode = 0
const gqlBody = async (body) => (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(30000) })).text()

const sel = (t) => `[data-test="${t}"]`
const composerInput = (page) => page.locator(`${sel('chat-composer')} textarea`).first()
const waitForReply = (page, marker, timeout) => page.waitForFunction(({ m }) => {
  const root = document.querySelector('[data-test="chat-run-view"]')
  return !!root && [...root.querySelectorAll('*')].some((n) => n.children.length === 0 && n.textContent.trim() === m)
}, { m: marker }, { timeout })
const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(800)
}
const pickModel = async (page) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtime}`)).click()
  await page.locator('[data-test^="chat-model-option-"]').first().waitFor({ timeout: 120000 })
  const models = await page.locator('[data-test^="chat-model-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = models.includes(preferredModel) ? preferredModel : models[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  return chosen
}
const routeRunId = (page) => new URL(page.url()).searchParams.get('id')
const pageCloses = (page) => page.evaluate(() => ({ closes: window.__d14.closes, sockets: window.__d14.sockets, refreshIssuedAt: window.__d14.refreshIssuedAt ?? null }))

// Deterministic F-02 reproduction.
const runStale = async (page, index) => {
  let treeBody = null, staleBody = null, preparedRunId = null, staleServedAt = null
  await page.route('**/graphql', async (route) => {
    const body = route.request().postData() ?? ''
    if (/ListWorkspaceRunHistory/.test(body)) {
      if (staleBody && preparedRunId && !staleServedAt) {
        staleServedAt = Date.now()
        return route.fulfill({ status: 200, contentType: 'application/json', body: staleBody })
      }
      treeBody = body
      return route.continue()
    }
    if (/prepareAgentRun/i.test(body) && !preparedRunId) {
      const response = await route.fetch()
      const text = await response.text()
      const runId = JSON.parse(text)?.data?.prepareAgentRun?.runId ?? null
      // Snapshot taken before the page even learns P: P is prepared but not active.
      staleBody = await gqlBody(treeBody)
      preparedRunId = runId
      await route.fulfill({ response, body: text })
      await page.evaluate((id) => window.__d14.onOpen(id, () => void window.__d14.refreshTree()), runId)
      return
    }
    return route.continue()
  })
  try {
    await newChat(page)
    await waitFor('a tree request to replay', async () => treeBody, 30000)
    const model = await pickModel(page)
    const marker = `D14-STALE-${index}`
    await composerInput(page).fill(`Reply with exactly ${marker} and nothing else.`)
    await page.locator(sel('chat-primary-action')).first().click()
    let replied = true, error = null
    try { await waitForReply(page, marker, 120000) } catch (e) { replied = false; error = e.message }
    const recorded = await pageCloses(page)
    const prepared = recorded.sockets.filter((s) => s.url.split('?')[0].endsWith(`/${preparedRunId}`))
    const reconcileCloses = recorded.closes.filter((c) => c.url.split('?')[0].endsWith(`/${preparedRunId}`))
    const staleInStale = staleBody ? !JSON.parse(staleBody).data.listWorkspaceRunHistory.some((g) => (g.agentDefinitions ?? []).some((d) => (d.runs ?? []).some((r) => r.runId === preparedRunId && r.isActive))) : null
    return { model, preparedRunId, routeRunId: routeRunId(page), staleServedAt, staleSnapshotHadPInactive: staleInStale, replied, error, preparedSockets: prepared, closesOfP: reconcileCloses, status: await page.locator(sel('chat-run-status')).innerText().catch(() => null) }
  } finally { await page.unroute('**/graphql') }
}

// C07 journey with the normal poll.
const runResend = async (page, index) => {
  let injected = 0
  await page.route('**/graphql', async (route) => {
    if (injected === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) {
      injected += 1
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected prepare failure (probe)' }] }) })
    }
    return route.continue()
  })
  try {
    await newChat(page)
    const model = await pickModel(page)
    const marker = `D14-RESENT-${index}`
    const prompt = `Reply with exactly ${marker} and nothing else.`
    await composerInput(page).fill(prompt)
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
    await page.getByText('Injected prepare failure (probe)').first().waitFor({ timeout: 30000 })
    // Vary the phase of the 5 s tree poll relative to the resend.
    const pause = Math.round(Math.random() * 6000)
    await delay(pause)
    if (!(await composerInput(page).inputValue())) await composerInput(page).fill(prompt)
    await page.locator(sel('chat-primary-action')).first().click()
    let permanent = null, replied = true, error = null
    try {
      await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
      permanent = routeRunId(page)
      await waitForReply(page, marker, 180000)
    } catch (e) { replied = false; error = e.message }
    const recorded = await pageCloses(page)
    return { model, pauseMs: pause, permanentRunId: permanent, replied, error, agentSocketCloses: recorded.closes.map((c) => ({ url: c.url, stack: c.stack.split('\n').slice(0, 8).join('\n') })) }
  } finally { await page.unroute('**/graphql') }
}

try {
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cie-d14-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir,
    { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' })
  await waitFor('backend health', async () => { if (backend.exitCode !== null) throw new Error('backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  await context.addInitScript(initScript)
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  for (let i = 1; i <= repeat; i += 1) {
    const started = Date.now()
    let result
    try { result = scenario === 'stale' ? await runStale(page, i) : await runResend(page, i) } catch (e) { result = { replied: false, error: `probe error: ${e.message}` } }
    result.iteration = i; result.ms = Date.now() - started
    if (!result.replied) exitCode = 1
    evidence.iterations.push(result)
    console.log(`${scenario} #${i}: ${result.replied ? 'reply streamed' : `LOST (${result.error})`}${result.closesOfP ? `; closes of P: ${result.closesOfP.length}` : ''}`)
    await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
  }
  evidence.summary = { iterations: repeat, losses: evidence.iterations.filter((r) => !r.replied).length }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[d14] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence.summary ?? { fatal: evidence.fatal }))
  process.exitCode = exitCode
}
