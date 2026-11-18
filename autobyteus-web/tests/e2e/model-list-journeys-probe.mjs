#!/usr/bin/env node
// Model-list journeys of autobyteus-9 (model-settings-reality), cases API-11, API-12, API-14, API-14b: the Claude Code CLI changes
// while the app runs and the model pickers follow it. Real browser (Chromium via playwright-core) -> real Nuxt dev -> real built backend
// (`dist/app.js`) on an owned temp data root, free ports and a sanitized environment (a running desktop app and `~/.autobyteus` are never
// touched). Native-runtime models are a test-owned LM Studio stand-in, Antigravity is the scripted CLI
// `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`. It is a web-equivalent journey: it proves the renderer + server boundary, not
// the Electron shell. Derived from runtime-switch-members-probe.mjs (its stack, helpers and Team-run fixtures).
//
// The Claude CLI the backend uses is `CLAUDE_CODE_EXECUTABLE_PATH`, a symlink the probe points at "the CLI before the update", "the CLI
// after the update" and "a CLI that fails" (PRB-D3):
//   --cli scripted (default)  the scripted `claude` of `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs`; its `claude-models`
//                             state file is the model list (before: claude-fake-sonnet; after: + claude-new-model; failing: none). No
//                             credentials, no provider calls: this is the durable, portable mode.
//   --cli real                the SDK-bundled Claude Code CLI (before), the `claude` on PATH (after) and a script that exits 1 (failing); the
//                             Anthropic key comes from the test vault (AUTOBYTEUS_TEST_VAULT) and the one real run of API-11 replies.
//
// API-11  new-run picker: open (list before the update) -> CLI updated -> open again (list usable at once, one read, new model listed, no
//         reload/restart) -> failing CLI: Refresh models keeps the list and shows the error + Retry -> CLI back: Retry -> a new model launches a run
// API-12  stopped Team member: runtime menu -> Claude Agent SDK -> CLI updated -> open again (new model listed) -> pick it; Save refused when the
//         CLI no longer offers it (names the model and scope, "Refresh the model list and choose again.", nothing saved), refused when the CLI
//         fails ("could not be read", nothing saved), Save succeeds when it works (stored selection names the model), then saved back onto the
//         first runtime (A -> B -> A)
// API-14  stopped Team run on the Claude Agent SDK: the Team-level (runtime-locked) model menu re-reads on open and on Refresh models, shows
//         the busy state, keeps its options and shows the error with Retry when the CLI fails (REQ-011, QR-001)
// API-19  AutoByteus runtime, discovered provider: a model the local server (the LM Studio stand-in) starts offering while the app runs
//         appears after "Refresh models" (re-discovery), without a reload or restart (AC-011)
// API-14b the same saved-run menu opened for the first time while the CLI is already failing: the card never says "No longer offered", the
//         menu shows the error with Retry, the run's own model stays editable, Refresh models recovers (AC-012 failure alternate, SR-004)
//
// Run: node autobyteus-web/tests/e2e/model-list-journeys-probe.mjs --output-dir <fresh absolute dir> [--cli scripted|real] [--cases API-11,API-12,API-14,API-14b,API-19]
//        [--browser-executable <chromium>] [--keep] [--hold]
//   A browser page error fails the run (exit 1, `result: Fail`, a recorded failure); `--inject-page-error` self-checks that rule.
//   needs: a current `pnpm -C autobyteus-server-ts build`, Chromium; `--cli real` also needs `claude` on PATH and the test vault
//   (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, provider.anthropic.api-key).
import { execFileSync, spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { attachToBrowserContext, attachToProbeProcess, ownerSocketUrl, withNodeCredential } from './fixtures/probe-node-access.mjs'
// Every node needs a credential (autobyteus-437): the probe's nodes start with its launch credential, and the probe's
// own calls and its desktop browser contexts carry it (fixtures/probe-node-access.mjs).
attachToProbeProcess()

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const serverDir = path.join(path.resolve(webDir, '..'), 'autobyteus-server-ts')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), 'model-list-journeys-out')))
const cliMode = arg('cli', 'scripted')
if (!['scripted', 'real'].includes(cliMode)) throw new Error(`--cli is scripted or real, got ${cliMode}`)
const keep = process.argv.includes('--keep')
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const fakeAgy = process.env.ANTIGRAVITY_CLI_COMMAND || path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const AGY = 'antigravity_cli'
const AGY_MODEL = 'gemini-3.8-flash-low'
const NATIVE = 'autobyteus'
const hold = process.argv.includes('--hold')
const attach = arg('attach', '') // development aid: reuse a stack held by `--hold --keep` (its hold.json)
const onlyCases = arg('cases', '').split(',').filter(Boolean)

const evidence = { startedAt: new Date().toISOString(), result: 'Fail', steps: [], processes: [], cleanup: [], browserErrors: [], failures: [] }
// A browser page error fails the run (TESTING.md "Browser probes"). A page error a case produces on purpose is named here by case id;
// none of these journeys produces one, so nothing is tolerated.
const EXPECTED_PAGE_ERRORS = {}
let currentCase = 'setup'
const recordPageError = (text) => {
  const line = String(text).split('\n')[0]
  evidence.browserErrors.push({ case: currentCase, line, known: Boolean(EXPECTED_PAGE_ERRORS[currentCase]?.test(line)) })
}
/** Self-check of the rule above: `--inject-page-error` makes the page throw once, and the run must end `Fail` with a recorded failure. */
const injectPageError = process.argv.includes('--inject-page-error')
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
  let models = ['rsw-native', 'rsw-native-b']
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ models: models.map((key) => ({ key, max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] })) }))
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
  return { origin: `http://127.0.0.1:${server.address().port}`, setModels: (keys) => { models = [...keys] }, close: () => { server.closeAllConnections(); return new Promise((r) => server.close(r)) } }
}

let ownedRoot, dataRoot, backend, frontend, browser, backendUrl, frontUrl, fake
let startBackend = null
/** Stops the owned backend and starts it again on the same port, data root and environment (a server restart). */
const restartBackend = async () => {
  assert(startBackend, 'the probe did not start this backend (attached stack)')
  await stopOwned(backend)
  backend = startBackend()
  await waitFor('backend health after the restart', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 1000)
  step('the backend was restarted')
}
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


