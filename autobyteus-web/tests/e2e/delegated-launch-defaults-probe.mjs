// Delegated launch defaults probe (ticket delegated-launch-config-defaults, SR-002).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) with scripted runtimes only,
// no inference and no credentials. Every run is started, driven, stopped and reopened through the UI:
// - AGY: a probe-owned wrapper around `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`. A message containing
//   `CALL_TOOL:{…}` makes the agent call the real agent tool and answer `CALLED:<result>` (the user types it into the
//   composer, standing in for a model's tool call); anything else is answered `OK`. The wrapper answers `agy models` from
//   a probe-owned file, so the probe can retire a model while a run is active (AC-006).
// - Grok Build: the recorded-fixture fake CLI (a second runtime). Codex: a command path that does not exist (unavailable).
// Everything runs in an owned temp data root and HOME on free ports with a sanitized environment; the user's app and
// `~/.autobyteus` are never touched.
//
// Definitions: Build team (no default) = lead, engineer (Grok), reviewer (AGY ALT), unoffered (AGY model not offered);
// Pair team (default AGY ALT) = lead, engineer (Grok), unoffered; Squad team (default AGY model not offered) = lead,
// engineer (Grok), reviewer (ALT), offline (Codex), unoffered, badsettings (AGY model + settings it has none of),
// incomplete (runtime only); Writer (ALT); Plain (none); Org (default AGY) = writer + placed Pair; Host Org = manager.
//
// Cases:
//   DLP-001 (AC-011, AC-013, DEC-009, AR-003) New chat for the Build team: seeded rows, unusable-default note, root changes
//           keep seeded rows (also when equal to the root), member edit, reset; Run → the team run has what was shown.
//   DLP-002 (AC-012) Org launch page seeds the placed team and agents; Run → readback.
//   DLP-003 (AC-001, AC-003..AC-005, AC-007, AC-010; DS-004 b) Manager chat started from the UI. From its composer: the
//           Squad copy (five notes: team default + four reasons), the Pair brought in (note), the Writer brought in (no
//           note), an extra copy at the Pair address (no note). From the copy lead's own conversation: a teammate
//           delegation (no note), a helper brought in (note once, then none), a message to the Grok engineer (its Grok
//           reply shows). Settings lists every row read-only; the run's own settings stay editable.
//   DLP-004 (AC-010) A Team run (New chat) and an Org run (Org launch page) whose manager delegates the Squad and brings
//           in the Pair from the composer: their Settings list the rows.
//   DLP-005 (AC-006, REQ-004) Manager chat on a model that is then retired: delegation and bring-in of agents that need
//           the inherited layer fail in the conversation with today's text and add nothing; an own usable default works.
//   DLP-006 (AC-009, QR-002) Agent and Team runs whose saved trees are given the pre-change shape (no sources, no member
//           launches) while the backend is down, as after an upgrade: Settings shows "Source not recorded" and the Team
//           values; a copy member then starts on the Team value.
//   DLP-008 (AC-011, SR-005) The user's journey: a plain New chat from the Chat nav, text typed, the heading switcher
//           to the Build team: its members are seeded (and the unusable default noted); the text and the root are kept.
//   DLP-009 (AC-011, AC-012, SR-005) Carried starts seed members: New chat Team A → Team B (B's seeds only), New chat →
//           an Org (placed team and agents seeded; Run launches what is shown), the Org launch page switcher → a Team.
//   DLP-010 (DS-006 preserved) "+" on a Team run copies its recorded member settings and seeds nothing.
//   DCP-001 (delegated-copy-model-change AC-001, AC-002, AC-004, AC-011, DEC-010) Manager chat: a Writer copy runs → its
//           Settings row has the stop icon and a locked model with the hint; Stop from its sidebar row; its model is then
//           changed in Settings (runtime locked) and saved with the Save bar (no origin shown); the next message resumes it
//           on the chosen model (AGY `--model`).
//   DCP-002 (delegated-copy-model-change AC-002, AC-003, IR-002; Team root) A Team copy is stopped from its sidebar row;
//           its Team model is changed and saved; the copy lead's "+" shows the choice without a reload; the next message
//           resumes the lead on it.
//   DCP-003 (delegated-copy-model-change AC-001, AC-002; Org root) A copy is stopped from its Settings row (its Org
//           sidebar stop icon goes away); its model is changed and saved; the next message resumes it on that model.
//   DCP-004 (delegated-copy-model-change AC-005, AC-011) The delegating agent wakes the copy while the user edits: Save
//           is refused and records nothing; after a Save and a backend restart the choice is shown and the copy resumes
//           on it.
//   DCP-005 (delegated-copy-model-change REQ-001 "any member", the AC-010 scenario; Team root) One member of a Team copy,
//           after it has run, gets its own model in Settings: only its row changes; its next turn resumes its
//           conversation on that model while the coordinator keeps its own.
//   DCP-001..DCP-005 alone: pnpm -C autobyteus-web test:e2e:delegated-copy-model-change
// Settings rows (SR-006) are the read-only member rows, collapsed until opened, with the same look as the Members list
// (`model · runtime · approval · source`, Coordinator chip, an opened Team's card then its Members, "Notes: N" on a
// collapsed Team); DLP-003 (running) and DLP-007 (stopped and running again) also read them as Settings opens them.
//   DLP-007 (AC-008, DEC-008) A copy started, the engineer's default edited in the Agents editor, a second copy: Settings
//           shows each copy's recorded values; the run is stopped and reopened from the UI; the first copy's engineer
//           then starts on Grok (its recorded value). Runs last (it edits a definition).
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome. No CLI logins.
// Usage: pnpm -C autobyteus-web test:e2e:delegated-launch-defaults [--output-dir <fresh dir>] [--cases DLP-001,DLP-003] [--keep]
// --desktop builds/owns an isolated app on macOS and selects the private backend via Node Manager.
// --skip-build requires this worktree's verified-current bundle. --ledger-file <absolute path> appends case results.
// Focused SSR-001..004 cases are opt-in via test:e2e:settings-saved-model-refresh (see its case-module header).
import { desktopAdapter } from './fixtures/settings-refresh-desktop.mjs'
import { registerSavedRefreshCases } from './settings-saved-model-refresh-cases.mjs'
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
const desktop = process.argv.includes('--desktop')
const ledger = arg('ledger-file', null)
const keep = process.argv.includes('--keep')
const onlyCases = arg('cases', null)?.split(',') ?? null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const AGY = 'antigravity_cli'
const GROK = 'grok_build'
const MODEL = 'gemini-3.8-flash-low'
const ALT = 'dlc-alt-model'
const RETIRING = 'dlc-retiring-model'
const NOT_OFFERED = 'dlc-no-such-model'
const TEAM_NOT_OFFERED = 'dlc-no-such-team-model'
const GROK_MODEL = 'grok-4.7'
// Display names the probe's `agy models` answers with; rows and summaries show these.
const MODEL_LABEL = 'Gemini test'
const ALT_LABEL = 'Alt test model'
const RETIRING_LABEL = 'Retiring test model'

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

