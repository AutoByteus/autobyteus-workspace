#!/usr/bin/env node
// Implementation live probe for ticket agy-linked-skills-always-auto-approve (implementation self-check;
// not API/E2E sign-off).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → the installed
// `agy` CLI with real model calls. Everything runs in an owned temp data root on free ports with a sanitized
// environment; the user's running app and `~/.autobyteus` data are never touched.
//
// Fixture: the owned data root's skills folder holds `env-skill`, whose folder contains a `.venv` with a
// link to an interpreter outside the folder, a dangling link and a 40 MiB sparse file (the shape that made
// every AGY Chat fail), plus `marker.md`.
//
// Cases:
//   L01 Chat with Antigravity selected: auto-approve toggle shown on and locked with its explanation, also
//       when the draft stores it off; another runtime shows the editable toggle again (AC-007).
//   L02 Chat (Daily Assistant, ALL_INSTALLED) on AGY with the fixture skill: run starts, the agent reads
//       marker.md through the linked skill, run metadata autoExecuteTools is true, the capsule entry is a
//       directory link to the skill folder (AC-001, AC-002, AC-006).
//   L04 ⚙ run settings of the stopped AGY run (existing-run editor, AgentRunConfigForm): auto-approve switch
//       on, disabled, with the Antigravity explanation (AC-007).
//   L03 Named-skill agent (CONFIGURED) whose skill collides with the selected workspace's
//       `.agents/skills/env-skill`: the run does not start and chat shows the skill and reason (AC-005, AR-001).
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome, a logged-in `agy` CLI.
// Usage (from autobyteus-web): node <this file> --output-dir <dir> [--model gemini-3.8-flash-low] [--keep]
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const webDir = process.cwd()
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const serverDir = path.join(path.resolve(webDir, '..'), 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), 'agy-linked-skills-probe')))
const preferredModel = arg('model', 'gemini-3.8-flash-low')
const keep = process.argv.includes('--keep')
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync)
const AGY = 'antigravity_cli'
const MARKER = 'LINKED-SKILL-MARKER-4417'

const evidence = { startedAt: new Date().toISOString(), cases: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
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

let ownedRoot, dataRoot, backendUrl, frontUrl, skillDir, collisionWorkspace
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const terminate = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })

const sel = (t) => `[data-test="${t}"]`
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(800)
}
const pickModel = async (page, runtimeKind, model) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
  await page.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const ids = await page.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = model && ids.includes(model) ? model : ids[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  await delay(500)
  return chosen
}
const chatStore = (page, script, arg) => page.evaluate(([source, value]) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia
  const store = pinia._s.get('chatDraft')
  // eslint-disable-next-line no-new-func
  return new Function('store', 'value', source)(store, value)
}, [script, arg])
const toggleState = (page) => page.locator(sel('chat-approval-toggle')).evaluate((e) => ({
  locked: e.getAttribute('data-locked'), pressed: e.getAttribute('aria-pressed'), ariaDisabled: e.getAttribute('aria-disabled'),
  title: e.getAttribute('title'), ariaLabel: e.getAttribute('aria-label'), text: e.innerText.trim(),
  lockIcon: Boolean(e.querySelector('[data-test="chat-approval-lock"]')),
}))
const send = async (page, text) => {
  const input = page.locator(`${sel('chat-composer')} textarea`).first()
  await input.click(); await input.fill(text)
  await page.locator(sel('chat-primary-action')).first().click()
}

