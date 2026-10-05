#!/usr/bin/env node
// Temporary API/E2E upgrade probe (ticket daily-assistant-display-name, API-REV-001).
//
// Real use: a user on a beta.3–beta.5 build ("General Agent") has a real chat, then updates.
// Phase OLD runs the worktree `dist` with the two base-commit (6d4f16ef2) production files restored
// (template agent.md + compiled registry displayName). The base→HEAD production diff is exactly
// those two files plus one comment. Phase NEW restores the HEAD files (hash-verified) and restarts
// the backend on the same data root and DB.
// Everything is owned: temp data root, free ports, sanitized env, own Nuxt dev and headless Chrome.
import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '../../../../..')
const webDir = path.join(rootDir, 'autobyteus-web')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const outDir = path.join(scriptDir, 'out')
const BASE = '6d4f16ef2'
const ID = 'autobyteus-daily-assistant'
const NEW_SHA = '49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7'
const OLD_SHA = 'd410e6f60d923ff66849961fd8b15c461fc6c08d254ef66a7d4a92a8299cbe1a'
const runtime = 'codex_app_server'
const preferredModel = 'gpt-5.5'
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const distTemplate = path.join(serverDir, 'dist/built-in-agents/templates/daily-assistant/agent.md')
const distRegistry = path.join(serverDir, 'dist/built-in-agents/built-in-agent-registry.js')