let ownedRoot, dataRoot, workspace, backendUrl, frontUrl, browser, backend, backendPort, dbUrl, agyModelsFile, argvLog, missingCodex
const backendEnv = {}
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const startBackend = async (label) => {
  const child = spawnOwned(label, process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, backendEnv)
  await waitFor(`${label} health`, async () => { assert(child.exitCode === null, `${label} exited`); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  return child
}
/** What `agy models` offers from now on (the scripted CLI reads it on every catalog request). */
const offerAgyModels = (ids) => fs.writeFile(agyModelsFile, ids.map((id) => `${id}\t${{ [MODEL]: MODEL_LABEL, [ALT]: ALT_LABEL, [RETIRING]: RETIRING_LABEL }[id]}\n`).join(''))
/** AGY launches of one run so far, with their `--model`. */
const agyLaunchesOf = async (runId) => (await fs.readFile(argvLog, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
  .filter((entry) => entry.cwd.includes(`/${runId}/`)).map((entry) => entry.argv.includes('--model') ? entry.argv[entry.argv.indexOf('--model') + 1] : null)
/** AGY launches of one run so far: `[--model, --conversation]` (a fresh launch has no conversation flag). */
const agyLaunchDetailsOf = async (runId) => (await fs.readFile(argvLog, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
  .filter((entry) => entry.cwd.includes(`/${runId}/`)).map((entry) => [
    entry.argv.includes('--model') ? entry.argv[entry.argv.indexOf('--model') + 1] : null,
    entry.argv.includes('--conversation') ? entry.argv[entry.argv.indexOf('--conversation') + 1] : null])
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
  await agent('manager'); await agent('lead'); await agent('worker'); await agent('plain')
  await agent('engineer', { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL })
  await agent('reviewer', { runtimeKind: AGY, llmModelIdentifier: ALT })
  await agent('writer', { runtimeKind: AGY, llmModelIdentifier: ALT })
  await agent('offline', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5' })
  await agent('unoffered', { runtimeKind: AGY, llmModelIdentifier: NOT_OFFERED })
  await agent('badsettings', { runtimeKind: AGY, llmModelIdentifier: MODEL, llmConfig: { temperature: 0.2 } })
  await agent('incomplete', { runtimeKind: AGY })
  const team = async (key, members, coordinator, defaultLaunchConfig = null) => {
    names[key] = `${key[0].toUpperCase()}${key.slice(1)} Team ${randomUUID().slice(0, 4)}`
    ids[key] = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
      name: names[key], description: `${key}.`, instructions: 'Work together.', coordinatorMemberName: coordinator, handoffs: [],
      ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}),
      nodes: Object.entries(members).map(([memberName, ref]) => ({ memberName, ref: ids[ref], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
  }
  await team('build', { lead: 'lead', engineer: 'engineer', reviewer: 'reviewer', unoffered: 'unoffered' }, 'lead')
  await team('pair', { lead: 'lead', engineer: 'engineer', unoffered: 'unoffered' }, 'lead', { runtimeKind: AGY, llmModelIdentifier: ALT })
  await team('squad', { lead: 'lead', engineer: 'engineer', reviewer: 'reviewer', offline: 'offline', unoffered: 'unoffered',
    badsettings: 'badsettings', incomplete: 'incomplete' }, 'lead', { runtimeKind: AGY, llmModelIdentifier: TEAM_NOT_OFFERED })
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
const address = (key) => `/${segment(names[key])}`
/** The `launch_notes` sentence of the server's notes renderer for one skipped layer. */
const noteText = ({ name, layer, runtime, model, detail, runsOn, origin, team = false }) => `${name}: its ${layer} default ${runtime ?? '(no runtime)'} / `
  + `${model ?? '(no model)'} could not be used (${detail.replace(/\.$/, '')}); ${team ? 'its members without their own default run on' : 'it runs on'} ${runsOn} (${origin}).`
const squadNotes = () => {
  const runsOn = `${AGY} / ${MODEL}`
  const inherited = 'inherited from the run'
  return [
    noteText({ name: names.squad, layer: 'team', runtime: AGY, model: TEAM_NOT_OFFERED, detail: `The model '${TEAM_NOT_OFFERED}' is not available on ${AGY}.`, runsOn, origin: inherited, team: true }),
    noteText({ name: 'offline', layer: 'agent', runtime: 'codex_app_server', model: 'gpt-5.5', detail: `Codex App Server command '${missingCodex}' is not available.`, runsOn, origin: inherited }),
    noteText({ name: 'unoffered', layer: 'agent', runtime: AGY, model: NOT_OFFERED, detail: `The model '${NOT_OFFERED}' is not available on ${AGY}.`, runsOn, origin: inherited }),
    noteText({ name: 'badsettings', layer: 'agent', runtime: AGY, model: MODEL, detail: 'Its model settings are invalid: This model has no adjustable settings.', runsOn, origin: inherited }),
    noteText({ name: 'incomplete', layer: 'agent', runtime: AGY, model: null, detail: 'It names no model.', runsOn, origin: inherited }),
  ]
}

// ---------------------------------------------------------------------------------------------
// Server reads (assertion readback only; every action goes through the UI)
const agentTree = async (runId) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId })).agentRunCollaboration?.root_agent?.execution_tree
const teamTree = async (teamRunId) => (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId })).getTeamRunResumeConfig.executionTree
const orgTree = async (orgRunId) => (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: orgRunId })).getAgentOrgRootHistory.org
const teamCopies = (tree, key) => objectsIn(tree).filter((r) => pick(r, 'teamRunId') && pick(r, 'startedAt') && Array.isArray(r.members) && r.address === address(key))
const membersOf = (copy) => Object.fromEntries(copy.members.map((m) => [String(m.address).split('/').pop(), pick(m, 'agentRunId')]))
const collaboratorAt = (tree, key) => objectsIn(tree).find((r) => pick(r, 'addedViaAgentRunId') && r.address === address(key))
const teamRunIds = async (teamDefinitionId) => {
  const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
  return h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).filter((t) => t.teamDefinitionId === teamDefinitionId).flatMap((t) => t.runs.map((x) => x.teamRunId))
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
const memberRow = (root, addr) => root.locator(sel(`run-member-${addr}`)).first()
const openMember = async (root, addr) => {
  const row = memberRow(root, addr)
  const toggle = row.locator(sel('run-member-toggle')).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await row.locator(sel('run-member-detail')).first().waitFor(); await delay(300)
  return row
}
const rowState = async (root, addr) => {
  const row = memberRow(root, addr)
  return {
    customized: await row.getAttribute('data-customized'),
    summary: (await row.locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' '),
    note: await row.locator(sel('run-member-launch-note')).first().innerText({ timeout: 1000 }).catch(() => null),
  }
}
/** Agents / Agent Teams page → Run on the named card → a fresh New chat. */
const newChatFor = async (page, route, name) => {
  await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  const card = page.locator('main').getByText(name, { exact: true }).first()
  await card.waitFor({ timeout: 120000 })
  await card.locator('xpath=ancestor::*[.//button[normalize-space()="Run"]][1]').getByRole('button', { name: 'Run', exact: true }).first().click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await settle(page, 2500)
}
// Quotes in agent text are rendered typographically; compare on straight quotes.
const normalized = (text) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
// Every main region (the conversation, and side panels such as Team messages that open beside it); only the
// conversation carries the scripted agent's `CALLED:` answers.
const conversationText = async (page) => normalized((await page.locator('main').allInnerTexts()).join('\n'))
const calledCount = async (page) => (await conversationText(page)).split('CALLED:').length - 1
/** Types into the visible composer and sends with Enter (the product's submit key). */
const typeAndSend = async (page, text) => {
  // New chat uses the chat composer; a run's conversation has its own composer: the visible message textarea either way.
  const input = page.locator('main textarea:visible').last()
  await input.waitFor({ timeout: 60000 }); await input.click(); await input.fill(text); await delay(200)
  await input.press('Enter')
}
/** The user types a tool instruction for the scripted agent; returns the conversation text of its `CALLED:` answer. */
const callFromComposer = async (page, label, tool, args) => {
  const before = await calledCount(page)
  await typeAndSend(page, callTool(tool, args))
  await waitFor(`${label}: tool result in the conversation`, async () => (await calledCount(page)) > before, 120000, 1000)
  const text = await conversationText(page)
  const parts = text.split('CALLED:')
  return parts[before + 1] ?? ''
}
/** Opens the conversation of an agent in the sidebar tree (a copy member, collaborator or helper) by its run ID. */
const openSidebarAgent = async (page, agentRunId) => {
  const row = page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id="${agentRunId}"]`).first()
  await waitFor(`sidebar row ${agentRunId}`, async () => {
    if (await row.isVisible().catch(() => false)) return true
    for (const toggle of await page.locator(`${sel('workspace-team-transient-disclosure')}`).all()) {
      const holder = toggle.locator('xpath=ancestor::*[@aria-expanded][1]')
      if (await holder.getAttribute('aria-expanded').catch(() => null) === 'false') await toggle.click().catch(() => {})
    }
    await expandWorkspaces(page)
    return row.isVisible().catch(() => false)
  }, 60000, 1500)
  await row.click(); await settle(page, 2500)
}
const expandWorkspaces = async (page) => {
  const folders = page.locator(sel('workspace-row'))
  for (let i = 0; i < await folders.count(); i += 1) {
    const row = folders.nth(i)
    const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
    if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
  }
}
const openAgentRun = async (page, runId) => {
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 2500)
}
const openTeamRun = async (page, teamRunId, teamDefinitionId) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(page, 2500)
  const teamRow = page.locator(sel(`workspace-team-row-${teamRunId}`))
  await waitFor('team run row', async () => {
    if (await teamRow.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    const definitionRow = page.locator(sel(`workspace-team-definition-row-${teamDefinitionId}`)).first()
    if (await definitionRow.isVisible().catch(() => false) && await definitionRow.getAttribute('aria-expanded') !== 'true') await definitionRow.click()
    return false
  }, 60000, 1500)
  await teamRow.click(); await settle(page, 2500)
  // Selection may toggle a previously expanded persisted row closed. Explicitly expose its children.
  if (await teamRow.getAttribute('aria-expanded') === 'false') {
    await teamRow.locator(sel('workspace-team-run-disclosure')).click(); await settle(page, 800)
  }
}
const openSettings = async (page) => {
  await page.locator(sel('workspace-header-edit-config')).click()
  const view = page.locator(sel('existing-run-settings')); await view.waitFor({ timeout: 60000 }); await settle(page, 2000)
  return view
}
const backToConversation = async (page) => {
  const back = page.locator(sel('run-config-back-to-events'))
  if (await back.isVisible().catch(() => false)) { await back.click(); await settle(page, 1200) }
}
/**
 * The read-only Settings rows of collaborators and copies (SR-006: member rows, collapsed until opened). By default every row
 * is opened first (Teams, then their agents) and then read; `expand: false` reads the rows as Settings opens them.
 */
const delegatedRows = async (page, { expand = true } = {}) => {
  const section = page.locator(sel('run-delegated-launches'))
  await section.waitFor({ timeout: 60000 })
  for (let round = 0; expand && round < 6; round += 1) {
    const closed = section.locator(`${sel('run-member-toggle')}[aria-expanded="false"]`)
    const count = await closed.count()
    if (!count) break
    for (let i = 0; i < count; i += 1) { await closed.first().click(); await delay(150) }
  }
  return section.locator('[data-source]').evaluateAll((els) => els.map((el) => {
    const own = (selector) => [...el.querySelectorAll(selector)].filter((node) => node.closest('[data-source]') === el)
    return {
      test: el.getAttribute('data-test').replace('run-member-', '').replace(/@.*$/, ''),
      member: Boolean(el.parentElement?.closest('[data-source]')),
      source: el.getAttribute('data-source'),
      badge: own('[data-test="run-member-badge"]')[0]?.textContent?.trim() ?? null,
      launch: own('[data-test="run-member-summary"]')[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      fallbacks: own('[data-test="run-member-launch-note"]').map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
      noteCount: own('[data-test="run-member-note-count"]')[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      expanded: own('[data-test="run-member-toggle"]')[0]?.getAttribute('aria-expanded') === 'true',
      coordinator: own('span').some((node) => node.textContent.trim() === 'Coordinator'),
      card: own('[data-test^="run-settings-card"]').length > 0,
      membersHeading: own('[data-test="run-member-detail"] p').some((node) => /^members$/i.test(node.textContent.trim())),
    }
  }))
}
/** SR-006: Settings opens with one collapsed row per collaborator and copy; no agent row of a Team is shown yet. */
const assertCollapsed = (rows, label) => assert(rows.length > 0 && rows.every((row) => !row.expanded && !row.member && row.badge), `${label}: rows are not all collapsed top-level rows`, rows)
const rowsAt = (rows, addr) => rows.filter((row) => row.test === addr)
/** The Squad copy rows (AC-010, AC-005): the Team, its seven members, their sources and notes. */
const assertSquadRows = (rows, label) => {
  const squad = address('squad')
  const team = rowsAt(rows, squad).find((row) => !row.member && row.badge === 'Delegated copy')
  assert(team && team.source === 'inherited' && team.fallbacks.length === 1 && team.fallbacks[0].includes(TEAM_NOT_OFFERED)
    && /not available/.test(team.fallbacks[0]) && team.launch.includes(MODEL_LABEL), `${label}: Squad Team row`, { team, rows })
  const member = (name) => rowsAt(rows, `${squad}/${name}`).find((row) => row.member)
  const m = Object.fromEntries(['lead', 'engineer', 'reviewer', 'offline', 'unoffered', 'badsettings', 'incomplete'].map((name) => [name, member(name)]))
  assert(Object.values(m).every(Boolean), `${label}: Squad member rows`, { m, rows })
  // SR-006: the same look as the Members list: `model · runtime · approval · source`, the Coordinator chip on the copy's
  // coordinator, an opened Team shows its read-only card and then its Members, and each opened agent its card.
  assert(team.card && team.membersHeading, `${label}: opened Squad shows its card and its Members`, team)
  assert(m.lead.coordinator && Object.entries(m).every(([name, row]) => name === 'lead' || !row.coordinator), `${label}: Coordinator chip on the copy's lead only`, m)
  assert(Object.values(m).every((row) => /Auto-approve/.test(row.launch) && row.card), `${label}: member summaries carry the approval and open to a card`, m)
  assert(/Agent default$/.test(m.engineer.launch) && /Inherited from the run$/.test(m.lead.launch), `${label}: summaries end with the source label`, { engineer: m.engineer.launch, lead: m.lead.launch })
  assert(m.engineer.source === 'agent_default' && /grok/i.test(m.engineer.launch) && m.engineer.fallbacks.length === 0, `${label}: engineer row (Grok, agent default)`, m.engineer)
  assert(m.reviewer.source === 'agent_default' && m.reviewer.launch.includes(ALT_LABEL) && m.reviewer.fallbacks.length === 0, `${label}: reviewer row (ALT, agent default)`, m.reviewer)
  // A member without its own default shows its Team's source (DS-005); the Team's skipped default is noted once, on the Team row (SR-006).
  assert(m.lead.source === 'inherited' && m.lead.launch.includes(MODEL_LABEL) && m.lead.fallbacks.length === 0, `${label}: lead row (the Team's source, no repeated note)`, m.lead)
  const own = (row, pattern) => row.source === 'inherited' && row.launch.includes(MODEL_LABEL) && row.fallbacks.length === 1 && pattern.test(row.fallbacks[0])
  assert(own(m.offline, /gpt-5\.5.*is not available/), `${label}: offline row (Codex unavailable)`, m.offline)
  assert(own(m.unoffered, new RegExp(`${NOT_OFFERED}.*not available`)), `${label}: unoffered row (model not offered)`, m.unoffered)
  assert(own(m.badsettings, /settings are invalid/), `${label}: badsettings row (settings invalid)`, m.badsettings)
  assert(own(m.incomplete, /names no model/), `${label}: incomplete row (incomplete default)`, m.incomplete)
}
const assertPairCollaboratorRows = (rows, label) => {
  const pair = address('pair')
  const team = rowsAt(rows, pair).find((row) => row.badge === 'Collaborator')
  assert(team && team.source === 'team_default' && team.launch.includes(ALT_LABEL) && team.fallbacks.length === 0, `${label}: Pair collaborator Team row`, { team, rows })
  const engineer = rowsAt(rows, `${pair}/engineer`).find((row) => row.source === 'agent_default')
  const unoffered = rowsAt(rows, `${pair}/unoffered`).find((row) => row.source === 'team_default')
  assert(engineer && /grok/i.test(engineer.launch), `${label}: Pair engineer row`, engineer)
  assert(unoffered && unoffered.launch.includes(ALT_LABEL) && unoffered.fallbacks.length === 1 && unoffered.fallbacks[0].includes(NOT_OFFERED), `${label}: Pair unoffered row`, unoffered)
}

