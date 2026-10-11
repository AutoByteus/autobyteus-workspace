// Temporary rendered check (C55-BR-001) for claude-sonnet-haiku-5-5-model-support.
// Real Chrome → real Nuxt dev (this worktree) → real built backend (dist/app.js) with an owned temp data root,
// free ports, sanitized env; the Anthropic key is imported into the owned DB with the documented importer.
// Usage: node c55-thinking-menu-probe.mjs <worktree> <outDir> <envSource>
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const [worktree, outDir, envSource] = process.argv.slice(2)
const webDir = path.join(worktree, 'autobyteus-web')
const serverDir = path.join(worktree, 'autobyteus-server-ts')
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const RUNTIME = 'autobyteus'
const MODELS = [
  { value: 'claude-sonnet-5-5', display: 'summarized' },
  { value: 'claude-haiku-5-5', display: 'omitted' },
]

const evidence = { startedAt: new Date().toISOString(), cases: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
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
const runCmd = (command, args, cwd, env, input) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
  let out = ''
  child.stdout.on('data', (d) => { out += d }); child.stderr.on('data', (d) => { out += d })
  if (input) child.stdin.write(input)
  child.stdin.end()
  child.once('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`${command} ${args[0]} exited ${code}: ${out.slice(-500)}`))))
})

let ownedRoot, backendUrl, frontUrl
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(60000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}

const sel = (t) => `[data-test="${t}"]`
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(800)
}
const openRuntimeList = async (page, runtimeKind) => {
  const list = page.locator(sel(`chat-model-list-${runtimeKind}`))
  const row = page.locator(sel(`chat-runtime-${runtimeKind}`))
  for (let attempt = 0; attempt < 6 && !(await list.isVisible().catch(() => false)); attempt += 1) {
    await row.hover().catch(() => {}); await delay(400)
    if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await delay(700) }
  }
  await list.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const rowBox = await row.boundingBox({ timeout: 1000 }).catch(() => null)
  const listBox = await list.boundingBox({ timeout: 1000 }).catch(() => null)
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 })
  return list
}
const draftConfig = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia
  const store = pinia._s.get('chatDraft')
  return JSON.parse(JSON.stringify(store?.draft?.context?.config?.llmConfig ?? null))
})
const triggerText = async (page) => (await page.locator(sel('chat-thinking-trigger')).innerText()).trim()
const openThinking = async (page) => {
  if (!(await page.locator(sel('chat-thinking-menu')).isVisible().catch(() => false))) await page.locator(sel('chat-thinking-trigger')).click()
  await page.locator(sel('chat-thinking-menu')).waitFor()
}
const thinkingMenu = (page) => page.locator(sel('chat-thinking-menu')).evaluate((menu) => ({
  items: [...menu.querySelectorAll('[role="menuitemradio"]')].map((e) => ({ test: e.getAttribute('data-test'), label: e.innerText.trim(), checked: e.getAttribute('aria-checked') })),
  text: menu.innerText,
}))
const checked = (m) => m.items.filter((i) => i.checked === 'true').map((i) => i.test)

