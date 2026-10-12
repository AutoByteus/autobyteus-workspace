// Delegated launch defaults probe (ticket delegated-launch-config-defaults, SR-002).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) with scripted runtimes only,
// no inference and no credentials: the scripted AGY CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`,
// `CALL_TOOL:{…}` makes an agent call the real tool; `AGY_FAKE_EXTRA_MODELS` offers a second model), the recorded-fixture
// fake Grok CLI (a second runtime), and a Codex command that does not exist (Codex unavailable). Everything runs in an
// owned temp data root and HOME on free ports with a sanitized environment; the user's app and `~/.autobyteus` are never
// touched. Definitions: Build team (no default) = lead (none), engineer (Grok), reviewer (AGY ALT), unoffered (an AGY
// model not offered); Pair team (default AGY ALT) = lead, engineer, unoffered; Squad team (default not offered) = lead,
// engineer, reviewer, offline (Codex), unoffered; Writer agent (ALT); Org (default AGY) = writer + Pair placed team.
//
// Cases:
//   DLP-001 (AC-011, AC-013, DEC-009, AR-003) New chat for the Build team: seeded rows (engineer Grok, reviewer ALT,
//           customized), unoffered follows the root with a note, lead follows; the root is changed (to ALT and back):
//           seeded rows keep their own values (pinned, also when equal to the root); the user sets the lead's model;
//           the reviewer is reset and follows the root; Run → the created team run has exactly what was shown.
//   DLP-002 (AC-012) Org launch page: the writer and the placed Pair team are seeded from their defaults, the Pair
//           engineer from its agent default, the Pair unoffered member follows its team with a note; Run → readback.
//   DLP-003 (AC-010, AC-005 UI) A standalone Agent run whose agent (scripted) delegates the Squad (catalog copy with
//           fallbacks), brings in the Pair team and the Writer, and delegates an extra copy at the Pair address: the
//           delegating conversation shows the `launch_notes`; Settings lists every collaborator/copy row read-only with
//           runtime, model, source and fallback notes; the run's own settings stay editable.
//   DLP-004 (AC-010) A Team run and an Org run whose manager delegates the Squad (and, in the Org, brings in the Pair):
//           their Settings list the same rows.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome. No CLI logins.
// Usage: pnpm -C autobyteus-web test:e2e:delegated-launch-defaults [--output-dir <fresh dir>] [--cases DLP-001,DLP-003] [--keep]
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const rootDir = path.resolve(webDir, '..')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(webDir, arg('output-dir', `test-results/delegated-launch-defaults-${Date.now()}`))
const keep = process.argv.includes('--keep')
const onlyCases = arg('cases', null)?.split(',') ?? null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const AGY = 'antigravity_cli'
const GROK = 'grok_build'
const MODEL = 'gemini-3.8-flash-low'
const ALT = 'dlc-alt-model'
const NOT_OFFERED = 'dlc-no-such-model'
const TEAM_NOT_OFFERED = 'dlc-no-such-team-model'
const GROK_MODEL = 'grok-4.7'
// Display names the scripted AGY CLI reports for MODEL and ALT (`agy models`); rows and summaries show these.
const MODEL_LABEL = 'Gemini test'
const ALT_LABEL = 'Retiring test model'

const evidence = { startedAt: new Date().toISOString(), cases: {}, processes: [], cleanup: [], observations: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 500) => {
  const start = Date.now()
  let last
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch (error) { last = error } await delay(interval) }
  throw new Error(`Timed out waiting for ${label}${last ? ` (${last.message})` : ''}`)
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