// ---------------------------------------------------------------------------------------------
const cases = []
/** Values one case leaves for a later one (`--cases` with a later case alone skips those checks). */
const state = {}
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('DLP-001', 'AC-011/AC-013: New chat for a Team seeds members from their defaults; root changes keep seeded rows; member change and reset; Run launches what is shown', async (page) => {
  const r = {}
  await newChatFor(page, '/agent-teams', names.build)
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
  const lead = await openMember(drawer, '/lead')
  await chooseModel(page, lead, AGY, ALT)
  await memberRow(drawer, '/reviewer').locator(sel('run-member-reset')).first().click(); await delay(600)
  r.afterEdits = { lead: await rowState(drawer, '/lead'), reviewer: await rowState(drawer, '/reviewer'), engineer: await rowState(drawer, '/engineer') }
  assert(r.afterEdits.lead.customized === 'true' && r.afterEdits.lead.summary.includes(ALT_LABEL) && r.afterEdits.reviewer.customized === 'false'
    && r.afterEdits.reviewer.summary.includes(MODEL_LABEL) && r.afterEdits.engineer.customized === 'true', 'member change and reset', r.afterEdits)
  await closeDrawer(drawer)
  const before = new Set(await teamRunIds(ids.build))
  await typeAndSend(page, 'Start the work.')
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.build)).find((id) => !before.has(id)), 60000)
  state.buildRunId = r.teamRunId
  const tree = await teamTree(r.teamRunId)
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
  const params = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams
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

/** New chat for the Manager on the given AGY model; the first message is sent; returns the new run ID. */
const startManagerChat = async (page, model, firstMessage) => {
  await newChatFor(page, '/agents', names.manager)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, model)
  await typeAndSend(page, firstMessage)
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams.get('id')
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 1500)
  return runId
}

defineCase('DLP-003', 'AC-001/003/004/005/007/010: Manager chat from the UI; copy, bring-ins and extra copy from its composer; teammate, helper and Grok engineer from the copy lead\'s conversation; Settings rows', async (page) => {
  const r = {}
  r.runId = await startManagerChat(page, MODEL, 'Hello. Marker DLP-003.')
  await waitFor('manager answered', async () => /DLP-003[\s\S]*OK/.test(await conversationText(page)), 60000)
  // The Squad copy: the delegating conversation shows its five notes (AC-005).
  r.squadCall = await callFromComposer(page, 'delegate Squad', 'delegate_task', { recipient_address: address('squad'), description: 'Squad work.' })
  r.squadNotesShown = squadNotes().map((note) => r.squadCall.includes(note))
  assert(r.squadCall.includes('"delegated":true') && r.squadNotesShown.every(Boolean), 'delegation result in the conversation lacks a note', { call: r.squadCall, expected: squadNotes() })
  await shot(page, 'DLP-003-conversation-squad-notes-1280', 1280)
  // Bring-ins: the Pair (its unoffered member falls back to the team default) and the Writer (usable default, no note).
  r.pairCall = await callFromComposer(page, 'bring in Pair', 'send_message_to', { recipient_address: address('pair'), content: 'Pair work.' })
  const pairNote = noteText({ name: 'unoffered', layer: 'agent', runtime: AGY, model: NOT_OFFERED, detail: `The model '${NOT_OFFERED}' is not available on ${AGY}.`, runsOn: `${AGY} / ${ALT}`, origin: 'its team default' })
  assert(r.pairCall.includes('"accepted":true') && r.pairCall.includes('Launch configuration notes:') && r.pairCall.includes(pairNote), 'Pair bring-in note not shown', { call: r.pairCall, pairNote })
  r.writerCall = await callFromComposer(page, 'bring in Writer', 'send_message_to', { recipient_address: address('writer'), content: 'Write.' })
  assert(r.writerCall.includes('"accepted":true') && !r.writerCall.includes('Launch configuration notes'), 'Writer bring-in should carry no note', r.writerCall)
  // AC-007: an extra copy at the Pair address reuses its record; no note.
  r.extraCall = await callFromComposer(page, 'extra Pair copy', 'delegate_task', { recipient_address: address('pair'), description: 'Extra Pair work.' })
  assert(r.extraCall.includes('"delegated":true') && !r.extraCall.includes('launch_notes'), 'extra copy should carry no note', r.extraCall)
  await shot(page, 'DLP-003-conversation-bring-ins-1280', 1280)

  // From the copy lead's own conversation (a copy member the user opens in the sidebar).
  const tree = await agentTree(r.runId)
  const squad = membersOf(teamCopies(tree, 'squad')[0])
  r.squadMembers = squad
  await openSidebarAgent(page, squad.lead)
  r.teammateCall = await callFromComposer(page, 'teammate delegation', 'delegate_task', { recipient_address: `${address('squad')}/unoffered`, description: 'Teammate work.' })
  assert(r.teammateCall.includes('"delegated":true') && !r.teammateCall.includes('launch_notes'), 'teammate delegation should repeat no note (AR-002)', r.teammateCall)
  r.helperCall = await callFromComposer(page, 'helper bring-in', 'send_message_to', { recipient_address: address('badsettings'), content: 'Helper work.' })
  const helperNote = noteText({ name: names.badsettings, layer: 'agent', runtime: AGY, model: MODEL, detail: 'Its model settings are invalid: This model has no adjustable settings.', runsOn: `${AGY} / ${MODEL}`, origin: 'inherited from the run' })
  assert(r.helperCall.includes('"accepted":true') && r.helperCall.includes(helperNote), 'helper bring-in note not shown', { call: r.helperCall, helperNote })
  r.helperAgainCall = await callFromComposer(page, 'helper again', 'send_message_to', { recipient_address: address('badsettings'), content: 'More helper work.' })
  assert(r.helperAgainCall.includes('"accepted":true') && !r.helperAgainCall.includes('Launch configuration notes'), 'reused helper should carry no note', r.helperAgainCall)
  r.engineerCall = await callFromComposer(page, 'message the Grok engineer', 'send_message_to', { recipient_address: `${address('squad')}/engineer`, content: 'Please list the directory.' })
  assert(r.engineerCall.includes('"accepted":true'), 'message to the engineer not accepted', r.engineerCall)
  await shot(page, 'DLP-003-copy-lead-conversation-1280', 1280)
  // AC-001: the engineer answers on Grok (only the recorded Grok replay lists alpha.txt); it never started on AGY.
  await openSidebarAgent(page, squad.engineer)
  await waitFor('engineer Grok reply', async () => (await conversationText(page)).includes('alpha.txt'), 90000, 1500)
  assert((await agyLaunchesOf(squad.engineer)).length === 0, 'the engineer started on AGY', await agyLaunchesOf(squad.engineer))
  await shot(page, 'DLP-003-engineer-grok-reply-1280', 1280)

  // Settings (AC-010).
  await openAgentRun(page, r.runId)
  const view = await openSettings(page)
  r.rootEditable = await view.locator(sel('existing-run-root-card')).count()
  r.collapsed = await delegatedRows(page, { expand: false })
  assertCollapsed(r.collapsed, 'running Agent run')
  const squadCollapsed = r.collapsed.find((row) => row.test === address('squad') && row.badge === 'Delegated copy')
  // The collapsed Squad counts its own note and its members' (team default + four reasons).
  assert(squadCollapsed?.noteCount === 'Notes: 5', 'collapsed Squad row shows its note count', squadCollapsed)
  assert(r.collapsed.every((row) => row.fallbacks.length === 0 || row.test !== address('squad')), 'a collapsed Team shows no notes inline', r.collapsed)
  await shot(page, 'DLP-003-agent-run-settings-collapsed-880', 880)
  r.rows = await delegatedRows(page)
  assert(r.rootEditable === 1, 'the run root card is still shown', r)
  assertSquadRows(r.rows, 'Agent run')
  assertPairCollaboratorRows(r.rows, 'Agent run')
  const writer = rowsAt(r.rows, address('writer'))[0]
  assert(writer && writer.badge === 'Collaborator' && writer.source === 'agent_default' && writer.launch.includes(ALT_LABEL), 'Writer collaborator row', writer)
  const extra = rowsAt(r.rows, address('pair')).find((row) => row.badge === 'Delegated copy')
  const extraEngineer = rowsAt(r.rows, `${address('pair')}/engineer`).filter((row) => row.source === 'configured')
  assert(extra && extra.source === 'configured' && extraEngineer.length === 1 && /grok/i.test(extraEngineer[0].launch), 'extra Pair copy rows (as configured; engineer on Grok)', { extra, extraEngineer })
  const teammateRow = rowsAt(r.rows, `${address('squad')}/unoffered`).find((row) => !row.member && row.badge === 'Delegated copy')
  assert(teammateRow && teammateRow.launch.includes(MODEL_LABEL), 'teammate copy row on its recorded (inherited) value', { teammateRow, rows: r.rows })
  // Rows only open and close: no reset, no model menu, no input; every opened card's model is locked.
  const inSection = (selector) => `${sel('run-delegated-launches')} ${selector}`
  r.readOnly = await page.locator([sel('run-member-reset'), sel('run-setting-reset'), sel('chat-model-trigger'), 'input', 'select'].map(inSection).join(', ')).count()
  r.modelFields = await page.locator(inSection(sel('run-setting-model'))).count()
  r.lockedModelFields = await page.locator(inSection(`${sel('run-setting-model')}:has(${sel('run-setting-locked')})`)).count()
  assert(r.readOnly === 0 && r.modelFields > 0 && r.lockedModelFields === r.modelFields, 'delegated rows offer no controls', r)
  await shot(page, 'DLP-003-agent-run-settings-880', 880)
  await shot(page, 'DLP-003-agent-run-settings-390', 390)
  return r
})

