// Live run-settings probe (ticket run-settings-ui-unification).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → real runtimes
// (Claude Agent SDK `haiku` for the run roots; a Codex App Server model with Fast mode, `gpt-5.5` preferred). Everything runs in an
// owned temp data root on free ports with a sanitized environment, so a running desktop app or the user's
// `~/.autobyteus` data is never touched. Each case asserts the server-side run config through GraphQL readback.
//
// Cases (grouped by the SR-010 validation slices):
//   S1 R01 Team Run → New chat; one member customized (Codex Fast-mode model, Fast on, Ask first) → the created team run's
//          member config has those values and the other members inherit (AC-004, AC-006, AC-019)
//   S1 R11 Chat nav and the "new chat" pencil open a fresh plain New chat (DI-001)
//   S5 R09 Agent Run → New chat with Codex + Thinking Low + Fast; Fast and Thinking are independent; the run's
//          llmConfig is {reasoning_effort: low, service_tier: fast}; a first-send `@` collaborator is admitted (AC-019)
//   S6 R12 New chat footer with a long Codex model name, Thinking and Fast: no overlapping controls (VIS-020/021)
//   S6 (in R01/R02/R07) settings-card geometry with a long Codex model: drawer rows, Org card, saved-run cards (running
//          and stopped) — no overlapping controls, nothing outside the card, at 880/804/390
//   S6 R13 Start-surface tools open (VIS-017), Org card Fast mode row (VIS-023/028), Org unavailable (VIS-014)
//   S1 R04 Agent "+" from the host run and from its `@` collaborator view → New chat for the agent on screen,
//          prefilled with its settings (AC-008, SR-009)
//   S1 R05 Team "+" → New chat prefilled with the member overrides (AC-008)
//   S2 R02 Org Run → Org launch page; a member override (Codex + Ask first) and a placed-team folder workspace →
//          the active Org run's config matches (AC-003)
//   S2 R03 Org launch rejected by the server → "Couldn't start this Agent Org. Try again.", values kept (AC-003)
//   S2 R06 Org "+" → Org launch page prefilled with the overrides and the placed-team workspace (AC-008)
//   S3 R07 Saved Team run: running locks (incl. Fast) → Terminate team → locked-runtime model menu → change →
//          Cancel → change again → Save → readback → resume keeps the saved config (AC-009..011, AC-019)
//   S3 R08 Saved Org run: Stop Agent Org → change the Org model → Save → readback (AC-009, AC-010)
//   S1/S2 R10 DI-004: the backend restarts with the Codex runtime unavailable; Team "+" and Org "+" copies that
//          keep a Codex member are blocked ("Codex is unavailable. Choose another runtime.")
// Screenshots named after the VIS references are written for the visual comparison (S6).
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome, logged-in `claude` and `codex` CLIs.
// Usage: pnpm test:e2e:run-settings-live [--output-dir test-results/run-settings-live] [--cases R01,R07] [--keep]
// Cases share state (R01 → R05/R07/R10, R09 → R04, R02 → R06/R08/R10); `--cases` adds the producers.
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
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
const rootDir = path.resolve(webDir, '..')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/run-settings-live'))
const keep = process.argv.includes('--keep')
const ROOT = { runtime: 'claude_agent_sdk', model: 'haiku', other: 'sonnet' }
// Codex models whose schema has `service_tier` (Fast mode); filled from the server catalog, `gpt-5.5` preferred.
const FAST = { runtime: 'codex_app_server', model: null, candidates: [] }
const PRODUCER = { teamRun: 'R01', agentRun: 'R09', orgRun: 'R02' }
const NEEDS = { R04: ['agentRun'], R05: ['teamRun'], R07: ['teamRun'], R06: ['orgRun'], R08: ['orgRun'], R10: ['teamRun', 'orgRun'] }
const ORDER = ['R01', 'R11', 'R09', 'R12', 'R13', 'R04', 'R05', 'R02', 'R03', 'R06', 'R07', 'R08', 'R10']
const withPrerequisites = (list) => {
  const all = new Set(list)
  for (const id of list) for (const need of NEEDS[id] ?? []) all.add(PRODUCER[need])
  return [...all]
}
const onlyCases = arg('cases', null) ? withPrerequisites(arg('cases', null).split(',')) : null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))

const evidence = { startedAt: new Date().toISOString(), cases: {}, processes: [], cleanup: [], observations: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const note = (text, details) => { evidence.observations.push({ text, details: details ?? null }); console.log(`  · ${text}`) }
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

let ownedRoot, dataRoot, backend, frontend, browser, backendPort, frontendPort, backendUrl, frontUrl, dbUrl
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const startBackend = async (label, extraEnv = {}) => {
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true', ...extraEnv }
  const child = spawnOwned(label, process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor(`${label} health`, async () => { assert(child.exitCode === null, `${label} exited`); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  return child
}

// ---------------------------------------------------------------------------------------------
// Fixtures: shared definitions created through the product's GraphQL API.
const REPLY = 'Reply to the user in one short sentence. Never call tools.'
const ids = {}
const seed = async () => {
  const agent = async (key, name) => {
    ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, description: `${name}.`, instructions: REPLY, toolNames: [] } })).createAgentDefinition.id
  }
  await agent('planner', 'Planner'); await agent('drafter', 'Drafter'); await agent('checker', 'Checker')
  await agent('scout', 'Scout'); await agent('fragile', 'Fragile Helper')
  ids.docsTeam = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name: 'Docs Team', description: 'Writes docs.', instructions: `Work together. ${REPLY}`, coordinatorMemberName: 'planner',
    nodes: [['planner', ids.planner], ['drafter', ids.drafter], ['checker', ids.checker]].map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })), handoffs: [],
  } })).createAgentTeamDefinition.id
  const org = async (key, name, members) => {
    ids[key] = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name, description: `${name}.`, instructions: 'Plan docs.', members, handoffs: [] } })).createAgentOrgDefinition.id
  }
  await org('org', 'Docs Org', [{ memberName: 'scout', ref: ids.scout, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'docs', ref: ids.docsTeam, refType: 'AGENT_TEAM', refScope: 'SHARED' }])
  await org('fragileOrg', 'Fragile Org', [{ memberName: 'helper', ref: ids.fragile, refType: 'AGENT', refScope: 'SHARED' }])
}

// ---------------------------------------------------------------------------------------------
// Page helpers (the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const state = {}
const shot = async (page, name, width) => {
  const before = page.viewportSize()
  if (width) { await page.setViewportSize({ width, height: width < 600 ? 844 : 900 }); await delay(700) }
  await page.screenshot({ path: path.join(outDir, `${name}.png`) })
  if (width) { await page.setViewportSize(before); await delay(400) }
}
const composerInput = (page) => page.locator(`${sel('chat-composer')} textarea`).first()
const runComposer = (page) => page.locator('main textarea[aria-autocomplete="list"]').last()
const settle = async (page, ms = 600) => { await delay(ms); await page.waitForLoadState('domcontentloaded').catch(() => {}) }
/**
 * Chooses a model in the model menu opened from `scope`; `runtimeKind` null in the runtime-locked (saved-run) menu.
 * `model` is an id, or a list of acceptable ids (the first one the menu renders is chosen). Returns the chosen id.
 */
