#!/usr/bin/env node
// Temporary API/E2E probe (TC-007): real Chrome → Nuxt dev → built backend (dist/app.js) → fake AGY CLI
// (tests/fixtures/agy-failure-cli.mjs, case mcp_calls). Owned temp data root, free ports, sanitized env.
// Usage: node tc-007-activity-panel-probe.mjs <worktree root> <output dir>
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const rootDir = path.resolve(process.argv[2]); const outDir = path.resolve(process.argv[3])
const webDir = path.join(rootDir, 'autobyteus-web'); const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const fakeAgy = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const waitFor = async (label, fn, timeout = 90000, interval = 250) => { const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`) }
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => { const log = createWriteStream(path.join(outDir, `tc-007-${label}.log`))
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log); owned.push(child); return child }
const stopOwned = async (child) => { if (child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  return exited ? 'SIGTERM' : 'SIGKILL' }
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const evidence = { startedAt: new Date().toISOString(), steps: {}, cleanup: [] }
let ownedRoot, browser, exitCode = 0

// Reads the rendered Activity feed: every item's title and status, expanding each item to read its sections.
const readActivity = async (page) => {
  const feed = page.locator(sel('activity-feed-scroll-container'))
  await feed.waitFor({ timeout: 60000 })
  const count = await feed.locator('span.truncate.font-bold').count()
  const items = []
  for (let i = 0; i < count; i += 1) {
    const title = feed.locator('span.truncate.font-bold').nth(i)
    const card = title.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
    // Items are expanded by default; their Arguments / Result / Error sections are opened by their labels.
    const labels = card.locator('span.text-xs.font-semibold')
    for (let j = 0; j < await labels.count(); j += 1) await labels.nth(j).click()
    await delay(150)
    const sections = await card.locator('div.font-mono').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText))
    items.push({ title: (await title.innerText()).trim(), text: await card.innerText(),
      status: (await card.locator('span.uppercase').first().innerText()).trim(), sections })
  }
  return items
}
const json = (text) => { try { return JSON.parse(text) } catch { return text } }
const check = (items, label) => {
  const titles = items.map((i) => i.title)
  assert(JSON.stringify(titles) === JSON.stringify(['view_file', 'delegate_task', 'mcp__shape-test__echo_args',
    'mcp__shape-test__json_result', 'mcp__shape-test__always_fails', 'call_mcp_tool', 'generate_image']),
  `${label}: Activity titles`, titles)
  const delegate = items[1]
  assert(JSON.stringify(json(delegate.sections[0])) === JSON.stringify({ description: 'Summarise the report.', recipient_address: '/researcher' }),
    `${label}: delegate_task arguments`, delegate.sections)
  assert(JSON.stringify(json(delegate.sections[1])) === JSON.stringify({ provider_state: 'DONE',
    output: { target_agent_run_id: 'run-7318', message: 'Task delegated.' } }), `${label}: delegate_task result`, delegate.sections)
  assert(!/ServerName|ToolName/.test(delegate.sections.join('\n')), `${label}: wrapper leaked into delegate_task`, delegate.sections)
  assert(JSON.stringify(json(items[2].sections[0])) === JSON.stringify({ note: 'hello', options: { count: 2, tags: ['a', 'b'] } }),
    `${label}: third-party arguments`, items[2].sections)
  assert(/PROBE-FAILURE-9920/.test(items[4].text), `${label}: failure text`, items[4])
  assert(JSON.stringify(json(items[5].sections[0])) === JSON.stringify({ Arguments: { content: 'no server name' }, ToolName: 'send_message_to' }),
    `${label}: incomplete wrapper arguments`, items[5].sections)
  return items.map((i) => ({ title: i.title, status: i.status }))
}

try {
  assert(existsSync(chrome), 'Google Chrome not found'); assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agy-mcp-activity-')))
  const dataRoot = path.join(ownedRoot, 'server-data'); const workspace = path.join(ownedRoot, 'workspace')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true }); await fs.mkdir(workspace)
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  const backendUrl = `http://127.0.0.1:${backendPort}`; const frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => { const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'],
    { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
  child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`)))) })
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir,
    { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
      ANTIGRAVITY_CLI_COMMAND: fakeAgy, AGY_FAKE_CASE: 'mcp_calls', AGY_FAKE_MCP_IMAGE_PATH: path.join(workspace, 'mcp-blue-dog.png') })
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors

  // The user starts a chat with the Antigravity runtime and sends one message.
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await delay(1000)
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel('chat-runtime-antigravity_cli')).click()
  const modelRow = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
  await page.locator(modelRow).first().waitFor({ timeout: 120000 }); await page.locator(modelRow).first().click()
  await page.locator(sel('chat-workspace-trigger')).click(); await page.locator(sel('chat-workspace-open-folder')).click()
  const folder = page.locator(`${sel('chat-workspace-folder-form')} input`); await folder.fill(workspace); await folder.press('Enter')
  await delay(500)
  await page.locator(`${sel('chat-composer')} textarea`).first().fill('Delegate the report summary and call the MCP tools.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="agent-workspace-surface"] *')]
    .some((n) => n.children.length === 0 && n.textContent.trim() === 'MCP_DONE'), null, { timeout: 120000 })
  const runId = new URL(page.url()).searchParams.get('id'); assert(runId, 'no run id in the route'); evidence.runId = runId
  evidence.steps.selectedRightTab = (await page.locator(`${sel('right-side-tab-list')} [aria-selected="true"]`).first().innerText()).trim()
  evidence.steps.live = check(await readActivity(page), 'live')
  const conversation = await page.locator(RUN_VIEW).innerText()
  for (const name of ['delegate_task', 'mcp__shape-test__echo_args']) assert(conversation.includes(name), `conversation lacks ${name}`)
  evidence.steps.conversationHasWrapperOnlyForFallback = (conversation.match(/call_mcp_tool/g) ?? []).length
  await page.screenshot({ path: path.join(outDir, 'tc-007-live-activity.png') })

  // The user reloads the open run (history hydration of an active run).
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 }); await delay(2500)
  evidence.steps.reloaded = check(await readActivity(page), 'reloaded')

  // The user stops the run and reopens it from history.
  await page.locator(`[data-test="terminate-agent-run"][data-run-id="${runId}"]`).click(); await delay(2500)
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 }); await delay(2500)
  evidence.steps.reopenedAfterStop = check(await readActivity(page), 'reopened')
  await page.screenshot({ path: path.join(outDir, 'tc-007-reopened-activity.png') })
  assert(browserErrors.length === 0, 'page errors', browserErrors)
  evidence.result = 'Pass'
} catch (error) {
  exitCode = 1; evidence.result = 'Fail'; evidence.error = String(error?.stack ?? error); evidence.details = error.details ?? null
  console.error(error.message, JSON.stringify(error.details ?? null, null, 2))
  for (const p of browser?.contexts()[0]?.pages() ?? []) await p.screenshot({ path: path.join(outDir, 'tc-007-failure.png') }).catch(() => {})
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'tc-007-activity-panel-evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(`TC-007 ${evidence.result}`)
  process.exitCode = exitCode
}