defineCase('DLP-004', 'AC-010: Team run (New chat) and Org run (Org launch page) whose manager delegates the Squad and brings in the Pair from the composer: Settings lists the rows', async (page) => {
  const r = {}
  await newChatFor(page, '/agent-teams', names.home)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
  const before = new Set(await teamRunIds(ids.home))
  await typeAndSend(page, callTool('delegate_task', { recipient_address: address('squad'), description: 'Squad work.' }))
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.home)).find((id) => !before.has(id)), 60000)
  await waitFor('Squad copy in the team run', async () => teamCopies(await teamTree(r.teamRunId), 'squad').length === 1, 120000, 1500)
  await settle(page, 1500)
  r.teamPairCall = await callFromComposer(page, 'team: bring in Pair', 'send_message_to', { recipient_address: address('pair'), content: 'Pair work.' })
  assert(r.teamPairCall.includes('"accepted":true') && r.teamPairCall.includes('Launch configuration notes:'), 'team root: Pair bring-in note not shown', r.teamPairCall)
  await openTeamRun(page, r.teamRunId, ids.home)
  await openSettings(page)
  r.teamRows = await delegatedRows(page)
  assertSquadRows(r.teamRows, 'Team run')
  assertPairCollaboratorRows(r.teamRows, 'Team run')
  await shot(page, 'DLP-004-team-run-settings-880', 880)

  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.hostOrg}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
  await chooseModel(page, page.locator(sel('org-launch-card')), AGY, MODEL)
  await page.locator(sel('org-launch-run')).click()
  await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 2500)
  const params = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams
  r.orgRunId = params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /manager/i }).first().click(); await settle(page, 2500)
  r.orgSquadCall = await callFromComposer(page, 'org: delegate Squad', 'delegate_task', { recipient_address: address('squad'), description: 'Squad work.' })
  assert(r.orgSquadCall.includes('"delegated":true') && squadNotes().every((note) => r.orgSquadCall.includes(note)), 'org root: Squad notes not shown', r.orgSquadCall)
  r.orgPairCall = await callFromComposer(page, 'org: bring in Pair', 'send_message_to', { recipient_address: address('pair'), content: 'Pair work.' })
  assert(r.orgPairCall.includes('"accepted":true') && r.orgPairCall.includes('Launch configuration notes:'), 'org root: Pair bring-in note not shown', r.orgPairCall)
  await openSettings(page)
  r.orgRows = await delegatedRows(page)
  assertSquadRows(r.orgRows, 'Org run')
  assertPairCollaboratorRows(r.orgRows, 'Org run')
  await shot(page, 'DLP-004-org-run-settings-880', 880)
  return r
})

defineCase('DLP-005', 'AC-006/REQ-004: the root model is retired mid-run; delegation and bring-in that need the inherited layer fail in the conversation with today\'s text and add nothing; an own usable default still works', async (page) => {
  const r = {}
  await offerAgyModels([MODEL, ALT, RETIRING])
  r.runId = await startManagerChat(page, RETIRING, 'Hello. Marker DLP-005.')
  await waitFor('manager answered', async () => /DLP-005[\s\S]*OK/.test(await conversationText(page)), 60000)
  await offerAgyModels([MODEL, ALT])
  const reason = `The model '${RETIRING}' is not available on ${AGY}.`
  r.plainCall = await callFromComposer(page, 'delegate Plain', 'delegate_task', { recipient_address: address('plain'), description: 'Plain work.' })
  assert(!r.plainCall.includes('"delegated":true') && r.plainCall.includes(`${names.plain} cannot be delegated to: ${reason}`), 'delegation failure text', { call: r.plainCall, reason })
  r.squadCall = await callFromComposer(page, 'delegate Squad', 'delegate_task', { recipient_address: address('squad'), description: 'Squad work.' })
  assert(!r.squadCall.includes('"delegated":true') && r.squadCall.includes(`${names.squad} cannot be delegated to: ${reason}`), 'team delegation failure text', r.squadCall)
  r.bringCall = await callFromComposer(page, 'bring in Unoffered', 'send_message_to', { recipient_address: address('unoffered'), content: 'Help.' })
  assert(r.bringCall.includes('"accepted":false') && r.bringCall.includes('COLLABORATOR_ADD_FAILED') && r.bringCall.includes(reason), 'bring-in failure text', r.bringCall)
  const tree = await agentTree(r.runId)
  assert(teamCopies(tree, 'squad').length === 0 && !collaboratorAt(tree, 'unoffered') && !objectsIn(tree).some((x) => x.address === address('plain')), 'a failed delegation or bring-in added something', tree)
  r.ownCall = await callFromComposer(page, 'delegate Reviewer', 'delegate_task', { recipient_address: address('reviewer'), description: 'Review work.' })
  assert(r.ownCall.includes('"delegated":true'), 'an own usable default should still delegate', r.ownCall)
  await shot(page, 'DLP-005-conversation-failures-1280', 1280)
  await openSettings(page)
  r.rows = await delegatedRows(page)
  assert(r.rows.length === 1 && r.rows[0].test === address('reviewer') && r.rows[0].source === 'agent_default' && r.rows[0].launch.includes(ALT_LABEL), 'Settings lists only the reviewer copy', r.rows)
  await shot(page, 'DLP-005-settings-880', 880)
  return r
})

/** Strips the new optional launch fields from Team records in saved run trees (the shape every pre-change run has). */
const stripToPreChangeShape = async (teamRunIds) => {
  const files = []
  const visit = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) { if (!['agy-project', '.agents', 'db'].includes(entry.name)) await visit(file); continue }
      if (!entry.isFile() || !/^(collaboration_tree|team_run_execution_tree|agent_org_run_execution_tree)\.json$/.test(entry.name)) continue
      const text = await fs.readFile(file, 'utf8')
      if (teamRunIds.some((id) => text.includes(id))) files.push(file)
    }
  }
  await visit(dataRoot)
  let stripped = 0
  const stripTeam = (team) => {
    if (!team || !('defaultLaunchConfiguration' in team)) return
    delete team.defaultLaunchSource
    for (const member of team.members) { delete member.launchConfiguration; delete member.launchSource }
    stripped += 1
  }
  for (const file of files) {
    const saved = JSON.parse(await fs.readFile(file, 'utf8'))
    for (const entry of objectsIn(saved)) if (teamRunIds.includes(entry.teamRunId)) { stripTeam(entry); stripTeam(entry.source) }
    await fs.writeFile(file, JSON.stringify(saved, null, 2))
  }
  return { files: files.map((f) => path.relative(dataRoot, f)), stripped }
}

defineCase('DLP-006', 'AC-009/QR-002: runs saved before this change (stripped while the backend is down, as after an upgrade) reopen: Settings shows "Source not recorded" and Team values; a copy member starts on the Team value', async (page) => {
  const r = {}
  r.runId = await startManagerChat(page, MODEL, callTool('delegate_task', { recipient_address: address('squad'), description: 'Squad work.' }))
  await waitFor('Squad copy', async () => teamCopies(await agentTree(r.runId), 'squad').length === 1, 120000, 1500)
  r.pairCall = await callFromComposer(page, 'bring in Pair', 'send_message_to', { recipient_address: address('pair'), content: 'Pair work.' })
  await newChatFor(page, '/agent-teams', names.home)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
  const before = new Set(await teamRunIds(ids.home))
  await typeAndSend(page, callTool('delegate_task', { recipient_address: address('squad'), description: 'Squad work.' }))
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.home)).find((id) => !before.has(id)), 60000)
  await waitFor('Squad copy in the team run', async () => teamCopies(await teamTree(r.teamRunId), 'squad').length === 1, 120000, 1500)
  const agentRun = await agentTree(r.runId)
  const agentCopy = teamCopies(agentRun, 'squad')[0]
  const pair = collaboratorAt(agentRun, 'pair')
  const teamCopy = teamCopies(await teamTree(r.teamRunId), 'squad')[0]
  r.copies = { agentCopy: pick(agentCopy, 'teamRunId'), pair: pick(pair, 'teamRunId'), teamCopy: pick(teamCopy, 'teamRunId') }
  r.agentCopyMembers = membersOf(agentCopy)
  // The app is quit, its saved runs are in the pre-change shape, and it starts again.
  await stopOwned(backend)
  r.stripped = await stripToPreChangeShape(Object.values(r.copies))
  assert(r.stripped.stripped >= 3, 'pre-change shape not applied', r.stripped)
  backend = await startBackend('backend-restarted')
  await openAgentRun(page, r.runId)
  await openSettings(page)
  r.agentRows = await delegatedRows(page)
  const notRecorded = (rows, addr, label) => { const row = rowsAt(rows, addr).find((x) => !x.member); assert(row && row.source === 'not_recorded', `${label}: ${addr} source not recorded`, { row, rows }); return row }
  notRecorded(r.agentRows, address('squad'), 'Agent run')
  notRecorded(r.agentRows, address('pair'), 'Agent run')
  const agentEngineer = rowsAt(r.agentRows, `${address('squad')}/engineer`).find((x) => x.member)
  const pairEngineer = rowsAt(r.agentRows, `${address('pair')}/engineer`).find((x) => x.member)
  assert(agentEngineer?.source === 'not_recorded' && agentEngineer.launch.includes(MODEL_LABEL), 'Agent run: copy engineer on the Team value, source not recorded', agentEngineer)
  assert(pairEngineer?.source === 'not_recorded' && pairEngineer.launch.includes(ALT_LABEL), 'Agent run: Pair engineer on the Team value, source not recorded', pairEngineer)
  await shot(page, 'DLP-006-agent-run-settings-not-recorded-880', 880)
  // The copy member starts on the Team value (AGY, root model), not on its agent default.
  await backToConversation(page)
  await typeAndSend(page, 'Resume. Marker DLP-006.')
  await waitFor('manager answered after restart', async () => /DLP-006[\s\S]*OK/.test(await conversationText(page)), 90000)
  await openSidebarAgent(page, r.agentCopyMembers.lead)
  r.toEngineer = await callFromComposer(page, 'pre-change copy: message engineer', 'send_message_to', { recipient_address: `${address('squad')}/engineer`, content: 'Old-shape work.' })
  assert(r.toEngineer.includes('"accepted":true'), 'message to the engineer not accepted', r.toEngineer)
  await waitFor('engineer started on AGY', async () => (await agyLaunchesOf(r.agentCopyMembers.engineer)).length > 0, 90000, 1000)
  r.engineerLaunches = await agyLaunchesOf(r.agentCopyMembers.engineer)
  assert(JSON.stringify(r.engineerLaunches) === JSON.stringify([MODEL]), 'pre-change copy engineer did not start on the Team value', r.engineerLaunches)
  await openTeamRun(page, r.teamRunId, ids.home)
  await openSettings(page)
  r.teamRows = await delegatedRows(page)
  notRecorded(r.teamRows, address('squad'), 'Team run')
  const teamEngineer = rowsAt(r.teamRows, `${address('squad')}/engineer`).find((x) => x.member)
  assert(teamEngineer?.source === 'not_recorded' && teamEngineer.launch.includes(MODEL_LABEL), 'Team run: copy engineer on the Team value', teamEngineer)
  await shot(page, 'DLP-006-team-run-settings-not-recorded-880', 880)
  return r
})