let ownedRoot, dataRoot, workspace, backendUrl, frontUrl, browser
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`
const objectsIn = (value) => Array.isArray(value) ? value.flatMap(objectsIn) : value && typeof value === 'object' ? [value, ...Object.values(value).flatMap(objectsIn)] : []
const pick = (record, camel) => record?.[camel] ?? record?.[camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)]
const lc = (c) => ({ runtime: pick(c, 'runtimeKind'), model: pick(c, 'llmModelIdentifier') })

// ---------------------------------------------------------------------------------------------
// Fixtures: definitions through the product's GraphQL API.
const ids = {}
const names = {}
const seed = async () => {
  const agent = async (key, defaultLaunchConfig = null) => {
    names[key] = `${key[0].toUpperCase()}${key.slice(1)} ${randomUUID().slice(0, 4)}`
    ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
      name: names[key], description: `${key}.`, instructions: 'Follow the request.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
  }
  await agent('manager'); await agent('lead'); await agent('worker')
  await agent('engineer', { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL })
  await agent('reviewer', { runtimeKind: AGY, llmModelIdentifier: ALT })
  await agent('writer', { runtimeKind: AGY, llmModelIdentifier: ALT })
  await agent('offline', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5' })
  await agent('unoffered', { runtimeKind: AGY, llmModelIdentifier: NOT_OFFERED })
  const team = async (key, members, coordinator, defaultLaunchConfig = null) => {
    names[key] = `${key[0].toUpperCase()}${key.slice(1)} Team ${randomUUID().slice(0, 4)}`
    ids[key] = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
      name: names[key], description: `${key}.`, instructions: 'Work together.', coordinatorMemberName: coordinator, handoffs: [],
      ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}),
      nodes: Object.entries(members).map(([memberName, ref]) => ({ memberName, ref: ids[ref], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
  }
  await team('build', { lead: 'lead', engineer: 'engineer', reviewer: 'reviewer', unoffered: 'unoffered' }, 'lead')
  await team('pair', { lead: 'lead', engineer: 'engineer', unoffered: 'unoffered' }, 'lead', { runtimeKind: AGY, llmModelIdentifier: ALT })
  await team('squad', { lead: 'lead', engineer: 'engineer', reviewer: 'reviewer', offline: 'offline', unoffered: 'unoffered' }, 'lead',
    { runtimeKind: AGY, llmModelIdentifier: TEAM_NOT_OFFERED })
  await team('home', { manager: 'manager', worker: 'worker' }, 'manager')
  const org = async (key, members, defaultLaunchConfig) => {
    names[key] = `${key[0].toUpperCase()}${key.slice(1)} Org ${randomUUID().slice(0, 4)}`
    ids[key] = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
      name: names[key], description: `${key}.`, instructions: 'Plan.', handoffs: [], members, ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentOrgDefinition.id
  }
  await org('launchOrg', [{ memberName: 'writer', ref: ids.writer, refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'pair', ref: ids.pair, refType: 'AGENT_TEAM', refScope: 'SHARED' }], { runtimeKind: AGY, llmModelIdentifier: MODEL })
  await org('hostOrg', [{ memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' }], null)
}
const rootConfig = () => ({ workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY })

// ---------------------------------------------------------------------------------------------
// Driving a scripted root agent: the backend WebSocket a client uses, one message per agent tool call.
const sendToRoot = async (kind, rootId, managerRunId, content) => {
  const route = kind === 'agent' ? 'agent' : kind === 'team' ? 'agent-team' : 'agent-org'
  const socket = new WebSocket(`${backendUrl.replace('http', 'ws')}/ws/${route}/${rootId}`)
  const frames = []
  socket.addEventListener('message', (event) => frames.push(JSON.parse(String(event.data))))
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  await waitFor(`${route} socket ready`, () => frames.length > 0, 30000, 200)
  const messageId = `probe-${randomUUID()}`
  const ids = { message_id: messageId, dedupe_key: `agent_run_input:probe:${messageId}` }
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: kind === 'org'
    ? { root_subject_kind: 'agent_org', root_run_id: rootId, target_agent_run_id: managerRunId, command_id: randomUUID(), ...ids, content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: managerRunId, ...ids, content, context_file_paths: [], image_urls: [] } }))
  return socket
}
const liveTree = async (kind, rootId) => kind === 'agent'
  ? (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree
  : kind === 'team'
    ? (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: rootId })).getTeamRunResumeConfig.executionTree
    : (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: rootId })).getAgentOrgRootHistory.org
const teamCopies = (tree, teamKey) => objectsIn(tree).filter((r) => pick(r, 'teamRunId') && pick(r, 'startedAt') && Array.isArray(r.members)
  && String(r.address ?? '').startsWith(`/${segment(names[teamKey])}`))
const collaboratorAt = (tree, key) => objectsIn(tree).find((r) => pick(r, 'addedViaAgentRunId') && r.address === `/${segment(names[key])}`)
/** One scripted tool call by the root's manager; resolves when `done(tree)` holds. */
const managerDoes = async (kind, rootId, managerRunId, tool, args, done) => {
  const socket = await sendToRoot(kind, rootId, managerRunId, callTool(tool, args))
  try { return await waitFor(`${kind}: ${tool} ${JSON.stringify(args)}`, async () => done(await liveTree(kind, rootId)), 90000, 1000) }
  finally { socket.close() }
}
const delegateSquadAndPair = async (kind, rootId, managerRunId, { extraCopy, writer }) => {
  await managerDoes(kind, rootId, managerRunId, 'delegate_task', { recipient_address: `/${segment(names.squad)}`, description: 'Squad work.' }, (t) => teamCopies(t, 'squad').length === 1)
  await managerDoes(kind, rootId, managerRunId, 'send_message_to', { recipient_address: `/${segment(names.pair)}`, content: 'Pair work.' }, (t) => collaboratorAt(t, 'pair'))
  if (extraCopy) await managerDoes(kind, rootId, managerRunId, 'delegate_task', { recipient_address: `/${segment(names.pair)}`, description: 'Extra Pair work.' }, (t) => teamCopies(t, 'pair').length >= 1)
  if (writer) await managerDoes(kind, rootId, managerRunId, 'send_message_to', { recipient_address: `/${segment(names.writer)}`, content: 'Write.' }, (t) => collaboratorAt(t, 'writer'))
}

// ---------------------------------------------------------------------------------------------
// Page helpers (the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const settle = async (page, ms = 600) => { await delay(ms); await page.waitForLoadState('domcontentloaded').catch(() => {}) }
const shot = async (page, name, width) => {
  const before = page.viewportSize()
  if (width) { await page.setViewportSize({ width, height: width < 600 ? 844 : 900 }); await delay(700) }
  await page.screenshot({ path: path.join(outDir, `${name}.png`) })
  if (width) { await page.setViewportSize(before); await delay(400) }
}
const chooseModel = async (page, scope, runtimeKind, model) => {
  await scope.locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  await waitFor(`${runtimeKind} model list`, async () => {
    if (await page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false)) return true
    await page.locator(sel(`chat-runtime-${runtimeKind}`)).hover(); await delay(300)
    if (!(await page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false))) await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
    await delay(700)
    return page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false)
  }, 120000, 500)
  const row = page.locator(sel(`chat-model-list-${runtimeKind}`)).locator(`${MODEL_ROW}${sel(`chat-model-option-${model}`)}`).first()
  await row.waitFor({ timeout: 60000 })
  const runtimeRow = await page.locator(sel(`chat-runtime-${runtimeKind}`)).boundingBox({ timeout: 1000 }).catch(() => null)
  const flyoutBox = await page.locator(sel(`chat-model-list-${runtimeKind}`)).boundingBox({ timeout: 1000 }).catch(() => null)
  if (runtimeRow && flyoutBox && flyoutBox.x > runtimeRow.x) await page.mouse.move(flyoutBox.x + 12, Math.min(Math.max(runtimeRow.y + runtimeRow.height / 2, flyoutBox.y + 6), flyoutBox.y + flyoutBox.height - 6), { steps: 5 })
  await row.click()
  await settle(page, 500)
}
const openDrawer = async (page) => {
  await page.locator(sel('run-members-open')).click()
  const drawer = page.locator(sel('run-member-settings-drawer')); await drawer.waitFor(); await delay(500)
  return drawer
}
const closeDrawer = async (drawer) => { await drawer.locator(sel('run-member-settings-done')).click(); await delay(500) }
const memberRow = (root, address) => root.locator(sel(`run-member-${address}`)).first()
const openMember = async (root, address) => {
  const row = memberRow(root, address)
  const toggle = row.locator(sel('run-member-toggle')).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await row.locator(sel('run-member-detail')).first().waitFor(); await delay(300)
  return row
}
const rowState = async (root, address) => {
  const row = memberRow(root, address)
  return {
    customized: await row.getAttribute('data-customized'),
    summary: (await row.locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' '),
    note: await row.locator(sel('run-member-launch-note')).first().innerText({ timeout: 1000 }).catch(() => null),
  }
}
const teamRunIds = async (teamDefinitionId) => {
  const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
  return h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).filter((t) => t.teamDefinitionId === teamDefinitionId).flatMap((t) => t.runs.map((x) => x.teamRunId))
}
/** The read-only Settings rows (RunDelegatedLaunchList) as rendered. */
const delegatedRows = async (page) => {
  const section = page.locator(sel('run-delegated-launches'))
  await section.waitFor({ timeout: 60000 })
  return section.locator('li[data-source]').evaluateAll((els) => els.map((el) => ({
    test: el.getAttribute('data-test').replace('run-delegated-', ''),
    member: el.classList.contains('pl-9'),
    source: el.getAttribute('data-source'),
    badge: el.querySelector('span.rounded-full')?.textContent?.trim() ?? null,
    launch: el.querySelector('[data-test="run-delegated-launch"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    fallbacks: [...el.querySelectorAll('[data-test="run-delegated-fallback"]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
  })))
}
const rowsAt = (rows, address) => rows.filter((row) => row.test === address)
/** The Squad copy rows every root shows (AC-010, AC-005): the Team, its five members, their sources and notes. */
const assertSquadRows = (rows, label) => {
  const squad = `/${segment(names.squad)}`
  const [team] = rowsAt(rows, squad)
  assert(team && !team.member && team.source === 'inherited' && team.badge === 'Delegated copy' && team.fallbacks.length === 1
    && team.fallbacks[0].includes(TEAM_NOT_OFFERED) && /not available/.test(team.fallbacks[0]) && team.launch.includes(MODEL_LABEL), `${label}: Squad Team row`, { team, rows })
  const member = (name) => rowsAt(rows, `${squad}/${name}`)[0]
  const m = { lead: member('lead'), engineer: member('engineer'), reviewer: member('reviewer'), offline: member('offline'), unoffered: member('unoffered') }
  assert(Object.values(m).every((row) => row?.member), `${label}: Squad member rows`, { m, rows })
  assert(m.engineer.source === 'agent_default' && /grok/i.test(m.engineer.launch) && m.engineer.fallbacks.length === 0, `${label}: engineer row (Grok, agent default)`, m.engineer)
  assert(m.reviewer.source === 'agent_default' && m.reviewer.launch.includes(ALT_LABEL) && m.reviewer.fallbacks.length === 0, `${label}: reviewer row (ALT, agent default)`, m.reviewer)
  // A member without its own default shows its Team's source (DS-005), here the skipped team default.
  assert(m.lead.source === 'inherited' && m.lead.launch.includes(MODEL_LABEL) && JSON.stringify(m.lead.fallbacks) === JSON.stringify(team.fallbacks), `${label}: lead row (the Team's source)`, m.lead)
  assert(m.offline.source === 'inherited' && m.offline.launch.includes(MODEL_LABEL) && m.offline.fallbacks.length === 1
    && /gpt-5\.5/.test(m.offline.fallbacks[0]) && /is not available/.test(m.offline.fallbacks[0]), `${label}: offline row (Codex unavailable note)`, m.offline)
  assert(m.unoffered.source === 'inherited' && m.unoffered.launch.includes(MODEL_LABEL) && m.unoffered.fallbacks.length === 1 && m.unoffered.fallbacks[0].includes(NOT_OFFERED), `${label}: unoffered row (model note)`, m.unoffered)
}
const assertPairCollaboratorRows = (rows, label) => {
  const pair = `/${segment(names.pair)}`
  const team = rowsAt(rows, pair).find((row) => row.badge === 'Collaborator')
  assert(team && team.source === 'team_default' && team.launch.includes(ALT_LABEL) && team.fallbacks.length === 0, `${label}: Pair collaborator Team row`, { team, rows })
  const engineer = rowsAt(rows, `${pair}/engineer`)[0]
  const unoffered = rowsAt(rows, `${pair}/unoffered`)[0]
  assert(engineer?.source === 'agent_default' && /grok/i.test(engineer.launch), `${label}: Pair engineer row`, engineer)
  assert(unoffered?.source === 'team_default' && unoffered.launch.includes(ALT_LABEL) && unoffered.fallbacks.length === 1 && unoffered.fallbacks[0].includes(NOT_OFFERED), `${label}: Pair unoffered row`, unoffered)
}
const openSettings = async (page) => {
  await page.locator(sel('workspace-header-edit-config')).click()
  const view = page.locator(sel('existing-run-settings')); await view.waitFor({ timeout: 60000 }); await settle(page, 2000)
  return view
}
const expandWorkspaces = async (page) => {
  const folders = page.locator(sel('workspace-row'))
  for (let i = 0; i < await folders.count(); i += 1) {
    const row = folders.nth(i)
    const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
    if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
  }
}