const chooseModel = async (page, scope, runtimeKind, model) => {
  await scope.locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  if (runtimeKind) {
    await waitFor(`${runtimeKind} model list`, async () => {
      if (await page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false)) return true
      await page.locator(sel(`chat-runtime-${runtimeKind}`)).hover(); await delay(300)
      if (!(await page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false))) await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
      await delay(700)
      return page.locator(sel(`chat-model-list-${runtimeKind}`)).isVisible().catch(() => false)
    }, 120000, 500)
  }
  const wanted = Array.isArray(model) ? model : [model]
  const chosen = await waitFor(`model row ${wanted.join('|')}`, async () => {
    const list = runtimeKind ? page.locator(sel(`chat-model-list-${runtimeKind}`)) : page.locator(sel('chat-model-menu')).first()
    const rendered = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
    return wanted.find((id) => rendered.includes(id)) ?? null
  }, 120000, 500)
  const row = (runtimeKind ? page.locator(sel(`chat-model-list-${runtimeKind}`)) : page.locator(sel('chat-model-menu')).first()).locator(`${MODEL_ROW}${sel(`chat-model-option-${chosen}`)}`).first()
  await row.scrollIntoViewIfNeeded().catch(() => {})
  if (runtimeKind) {
    // Enter the flyout sideways at the runtime row's height: a diagonal pointer path would cross the next
    // runtime rows and open their flyouts instead (the menu opens flyouts on hover).
    const runtimeRow = await page.locator(sel(`chat-runtime-${runtimeKind}`)).boundingBox({ timeout: 1000 }).catch(() => null)
    const flyoutBox = await page.locator(sel(`chat-model-list-${runtimeKind}`)).boundingBox({ timeout: 1000 }).catch(() => null)
    if (runtimeRow && flyoutBox && flyoutBox.x > runtimeRow.x) await page.mouse.move(flyoutBox.x + 12, Math.min(Math.max(runtimeRow.y + runtimeRow.height / 2, flyoutBox.y + 6), flyoutBox.y + flyoutBox.height - 6), { steps: 5 })
  }
  await row.click()
  await settle(page, 400)
  return chosen
}
/** Sets a thinking value from the scope's Thinking control (on/off primary list or per-parameter list). */
const chooseThinking = async (page, scope, value) => {
  await scope.locator(sel('chat-thinking-trigger')).first().click()
  const menu = page.locator(sel('chat-thinking-menu')).first(); await menu.waitFor()
  const primary = menu.locator(sel(`chat-thinking-option-primary-${value}`))
  if (await primary.count()) await primary.first().click()
  else await menu.locator(`[data-test$="-${value}"]`).first().click()
  await page.keyboard.press('Escape').catch(() => {})
  await settle(page, 300)
}
/**
 * REQ-001/REQ-022 (VIS-020/021/042): the composer footer controls (model, Thinking, other settings, Send) never
 * overlap one another at the reference widths. Returns the overlapping pairs per width.
 */
const FOOTER_WIDTHS = [1512, 880, 804, 390]
const footerOverlaps = async (page) => {
  const before = page.viewportSize()
  const result = {}
  for (const width of FOOTER_WIDTHS) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 }); await delay(600)
    result[width] = await page.evaluate(() => {
      const root = document.querySelector('[data-test="chat-composer"]')
      const controls = ['chat-workspace-trigger', 'chat-approval-toggle', 'chat-model-trigger', 'chat-thinking-trigger', 'chat-model-option-service_tier', 'chat-primary-action']
        .map((id) => [id, root?.querySelector(`[data-test="${id}"]`)?.getBoundingClientRect()])
        .filter(([, r]) => r && r.width > 0)
      const overlaps = []
      for (let i = 0; i < controls.length; i += 1) for (let j = i + 1; j < controls.length; j += 1) {
        const [a, ra] = controls[i]; const [b, rb] = controls[j]
        if (ra.left < rb.right - 0.5 && rb.left < ra.right - 0.5 && ra.top < rb.bottom - 0.5 && rb.top < ra.bottom - 0.5) overlaps.push(`${a} × ${b}`)
      }
      return { overlaps, boxes: Object.fromEntries(controls.map(([id, r]) => [id, [Math.round(r.left), Math.round(r.right), Math.round(r.top)]])) }
    })
  }
  await page.setViewportSize(before); await delay(400)
  return result
}
const overlapFindings = (label, result) => Object.entries(result).filter(([, v]) => v.overlaps.length)
  .map(([width, v]) => `${label}: composer footer controls overlap at ${width}px (${v.overlaps.join(', ')})`)
/** Agents page → Run on the named agent → New chat for it. */
const newChatFor = async (page, name) => {
  await page.goto(`${frontUrl}/agents`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  const card = page.locator('main').getByText(name, { exact: true }).first()
  await card.waitFor({ timeout: 60000 })
  await card.locator('xpath=ancestor::*[.//button[normalize-space()="Run"]][1]').getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await settle(page, 1000)
}
/**
 * REQ-001/REQ-022 (VIS-004/007/009/025/026): inside a settings card (saved-run root card, member rows), the labels
 * and controls of each row never overlap one another and stay inside the card, also with a long model name.
 */
const CARD_WIDTHS = [880, 804, 390]
/** Saved-run settings (UIS-003) are specified at 880 px (VIS-006..009); 804 is checked as the narrow desktop width. */
const SAVED_RUN_WIDTHS = [880, 804]
const cardOverlaps = async (page, cardSelector, widths = CARD_WIDTHS) => {
  const before = page.viewportSize()
  const result = {}
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 }); await delay(600)
    result[width] = await page.evaluate((selector) => {
      const card = document.querySelector(selector)
      if (!card) return { missing: true, overlaps: [], outside: [] }
      const cardBox = card.getBoundingClientRect()
      const ids = ['chat-model-trigger', 'chat-thinking-trigger', 'chat-model-option-service_tier', 'chat-approval-toggle', 'chat-workspace-trigger', 'run-setting-locked', 'run-setting-reset', 'run-setting-thinking-unavailable', 'run-setting-model-unavailable']
      const items = []
      for (const row of card.querySelectorAll('[data-state]')) {
        const label = row.firstElementChild
        if (label) items.push({ name: `${row.getAttribute('data-test')}:label`, el: label })
        for (const id of ids) row.querySelectorAll(`[data-test="${id}"]`).forEach((el) => items.push({ name: `${row.getAttribute('data-test')}:${id}`, el }))
      }
      const boxes = items.map((it) => ({ ...it, r: it.el.getBoundingClientRect() })).filter((it) => it.r.width > 0)
      const overlaps = []
      for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i], b = boxes[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        if (a.r.left < b.r.right - 0.5 && b.r.left < a.r.right - 0.5 && a.r.top < b.r.bottom - 0.5 && b.r.top < a.r.bottom - 0.5) overlaps.push(`${a.name} × ${b.name}`)
      }
      const outside = boxes.filter((it) => it.r.right > cardBox.right + 0.5 || it.r.left < cardBox.left - 0.5).map((it) => `${it.name} [${Math.round(it.r.left)}–${Math.round(it.r.right)} vs card ${Math.round(cardBox.left)}–${Math.round(cardBox.right)}; text "${(it.el.innerText || '').trim().slice(0, 40)}"]`)
      return { overlaps, outside, rows: card.querySelectorAll('[data-state]').length }
    }, cardSelector)
  }
  await page.setViewportSize(before); await delay(400)
  return result
}
const cardFindings = (label, result) => Object.entries(result).flatMap(([width, v]) => [
  ...(v.missing ? [`${label}: card not found at ${width}px`] : []),
  ...(v.overlaps.length ? [`${label}: controls overlap at ${width}px (${v.overlaps.join(', ')})`] : []),
  ...(v.outside.length ? [`${label}: controls leave the card at ${width}px (${v.outside.join(', ')})`] : []),
])
const fastChip = (scope) => scope.locator(sel('chat-model-option-service_tier')).first()
const thinkingLabel = (scope) => scope.locator(sel('chat-thinking-trigger')).first().innerText()
const openDrawer = async (page) => {
  await page.locator(sel('run-members-open')).click()
  const drawer = page.locator(sel('run-member-settings-drawer')); await drawer.waitFor(); await delay(400)
  return drawer
}
const memberRow = (root, address) => root.locator(sel(`run-member-${address}`)).first()
const openMember = async (page, root, address) => {
  const row = memberRow(root, address)
  if (await row.locator(sel('run-member-toggle')).first().getAttribute('aria-expanded') !== 'true') await row.locator(sel('run-member-toggle')).first().click()
  await row.locator(sel('run-member-detail')).waitFor(); await delay(300)
  return row
}
const teamRunIds = async (teamDefinitionId) => {
  const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
  return h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).filter((t) => t.teamDefinitionId === teamDefinitionId).flatMap((t) => t.runs.map((x) => x.teamRunId))
}
const teamConfig = async (teamRunId) => (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive executionTree modelConfigEditability{editable reason}}}', { id: teamRunId })).getTeamRunResumeConfig
const agentConfig = async (runId) => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive metadataConfig{agentDefinitionId workspaceRootPath llmModelIdentifier llmConfig autoExecuteTools runtimeKind}}}', { id: runId })).getAgentRunResumeConfig
const orgConfig = async (orgRunId) => (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){orgRunId executionTree isActive editability{editable reason}}}', { id: orgRunId })).getAgentOrgRunConfig
const agentRootView = async (runId) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId })).agentRunCollaboration?.root_agent ?? null
const membersByAddress = (teamNode) => Object.fromEntries((teamNode.members ?? []).map((m) => [m.address, m.launch_configuration ?? m.launchConfiguration ?? m.default_launch_configuration ?? m.defaultLaunchConfiguration]))
const lc = (c) => ({ runtime: c?.runtime_kind ?? c?.runtimeKind, model: c?.llm_model_identifier ?? c?.llmModelIdentifier, llmConfig: c?.llm_config ?? c?.llmConfig ?? null, auto: c?.auto_execute_tools ?? c?.autoExecuteTools, workspace: c?.workspace_root_path ?? c?.workspaceRootPath })