defineCase('DLP-008', 'SR-005 (AC-011): plain New chat → typed text → heading switcher → a Team with member defaults: its members are seeded; the text and the root are kept', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-teams`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel('app-left-panel-primary-nav')).getByText('Chat', { exact: true }).click()
  await page.waitForURL(/\/chat(\?|$)/, { timeout: 60000 }); await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 2000)
  r.headingBefore = await page.locator(sel('run-target-name')).innerText()
  const input = page.locator(`${sel('chat-composer')} textarea`).first()
  await input.click(); await input.fill('hell'); await delay(300)
  const rootModel = () => page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).first().innerText()
  r.rootBefore = (await rootModel()).replace(/\s+/g, ' ')
  await page.locator(sel('run-target-switcher-trigger')).click()
  await page.locator(sel('run-target-switcher-menu')).waitFor()
  await page.locator(sel(`run-target-switcher-option-${ids.build}`)).click()
  await waitFor('heading switched to the Build team', async () => (await page.locator(sel('run-target-name')).innerText()) === names.build, 30000, 500)
  r.text = await input.inputValue()
  r.rootAfter = (await rootModel()).replace(/\s+/g, ' ')
  assert(r.text === 'hell' && r.rootAfter === r.rootBefore, 'the switcher kept neither the typed text nor the root', r)
  const drawer = await openDrawer(page)
  await waitFor('engineer seeded after the switch', async () => (await rowState(drawer, '/engineer')).customized === 'true', 60000)
  r.rows = { lead: await rowState(drawer, '/lead'), engineer: await rowState(drawer, '/engineer'), reviewer: await rowState(drawer, '/reviewer'), unoffered: await rowState(drawer, '/unoffered') }
  assert(/grok/i.test(r.rows.engineer.summary), 'engineer seeded from its Grok default', r.rows)
  assert(r.rows.reviewer.customized === 'true' && r.rows.reviewer.summary.includes(ALT_LABEL), 'reviewer seeded from its ALT default', r.rows)
  assert(r.rows.lead.customized === 'false' && r.rows.lead.note === null, 'lead (no default) follows the root', r.rows)
  assert(r.rows.unoffered.customized === 'false' && r.rows.unoffered.note?.includes(NOT_OFFERED), 'unusable default: follows the root with a note', r.rows)
  await shot(page, 'DLP-008-switcher-team-seeded-880', 880)
  await shot(page, 'DLP-008-switcher-team-seeded-390', 390)
  await closeDrawer(drawer)
  return r
})

/** The heading switcher of the current start surface (New chat or the Org launch page) → the definition with `id`. */
const switchTarget = async (page, id) => {
  await page.locator(sel('run-target-switcher-trigger')).first().click()
  await page.locator(sel('run-target-switcher-menu')).waitFor()
  await page.locator(sel(`run-target-switcher-option-${id}`)).click(); await settle(page, 1500)
}
const plainNewChat = async (page) => {
  await page.goto(`${frontUrl}/agent-teams`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel('app-left-panel-primary-nav')).getByText('Chat', { exact: true }).click()
  await page.waitForURL(/\/chat(\?|$)/, { timeout: 60000 }); await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 2000)
}

defineCase('DLP-009', 'SR-005 (AC-011, AC-012): carried starts seed members: Team A → Team B (B\'s seeds only), New chat → Org (placed team and agents seeded; Run readback), Org launch page → Team (seeded)', async (page) => {
  const r = {}
  // New chat → Build team → Pair team: the Pair's seeds only, none of Build's (its reviewer row is gone).
  await plainNewChat(page)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
  await switchTarget(page, ids.build)
  let drawer = await openDrawer(page)
  await waitFor('Build engineer seeded', async () => (await rowState(drawer, '/engineer')).customized === 'true', 60000)
  await closeDrawer(drawer)
  await switchTarget(page, ids.pair)
  await waitFor('heading on the Pair team', async () => (await page.locator(sel('run-target-name')).innerText()) === names.pair, 30000)
  drawer = await openDrawer(page)
  await waitFor('Pair engineer seeded', async () => (await rowState(drawer, '/engineer')).customized === 'true', 60000)
  r.pair = { lead: await rowState(drawer, '/lead'), engineer: await rowState(drawer, '/engineer'), unoffered: await rowState(drawer, '/unoffered'), reviewerRows: await memberRow(drawer, '/reviewer').count() }
  assert(/grok/i.test(r.pair.engineer.summary) && r.pair.lead.customized === 'false' && r.pair.unoffered.customized === 'false'
    && r.pair.unoffered.note?.includes(NOT_OFFERED) && r.pair.reviewerRows === 0, 'Team A → Team B: B seeded, nothing of A left', r.pair)
  await shot(page, 'DLP-009-team-to-team-seeded-880', 880)
  await closeDrawer(drawer)

  // New chat → the Org: its placed team and direct agent are seeded on the Org launch page; Run launches what is shown.
  await plainNewChat(page)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
  await switchTarget(page, ids.launchOrg)
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
  r.orgRoot = (await page.locator(`${sel('org-launch-card')} ${sel('chat-model-trigger')}`).innerText()).replace(/\s+/g, ' ')
  drawer = await openDrawer(page)
  await waitFor('Org writer seeded after the switch', async () => (await rowState(drawer, '/writer')).customized === 'true', 60000)
  const toggle = memberRow(drawer, '/pair').locator(sel('run-member-toggle')).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') { await toggle.click(); await delay(600) }
  r.org = { writer: await rowState(drawer, '/writer'), pair: await rowState(drawer, '/pair'), pairEngineer: await rowState(drawer, '/pair/engineer'), pairUnoffered: await rowState(drawer, '/pair/unoffered') }
  assert(r.orgRoot.includes(MODEL_LABEL), 'carried Org start keeps the composer root', r.orgRoot)
  assert(r.org.writer.summary.includes(ALT_LABEL) && r.org.pair.customized === 'true' && r.org.pair.summary.includes(ALT_LABEL)
    && /grok/i.test(r.org.pairEngineer.summary) && r.org.pairUnoffered.note?.includes(NOT_OFFERED), 'carried Org start: placed team and agents seeded', r.org)
  await shot(page, 'DLP-009-chat-to-org-seeded-1280', 1280)
  await closeDrawer(drawer)
  await page.locator(sel('org-launch-run')).click()
  await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 2500)
  const params = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams
  r.orgRunId = params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.orgRunId })).getAgentOrgRunConfig.executionTree
  const root = tree.rootOrg ?? tree.root_org
  const pair = root.members.find((m) => m.address === '/pair')
  r.launched = { root: lc(pick(root, 'defaultLaunchConfiguration')), writer: lc(pick(root.members.find((m) => m.address === '/writer'), 'launchConfiguration')),
    pair: lc(pick(pair, 'defaultLaunchConfiguration')), pairEngineer: lc(pick(pair.members.find((m) => m.address === '/pair/engineer'), 'launchConfiguration')) }
  const alt = { runtime: AGY, model: ALT }
  assert(JSON.stringify(r.launched) === JSON.stringify({ root: { runtime: AGY, model: MODEL }, writer: alt, pair: alt, pairEngineer: { runtime: GROK, model: GROK_MODEL } }),
    'carried Org start did not launch what the form showed', r.launched)

  // The Org launch page heading switcher → a Team (carried start): New chat for it with its members seeded.
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.launchOrg}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
  await switchTarget(page, ids.build)
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await settle(page, 2000)
  r.headingFromOrg = await page.locator(sel('run-target-name')).innerText()
  drawer = await openDrawer(page)
  await waitFor('Build engineer seeded after the Org page switch', async () => (await rowState(drawer, '/engineer')).customized === 'true', 60000)
  r.fromOrg = { engineer: await rowState(drawer, '/engineer'), reviewer: await rowState(drawer, '/reviewer'), lead: await rowState(drawer, '/lead'), unoffered: await rowState(drawer, '/unoffered') }
  assert(r.headingFromOrg === names.build && /grok/i.test(r.fromOrg.engineer.summary) && r.fromOrg.reviewer.summary.includes(ALT_LABEL)
    && r.fromOrg.lead.customized === 'false' && r.fromOrg.unoffered.note?.includes(NOT_OFFERED), 'Org page → Team: members seeded', r.fromOrg)
  await shot(page, 'DLP-009-org-page-to-team-seeded-880', 880)
  await closeDrawer(drawer)
  return r
})

defineCase('DLP-010', 'Preserved (DS-006): "+" on a Team run copies its recorded member settings and seeds nothing', async (page) => {
  const r = {}
  assert(state.buildRunId, 'needs DLP-001 (its Build team run)')
  // DLP-001 launched: lead on ALT (the user's choice), engineer on Grok (seeded), reviewer reset to follow the root.
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(page, 2500)
  const teamRow = page.locator(sel(`workspace-team-row-${state.buildRunId}`))
  await waitFor('Build team run row', async () => {
    if (await teamRow.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    const definitionRow = page.locator(sel(`workspace-team-definition-row-${ids.build}`)).first()
    if (await definitionRow.isVisible().catch(() => false) && await definitionRow.getAttribute('aria-expanded') !== 'true') await definitionRow.click()
    return false
  }, 60000, 1500)
  await teamRow.click(); await settle(page, 2500)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 2500)
  const drawer = await openDrawer(page)
  r.copy = { lead: await rowState(drawer, '/lead'), engineer: await rowState(drawer, '/engineer'), reviewer: await rowState(drawer, '/reviewer') }
  // A re-seed would put the reviewer back on its ALT default; the copy keeps the run's value (the root model).
  assert(r.copy.lead.summary.includes(ALT_LABEL) && /grok/i.test(r.copy.engineer.summary) && r.copy.reviewer.summary.includes(MODEL_LABEL)
    && !r.copy.reviewer.summary.includes(ALT_LABEL), '"+" copy re-seeded or lost the run\'s member settings', r.copy)
  await shot(page, 'DLP-010-plus-copy-not-seeded-880', 880)
  await closeDrawer(drawer)
  return r
})

defineCase('DLP-007', 'AC-008/DEC-008: copy A; the engineer\'s default edited in the Agents editor; copy B; Settings shows each copy\'s recorded values; stop and reopen from the UI; copy A\'s engineer then starts on Grok', async (page) => {
  const r = {}
  r.runId = await startManagerChat(page, MODEL, callTool('delegate_task', { recipient_address: address('squad'), description: 'Copy A work.' }))
  await waitFor('copy A', async () => teamCopies(await agentTree(r.runId), 'squad').length === 1, 120000, 1500)
  const copyA = membersOf(teamCopies(await agentTree(r.runId), 'squad')[0])
  // The user edits the engineer's default launch in the Agents editor: AGY with the ALT model.
  await page.goto(`${frontUrl}/agents?view=edit&id=${encodeURIComponent(ids.engineer)}`, { waitUntil: 'domcontentloaded' }); await settle(page, 3000)
  await page.locator('#agent-definition-runtime-kind').waitFor({ timeout: 60000 })
  await page.locator('#agent-definition-runtime-kind').selectOption(AGY); await settle(page, 1500)
  const modelField = page.locator('label', { hasText: /^Model$/ }).first().locator('xpath=..')
  await modelField.locator('button[aria-haspopup="listbox"], button').first().click(); await delay(800)
  await page.locator('[role="option"]').filter({ hasText: ALT_LABEL }).first().click(); await delay(500)
  await page.locator('form button[type="submit"]').last().click()
  r.savedDefault = await waitFor('engineer default saved', async () => {
    const saved = (await gql('query($id:String!){agentDefinition(id:$id){defaultLaunchConfig{runtimeKind llmModelIdentifier}}}', { id: ids.engineer })).agentDefinition?.defaultLaunchConfig
    return saved?.runtimeKind === AGY && saved?.llmModelIdentifier === ALT ? saved : null
  }, 60000, 1000)
  await openAgentRun(page, r.runId)
  r.copyBCall = await callFromComposer(page, 'delegate copy B', 'delegate_task', { recipient_address: address('squad'), description: 'Copy B work.' })
  assert(r.copyBCall.includes('"delegated":true'), 'copy B not delegated', r.copyBCall)
  let view = await openSettings(page)
  r.rowsBefore = await delegatedRows(page)
  const engineers = (rows) => rowsAt(rows, `${address('squad')}/engineer`).filter((x) => x.member)
  const showsCopies = (rows) => { const e = engineers(rows); return e.length === 2 && e.some((x) => /grok/i.test(x.launch)) && e.some((x) => x.launch.includes(ALT_LABEL) && x.source === 'agent_default') }
  assert(showsCopies(r.rowsBefore), 'Settings: copy A engineer on Grok and copy B engineer on ALT', engineers(r.rowsBefore))
  // Stop the run from Settings, then reopen it by sending a message.
  await view.locator(sel('existing-run-stop')).click()
  await waitFor('run stopped', async () => /Stopped/.test(await view.locator(sel('run-subject-status')).innerText()), 120000, 1000)
  // SR-006: Settings of the stopped run opens with every collaborator/copy row collapsed.
  await backToConversation(page)
  view = await openSettings(page)
  r.collapsedStopped = await delegatedRows(page, { expand: false })
  assertCollapsed(r.collapsedStopped, 'stopped run')
  await shot(page, 'DLP-007-settings-stopped-880', 880)
  await backToConversation(page)
  await typeAndSend(page, 'Resume. Marker DLP-007.')
  await waitFor('manager answered after reopen', async () => /DLP-007[\s\S]*OK/.test(await conversationText(page)), 90000)
  view = await openSettings(page)
  // ...and of the running run, the same collapsed rows.
  r.collapsedRunning = await delegatedRows(page, { expand: false })
  assertCollapsed(r.collapsedRunning, 'running run')
  assert(JSON.stringify(r.collapsedRunning.map((row) => [row.test, row.source, row.badge])) === JSON.stringify(r.collapsedStopped.map((row) => [row.test, row.source, row.badge])),
    'running and stopped Settings show different rows', { running: r.collapsedRunning, stopped: r.collapsedStopped })
  r.rowsAfter = await delegatedRows(page)
  assert(showsCopies(r.rowsAfter), 'Settings after reopen keeps the recorded values', engineers(r.rowsAfter))
  // Copy A's engineer (never started) starts on Grok, its recorded value, not on the edited default.
  await backToConversation(page)
  await openSidebarAgent(page, copyA.lead)
  r.toEngineer = await callFromComposer(page, 'copy A: message engineer', 'send_message_to', { recipient_address: `${address('squad')}/engineer`, content: 'Please list the directory.' })
  assert(r.toEngineer.includes('"accepted":true'), 'message to copy A engineer not accepted', r.toEngineer)
  await openSidebarAgent(page, copyA.engineer)
  await waitFor('copy A engineer Grok reply', async () => (await conversationText(page)).includes('alpha.txt'), 90000, 1500)
  assert((await agyLaunchesOf(copyA.engineer)).length === 0, 'copy A engineer started on AGY', await agyLaunchesOf(copyA.engineer))
  await shot(page, 'DLP-007-copy-a-engineer-grok-after-reopen-1280', 1280)
  return r
})

defineCase('DCP-001', 'delegated-copy-model-change AC-001/002/004/011, DEC-010: a running copy is locked with a stop icon; Stop from the sidebar; its model changed in Settings and saved; the next message resumes it on that model', async (page) => {
  const r = {}
  r.runId = await startManagerChat(page, MODEL, 'Hello. Marker DCP-001.')
  await waitFor('manager answered', async () => /DCP-001[\s\S]*OK/.test(await conversationText(page)), 60000)
  r.copyCall = await callFromComposer(page, 'delegate Writer', 'delegate_task', { recipient_address: address('writer'), description: 'Draft the notes.' })
  r.copyRunId = /"target_agent_run_id":"([^"]+)"/.exec(r.copyCall)?.[1] ?? null
  assert(r.copyCall.includes('"delegated":true') && r.copyRunId, 'Writer copy not started', r.copyCall)
  await waitFor('copy started on its default', async () => (await agyLaunchesOf(r.copyRunId)).length > 0, 60000)
  // `agyLaunchesOf` lists the `--model` of each AGY launch of the run.
  r.firstModels = await agyLaunchesOf(r.copyRunId)
  assert(r.firstModels.every((model) => model === ALT), 'copy did not start on its default (ALT)', r.firstModels)

  // Settings: the running copy has the run's stop icon and its model is locked with the hint.
  await openSettings(page)
  const key = `${address('writer')}@${r.copyRunId}`
  const section = page.locator(sel('run-delegated-launches'))
  await section.waitFor({ timeout: 60000 })
  const copyRow = () => section.locator(sel(`run-member-${key}`)).first()
  await waitFor('Settings copy row has the stop icon', async () => copyRow().locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
  await openMember(section, key)
  r.runningLocked = await copyRow().locator(`${sel('run-setting-model')} ${sel('run-setting-locked')}`).count() > 0
  r.runningHint = await copyRow().locator(sel('run-member-stop-hint')).first().innerText().catch(() => null)
  assert(r.runningLocked && /Stop this copy to change its model/.test(r.runningHint ?? ''), 'running copy should be locked with the hint', r)
  await shot(page, 'DCP-001-settings-running-copy-1280', 1280)

  // Stop from the sidebar row (the same stop icon as a running run); the copy goes offline; the root keeps running.
  const sidebarStop = page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id="${r.copyRunId}"] ${sel('workspace-delegated-stop')}`).first()
  await waitFor('sidebar copy row has the stop icon', async () => {
    if (await sidebarStop.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    return false
  }, 60000, 1000)
  await shot(page, 'DCP-001-sidebar-stop-icon-1280', 1280)
  await sidebarStop.click()
  await waitFor('copy stopped (no stop icon, model unlocked)', async () => !(await sidebarStop.isVisible().catch(() => false))
    && (await copyRow().locator(`${sel('run-setting-model')} ${sel('run-setting-locked')}`).count()) === 0, 60000, 1000)
  r.rootStillRunning = await page.locator(sel('existing-run-settings')).getAttribute('data-state')
  assert(r.rootStillRunning === 'active', 'the root should keep running', r.rootStillRunning)
  await shot(page, 'DCP-001-settings-stopped-copy-editable-1280', 1280)

  // Change its model like a stopped run's member (runtime locked), then the existing Save bar.
  await copyRow().locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel('chat-model-locked-runtime')).waitFor({ state: 'visible', timeout: 60000 })
  await page.locator(`${sel('chat-model-menu')} ${sel('chat-model-search')}`).fill(MODEL)
  await page.locator(sel(`chat-model-search-option-${MODEL}`)).click()
  await page.keyboard.press('Escape'); await delay(300)
  await page.locator(sel('existing-run-save-bar')).waitFor({ timeout: 30000 })
  await shot(page, 'DCP-001-settings-copy-changed-save-bar-1280', 1280)
  await page.locator(sel('save-existing-model-config')).click()
  // The bar says "Saved. …" once the Save is done ("Unsaved changes …" before).
  await waitFor('saved', async () => /^\s*Saved\./.test(await page.locator(sel('existing-run-save-bar')).innerText().catch(() => '')), 60000, 1000)
  r.savedSummary = (await copyRow().locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  r.savedSource = await copyRow().getAttribute('data-source')
  assert(r.savedSummary.includes(MODEL_LABEL) && r.savedSource === null, 'saved copy row should show the chosen model without an origin', r)
  r.stored = objectsIn(await agentTree(r.runId)).find((record) => pick(record, 'agentRunId') === r.copyRunId && pick(record, 'startedAt'))
  assert(pick(r.stored, 'userLaunchSelection')?.llmModelIdentifier === MODEL, 'choice not recorded', r.stored)
  await shot(page, 'DCP-001-settings-copy-saved-1280', 1280)

  // The next message resumes the copy with its conversation on the chosen model.
  await backToConversation(page)
  const before = (await agyLaunchesOf(r.copyRunId)).length
  r.resumeCall = await callFromComposer(page, 'message the copy', 'send_message_to', { target_agent_run_id: r.copyRunId, content: 'One more paragraph.' })
  assert(r.resumeCall.includes('"accepted":true'), 'message to the stopped copy not accepted', r.resumeCall)
  await waitFor('copy resumed', async () => (await agyLaunchesOf(r.copyRunId)).length > before, 60000)
  r.resumedModels = (await agyLaunchesOf(r.copyRunId)).slice(before)
  assert(r.resumedModels.length > 0 && r.resumedModels.every((model) => model === MODEL), 'copy did not resume on the chosen model', r.resumedModels)
  return r
})