const WS_TIMEOUT = 120000
/** The user (or an agent) acts over the run's backend WebSocket; used to seed history and to wake a copy through its host. */
const socketSend = async (route, rootId, payload, until = null) => {
  const socket = new WebSocket(ownerSocketUrl(`${backendUrl.replace('http', 'ws')}/ws/${route}/${rootId}`))
  const frames = []
  socket.addEventListener('message', (event) => { try { frames.push(JSON.parse(event.data)) } catch {} })
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  await waitFor(`${route} socket ready`, () => frames.some((f) => f.type === 'CONNECTED') || frames.length > 0, 30000, 200)
  const messageId = `probe-${Math.random().toString(16).slice(2)}`
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: messageId, dedupe_key: `agent_run_input:probe:${messageId}`, context_file_paths: [], image_urls: [], ...payload } }))
  if (until) await waitFor(`${route} turn end`, () => frames.some(until), WS_TIMEOUT, 300)
  else await delay(1500)
  await delay(500); socket.close()
  return frames
}
const turnEnded = (frame) => /TURN_COMPLETED|TURN_INTERRUPTED/.test(frame.type) || (frame.type === 'ROOT_EXECUTION_EVENT' && /turn_(completed|interrupted)/i.test(JSON.stringify(frame.payload)))
const talkAgent = (runId, content) => socketSend('agent', runId, { agent_run_id: runId, content }, turnEnded)
const talkTeam = (teamRunId, agentRunId, content) => socketSend('agent-team', teamRunId, { agent_run_id: agentRunId, content }, turnEnded)
const talkOrg = (orgRunId, agentRunId, content) => socketSend('agent-org', orgRunId, { root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: agentRunId, command_id: `probe-${Math.random().toString(16).slice(2)}`, content }, turnEnded)

const definitions = {}
/** Agent, Team and Org definitions, all native by default; a Writer whose default launch is native for the delegated copy. */
const createDefinitions = async (nativeModel) => {
  const agent = async (name, extra = {}) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}',
    { input: { name, description: 'Runtime switch members probe.', role: 'assistant', instructions: 'Reply briefly.', category: 'runtime-e2e', toolNames: [], ...extra } })).createAgentDefinition
  definitions.agent = await agent('Switch Probe Agent')
  definitions.host = await agent('Switch Probe Host')
  definitions.writer = await agent('Switch Probe Writer', { defaultLaunchConfig: { runtimeKind: NATIVE, llmModelIdentifier: nativeModel } })
  definitions.writerAgy = await agent('Switch Probe Writer Agy', { defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: AGY_MODEL } })
  definitions.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name}}', { input: {
    name: 'Switch Probe Team', description: 'Two members.', instructions: 'Wait for input.', coordinatorMemberName: 'lead',
    nodes: ['lead', 'worker'].map((memberName) => ({ memberName, ref: definitions.agent.id, refScope: 'SHARED' })) } })).createAgentTeamDefinition
  definitions.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id name}}', { input: {
    name: 'Switch Probe Org', description: 'A direct Agent and a mounted Team.', instructions: 'Wait for input.',
    members: [{ memberName: 'direct', ref: definitions.agent.id, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'crew', ref: definitions.team.id, refType: 'AGENT_TEAM', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition
}
const nativeLaunch = (model, workspace) => ({ runtimeKind: NATIVE, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace })
const treeFile = (kind, runId) => path.join(dataRoot, 'memory', kind === 'team' ? 'agent_teams' : 'agent_orgs', runId, kind === 'team' ? 'team_run_execution_tree.json' : 'agent_org_run_execution_tree.json')
const walkAgents = (node, out = []) => {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) { for (const item of node) walkAgents(item, out); return out }
  if (typeof node.agentRunId === 'string' && typeof node.address === 'string') out.push(node)
  for (const value of Object.values(node)) walkAgents(value, out)
  return out
}
const memberNode = async (kind, runId, address) => walkAgents(await readJson(treeFile(kind, runId))).find((m) => m.address === address && m.launchConfiguration)
const findFolder = async (base, name, depth = 0) => {
  if (depth > 6) return null
  for (const entry of await fs.readdir(base, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue
    if (entry.name === name) return path.join(base, entry.name)
    const nested = await findFolder(path.join(base, entry.name), name, depth + 1)
    if (nested) return nested
  }
  return null
}
const rawRecords = async (dir, file = 'raw_traces_active.jsonl') => (await fs.readFile(path.join(dir, file), 'utf8').catch(() => '')).split('\n').filter(Boolean).map((l) => JSON.parse(l))

const setup = async () => {
  await gql('mutation($p:String!,$r:String){reloadProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}', { p: 'LMSTUDIO', r: NATIVE })
  const nativeModels = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: NATIVE })).providerModelCatalogSnapshots.flatMap((x) => x.llmModels.map((m) => m.modelIdentifier))
  const nativeModel = nativeModels.find((id) => id.startsWith('rsw-native:'))
  assert(nativeModel, 'the native stand-in model is not offered', nativeModels.slice(0, 5))
  const nativeModelB = nativeModels.find((id) => id.startsWith('rsw-native-b:'))
  assert(nativeModelB, 'the second native stand-in model is not offered', nativeModels.slice(0, 5))
  const workspace = path.join(ownedRoot, 'workspace'); await fs.mkdir(workspace, { recursive: true })
  await createDefinitions(nativeModel)
  return { nativeModel, nativeModelB, workspace }
}

const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