const expandWorkspaces = async (page) => {
  const folders = page.locator(sel('workspace-row'))
  for (let i = 0; i < await folders.count(); i += 1) {
    const row = folders.nth(i)
    const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
    if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
  }
}
const openTeamRun = async (page, teamRunId) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const row = page.locator(sel(`workspace-team-row-${teamRunId}`))
  if (!(await row.isVisible().catch(() => false))) { await page.getByText('Temp Workspace', { exact: true }).first().click(); await delay(800) }
  if (!(await row.isVisible().catch(() => false))) { await page.locator(sel(`workspace-team-definition-row-${ids.docsTeam}`)).first().click(); await delay(800) }
  await row.click(); await delay(2500)
}
const openOrgRun = async (page, orgRunId) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const group = page.locator(sel(`agent-org-definition-${ids.org}`))
  await waitFor('Org group', async () => {
    if (await group.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    return group.isVisible().catch(() => false)
  }, 60000, 1500)
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  await page.locator(sel(`agent-org-run-open-${orgRunId}`)).click(); await delay(2500)
}

// ---------------------------------------------------------------------------------------------
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('R01', 'S1 AC-004/006/019: Team Run → New chat; drafter customized (a Codex Fast-mode model, Fast on, Ask first) → the created team run applies it to that member only', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-teams`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Run', exact: true }).first().waitFor({ timeout: 120000 })
  await page.getByRole('button', { name: 'Run', exact: true }).first().click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await settle(page, 1500)
  r.heading = await page.locator(sel('run-target-name')).innerText()
  assert(r.heading === 'Docs Team', 'New chat heading is not the team', r.heading)
  await chooseModel(page, page.locator(sel('chat-composer')), ROOT.runtime, ROOT.model)
  r.lineDefault = await page.locator(sel('run-members-line-text')).innerText()
  assert(/All 3 members use these settings/.test(r.lineDefault), 'members line (default)', r.lineDefault)
  await shot(page, 'VIS-002-new-chat-team-members-line-804', 804)
  await shot(page, 'VIS-010-new-chat-team-390', 390)
  const drawer = await openDrawer(page)
  r.drawerFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
  const drafter = await openMember(page, drawer, '/drafter')
  FAST.model = await chooseModel(page, drafter, FAST.runtime, FAST.model ?? FAST.candidates)
  r.thinkingBeforeFast = await thinkingLabel(drafter)
  await fastChip(drafter).click(); await delay(300)
  r.fastPressed = await fastChip(drafter).getAttribute('aria-pressed')
  r.thinkingAfterFast = await thinkingLabel(drafter)
  assert(r.fastPressed === 'true' && r.thinkingAfterFast === r.thinkingBeforeFast, 'member Fast toggle changed Thinking or did not turn on', r)
  await drafter.locator(sel('chat-approval-toggle')).click(); await delay(300)
  r.summary = await drafter.locator(sel('run-member-summary')).innerText()
  assert(/Customized/.test(r.summary) && /Codex/.test(r.summary) && /Fast/.test(r.summary) && /Ask first/.test(r.summary), 'member summary', r.summary)
  r.others = [await memberRow(drawer, '/planner').getAttribute('data-customized'), await memberRow(drawer, '/checker').getAttribute('data-customized')]
  assert(r.others.every((x) => x === 'false'), 'uncustomized members marked customized', r.others)
  r.drawerCard = await cardOverlaps(page, `${sel('run-member-settings-drawer')} ${sel('run-settings-card-/drafter')}`)
  const drawerFindings = cardFindings('Member drawer row with a long Codex model', r.drawerCard)
  assert(drawerFindings.length === 0, drawerFindings.join('; '), r)
  await shot(page, 'VIS-024-member-fast-mode-customized-804', 804)
  await shot(page, 'VIS-004-member-panel-team-customized-880', 880)
  await shot(page, 'VIS-011-member-panel-team-390', 390)
  await drawer.locator(sel('run-member-settings-done')).click(); await delay(500)
  r.lineCustomized = (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' ')
  assert(/1 of 3 customized/.test(r.lineCustomized), 'members line (customized)', r.lineCustomized)
  await shot(page, 'VIS-003-new-chat-team-members-customized-line-804', 804)
  const before = new Set(await teamRunIds(ids.docsTeam))
  await composerInput(page).click(); await page.keyboard.type('Say hello in one short sentence.')
  await page.locator(sel('chat-primary-action')).click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  state.teamRunId = r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(ids.docsTeam)).find((id) => !before.has(id)), 60000)
  const cfg = await teamConfig(state.teamRunId)
  const members = membersByAddress(cfg.executionTree.root_team)
  r.members = Object.fromEntries(Object.entries(members).map(([k, v]) => [k, lc(v)]))
  const d = r.members['/drafter']; const p = r.members['/planner']; const c = r.members['/checker']
  assert(d.runtime === FAST.runtime && d.model === FAST.model && d.llmConfig?.service_tier === 'fast' && d.auto === false, 'drafter override not applied (Codex, Fast, Ask first)', r.members)
  assert([p, c].every((m) => m.runtime === ROOT.runtime && m.model === ROOT.model && m.auto === true && !m.llmConfig?.service_tier), 'uncustomized members do not inherit the team settings', r.members)
  await shot(page, 'VIS-019-team-run-first-message-1512')
  return r
})

defineCase('R11', 'S1 DI-001: the Chat nav and the "new chat" pencil open a fresh plain New chat (Daily Assistant, empty composer)', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-teams`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel('app-left-panel-primary-nav')).getByText('Chat', { exact: true }).click()
  await page.waitForURL(/\/chat(\?|$)/, { timeout: 60000 }); await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page)
  r.navHeading = await page.locator(sel('run-target-name')).innerText()
  assert(r.navHeading === 'Daily Assistant', 'Chat nav did not open a plain New chat', r.navHeading)
  await shot(page, 'VIS-001-new-chat-daily-assistant-804', 804)
  // Retarget to the team and type, then the pencil starts over.
  await page.locator(sel('run-target-switcher-trigger')).click()
  await page.locator(sel('run-target-switcher-menu')).waitFor()
  await shot(page, 'VIS-016-new-chat-target-switcher-804', 804)
  await page.locator(sel('run-target-switcher-search')).fill('docs')
  await page.locator(sel(`run-target-switcher-option-${ids.docsTeam}`)).click(); await settle(page)
  await composerInput(page).click(); await page.keyboard.type('draft text')
  r.retargeted = await page.locator(sel('run-target-name')).innerText()
  await page.locator(sel('app-left-panel-new-chat')).click(); await settle(page, 1000)
  r.pencilHeading = await page.locator(sel('run-target-name')).innerText()
  r.pencilText = await composerInput(page).inputValue()
  r.pencilMembersLine = await page.locator(sel('run-members-line')).count()
  assert(r.retargeted === 'Docs Team' && r.pencilHeading === 'Daily Assistant' && r.pencilText === '' && r.pencilMembersLine === 0, 'the pencil did not open a fresh New chat', r)
  return r
})