/** In a stopped copy's Settings row: pick a model of its (locked) runtime from the model menu. */
const chooseCopyModel = async (page, row, model) => {
  await row.locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel('chat-model-locked-runtime')).waitFor({ state: 'visible', timeout: 60000 })
  await page.locator(`${sel('chat-model-menu')} ${sel('chat-model-search')}`).fill(model)
  await page.locator(sel(`chat-model-search-option-${model}`)).click()
  await page.keyboard.press('Escape'); await delay(300)
}
const saveBarText = (page) => page.locator(sel('existing-run-save-bar')).innerText().catch(() => '')
const saveSettings = async (page) => {
  await page.locator(sel('existing-run-save-bar')).waitFor({ timeout: 30000 })
  await page.locator(sel('save-existing-model-config')).click()
}
const modelLocked = async (row) => (await row.locator(`${sel('run-setting-model')} ${sel('run-setting-locked')}`).count()) > 0
/** The delegating agent (not the user) acts: one scripted tool call sent over the run's backend WebSocket. */
const agentActs = async (route, rootId, payload) => {
  const socket = new WebSocket(`${backendUrl.replace('http', 'ws')}/ws/${route}/${rootId}`)
  const frames = []
  socket.addEventListener('message', (event) => frames.push(event.data))
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  await waitFor(`${route} socket ready`, () => frames.length > 0, 30000, 200)
  const messageId = `probe-${randomUUID()}`
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: messageId, dedupe_key: `agent_run_input:probe:${messageId}`, context_file_paths: [], image_urls: [], ...payload } }))
  await delay(1500); socket.close()
}

