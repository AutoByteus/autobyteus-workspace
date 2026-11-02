#!/usr/bin/env node
// Agent runtime switch of Team members, Org members and delegated copies in the real app surface (autobyteus-348: REQ-001..REQ-004,
// the rendered rows and the open runtime menu on nested rows). Real browser (Chrome via playwright-core) -> real Nuxt dev -> real
// built backend (`dist/app.js`) on an owned temp data root, free ports and a sanitized environment (a running desktop app and
// `~/.autobyteus` are never touched). Only the models are scripted: the native runtime talks to a test-owned LM Studio stand-in
// (`LMSTUDIO_HOSTS`), Antigravity is the scripted CLI `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.
//
// RSM-01  Team: a member answers (seeded over the backend socket); the Team is stopped; Edit config -> the worker's nested row -> its runtime menu
//         offers the other runtimes (not locked) -> Antigravity and its model -> Save (the server holds the pending switch on that member only)
//         -> the worker is opened from the sidebar and sent a message from the composer -> the chat shows the marker and the answer, one
//         segment holds the native agent, the other member never started; a fresh page load shows the earlier turn, one marker and the answer,
//         and the Settings show the worker on Antigravity with no pending hint.
// RSM-02  Org, a direct Agent: the same through the stopped Org's Settings (a member row of the Org).
// RSM-03  Org, an Agent of a mounted Team: the same through the nested row (Org -> Team -> Agent).
// RSM-04  Delegated copy: a Writer copy started by a scripted Antigravity host (the copy runs native) is stopped; the host's Settings show the
//         copy row; its runtime is switched and saved; the host wakes the copy; the copy's chat (opened from the sidebar) shows the marker.
// RSM-05  Team default: the root card of a stopped Team opens its model menu with the runtime locked (a Team's or Org's own runtime is fixed in
//         the UI); the Team-default runtime cascade is therefore reachable only through the server API (covered in the built-server suite).
//
// Prerequisites: pnpm -C autobyteus-server-ts build; Google Chrome (--browser-executable or PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
//   ANTIGRAVITY_CLI_COMMAND = the absolute path of the scripted CLI (default: the repository's fixture).
// Run: pnpm -C autobyteus-web test:e2e:runtime-switch-members   [--cases RSM-01,RSM-02] [--output-dir <dir>] [--keep] [--hold]
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
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/runtime-switch-members'))
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


const WS_TIMEOUT = 120000
/** The user (or an agent) acts over the run's backend WebSocket; used to seed history and to wake a copy through its host. */
const socketSend = async (route, rootId, payload, until = null) => {
  const socket = new WebSocket(`${backendUrl.replace('http', 'ws')}/ws/${route}/${rootId}`)
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
  const workspace = path.join(ownedRoot, 'workspace'); await fs.mkdir(workspace, { recursive: true })
  await createDefinitions(nativeModel)
  return { nativeModel, workspace }
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
  return view
}
const memberRow = (root, address) => root.locator(sel(`run-member-${address}`)).first()
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
/** In a row (or card) scope: open the model menu, show the runtime list and choose `AGY` and its model, as the 316 probe does. */
const chooseAgy = async (page, scope, r) => {
  await scope.locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  r.firstRuntimeRows = await runtimeRows(page)
  await waitFor('the Antigravity runtime row', async () => (await runtimeRows(page)).includes(AGY), 120000, 1000).catch(() => undefined)
  r.runtimeRows = await runtimeRows(page)
  r.lockedRuntimeBanner = await page.locator(sel('chat-model-locked-runtime')).count()
  assert(r.lockedRuntimeBanner === 0 && r.runtimeRows.includes(AGY), 'the runtime menu is locked or does not offer Antigravity', r)
  await shot(page, `${r.shotPrefix}-runtime-menu`)
  await page.locator(sel(`chat-runtime-${AGY}`)).hover(); await delay(500)
  await shot(page, `${r.shotPrefix}-runtime-hover`)
  r.afterHover = await dataTests(page).then((t) => t.filter((x) => /chat-(model|runtime)/.test(x)))
  if (!(await page.locator(sel(`chat-model-list-${AGY}`)).isVisible().catch(() => false))) await page.locator(sel(`chat-runtime-${AGY}`)).click()
  await page.locator(sel(`chat-model-list-${AGY}`)).waitFor({ timeout: 60000 })
  const option = page.locator(sel(`chat-model-list-${AGY}`)).locator(sel(`chat-model-option-${AGY_MODEL}`)).first()
  await option.waitFor({ timeout: 60000 }); await option.scrollIntoViewIfNeeded().catch(() => {})
  const list = await page.locator(sel(`chat-model-list-${AGY}`)).boundingBox(); const row = await page.locator(sel(`chat-runtime-${AGY}`)).boundingBox({ timeout: 1500 }).catch(() => null)
  await shot(page, `${r.shotPrefix}-model-list`)
  if (list && row && list.x > row.x) await page.mouse.move(list.x + 12, Math.min(Math.max(row.y + row.height / 2, list.y + 6), list.y + list.height - 6))
  await option.click(); await settle(page, 800)
}
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