defineCase('R09', 'S5 AC-019: Agent Run → New chat with Codex, Thinking Low and Fast; the two are independent; the run llmConfig is {reasoning_effort: low, service_tier: fast}; a first-send `@Scout` is admitted', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agents`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  const card = page.locator('main').getByText('Planner', { exact: true }).first()
  await card.waitFor({ timeout: 60000 })
  const run = card.locator('xpath=ancestor::*[.//button[normalize-space()="Run"]][1]').getByRole('button', { name: 'Run', exact: true })
  await run.click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await settle(page, 1000)
  r.heading = await page.locator(sel('run-target-name')).innerText()
  assert(r.heading === 'Planner', 'Agent Run did not open New chat for the agent', r.heading)
  const composer = page.locator(sel('chat-composer'))
  FAST.model = await chooseModel(page, composer, FAST.runtime, FAST.model ?? FAST.candidates)
  r.fastInitially = await fastChip(composer).getAttribute('aria-pressed')
  assert(r.fastInitially === 'false', 'Fast mode on by default', r.fastInitially)
  await shot(page, 'VIS-020-new-chat-codex-fast-off-804', 804)
  await chooseThinking(page, composer, 'low')
  r.thinking = await thinkingLabel(composer)
  await fastChip(composer).click(); await delay(300)
  r.thinkingAfterFastOn = await thinkingLabel(composer)
  await fastChip(composer).click(); await delay(300)
  r.thinkingAfterFastOff = await thinkingLabel(composer)
  await fastChip(composer).click(); await delay(300)
  r.fastFinal = await fastChip(composer).getAttribute('aria-pressed')
  assert(/low/i.test(r.thinking) && r.thinkingAfterFastOn === r.thinking && r.thinkingAfterFastOff === r.thinking && r.fastFinal === 'true', 'Fast toggles changed Thinking', r)
  await chooseThinking(page, composer, 'medium'); await chooseThinking(page, composer, 'low')
  r.fastAfterThinkingChange = await fastChip(composer).getAttribute('aria-pressed')
  assert(r.fastAfterThinkingChange === 'true', 'a Thinking change reset Fast', r)
  await shot(page, 'VIS-021-new-chat-codex-fast-on-804', 804)
  await shot(page, 'VIS-027-new-chat-fast-on-390', 390)
  const input = composerInput(page)
  await input.click(); await page.keyboard.type('please greet @')
  await page.locator(sel('run-mention-menu')).waitFor({ timeout: 30000 })
  await shot(page, 'VIS-030-new-chat-at-menu-804', 804)
  await page.keyboard.type('scout'); await page.locator(sel(`run-mention-option-${ids.scout}`)).click()
  await page.keyboard.type('in one short sentence.')
  await page.locator(sel('chat-primary-action')).click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  state.agentRunId = r.runId = new URL(page.url()).searchParams.get('id')
  const cfg = await agentConfig(state.agentRunId)
  r.metadata = cfg.metadataConfig
  assert(r.metadata.runtimeKind === FAST.runtime && r.metadata.llmModelIdentifier === FAST.model, 'agent run model', r.metadata)
  assert(r.metadata.llmConfig?.service_tier === 'fast' && r.metadata.llmConfig?.reasoning_effort === 'low', 'agent run llmConfig must keep both Thinking Low and Fast', r.metadata)
  const view = await waitFor('Scout admitted', async () => { const v = await agentRootView(state.agentRunId); return (v?.execution_tree?.collaborators ?? []).length ? v : null }, 120000)
  r.collaborator = view.execution_tree.collaborators.map((c) => ({ kind: c.kind, address: c.address, runId: c.agentRunId, launch: c.launchConfiguration }))
  state.scoutRunId = r.collaborator[0].runId
  return r
})

defineCase('R12', 'S6 REQ-001/022 (VIS-020/021/027): New chat with a Codex model (long display name), Thinking and Fast on — the footer controls never overlap at 1512/880/804/390', async (page) => {
  const r = {}
  await newChatFor(page, 'Planner')
  const composer = page.locator(sel('chat-composer'))
  r.model = await chooseModel(page, composer, FAST.runtime, FAST.model ?? FAST.candidates)
  await fastChip(composer).click(); await delay(300)
  r.modelLabel = (await composer.locator(sel('chat-model-trigger')).innerText()).replace(/\s+/g, ' ')
  r.footer = await footerOverlaps(page)
  await shot(page, 'R12-footer-804', 804)
  await shot(page, 'R12-footer-880', 880)
  const findings = overlapFindings('New chat with a Codex model, Thinking and Fast', r.footer)
  assert(findings.length === 0, findings.join('; '), r)
  return r
})

defineCase('R13', 'S6 AC-017 / UIS-004 / REQ-022 (VIS-017, VIS-023, VIS-014): start-surface tools open docked; the Org card shows the "Fast mode" row for a Codex model; an unknown Org shows the unavailable state', async (page) => {
  const r = {}
  // VIS-017 / AC-017: "Show tools" docks the right tools beside New chat; closing restores the icon.
  await newChatFor(page, 'Planner')
  r.toolsClosed = await page.locator(sel('right-side-tab-list')).isVisible().catch(() => false)
  await page.locator(sel('start-surface-tools-toggle')).click(); await delay(800)
  r.toolsTabs = await page.locator(`${sel('right-side-tab-list')} [role="tab"]`).evaluateAll((els) => els.map((e) => e.innerText.trim()))
  await shot(page, 'VIS-017-new-chat-tools-open-1512')
  assert(!r.toolsClosed && r.toolsTabs.includes('Files') && r.toolsTabs.includes('Terminal'), 'Start-surface tools did not open with Files/Terminal', r)
  await page.locator(sel('right-side-panel-toggle')).click().catch(() => {}); await delay(600)
  r.toggleBack = await page.locator(sel('start-surface-tools-toggle')).isVisible().catch(() => false)
  // VIS-023: the Org card's "Fast mode" row for a Codex model.
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.org}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2000)
  const card = page.locator(sel('org-launch-card'))
  await chooseModel(page, card, FAST.runtime, FAST.model ?? FAST.candidates)
  r.fastRow = (await card.locator(sel('run-setting-option-service_tier')).innerText().catch(() => '')).replace(/\s+/g, ' ')
  await shot(page, 'VIS-023-org-launch-fast-mode-row-804', 804)
  await shot(page, 'VIS-028-org-launch-fast-mode-390', 390)
  assert(/Fast mode/.test(r.fastRow) && /Fast/.test(r.fastRow), 'Org card has no "Fast mode" row for a Codex model', r)
  r.orgCard = await cardOverlaps(page, sel('run-settings-card-org-launch'))
  const findings = cardFindings('Org card with a long Codex model', r.orgCard)
  // VIS-014: an Org that does not exist.
  await page.goto(`${frontUrl}/workspace?rootSubjectKind=agent_org&definitionId=missing-org-probe&mode=configuration`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('org-launch-unavailable')).waitFor({ timeout: 120000 })
  r.unavailable = (await page.locator(sel('org-launch-unavailable')).innerText()).replace(/\s+/g, ' ')
  // The spec's VIS-014 shows a known Org's name; an unknown/deleted Org has no name to show (observation only).
  r.unavailableHeading = (await page.locator(sel('run-target-name')).innerText().catch(() => '')).trim()
  if (!r.unavailableHeading) note('R13 observation: the unavailable Org page shows an empty heading switcher (no name, chevron only) for an unknown/deleted Org')
  await shot(page, 'VIS-014-org-launch-unavailable-1512')
  assert(/This Agent Org isn.t available\. Choose another Agent Org\./.test(r.unavailable) && /Back to Agent Orgs/.test(r.unavailable), 'Org unavailable copy', r)
  assert(findings.length === 0, findings.join('; '), r)
  return r
})

defineCase('R04', 'S1 AC-008 / SR-009: Agent "+" from the host run and from its `@` collaborator view → New chat for the agent on screen, prefilled', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/chat?id=${state.agentRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 2000)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 1500)
  const composer = page.locator(sel('chat-composer'))
  const findings = []
  // Presentation of the copied settings (VIS-042): give the catalog time to load before judging.
  const chipsShown = await waitFor('copied Thinking and Fast chips', async () => (await composer.locator(sel('chat-thinking-trigger')).count()) > 0
    && (await composer.locator(sel('chat-model-option-service_tier')).count()) > 0, 30000, 1000).catch(() => false)
  r.host = {
    heading: await page.locator(sel('run-target-name')).innerText(),
    model: (await composer.locator(sel('chat-model-trigger')).innerText()).replace(/\s+/g, ' '),
    thinking: (await composer.locator(sel('chat-thinking-trigger')).count()) ? await thinkingLabel(composer) : null,
    fast: (await composer.locator(sel('chat-model-option-service_tier')).count()) ? await fastChip(composer).getAttribute('aria-pressed') : null,
    approval: await composer.locator(sel('chat-approval-toggle')).innerText(),
    chipsShown: Boolean(chipsShown),
  }
  await shot(page, 'VIS-042-new-chat-prefilled-from-agent-run-804', 804)
  r.footer = await footerOverlaps(page)
  findings.push(...overlapFindings('host "+" New chat', r.footer))
  if (!(r.host.heading === 'Planner' && /Codex/.test(r.host.model) && /Auto-approve/.test(r.host.approval))) findings.push('host "+": heading, runtime or approval not copied')
  if (!(r.host.thinking && /low/i.test(r.host.thinking) && r.host.fast === 'true')) findings.push(`host "+": the copied Thinking/Fast is not shown (thinking=${r.host.thinking}, fast=${r.host.fast}, model label "${r.host.model}")`)
  // What the copy actually launches: send it and read the new run's config back.
  await composerInput(page).click(); await page.keyboard.type('Say ok in one short sentence.')
  await page.locator(sel('chat-primary-action')).click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()) && !u.toString().includes(state.agentRunId), { timeout: 180000 })
  r.copyRunId = new URL(page.url()).searchParams.get('id')
  r.copyRunConfig = (await agentConfig(r.copyRunId)).metadataConfig
  if (!(r.copyRunConfig.runtimeKind === FAST.runtime && r.copyRunConfig.llmModelIdentifier === FAST.model && r.copyRunConfig.llmConfig?.service_tier === 'fast' && r.copyRunConfig.llmConfig?.reasoning_effort === 'low')) findings.push('host "+": the launched copy does not carry the model config (Thinking low + Fast)')
  // The `@` collaborator (Scout) view in the host run.
  await page.goto(`${frontUrl}/chat?id=${state.agentRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 2000)
  const childRow = page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${state.agentRunId}"] ~ ${sel('workspace-agent-run-task-tree')} ${sel('workspace-team-transient-execution-row')}`).filter({ hasText: /scout/i }).first()
  await waitFor('collaborator row', async () => {
    if (await childRow.isVisible().catch(() => false)) return true
    const agentRow = page.locator(`${sel('workspace-agent-row')}[data-agent-definition-id="${ids.planner}"]`).first()
    if (await agentRow.isVisible().catch(() => false) && await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click()
    else await expandWorkspaces(page)
    return false
  }, 60000, 1500)
  await childRow.click(); await settle(page, 2500)
  r.childTitle = await page.locator(sel('agent-workspace-title')).innerText()
  assert(/scout/i.test(r.childTitle), 'collaborator view not open', r.childTitle)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 1500)
  r.collaborator = {
    heading: await page.locator(sel('run-target-name')).innerText(),
    model: await composer.locator(sel('chat-model-trigger')).innerText(),
    fast: (await composer.locator(sel('chat-model-option-service_tier')).count()) ? await fastChip(composer).getAttribute('aria-pressed') : null,
  }
  await shot(page, 'R04-collaborator-copy-804', 804)
  const scoutCfg = (await agentConfig(state.scoutRunId).catch(() => null))?.metadataConfig ?? null
  r.scoutServerConfig = scoutCfg
  if (!(r.collaborator.heading === 'Scout' && /Codex/.test(r.collaborator.model))) findings.push('collaborator "+" did not open New chat for the agent on screen')
  r.findings = findings
  assert(findings.length === 0, findings.join('; '), r)
  return r
})