const expandWorkspaces = async (page) => {
  const folders = page.locator(sel('workspace-row'))
  for (let i = 0; i < await folders.count(); i += 1) {
    const row = folders.nth(i)
    const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
    if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
  }
}
const dataTests = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('[data-test]')].map((e) => e.getAttribute('data-test')))])
const openTeamRun = async (page, teamRunId) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const row = page.locator(sel(`workspace-team-row-${teamRunId}`))
  await waitFor('team run row', async () => {
    if (await row.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    const group = page.locator(sel(`workspace-team-definition-row-${definitions.team.id}`)).first()
    if (await group.isVisible().catch(() => false) && await row.count() === 0) { await group.click(); await delay(600) }
    return row.isVisible().catch(() => false)
  }, 60000, 1500)
  await row.click(); await page.locator(sel('workspace-header-edit-config')).waitFor({ timeout: 120000 }); await settle(page, 2000)
}
const openSettings = async (page) => {
  await page.locator(sel('workspace-header-edit-config')).click()
  const view = page.locator(sel('existing-run-settings')); await view.waitFor({ timeout: 60000 }); await settle(page, 1500)
  // autobyteus-366: a member's Settings show its own card; the run's card and member rows are its group view.
  const groupSwitch = page.locator(sel('run-settings-switch-group'))
  if (await groupSwitch.isVisible().catch(() => false) && await groupSwitch.getAttribute('aria-pressed') !== 'true') { await groupSwitch.click(); await settle(page, 600) }
  return view
}
/** autobyteus-366: a copy's Settings show when it is focused in the left tree: its card (always open). */
const openCopyCard = async (page, copyId) => {
  const row = page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id="${copyId}"]`).first()
  await waitFor('the copy\'s tree row', async () => {
    if (await row.isVisible().catch(() => false)) return true
    for (const toggle of await page.locator(sel('workspace-team-transient-disclosure')).all()) {
      const holder = toggle.locator('xpath=ancestor::*[@aria-expanded][1]')
      if (await holder.getAttribute('aria-expanded').catch(() => null) === 'false') await toggle.click().catch(() => {})
    }
    await expandWorkspaces(page)
    return row.isVisible().catch(() => false)
  }, 60000, 1500)
  await row.click(); await settle(page, 1500)
  const card = page.locator(sel('existing-run-subject-card'))
  await card.waitFor({ timeout: 60000 })
  return card
}
const memberRow = (root, address) => root.locator(sel(`run-member-${address}`)).first()
/** A row's one-line summary; a focused agent's card (autobyteus-366) has none, so its text is read. */
const summaryOf = async (row) => (await row.locator(sel('run-member-summary')).count()
  ? await row.locator(sel('run-member-summary')).first().innerText().catch(() => '')
  : await row.innerText().catch(() => '')).replace(/\s+/g, ' ')
const openMember = async (root, address) => {
  const row = memberRow(root, address)
  await row.waitFor({ timeout: 30000 })
  const toggle = row.locator(sel('run-member-toggle')).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await row.locator(sel('run-member-detail')).first().waitFor(); await delay(300)
  return row
}
/** Reveal a sidebar row: expand the workspaces, then the group named `groupName` (an Agent's runs) when the row is still hidden. */
const revealRow = (page, row, groupName) => waitFor('sidebar row', async () => {
  if (await row.isVisible().catch(() => false)) return true
  await expandWorkspaces(page)
  if (await row.isVisible().catch(() => false)) return true
  const group = page.locator('[data-test="workspace-history-tree-scroll"]').getByText(groupName, { exact: false }).first()
  if (await group.isVisible().catch(() => false)) { await group.click(); await delay(700) }
  return row.isVisible().catch(() => false)
}, 60000, 1500)

const runtimeRows = (page) => page.locator('[data-test^="chat-runtime-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-runtime-', '')))
/** In a row (or card) scope: open the model menu, show the runtime list and choose `runtimeKind` and its model, as the 316 probe does. */
const chooseRuntime = async (page, scope, runtimeKind, model, r) => {
  await scope.locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  r.firstRuntimeRows = await runtimeRows(page)
  await waitFor(`the ${runtimeKind} runtime row`, async () => (await runtimeRows(page)).includes(runtimeKind), 120000, 1000).catch(() => undefined)
  r.runtimeRows = await runtimeRows(page)
  r.lockedRuntimeBanner = await page.locator(sel('chat-model-locked-runtime')).count()
  assert(r.lockedRuntimeBanner === 0 && r.runtimeRows.includes(runtimeKind), `the runtime menu is locked or does not offer ${runtimeKind}`, r)
  await shot(page, `${r.shotPrefix}-runtime-menu-${runtimeKind}`)
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).hover(); await delay(500)
  if (!(await page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false))) await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
  await page.locator(sel(`chat-model-list-${runtimeKind}`)).waitFor({ timeout: 60000 })
  const option = page.locator(sel(`chat-model-list-${runtimeKind}`)).locator(sel(`chat-model-option-${model}`)).first()
  await option.waitFor({ timeout: 60000 }); await option.scrollIntoViewIfNeeded().catch(() => {})
  const list = await page.locator(sel(`chat-model-list-${runtimeKind}`)).boundingBox(); const row = await page.locator(sel(`chat-runtime-${runtimeKind}`)).boundingBox({ timeout: 1500 }).catch(() => null)
  if (list && row && list.x > row.x) await page.mouse.move(list.x + 12, Math.min(Math.max(row.y + row.height / 2, list.y + 6), list.y + list.height - 6))
  await option.click(); await settle(page, 800)
}
const chooseAgy = (page, scope, r) => chooseRuntime(page, scope, AGY, AGY_MODEL, r)
/** Save, then wait until the bar says Saved or the settings show a note (an error). Returns the note's text or null. */
const saveAndWait = async (page, view) => {
  await page.locator(sel('save-existing-model-config')).click()
  return waitFor('saved or an error note', async () => {
    const note = await view.locator(sel('existing-run-note')).first().innerText({ timeout: 500 }).catch(() => null)
    if (note) return { note }
    const bar = await view.locator(sel('existing-run-save-bar')).innerText().catch(() => '')
    return /\bSaved\b/.test(bar) && !/Unsaved|Saving/.test(bar) ? { note: null } : null
  }, 60000, 500).then((x) => x.note)
}

// ======================================================================================================================
// The Claude CLI changes while the app runs.
const CLAUDE = 'claude_agent_sdk'
const FAKE_RUNTIME_CLI = path.join(serverDir, 'tests/fixtures/agent-runtimes-fake-cli.mjs')
const SCRIPTED_MODELS = { bundled: 'claude-fake-sonnet', system: 'claude-fake-sonnet,claude-new-model', failing: 'none' }
let cli = null
const resolveBundledClaude = () => {
  const requireFromServer = createRequire(path.join(serverDir, 'package.json'))
  const sdkEntry = requireFromServer.resolve('@anthropic-ai/claude-agent-sdk')
  const platformPackage = createRequire(sdkEntry).resolve(`@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}/package.json`)
  return path.join(path.dirname(platformPackage), 'claude')
}
/** `link` is what the backend's CLAUDE_CODE_EXECUTABLE_PATH names; changing what it offers or points at is "the CLI was updated". */
const setupCli = async () => {
  const dir = path.join(ownedRoot, 'cli'); await fs.mkdir(dir, { recursive: true })
  if (cliMode === 'scripted') {
    const stateDir = path.join(dir, 'state'); await fs.mkdir(stateDir, { recursive: true })
    await fs.writeFile(path.join(stateDir, 'claude-account'), 'signedIn')
    cli = { mode: 'scripted', dir, stateDir, link: path.join(dir, 'claude') }
    if (!existsSync(cli.link)) await fs.symlink(FAKE_RUNTIME_CLI, cli.link)
    await fs.writeFile(path.join(stateDir, 'claude-models'), SCRIPTED_MODELS.bundled)
    return cli
  }
  const system = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim()
  const failing = path.join(dir, 'claude-failing')
  await fs.writeFile(failing, '#!/bin/sh\necho "claude: simulated failure" >&2\nexit 1\n', { mode: 0o755 })
  cli = { mode: 'real', dir, link: path.join(dir, 'claude'), bundled: resolveBundledClaude(), system, failing }
  assert(existsSync(cli.bundled) && existsSync(cli.system), 'both a bundled and a system Claude CLI are needed', cli)
  if (!existsSync(cli.link)) await setCli('bundled')
  return cli
}
const cliVersion = (which) => {
  if (which === 'failing') return 'failing'
  return execFileSync(cli.link, ['--version'], { encoding: 'utf8', env: cli.mode === 'scripted' ? { ...process.env, FAKE_RUNTIME_STATE_DIR: cli.stateDir } : process.env }).trim()
}
const setCli = async (which) => {
  if (cli.mode === 'scripted') await fs.writeFile(path.join(cli.stateDir, 'claude-models'), SCRIPTED_MODELS[which])
  else { const tmp = `${cli.link}.tmp`; await fs.rm(tmp, { force: true }); await fs.symlink(cli[which], tmp); await fs.rename(tmp, cli.link) }
  const version = cliVersion(which)
  step(`Claude CLI is now '${which}'`, { version })
  return version
}
const sorted = (xs) => [...xs].sort()
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
/** The server's own current answer (what a refresh will read): model identifiers of the Claude Agent SDK runtime, or null when the read fails. */
const serverModels = async () => {
  try {
    return sorted((await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: CLAUDE }))
      .providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier)))
  } catch { return null }
}
/** Claude Code's own option cache can change what it offers between its first and second read of a folder (PRB-D4): read until two reads agree. */
const stableServerModels = async () => {
  let previous = await serverModels()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const next = await serverModels()
    if (previous && next && same(previous, next)) return next
    previous = next
  }
  return previous
}
/** Claude Code keeps its own option cache in its config folder (PRB-D4, outside AutoByteus); read through both CLIs a few times so what each offers is settled. */
const warmCli = async () => { if (cli.mode !== 'real') return; for (const which of ['bundled', 'system', 'bundled', 'system', 'bundled']) { await setCli(which); await serverModels() } }
/** The one visible element of that kind (the open picker's refresh control lives beside its list, inside the open menu). */
const visible = (page, test) => page.locator(`${sel(test)}:visible`).first()
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const rowIds = (list) => list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')).sort())
const catalogReads = (page, kind) => {
  let n = 0
  const onRequest = (request) => {
    if (request.method() !== 'POST' || !request.url().endsWith('/graphql')) return
    const body = request.postData() ?? ''
    if (body.includes('providerModelCatalogSnapshots') && body.includes(`"runtimeKind":"${kind}"`)) n += 1
  }
  page.on('request', onRequest)
  return { count: () => n, stop: () => page.off('request', onRequest) }
}
const openList = async (page, kind) => {
  const list = page.locator(sel(`chat-model-list-${kind}`)); const row = page.locator(sel(`chat-runtime-${kind}`))
  for (let attempt = 0; attempt < 6 && !(await list.isVisible().catch(() => false)); attempt += 1) {
    await row.hover().catch(() => {}); await delay(400)
    if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await delay(700) }
  }
  await list.waitFor({ timeout: 60000 })
  const rowBox = await row.boundingBox({ timeout: 1000 }).catch(() => null); const listBox = await list.boundingBox({ timeout: 1000 }).catch(() => null)
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 })
  return list
}
const openChatMenu = async (page) => { await page.locator(sel('chat-model-trigger')).first().click(); await page.locator(sel('chat-model-menu')).first().waitFor() }
const closeMenu = async (page) => { await page.keyboard.press('Escape'); await delay(400) }
const rowsEqual = async (list, expected, timeout = 90000) => {
  try { return await waitFor(`rows to be ${JSON.stringify(expected)}`, async () => same(await rowIds(list), expected), timeout, 400) } catch (error) {
    const actual = await rowIds(list).catch(() => null)
    const failure = new Error(`${error.message}; the list shows ${JSON.stringify(actual)}`); failure.details = { actual, expected }; throw failure
  }
}

defineCase('API-11', 'New-run picker: the Claude CLI is updated while the app runs; the next open lists the new models, Refresh models and a failing CLI behave, a new model launches (AC-010, AC-011, QR-001, QR-002)', async (page) => {
  const r = { steps: [] }
  await warmCli()
  await setCli('bundled')
  const l0 = await stableServerModels(); r.l0 = l0; assert(l0 && l0.length, 'the bundled CLI lists no model', l0)
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await delay(800)
  await page.evaluate(() => { window.__apiE2eMarker = 'm1' })
  const backendPid = backend.pid
  const reads = catalogReads(page, CLAUDE)
  // First open: the list is the bundled CLI's.
  await openChatMenu(page); let list = await openList(page, CLAUDE)
  await rowsEqual(list, l0)
  r.firstOpen = { rows: await rowIds(list), reads: reads.count() }
  await shot(page, 'API-11-1-bundled-list'); await closeMenu(page)
  // The CLI is updated (symlink swap, PRB-D3): no restart of the app, the page or the backend.
  r.versionAfterUpdate = await setCli('system')
  const l1 = await stableServerModels(); r.l1 = l1; assert(l1 && l1.length, 'the updated CLI lists no model', l1)
  r.added = l1.filter((id) => !l0.includes(id)); r.removed = l0.filter((id) => !l1.includes(id))
  assert(r.added.length > 0, 'the updated CLI offers no model the bundled one did not (precondition)', { l0, l1 })
  // Next open: the shown list stays usable at once, then the refreshed list replaces it (one read for this opening).
  const before = reads.count()
  await openChatMenu(page); list = await openList(page, CLAUDE)
  r.immediateRows = await rowIds(list)
  r.busySeen = await visible(page, 'model-list-refreshing').isVisible().catch(() => false)
  assert(r.immediateRows.length > 0, 'QR-001: the open picker is empty while it re-reads', r)
  await rowsEqual(list, l1)
  r.opening2 = { rows: await rowIds(list), reads: reads.count() - before }
  assert(r.opening2.reads === 1, 'QR-002: more than one catalog read for one opening', r.opening2)
  assert(r.added.every((id) => r.opening2.rows.includes(id)), 'a new model is not listed on the next open', r)
  await shot(page, 'API-11-2-updated-list')
  assert(await page.evaluate(() => window.__apiE2eMarker) === 'm1', 'the page was reloaded (AC-010: no restart)')
  assert(backend.exitCode === null && backend.pid === backendPid, 'the backend was restarted')
  // Refresh models with a failing CLI: the last list stays, the error and Retry show.
  await setCli('failing')
  await visible(page, 'model-list-refresh-button').click()
  await waitFor('the refresh error', async () => await visible(page, 'model-list-refresh-error').isVisible().catch(() => false), 60000, 300)
  r.failed = { error: await visible(page, 'model-list-refresh-error').innerText(), button: await visible(page, 'model-list-refresh-button').innerText(), rows: await rowIds(list) }
  assert(same(r.failed.rows, l1) && /Retry/.test(r.failed.button), 'QR-001: a failed refresh emptied the list or shows no Retry', r.failed)
  await shot(page, 'API-11-3-refresh-failed-list-kept')
  // The CLI works again: Retry reads it and the error is gone.
  await setCli('system')
  await visible(page, 'model-list-refresh-button').click()
  await waitFor('the error to clear', async () => !(await visible(page, 'model-list-refresh-error').isVisible().catch(() => false)), 60000, 300)
  await rowsEqual(list, l1)
  r.afterRetry = { rows: await rowIds(list), button: await visible(page, 'model-list-refresh-button').innerText() }
  assert(/Refresh models/.test(r.afterRetry.button), 'the control did not return to "Refresh models"', r.afterRetry)
  // A new model can be selected and launched.
  const picked = r.added[0]; r.picked = picked
  await list.locator(`${sel(`chat-model-option-${picked}`)}`).click(); await delay(600)
  const input = page.locator(`${sel('chat-composer')} textarea`).first()
  await input.click(); await input.fill('Reply with the single word OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = new URL(page.url()).searchParams.get('id'); r.runId = runId
  const cfg = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier llmConfig runtimeKind}}}', { runId })).getAgentRunResumeConfig
  r.launched = cfg.metadataConfig
  assert(cfg.metadataConfig.runtimeKind === CLAUDE && cfg.metadataConfig.llmModelIdentifier === picked, 'the run did not launch on the new model', cfg)
  r.replied = cli.mode !== 'real' ? null : await page.waitForFunction(() => /\bOK\b/.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? ''), null, { timeout: 150000 }).then(() => true).catch(() => false)
  await shot(page, 'API-11-4-launched-on-new-model')
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId }).catch(() => {})
  reads.stop()
  return r
})

defineCase('API-12', 'Stopped Team member switched to the Claude Agent SDK runtime after a CLI update: new model listed, stale selection and unreadable list refuse with the right texts and save nothing, Save succeeds, switch back (AC-012, AC-013, Rule 10)', async (page, ctx) => {
  const r = { steps: [] }
  await setCli('bundled')
  const l0 = await stableServerModels(); assert(l0 && l0.length, 'the bundled CLI lists no model')
  const launch = nativeLaunch(ctx.nativeModel, ctx.workspace)
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: definitions.team.id, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: ['lead', 'worker'].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: definitions.agent.id, ...launch })) } })).createAgentTeamRun
  assert(created.success, created.message)
  const teamRunId = created.teamRunId; r.teamRunId = teamRunId
  const worker = (await memberNode('team', teamRunId, '/worker')).agentRunId
  await talkTeam(teamRunId, worker, 'NATIVE-TEAM-ONE please answer')
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
  const nodeNow = async () => (await memberNode('team', teamRunId, '/worker')).launchConfiguration
  const storedBefore = JSON.stringify(await nodeNow())
  await openTeamRun(page, teamRunId)
  const view = await openSettings(page)
  const row = await openMember(view, '/worker')
  const reads = catalogReads(page, CLAUDE)
  // Open the worker's runtime menu: the Claude Agent SDK runtime is offered, and its list is the bundled CLI's.
  await row.locator(sel('chat-model-trigger')).first().click(); await page.locator(sel('chat-model-menu')).first().waitFor()
  await waitFor('the Claude Agent SDK runtime row', async () => (await runtimeRows(page)).includes(CLAUDE), 120000, 1000).catch(() => undefined)
  r.runtimeRows = await runtimeRows(page); assert(r.runtimeRows.includes(CLAUDE), 'the runtime menu does not offer the Claude Agent SDK', r.runtimeRows)
  let list = await openList(page, CLAUDE); await rowsEqual(list, l0)
  r.bundledRows = await rowIds(list); await shot(page, 'API-12-1-member-menu-bundled')
  await closeMenu(page)
  // The CLI is updated; the member's menu is opened again.
  await setCli('system')
  const l1 = await stableServerModels(); r.l1 = l1; r.added = l1.filter((id) => !l0.includes(id)); assert(r.added.length > 0, 'precondition: the updated CLI offers a new model', { l0, l1 })
  await row.locator(sel('chat-model-trigger')).first().click(); await page.locator(sel('chat-model-menu')).first().waitFor()
  list = await openList(page, CLAUDE)
  r.immediateRows = await rowIds(list); assert(r.immediateRows.length > 0, 'the member picker is empty while it re-reads')
  await rowsEqual(list, l1); r.updatedRows = await rowIds(list)
  assert(r.added.every((id) => r.updatedRows.includes(id)), 'the new model is not listed on the next open', r)
  await shot(page, 'API-12-2-member-menu-updated')
  const picked = r.added[0]; r.picked = picked
  await list.locator(sel(`chat-model-option-${picked}`)).click(); await settle(page, 800)
  await shot(page, 'API-12-3-unsaved-switch')
  const chooseAgain = async () => {
    await row.locator(sel('chat-model-trigger')).first().click(); await page.locator(sel('chat-model-menu')).first().waitFor()
    const again = await openList(page, CLAUDE)
    await again.locator(sel(`chat-model-option-${picked}`)).waitFor({ timeout: 90000 })
    await again.locator(sel(`chat-model-option-${picked}`)).click(); await settle(page, 800)
  }
  const refused = async (text) => { await view.locator(sel('existing-run-note')).first().waitFor({ timeout: 5000 }).catch(() => {}); return text }
  // (a) The CLI no longer offers the chosen model when Save is pressed: the refusal names it and the scope, says what to do and that nothing was saved;
  //     the user does what it says (refreshes by opening the menu again and chooses again).
  await setCli('bundled')
  r.refusedNotOffered = await saveAndWait(page, view)
  assert(r.refusedNotOffered && r.refusedNotOffered.includes(`'${picked}' is not offered by Claude Agent SDK now (for '/worker')`) && r.refusedNotOffered.includes('Refresh the model list and choose again.') && r.refusedNotOffered.includes('Saved settings were not changed.'), 'the not-offered refusal text is wrong', r.refusedNotOffered)
  assert(JSON.stringify(await nodeNow()) === storedBefore, 'a refused Save changed the stored member')
  await shot(page, 'API-12-4-refused-not-offered')
  // (b) The CLI is back and the user chooses again; then it fails when Save is pressed: the list could not be read, which is not "not offered".
  await setCli('system'); await chooseAgain()
  await setCli('failing')
  r.refusedUnreadable = await saveAndWait(page, view)
  assert(r.refusedUnreadable && r.refusedUnreadable.includes('The model list of Claude Agent SDK could not be read.') && r.refusedUnreadable.includes('Try again.') && r.refusedUnreadable.includes('Saved settings were not changed.'), 'the unreadable-list refusal text is wrong', r.refusedUnreadable)
  assert(!r.refusedUnreadable.includes('is not offered'), 'an unreadable list is worded as "not offered"', r.refusedUnreadable)
  assert(JSON.stringify(await nodeNow()) === storedBefore, 'an unreadable-list Save changed the stored member')
  await shot(page, 'API-12-5-refused-unreadable')
  // (c) The CLI works: the user chooses again and the Save succeeds; the stored selection names the new model on the Claude runtime.
  await setCli('system'); await chooseAgain()
  r.saveNote = await saveAndWait(page, view); assert(!r.saveNote, 'the Save after the CLI recovered shows a note', r.saveNote)
  const saved = await nodeNow(); r.saved = { runtimeKind: saved.runtimeKind, model: saved.llmModelIdentifier }
  assert(saved.runtimeKind === CLAUDE && saved.llmModelIdentifier === picked, 'the stored member does not name the new model on the Claude runtime', saved)
  await shot(page, 'API-12-6-saved')
  // There and back: the member returns to its first runtime, the pending switch is cancelled.
  r.shotPrefix = 'API-12-back'
  await chooseRuntime(page, row, NATIVE, ctx.nativeModel, r)
  r.backNote = await saveAndWait(page, view); assert(!r.backNote, 'the Save back to the first runtime shows a note', r.backNote)
  const back = await nodeNow(); r.back = { runtimeKind: back.runtimeKind, model: back.llmModelIdentifier }
  assert(back.runtimeKind === NATIVE && back.llmModelIdentifier === ctx.nativeModel, 'the member is not back on its first runtime', back)
  assert(!JSON.stringify(await memberNode('team', teamRunId, '/worker')).includes(picked), 'the Claude choice left a trace after the return')
  await shot(page, 'API-12-7-back-on-first-runtime')
  // TESTING.md Rule 10: a restart between the save and the message of the return. The worker answers on its first runtime again.
  await restartBackend()
  await openTeamRun(page, teamRunId)
  const workerRow = page.locator(sel(`workspace-team-member-${teamRunId}-/worker`))
  await workerRow.waitFor({ timeout: 60000 }); await workerRow.click(); await settle(page, 2000)
  await sendFromComposer(page, 'NATIVE-TEAM-TWO please answer')
  r.returnChat = await waitFor('the native reply after the return', async () => {
    const text = await pageText(page)
    const replies = (text.match(/NATIVE-REPLY-(\d+)/g) ?? []).map((x) => Number(x.replace('NATIVE-REPLY-', '')))
    return /NATIVE-TEAM-TWO/.test(text) && replies.length >= 2 ? text.replace(/\s+/g, ' ').slice(0, 1200) : null
  }, 180000, 1000)
  const afterMessage = await memberNode('team', teamRunId, '/worker')
  r.afterMessage = { runtimeKind: afterMessage.launchConfiguration.runtimeKind, model: afterMessage.launchConfiguration.llmModelIdentifier, pending: 'pendingRuntimeSwitch' in afterMessage }
  assert(r.afterMessage.runtimeKind === NATIVE && r.afterMessage.model === ctx.nativeModel && !r.afterMessage.pending, 'after the restart and a message the worker is not on its first runtime without a pending switch', r.afterMessage)
  assert(!JSON.stringify(afterMessage).includes(picked), 'the Claude choice came back after the restart', afterMessage)
  await shot(page, 'API-12-8-after-restart-and-message')
  reads.stop()
  return r
})

defineCase('API-14', 'Stopped Team run on the Claude Agent SDK runtime: the Team-level (runtime-locked) model menu re-reads the run\'s options when it opens and on Refresh models, shows busy, and keeps its options with an error when the CLI fails (REQ-010, REQ-011, QR-001)', async (page, ctx) => {
  const r = {}
  await setCli('bundled')
  const l0 = await stableServerModels(); assert(l0 && l0.length, 'the bundled CLI lists no model')
  const first = l0.find((id) => /haiku/.test(id)) ?? l0[0]; r.firstModel = first
  const launch = { runtimeKind: CLAUDE, llmModelIdentifier: first, llmConfig: null, autoExecuteTools: true, workspaceRootPath: ctx.workspace }
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: definitions.team.id, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: ['lead', 'worker'].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: definitions.agent.id, ...launch })) } })).createAgentTeamRun
  assert(created.success, created.message)
  const teamRunId = created.teamRunId; r.teamRunId = teamRunId
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
  await openTeamRun(page, teamRunId)
  const view = await openSettings(page)
  const trigger = view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`).first()
  await trigger.waitFor({ timeout: 60000 })
  const open = async () => { await trigger.click(); await page.locator(sel('chat-model-menu')).first().waitFor(); await delay(500) }
  const lockedRows = async () => page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')).sort())
  const menu = page.locator(sel('chat-model-menu')).first()
  await open()
  r.runtimeLocked = await page.locator(sel('chat-model-locked-runtime')).count()
  r.firstRows = await lockedRows(); await shot(page, 'API-14-1-locked-menu-bundled')
  await closeMenu(page)
  await setCli('system')
  const l1 = await stableServerModels(); r.l1 = l1; r.added = l1.filter((id) => !l0.includes(id)); assert(r.added.length > 0, 'precondition: the updated CLI offers a new model')
  await open()
  r.refreshControl = await menu.locator(sel('model-list-refresh-button')).count()
  assert(r.refreshControl > 0, 'the locked menu has no Refresh models control', r)
  await waitFor('the locked menu lists a new model on open', async () => { const rows = await lockedRows(); return r.added.some((id) => rows.includes(id)) }, 90000, 500)
  r.openedRows = await lockedRows(); await shot(page, 'API-14-2-locked-menu-updated-on-open')
  // Explicit refresh: busy while reading (the CLI takes a few seconds), the options stay usable.
  await menu.locator(sel('model-list-refresh-button')).click()
  r.busySeen = await waitFor('busy state', async () => await menu.locator(sel('model-list-refreshing')).isVisible().catch(() => false), 15000, 100).catch(() => false)
  r.rowsWhileBusy = await lockedRows(); assert(r.rowsWhileBusy.length > 0, 'QR-001: the locked options emptied while refreshing', r)
  await waitFor('refresh to end', async () => !(await menu.locator(sel('model-list-refreshing')).isVisible().catch(() => false)), 60000, 300)
  await shot(page, 'API-14-3-locked-menu-after-refresh')
  // The CLI fails: Refresh models must keep the options and show the error with Retry (REQ-011, QR-001).
  await setCli('failing')
  await menu.locator(sel('model-list-refresh-button')).click()
  r.failedSeen = await waitFor('refresh error', async () => await menu.locator(sel('model-list-refresh-error')).isVisible().catch(() => false), 20000, 300).catch(() => false)
  await delay(1500)
  r.afterFailure = { error: await menu.locator(sel('model-list-refresh-error')).innerText().catch(() => null), button: await menu.locator(sel('model-list-refresh-button')).innerText().catch(() => null), rows: await lockedRows(), menuText: (await menu.innerText()).replace(/\s+/g, ' ').slice(0, 400) }
  await shot(page, 'API-14-4-locked-menu-refresh-failed')
  await closeMenu(page)
  r.cardAfterFailure = (await view.locator(sel('existing-run-root-card')).innerText()).replace(/\s+/g, ' ')
  r.noteAfterFailure = (await view.locator(sel('existing-run-note')).allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' '))
  await shot(page, 'API-14-5-card-after-failed-refresh')
  // Recovery: the CLI works again, the menu is opened again.
  await setCli('system')
  await open()
  await waitFor('the locked menu lists models again', async () => (await lockedRows()).length > 0, 90000, 500)
  r.afterRecovery = { rows: await lockedRows(), button: await menu.locator(sel('model-list-refresh-button')).innerText().catch(() => null) }
  await shot(page, 'API-14-6-locked-menu-recovered')
  await closeMenu(page)
  const findings = []
  if (!r.failedSeen) findings.push('no error shown after a failed refresh')
  if (!/Retry/.test(r.afterFailure.button ?? '')) findings.push(`no Retry (button reads "${r.afterFailure.button}")`)
  if (!r.afterFailure.rows.length) findings.push('the options were emptied by a failed refresh (menu reads "No models available")')
  if (/No longer offered/i.test(`${r.cardAfterFailure} ${r.noteAfterFailure.join(' ')}`)) findings.push('the card says "No longer offered" after a failed refresh although the list could not be read (CR-004)')
  r.findings = findings
  if (findings.length) { const error = new Error(`QR-001/REQ-011 in the saved-run (locked) menu: ${findings.join('; ')}`); error.details = r; throw error }
  return r
})