const evidence = { startedAt: new Date().toISOString(), cases: {}, observations: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const sha = (b) => createHash('sha256').update(b).digest('hex')
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
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

let ownedRoot, dataRoot, backend, frontend, browser, backendPort, frontendPort, backendUrl, frontUrl, dbUrl
let backups = null
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const startBackend = async (label) => {
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
  const child = spawnOwned(label, process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor(`${label} health`, async () => { assert(child.exitCode === null, `${label} exited`); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  return child
}
const restoreDist = async () => {
  if (!backups) return null
  await fs.writeFile(distTemplate, backups.template); await fs.writeFile(distRegistry, backups.registry)
  const ok = sha(await fs.readFile(distTemplate)) === backups.templateSha && sha(await fs.readFile(distRegistry)) === backups.registrySha
  backups.restored = ok
  return ok
}

const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const composerInput = (page) => page.locator(`${sel('chat-composer')} textarea`).first()
const runInput = (page) => page.locator(`${RUN_VIEW} textarea`).first()
const runSend = (page) => page.locator(`${RUN_VIEW} button[aria-label="Send message"]`).first()
const routeRunId = (page) => new URL(page.url()).searchParams.get('id')
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 180000 })
  await delay(1000)
}
const pickModel = async (page) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtime}`)).click()
  await page.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const models = await page.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = models.includes(preferredModel) ? preferredModel : models[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  return chosen
}
/** Leaf text node in the run view exactly equal to `marker`, or matching a regex. */
const waitForLeaf = (page, pattern, timeout = 240000) => page.waitForFunction(({ src }) => {
  const root = document.querySelector('[data-testid="agent-workspace-surface"]')
  if (!root) return null
  const re = new RegExp(src)
  const hit = [...root.querySelectorAll('*')].find((n) => n.children.length === 0 && re.test(n.textContent.trim()))
  return hit ? hit.textContent.trim() : null
}, { src: pattern }, { timeout }).then((h) => h.jsonValue())
const historyRows = async () => JSON.parse(await fs.readFile(path.join(dataRoot, 'memory', 'run_history_index.json'), 'utf8'))
const findRows = async () => { const raw = await historyRows(); return Array.isArray(raw) ? raw : (raw.rows ?? Object.values(raw)) }
const treeRows = (page) => page.locator(`[data-test="workspace-agent-row"][data-agent-definition-id="${ID}"]`).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()))

const runtimeOf = async (runId) => (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{runtimeKind llmModelIdentifier}}}', { runId })).getAgentRunResumeConfig.metadataConfig

const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })
const state = {}

defineCase('U-01', 'OLD build: definition is General Agent; a real Chat captures agentName General Agent', async (page) => {
  const { agentDefinition } = await gql(`{ agentDefinition(id:"${ID}"){ id name role } }`)
  assert(agentDefinition.name === 'General Agent', 'Old build did not seed General Agent', agentDefinition)
  const installed = await fs.readFile(path.join(dataRoot, 'agents', ID, 'agent.md'))
  assert(sha(installed) === OLD_SHA, 'Old app-data agent.md is not the v1 General Agent template', sha(installed))
  await newChat(page)
  state.model = await pickModel(page)
  const input = composerInput(page)
  await input.click(); await input.type('Reply with exactly UPGRADE-OLD-OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  state.oldRunId = routeRunId(page)
  await waitForLeaf(page, '^UPGRADE-OLD-OK$')
  const row = (await findRows()).find((r) => r.runId === state.oldRunId)
  assert(row?.agentName === 'General Agent' && row.agentDefinitionId === ID, 'Old run did not capture General Agent', row)
  state.oldTree = await treeRows(page)
  const runConfig = await runtimeOf(state.oldRunId)
  await page.screenshot({ path: path.join(outDir, 'U-01-old-build-chat.png') })
  return { definition: agentDefinition, oldAgentMdSha: sha(installed), oldRunId: state.oldRunId, model: state.model, runConfig, row, tree: state.oldTree }
})

defineCase('U-02', 'Upgrade restart on the same root: Daily Assistant, new hash, one definition, old history row untouched', async () => {
  state.historyBefore = await fs.readFile(path.join(dataRoot, 'memory', 'run_history_index.json'))
  await stopOwned(backend)
  const restored = await restoreDist()
  assert(restored, 'HEAD dist files not restored byte-identically')
  assert(sha(await fs.readFile(distTemplate)) === NEW_SHA, 'Restored dist template is not the approved Daily Assistant template')
  backend = await startBackend('backend-new')
  const { agentDefinitions } = await gql('{ agentDefinitions { id name role description toolNames skillScope instructions } }')
  const da = agentDefinitions.filter((a) => a.id === ID)
  assert(da.length === 1 && da[0].name === 'Daily Assistant' && da[0].role === 'General Agent' && da[0].skillScope === 'ALL_INSTALLED', 'Upgraded identity wrong', da)
  assert(da[0].instructions.startsWith('You are Daily Assistant, a general-purpose agent for practical tasks and requests.'), 'Upgraded instructions line 7 wrong', da[0].instructions.slice(0, 120))
  assert(agentDefinitions.filter((a) => a.name === 'General Agent').length === 0, 'A definition is still named General Agent', agentDefinitions.map((a) => a.name))
  const installed = await fs.readFile(path.join(dataRoot, 'agents', ID, 'agent.md'))
  assert(sha(installed) === NEW_SHA, 'App-data agent.md not refreshed to the new template', sha(installed))
  const historyAfter = await fs.readFile(path.join(dataRoot, 'memory', 'run_history_index.json'))
  assert(historyAfter.equals(state.historyBefore), 'History index rewritten by the upgrade start')
  const hist = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { workspaceRootPath agentDefinitions { agentDefinitionId agentName runs { runId summary } } } }')
  const group = hist.listWorkspaceRunHistory.flatMap((w) => w.agentDefinitions).find((a) => a.runs.some((r) => r.runId === state.oldRunId))
  assert(group?.agentDefinitionId === ID, 'Old run missing from history after upgrade', hist)
  return { definition: { id: da[0].id, name: da[0].name, role: da[0].role, skillScope: da[0].skillScope }, agentMdSha: sha(installed), historyByteIdentical: true, oldRunGroupLabel: group.agentName }
})

defineCase('U-03', 'Agents page and catalog Run show Daily Assistant (New - Daily Assistant)', async (page) => {
  await page.goto(`${frontUrl}/agents`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Daily Assistant', { exact: true }).first().waitFor({ timeout: 180000 })
  const cardTitles = await page.locator('h3').evaluateAll((els) => els.map((e) => e.textContent.trim()))
  assert(cardTitles.includes('Daily Assistant'), 'Agents page has no Daily Assistant card', cardTitles)
  assert(!cardTitles.includes('General Agent'), 'Agents page still has a General Agent card title', cardTitles)
  await page.screenshot({ path: path.join(outDir, 'U-03-agents-page.png') })
  const card = page.locator('div,article,li').filter({ has: page.getByText('Daily Assistant', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await card.getByRole('button', { name: /^Run/ }).first().click()
  await page.locator('main select').first().waitFor({ timeout: 60000 })
  // The launch form's Agent Definition field shows the current definition name.
  const formText = await page.locator('main').first().innerText()
  assert(/Agent Definition\s*\n\s*Daily Assistant/.test(formText), 'Launch form does not name Daily Assistant', formText.slice(0, 300))
  await page.getByText('Select a model', { exact: true }).first().click()
  await page.locator('[role="listbox"] [role="option"]').first().click()
  await page.getByRole('button', { name: 'Run Agent' }).click()
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
  const title = (await page.locator(sel('agent-workspace-title')).first().innerText()).trim()
  assert(title === 'New - Daily Assistant', 'Workspace draft title wrong', title)
  await page.screenshot({ path: path.join(outDir, 'U-03-new-draft-title.png') })
  return { cardTitles: cardTitles.filter((t) => /Daily Assistant|General Agent/.test(t)), draftTitle: title }
})

defineCase('U-04', 'Old run after upgrade: keeps captured label, reopens with its conversation, accepts a follow-up', async (page) => {
  await page.goto(`${frontUrl}/chat?id=${state.oldRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 180000 })
  await waitForLeaf(page, '^UPGRADE-OLD-OK$', 120000)
  const treeAfter = await treeRows(page)
  await runInput(page).fill('Reply with exactly UPGRADE-RESUME-OK and nothing else.')
  await runSend(page).click()
  await waitForLeaf(page, '^UPGRADE-RESUME-OK$')
  assert(routeRunId(page) === state.oldRunId, 'Follow-up moved to another run', page.url())
  const row = (await findRows()).find((r) => r.runId === state.oldRunId)
  assert(row?.agentName === 'General Agent', 'Old snapshot was relabeled', row)
  const projection = (await gql('query($runId:String!){getRunProjection(runId:$runId){conversation}}', { runId: state.oldRunId })).getRunProjection
  const users = projection.conversation.filter((e) => e.role === 'user').map((e) => e.content)
  assert(users.length >= 2, 'Projection lacks both user turns', users)
  await page.screenshot({ path: path.join(outDir, 'U-04-old-run-resumed.png') })
  return { oldRunId: state.oldRunId, capturedAgentName: row.agentName, treeAfterUpgrade: treeAfter, userTurns: users.length }
})