defineCase('DCP-002', 'delegated-copy-model-change AC-002/003, IR-002 (Team root, UI): a Team copy stopped from its sidebar row; its Team model changed and saved; the copy lead\'s "+" shows the choice without a reload; the next message resumes the lead on it', async (page) => {
  const r = {}
  await newChatFor(page, '/agent-teams', names.home)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
  const before = new Set(await teamRunIds(ids.home))
  await typeAndSend(page, callTool('delegate_task', { recipient_address: address('pair'), description: 'Pair work.' }))
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.home)).find((id) => !before.has(id)), 60000)
  const copy = await waitFor('Pair copy in the team run', async () => teamCopies(await teamTree(r.teamRunId), 'pair')[0], 120000, 1500)
  r.copyTeamRunId = pick(copy, 'teamRunId')
  r.copyMembers = membersOf(copy)
  await waitFor('copy lead started on the Team default', async () => (await agyLaunchesOf(r.copyMembers.lead)).length > 0, 60000)
  assert(JSON.stringify(await agyLaunchesOf(r.copyMembers.lead)) === JSON.stringify([ALT]), 'copy lead did not start on the Team default (ALT)', await agyLaunchesOf(r.copyMembers.lead))
  await openTeamRun(page, r.teamRunId, ids.home)
  await openSettings(page)
  const section = page.locator(sel('run-delegated-launches'))
  const key = `${address('pair')}@${r.copyTeamRunId}`
  const teamRow = () => section.locator(sel(`run-member-${key}`)).first()
  await waitFor('Settings Team copy row has the stop icon', async () => teamRow().locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
  await openMember(section, key)
  r.runningLocked = await modelLocked(teamRow())
  r.runningHint = await teamRow().locator(sel('run-member-stop-hint')).first().innerText().catch(() => null)
  assert(r.runningLocked && /Stop this copy to change its model/.test(r.runningHint ?? ''), 'running Team copy should be locked with the hint', r)
  // Stop from the copy's own sidebar row (the Team row, not one of its members).
  // The copy's own row in the run tree (labelled like its address, e.g. "pair team 3b8c"), not one of its members.
  const teamLabel = address('pair').slice(1).replace(/_/g, ' ')
  const sidebarStop = page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: teamLabel }).locator(sel('workspace-delegated-stop')).first()
  await waitFor('sidebar Team copy row has the stop icon', async () => {
    if (await sidebarStop.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    return false
  }, 60000, 1000)
  await shot(page, 'DCP-002-sidebar-team-copy-stop-1280', 1280)
  await sidebarStop.click()
  await waitFor('Team copy stopped (model unlocked)', async () => !(await sidebarStop.isVisible().catch(() => false)) && !(await modelLocked(teamRow())), 60000, 1000)
  assert(await page.locator(sel('existing-run-settings')).getAttribute('data-state') === 'active', 'the root should keep running')
  // The Team model: its followers take it (REQ-002).
  await chooseCopyModel(page, teamRow(), MODEL)
  await saveSettings(page)
  await waitFor('saved', async () => /^\s*Saved\./.test(await saveBarText(page)), 60000, 1000)
  r.savedTeamSummary = (await teamRow().locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  assert(r.savedTeamSummary.includes(MODEL_LABEL), 'Team copy row should show the chosen model', r)
  const stored = objectsIn(await teamTree(r.teamRunId)).find((record) => pick(record, 'teamRunId') === r.copyTeamRunId && pick(record, 'startedAt'))
  assert(pick(stored, 'userTeamLaunchSelection')?.llm_model_identifier === MODEL || pick(stored, 'userTeamLaunchSelection')?.llmModelIdentifier === MODEL, 'Team choice not recorded', stored)
  await shot(page, 'DCP-002-settings-team-copy-saved-1280', 1280)
  // IR-002: without a reload, the copy lead's conversation context carries the choice: "+" from it prefills it.
  await backToConversation(page)
  await openSidebarAgent(page, r.copyMembers.lead)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 1500)
  r.plusModel = (await page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).innerText()).replace(/\s+/g, ' ')
  assert(r.plusModel.includes(MODEL_LABEL) && !r.plusModel.includes(ALT_LABEL), '"+" from the copy lead should prefill the chosen model', r.plusModel)
  await shot(page, 'DCP-002-plus-from-copy-lead-1280', 1280)
  // The next message is sent by the root manager, not the last-selected copy lead.
  await openTeamRun(page, r.teamRunId, ids.home)
  await page.locator(sel(`workspace-team-member-${r.teamRunId}-/manager`)).click()
  await settle(page, 1000)
  const resumeFrom = (await agyLaunchesOf(r.copyMembers.lead)).length
  r.resume = await callFromComposer(page, 'message the copy lead', 'send_message_to', { target_agent_run_id: r.copyMembers.lead, content: 'Please continue.' })
  assert(r.resume.includes('"accepted":true'), 'message to the stopped copy not accepted', r.resume)
  await waitFor('copy lead resumed', async () => (await agyLaunchesOf(r.copyMembers.lead)).length > resumeFrom, 60000)
  r.resumedModels = (await agyLaunchesOf(r.copyMembers.lead)).slice(resumeFrom)
  assert(r.resumedModels.every((model) => model === MODEL), 'copy lead did not resume on the Team choice', r.resumedModels)
  return r
})

defineCase('DCP-003', 'delegated-copy-model-change AC-001/002 (Org root, UI): a copy stopped from its Settings row (its Org sidebar stop icon goes away); its model changed and saved; the next message resumes it on that model', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.hostOrg}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
  await chooseModel(page, page.locator(sel('org-launch-card')), AGY, MODEL)
  await page.locator(sel('org-launch-run')).click()
  await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 2500)
  const params = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams
  r.orgRunId = params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /manager/i }).first().click(); await settle(page, 2500)
  r.copyCall = await callFromComposer(page, 'org: delegate Writer', 'delegate_task', { recipient_address: address('writer'), description: 'Draft the notes.' })
  r.copyRunId = /"target_agent_run_id":"([^"]+)"/.exec(r.copyCall)?.[1] ?? null
  assert(r.copyCall.includes('"delegated":true') && r.copyRunId, 'Writer copy not started', r.copyCall)
  await waitFor('copy started', async () => (await agyLaunchesOf(r.copyRunId)).length > 0, 60000)
  const orgStop = page.locator(sel(`agent-org-task-agent-row-${r.copyRunId}`)).locator('xpath=..').locator(sel('workspace-delegated-stop')).first()
  await waitFor('Org sidebar copy row has the stop icon', async () => {
    if (await orgStop.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    return false
  }, 60000, 1000)
  await shot(page, 'DCP-003-org-sidebar-stop-icon-1280', 1280)
  await openSettings(page)
  const section = page.locator(sel('run-delegated-launches'))
  const key = `${address('writer')}@${r.copyRunId}`
  const row = () => section.locator(sel(`run-member-${key}`)).first()
  await waitFor('Settings copy row has the stop icon', async () => row().locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
  // Stop from the Settings row this time.
  await row().locator(sel('run-member-stop')).first().click()
  await openMember(section, key)
  await waitFor('copy stopped (model unlocked)', async () => !(await modelLocked(row())), 60000, 1000)
  assert(!(await orgStop.isVisible().catch(() => false)), 'the Org sidebar stop icon should go away once the copy is stopped')
  await chooseCopyModel(page, row(), MODEL)
  await saveSettings(page)
  await waitFor('saved', async () => /^\s*Saved\./.test(await saveBarText(page)), 60000, 1000)
  r.savedSummary = (await row().locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  assert(r.savedSummary.includes(MODEL_LABEL) && await row().getAttribute('data-source') === null, 'saved copy row should show the chosen model without an origin', r)
  const stored = objectsIn(await orgTree(r.orgRunId)).find((record) => pick(record, 'agentRunId') === r.copyRunId && pick(record, 'startedAt'))
  assert(pick(stored, 'userLaunchSelection')?.llmModelIdentifier === MODEL, 'choice not recorded', stored)
  await shot(page, 'DCP-003-org-settings-copy-saved-1280', 1280)
  await backToConversation(page)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /manager/i }).first().click(); await settle(page, 2000)
  const resumeFrom = (await agyLaunchesOf(r.copyRunId)).length
  r.resume = await callFromComposer(page, 'org: message the copy', 'send_message_to', { target_agent_run_id: r.copyRunId, content: 'One more paragraph.' })
  assert(r.resume.includes('"accepted":true'), 'message to the stopped copy not accepted', r.resume)
  await waitFor('copy resumed', async () => (await agyLaunchesOf(r.copyRunId)).length > resumeFrom, 60000)
  r.resumedModels = (await agyLaunchesOf(r.copyRunId)).slice(resumeFrom)
  assert(r.resumedModels.every((model) => model === MODEL), 'copy did not resume on the chosen model', r.resumedModels)
  return r
})