defineCase('API-19', 'AutoByteus runtime: a model a local server (LM Studio) starts offering while the app runs appears after "Refresh models", which re-discovers discovered providers (AC-011, REQ-011, REQ-014)', async (page) => {
  const r = {}
  fake.setModels(['rsw-native', 'rsw-native-b'])
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await delay(800)
  await page.evaluate(() => { window.__apiE2eMarker = 'm19' })
  const backendPid = backend.pid
  const stand = (rows) => rows.filter((id) => id.startsWith('rsw-native'))
  await openChatMenu(page)
  let list = await openList(page, 'autobyteus')
  await waitFor('the local models', async () => stand(await rowIds(list)).length >= 2, 120000, 500)
  r.before = stand(await rowIds(list))
  assert(r.before.every((id) => !id.startsWith('rsw-native-c:')), 'the new model is listed before it exists', r.before)
  // The local server starts offering a third model while the app runs; nothing is restarted.
  fake.setModels(['rsw-native', 'rsw-native-b', 'rsw-native-c'])
  await visible(page, 'model-list-refresh-button').click()
  await waitFor('the new local model after Refresh models', async () => stand(await rowIds(list)).some((id) => id.startsWith('rsw-native-c:')), 90000, 500)
  r.after = stand(await rowIds(list))
  await shot(page, 'API-19-local-model-after-refresh')
  assert(await page.evaluate(() => window.__apiE2eMarker) === 'm19', 'the page was reloaded')
  assert(backend.exitCode === null && backend.pid === backendPid, 'the backend was restarted')
  fake.setModels(['rsw-native', 'rsw-native-b'])
  await closeMenu(page)
  return r
})