defineCase('U-05', 'New Chat after upgrade: run captures Daily Assistant; the agent introduces itself as Daily Assistant', async (page) => {
  await newChat(page)
  const input = composerInput(page)
  await input.click(); await input.type('What is your name? Answer in the exact form NAME=<your name> and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = routeRunId(page)
  const answer = await waitForLeaf(page, '^NAME=')
  assert(/^NAME=\s*Daily Assistant\.?$/i.test(answer), 'Agent did not introduce itself as Daily Assistant', answer)
  const row = (await findRows()).find((r) => r.runId === runId)
  assert(row?.agentName === 'Daily Assistant' && row.agentDefinitionId === ID, 'New run did not capture Daily Assistant', row)
  const tree = await treeRows(page)
  const hist = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { workspaceRootPath agentDefinitions { agentDefinitionId agentName runs { runId } } } }')
  const groups = hist.listWorkspaceRunHistory.map((w) => ({ ws: w.workspaceRootPath, agents: w.agentDefinitions.filter((a) => a.agentDefinitionId === ID).map((a) => ({ agentName: a.agentName, runIds: a.runs.map((r) => r.runId) })) }))
  await page.screenshot({ path: path.join(outDir, 'U-05-new-chat-name.png') })
  return { runId, answer, runConfig: await runtimeOf(runId), capturedAgentName: row.agentName, tree, historyGroups: groups }
})

let exitCode = 0
try {
  assert(chrome, 'Google Chrome not found')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first')
  await fs.mkdir(outDir, { recursive: true })
  // Back up HEAD dist files and install the base-commit versions (old build).
  const template = await fs.readFile(distTemplate); const registry = await fs.readFile(distRegistry)
  backups = { template, registry, templateSha: sha(template), registrySha: sha(registry) }
  assert(backups.templateSha === NEW_SHA, 'dist template is not the HEAD build', backups.templateSha)
  const baseTemplate = execFileSync('git', ['show', `${BASE}:autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md`], { cwd: rootDir })
  assert(sha(baseTemplate) === OLD_SHA, 'Base template hash unexpected', sha(baseTemplate))
  const baseRegistry = registry.toString('utf8').replace('displayName: "Daily Assistant"', 'displayName: "General Agent"')
  assert(baseRegistry !== registry.toString('utf8'), 'Registry displayName not found in dist')
  await fs.writeFile(distTemplate, baseTemplate); await fs.writeFile(distRegistry, baseRegistry)
  evidence.distSwap = { headTemplateSha: backups.templateSha, headRegistrySha: backups.registrySha, oldTemplateSha: sha(baseTemplate) }

  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'da-upgrade-probe-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  backendPort = await freePort(); frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  backend = await startBackend('backend-old')
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  for (const c of cases) {
    const started = Date.now()
    try {
      const details = await c.fn(page, context)
      evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`) }).catch(() => {})
      evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
    }
    console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
    await fs.writeFile(path.join(outDir, 'upgrade-evidence.json'), JSON.stringify(evidence, null, 2))
    if (evidence.cases[c.id].result === 'Fail' && (c.id === 'U-01' || c.id === 'U-02')) break
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[upgrade-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  evidence.cleanup.push({ distRestored: await restoreDist().catch((e) => `error: ${e.message}`) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'upgrade-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