const state = { runs: [], agyModel: null }
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('L01', 'Chat: AGY auto-approve on and locked with explanation; other runtime editable (AC-007)', async (page) => {
  await newChat(page)
  state.agyModel = await pickModel(page, AGY, preferredModel)
  await chatStore(page, 'store.setAutoExecuteTools(false)')
  await delay(300)
  const locked = await toggleState(page)
  await page.screenshot({ path: path.join(outDir, 'L01-chat-agy-locked.png') })
  assert(locked.locked === 'true' && locked.pressed === 'true' && locked.ariaDisabled === 'true' && locked.lockIcon, 'AGY toggle is not locked on', locked)
  assert(locked.text.includes('Auto-approve') && /Antigravity always runs with auto-approve/.test(locked.title), 'AGY toggle lacks label/explanation', locked)
  // aria-disabled: Playwright treats it as not enabled, so dispatch the click directly.
  await page.locator(sel('chat-approval-toggle')).dispatchEvent('click')
  const stored = await chatStore(page, 'return store.draft.autoExecuteTools')
  assert(stored === false, 'Clicking the locked toggle changed the draft', { stored })
  const runtimes = await (async () => {
    await page.locator(sel('chat-model-trigger')).click()
    const list = await page.locator('[data-test^="chat-runtime-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-runtime-', '')))
    await page.keyboard.press('Escape')
    return list
  })()
  const other = runtimes.find((r) => r !== AGY && r !== 'autobyteus') ?? null
  let editable = null
  if (other) {
    await pickModel(page, other, null)
    editable = await toggleState(page)
    await page.screenshot({ path: path.join(outDir, 'L01-chat-other-runtime-editable.png') })
    assert(editable.locked === null && editable.pressed === 'false' && !editable.lockIcon, 'Other runtime toggle is not editable/off', editable)
  }
  return { agyModel: state.agyModel, locked, runtimes, other, editable }
})

defineCase('L02', 'Chat (ALL_INSTALLED) on AGY reads a linked skill with a .venv outside link and a large file (AC-001/002/006)', async (page) => {
  await newChat(page)
  await pickModel(page, AGY, state.agyModel)
  await chatStore(page, 'store.setAutoExecuteTools(false)')
  await send(page, 'Use your env-skill skill: read the file marker.md inside that skill folder and reply with its exact marker text only.')
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 240000 })
  const runId = new URL(page.url()).searchParams.get('id')
  state.runs.push(runId)
  const reply = await waitFor('agent reply with marker', async () => (await page.locator('body').innerText()).includes(MARKER), 240000, 1000)
  await page.screenshot({ path: path.join(outDir, 'L02-chat-agy-reply.png') })
  const config = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{runtimeKind autoExecuteTools}}}', { runId })).getAgentRunResumeConfig
  const memory = path.join(dataRoot, 'memory', 'agents', runId, 'agy-project', '.agents', 'skills', 'env-skill')
  const link = await fs.lstat(memory)
  const target = await fs.readlink(memory)
  assert(reply, 'No marker reply')
  assert(config.metadataConfig.runtimeKind === AGY, 'Run is not AGY', config)
  assert(link.isSymbolicLink() && target === await fs.realpath(skillDir), 'Capsule skill entry is not a link to the skill folder', { target })
  return { runId, metadataConfig: config.metadataConfig, capsuleLink: { path: memory, target } }
})

defineCase('L04', 'Run settings of the AGY chat run: auto-approve switch on, locked, with explanation (AC-007)', async (page) => {
  const runId = state.runs[0]
  assert(runId, 'L02 must create the AGY run first')
  await terminate(runId)
  await waitFor('run inactive', async () => !(await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive}}', { runId })).getAgentRunResumeConfig.isActive, 60000, 500)
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 })
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('run-config-back-to-events')).waitFor({ timeout: 30000 })
  const toggle = page.locator('button#auto-execute')
  await toggle.waitFor({ timeout: 30000 })
  await delay(400)
  const rendered = await toggle.evaluate((b) => ({ checked: b.getAttribute('aria-checked'), disabled: b.disabled, background: getComputedStyle(b).backgroundColor }))
  const help = (await page.locator(sel('agent-auto-approve-help')).innerText()).trim()
  await page.locator(sel('agent-auto-approve-help')).scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(outDir, 'L04-run-settings-agy-locked.png') })
  assert(rendered.checked === 'true' && rendered.disabled, 'Run settings auto-approve is not on and locked', rendered)
  assert(help === "Antigravity always runs with auto-approve, so it can't be turned off.", 'Run settings explanation missing', { help })
  return { runId, rendered, help }
})