let exitCode = 0
let backend, frontend, browser
const ids = {}
try {
  assert(chrome, 'Chrome not found')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'c55-thinking-menu-'))
  const dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  const dbEnv = { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }
  await runCmd('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], serverDir, dbEnv)
  // Documented importer (TESTING.md): answers the IMPORT prompt; output lists aliases only, never values.
  // No interactive terminal here: wrap in `script` (TESTING.md, macOS) so the prompt gets a TTY.
  const importOut = await runCmd('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), 'pty-answer.py'), process.execPath, path.join(serverDir, 'dist/secret-management/cli/import-local-environment-secrets.js'), '--source', envSource, '--database-url', dbUrl], serverDir, dbEnv, 'IMPORT\n')
  evidence.importSummary = importOut.split('\n').filter((l) => /^(TARGET|IMPORT|RESULT|SAVED|SKIP|STATUS)/.test(l) || /ANTHROPIC/.test(l)).map((l) => l.replace(/=.*/, '=<redacted>')).slice(0, 40)
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
  backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  const snap = await gql('mutation($p:String!,$r:String){ensureProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier value configSchema}}}', { p: 'ANTHROPIC', r: RUNTIME })
  for (const m of MODELS) ids[m.value] = snap.ensureProviderModelCatalog.llmModels.find((x) => x.value === m.value)?.modelIdentifier
  evidence.modelIdentifiers = ids
  assert(MODELS.every((m) => ids[m.value]), 'models missing from backend catalog', ids)
  const workspaceDir = path.join(ownedRoot, 'workspace'); await fs.mkdir(workspaceDir, { recursive: true })
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceDir } })

  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  // Warm-up: the first Nuxt visit may re-optimize deps and reload.
  await newChat(page); await delay(5000)

  for (const model of MODELS) {
    const caseId = `C55-BR-001-${model.value}`
    try {
      await newChat(page)
      await page.locator(sel('chat-model-trigger')).click()
      const list = await openRuntimeList(page, RUNTIME)
      const listed = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test')))
      assert(listed.filter((t) => t === `chat-model-option-${ids[model.value]}`).length === 1, 'model row not listed exactly once', listed)
      await list.locator(sel(`chat-model-option-${ids[model.value]}`)).click()
      await page.locator(sel('chat-thinking-trigger')).waitFor({ timeout: 30000 })
      await delay(500)
      const initial = { trigger: await triggerText(page), draft: await draftConfig(page) }
      await openThinking(page)
      const offMenu = await thinkingMenu(page)
      await page.screenshot({ path: path.join(outDir, `${caseId}-off-menu.png`) })
      const primaryIds = offMenu.items.filter((i) => i.test.startsWith('chat-thinking-option-primary-')).map((i) => i.test.replace('chat-thinking-option-primary-', ''))
      const displayIds = offMenu.items.filter((i) => i.test.startsWith('chat-thinking-option-thinking_display-')).map((i) => i.test.replace('chat-thinking-option-thinking_display-', ''))
      assert(initial.trigger === 'Off', 'trigger is not Off for a fresh draft', initial)
      assert(eq(initial.draft, { thinking_enabled: false, thinking_display: model.display }), 'fresh draft llmConfig is not the schema defaults', initial)
      assert(eq(primaryIds, ['off', 'on']), 'primary options are not Off/On', offMenu)
      assert(eq(displayIds, ['omitted', 'summarized']), 'display options wrong', offMenu)
      assert(checked(offMenu).includes('chat-thinking-option-primary-off'), 'Off not checked', offMenu)
      // Existing menu design (chatThinkingMenu showSelection): dependent options show no selection while thinking is Off.
      assert(!checked(offMenu).some((t) => t.startsWith('chat-thinking-option-thinking_display-')), 'a display option is checked while Off', offMenu)
      await page.locator(sel('chat-thinking-option-primary-on')).click()
      await delay(400)
      const on = { trigger: await triggerText(page), draft: await draftConfig(page) }
      assert(on.trigger === 'On' && on.draft?.thinking_enabled === true && on.draft?.thinking_display === model.display, 'On did not enable thinking keeping the display default', on)
      await openThinking(page)
      const onMenu = await thinkingMenu(page)
      assert(eq(checked(onMenu), ['chat-thinking-option-primary-on', `chat-thinking-option-thinking_display-${model.display}`]), `On menu: display ${model.display} not preselected`, onMenu)
      await page.screenshot({ path: path.join(outDir, `${caseId}-on-menu.png`) })
      const other = model.display === 'summarized' ? 'omitted' : 'summarized'
      await page.locator(sel(`chat-thinking-option-thinking_display-${other}`)).click()
      await delay(400)
      const switched = { trigger: await triggerText(page), draft: await draftConfig(page) }
      assert(switched.draft?.thinking_enabled === true && switched.draft?.thinking_display === other, 'display switch not recorded', switched)
      await page.keyboard.press('Escape').catch(() => {})
      evidence.cases[caseId] = { result: 'Pass', listed: listed.length, initial, primaryIds, displayIds, offChecked: checked(offMenu), on, onChecked: checked(onMenu), switched }
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${caseId}-failure.png`) }).catch(() => {})
      evidence.cases[caseId] = { result: 'Fail', error: error.message, details: error.details ?? null }
    }
    console.log(caseId, evidence.cases[caseId].result, evidence.cases[caseId].error ?? '')
  }

  // C55-BR-002: a real send from the browser with Haiku 5.5 On launches a run whose stored llmConfig is the menu choice.
  const caseId = 'C55-BR-002-haiku-on-send'
  try {
    await newChat(page)
    await page.locator(sel('chat-model-trigger')).click()
    const list = await openRuntimeList(page, RUNTIME)
    await list.locator(sel(`chat-model-option-${ids['claude-haiku-5-5']}`)).click()
    await page.locator(sel('chat-thinking-trigger')).waitFor({ timeout: 30000 })
    await openThinking(page)
    await page.locator(sel('chat-thinking-option-primary-on')).click()
    await delay(400)
    const input = page.locator(`${sel('chat-composer')} textarea`).first()
    await input.click(); await input.fill('Reply with the single word pong.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const runId = new URL(page.url()).searchParams.get('id')
    const cfg = await waitFor('run config', async () => (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{llmModelIdentifier llmConfig runtimeKind}}}', { runId })).getAgentRunResumeConfig, 60000, 1000)
    const reply = await waitFor('pong in the conversation', async () => {
      const text = await page.locator('body').innerText()
      return /pong/i.test(text.split('Reply with the single word pong.').slice(1).join(' ')) ? true : null
    }, 120000, 1000)
    await page.screenshot({ path: path.join(outDir, `${caseId}.png`) })
    const backendLog = await fs.readFile(path.join(outDir, 'backend.log'), 'utf-8').catch(() => '')
    const providerErrors = backendLog.split('\n').filter((l) => /\b400\b|invalid_request_error|does not support/i.test(l)).slice(0, 5)
    assert(cfg.metadataConfig.llmModelIdentifier === ids['claude-haiku-5-5'] && cfg.metadataConfig.runtimeKind === RUNTIME, 'run model/runtime wrong', cfg)
    assert(cfg.metadataConfig.llmConfig?.thinking_enabled === true && cfg.metadataConfig.llmConfig?.thinking_display === 'omitted', 'run llmConfig is not the menu choice', cfg)
    assert(providerErrors.length === 0, 'provider errors in backend log', providerErrors)
    evidence.cases[caseId] = { result: 'Pass', runId, metadataConfig: cfg.metadataConfig, reply }
    await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId }).catch(() => {})
  } catch (error) {
    exitCode = 1
    await page.screenshot({ path: path.join(outDir, `${caseId}-failure.png`) }).catch(() => {})
    evidence.cases[caseId] = { result: 'Fail', error: error.message, details: error.details ?? null }
  }
  console.log(caseId, evidence.cases[caseId].result, evidence.cases[caseId].error ?? '')
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(error.message)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