defineCase('R05', 'S1 AC-008: Team "+" → New chat for the team, prefilled with the member override (Codex, Fast, Ask first)', async (page) => {
  const r = {}
  await openTeamRun(page, state.teamRunId)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 2000)
  r.heading = await page.locator(sel('run-target-name')).innerText()
  r.model = await page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).innerText()
  r.line = (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' ')
  const drawer = await openDrawer(page)
  const findings = []
  r.drafter = await waitFor('copied drafter summary shows Fast', async () => { const t = await memberRow(drawer, '/drafter').locator(sel('run-member-summary')).innerText(); return /Fast/.test(t) ? t : null }, 30000, 1000)
    .catch(async () => memberRow(drawer, '/drafter').locator(sel('run-member-summary')).innerText())
  await shot(page, 'R05-team-copy-drawer-804', 804)
  const drafter = await openMember(page, drawer, '/drafter')
  r.drafterFastChip = await fastChip(drafter).getAttribute('aria-pressed').catch(() => null)
  r.drafterSummaryAfterOpen = await drafter.locator(sel('run-member-summary')).innerText()
  if (!(r.heading === 'Docs Team' && /haiku/i.test(r.model) && /1 of 3 customized/.test(r.line))) findings.push('Team "+": root settings or customized count not copied')
  if (!(/Codex/.test(r.drafterSummaryAfterOpen) && /Fast/.test(r.drafterSummaryAfterOpen) && /Ask first/.test(r.drafterSummaryAfterOpen) && r.drafterFastChip === 'true')) findings.push('Team "+": the member override (Codex, Fast, Ask first) was not copied')
  if (!/Fast/.test(r.drafter)) findings.push(`Team "+": the collapsed member summary omits the copied Fast setting until the row is opened ("${r.drafter.replace(/\s+/g, ' ')}")`)
  r.findings = findings
  assert(findings.length === 0, findings.join('; '), r)
  await drawer.locator(sel('run-member-settings-done')).click()
  return r
})