defineCase('RSM-01', 'Team: switch one member in the stopped Team\'s Settings, message it, reopen the chat', async (page, ctx) => {
  const r = {}
  const launch = nativeLaunch(ctx.nativeModel, ctx.workspace)
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: definitions.team.id, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: ['lead', 'worker'].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: definitions.agent.id, ...launch })) } })).createAgentTeamRun
  assert(created.success, created.message)
  const teamRunId = created.teamRunId; r.teamRunId = teamRunId
  const worker = (await memberNode('team', teamRunId, '/worker')).agentRunId
  await talkTeam(teamRunId, worker, 'NATIVE-TEAM-ONE please answer')
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
  await openTeamRun(page, teamRunId)
  await shot(page, 'RSM-01-team-open')
  const view = await openSettings(page)
  await shot(page, 'RSM-01-settings')
  r.rootRuntimeInSettings = await view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`).count()
  r.shotPrefix = 'RSM-01'
  const row = await openMember(view, '/worker')
  await shot(page, 'RSM-01-worker-row-open')
  await chooseAgy(page, row, r)
  r.tests = await dataTests(page)
  r.hint = await view.locator(sel('existing-run-runtime-change-hint')).allInnerTexts()
  await shot(page, 'RSM-01-unsaved-switch')
  r.saveNote = await saveAndWait(page, view)
  assert(!r.saveNote, 'the Team save shows a note', r.saveNote)
  await shot(page, 'RSM-01-saved')
  const pending = await memberNode('team', teamRunId, '/worker'); const lead = await memberNode('team', teamRunId, '/lead')
  r.pending = { runtimeKind: pending.launchConfiguration.runtimeKind, model: pending.launchConfiguration.llmModelIdentifier, platformAgentRunId: pending.platformAgentRunId, pendingFrom: pending.pendingRuntimeSwitch?.from?.runtimeKind }
  assert(r.pending.runtimeKind === AGY && r.pending.model === AGY_MODEL && r.pending.pendingFrom === NATIVE && r.pending.platformAgentRunId === null, 'the server did not record the pending switch on the worker', r.pending)
  assert(lead.launchConfiguration.runtimeKind === NATIVE && !('pendingRuntimeSwitch' in lead), 'the other member changed', lead)
  step('Team: saved, the server holds the pending switch on the worker only', r.pending)

  // The next message to the worker (focused from the sidebar) makes the switch.
  await page.locator(sel('run-config-back-to-events')).click(); await settle(page, 1000)
  await page.locator(sel(`workspace-team-member-${teamRunId}-/worker`)).click(); await settle(page, 2000)
  await sendFromComposer(page, 'ECHO_INPUT')
  await waitFor('marker in the chat', async () => /Agent runtime changed from AutoByteus/.test(await pageText(page)), 180000, 1000)
  r.liveChat = (await pageText(page)).replace(/\s+/g, ' ').slice(0, 1200)
  await shot(page, 'RSM-01-after-switch-live')
  const folder = await findFolder(path.join(dataRoot, 'memory', 'agent_teams', teamRunId), pending.agentRunId)
  const manifest = await readJson(path.join(folder, 'raw_traces_manifest.json'))
  r.segments = manifest.segments.map((x) => ({ runtime: x.runtime_kind, type: x.boundary_type, status: x.status }))
  assert(r.segments.length === 1 && r.segments[0].runtime === NATIVE, 'one segment holding the native agent', r.segments)
  const committed = await memberNode('team', teamRunId, '/worker')
  assert(!('pendingRuntimeSwitch' in committed) && committed.launchConfiguration.runtimeKind === AGY, 'the switch was not committed', committed)
  r.leadFolder = await findFolder(path.join(dataRoot, 'memory', 'agent_teams', teamRunId), lead.agentRunId)
  assert(r.leadFolder === null, 'the other member started')
  step('Team: the first message switched the worker (one segment, committed); the lead never started')

  // Reopen the chat from the sidebar after a fresh page load.
  await openTeamRun(page, teamRunId)
  const workerRow = page.locator(sel(`workspace-team-member-${teamRunId}-/worker`))
  if (await workerRow.count()) { await workerRow.click(); await settle(page, 2000) }
  const reloaded = await waitFor('the reloaded chat', async () => {
    const text = await pageText(page)
    return /NATIVE-TEAM-ONE/.test(text) && /Agent runtime changed from AutoByteus/.test(text) ? text : null
  }, 120000, 1000)
  r.markerCount = (reloaded.match(/Agent runtime changed from/g) ?? []).length
  assert(r.markerCount === 1, 'the reloaded chat does not show exactly one marker', r.markerCount)
  r.reloadedChat = reloaded.replace(/\s+/g, ' ').slice(0, 1600)
  await shot(page, 'RSM-01-after-reload')
  const settings2 = await openSettings(page)
  r.hintAfter = await settings2.locator(sel('existing-run-runtime-change-hint')).count()
  r.workerAfter = (await memberRow(settings2, '/worker').innerText()).replace(/\s+/g, ' ')
  assert(r.hintAfter === 0 && /Antigravity CLI/i.test(r.workerAfter), 'the settings do not show the new runtime without a hint', r)
  await shot(page, 'RSM-01-settings-after')
  step('Team: after the reload the chat shows the earlier turns and one marker; the settings show the worker on Antigravity')
  return r
})


const openOrgRun = async (page, orgRunId) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const group = page.locator(sel(`agent-org-definition-${definitions.org.id}`))
  await waitFor('Org group', async () => {
    if (await group.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    return group.isVisible().catch(() => false)
  }, 60000, 1500)
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  await page.locator(sel(`agent-org-run-open-${orgRunId}`)).click(); await delay(2500)
}
const createOrg = async (ctx) => {
  const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: {
    agentOrgDefinitionId: definitions.org.id, rootConfiguration: nativeLaunch(ctx.nativeModel, ctx.workspace), agentOverrides: [] } })).createAgentOrgRun
  assert(created.success, created.message)
  return created.agentOrgRunId
}

/**
 * One Org member's journey in the real surface: the Org is stopped; the member's row in the Org's Settings offers the other agent runtimes;
 * Antigravity is chosen and saved; the member's first message makes the switch; reopening shows the earlier turn, one marker and the answer.
 * `address` is '/direct' (a direct Agent) or '/crew/worker' (an Agent of the mounted Team, a nested row).
 */
const orgMemberJourney = async (page, ctx, address, name) => {
  const r = { address, shotPrefix: `${name}` }
  const findings = []
  const check = (ok, text) => { if (!ok) findings.push(text); return ok }
  const orgRunId = await createOrg(ctx); r.orgRunId = orgRunId
  const orgDir = path.join(dataRoot, 'memory', 'agent_orgs', orgRunId)
  const memberId = (await memberNode('org', orgRunId, address)).agentRunId
  const lead = (await memberNode('org', orgRunId, '/crew/lead')).agentRunId
  const earlier = `NATIVE-${name.toUpperCase()}-ONE`
  await talkOrg(orgRunId, memberId, `${earlier} please answer`)
  await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}', { id: orgRunId })
  const openMemberChat = async () => {
    if (address.startsWith('/crew/')) {
      const rowId = sel(`agent-org-agent-row-${memberId}`)
      if (!(await page.locator(rowId).isVisible().catch(() => false))) {
        const teamRow = page.locator('[data-test^="agent-org-team-row-"]').first()
        await teamRow.locator('xpath=preceding-sibling::*[1]').click().catch(() => {})
        if (!(await page.locator(rowId).isVisible().catch(() => false))) await teamRow.click()
        await delay(600)
      }
    }
    await page.locator(sel(`agent-org-agent-row-${memberId}`)).click(); await page.locator(sel('workspace-header-edit-config')).waitFor({ timeout: 60000 }); await settle(page, 1500)
  }
  await openOrgRun(page, orgRunId)
  await openMemberChat()
  const view = await openSettings(page)
  r.rootModelEditable = await view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`).count()
  await shot(page, `${name}-settings`)
  let row
  if (address.startsWith('/crew/')) { await openMember(view, '/crew'); row = await openMember(view, address) } else row = await openMember(view, address)
  await shot(page, `${name}-row-open`)
  await chooseAgy(page, row, r)
  r.hint = await view.locator(sel('existing-run-runtime-change-hint')).allInnerTexts()
  await shot(page, `${name}-unsaved`)
  r.saveNote = await saveAndWait(page, view)
  check(!r.saveNote, `saving the switch shows an error in the Settings: ${String(r.saveNote).replace(/\s+/g, ' ').slice(0, 200)}`)
  await shot(page, `${name}-saved`)
  const nodes = walkAgents(await readJson(path.join(orgDir, 'agent_org_run_execution_tree.json'))).filter((m) => m.launchConfiguration)
  const node = nodes.find((m) => m.address === address)
  r.pending = { runtime: node.launchConfiguration.runtimeKind, pendingFrom: node.pendingRuntimeSwitch?.from?.runtimeKind ?? null }
  assert(r.pending.runtime === AGY && r.pending.pendingFrom === NATIVE, 'the server did not record the pending switch', r.pending)
  assert(nodes.filter((m) => m.pendingRuntimeSwitch).length === 1, 'another member holds a pending switch', nodes.filter((m) => m.pendingRuntimeSwitch).map((m) => m.address))
  step(`Org ${address}: the server holds the pending switch on that member only`, r.pending)

  // The first message makes the switch.
  await page.locator(sel('run-config-back-to-events')).click().catch(() => {}); await settle(page, 800)
  await openOrgRun(page, orgRunId); await openMemberChat()
  await sendFromComposer(page, 'ECHO_INPUT')
  await waitFor('marker in the chat', async () => /Agent runtime changed from AutoByteus/.test(await pageText(page)), 180000, 1000)
  await shot(page, `${name}-after-switch-live`)
  const folder = await findFolder(orgDir, memberId)
  const manifest = await readJson(path.join(folder, 'raw_traces_manifest.json'))
  r.segments = manifest.segments.map((x) => ({ runtime: x.runtime_kind, type: x.boundary_type, status: x.status }))
  assert(r.segments.length === 1 && r.segments[0].runtime === NATIVE, 'one segment holding the native agent', r.segments)
  const done = walkAgents(await readJson(path.join(orgDir, 'agent_org_run_execution_tree.json'))).filter((m) => m.launchConfiguration)
  check(done.every((m) => !m.pendingRuntimeSwitch), 'a pending switch is left after the first message')
  check(done.find((m) => m.address === address).launchConfiguration.runtimeKind === AGY, 'the member is not on Antigravity after the switch')
  check(address === '/crew/worker' ? (await findFolder(orgDir, lead)) === null : true, 'the unrelated Team member started')
  step(`Org ${address}: the first message switched it (one segment, committed)`)

  // Reopen: the earlier turn, one marker and the answer.
  await openOrgRun(page, orgRunId); await openMemberChat()
  const text = await waitFor('the reopened chat', async () => { const t = await pageText(page); return t.includes(earlier) && /Agent runtime changed from AutoByteus/.test(t) ? t : null }, 120000, 1000)
  r.markerCount = (text.match(/Agent runtime changed from/g) ?? []).length
  check(r.markerCount === 1, `the reopened chat shows ${r.markerCount} markers`)
  await shot(page, `${name}-after-reopen`)
  const again = await openSettings(page)
  if (address.startsWith('/crew/')) await openMember(again, '/crew')
  r.rowAfter = (await memberRow(again, address).innerText()).replace(/\s+/g, ' ')
  r.hintAfter = await again.locator(sel('existing-run-runtime-change-hint')).count()
  check(r.hintAfter === 0 && /Antigravity CLI/i.test(r.rowAfter), 'the settings do not show the new runtime without a hint')
  r.noteAfter = await again.locator(sel('existing-run-note')).count()
  check(r.noteAfter === 0, 'the Settings of the reopened Org show an error note')
  await shot(page, `${name}-settings-after`)
  r.findings = findings
  if (findings.length) { const error = new Error(findings.join(' | ')); error.details = r; throw error }
  return r
}
defineCase('RSM-02', 'Org: switch a direct Agent in the stopped Org\'s Settings, message it, reopen the chat', (page, ctx) => orgMemberJourney(page, ctx, '/direct', 'rsm02-direct'))
defineCase('RSM-03', 'Org: switch an Agent of a mounted Team (a nested row) in the stopped Org\'s Settings, message it, reopen the chat', (page, ctx) => orgMemberJourney(page, ctx, '/crew/worker', 'rsm03-nested'))