defineCase('DCP-004', 'delegated-copy-model-change AC-011, AC-005 (UI): the delegating agent wakes the copy while the user edits: Save is refused and records nothing; after a Save and an app (backend) restart the choice is shown and the copy resumes on it', async (page) => {
  const r = {}
  r.runId = await startManagerChat(page, MODEL, 'Hello. Marker DCP-004.')
  await waitFor('manager answered', async () => /DCP-004[\s\S]*OK/.test(await conversationText(page)), 60000)
  r.copyCall = await callFromComposer(page, 'delegate Writer', 'delegate_task', { recipient_address: address('writer'), description: 'Draft the notes.' })
  r.copyRunId = /"target_agent_run_id":"([^"]+)"/.exec(r.copyCall)?.[1] ?? null
  assert(r.copyRunId, 'Writer copy not started', r.copyCall)
  await waitFor('copy started', async () => (await agyLaunchesOf(r.copyRunId)).length > 0, 60000)
  await openSettings(page)
  const section = page.locator(sel('run-delegated-launches'))
  const key = `${address('writer')}@${r.copyRunId}`
  const row = () => section.locator(sel(`run-member-${key}`)).first()
  await waitFor('Settings copy row has the stop icon', async () => row().locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
  await row().locator(sel('run-member-stop')).first().click()
  await openMember(section, key)
  await waitFor('copy stopped', async () => !(await modelLocked(row())), 60000, 1000)
  await chooseCopyModel(page, row(), MODEL)
  await page.locator(sel('existing-run-save-bar')).waitFor({ timeout: 30000 })
  // While the edit is unsaved, the delegating agent messages the copy and wakes it.
  const wakeFrom = (await agyLaunchesOf(r.copyRunId)).length
  await agentActs('agent', r.runId, { agent_run_id: r.runId, content: callTool('send_message_to', { target_agent_run_id: r.copyRunId, content: 'Are you there?' }) })
  await waitFor('copy woken by its delegating agent', async () => (await agyLaunchesOf(r.copyRunId)).length > wakeFrom, 60000)
  await saveSettings(page)
  // The refusal is shown at the top of Settings; the edit stays unsaved.
  r.refusal = await waitFor('the Save is refused', async () => {
    const text = await page.locator(sel('existing-run-settings')).innerText().catch(() => '')
    return /This copy is running\. Stop it, then change its model\./.test(text) && !/^\s*Saved\./.test(await saveBarText(page)) ? text.match(/This copy is running[^\n]*/)[0] : null
  }, 60000, 1000)
  r.barAfterRefusal = await saveBarText(page)
  r.storedAfterRefusal = objectsIn(await agentTree(r.runId)).find((record) => pick(record, 'agentRunId') === r.copyRunId && pick(record, 'startedAt'))
  assert(!pick(r.storedAfterRefusal, 'userLaunchSelection'), 'a refused Save recorded a choice', r.storedAfterRefusal)
  await shot(page, 'DCP-004-save-refused-copy-running-1280', 1280)
  // Stop it again and Save.
  await waitFor('Settings copy row has the stop icon again', async () => row().locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
  await row().locator(sel('run-member-stop')).first().click()
  await waitFor('copy stopped again', async () => !(await modelLocked(row())), 60000, 1000)
  if (!(await page.locator(sel('existing-run-save-bar')).isVisible().catch(() => false))) await chooseCopyModel(page, row(), MODEL)
  await saveSettings(page)
  await waitFor('saved', async () => /^\s*Saved\./.test(await saveBarText(page)), 60000, 1000)
  // AC-005: the app restarts (the backend process), the run is reopened: Settings still shows the choice.
  await stopOwned(backend)
  backend = await startBackend('backend-restarted-dcp-004')
  // File/hash navigation does not reload the desktop renderer as an HTTP navigation does.
  if (desktop) await page.reload({ waitUntil: 'domcontentloaded' })
  await openAgentRun(page, r.runId)
  await openSettings(page)
  await openMember(section, key)
  r.afterRestartSummary = (await row().locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  assert(r.afterRestartSummary.includes(MODEL_LABEL) && !r.afterRestartSummary.includes(ALT_LABEL), 'after the restart Settings should show the chosen model', r)
  await shot(page, 'DCP-004-settings-after-restart-1280', 1280)
  await backToConversation(page)
  await typeAndSend(page, 'Resume. Marker DCP-004-RESTART.')
  await waitFor('manager answered after the restart', async () => /DCP-004-RESTART[\s\S]*OK/.test(await conversationText(page)), 90000)
  const resumeFrom = (await agyLaunchesOf(r.copyRunId)).length
  r.resume = await callFromComposer(page, 'message the copy after the restart', 'send_message_to', { target_agent_run_id: r.copyRunId, content: 'After the restart.' })
  assert(r.resume.includes('"accepted":true'), 'message to the copy not accepted', r.resume)
  await waitFor('copy resumed after the restart', async () => (await agyLaunchesOf(r.copyRunId)).length > resumeFrom, 60000)
  r.resumedModels = (await agyLaunchesOf(r.copyRunId)).slice(resumeFrom)
  assert(r.resumedModels.every((model) => model === MODEL), 'copy did not resume on the chosen model after the restart', r.resumedModels)
  return r
})

defineCase('DCP-005', 'delegated-copy-model-change REQ-001 (any member), AC-010 scenario (Team root, UI): one member of a Team copy, after it has run, gets its own model in Settings; the other rows stay as they were; its next turn resumes its conversation on that model while the coordinator keeps its own', async (page) => {
  const r = {}
  await newChatFor(page, '/agent-teams', names.home)
  await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
  const before = new Set(await teamRunIds(ids.home))
  await typeAndSend(page, callTool('delegate_task', { recipient_address: address('pair'), description: 'Pair review work.' }))
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.home)).find((id) => !before.has(id)), 60000)
  const copy = await waitFor('Pair copy in the team run', async () => teamCopies(await teamTree(r.teamRunId), 'pair')[0], 120000, 1500)
  r.copyTeamRunId = pick(copy, 'teamRunId')
  r.members = membersOf(copy)
  const member = 'unoffered'
  const memberAddress = `${address('pair')}/${member}`
  await waitFor('copy lead started', async () => (await agyLaunchesOf(r.members.lead)).length > 0, 60000)
  // The member runs once, from the copy lead's own conversation (on the Team value).
  await openTeamRun(page, r.teamRunId, ids.home)
  await openSidebarAgent(page, r.members.lead)
  r.firstCall = await callFromComposer(page, 'copy lead → member', 'send_message_to', { recipient_address: memberAddress, content: 'First review.' })
  assert(r.firstCall.includes('"accepted":true'), 'message to the member not accepted', r.firstCall)
  await waitFor('member ran once', async () => (await agyLaunchesOf(r.members[member])).length > 0, 60000)
  r.memberFirst = await agyLaunchDetailsOf(r.members[member])
  assert(JSON.stringify(r.memberFirst.map(([model]) => model)) === JSON.stringify([ALT]), 'member did not run on the Team value first', r.memberFirst)

  // Settings: stop the copy from its row, open the copy, then only the member, change its model and Save.
  await openTeamRun(page, r.teamRunId, ids.home)
  await openSettings(page)
  const section = page.locator(sel('run-delegated-launches'))
  const teamKey = `${address('pair')}@${r.copyTeamRunId}`
  const rowOf = (key) => section.locator(sel(`run-member-${key}`)).first()
  const keyOf = (name) => `${address('pair')}/${name}@${r.members[name]}`
  await waitFor('Settings Team copy row has the stop icon', async () => rowOf(teamKey).locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
  await rowOf(teamKey).locator(sel('run-member-stop')).first().click()
  await openMember(section, teamKey)
  await waitFor('Team copy stopped (model unlocked)', async () => !(await modelLocked(rowOf(teamKey))), 60000, 1000)
  const summaryOf = async (key) => (await rowOf(key).locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ')
  const engineerRecord = async () => {
    const team = teamCopies(await teamTree(r.teamRunId), 'pair').find(record => pick(record, 'teamRunId') === r.copyTeamRunId)
    const execution = team?.members.find(member => pick(member, 'agentRunId') === r.members.engineer)
    const source = pick(team, 'source')?.members.find(member => member.address === execution?.address)
    assert(execution && source, 'Engineer canonical execution/source missing', team)
    return { execution, source }
  }
  r.engineerBefore = await engineerRecord()
  r.before = { team: await summaryOf(teamKey), lead: await summaryOf(keyOf('lead')), engineer: await summaryOf(keyOf('engineer')), member: await summaryOf(keyOf(member)) }
  await openMember(section, keyOf(member))
  await chooseCopyModel(page, rowOf(keyOf(member)), MODEL)
  await saveSettings(page)
  await waitFor('saved', async () => /^\s*Saved\./.test(await saveBarText(page)), 60000, 1000)
  await openMember(section, teamKey)
  r.after = { team: await summaryOf(teamKey), lead: await summaryOf(keyOf('lead')), engineer: await summaryOf(keyOf('engineer')), member: await summaryOf(keyOf(member)) }
  r.memberSource = await rowOf(keyOf(member)).getAttribute('data-source')
  assert(r.after.member.includes(MODEL_LABEL) && !r.after.member.includes(ALT_LABEL) && r.memberSource === null, 'the member row should show its new model without an origin', r)
  r.engineerAfter = await engineerRecord()
  // Catalog hydration may replace the same model's raw ID with its friendly label; configuration must stay exact.
  const catalogLabel = text => text.replace('grok-4.7', 'Grok 4.7')
  assert(r.after.team === r.before.team && r.after.lead === r.before.lead
    && catalogLabel(r.after.engineer) === catalogLabel(r.before.engineer)
    && JSON.stringify(r.engineerAfter) === JSON.stringify(r.engineerBefore), 'the other rows should keep their exact settings', r)
  // The whole Team copy card: the edited member with its unchanged teammates (the Save bar would cover a viewport shot).
  await shot(page, 'DCP-005-settings-team-copy-member-saved-1280', 1280)
  await rowOf(teamKey).screenshot({ path: path.join(outDir, 'DCP-005-team-copy-card-member-saved.png') })
  const stored = objectsIn(await teamTree(r.teamRunId)).find((record) => pick(record, 'teamRunId') === r.copyTeamRunId && pick(record, 'startedAt') && Array.isArray(record.members))
  r.storedChoices = { team: pick(stored, 'userTeamLaunchSelection') ?? null,
    members: Object.fromEntries(stored.members.map((m) => [String(m.address).split('/').pop(), (pick(m, 'userLaunchSelection') ?? null) && (pick(pick(m, 'userLaunchSelection'), 'llmModelIdentifier'))])) }
  assert(r.storedChoices.team === null && JSON.stringify(r.storedChoices.members) === JSON.stringify({ lead: null, engineer: null, [member]: MODEL }), 'the choice should be recorded on the member only', r.storedChoices)

  // Its next turn: from the copy lead's conversation; the member resumes its conversation on the choice; the lead keeps its own.
  await backToConversation(page)
  const leadFrom = (await agyLaunchesOf(r.members.lead)).length
  const memberFrom = (await agyLaunchesOf(r.members[member])).length
  await openSidebarAgent(page, r.members.lead)
  r.secondCall = await callFromComposer(page, 'copy lead → member again', 'send_message_to', { recipient_address: memberAddress, content: 'Second review.' })
  assert(r.secondCall.includes('"accepted":true'), 'second message to the member not accepted', r.secondCall)
  await waitFor('member resumed', async () => (await agyLaunchesOf(r.members[member])).length > memberFrom, 60000)
  r.memberResume = (await agyLaunchDetailsOf(r.members[member])).slice(memberFrom)
  r.leadResume = (await agyLaunchesOf(r.members.lead)).slice(leadFrom)
  assert(r.memberResume.length === 1 && r.memberResume[0][0] === MODEL && r.memberResume[0][1], 'the member should resume its conversation on the chosen model', r.memberResume)
  assert(r.leadResume.every((model) => model === ALT), 'the coordinator should keep its own model', r.leadResume)
  return r
})

// Focused stopped-parent regression shares the existing public fixture/runtime/UI helpers.
if (onlyCases?.some(id => id.startsWith('SSR-'))) registerSavedRefreshCases({ defineCase, assert, waitFor, delay, sel, startManagerChat, callFromComposer, address,
  agentTree, objectsIn, pick, teamCopies, membersOf, collaboratorAt, openSettings, backToConversation,
  openMember, chooseCopyModel, saveSettings, saveBarText, shot, agyLaunchDetailsOf, MODEL, ALT, MODEL_LABEL, ALT_LABEL,
  modelLocked, conversationText, typeAndSend })
const desktopSurface = desktopAdapter({ webDir, outDir, chromium, assert, waitFor })
let exitCode = 0
try {
  assert(desktop || (chrome && existsSync(chrome)), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  assert(!existsSync(outDir), `Output directory exists; pass a fresh --output-dir (${outDir})`)
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'delegated-launch-defaults-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  workspace = path.join(ownedRoot, 'workspace')
  const home = path.join(ownedRoot, 'home')
  const toolsDir = path.join(ownedRoot, 'tools')
  for (const dir of [path.join(dataRoot, 'db'), workspace, home, toolsDir]) await fs.mkdir(dir, { recursive: true })
  missingCodex = path.join(ownedRoot, 'missing', 'codex')
  argvLog = path.join(ownedRoot, 'agy-argv.jsonl')
  agyModelsFile = path.join(toolsDir, 'agy-models.tsv')
  await offerAgyModels([MODEL, ALT])
  const agy = path.join(toolsDir, 'agy')
  await fs.writeFile(agy, `#!/bin/sh\nif [ "$1" = "models" ]; then cat "${agyModelsFile}"; exit 0; fi\nexec "${process.execPath}" "${path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')}" "$@"\n`, { mode: 0o755 })
  const grok = path.join(toolsDir, 'grok')
  await fs.writeFile(grok, `#!/bin/sh\nexec "${process.execPath}" "${path.join(serverDir, 'tests/fixtures/grok-acp/fake-grok-cli.mjs')}" "$@"\n`, { mode: 0o755 })
  dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  Object.assign(backendEnv, {
    ...baseEnv(), HOME: home, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
    ANTIGRAVITY_CLI_COMMAND: agy, AGY_FAKE_CASE: 'linked_skills', AGY_FAKE_ARGV_LOG: argvLog,
    GROK_BUILD_COMMAND: grok, FAKE_ACP_FIXTURE: path.join(serverDir, 'tests/fixtures/grok-acp/prompt.jsonl'), FAKE_ACP_REPORT_MCP_READY: '1',
    CODEX_APP_SERVER_COMMAND: missingCodex,
  })
  backend = await startBackend('backend')
  await seed()
  evidence.definitions = { ids, names }
  let context, page
  if (desktop) {
    const surface = await desktopSurface.start(backendUrl, process.argv.includes('--skip-build'))
    ;({ browser, context, page, frontUrl } = surface)
    evidence.desktop = surface.identity
  } else {
    spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
    await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
    browser = await chromium.launch({ headless: true, executablePath: chrome })
    context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
    page = await context.newPage()
  }
  page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  // Warm only Nuxt; desktop uses the built production renderer.
  if (!desktop) for (const route of ['/chat', '/agents', '/agent-teams', '/agent-orgs', '/workspace']) {
    await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000)
  }
  browserErrors.length = 0
  const selectedCases = onlyCases ? onlyCases.map(id => {
    const found = cases.find(c => c.id === id); assert(found, `Unknown case ${id}`); return found
  }) : cases
  for (const c of selectedCases) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const started = Date.now()
    if (ledger) await fs.appendFile(ledger, `\n- ${new Date().toISOString()} ${c.id} Started (${desktop ? 'desktop' : 'browser'}); ${outDir}\n`)
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
    if (ledger) await fs.appendFile(ledger, `\n- ${new Date().toISOString()} ${c.id} ${outcome.result}: ${outcome.error ?? 'assertions passed'}; ${outDir}\n`)
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
  if (desktop) {
    try { evidence.cleanup.push({ desktop: await desktopSurface.stop() }) } catch (error) { evidence.cleanup.push({ error: error.message }); exitCode = 1 }
  } else await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'delegated-launch-defaults-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