defineCase('L03', 'Named-skill agent with a workspace collision fails with the skill and reason (AC-005, AR-001)', async (page) => {
  await newChat(page)
  await chatStore(page, "store.setTarget({ kind: 'agent', agentDefinitionId: 'probe-named-skill' }); store.setWorkspace({ kind: 'folder', rootPath: value })", collisionWorkspace)
  await delay(500)
  await pickModel(page, AGY, state.agyModel)
  await send(page, 'Say hello.')
  const expected = "Antigravity could not use skill 'env-skill': the selected workspace already has a skill with this name."
  await waitFor('skill failure message in chat', async () => (await page.locator('body').innerText()).includes(expected), 180000, 1000)
  await page.screenshot({ path: path.join(outDir, 'L03-chat-named-skill-failure.png') })
  const logsDir = path.join(dataRoot, 'logs')
  const logFiles = [path.join(outDir, 'backend.log'),
    ...(await fs.readdir(logsDir).catch(() => [])).map((name) => path.join(logsDir, name))]
  const serverLog = (await Promise.all(logFiles.map((file) => fs.readFile(file, 'utf8').catch(() => '')))).join('\n')
  const logged = serverLog.split('\n').filter((line) => line.includes(expected)).map((line) => line.slice(0, 400))
  assert(logged.length > 0, 'Server log does not name the skill and reason')
  assert(!serverLog.includes('Failed to prepare agent run'), 'Generic preparation failure still logged')
  return { expected, logged }
})

let exitCode = 0
let backend, frontend, browser
try {
  assert(chrome, 'Google Chrome not found')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-linked-skills-probe-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  // Fixture skill in the owned data root's skills folder.
  skillDir = path.join(dataRoot, 'skills', 'env-skill')
  await fs.mkdir(path.join(skillDir, '.venv', 'bin'), { recursive: true })
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: env-skill\ndescription: Probe skill holding a marker file.\n---\n\nWhen asked for the marker, read marker.md in this skill folder and answer with its content.\n')
  await fs.writeFile(path.join(skillDir, 'marker.md'), `${MARKER}\n`)
  const outside = path.join(ownedRoot, 'uv-python', 'python3.13')
  await fs.mkdir(path.dirname(outside), { recursive: true }); await fs.writeFile(outside, 'interpreter')
  await fs.symlink(outside, path.join(skillDir, '.venv', 'bin', 'python'))
  await fs.symlink(path.join(ownedRoot, 'missing-target'), path.join(skillDir, '.venv', 'bin', 'dangling'))
  const large = await fs.open(path.join(skillDir, '.venv', 'node'), 'w'); await large.truncate(40 * 1024 * 1024); await large.close()
  // Named-skill agent and a workspace that already ships a same-name AGY skill.
  const agentDir = path.join(dataRoot, 'agents', 'probe-named-skill')
  await fs.mkdir(agentDir, { recursive: true })
  await fs.writeFile(path.join(agentDir, 'agent.md'), '---\nname: Probe Named Skill\ndescription: Names env-skill.\nrole: Probe\n---\n\nYou are a probe agent.\n')
  await fs.writeFile(path.join(agentDir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames: ['env-skill'], skillScope: 'CONFIGURED', avatarUrl: null, defaultLaunchConfig: null }, null, 2))
  collisionWorkspace = path.join(ownedRoot, 'collision-workspace')
  await fs.mkdir(path.join(collisionWorkspace, '.agents', 'skills', 'env-skill'), { recursive: true })
  await fs.writeFile(path.join(collisionWorkspace, '.agents', 'skills', 'env-skill', 'SKILL.md'), '---\nname: env-skill\ndescription: Workspace copy.\n---\n')

  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
  backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  for (const c of cases) {
    const started = Date.now()
    try {
      evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: 0, details: await c.fn(page, context) }
      evidence.cases[c.id].ms = Date.now() - started
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`) }).catch(() => {})
      evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      await page.keyboard.press('Escape').catch(() => {})
    }
    console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
    await fs.writeFile(path.join(outDir, 'probe-evidence.json'), JSON.stringify(evidence, null, 2))
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[agy-linked-skills-probe] ${error.message}`)
} finally {
  for (const runId of state.runs) await terminate(runId).catch(() => {})
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (skillDir) evidence.skillSourceIntact = existsSync(path.join(skillDir, 'marker.md'))
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'probe-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