defineCase('R02', 'S2 AC-003: Org Run → Org launch page; Scout customized (Codex + Ask first) and the placed team on a folder → the active Org run config matches', async (page) => {
  const r = {}
  state.orgFolder = path.join(ownedRoot, 'docs-team-folder'); await fs.mkdir(state.orgFolder, { recursive: true })
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.org}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
  r.url = page.url()
  assert(/rootSubjectKind=agent_org/.test(r.url) && /mode=configuration/.test(r.url), 'Org Run route', r.url)
  const card = page.locator(sel('org-launch-card'))
  await chooseModel(page, card, ROOT.runtime, ROOT.model)
  r.approval = await card.locator(sel('chat-approval-toggle')).innerText()
  assert(/Auto-approve/.test(r.approval), 'Org approval default (REQ-021)', r.approval)
  await shot(page, 'VIS-012-org-launch-page-804', 804)
  await shot(page, 'VIS-015-org-launch-page-390', 390)
  const drawer = await openDrawer(page)
  const scout = await openMember(page, drawer, '/scout')
  FAST.model = await chooseModel(page, scout, FAST.runtime, FAST.model ?? FAST.candidates)
  await scout.locator(sel('chat-approval-toggle')).click(); await delay(300)
  const docs = await openMember(page, drawer, '/docs')
  await docs.locator(sel('chat-workspace-trigger')).first().click()
  await page.locator(sel('chat-workspace-open-folder')).click()
  await page.locator(`${sel('chat-workspace-folder-form')} input`).fill(state.orgFolder)
  await page.locator(`${sel('chat-workspace-folder-form')} button[type="submit"]`).click(); await settle(page, 800)
  r.docsSummary = await docs.locator(sel('run-member-summary')).first().innerText()
  r.scoutSummary = await scout.locator(sel('run-member-summary')).innerText()
  assert(/docs-team-folder/.test(r.docsSummary) && /Customized/.test(r.docsSummary), 'placed-team workspace not customized', r)
  r.orgCards = { card: await cardOverlaps(page, sel('run-settings-card-org-launch')), scout: await cardOverlaps(page, `${sel('run-member-settings-drawer')} ${sel('run-settings-card-/scout')}`) }
  const orgFindings = [...cardFindings('Org launch card', r.orgCards.card), ...cardFindings('Org drawer member row with a long Codex model', r.orgCards.scout)]
  assert(orgFindings.length === 0, orgFindings.join('; '), r)
  await shot(page, 'VIS-005-member-panel-org-launch-804', 804)
  await drawer.locator(sel('run-member-settings-done')).click(); await delay(400)
  r.line = (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' ')
  await page.locator(sel('org-launch-run')).click()
  await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 3000)
  r.activeUrl = page.url()
  const params = new URL(r.activeUrl).searchParams
  state.orgRunId = r.orgRunId = params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
  assert(state.orgRunId, 'no Org run id in the active route', r.activeUrl)
  const cfg = await orgConfig(state.orgRunId)
  r.isActive = cfg.isActive
  r.tree = cfg.executionTree
  const root = cfg.executionTree.root_org ?? cfg.executionTree.rootOrg ?? cfg.executionTree
  r.rootLaunch = lc(root.default_launch_configuration ?? root.defaultLaunchConfiguration)
  const scoutNode = (root.members ?? []).find((m) => /scout/.test(m.address ?? ''))
  const docsNode = (root.members ?? []).find((m) => /docs/.test(m.address ?? ''))
  r.scoutLaunch = lc(scoutNode?.launch_configuration ?? scoutNode?.launchConfiguration)
  r.docsLaunch = lc(docsNode?.default_launch_configuration ?? docsNode?.launch_configuration ?? docsNode?.defaultLaunchConfiguration)
  r.docsMembers = Object.fromEntries(Object.entries(membersByAddress(docsNode ?? {})).map(([k, v]) => [k, lc(v)]))
  assert(r.rootLaunch.runtime === ROOT.runtime && r.rootLaunch.model === ROOT.model && r.rootLaunch.auto === true, 'Org root launch config', r)
  assert(r.scoutLaunch.runtime === FAST.runtime && r.scoutLaunch.model === FAST.model && r.scoutLaunch.auto === false, 'Scout override not applied', r)
  assert(r.docsLaunch.workspace === state.orgFolder, 'placed-team workspace not applied', r)
  assert(Object.values(r.docsMembers).every((m) => m.runtime === ROOT.runtime && m.model === ROOT.model && m.workspace === state.orgFolder), 'placed-team members do not inherit', r)
  await shot(page, 'VIS-018-org-run-after-run-1512')
  return r
})