defineCase('API-14b', 'Saved-run (locked) menu opened for the first time while the CLI is already failing: the card never says "No longer offered", the menu shows the error with Retry, the run\'s own model stays editable, Refresh models recovers (AC-012 failure alternate, SR-004)', async (page, ctx) => {
  const r = {}
  await warmCli()
  await setCli('bundled')
  const l0 = await stableServerModels(); assert(l0 && l0.length, 'the CLI before the update lists no model')
  const first = l0.find((id) => /haiku/.test(id)) ?? l0[0]; r.firstModel = first
  const launch = { runtimeKind: CLAUDE, llmModelIdentifier: first, llmConfig: null, autoExecuteTools: true, workspaceRootPath: ctx.workspace }
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: definitions.team.id, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: ['lead', 'worker'].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: definitions.agent.id, ...launch })) } })).createAgentTeamRun
  assert(created.success, created.message)
  const teamRunId = created.teamRunId; r.teamRunId = teamRunId
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
  // The CLI is already failing when the run's settings are opened: this is the first read of the edit, not a refresh.
  await setCli('failing')
  await openTeamRun(page, teamRunId)
  const view = await openSettings(page)
  const card = view.locator(sel('existing-run-root-card'))
  const trigger = card.locator(sel('chat-model-trigger')).first()
  await trigger.waitFor({ timeout: 60000 })
  await delay(4000)
  const text = async (locator) => (await locator.innerText().catch(() => '')).replace(/\s+/g, ' ')
  r.cardText = await text(card)
  r.notes = (await view.locator(sel('existing-run-note')).allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' '))
  r.viewText = await text(view)
  r.triggerEnabled = await trigger.isEnabled()
  await shot(page, 'API-14b-1-first-open-cli-failing')
  const menu = page.locator(sel('chat-model-menu')).first()
  await trigger.click(); await menu.waitFor(); await delay(1500)
  r.menuText = await text(menu)
  r.menuRows = await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')).sort())
  await shot(page, 'API-14b-2-menu-cli-failing')
  const findings = []
  if (/No longer offered/i.test(`${r.cardText} ${r.notes.join(' ')} ${r.viewText}`)) findings.push('the card says "No longer offered" although the list could not be read')
  r.menuError = await menu.locator(sel('model-list-refresh-error')).innerText().catch(() => null)
  r.menuButton = await menu.locator(sel('model-list-refresh-button')).innerText().catch(() => null)
  if (!r.menuError || !/Retry/.test(r.menuButton ?? '')) findings.push(`a first read with the CLI failing does not show the error with Retry (error ${JSON.stringify(r.menuError)}, button ${JSON.stringify(r.menuButton)})`)
  if (!r.triggerEnabled) findings.push('the run\'s own model control is disabled')
  // The CLI works again: Refresh models in the open menu lists the models and the card is clean.
  await setCli('system')
  await menu.locator(sel('model-list-refresh-button')).click()
  r.recovered = await waitFor('the menu lists models again', async () => { const rows = await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).count(); return rows > 0 }, 90000, 500).catch(() => false)
  r.rowsAfterRecovery = await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')).sort())
  await shot(page, 'API-14b-3-recovered')
  await page.keyboard.press('Escape'); await delay(400)
  r.cardAfterRecovery = await text(card)
  if (!r.recovered) findings.push('Refresh models did not recover the options once the CLI worked')
  if (/No longer offered/i.test(r.cardAfterRecovery)) findings.push('the card says "No longer offered" after the options recovered')
  r.findings = findings
  if (findings.length) { const error = new Error(`SR-004 first open with a failing CLI: ${findings.join('; ')}`); error.details = r; throw error }
  return r
})