// ---------------------------------------------------------------------------------------------
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('DLP-001', 'AC-011/AC-013: New chat for a Team seeds members from their defaults; root changes keep seeded rows; member change and reset; Run launches what is shown', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-teams`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  const card = page.locator('main').getByText(names.build, { exact: true }).first()
  await card.waitFor({ timeout: 120000 })
  await card.locator('xpath=ancestor::*[.//button[normalize-space()="Run"]][1]').getByRole('button', { name: 'Run', exact: true }).first().click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await settle(page, 3000)
  const composer = page.locator(sel('chat-composer'))
  await chooseModel(page, composer, AGY, MODEL)
  let drawer = await openDrawer(page)
  await waitFor('engineer seeded', async () => (await rowState(drawer, '/engineer')).customized === 'true', 60000)
  r.seeded = { lead: await rowState(drawer, '/lead'), engineer: await rowState(drawer, '/engineer'), reviewer: await rowState(drawer, '/reviewer'), unoffered: await rowState(drawer, '/unoffered') }
  assert(r.seeded.engineer.customized === 'true' && /grok/i.test(r.seeded.engineer.summary), 'engineer seeded from its Grok default', r.seeded)
  assert(r.seeded.reviewer.customized === 'true' && r.seeded.reviewer.summary.includes(ALT_LABEL), 'reviewer seeded from its ALT default', r.seeded)
  assert(r.seeded.lead.customized === 'false' && r.seeded.lead.summary.includes(MODEL_LABEL) && r.seeded.lead.note === null, 'lead (no default) follows the root', r.seeded)
  assert(r.seeded.unoffered.customized === 'false' && r.seeded.unoffered.note?.includes(NOT_OFFERED), 'unusable default: follows the root with a note', r.seeded)
  await shot(page, 'DLP-001-new-chat-team-seeded-880', 880)
  await shot(page, 'DLP-001-new-chat-team-seeded-390', 390)
  await closeDrawer(drawer)
  // AR-003: the root set to the reviewer's own model and back; the pinned reviewer keeps its own value.
  await chooseModel(page, composer, AGY, ALT)
  await chooseModel(page, composer, AGY, MODEL)
  drawer = await openDrawer(page)
  r.afterRootChanges = { lead: await rowState(drawer, '/lead'), engineer: await rowState(drawer, '/engineer'), reviewer: await rowState(drawer, '/reviewer') }
  assert(r.afterRootChanges.reviewer.customized === 'true' && r.afterRootChanges.reviewer.summary.includes(ALT_LABEL) && r.afterRootChanges.engineer.customized === 'true'
    && /grok/i.test(r.afterRootChanges.engineer.summary) && r.afterRootChanges.lead.customized === 'false' && r.afterRootChanges.lead.summary.includes(MODEL_LABEL), 'seeded rows kept through root changes', r.afterRootChanges)
  // The user's own member choice; then the reviewer reset follows the root again.
  const lead = await openMember(drawer, '/lead')
  await chooseModel(page, lead, AGY, ALT)
  await memberRow(drawer, '/reviewer').locator(sel('run-member-reset')).first().click(); await delay(600)
  r.afterEdits = { lead: await rowState(drawer, '/lead'), reviewer: await rowState(drawer, '/reviewer'), engineer: await rowState(drawer, '/engineer') }
  assert(r.afterEdits.lead.customized === 'true' && r.afterEdits.lead.summary.includes(ALT_LABEL) && r.afterEdits.reviewer.customized === 'false'
    && r.afterEdits.reviewer.summary.includes(MODEL_LABEL) && r.afterEdits.engineer.customized === 'true', 'member change and reset', r.afterEdits)
  await closeDrawer(drawer)
  r.line = (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' ')
  const before = new Set(await teamRunIds(ids.build))
  await composer.locator('textarea').first().click(); await page.keyboard.type('Start the work.')
  await page.locator(sel('chat-primary-action')).click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.build)).find((id) => !before.has(id)), 60000)
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree
  r.members = Object.fromEntries((tree.root_team.members ?? []).map((m) => [m.address, lc(m.launch_configuration ?? m.launchConfiguration)]))
  const want = { '/lead': { runtime: AGY, model: ALT }, '/engineer': { runtime: GROK, model: GROK_MODEL }, '/reviewer': { runtime: AGY, model: MODEL }, '/unoffered': { runtime: AGY, model: MODEL } }
  assert(JSON.stringify(Object.fromEntries(Object.keys(want).map((k) => [k, r.members[k]]))) === JSON.stringify(want), 'launched team run is not what the form showed', { got: r.members, want })
  return r
})

defineCase('DLP-002', 'AC-012: Org launch page seeds the placed team from its team default and agents from their agent defaults; Run launches what is shown', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.launchOrg}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 3000)
  r.root = (await page.locator(`${sel('org-launch-card')} ${sel('chat-model-trigger')}`).innerText()).replace(/\s+/g, ' ')
  const drawer = await openDrawer(page)
  await waitFor('writer seeded', async () => (await rowState(drawer, '/writer')).customized === 'true', 60000)
  const toggle = memberRow(drawer, '/pair').locator(sel('run-member-toggle')).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') { await toggle.click(); await delay(600) }
  r.seeded = { writer: await rowState(drawer, '/writer'), pair: await rowState(drawer, '/pair'), pairLead: await rowState(drawer, '/pair/lead'),
    pairEngineer: await rowState(drawer, '/pair/engineer'), pairUnoffered: await rowState(drawer, '/pair/unoffered') }
  assert(r.root.includes(MODEL_LABEL), 'Org root seeded from the Org default', r.root)
  assert(r.seeded.writer.customized === 'true' && r.seeded.writer.summary.includes(ALT_LABEL) && r.seeded.pair.customized === 'true' && r.seeded.pair.summary.includes(ALT_LABEL), 'writer and placed team seeded', r.seeded)
  assert(r.seeded.pairEngineer.customized === 'true' && /grok/i.test(r.seeded.pairEngineer.summary), 'placed-team engineer seeded (Grok)', r.seeded)
  assert(r.seeded.pairLead.customized === 'false' && r.seeded.pairUnoffered.customized === 'false' && r.seeded.pairUnoffered.note?.includes(NOT_OFFERED), 'unseeded team members follow the team; unusable default has a note', r.seeded)
  await shot(page, 'DLP-002-org-launch-seeded-1280', 1280)
  await shot(page, 'DLP-002-org-launch-seeded-390', 390)
  await closeDrawer(drawer)
  await page.locator(sel('org-launch-run')).click()
  await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 2500)
  const params = new URL(page.url()).searchParams
  r.orgRunId = params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.orgRunId })).getAgentOrgRunConfig.executionTree
  const root = tree.rootOrg ?? tree.root_org
  const writer = root.members.find((m) => m.address === '/writer')
  const pair = root.members.find((m) => m.address === '/pair')
  r.launched = { root: lc(pick(root, 'defaultLaunchConfiguration')), writer: lc(pick(writer, 'launchConfiguration')), pair: lc(pick(pair, 'defaultLaunchConfiguration')),
    pairMembers: Object.fromEntries(pair.members.map((m) => [m.address, lc(pick(m, 'launchConfiguration'))])) }
  const alt = { runtime: AGY, model: ALT }
  assert(JSON.stringify(r.launched) === JSON.stringify({ root: { runtime: AGY, model: MODEL }, writer: alt, pair: alt,
    pairMembers: { '/pair/lead': alt, '/pair/engineer': { runtime: GROK, model: GROK_MODEL }, '/pair/unoffered': alt } }), 'launched Org run is not what the form showed', r.launched)
  return r
})

defineCase('DLP-003', 'AC-010/AC-005: standalone Agent run with a Squad copy, Pair and Writer collaborators and an extra Pair copy: notes in the delegating conversation; read-only Settings rows', async (page) => {
  const r = {}
  const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...rootConfig() } })).createAgentRun
  assert(created.success, created.message)
  r.runId = created.runId
  await delegateSquadAndPair('agent', r.runId, r.runId, { extraCopy: true, writer: true })
  await page.goto(`${frontUrl}/chat?id=${r.runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 3000)
  // The delegating conversation shows the delegation result with its notes (the scripted actor echoes its tool result).
  r.conversationNote = await waitFor('launch notes in the conversation', async () => {
    const text = await page.locator('[data-testid="agent-workspace-surface"]').innerText()
    return text.includes('launch_notes') && text.includes(`${TEAM_NOT_OFFERED} could not be used`) ? true : null
  }, 60000, 1000)
  await shot(page, 'DLP-003-delegating-conversation-notes-1280', 1280)
  const view = await openSettings(page)
  r.rootEditable = await view.locator(sel('existing-run-root-card')).count()
  r.rows = await delegatedRows(page)
  assert(r.rootEditable === 1, 'the run root card is still shown', r)
  assertSquadRows(r.rows, 'Agent run')
  assertPairCollaboratorRows(r.rows, 'Agent run')
  const writer = rowsAt(r.rows, `/${segment(names.writer)}`)[0]
  assert(writer && writer.badge === 'Collaborator' && writer.source === 'agent_default' && writer.launch.includes(ALT_LABEL), 'Writer collaborator row', writer)
  const extra = rowsAt(r.rows, `/${segment(names.pair)}`).find((row) => row.badge === 'Delegated copy')
  const extraEngineer = rowsAt(r.rows, `/${segment(names.pair)}/engineer`).filter((row) => row.source === 'configured')
  assert(extra && extra.source === 'configured' && extraEngineer.length === 1 && /grok/i.test(extraEngineer[0].launch), 'extra Pair copy rows (as configured; engineer on Grok)', { extra, extraEngineer })
  r.readOnly = await page.locator(`${sel('run-delegated-launches')} button, ${sel('run-delegated-launches')} input, ${sel('run-delegated-launches')} select`).count()
  assert(r.readOnly === 0, 'delegated rows offer no controls', r.readOnly)
  await shot(page, 'DLP-003-agent-run-settings-880', 880)
  await shot(page, 'DLP-003-agent-run-settings-390', 390)
  return r
})