defineCase('R03', 'S2 AC-003: the server rejects the Org launch (its member definition was deleted meanwhile) → "Couldn\'t start this Agent Org. Try again.", values kept, Run enabled, no run created', async (page) => {
  const r = {}
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
  await page.locator(sel(`org-card-${ids.fragileOrg}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
  const card = page.locator(sel('org-launch-card'))
  await chooseModel(page, card, ROOT.runtime, ROOT.other)
  await card.locator(sel('chat-approval-toggle')).click(); await delay(300)
  r.before = { model: await card.locator(sel('chat-model-trigger')).innerText(), approval: await card.locator(sel('chat-approval-toggle')).innerText() }
  const orgRunsBefore = JSON.stringify(await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { workspaceRootPath } }')).length
  await gql('mutation($id:String!){deleteAgentDefinition(id:$id){success message}}', { id: ids.fragile })
  await page.locator(sel('org-launch-run')).click()
  r.status = await waitFor('failure copy', async () => { const t = await page.locator(sel('org-launch-status')).innerText().catch(() => ''); return /Couldn.t start this Agent Org/.test(t) ? t : null }, 60000)
  r.after = { model: await card.locator(sel('chat-model-trigger')).innerText(), approval: await card.locator(sel('chat-approval-toggle')).innerText(), url: page.url(), runDisabled: await page.locator(sel('org-launch-run')).isDisabled() }
  assert(r.status.trim() === "Couldn't start this Agent Org. Try again.", 'failure copy', r.status)
  assert(r.after.model === r.before.model && r.after.approval === r.before.approval && /mode=configuration/.test(r.after.url) && !r.after.runDisabled, 'values not kept or Run disabled after the failure', r)
  r.historyUnchanged = JSON.stringify(await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { workspaceRootPath } }')).length === orgRunsBefore
  await shot(page, 'VIS-013-org-launch-failed-1512')
  return r
})

defineCase('R06', 'S2 AC-008: Org "+" → the Org launch page prefilled from the run: Scout override and the placed-team workspace', async (page) => {
  const r = {}
  await openOrgRun(page, state.orgRunId)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /scout/i }).first().click(); await settle(page, 2500)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 60000 })
  await waitFor('copy finished', async () => !(await page.locator(sel('org-launch-run')).isDisabled()), 60000)
  await settle(page, 1000)
  r.url = page.url()
  assert(/sourceOrgRunId=/.test(r.url), 'Org "+" route has no sourceOrgRunId', r.url)
  r.model = await page.locator(`${sel('org-launch-card')} ${sel('chat-model-trigger')}`).innerText()
  r.line = (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' ')
  const drawer = await openDrawer(page)
  r.scout = await memberRow(drawer, '/scout').locator(sel('run-member-summary')).innerText()
  r.docs = await memberRow(drawer, '/docs').locator(sel('run-member-summary')).first().innerText()
  await shot(page, 'VIS-033-org-launch-prefilled-from-run-804', 804)
  assert(/haiku/i.test(r.model) && /Codex/.test(r.scout) && /Ask first/.test(r.scout) && /docs-team-folder/.test(r.docs), 'Org "+" did not copy the overrides', r)
  await drawer.locator(sel('run-member-settings-done')).click()
  return r
})

defineCase('R07', 'S3 AC-009..011/019: saved Team run: running locks incl. Fast → Terminate team → Stopped; locked-runtime model menu; change → Cancel restores; change → Save; readback; resume keeps the saved config', async (page) => {
  const r = {}
  await openTeamRun(page, state.teamRunId)
  await page.locator(sel('workspace-header-edit-config')).click()
  const view = page.locator(sel('existing-run-settings')); await view.waitFor({ timeout: 60000 }); await settle(page, 2000)
  r.status = await view.locator(sel('run-subject-status')).innerText()
  r.stopLabel = await view.locator(sel('existing-run-stop')).getAttribute('aria-label')
  r.rootLocked = await view.locator(`${sel('existing-run-root-card')} ${sel('run-setting-locked')}`).count()
  const drafter = await openMember(page, view, '/drafter')
  await waitFor('drafter Fast row', async () => (await drafter.locator(sel('run-setting-option-service_tier')).count()) > 0, 30000)
  r.drafterFastRunning = (await drafter.locator(sel('run-setting-option-service_tier')).innerText()).replace(/\s+/g, ' ')
  r.drafterFastLocked = await drafter.locator(`${sel('run-setting-option-service_tier')} ${sel('run-setting-locked')}`).count()
  assert(/Running/.test(r.status) && /Terminate team/.test(r.stopLabel ?? '') && r.rootLocked >= 3 && r.drafterFastLocked === 1 && /Fast/.test(r.drafterFastRunning), 'running saved-run presentation (locks, stop label, Fast locked)', r)
  // UIS-003 is specified at 880 px (VIS-006..009); the spec's phone matrix does not cover saved-run settings, so
  // 390 px is recorded as an observation rather than asserted.
  r.runningCards = { root: await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-root')}`, SAVED_RUN_WIDTHS), drafter: await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-/drafter')}`, SAVED_RUN_WIDTHS) }
  r.runningCards390 = [...cardFindings('Saved run (running) root card', await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-root')}`, [390])), ...cardFindings('Saved run (running) member card', await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-/drafter')}`, [390]))]
  if (r.runningCards390.length) note(`R07 observation (outside the spec's responsive matrix): ${r.runningCards390.join('; ')}`)
  await shot(page, 'R07-saved-run-running-long-model-390', 390)
  const runningFindings = [...cardFindings('Saved run (running) root card', r.runningCards.root), ...cardFindings('Saved run (running) member card with a long Codex model', r.runningCards.drafter)]
  assert(runningFindings.length === 0, runningFindings.join('; '), r)
  await shot(page, 'VIS-006-saved-team-running-stop-880', 880)
  await shot(page, 'VIS-025-saved-run-running-fast-locked-880', 880)
  await view.locator(sel('existing-run-stop')).click()
  await waitFor('Stopped', async () => /Stopped/.test(await view.locator(sel('run-subject-status')).innerText()), 120000, 1000)
  await waitFor('model editable', async () => (await view.locator(`${sel('existing-run-root-card')} ${sel('chat-model-trigger')}`).count()) > 0, 60000, 1000)
  r.stoppedServer = (await teamConfig(state.teamRunId)).isActive
  // The locked-runtime model menu.
  const rootCard = view.locator(sel('existing-run-root-card'))
  await rootCard.locator(sel('chat-model-trigger')).click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  r.lockedRuntime = await page.locator(sel('chat-model-locked-runtime')).innerText().catch(() => null)
  r.menuRuntimeRows = await page.locator('[data-test^="chat-runtime-"]').count()
  await waitFor('locked menu rows', async () => (await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).count()) > 0, 60000)
  r.menuModels = await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const options = (await gql('query($id:String!){teamRunModelOptions(teamRunId:$id){scopeKind scopeAddress currentModelIdentifier replacements{llmModelIdentifier}}}', { id: state.teamRunId })).teamRunModelOptions
  const rootScope = options.find((o) => o.scopeAddress === '/' || o.scopeKind === 'TEAM' || o.scopeKind === 'team') ?? options[0]
  r.serverScopes = options.map((o) => ({ kind: o.scopeKind, address: o.scopeAddress, current: o.currentModelIdentifier, replacements: o.replacements.length }))
  const allowed = new Set([rootScope.currentModelIdentifier, ...rootScope.replacements.map((m) => m.llmModelIdentifier)])
  const codexIds = new Set(FAST.candidates)
  assert(r.lockedRuntime && /Claude/.test(r.lockedRuntime) && r.menuRuntimeRows === 0 && r.menuModels.length > 0 && r.menuModels.every((m) => allowed.has(m) && !codexIds.has(m)), 'locked-runtime model menu must list only the allowed replacements of the run runtime', { ...r, allowed: [...allowed] })
  state.otherModel = r.menuModels.find((m) => m !== rootScope.currentModelIdentifier && /sonnet/.test(m)) ?? r.menuModels.find((m) => m !== rootScope.currentModelIdentifier)
  r.otherModel = state.otherModel
  await shot(page, 'VIS-008-saved-run-model-menu-locked-runtime-880', 880)
  await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}${sel(`chat-model-option-${state.otherModel}`)}`).first().click(); await settle(page, 600)
  r.saveBar = await view.locator(sel('existing-run-save-bar')).innerText()
  r.plannerFollows = await memberRow(view, '/planner').locator(sel('run-member-summary')).innerText()
  r.otherLabel = await rootCard.locator(sel('chat-model-trigger')).innerText()
  assert(/Unsaved changes/.test(r.saveBar) && r.plannerFollows.includes(r.otherLabel.split('\n')[0]), 'unsaved state or member follow', r)
  await shot(page, 'VIS-007-saved-team-stopped-unsaved-880', 880)
  await view.locator(sel('existing-run-cancel')).click(); await settle(page, 600)
  r.afterCancel = { model: await rootCard.locator(sel('chat-model-trigger')).innerText(), saveBar: await view.locator(sel('existing-run-save-bar')).count() }
  assert(/haiku/i.test(r.afterCancel.model) && r.afterCancel.saveBar === 0, 'Cancel did not restore the saved values', r.afterCancel)
  await chooseModel(page, rootCard, null, state.otherModel)
  const drafterStopped = await openMember(page, view, '/drafter')
  await chooseThinking(page, drafterStopped, 'low')
  r.drafterFastStopped = await fastChip(drafterStopped).getAttribute('aria-pressed')
  assert(r.drafterFastStopped === 'true', 'saved-run Thinking change reset Fast', r)
  r.stoppedCards = { root: await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-root')}`, SAVED_RUN_WIDTHS), drafter: await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-/drafter')}`, SAVED_RUN_WIDTHS) }
  r.stoppedCards390 = [...cardFindings('Saved run (stopped) root card', await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-root')}`, [390])), ...cardFindings('Saved run (stopped) member card', await cardOverlaps(page, `${sel('existing-run-settings')} ${sel('run-settings-card-/drafter')}`, [390]))]
  if (r.stoppedCards390.length) note(`R07 observation (outside the spec's responsive matrix): ${r.stoppedCards390.join('; ')}`)
  const stoppedFindings = [...cardFindings('Saved run (stopped, editable) root card', r.stoppedCards.root), ...cardFindings('Saved run (stopped, editable) member card with a long Codex model', r.stoppedCards.drafter)]
  assert(stoppedFindings.length === 0, stoppedFindings.join('; '), r)
  await shot(page, 'VIS-026-saved-run-stopped-fast-editable-880', 880)
  await shot(page, 'R07-saved-run-long-model-390', 390)
  await view.locator(sel('save-existing-model-config')).click()
  r.saved = await waitFor('Saved feedback', async () => { const t = await view.locator(sel('existing-run-save-bar')).innerText().catch(() => ''); return /Saved\. Changes apply when this run resumes\./.test(t) ? t : null }, 60000)
  const saved = membersByAddress((await teamConfig(state.teamRunId)).executionTree.root_team)
  r.savedMembers = Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, lc(v)]))
  assert(r.savedMembers['/planner'].model === state.otherModel && r.savedMembers['/checker'].model === state.otherModel, 'saved root model not applied to following members', r.savedMembers)
  assert(r.savedMembers['/drafter'].model === FAST.model && r.savedMembers['/drafter'].llmConfig?.reasoning_effort === 'low' && r.savedMembers['/drafter'].llmConfig?.service_tier === 'fast' && r.savedMembers['/drafter'].auto === false, 'saved drafter config (Thinking low, Fast kept, Ask first)', r.savedMembers)
  // Resume: a send to the stopped team restores it with the saved config.
  await openTeamRun(page, state.teamRunId)
  const input = runComposer(page); await input.click(); await page.keyboard.type('Say ok in one short sentence.'); await page.keyboard.press('Enter')
  const resumed = await waitFor('team resumed', async () => { const c = await teamConfig(state.teamRunId); return c.isActive ? c : null }, 180000, 1500)
  r.resumedMembers = Object.fromEntries(Object.entries(membersByAddress(resumed.executionTree.root_team)).map(([k, v]) => [k, lc(v)]))
  assert(JSON.stringify(r.resumedMembers) === JSON.stringify(r.savedMembers), 'resume changed the saved config', { saved: r.savedMembers, resumed: r.resumedMembers })
  return r
})