defineCase('RSM-04', 'Delegated copy: switch a stopped copy in its host\'s Settings, wake it, reopen the chat', async (page, ctx) => {
  const r = { shotPrefix: 'rsm04-copy' }
  const findings = []
  const check = (ok, text) => { if (!ok) findings.push(text); return ok }
  const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: {
    agentDefinitionId: definitions.host.id, workspaceRootPath: ctx.workspace, llmModelIdentifier: AGY_MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY } })).createAgentRun
  assert(created.success, created.message)
  const hostId = created.runId; r.hostId = hostId
  const hostRaw = () => rawRecords(path.join(dataRoot, 'memory', 'agents', hostId))
  const callHost = async (name, args) => {
    const before = (await hostRaw()).filter((x) => x.trace_type === 'assistant' && String(x.content).startsWith('CALLED:')).length
    await talkAgent(hostId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`)
    const replies = (await hostRaw()).filter((x) => x.trace_type === 'assistant' && String(x.content).startsWith('CALLED:'))
    assert(replies.length > before, `the host did not answer ${name}`)
    const called = JSON.parse(String(replies.at(-1).content).slice('CALLED:'.length))
    return called.structuredContent ?? JSON.parse(called.content.find((part) => part.type === 'text').text)
  }
  const delegated = await callHost('delegate_task', { recipient_address: '/switch_probe_writer', description: 'COPY-ONE please answer' })
  assert(delegated.delegated && delegated.target_agent_run_id, 'the Writer copy did not start', delegated)
  const copyId = delegated.target_agent_run_id; r.copyId = copyId
  const copyDir = () => findFolder(path.join(dataRoot, 'memory', 'agents'), copyId)
  await waitFor('the native copy answered', async () => { const dir = await copyDir(); return dir && (await rawRecords(dir)).some((x) => x.trace_type === 'assistant') }, 120000, 1000)
  await delay(3000)
  const stopped = (await gql('mutation($input:DelegatedExecutionTargetInput!){stopDelegatedExecution(input:$input){success outcome}}', { input: { rootKind: 'AGENT', rootRunId: hostId, agentRunId: copyId } })).stopDelegatedExecution
  assert(stopped.success, 'the copy did not stop', stopped)
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: hostId })

  // Open the host in the UI and its Settings: the copy row.
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const hostRow = page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${hostId}"]`)
  await revealRow(page, hostRow, definitions.host.name)
  await hostRow.click(); await page.locator(sel('workspace-header-edit-config')).waitFor({ timeout: 120000 }); await settle(page, 1500)
  const view = await openSettings(page)
  const section = page.locator(sel('run-delegated-launches')); await section.waitFor({ timeout: 60000 })
  const copyRow = section.locator(`[data-test^="run-member-"][data-test$="@${copyId}"]`).first()
  await copyRow.waitFor({ timeout: 60000 })
  await shot(page, 'rsm04-copy-settings')
  const toggle = copyRow.locator(sel('run-member-toggle')).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await copyRow.locator(sel('run-member-detail')).first().waitFor(); await delay(300)
  r.beforeSummary = (await copyRow.locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  await chooseAgy(page, copyRow, r)
  r.hint = await view.locator(sel('existing-run-runtime-change-hint')).allInnerTexts()
  await shot(page, 'rsm04-copy-unsaved')
  r.saveNote = await saveAndWait(page, view)
  check(!r.saveNote, `saving the copy's switch shows an error in the Settings: ${String(r.saveNote).replace(/\s+/g, ' ').slice(0, 200)}`)
  await shot(page, 'rsm04-copy-saved')
  r.savedSummary = await waitFor('the saved copy row shows the choice', async () => { const t = (await copyRow.locator(sel('run-member-summary')).first().innerText().catch(() => '')).replace(/\s+/g, ' '); return /Antigravity CLI/i.test(t) ? t : null }, 10000, 500).catch(async () => (await copyRow.locator(sel('run-member-summary')).first().innerText().catch(() => '')).replace(/\s+/g, ' '))
  check(/Antigravity CLI/i.test(r.savedSummary), `the saved copy row does not show Antigravity: ${r.savedSummary}`)

  // The saved choice is still shown after a fresh open of the host's Settings (the switch has not happened yet).
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  await revealRow(page, hostRow, definitions.host.name)
  await hostRow.click(); await page.locator(sel('workspace-header-edit-config')).waitFor({ timeout: 120000 }); await settle(page, 1500)
  const reopened = await openSettings(page)
  const reopenedRow = reopened.locator(`[data-test^="run-member-"][data-test$="@${copyId}"]`).first()
  await reopenedRow.waitFor({ timeout: 60000 })
  r.reopenedSummary = (await reopenedRow.locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  check(/Antigravity CLI/i.test(r.reopenedSummary), `after a fresh open of the Settings the copy row does not show the saved Antigravity choice: ${r.reopenedSummary}`)
  await shot(page, 'rsm04-copy-settings-reopened')

  // Wake the copy through its host (restored by its first message); the copy switches at that first input.
  const beforeDir = await copyDir()
  r.beforeFiles = (await fs.readdir(beforeDir)).sort()
  await callHost('send_message_to', { target_agent_run_id: copyId, content: 'ECHO_INPUT' })
  await waitFor('the copy switched', async () => { const dir = await copyDir(); return dir && (await rawRecords(dir)).some((x) => String(x.correlation_id ?? '').startsWith('runtime_switch:')) && (await rawRecords(dir)).some((x) => x.trace_type === 'assistant' && /ECHO/.test(String(x.content))) }, 180000, 1000)
  const manifest = await readJson(path.join(await copyDir(), 'raw_traces_manifest.json'))
  r.segments = manifest.segments.map((x) => ({ runtime: x.runtime_kind, type: x.boundary_type, status: x.status }))
  check(r.segments.length === 1 && r.segments[0].runtime === NATIVE, `one segment holding the native agent: ${JSON.stringify(r.segments)}`)
  step('Delegated copy: saved in the host\'s Settings; the first message switched it (one segment)')

  // Open the copy's chat from the sidebar: the earlier turn, one marker and the answer; reopen after a fresh load.
  const openCopyChat = async () => {
    await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
    const host = page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${hostId}"]`)
    await revealRow(page, host, definitions.host.name)
    await host.click(); await page.locator(sel('workspace-header-edit-config')).waitFor({ timeout: 120000 }); await settle(page, 1500)
    const row = page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id="${copyId}"]`).first()
    await waitFor('copy row in the sidebar', async () => { if (await row.isVisible().catch(() => false)) return true; await expandWorkspaces(page); return row.isVisible().catch(() => false) }, 60000, 1500)
    await row.click(); await settle(page, 2500)
  }
  await openCopyChat()
  const text = await waitFor('the copy chat', async () => { const t = await page.locator('body').innerText(); return /COPY-ONE/.test(t) && /Agent runtime changed from AutoByteus/.test(t) ? t : null }, 120000, 1000).catch(() => null)
  check(!!text, 'the copy chat does not show the earlier turn and the marker')
  r.markerCount = ((text ?? '').match(/Agent runtime changed from/g) ?? []).length
  check(r.markerCount === 1, `the copy chat shows ${r.markerCount} markers`)
  await shot(page, 'rsm04-copy-chat-after')
  r.findings = findings
  if (findings.length) { const error = new Error(findings.join(' | ')); error.details = r; throw error }
  return r
})

defineCase('RSM-05', 'Team default: the root runtime menu of a stopped Team and of a stopped Org, and what a Team-default edit does to its linked members', async (page, ctx) => {
  const r = { shotPrefix: 'rsm05' }
  const launch = nativeLaunch(ctx.nativeModel, ctx.workspace)
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: definitions.team.id, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: ['lead', 'worker'].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: definitions.agent.id, ...launch })) } })).createAgentTeamRun
  assert(created.success, created.message)
  const teamRunId = created.teamRunId; r.teamRunId = teamRunId
  for (const address of ['/lead', '/worker']) await talkTeam(teamRunId, (await memberNode('team', teamRunId, address)).agentRunId, `TEAM-DEFAULT-${address.slice(1)} please answer`)
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
  await openTeamRun(page, teamRunId)
  const view = await openSettings(page)
  const trigger = view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`)
  r.rootTrigger = await trigger.count()
  await trigger.first().click(); await page.locator(sel('chat-model-menu')).first().waitFor()
  await delay(1500)
  r.rootRuntimeRows = await runtimeRows(page)
  r.rootLockedBanner = await page.locator(sel('chat-model-locked-runtime')).count()
  r.rootBannerText = r.rootLockedBanner ? (await page.locator(sel('chat-model-locked-runtime')).first().innerText()).replace(/\s+/g, ' ') : null
  await shot(page, 'rsm05-team-root-menu')
  await page.keyboard.press('Escape'); await delay(300)
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
    await fs.mkdir(outDir, { recursive: true })
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
    const env = { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
      AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', LMSTUDIO_HOSTS: fake.origin, ANTIGRAVITY_CLI_COMMAND: fakeAgy, AGY_FAKE_CASE: 'linked_skills' }
    backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
    await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 1000)
    frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
    await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)

  }
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => evidence.browserErrors.push(e.message))
  for (const route of ['/chat', '/workspace', '/agents']) { await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000) }
  const context0 = attached ? { nativeModel: attached.nativeModel, workspace: attached.workspace } : await setup()
  Object.assign(evidence, { definitions })
  if (hold) {
    await fs.writeFile(path.join(outDir, 'hold.json'), JSON.stringify({ backendUrl, frontUrl, ownedRoot, definitions, ...context0 }, null, 2))
    console.log(`HOLD ${frontUrl} ${backendUrl} (stop with SIGTERM)`)
    await new Promise((resolve) => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve) })
  }
  for (const entry of cases.filter((c) => !onlyCases.length || onlyCases.includes(c.id))) {
    const started = Date.now()
    try {
      evidence[entry.id] = { title: entry.title, result: 'Pass', details: await entry.fn(page, context0), ms: Date.now() - started }
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${entry.id}-failure.png`) }).catch(() => {})
      evidence[entry.id] = { title: entry.title, result: 'Fail', error: error.message, details: error.details ?? null, ms: Date.now() - started }
    }
    console.log(`${entry.id} ${evidence[entry.id].result}${evidence[entry.id].error ? ` — ${evidence[entry.id].error}` : ''}`)
  }
  if (evidence.browserErrors.length) console.log(`  browser page errors: ${evidence.browserErrors.length} (see the evidence file)`)
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[runtime-switch-members-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  await fake?.close().catch(() => {})
  if (ownedRoot && !keep && !attach) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'runtime-switch-members-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