defineCase('DLP-004', 'AC-010: Team run and Org run whose manager delegates the Squad (and brings in the Pair): Settings lists the rows', async (page) => {
  const r = {}
  const team = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: '/', ...rootConfig() }], memberConfigs: [
      { memberAddress: '/manager', agentDefinitionId: ids.manager, ...rootConfig() }, { memberAddress: '/worker', agentDefinitionId: ids.worker, ...rootConfig() }] } })).createAgentTeamRun
  assert(team.success, team.message)
  r.teamRunId = team.teamRunId
  const teamTree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree
  const manager = objectsIn(teamTree).find((m) => m.address === '/manager' && (m.agent_run_id ?? m.agentRunId))
  await delegateSquadAndPair('team', r.teamRunId, manager.agent_run_id ?? manager.agentRunId, { extraCopy: false, writer: false })
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(page, 2500)
  const teamRow = page.locator(sel(`workspace-team-row-${r.teamRunId}`))
  await waitFor('team run row', async () => {
    if (await teamRow.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    const definitionRow = page.locator(sel(`workspace-team-definition-row-${ids.home}`)).first()
    if (await definitionRow.isVisible().catch(() => false) && await definitionRow.getAttribute('aria-expanded') !== 'true') await definitionRow.click()
    return false
  }, 60000, 1500)
  await teamRow.click(); await settle(page, 2500)
  await openSettings(page)
  r.teamRows = await delegatedRows(page)
  assertSquadRows(r.teamRows, 'Team run')
  assertPairCollaboratorRows(r.teamRows, 'Team run')
  await shot(page, 'DLP-004-team-run-settings-880', 880)

  const org = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: {
    agentOrgDefinitionId: ids.hostOrg, rootConfiguration: rootConfig(), teamOverrides: [], agentOverrides: [] } })).createAgentOrgRun
  assert(org.success, org.message)
  r.orgRunId = org.agentOrgRunId
  const orgTree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.orgRunId })).getAgentOrgRunConfig.executionTree
  const orgManager = orgTree.rootOrg.members.find((m) => m.address === '/manager')
  await delegateSquadAndPair('org', r.orgRunId, orgManager.agentRunId, { extraCopy: false, writer: false })
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(page, 2500)
  const group = page.locator(sel(`agent-org-definition-${ids.hostOrg}`))
  await waitFor('Org group', async () => {
    if (await group.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    return group.isVisible().catch(() => false)
  }, 60000, 1500)
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  await page.locator(sel(`agent-org-run-open-${r.orgRunId}`)).click(); await settle(page, 2500)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /manager/i }).first().click(); await settle(page, 2500)
  // Settings of a saved Org run read the tree loaded with the editor: copies started meanwhile appear after a reload.
  await openSettings(page)
  r.orgRows = await delegatedRows(page)
  assertSquadRows(r.orgRows, 'Org run')
  assertPairCollaboratorRows(r.orgRows, 'Org run')
  await shot(page, 'DLP-004-org-run-settings-880', 880)
  return r
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  assert(!existsSync(outDir), `Output directory exists; pass a fresh --output-dir (${outDir})`)
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'delegated-launch-defaults-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  workspace = path.join(ownedRoot, 'workspace')
  const home = path.join(ownedRoot, 'home')
  const grokDir = path.join(ownedRoot, 'grok')
  for (const dir of [path.join(dataRoot, 'db'), workspace, home, grokDir]) await fs.mkdir(dir, { recursive: true })
  const grok = path.join(grokDir, 'grok')
  await fs.writeFile(grok, `#!/bin/sh\nexec "${process.execPath}" "${path.join(serverDir, 'tests/fixtures/grok-acp/fake-grok-cli.mjs')}" "$@"\n`, { mode: 0o755 })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, {
    ...baseEnv(), HOME: home, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills', AGY_FAKE_EXTRA_MODELS: ALT,
    GROK_BUILD_COMMAND: grok, FAKE_ACP_FIXTURE: path.join(serverDir, 'tests/fixtures/grok-acp/prompt.jsonl'), FAKE_ACP_REPORT_MCP_READY: '1',
    CODEX_APP_SERVER_COMMAND: path.join(ownedRoot, 'missing', 'codex'),
  })
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  await seed()
  evidence.definitions = { ids, names }
  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  // Warm up Nuxt's dependency optimizer (a cold optimize reload would otherwise disrupt the first journey).
  for (const route of ['/chat', '/agents', '/agent-teams', '/agent-orgs', '/workspace']) {
    await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000)
  }
  browserErrors.length = 0
  for (const c of cases) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const started = Date.now()
    const errorsBefore = browserErrors.length
    try {
      const details = await c.fn(page, context)
      const errors = browserErrors.slice(errorsBefore)
      assert(errors.length === 0, `browser errors during ${c.id}`, errors)
      evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`) }).catch(() => {})
      evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
    }
    const outcome = evidence.cases[c.id]
    console.log(`${c.id} ${outcome.result} ${c.title}${outcome.error ? ` — ${outcome.error}` : ''}`)
    await fs.writeFile(path.join(outDir, 'delegated-launch-defaults-evidence.json'), JSON.stringify(evidence, null, 2))
  }
  const results = Object.values(evidence.cases).map((outcome) => outcome.result)
  evidence.summary = { pass: results.filter((x) => x === 'Pass').length, fail: results.filter((x) => x === 'Fail').length }
  console.log(`Summary: ${evidence.summary.pass} Pass, ${evidence.summary.fail} Fail`)
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[delegated-launch-defaults] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'delegated-launch-defaults-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