defineCase('R08', 'S3 AC-009/010: saved Org run: Stop Agent Org → Stopped → change the Org model → Save → readback (placed-team members follow)', async (page) => {
  const r = {}
  await openOrgRun(page, state.orgRunId)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /scout/i }).first().click(); await settle(page, 2500)
  await page.locator(sel('workspace-header-edit-config')).click()
  const view = page.locator(sel('existing-run-settings')); await view.waitFor({ timeout: 60000 }); await settle(page, 2000)
  r.header = await view.locator(sel('run-subject-header')).innerText()
  r.stopLabel = await view.locator(sel('existing-run-stop')).getAttribute('aria-label')
  assert(/Docs Org/.test(r.header) && /Stop Agent Org/.test(r.stopLabel ?? ''), 'saved Org header/stop label', r)
  await view.locator(sel('existing-run-stop')).click()
  await waitFor('Org stopped', async () => /Stopped/.test(await view.locator(sel('run-subject-status')).innerText()), 120000, 1000)
  const rootCard = view.locator(sel('existing-run-root-card'))
  await waitFor('Org model editable', async () => (await rootCard.locator(sel('chat-model-trigger')).count()) > 0, 60000, 1000)
  await shot(page, 'VIS-009-saved-org-run-settings-880', 880)
  await rootCard.locator(sel('chat-model-trigger')).click()
  await waitFor('Org locked menu rows', async () => (await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).count()) > 1, 60000)
  r.orgMenuModels = await page.locator(`${sel('chat-model-menu')} ${MODEL_ROW}`).evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-test').replace('chat-model-option-', ''), checked: e.getAttribute('aria-checked') })))
  r.orgOther = (r.orgMenuModels.find((m) => m.checked !== 'true' && /sonnet/.test(m.id)) ?? r.orgMenuModels.find((m) => m.checked !== 'true')).id
  await page.keyboard.press('Escape'); await delay(300)
  await chooseModel(page, rootCard, null, r.orgOther)
  await view.locator(sel('save-existing-model-config')).click()
  r.saved = await waitFor('Saved feedback', async () => { const t = await view.locator(sel('existing-run-save-bar')).innerText().catch(() => ''); return /Saved\./.test(t) ? t : null }, 60000)
  const cfg = await orgConfig(state.orgRunId)
  const root = cfg.executionTree.root_org ?? cfg.executionTree.rootOrg
  const docsNode = (root.members ?? []).find((m) => /docs/.test(m.address ?? ''))
  const scoutNode = (root.members ?? []).find((m) => /scout/.test(m.address ?? ''))
  r.savedRoot = lc(root.default_launch_configuration ?? root.defaultLaunchConfiguration)
  r.savedScout = lc(scoutNode?.launch_configuration ?? scoutNode?.launchConfiguration)
  r.savedDocsMembers = Object.fromEntries(Object.entries(membersByAddress(docsNode ?? {})).map(([k, v]) => [k, lc(v)]))
  assert(r.savedRoot.model === r.orgOther && Object.values(r.savedDocsMembers).every((m) => m.model === r.orgOther && m.workspace === state.orgFolder), 'saved Org model not applied to the root and the following placed-team members', r)
  assert(r.savedScout.runtime === FAST.runtime && r.savedScout.model === FAST.model && r.savedScout.auto === false, 'the customized Scout did not keep its own settings', r)
  return r
})

defineCase('R10', 'S1/S2 DI-004: with the Codex runtime unavailable, Team "+" and Org "+" copies that keep a Codex member block Send/Run with "Codex is unavailable. Choose another runtime."', async (page) => {
  const r = {}
  evidence.cleanup.push({ pid: backend.pid, stop: await stopOwned(backend), reason: 'R10 restart without Codex' })
  backend = await startBackend('backend-no-codex', { CODEX_APP_SERVER_COMMAND: path.join(ownedRoot, 'missing-codex-app-server') })
  r.codexAvailability = (await gql('query{runtimeAvailability(runtimeKind:"codex_app_server"){enabled reason}}')).runtimeAvailability
  assert(r.codexAvailability.enabled === false, 'Codex still available after restart', r.codexAvailability)
  const findings = []
  const blockedReason = /is unavailable\. Choose another runtime\./
  await openTeamRun(page, state.teamRunId)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await settle(page, 2500)
  await composerInput(page).click(); await page.keyboard.type('hello')
  const send = page.locator(sel('chat-primary-action'))
  const sendState = async () => ({ disabled: await send.isDisabled(), label: await send.getAttribute('aria-label'), title: await send.getAttribute('title') })
  r.team = await waitFor('Team copy blocked', async () => { const st = await sendState(); return st.disabled ? st : null }, 20000, 1000).catch(sendState)
  await shot(page, 'R10-team-copy-codex-member-blocked-804', 804)
  if (!(r.team.disabled && blockedReason.test(`${r.team.label} ${r.team.title}`) && /Codex/.test(`${r.team.label} ${r.team.title}`))) {
    findings.push(`Team "+" with a Codex member on an unavailable runtime is not blocked (Send ${r.team.disabled ? 'disabled' : 'enabled'}, "${r.team.label}")`)
    // Does the rule work once the page has fetched runtime availability (opening the model menu fetches it)?
    await page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).click(); await delay(2500); await page.keyboard.press('Escape'); await delay(800)
    r.teamAfterMenu = await sendState()
    note(`R10 Team copy after opening the model menu: ${JSON.stringify(r.teamAfterMenu)}`)
  }
  await openOrgRun(page, state.orgRunId)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /scout/i }).first().click(); await settle(page, 2500)
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 60000 })
  const runButton = page.locator(sel('org-launch-run'))
  r.org = await waitFor('Org blocked reason', async () => {
    const status = await page.locator(sel('org-launch-status')).innerText().catch(() => '')
    return blockedReason.test(status) ? { status, disabled: await runButton.isDisabled(), label: await runButton.getAttribute('aria-label') } : null
  }, 30000, 1000).catch(async () => ({ status: await page.locator(sel('org-launch-status')).innerText().catch(() => ''), disabled: await runButton.isDisabled(), label: await runButton.getAttribute('aria-label') }))
  if (!(r.org.disabled && blockedReason.test(r.org.status) && /Codex/.test(r.org.status))) findings.push(`Org "+" with a Codex member on an unavailable runtime is not blocked (${JSON.stringify(r.org)})`)
  r.findings = findings
  await shot(page, 'R10-org-copy-codex-member-blocked-804', 804)
  assert(findings.length === 0, findings.join('; '), r)
  return r
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'run-settings-live-'))
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
  backend = await startBackend('backend')
  await seed()
  evidence.definitions = ids
  const codex = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier configSchema}}}', { r: FAST.runtime })).providerModelCatalogSnapshots.flatMap((x) => x.llmModels)
  FAST.candidates = codex.filter((m) => JSON.stringify(m.configSchema ?? {}).includes('"service_tier"')).map((m) => m.modelIdentifier)
    .sort((a, b) => (a === 'gpt-5.5' ? -1 : b === 'gpt-5.5' ? 1 : 0))
  assert(FAST.candidates.length, 'no Codex model with Fast mode (service_tier) in the catalog; log in to the codex CLI', codex.map((m) => m.modelIdentifier))
  evidence.fastCandidates = FAST.candidates
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  // Warm up Nuxt's dependency optimizer (a cold optimize reload would otherwise disrupt the first journey).
  for (const route of ['/chat', '/agents', '/agent-teams', '/agent-orgs', '/workspace']) {
    await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000)
  }
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' }); await delay(4000)
  browserErrors.length = 0
  const ordered = ORDER.map((id) => cases.find((c) => c.id === id))
  for (const c of ordered) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const missing = (NEEDS[c.id] ?? []).filter((need) => evidence.cases[PRODUCER[need]]?.result !== 'Pass')
    const started = Date.now()
    if (missing.length) {
      evidence.cases[c.id] = { title: c.title, result: 'Blocked', ms: 0, reason: `producer failed: ${missing.map((m) => PRODUCER[m]).join(',')}` }
    } else {
      try {
        const details = await c.fn(page, context)
        evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
      } catch (error) {
        exitCode = 1
        await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`) }).catch(() => {})
        evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      }
    }
    const outcome = evidence.cases[c.id]
    console.log(`${c.id} ${outcome.result} ${c.title}${outcome.error ? ` — ${outcome.error}` : ''}${outcome.reason ? ` — ${outcome.reason}` : ''}`)
    await fs.writeFile(path.join(outDir, 'run-settings-live-evidence.json'), JSON.stringify(evidence, null, 2))
  }
  const results = Object.values(evidence.cases).map((outcome) => outcome.result)
  evidence.summary = { pass: results.filter((x) => x === 'Pass').length, fail: results.filter((x) => x === 'Fail').length, blocked: results.filter((x) => x === 'Blocked').length }
  if (evidence.summary.blocked) exitCode = 1
  console.log(`Summary: ${evidence.summary.pass} Pass, ${evidence.summary.fail} Fail, ${evidence.summary.blocked} Blocked`)
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[run-settings-live] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'run-settings-live-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