let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  let attached = null
  if (attach) {
    attached = JSON.parse(await fs.readFile(attach, 'utf8'))
    ownedRoot = attached.ownedRoot; dataRoot = path.join(ownedRoot, 'server-data'); backendUrl = attached.backendUrl; frontUrl = attached.frontUrl
    Object.assign(definitions, attached.definitions)
    await fs.mkdir(outDir, { recursive: true }); await setupCli()
  } else {
    assert(existsSync(fakeAgy), `the scripted Antigravity CLI is missing: ${fakeAgy}`)
    await fs.mkdir(outDir, { recursive: true })
    ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-switch-members-probe-'))
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
    await fs.mkdir(path.join(ownedRoot, 'claude-config'), { recursive: true }); await setupCli()
    const env = { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: frontUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
      AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', LMSTUDIO_HOSTS: fake.origin, ANTIGRAVITY_CLI_COMMAND: fakeAgy, AGY_FAKE_CASE: 'linked_skills', AGY_FAKE_EXTRA_MODELS: 'rsw-alt-model',
      CLAUDE_CODE_EXECUTABLE_PATH: cli.link, CLAUDE_CONFIG_DIR: path.join(ownedRoot, 'claude-config'),
      ...(cli.mode === 'scripted' ? { FAKE_RUNTIME_STATE_DIR: cli.stateDir }
        : { CLAUDE_AGENT_SDK_AUTH_MODE: 'api-key', ...(process.env.AUTOBYTEUS_TEST_VAULT ? { AUTOBYTEUS_TEST_VAULT: process.env.AUTOBYTEUS_TEST_VAULT } : {}) }) }
    startBackend = () => spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, withNodeCredential(env))
    backend = startBackend()
    await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 1000)
    frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
    await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)

  }
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  await attachToBrowserContext(context)
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => recordPageError(e.message))
  for (const route of ['/chat', '/workspace', '/agents']) { await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000) }
  const context0 = attached ? { nativeModel: attached.nativeModel, workspace: attached.workspace } : await setup()
  Object.assign(evidence, { definitions, cli: cli.mode === 'real' ? { mode: 'real', bundled: execFileSync(cli.bundled, ['--version'], { encoding: 'utf8' }).trim(), system: execFileSync(cli.system, ['--version'], { encoding: 'utf8' }).trim() } : { mode: 'scripted', version: cliVersion('bundled') } })
  if (hold) {
    await fs.writeFile(path.join(outDir, 'hold.json'), JSON.stringify({ backendUrl, frontUrl, ownedRoot, definitions, ...context0 }, null, 2))
    console.log(`HOLD ${frontUrl} ${backendUrl} (stop with SIGTERM)`)
    await new Promise((resolve) => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve) })
  }
  for (const entry of cases.filter((c) => !onlyCases.length || onlyCases.includes(c.id))) {
    const started = Date.now()
    currentCase = entry.id
    if (injectPageError) await page.evaluate(() => { setTimeout(() => { throw new Error('probe self-check: injected page error') }, 0) })
    try {
      evidence[entry.id] = { title: entry.title, result: 'Pass', details: await entry.fn(page, context0), ms: Date.now() - started }
    } catch (error) {
      exitCode = 1
      evidence.failures.push({ case: entry.id, error: error.message })
      await page.screenshot({ path: path.join(outDir, `${entry.id}-failure.png`) }).catch(() => {})
      evidence[entry.id] = { title: entry.title, result: 'Fail', error: error.message, details: error.details ?? null, ms: Date.now() - started }
    }
    console.log(`${entry.id} ${evidence[entry.id].result}${evidence[entry.id].error ? ` — ${evidence[entry.id].error}` : ''}`)
  }
  currentCase = 'teardown'
  const unknownPageErrors = evidence.browserErrors.filter((entry) => !entry.known)
  for (const entry of unknownPageErrors) evidence.failures.push({ case: entry.case, error: `browser page error: ${entry.line}` })
  if (unknownPageErrors.length) {
    exitCode = 1
    console.log(`  browser page errors that fail the run: ${unknownPageErrors.length}\n${unknownPageErrors.map((entry) => `    [${entry.case}] ${entry.line}`).join('\n')}`)
  }
  evidence.result = exitCode === 0 && evidence.failures.length === 0 ? 'Pass' : 'Fail'
  console.log(`model-list-journeys probe: ${evidence.result}`)
} catch (error) {
  exitCode = 1
  evidence.result = 'Fail'
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[model-list-journeys-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  await fake?.close().catch(() => {})
  if (ownedRoot && !keep && !attach) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'model-list-journeys-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
