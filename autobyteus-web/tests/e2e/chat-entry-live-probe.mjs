#!/usr/bin/env node
// Live Chat entry probe (ticket chat-interface-entry).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → a real
// runtime. Everything runs in an owned temp data root on free ports with a sanitized environment,
// so a running desktop app or the user's `~/.autobyteus` data is never touched.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome, and a logged-in runtime CLI
// for the selected runtime (default Codex).
//
// Usage: pnpm test:e2e:chat-entry-live [--runtime codex_app_server] [--model gpt-5.5]
//        [--output-dir test-results/chat-entry-live] [--keep] [--cases C01,C04] [--repeat C07=14]
// C14/C15/C20 (workspace skill links) need a workspace-link runtime (Codex, Claude, Grok); leave
// them out of `--cases` for other runtimes. C21/C22 (D-19 banner and duplicate pop-ups) need no model.
// `--owned-codex-home` gives the backend an owned CODEX_HOME (`<owned>/home/.codex`, skills only, no
// credentials) so C22 can check the tier-4 toast; Codex model runs cannot authenticate with it, so
// use it with another runtime (e.g. `--runtime claude_agent_sdk --owned-codex-home --cases C21,C22`).
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
const runtime = arg('runtime', 'codex_app_server')
const preferredModel = arg('model', runtime === 'codex_app_server' ? 'gpt-5.5' : null)
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/chat-entry-live'))
const keep = process.argv.includes('--keep')
const useOwnedCodexHome = process.argv.includes('--owned-codex-home')
// Cases share state produced by earlier cases (the model picked in C03, the tagged run of C04, the
// catalog run of C08, the team run of C10). `--cases` adds the producers a selected case needs, so a
// partial run never fails on a missing prerequisite.
const PRODUCER = { model: 'C03', taggedRunId: 'C04', catalogRunId: 'C08', teamRunId: 'C10' }
const NEEDS = { C04: ['model'], C05: ['taggedRunId'], C06: ['model', 'taggedRunId'], C07: ['model'], C08: ['model'], C09: ['taggedRunId'], C10: ['model'], C11: ['model', 'taggedRunId'], C12: ['model', 'taggedRunId'], C14: ['model'], C15: ['model'], C17: ['taggedRunId', 'teamRunId'], C18: ['model'], C19: ['model', 'taggedRunId', 'catalogRunId'], C20: ['model'], C22: ['model'], C23: ['model'] }
const withPrerequisites = (ids) => {
  const all = new Set(ids)
  for (let grew = true; grew;) {
    grew = false
    for (const id of [...all]) for (const need of NEEDS[id] ?? []) if (!all.has(PRODUCER[need])) { all.add(PRODUCER[need]); grew = true }
  }
  const added = [...all].filter((id) => !ids.includes(id))
  if (added.length) console.log(`[chat-entry-live] --cases: adding prerequisite case(s) ${added.join(', ')}`)
  return [...all]
}
const onlyCases = arg('cases', null) ? withPrerequisites(arg('cases', null).split(',')) : null
// `--repeat C07=14,C04=2` repeats a case N times in the same session (race-sensitive journeys).
const repeats = Object.fromEntries((arg('repeat', '') || '').split(',').filter(Boolean).map((e) => { const [id, n] = e.split('='); return [id, Math.max(1, Number(n) || 1)] }))
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
// Where a runtime links installed skills into the workspace (C04 exposure, C15 shared links).
const SKILL_WORKSPACE_DIR = { codex_app_server: '.codex', claude_agent_sdk: '.claude', grok_build: '.grok' }[runtime] ?? null
// Where a user-owned workspace skill collides with an installed one (C14, D-15 Rule 1). AGY copies
// skills into a per-run capsule but still checks `<workspace>/.agents/skills`.
const USER_SKILL_DIR = SKILL_WORKSPACE_DIR ?? { antigravity_cli: '.agents' }[runtime] ?? null

const evidence = { startedAt: new Date().toISOString(), runtime, cases: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 250) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { last = await fn(); if (last) return last } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}

// A sanitized environment: nothing from a surrounding AutoByteus process leaks into owned processes.
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`))
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

let ownedCodexHome = null
let ownedRoot, dataRoot, backend, frontend, browser, backendPort, frontendPort, backendUrl, frontUrl, dbUrl
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const startBackend = async (label) => {
  const env = { ...baseEnv(), ...(ownedCodexHome ? { CODEX_HOME: ownedCodexHome } : {}), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
  const child = spawnOwned(label, process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor(`${label} health`, async () => { assert(child.exitCode === null, `${label} exited`); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  return child
}

const writeSkill = async (dir, name, description, marker) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nWhen asked, reply with the marker ${marker}.\n`)
}
const writeAgent = async (id, name, skillNames) => {
  const dir = path.join(dataRoot, 'agents', id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${name} probe agent\nrole: Helper\n---\n\nYou are a helper. Follow the user's request exactly and reply briefly.\n`)
  // No `skillScope` on purpose: a pre-existing config must read as CONFIGURED (Directly Usable).
  await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames, inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2))
}

// ---------------------------------------------------------------------------------------------
// Page helpers (selectors are the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const composerInput = (page) => page.locator(`${sel('chat-composer')} textarea`).first()
// After the first message a chat is the product agent run view (D-17, R3).
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const runInput = (page) => page.locator(`${RUN_VIEW} textarea`).first()
const runSend = (page) => page.locator(`${RUN_VIEW} button[aria-label="Send message"]`).first()
const runStatus = async (page) => (await page.locator(`${RUN_VIEW} [title^="Agent Status:"]`).first().innerText()).trim()
const waitForStatus = (page, pattern, timeout = 60000) => page.waitForFunction(({ src }) => new RegExp(src).test(document.querySelector('[data-testid="agent-workspace-surface"] [title^="Agent Status:"]')?.innerText ?? ''), { src: pattern.source }, { timeout })
const openRunSettings = async (page) => { await page.locator(sel('workspace-header-edit-config')).click(); await page.locator(sel('run-config-back-to-events')).waitFor({ timeout: 30000 }) }
const closeRunSettings = async (page) => { await page.locator(sel('run-config-back-to-events')).click(); await page.locator(RUN_VIEW).waitFor({ timeout: 30000 }) }
/** Picks a model in the product run-settings form (SearchableGroupedSelect) by its visible label. */
const pickFormModel = async (page, label) => {
  const trigger = page.locator('main button[aria-haspopup="listbox"]').first()
  await trigger.click()
  const option = page.locator('[role="option"]').filter({ has: page.locator('span.block.truncate', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first()
  await option.click()
}
const selectedRightTab = (page) => page.locator(`${sel('right-side-tab-list')} [aria-selected="true"]`).first().innerText().then((t) => t.trim()).catch(() => null)
/** Waits for an assistant reply containing `marker` (the user message and header also contain the prompt). */
const waitForReply = (page, marker, timeout = 240000) => page.waitForFunction(({ m }) => {
  const root = document.querySelector('[data-testid="agent-workspace-surface"]')
  if (!root) return false
  const nodes = [...root.querySelectorAll('*')].filter((n) => n.children.length === 0 && n.textContent.trim() === m)
  return nodes.length > 0
}, { m: marker }, { timeout })
const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(1000)
}
// Model option rows only (the row's children carry `chat-model-option-label|secondary|recommended`).
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const pickModel = async (page, runtimeKind, model) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
  await page.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const models = await page.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = model && models.includes(model) ? model : models[0]
  const label = await page.locator(`${sel(`chat-model-option-${chosen}`)} ${sel('chat-model-option-label')}`).innerText()
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  return { chosen, models, label }
}
const openFolder = async (page, folder) => {
  await page.locator(sel('chat-workspace-trigger')).click()
  await page.locator(sel('chat-workspace-open-folder')).click()
  const input = page.locator(`${sel('chat-workspace-folder-form')} input`)
  await input.fill(folder)
  await input.press('Enter')
}
const routeRunId = (page) => new URL(page.url()).searchParams.get('id')
const runConfig = async (runId) => (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier llmConfig runtimeKind autoExecuteTools workspaceRootPath} modelConfigEditability{editable reason}}}', { runId })).getAgentRunResumeConfig
const listDir = async (dir) => (await fs.readdir(dir).catch(() => [])).sort()
/** Schema defaults of a model from the runtime catalog (`configSchema`), or null without a schema. */
const schemaDefaultsFor = async (runtimeKind, modelId) => {
  const snapshots = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier configSchema}}}', { r: runtimeKind })).providerModelCatalogSnapshots
  const schema = snapshots.flatMap((s) => s.llmModels).find((m) => m.modelIdentifier === modelId)?.configSchema ?? null
  if (!schema) return null
  const params = schema.parameters ?? Object.entries(schema.properties ?? {}).map(([name, p]) => ({ name, default_value: p.default }))
  const defaults = Object.fromEntries(params.filter((p) => p.default_value !== undefined).map((p) => [p.name, p.default_value]))
  return Object.keys(defaults).length ? defaults : null
}

const state = { model: null, modelLabel: null, models: [], taggedRunId: null, teamRunId: null, catalogRunId: null }
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('C01', 'Fresh data root seeds Daily Assistant (ALL_INSTALLED); pre-existing config reads as CONFIGURED', async () => {
  const { agentDefinitions } = await gql('{ agentDefinitions { id name skillScope skillNames } }')
  const da = agentDefinitions.find((a) => a.id === 'autobyteus-daily-assistant')
  const legacy = agentDefinitions.find((a) => a.id === 'probe-legacy')
  assert(da?.name === 'Daily Assistant' && da.skillScope === 'ALL_INSTALLED', 'Daily Assistant not seeded as ALL_INSTALLED', da)
  assert(legacy?.skillScope === 'CONFIGURED' && legacy.skillNames.join() === 'probe-alpha', 'Legacy config not read as CONFIGURED', legacy)
  const files = await listDir(path.join(dataRoot, 'agents', 'autobyteus-daily-assistant'))
  assert(files.includes('agent.md') && files.includes('agent-config.json'), 'Daily Assistant files missing', files)
  return { da, legacy }
})

defineCase('C02', 'Landing: / → /chat, Chat first with pencil, New chat defaults', async (page) => {
  await page.goto(`${frontUrl}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/chat$/, { timeout: 120000 })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(1500)
  const nav = await page.locator(sel('app-left-panel-primary-nav')).innerText()
  assert(nav.trim().startsWith('Chat'), 'Chat is not the first navigation item', nav)
  assert(await page.locator(sel('app-left-panel-new-chat')).count() === 1, 'New chat pencil missing')
  const workspace = await page.locator(sel('chat-workspace-trigger')).innerText()
  const approval = await page.locator(sel('chat-approval-toggle')).innerText()
  assert(/Temp workspace/.test(workspace) && /Auto-approve/.test(approval), 'New chat defaults wrong', { workspace, approval })
  assert(await page.locator(sel('chat-primary-action')).first().isDisabled(), 'Send enabled on an empty draft')
  await page.screenshot({ path: path.join(outDir, 'C02-new-chat-1440.png') })
  return { nav: nav.split('\n').slice(0, 3), workspace, approval, model: await page.locator(sel('chat-model-trigger')).innerText() }
})

defineCase('C03', 'Menus: model search/runtime rows, thinking, / skills (bundled in, disabled out), @ targets, folder validation', async (page) => {
  await newChat(page)
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel('chat-model-menu')).waitFor()
  await page.locator(sel('chat-model-search')).fill('zzzz-no-model')
  await page.locator(sel('chat-model-search-empty')).waitFor({ timeout: 120000 })
  await page.keyboard.press('Escape')
  const picked = await pickModel(page, runtime, preferredModel)
  state.model = picked.chosen; state.models = picked.models; state.modelLabel = picked.label
  const input = composerInput(page)
  await input.click(); await input.type('/')
  await page.locator(sel('chat-skill-menu')).waitFor()
  const skills = await page.locator('[data-test^="chat-skill-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-option-', '')))
  assert(skills.includes('probe-bundled') && skills.includes('probe-alpha') && !skills.includes('probe-disabled'), '/ list wrong', skills)
  await page.keyboard.press('Escape'); await input.fill('')
  await input.type('@')
  await page.locator(sel('chat-target-menu')).waitFor()
  const targets = await page.locator('[data-test^="chat-target-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-target-option-', '')))
  assert(!targets.includes('autobyteus-daily-assistant') && targets.includes('probe-team') && !targets.includes('probe-org'), '@ list wrong', targets)
  await page.keyboard.press('Escape'); await input.fill('')
  await page.locator(sel('chat-workspace-trigger')).click()
  await page.locator(sel('chat-workspace-open-folder')).click()
  const folderInput = page.locator(`${sel('chat-workspace-folder-form')} input`)
  await folderInput.fill('relative/path'); await folderInput.press('Enter')
  const error = await page.locator(sel('chat-workspace-path-error')).innerText()
  assert(error === 'Enter an absolute folder path.', 'Relative folder not rejected', error)
  return { model: state.model, skills, targets, thinking: await page.locator(sel('chat-thinking-trigger')).count() }
})

defineCase('C04', 'Send with two skill tags: D-13 permanent URL, server content, ALL_INSTALLED exposure, reply, reload chips, last-used model', async (page) => {
  await newChat(page)
  await pickModel(page, runtime, state.model)
  const input = composerInput(page)
  await input.click(); await input.type('/probe-al')
  await page.locator(sel('chat-skill-option-probe-alpha')).waitFor(); await page.keyboard.press('Enter')
  await input.type('/probe-bund'); await page.locator(sel('chat-skill-option-probe-bundled')).click()
  await input.type('Reply with the two markers from these skills, separated by a space, and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = routeRunId(page); state.taggedRunId = runId
  // Links are written one by one; wait for the tagged bundled skill rather than the first entry.
  const exposure = SKILL_WORKSPACE_DIR ? await waitFor('workspace skill exposure', async () => { const l = await listDir(path.join(dataRoot, 'temp_workspace', SKILL_WORKSPACE_DIR, 'skills')); return l.includes('probe-bundled') ? l : null }, 60000).catch(async () => listDir(path.join(dataRoot, 'temp_workspace', SKILL_WORKSPACE_DIR, 'skills'))) : null
  if (exposure) assert(exposure.includes('probe-bundled') && !exposure.includes('probe-disabled'), 'ALL_INSTALLED exposure wrong', exposure)
  await page.waitForFunction(() => /ALPHA-OK/.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? '') && /BUNDLED-OK/.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? ''), null, { timeout: 300000 })
  const projection = (await gql('query($runId:String!){getRunProjection(runId:$runId){conversation}}', { runId })).getRunProjection
  const firstUser = projection.conversation.find((e) => e.role === 'user')?.content
  assert(firstUser?.startsWith('Use these skills for this request: probe-alpha, probe-bundled.\n\nReply with the two markers'), 'Composed content wrong', firstUser)
  const history = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { agentDefinitions { runs { runId summary } } } }')
  const summary = history.listWorkspaceRunHistory.flatMap((w) => w.agentDefinitions).flatMap((a) => a.runs).find((r) => r.runId === runId)?.summary
  assert(summary?.startsWith('Reply with the two markers'), 'History summary is not the user text', summary)
  const selectedRow = await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`).getAttribute('class')
  assert(/bg-indigo-50/.test(selectedRow ?? ''), 'Tree row not selected')
  await page.screenshot({ path: path.join(outDir, 'C04-chat-live-1440.png') })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator(sel('skill-request-chips')).first().waitFor({ timeout: 120000 })
  const chips = await page.locator(sel('skill-request-chips')).first().innerText()
  assert(/\/probe-alpha/.test(chips) && /\/probe-bundled/.test(chips), 'Chips missing after reload', chips)
  await newChat(page)
  // The trigger shows the shared-policy label (D-16), not the raw identifier. On a fresh page the
  // identifier shows until the runtime catalog arrives; record how long that takes.
  const triggerLabel = async () => (await page.locator(sel('chat-model-trigger')).innerText()).split('\n')[0]
  const labelStarted = Date.now()
  const firstSeen = await triggerLabel()
  const settled = await waitFor('last-used trigger label', async () => (await triggerLabel()) === state.modelLabel, 20000, 100).then(() => Date.now() - labelStarted).catch(() => null)
  const trigger = await page.locator(sel('chat-model-trigger')).innerText()
  assert(settled !== null, 'Last-used model not preselected with its policy label', { trigger, expected: state.modelLabel })
  return { runId, exposure, summary, preselected: trigger.replace('\n', ' · '), triggerFirstSeen: firstSeen, triggerSettledAfterMs: settled }
})

defineCase('C05', 'Live run view (D-17): product header and box; ⚙ run settings locked while live (REQ-011 R3, VIS-026)', async (page) => {
  await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await delay(3000)
  const title = await page.locator(sel('agent-workspace-title')).innerText()
  assert(/Reply with the two markers/.test(title), 'Header title is not the run summary', title)
  assert(await page.locator(`${RUN_VIEW} ${sel('chat-model-trigger')}, ${RUN_VIEW} ${sel('chat-composer-footer')}`).count() === 0, 'Chat footer model controls shown after the first message')
  assert(await runInput(page).count() === 1 && await runSend(page).count() === 1, 'Product box (textarea + send) missing')
  await openRunSettings(page)
  await page.getByText(/Stop this run before changing model settings\./).first().waitFor({ timeout: 30000 }).catch(() => {})
  const note = await page.getByText(/Stop this run before changing model settings\./).count()
  const saveDisabled = await page.locator(sel('save-existing-model-config')).isDisabled()
  const modelDisabled = await page.locator('main button[aria-haspopup="listbox"]').first().isDisabled()
  await page.screenshot({ path: path.join(outDir, 'C05-run-settings-live-locked.png') })
  assert(note >= 1 && saveDisabled && modelDisabled, 'Run settings not locked while live', { note, saveDisabled, modelDisabled })
  // D-18 (UF-03): a fresh chat with the default thinking state records an explicit llmConfig equal to
  // the model's schema defaults (independent oracle: the catalog configSchema), and the live ⚙ shows
  // those values disabled — never "Not recorded".
  const cfg = await runConfig(state.taggedRunId)
  const defaults = await schemaDefaultsFor(runtime, cfg.metadataConfig.llmModelIdentifier)
  const recorded = cfg.metadataConfig.llmConfig
  const settingsText = await page.locator('main').innerText()
  const d18 = {
    recorded, defaults,
    notRecordedShown: /Not recorded/.test(settingsText),
    missingHistoricalMarkers: await page.locator('main [data-testid^="missing-historical-config"]').count(),
    enabledFormControls: await page.locator('main select:not([disabled]), main input:not([disabled]):not([type="hidden"])').count(),
  }
  await closeRunSettings(page)
  if (defaults) {
    assert(recorded && Object.keys(recorded).length > 0, 'D-18: no explicit llmConfig recorded for a fresh default-thinking chat', d18)
    assert(Object.entries(recorded).every(([k, v]) => k in defaults && JSON.stringify(defaults[k]) === JSON.stringify(v)), 'D-18: recorded llmConfig differs from the schema defaults', d18)
  }
  assert(!d18.notRecordedShown && d18.missingHistoricalMarkers === 0, 'D-18: live ⚙ shows "Not recorded" / missing-config markers', d18)
  return { title, editability: cfg.modelConfigEditability, d18 }
})

defineCase('C06', 'Terminate → Offline → ⚙ save → reload → ⚙ save → resume uses the saved model (D-08 via run settings)', async (page) => {
  const runId = state.taggedRunId
  const catalog = await catalogFor(runtime)
  const labelOf = (id) => expectedModelOption(catalog.find((m) => m.modelIdentifier === id) ?? { modelIdentifier: id }, runtime).label
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await page.locator(`[data-test="terminate-agent-run"][data-run-id="${runId}"]`).click()
  await waitForStatus(page, /Offline/)
  const alternatives = state.models.filter((m) => m !== state.model)
  assert(alternatives.length >= 2, 'Runtime needs at least three models for the D-08 journey', state.models)
  await openRunSettings(page)
  await page.locator(sel('save-existing-model-config')).waitFor({ timeout: 30000 })
  await pickFormModel(page, labelOf(alternatives[0]))
  await page.locator(sel('save-existing-model-config')).click()
  await waitFor('first Offline save', async () => (await runConfig(runId)).metadataConfig.llmModelIdentifier === alternatives[0], 30000)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await waitForStatus(page, /Offline/)
  await openRunSettings(page)
  await pickFormModel(page, labelOf(alternatives[1]))
  await page.locator(sel('save-existing-model-config')).click()
  await waitFor('second Offline save', async () => (await runConfig(runId)).metadataConfig.llmModelIdentifier === alternatives[1], 30000)
  await closeRunSettings(page)
  await runInput(page).fill('Reply with exactly RESUMED-OK and nothing else.')
  await runSend(page).click()
  await waitForReply(page, 'RESUMED-OK')
  const cfg = await runConfig(runId)
  assert(cfg.isActive && cfg.metadataConfig.llmModelIdentifier === alternatives[1], 'Resume did not use the saved model', cfg)
  await openRunSettings(page)
  await page.getByText(/Stop this run before changing model settings\./).first().waitFor({ timeout: 30000 }).catch(() => {})
  const relocked = await page.getByText(/Stop this run before changing model settings\./).count()
  await closeRunSettings(page)
  assert(relocked >= 1, 'Run settings not locked again after resume')
  return { saved: [alternatives[0], alternatives[1]], resumed: cfg.metadataConfig }
})

defineCase('C07', 'Failed first send → /chat?id=temp-* with the error → resend → permanent URL, reply streams (D-04/D-13); folder + Ask first applied', async (page) => {
  const folder = path.join(ownedRoot, 'folder-ws'); await fs.mkdir(folder, { recursive: true })
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
    await pickModel(page, runtime, state.model)
    await openFolder(page, folder)
    await page.locator(sel('chat-approval-toggle')).click()
    await composerInput(page).fill('Reply with exactly RESENT-OK and nothing else.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
    await page.getByText('Injected prepare failure (probe)').first().waitFor({ timeout: 30000 })
    await runInput(page).fill('Reply with exactly RESENT-OK and nothing else.')
    await runSend(page).click()
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const runId = routeRunId(page)
    await waitForReply(page, 'RESENT-OK').catch(async (error) => { throw Object.assign(new Error('Reply did not stream after resend on the temp chat (F-02)'), { details: { runId, status: await runStatus(page) } }) })
    const cfg = await runConfig(runId)
    assert(cfg.metadataConfig.workspaceRootPath === folder && cfg.metadataConfig.autoExecuteTools === false, 'Folder/Ask first not applied', cfg)
    return { injected, runId, workspace: cfg.metadataConfig.workspaceRootPath }
  } finally { await page.unroute('**/graphql') }
})

defineCase('C08', 'Catalog Run (form unchanged) → /chat?id=temp-* → first send → permanent URL and streamed reply', async (page) => {
  await page.goto(`${frontUrl}/agents`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Probe Legacy', { exact: true }).first().waitFor({ timeout: 120000 })
  const card = page.locator('div,article,li').filter({ has: page.getByText('Probe Legacy', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await card.getByRole('button', { name: /^Run/ }).first().click()
  await page.locator('main select').first().waitFor({ timeout: 60000 })
  await page.locator('main select').first().selectOption(runtime)
  await delay(1500)
  await page.getByText('Select a model', { exact: true }).first().click()
  await page.locator('body > div').getByText(new RegExp(`^${state.model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')).first().click()
  await page.getByRole('button', { name: 'Run Agent' }).click()
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
  await runInput(page).fill('Reply with exactly CATALOG-OK and nothing else.')
  await runSend(page).click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  await waitForReply(page, 'CATALOG-OK')
  state.catalogRunId = routeRunId(page)
  return { runId: state.catalogRunId }
})

defineCase('C09', '@agent scoped /, × back to Daily Assistant, tree + preset', async (page) => {
  await newChat(page)
  const input = composerInput(page)
  await input.click(); await input.type('@probe-bundle')
  await page.locator(sel('chat-target-option-probe-bundle-owner')).click()
  await input.type('/')
  const scoped = await page.locator('[data-test^="chat-skill-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-option-', '')))
  assert(scoped.join() === 'probe-bundled', '/ not scoped to the addressed agent', scoped)
  await page.keyboard.press('Escape'); await input.fill('')
  await page.locator(`${sel('chat-agent-chip')} button`).first().click()
  assert(await page.locator(sel('chat-agent-chip')).count() === 0, '× did not return to Daily Assistant')
  await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  const agentRow = page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first()
  await agentRow.locator('xpath=..').locator('button').nth(1).click()
  await page.locator(sel('chat-new')).waitFor()
  return { scoped, presetUrl: page.url().replace(frontUrl, '') }
})

defineCase('C10', 'Team quick path with an attachment: uniform member config, coordinator reads the file, Team view with the unchanged box', async (page) => {
  await newChat(page)
  await pickModel(page, runtime, state.model)
  const input = composerInput(page)
  await input.click(); await input.type('@probe-te')
  await page.locator(sel('chat-target-option-probe-team')).click()
  const attachment = path.join(ownedRoot, 'attach-note.txt')
  await fs.writeFile(attachment, 'ATTACHMENT-MARKER-7431\n')
  await page.locator(`${sel('chat-composer')} input[type="file"]`).first().setInputFiles(attachment)
  await page.waitForFunction(() => /Context Files \(1\)/.test(document.querySelector('[data-test="chat-composer"]')?.innerText ?? ''), null, { timeout: 60000 })
  await input.fill('Read the attached context file and reply with the marker it contains, nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  await page.waitForFunction(() => /ATTACHMENT-MARKER-7431/.test(document.querySelector('main')?.innerText ?? ''), null, { timeout: 300000 })
  assert(await page.locator(sel('chat-composer-footer')).count() === 0, 'Team view shows the Chat footer')
  const history = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { teamDefinitions { teamDefinitionId runs { teamRunId coordinatorAddress } } } }')
  const teamRun = history.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === 'probe-team')?.runs?.[0]
  const tree = (await gql('query($teamRunId:String!){getTeamRunResumeConfig(teamRunId:$teamRunId){executionTree}}', { teamRunId: teamRun.teamRunId })).getTeamRunResumeConfig.executionTree
  const configs = tree.root_team.members.map((m) => JSON.stringify({ ...m.launch_configuration }))
  assert(new Set(configs).size === 1 && JSON.parse(configs[0]).runtime_kind === runtime && JSON.parse(configs[0]).auto_execute_tools === true, 'Members not uniformly configured', configs)
  state.teamRunId = teamRun.teamRunId
  await page.screenshot({ path: path.join(outDir, 'C10-team-view.png') })
  return { teamRunId: teamRun.teamRunId, coordinator: teamRun.coordinatorAddress, memberConfig: JSON.parse(configs[0]) }
})

defineCase('C11', 'RSK-005 redirects, missing and unregistered ids, tool strip collapsed', async (page) => {
  const org = await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: 'probe-org', rootConfiguration: { runtimeKind: runtime, llmModelIdentifier: state.model, llmConfig: null, autoExecuteTools: true, skillAccessMode: 'NONE', workspaceRootPath: path.join(dataRoot, 'temp_workspace') }, agentOverrides: [], teamOverrides: [] } })
  assert(org.createAgentOrgRun.success, org.createAgentOrgRun.message)
  const orgRunId = org.createAgentOrgRun.agentOrgRunId
  const push = (to) => page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), to)
  await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  assert(await page.locator(sel('right-side-tab-list')).isVisible(), 'Right tabs panel is not open by default (shared preference, D-17)')
  await push('/workspace'); await delay(2500)
  assert(new URL(page.url()).pathname === '/workspace', 'Stale standalone selection redirected on /workspace mount', page.url())
  const orgGroup = page.locator('[data-test="agent-org-definition-probe-org"]')
  await orgGroup.waitFor({ timeout: 60000 })
  if (await orgGroup.getAttribute('aria-expanded') !== 'true') await orgGroup.click()
  await page.locator(`[data-test="agent-org-run-open-${orgRunId}"]`).click(); await delay(2000)
  await page.locator('[data-test^="agent-org-agent-row-"]').first().click(); await delay(2500)
  assert(/rootSubjectKind=agent_org/.test(page.url()), 'Org member selection redirected away from the org route', page.url())
  const row = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${state.taggedRunId}"]`)
  if (!(await row.isVisible().catch(() => false))) {
    const agentRow = page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first()
    if (await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click()
  }
  await row.first().click()
  await page.waitForURL(new RegExp(`/chat\\?id=${state.taggedRunId}`), { timeout: 30000 })
  await push('/chat?id=no_such_run_probe')
  await page.locator(sel('chat-missing')).waitFor({ timeout: 60000 })
  await push('/chat?id=temp-chat-0-0'); await page.waitForURL(/\/chat$/, { timeout: 30000 })
  return { orgRunId }
})

defineCase('C12', 'Narrow 390×844: no horizontal overflow; model menu is a bottom sheet with drill-in', async (_page, context) => {
  const page = await context.newPage()
  await page.setViewportSize({ width: 390, height: 844 })
  try {
    const overflow = () => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
    await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await delay(1500)
    assert(await overflow() === 0, 'Horizontal overflow on New chat')
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel(`chat-runtime-${runtime}`)).click()
    await page.locator(sel('chat-model-drill-back')).waitFor()
    const box = await page.locator(sel('chat-model-menu')).boundingBox()
    assert(box && box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, 'Bottom sheet outside the viewport', box)
    await page.screenshot({ path: path.join(outDir, 'C12-narrow-model-sheet.png') })
    await page.keyboard.press('Escape')
    // VIS-027: the narrow chat run view keeps the product header and box without overflow.
    await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
    await page.locator(RUN_VIEW).waitFor({ timeout: 120000 }); await delay(1500)
    const runOverflow = await overflow()
    const titleBox = await page.locator(sel('agent-workspace-title')).boundingBox()
    const hasBox = await runInput(page).isVisible() && await runSend(page).isVisible()
    await page.screenshot({ path: path.join(outDir, 'C12-narrow-chat-run-view.png') })
    assert(runOverflow === 0 && hasBox && titleBox && titleBox.x + titleBox.width <= 390, 'Narrow chat run view overflows or lacks the product box', { runOverflow, hasBox, titleBox })
    return { sheet: box, runOverflow }
  } finally { await page.close() }
})

// Workspace-link cases. `probe-shadow-owner` configures `probe-alpha` and has an on-disk private copy
// that the catalog ignores (D-19); a user-owned workspace copy still triggers D-15 Rule 1 (C14).
const backendLog = () => fs.readFile(path.join(outDir, 'backend.log'), 'utf8').catch(() => '')
const dispositionLogged = async (disposition, runId) => waitFor(`${disposition} for ${runId}`, async () =>
  // Shared materializer logs `disposition='x'`, skill='y'`; AGY logs `disposition=x`, `skill=y`.
  (await backendLog()).split('\n').some((l) => new RegExp(`disposition='?${disposition}'?`).test(l) && l.includes(runId) && /skill='?probe-alpha'?/.test(l)), 30000)
const startChat = async (page, { folder, target, text }) => {
  await newChat(page)
  await pickModel(page, runtime, state.model)
  if (folder) await openFolder(page, folder)
  if (target) {
    await composerInput(page).click(); await composerInput(page).type(`@${target.slice(0, 12)}`)
    await page.locator(sel(`chat-target-option-${target}`)).click()
  }
  await composerInput(page).fill(text)
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  return routeRunId(page)
}
const terminate = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })

defineCase('C14', 'D-15 Rule 1 (V-D): a user-owned workspace skill wins for the Daily Assistant; a configured agent still fails fast', async (page) => {
  assert(USER_SKILL_DIR, `No workspace skill path for runtime ${runtime}`)
  const folder = path.join(ownedRoot, 'user-owned-skill-ws')
  const owned = path.join(folder, USER_SKILL_DIR, 'skills', 'probe-alpha')
  await writeSkill(owned, 'probe-alpha', 'Workspace-local copy owned by the user', 'LOCAL-OK')
  const before = await fs.readFile(path.join(owned, 'SKILL.md'), 'utf8')
  const daRun = await startChat(page, { folder, text: 'Reply with exactly WEAK-START-OK and nothing else.' })
  await waitForReply(page, 'WEAK-START-OK')
  await dispositionLogged('skipped-workspace-owned', daRun)
  const stat = await fs.lstat(owned)
  assert(stat.isDirectory() && !stat.isSymbolicLink() && (await fs.readFile(path.join(owned, 'SKILL.md'), 'utf8')) === before, 'User-owned skill folder was modified')
  await newChat(page)
  await pickModel(page, runtime, state.model)
  await openFolder(page, folder)
  await composerInput(page).click(); await composerInput(page).type('@probe-shadow')
  await page.locator(sel('chat-target-option-probe-shadow-owner')).click()
  await composerInput(page).fill('Reply with exactly STRONG-SHOULD-FAIL.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.getByText(/An Error Occurred/).first().waitFor({ timeout: 120000 })
  const strongRun = routeRunId(page)
  const strongError = (await page.locator(RUN_VIEW).innerText()).match(/An Error Occurred\s*\n+([^\n]+)/)?.[1] ?? null
  const stat2 = await fs.lstat(owned)
  assert(stat2.isDirectory() && !stat2.isSymbolicLink(), 'User-owned skill folder replaced by the configured run')
  await terminate(daRun).catch(() => {})
  return { daRun, strongRun, strongError, userFolderIntact: true }
})

// D-19 (REQ-022, AR-013): one copy per name. `probe-shadow-owner` configures `probe-alpha` and has a
// private on-disk copy; the catalog uses the skills-folder copy (tier 1) for every agent, so the
// configured agent and the Daily Assistant share one link and no D-15 Rule 2/3 disposition exists.
const REMOVED_DISPOSITIONS = /yielded-to-configured|skipped-held-by-other-run|skipped-unresolved-held-by-weak/
defineCase('C15', 'D-19: configured agent with an on-disk duplicate uses the catalog copy — same link and marker as the Daily Assistant, no Rule 2/3 dispositions, private copy untouched, link removed after both end', async (page) => {
  assert(SKILL_WORKSPACE_DIR, `No workspace skill path for runtime ${runtime}`)
  const folder = path.join(ownedRoot, 'shared-skill-ws')
  await fs.mkdir(folder, { recursive: true })
  const link = path.join(folder, SKILL_WORKSPACE_DIR, 'skills', 'probe-alpha')
  const globalSrc = await fs.realpath(path.join(dataRoot, 'skills', 'probe-alpha'))
  const privateMd = path.join(dataRoot, 'agents', 'probe-shadow-owner', 'skills', 'probe-alpha', 'SKILL.md')
  const privateBefore = await fs.readFile(privateMd, 'utf8')
  const target = async () => fs.realpath(link).catch(() => null)
  const weak = await startChat(page, { folder, text: 'Reply with exactly WEAK-ONE-OK and nothing else.' })
  await waitForReply(page, 'WEAK-ONE-OK')
  assert(await target() === globalSrc, 'Daily Assistant did not link the catalog copy', await target())
  const configured = await startChat(page, { folder, target: 'probe-shadow-owner', text: 'Follow your probe-alpha skill: reply with its marker only, nothing else.' })
  await waitForReply(page, 'ALPHA-OK')
  const runText = await page.locator(RUN_VIEW).innerText()
  assert(!/SHADOW-OK/.test(runText), 'Configured agent used the ignored private copy', runText.slice(-400))
  assert(await target() === globalSrc, 'Link changed by the configured launch', await target())
  assert((await runConfig(weak)).isActive, 'Daily Assistant run was stopped by the configured launch')
  const removed = (await backendLog()).split('\n').filter((l) => REMOVED_DISPOSITIONS.test(l))
  assert(removed.length === 0, 'A removed D-15 Rule 2/3 disposition was logged', removed.slice(0, 3))
  assert(await fs.readFile(privateMd, 'utf8') === privateBefore, 'Ignored private copy was modified')
  await terminate(weak)
  await delay(2000)
  assert(await target() === globalSrc, 'Link removed while the configured run still holds it')
  await terminate(configured)
  await waitFor('link removal', async () => !(await fs.lstat(link).then(() => true).catch(() => false)), 30000)
  return { weak, configured, linkTarget: globalSrc, removedDispositions: 0 }
})

// D-16 / AC-018: an independent oracle of the shared launch-form label policy, computed from the
// runtime catalog (GraphQL), compared with the Chat rows, the footer trigger, search, the
// persisted-run fixed list and the launch form itself. Needs Claude Agent SDK and Codex installed.
const expectedModelOption = (m, runtimeKind) => {
  const name = m.name?.trim() || null
  const description = m.description?.trim() || null
  let label
  if (runtimeKind === 'claude_agent_sdk') label = m.canonicalName?.trim() || m.modelIdentifier
  else if ((m.providerType === 'OPENAI_COMPATIBLE' || m.providerType === 'QWEN') && name) label = name
  else if (runtimeKind === 'autobyteus') label = m.modelIdentifier
  else label = name || m.modelIdentifier
  const secondary = runtimeKind === 'claude_agent_sdk'
    ? [name && name !== label ? name : null, description].filter(Boolean).join(' · ') || null
    : description
  return { label, secondary, recommended: m.selectionPresentation?.recommended === true }
}
const catalogFor = async (runtimeKind) => (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier name description canonicalName providerType selectionPresentation{recommended}}}}', { r: runtimeKind }))
  .providerModelCatalogSnapshots.flatMap((s) => s.llmModels)
const readModelRows = (page, scope) => page.locator(`${scope} ${MODEL_ROW}`).evaluateAll((els) => els.map((e) => ({
  id: e.getAttribute('data-test').replace('chat-model-option-', ''),
  label: e.querySelector('[data-test="chat-model-option-label"]')?.textContent.trim() ?? null,
  secondary: e.querySelector('[data-test="chat-model-option-secondary"]')?.textContent.trim() || null,
  recommended: Boolean(e.querySelector('[data-test="chat-model-option-recommended"]')),
  singleLine: getComputedStyle(e.querySelector('[data-test="chat-model-option-label"]')).whiteSpace === 'nowrap',
  title: e.getAttribute('title'),
})))
const rowMismatches = (rows, catalog, runtimeKind) => rows.flatMap((row) => {
  const model = catalog.find((m) => m.modelIdentifier === row.id)
  if (!model) return [{ id: row.id, problem: 'not in catalog' }]
  const exp = expectedModelOption(model, runtimeKind)
  const problems = []
  if (row.label !== exp.label) problems.push(`label ${row.label} ≠ ${exp.label}`)
  if (row.secondary !== exp.secondary) problems.push(`secondary ${row.secondary} ≠ ${exp.secondary}`)
  if (row.recommended !== exp.recommended) problems.push(`recommended ${row.recommended} ≠ ${exp.recommended}`)
  if (!row.singleLine) problems.push('label wraps')
  return problems.length ? [{ id: row.id, problems }] : []
})
const recommendedFirst = (rows) => rows.findIndex((r) => !r.recommended) === -1
  || rows.slice(rows.findIndex((r) => !r.recommended)).every((r) => !r.recommended)
const openRuntimeRows = async (page, runtimeKind) => {
  if (!(await page.locator(sel('chat-model-menu')).isVisible().catch(() => false))) await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
  const scope = sel(`chat-model-list-${runtimeKind}`)
  await page.locator(`${scope} ${MODEL_ROW}`).first().waitFor({ timeout: 120000 })
  return readModelRows(page, scope)
}
const searchIds = async (page, query) => {
  await page.locator(sel('chat-model-search')).fill(query)
  await delay(600)
  await page.waitForFunction(() => !/Searching all runtimes/.test(document.querySelector('[data-test="chat-model-menu"]')?.innerText ?? ''), null, { timeout: 120000 }).catch(() => {})
  return page.locator('[data-test^="chat-model-search-option-"], ' + MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace(/^chat-model-(search-)?option-/, '')))
}

defineCase('C16', 'D-16 / AC-018: Chat model labels follow the launch-form policy (rows, trigger, search, fixed list, launch-form parity, 390×844)', async (page, context) => {
  const result = {}
  await newChat(page)
  // V-L1 / V-L3 / V-L4: rows per runtime match the oracle.
  for (const runtimeKind of ['claude_agent_sdk', 'codex_app_server', 'autobyteus']) {
    const rows = await openRuntimeRows(page, runtimeKind)
    const catalog = await catalogFor(runtimeKind)
    const mismatches = rowMismatches(rows, catalog, runtimeKind)
    assert(mismatches.length === 0, `${runtimeKind} rows do not follow the shared label policy`, mismatches.slice(0, 5))
    assert(rows.length === catalog.length, `${runtimeKind} rows ≠ catalog`, { rows: rows.length, catalog: catalog.length })
    if (runtimeKind === 'claude_agent_sdk') assert(recommendedFirst(rows), 'Claude SDK recommended rows are not listed first', rows.map((r) => `${r.label}${r.recommended ? '*' : ''}`))
    result[runtimeKind] = rows.slice(0, 4).map((r) => ({ id: r.id, label: r.label, secondary: r.secondary, recommended: r.recommended }))
  }
  await page.keyboard.press('Escape')
  const claudeRows = await openRuntimeRows(page, 'claude_agent_sdk')
  const pick = claudeRows.find((r) => r.recommended) ?? claudeRows.find((r) => r.label !== r.id) ?? claudeRows[0]
  const claudeCatalog = await catalogFor('claude_agent_sdk')
  const pickModelRecord = claudeCatalog.find((m) => m.modelIdentifier === pick.id)
  // Search by canonical name, display name and identifier (and `gpt-6` across runtimes).
  const searches = {}
  for (const q of [pick.label.slice(-8), pickModelRecord?.name, pick.id].filter(Boolean)) {
    searches[q] = await searchIds(page, q)
    assert(searches[q].includes(pick.id), `Search "${q}" does not find ${pick.id}`, searches[q])
  }
  const codexWithGpt6 = (await catalogFor('codex_app_server')).filter((m) => /gpt-6/i.test(`${m.modelIdentifier} ${m.name}`)).map((m) => m.modelIdentifier)
  if (codexWithGpt6.length) {
    searches['gpt-6'] = await searchIds(page, 'gpt-6')
    assert(codexWithGpt6.every((id) => searches['gpt-6'].includes(id)), 'Search "gpt-6" misses Codex models', { found: searches['gpt-6'], expected: codexWithGpt6 })
  }
  await page.locator(sel('chat-model-search')).fill('')
  await page.locator(sel(`chat-model-option-${pick.id}`)).click()
  // Trigger: same label, one line, full text in the title.
  const trigger = page.locator(sel('chat-model-trigger'))
  const triggerLabel = (await trigger.innerText()).split('\n')[0]
  assert(triggerLabel === pick.label, 'Trigger label differs from the row label', { triggerLabel, row: pick.label })
  assert((await trigger.getAttribute('title'))?.startsWith(`${pick.label} · `), 'Trigger title lacks the full label', await trigger.getAttribute('title'))
  await page.screenshot({ path: path.join(outDir, 'C16-claude-trigger.png') })
  // V-L2 (R3): after the first message the model lives in ⚙ run settings; its gear editor uses the same
  // shared label policy (canonical label, Recommended badge, recommended first) for the Offline chat.
  await composerInput(page).fill('Reply with exactly LABEL-OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const claudeRun = routeRunId(page)
  await waitForReply(page, 'LABEL-OK')
  await terminate(claudeRun)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForStatus(page, /Offline/)
  await openRunSettings(page)
  const settingsTrigger = page.locator('main button[aria-haspopup="listbox"]').first()
  // The gear editor shows the shared policy's selected-label form `<Provider> / <label>`.
  await waitFor('run-settings model label', async () => { const t = (await settingsTrigger.innerText()).trim(); return t === pick.label || t.endsWith(` / ${pick.label}`) }, 30000)
  await settingsTrigger.click()
  await page.locator('[role="option"]').first().waitFor({ timeout: 60000 })
  const settingsRows = await page.locator('[role="option"]').evaluateAll((els) => els.map((li) => ({
    label: li.querySelector('span.block.truncate')?.textContent.trim() ?? null,
    recommended: Boolean(li.querySelector('[data-test="select-item-recommended"]')),
  })))
  const expectedLabels = new Set(claudeCatalog.map((m) => expectedModelOption(m, 'claude_agent_sdk').label))
  assert(settingsRows.length > 0 && settingsRows.every((r) => expectedLabels.has(r.label)), 'Run-settings model labels do not follow the shared policy', settingsRows)
  assert(recommendedFirst(settingsRows), 'Run-settings rows are not recommended-first', settingsRows.map((r) => r.label))
  await page.keyboard.press('Escape')
  await page.screenshot({ path: path.join(outDir, 'C16-claude-offline-run-settings.png') })
  await closeRunSettings(page)
  const fixedRows = settingsRows
  // A fresh New chat preselects the last-used Claude model (REQ-019): its trigger shows the policy label too.
  await newChat(page)
  const freshTriggerLabel = async () => (await page.locator(sel('chat-model-trigger')).innerText()).split('\n')[0]
  const freshStarted = Date.now()
  const firstSeenLabel = await freshTriggerLabel()
  const settled = await waitFor('fresh New chat trigger label', async () => (await freshTriggerLabel()) === pick.label, 20000, 100).catch(() => false)
  result.freshTrigger = { firstSeenLabel, settledAfterMs: settled ? Date.now() - freshStarted : null }
  await page.screenshot({ path: path.join(outDir, 'C16-fresh-new-chat-trigger.png') })
  assert(settled, 'Fresh New chat trigger shows the identifier instead of the policy label for the last-used model', { trigger: await freshTriggerLabel(), expected: pick.label })
  // V-L5: the launch form shows the same labels, badges and order for Claude Agent SDK.
  await page.goto(`${frontUrl}/agents`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Probe Legacy', { exact: true }).first().waitFor({ timeout: 120000 })
  const card = page.locator('div,article,li').filter({ has: page.getByText('Probe Legacy', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await card.getByRole('button', { name: /^Run/ }).first().click()
  await page.locator('main select').first().waitFor({ timeout: 60000 })
  await page.locator('main select').first().selectOption('claude_agent_sdk')
  await delay(1500)
  await page.getByText('Select a model', { exact: true }).first().click()
  await page.locator('[role="option"]').first().waitFor({ timeout: 60000 })
  const formRows = await page.locator('[role="option"]').evaluateAll((els) => els.map((li) => ({
    label: li.querySelector('span.block.truncate')?.textContent.trim() ?? null,
    recommended: Boolean(li.querySelector('[data-test="select-item-recommended"]')),
  })))
  const chatOrder = claudeRows.map((r) => `${r.label}${r.recommended ? ' [R]' : ''}`)
  const formOrder = formRows.map((r) => `${r.label}${r.recommended ? ' [R]' : ''}`)
  assert(JSON.stringify(chatOrder) === JSON.stringify(formOrder), 'Chat and launch form differ for Claude Agent SDK', { chatOrder, formOrder })
  await page.keyboard.press('Escape')
  // 390×844: the Claude drill-in stays in the viewport, rows single-line, no horizontal overflow.
  const narrow = await context.newPage()
  await narrow.setViewportSize({ width: 390, height: 844 })
  try {
    await narrow.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await narrow.locator(sel('chat-new')).waitFor({ timeout: 120000 })
    const narrowStarted = Date.now()
    result.narrowFirstSeen = (await narrow.locator(sel('chat-model-trigger')).innerText()).split('\n')[0]
    const narrowTrigger = await waitFor('narrow trigger label', async () => ((await narrow.locator(sel('chat-model-trigger')).innerText()).split('\n')[0] === pick.label ? pick.label : null), 20000)
      .catch(async () => (await narrow.locator(sel('chat-model-trigger')).innerText()).split('\n')[0])
    result.narrowSettledAfterMs = narrowTrigger === pick.label ? Date.now() - narrowStarted : null
    assert(narrowTrigger === pick.label, 'Narrow New chat trigger label differs from the policy label', { narrowTrigger, expected: pick.label })
    await narrow.locator(sel('chat-model-trigger')).click()
    await narrow.locator(sel('chat-runtime-codex_app_server')).click()
    await narrow.locator(`${sel('chat-model-list-codex_app_server')} ${MODEL_ROW}`).first().waitFor({ timeout: 120000 })
    const narrowRows = await readModelRows(narrow, sel('chat-model-list-codex_app_server'))
    const overflow = await narrow.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
    const box = await narrow.locator(sel('chat-model-menu')).boundingBox()
    assert(overflow === 0 && box.x >= 0 && box.x + box.width <= 390, 'Narrow model menu overflows', { overflow, box })
    assert(narrowRows.every((r) => r.singleLine), 'Narrow rows wrap')
    await narrow.screenshot({ path: path.join(outDir, 'C16-narrow-codex-labels.png') })
  } finally { await narrow.close() }
  return { ...result, picked: pick, searches: Object.fromEntries(Object.entries(searches).map(([k, v]) => [k, v.length])), fixedRows: fixedRows.length, launchFormParity: formOrder.length }
})

// D-17 cases (R3): the chat run view is the product agent run view in the workspace frame.
const frameGeometry = (page) => page.evaluate(() => {
  const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right), bottom: Math.round(b.bottom) } }
  const tabList = document.querySelector('[data-test="right-side-tab-list"]')
  let column = tabList
  while (column && column.parentElement && column.getBoundingClientRect().height < window.innerHeight * 0.9) column = column.parentElement
  const title = document.querySelector('[data-test="agent-workspace-title"]') ?? document.querySelector('main h4, main h3')
  let header = title
  while (header && header.parentElement && !/border-b/.test(header.className)) header = header.parentElement
  return { tabList: box(tabList), column: box(column), header: box(header) }
})
const openTreeTeamRun = async (page, teamRunId) => {
  const row = page.locator(`[data-test="workspace-team-row-${teamRunId}"]`)
  if (!(await row.isVisible().catch(() => false))) {
    const group = page.locator('[data-test^="workspace-team-definition-row-"]').filter({ hasText: 'Probe Team' }).first()
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  }
  await row.click()
  await page.waitForURL(/\/workspace/, { timeout: 30000 })
  await page.locator(sel('right-side-tab-list')).or(page.locator(sel('workspace-right-tool-strip-surface'))).first().waitFor({ timeout: 30000 })
}
const openTreeAgentRun = async (page, runId) => {
  const row = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`)
  if (!(await row.isVisible().catch(() => false))) {
    const agentRow = page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first()
    if (!(await agentRow.isVisible().catch(() => false))) await page.getByText('Temp Workspace', { exact: true }).first().click()
    if (await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click()
  }
  await row.first().click()
  await page.waitForURL(new RegExp(`/chat\\?id=${runId}`), { timeout: 30000 })
  await page.locator(RUN_VIEW).waitFor({ timeout: 30000 })
}
const stripOpens = async (page, title) => {
  if (await page.locator(sel('right-side-tab-list')).isVisible().catch(() => false)) {
    if (await page.locator(sel('right-side-panel-toggle')).isVisible().catch(() => false)) await page.locator(sel('right-side-panel-toggle')).click()
    else await page.keyboard.press('Escape')
  }
  const stripButton = page.locator(`${sel('workspace-right-tool-strip')} button[title="${title}"]`).first()
  await stripButton.waitFor({ state: 'visible', timeout: 15000 })
  await stripButton.click()
  await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 15000 })
  await delay(600)
  return selectedRightTab(page)
}

defineCase('C17', 'D-17 frame: chat run view geometry equals the Team view; strip Files/Terminal open exact tabs in Chat and Team; defaults; reopen keeps its tab; collapsed state is shared', async (page) => {
  assert(state.teamRunId, 'C10 must run first (team run)')
  const r = {}
  await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 30000 })
  await delay(1500)
  r.chatDefaultTab = await selectedRightTab(page)
  r.chat = await frameGeometry(page)
  await page.screenshot({ path: path.join(outDir, 'C17-chat-frame.png') })
  await openTreeTeamRun(page, state.teamRunId)
  await delay(1500)
  r.teamDefaultTab = await selectedRightTab(page)
  r.team = await frameGeometry(page)
  await page.screenshot({ path: path.join(outDir, 'C17-team-frame.png') })
  const same = (a, b) => a && b && Math.abs(a.top - b.top) <= 2 && Math.abs(a.left - b.left) <= 2 && Math.abs(a.right - b.right) <= 2 && Math.abs(a.bottom - b.bottom) <= 2
  assert(r.chat.column.top <= 2 && same(r.chat.column, r.team.column) && same(r.chat.tabList, r.team.tabList), 'Chat right column differs from the Team view (full-height from the top expected)', r)
  assert(r.chat.header && r.chat.header.right <= r.chat.column.left + 1, 'Chat header extends over the right column', r)
  assert(r.chatDefaultTab === 'Activity' && r.teamDefaultTab && r.teamDefaultTab !== 'Activity', 'Contextual default tabs wrong', { chat: r.chatDefaultTab, team: r.teamDefaultTab })
  // Strip clicks open exactly the clicked tab, in Team and in Chat.
  r.teamStrip = { Files: await stripOpens(page, 'Files'), Terminal: await stripOpens(page, 'Terminal') }
  // Collapsed state is shared: collapse in Team → the chat opens collapsed.
  await page.locator(sel('right-side-panel-toggle')).click()
  await openTreeAgentRun(page, state.taggedRunId)
  await delay(800)
  r.chatCollapsedAfterTeamCollapse = !(await page.locator(sel('right-side-tab-list')).isVisible().catch(() => false))
  r.chatStrip = { Files: await stripOpens(page, 'Files'), Terminal: await stripOpens(page, 'Terminal') }
  assert(r.teamStrip.Files === 'Files' && r.teamStrip.Terminal === 'Terminal' && r.chatStrip.Files === 'Files' && r.chatStrip.Terminal === 'Terminal', 'Strip click did not open the clicked tab', r)
  assert(r.chatCollapsedAfterTeamCollapse, 'Collapsed state is not shared between Team and Chat')
  // Reopening the same run keeps its tab (select Files, leave via the nav, come back via the tree).
  await page.locator(`${sel('right-side-tab-list')} [data-tab-name]`).filter({ hasText: /^Files$/ }).first().click()
  await page.getByText('Agents', { exact: true }).first().click()
  await page.waitForURL(/\/agents/, { timeout: 30000 })
  await openTreeAgentRun(page, state.taggedRunId).catch(async () => { await page.getByText('Chat', { exact: true }).first().click(); await openTreeAgentRun(page, state.taggedRunId) })
  await delay(800)
  r.reopenTab = await selectedRightTab(page)
  assert(r.reopenTab === 'Files', 'Reopening the run did not keep its tab', r.reopenTab)
  return r
})

defineCase('C18', 'D-17 draft ⚙ (AR-011): catalog draft and failed first send edit the draft model locally (no server call) and the send uses it', async (page) => {
  const catalog = await catalogFor(runtime)
  const labelOf = (id) => expectedModelOption(catalog.find((m) => m.modelIdentifier === id) ?? { modelIdentifier: id }, runtime).label
  const alternatives = state.models.filter((m) => m !== state.model)
  const graphqlOps = []
  const onRequest = (req) => { if (req.url().includes('/graphql') && req.method() === 'POST') graphqlOps.push((req.postData() ?? '').match(/(mutation|query)\s+(\w+)/)?.slice(1).join(' ') ?? 'anonymous') }
  const r = {}
  // (a) catalog "Run agent" draft
  await page.goto(`${frontUrl}/agents`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Probe Legacy', { exact: true }).first().waitFor({ timeout: 120000 })
  const card = page.locator('div,article,li').filter({ has: page.getByText('Probe Legacy', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await card.getByRole('button', { name: /^Run/ }).first().click()
  await page.locator('main select').first().waitFor({ timeout: 60000 })
  await page.locator('main select').first().selectOption(runtime)
  await delay(1500)
  await page.getByText('Select a model', { exact: true }).first().click()
  await page.locator('body > div').getByText(new RegExp(`^${state.model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')).first().click()
  await page.getByRole('button', { name: 'Run Agent' }).click()
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
  page.on('request', onRequest)
  await openRunSettings(page)
  await page.locator(sel('draft-run-config-editor')).waitFor({ timeout: 15000 })
  await pickFormModel(page, labelOf(alternatives[0]))
  await closeRunSettings(page)
  r.catalogOpsBeforeSend = [...graphqlOps]
  page.off('request', onRequest)
  await runInput(page).fill('Reply with exactly DRAFT-CATALOG-OK and nothing else.')
  await runSend(page).click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const catalogRun = routeRunId(page)
  await waitForReply(page, 'DRAFT-CATALOG-OK')
  r.catalogModel = (await runConfig(catalogRun)).metadataConfig.llmModelIdentifier
  assert(!r.catalogOpsBeforeSend.some((op) => /^mutation/.test(op) || /AgentRunResumeConfig|RunModelOptions/.test(op)), 'Draft run settings called the server before the send', r.catalogOpsBeforeSend)
  assert(r.catalogModel === alternatives[0], 'Catalog draft send did not use the model chosen in draft ⚙', r)
  // (b) failed New chat first send → temp chat → draft ⚙ → resend
  let injected = 0
  await page.route('**/graphql', async (route) => {
    if (injected === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) { injected += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected prepare failure (probe)' }] }) }) }
    return route.continue()
  })
  try {
    await newChat(page)
    await pickModel(page, runtime, state.model)
    await composerInput(page).fill('Reply with exactly DRAFT-RESEND-OK and nothing else.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
    graphqlOps.length = 0; page.on('request', onRequest)
    await openRunSettings(page)
    await page.locator(sel('draft-run-config-editor')).waitFor({ timeout: 15000 })
    await pickFormModel(page, labelOf(alternatives[1]))
    await closeRunSettings(page)
    r.resendOpsBeforeSend = [...graphqlOps]
    page.off('request', onRequest)
    await runInput(page).fill('Reply with exactly DRAFT-RESEND-OK and nothing else.')
    await runSend(page).click()
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const resendRun = routeRunId(page)
    await waitForReply(page, 'DRAFT-RESEND-OK')
    r.resendModel = (await runConfig(resendRun)).metadataConfig.llmModelIdentifier
  } finally { await page.unroute('**/graphql') }
  assert(!r.resendOpsBeforeSend.some((op) => /^mutation/.test(op) || /AgentRunResumeConfig|RunModelOptions/.test(op)), 'Draft run settings called the server before the resend', r.resendOpsBeforeSend)
  assert(r.resendModel === alternatives[1], 'Resend did not use the model chosen in draft ⚙', r)
  return r
})

defineCase('C19', 'CR-005: ⚙ stays with its run — New chat (success, failed first send) and Team quick path land on their conversation; header ＋ opens a preset New chat', async (page) => {
  const r = {}
  const openChatSettings = async () => {
    await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
    await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
    await openRunSettings(page)
  }
  const landedOnConversation = async () => ({ runView: await page.locator(RUN_VIEW).isVisible().catch(() => false), settingsOpen: await page.locator(sel('run-config-back-to-events')).isVisible().catch(() => false) })
  // success
  await openChatSettings()
  await page.locator(sel('app-left-panel-new-chat')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 30000 })
  await pickModel(page, runtime, state.model)
  await composerInput(page).fill('Reply with exactly CR005-OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  await delay(1500)
  r.success = await landedOnConversation()
  // failed first send
  await openChatSettings()
  let injected = 0
  await page.route('**/graphql', async (route) => {
    if (injected === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) { injected += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected prepare failure (probe)' }] }) }) }
    return route.continue()
  })
  try {
    await page.locator(sel('app-left-panel-new-chat')).click()
    await page.locator(sel('chat-new')).waitFor({ timeout: 30000 })
    await composerInput(page).fill('Reply with exactly CR005-FAIL.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
    await delay(1500)
    r.failed = await landedOnConversation()
  } finally { await page.unroute('**/graphql') }
  // Team quick path
  await openChatSettings()
  await page.locator(sel('app-left-panel-new-chat')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 30000 })
  await pickModel(page, runtime, state.model)
  await composerInput(page).click(); await composerInput(page).type('@probe-te')
  await page.locator(sel('chat-target-option-probe-team')).click()
  await composerInput(page).fill('Reply with exactly CR005-TEAM-OK.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  await delay(2500)
  r.team = { settingsOpen: await page.locator(sel('run-config-back-to-events')).isVisible().catch(() => false), textarea: await page.locator('main textarea').count() }
  // header ＋ on a configured agent's run → New chat preset to that agent and workspace
  await page.goto(`${frontUrl}/chat?id=${state.catalogRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await page.locator(sel('workspace-header-new-run')).click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 30000 })
  r.plus = { url: page.url().replace(frontUrl, ''), chip: await page.locator(sel('chat-agent-chip')).innerText().catch(() => null), workspace: await page.locator(sel('chat-workspace-trigger')).innerText() }
  assert(r.success.runView && !r.success.settingsOpen, 'Successful New chat landed on run settings', r)
  assert(r.failed.runView && !r.failed.settingsOpen, 'Failed New chat landed on run settings', r)
  assert(!r.team.settingsOpen && r.team.textarea >= 1, 'Team quick path landed on run settings', r)
  assert(/\/chat$/.test(r.plus.url) && /Probe Legacy/.test(r.plus.chip ?? '') && /Temp workspace/.test(r.plus.workspace), 'Header ＋ did not open a preset New chat', r.plus)
  return r
})

defineCase('C20', 'V-F under D-19 (UF-04): a configured agent naming a skill bundled in another agent resolves the catalog copy and starts next to a live Daily Assistant chat; one shared link', async (page) => {
  const folder = path.join(ownedRoot, 'borrower-ws')
  await fs.mkdir(folder, { recursive: true })
  const bundled = await fs.realpath(path.join(dataRoot, 'agents', 'probe-bundle-owner', 'skills', 'probe-bundled'))
  const da = await startChat(page, { folder, text: 'Reply with exactly WEAK-HOLDER-OK and nothing else.' })
  await waitForReply(page, 'WEAK-HOLDER-OK')
  const link = path.join(folder, SKILL_WORKSPACE_DIR ?? '.codex', 'skills', 'probe-bundled')
  const heldBefore = await fs.realpath(link).catch(() => null)
  const borrower = await startChat(page, { folder, target: 'probe-borrower', text: 'Follow your probe-bundled skill: reply with its marker only, nothing else.' }).catch(() => routeRunId(page))
  const outcome = await Promise.race([
    waitForReply(page, 'BUNDLED-OK', 180000).then(() => 'replied'),
    page.getByText(/An Error Occurred/).first().waitFor({ timeout: 180000 }).then(() => 'error'),
  ]).catch(() => 'timeout')
  const heldAfter = await fs.realpath(link).catch(() => null)
  const lines = (await backendLog()).split('\n')
  const log = lines.filter((l) => l.includes(borrower ?? '---') && /collision|Unexpected failure/i.test(l)).slice(0, 2)
  const unresolved = lines.filter((l) => /probe-bundled' could not be resolved/.test(l)).slice(0, 2)
  const removed = lines.filter((l) => REMOVED_DISPOSITIONS.test(l)).slice(0, 2)
  await terminate(da).catch(() => {})
  await terminate(borrower).catch(() => {})
  const details = { outcome, heldBefore, heldAfter, log, unresolved, removed }
  assert(outcome === 'replied', 'Configured agent failed next to a live Daily Assistant chat (UF-04)', details)
  assert(heldBefore === bundled && heldAfter === bundled, 'Daily Assistant and configured agent did not share the catalog copy', details)
  assert(unresolved.length === 0 && removed.length === 0, 'Unresolved warning or removed D-15 disposition logged', details)
  return { da, borrower, ...details }
})

// D-19 web (REQ-023/024): the on-disk `probe-alpha` duplicate (skills folder vs probe-shadow-owner)
// is an out-of-band duplicate → the Skills page banner (AC-021).
const skillIssues = async () => (await gql('{ skillNameIssues { name usedPath ignoredPaths kind } }')).skillNameIssues
const openSkillsPage = async (page) => {
  await page.goto(`${frontUrl}/skills`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Create Skill/ }).first().waitFor({ timeout: 120000 })
  await delay(1000)
}
defineCase('C21', 'AC-021: out-of-band duplicate → amber Skills banner "Some skills share a name…"; Show details lists the used and ignored paths', async (page) => {
  const used = path.join(dataRoot, 'skills', 'probe-alpha')
  const ignored = path.join(dataRoot, 'agents', 'probe-shadow-owner', 'skills', 'probe-alpha')
  const issues = await skillIssues()
  const issue = issues.find((i) => i.name === 'probe-alpha')
  assert(issue?.kind === 'conflict' && await fs.realpath(issue.usedPath) === await fs.realpath(used) && issue.ignoredPaths.length === 1 && await fs.realpath(issue.ignoredPaths[0]) === await fs.realpath(ignored), 'skillNameIssues wrong', issues)
  await openSkillsPage(page)
  const banner = page.locator('[data-testid="skill-name-issues-banner"]')
  await banner.waitFor({ timeout: 30000 })
  const bannerText = await banner.innerText()
  assert(/Some skills share a name\. AutoByteus uses one copy per name\./.test(bannerText), 'Banner copy wrong', bannerText)
  await page.locator('[data-testid="skill-name-issues-toggle"]').click()
  const row = page.locator('[data-testid="skill-name-issue-conflict-probe-alpha"]')
  await row.waitFor({ timeout: 10000 })
  const rowText = await row.innerText()
  const rowTitles = await row.locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')))
  const shown = `${rowText}\n${rowTitles.join('\n')}`
  await page.screenshot({ path: path.join(outDir, 'C21-skills-banner-details.png') })
  const bg = await banner.evaluate((e) => getComputedStyle(e).backgroundColor)
  assert(/Rename or remove one copy\./.test(rowText) && shown.includes(issue.usedPath) && shown.includes(issue.ignoredPaths[0]), 'Details do not list both paths', { rowText, rowTitles })
  return { issue, bannerText, background: bg }
})

const conflictDialog = (page) => page.locator('[data-testid="skill-name-conflict-dialog"]')
const readConflictRows = async (page) => {
  await conflictDialog(page).waitFor({ timeout: 30000 })
  const rows = await page.locator('[data-testid^="skill-name-conflict-"]').evaluateAll((els) => els
    .filter((e) => !['skill-name-conflict-dialog', 'skill-name-conflict-rows', 'skill-name-conflict-ok'].includes(e.getAttribute('data-testid')))
    .map((e) => ({ id: e.getAttribute('data-testid'), text: e.innerText, titles: [...e.querySelectorAll('[title]')].map((t) => t.getAttribute('title')) })))
  return { title: await conflictDialog(page).innerText(), rows }
}
const rowHas = (row, p) => row.text.includes(p) || row.titles.includes(p)
defineCase('C22', 'AC-020 UI: add folder / Create skill / package import / package reload with a duplicate → "Duplicate skill names" pop-up with both paths, nothing changes; tier-4 duplicate accepted with the "Ignored N skills…" toast', async (page) => {
  const out = {}
  const bundledPath = path.join(dataRoot, 'agents', 'probe-bundle-owner', 'skills', 'probe-bundled')
  // (a) Sources → Add Folder with a duplicate of the bundled skill.
  const incomingFolder = path.join(ownedRoot, 'incoming-skills')
  await writeSkill(path.join(incomingFolder, 'probe-bundled'), 'probe-bundled', 'Incoming duplicate', 'INCOMING')
  await writeSkill(path.join(incomingFolder, 'incoming-unique'), 'incoming-unique', 'Unique', 'UNIQUE')
  const sourcesBefore = (await gql('{ skillSources { path } }')).skillSources.map((s) => s.path)
  await openSkillsPage(page)
  await page.locator('button[title="Manage Skill Sources"]').click()
  await page.locator('input[placeholder="/absolute/path/to/skills/folder"]').fill(incomingFolder)
  await page.getByRole('button', { name: 'Add Folder' }).click()
  out.addFolder = await readConflictRows(page)
  await page.screenshot({ path: path.join(outDir, 'C22a-add-folder-conflict.png') })
  const addRow = out.addFolder.rows.find((r) => r.id === 'skill-name-conflict-probe-bundled')
  assert(/Duplicate skill names/.test(out.addFolder.title) && addRow && rowHas(addRow, bundledPath) && rowHas(addRow, path.join(incomingFolder, 'probe-bundled')), 'Add folder pop-up wrong', out.addFolder)
  await page.locator('[data-testid="skill-name-conflict-ok"]').click()
  await conflictDialog(page).waitFor({ state: 'detached', timeout: 10000 })
  const sourcesAfter = (await gql('{ skillSources { path } }')).skillSources.map((s) => s.path)
  assert(JSON.stringify(sourcesAfter) === JSON.stringify(sourcesBefore), 'Skill sources changed after a rejected add', { sourcesBefore, sourcesAfter })
  await page.keyboard.press('Escape')
  // (b) Create Skill with the name of the bundled skill.
  await openSkillsPage(page)
  await page.getByRole('button', { name: /Create Skill/ }).first().click()
  await page.locator('.dialog input[type="text"]').first().fill('probe-bundled')
  await page.locator('.dialog textarea').first().fill('Duplicate by name')
  await page.locator('.dialog textarea').nth(1).fill('Body')
  await page.locator('.dialog-footer button', { hasText: 'Create Skill' }).click()
  out.create = await readConflictRows(page)
  await page.screenshot({ path: path.join(outDir, 'C22b-create-skill-conflict.png') })
  const createRow = out.create.rows.find((r) => r.id === 'skill-name-conflict-probe-bundled')
  assert(createRow && rowHas(createRow, bundledPath), 'Create skill pop-up wrong', out.create)
  await page.locator('[data-testid="skill-name-conflict-ok"]').click()
  assert(await page.locator('.dialog input[type="text"]').first().inputValue() === 'probe-bundled', 'Create dialog closed or lost the name after OK')
  assert(!existsSync(path.join(dataRoot, 'skills', 'probe-bundled')), 'A skill folder was created despite the conflict')
  // (c) Settings → Agent Packages → import a local package that duplicates probe-alpha.
  const dupPackage = path.join(ownedRoot, 'dup-package')
  await fs.mkdir(path.join(dupPackage, 'agents', 'dup-helper'), { recursive: true })
  await fs.writeFile(path.join(dupPackage, 'agents', 'dup-helper', 'agent.md'), '---\nname: Dup Helper\ndescription: dup\nrole: Helper\n---\n\nReply briefly.\n')
  await writeSkill(path.join(dupPackage, 'agents', 'dup-helper', 'skills', 'probe-alpha'), 'probe-alpha', 'Package duplicate', 'PKG-DUP')
  const openPackages = async () => {
    await page.goto(`${frontUrl}/settings`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="settings-nav-agent-packages"]').click()
    await page.locator('[data-testid="agent-package-source-input"]').waitFor({ timeout: 60000 })
  }
  await openPackages()
  await page.locator('[data-testid="agent-package-source-input"]').fill(dupPackage)
  await page.locator('[data-testid="agent-package-import-button"]').click()
  out.importPkg = await readConflictRows(page)
  await page.screenshot({ path: path.join(outDir, 'C22c-package-import-conflict.png') })
  const importRow = out.importPkg.rows.find((r) => r.id === 'skill-name-conflict-probe-alpha')
  assert(importRow && rowHas(importRow, path.join(dataRoot, 'skills', 'probe-alpha')) && rowHas(importRow, path.join(dupPackage, 'agents', 'dup-helper', 'skills', 'probe-alpha')), 'Import pop-up wrong', out.importPkg)
  await page.locator('[data-testid="skill-name-conflict-ok"]').click()
  const packages = (await gql('{ agentPackages { packageId path } }')).agentPackages
  assert(!packages.some((p) => p.path === dupPackage), 'Rejected package was registered', packages)
  // (d) R-3: a clean package, then an out-of-band duplicate, then Reload → pop-up; registration kept.
  const reloadPackage = path.join(ownedRoot, 'reload-package')
  await fs.mkdir(path.join(reloadPackage, 'agents', 'rl-helper'), { recursive: true })
  await fs.writeFile(path.join(reloadPackage, 'agents', 'rl-helper', 'agent.md'), '---\nname: Reload Helper\ndescription: reload\nrole: Helper\n---\n\nReply briefly.\n')
  await page.locator('[data-testid="agent-package-source-input"]').fill(reloadPackage)
  await page.locator('[data-testid="agent-package-import-button"]').click()
  const registered = await waitFor('reload package registered', async () => (await gql('{ agentPackages { packageId path } }')).agentPackages.find((p) => p.path === reloadPackage), 30000)
  await writeSkill(path.join(reloadPackage, 'agents', 'rl-helper', 'skills', 'probe-alpha'), 'probe-alpha', 'Pulled duplicate', 'PULLED')
  await page.locator(`[data-testid^="agent-package-reload-button-"]`).last().waitFor({ timeout: 30000 })
  const reloadButtons = page.locator('[data-testid^="agent-package-reload-button-"]')
  const n = await reloadButtons.count()
  let clicked = false
  for (let i = 0; i < n && !clicked; i += 1) {
    const rowText = await reloadButtons.nth(i).locator('xpath=ancestor::*[contains(@data-testid,"agent-package-row-")][1]').innerText().catch(() => '')
    if (rowText.includes('reload-package')) { await reloadButtons.nth(i).click(); clicked = true }
  }
  assert(clicked, 'Reload button for the package not found')
  out.reload = await readConflictRows(page)
  await page.screenshot({ path: path.join(outDir, 'C22d-package-reload-conflict.png') })
  await page.locator('[data-testid="skill-name-conflict-ok"]').click()
  assert((await gql('{ agentPackages { packageId path } }')).agentPackages.some((p) => p.packageId === registered.packageId), 'Rejected reload removed the registration')
  const pulledIssue = (await skillIssues()).find((i) => i.name === 'probe-alpha')
  assert(pulledIssue?.ignoredPaths.some((p) => p.includes('reload-package')), 'Banner data does not list the pulled copy', pulledIssue)
  // (e) Tier 4: add the (owned) Codex default folder that duplicates probe-alpha → accepted + toast.
  if (!ownedCodexHome) { out.tier4 = 'Unavailable: run with --owned-codex-home'; return out }
  const codexSkills = path.join(ownedCodexHome, 'skills')
  await writeSkill(path.join(codexSkills, 'probe-alpha'), 'probe-alpha', 'Stale Codex default copy', 'CODEX-STALE')
  await openSkillsPage(page)
  await page.locator('button[title="Manage Skill Sources"]').click()
  await page.locator('input[placeholder="/absolute/path/to/skills/folder"]').fill(codexSkills)
  await page.getByRole('button', { name: 'Add Folder' }).click()
  const toast = page.getByText(/Ignored 1 skill from the Codex default folder because your own copy takes precedence\./).first()
  await toast.waitFor({ timeout: 30000 })
  await delay(400) // enter transition
  // UF-05 / CR-010: the notice must be readable above the still-open Sources dialog, i.e. the
  // topmost element at the toast's centre belongs to the toast layer.
  const layering = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="toast-container"]')
    const item = [...(container?.querySelectorAll('*') ?? [])].find((e) => /Ignored 1 skill from the Codex default folder/.test(e.textContent ?? '') && e.children.length === 0)
    const box = item?.getBoundingClientRect()
    const top = box ? document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) : null
    const overlay = document.querySelector('.dialog-overlay')
    return {
      toastOnTop: !!(top && container?.contains(top)),
      toastZ: container ? getComputedStyle(container).zIndex : null,
      sourcesDialogOpen: !!overlay && /Manage Skill Sources/.test(overlay.textContent ?? ''),
      overlayZ: overlay ? getComputedStyle(overlay).zIndex : null,
    }
  })
  await page.screenshot({ path: path.join(outDir, 'C22e-tier4-toast.png') })
  assert(layering.sourcesDialogOpen && layering.toastOnTop, 'Tier-4 notice is not the topmost layer above the open Sources dialog (UF-05)', layering)
  assert(await conflictDialog(page).count() === 0, 'Tier-4 add opened the conflict pop-up')
  const t4 = (await skillIssues()).find((i) => i.name === 'probe-alpha' && i.kind === 'shadowed_runtime_default')
  assert(t4 && t4.ignoredPaths.includes(path.join(codexSkills, 'probe-alpha')), 'Tier-4 copy not listed as shadowed', t4)
  assert((await gql('{ skill(name:"probe-alpha"){ rootPath } }')).skill.rootPath === path.join(dataRoot, 'skills', 'probe-alpha'), 'Tier-4 copy took precedence')
  await gql('mutation($p:String!){ removeSkillSource(path:$p){ path } }', { p: codexSkills })
  out.tier4 = { toast: await toast.innerText(), issue: t4, layering }
  return out
})

// DEC-017a (IR-009): Agent Org agents' own skills are in the one catalog. On-disk org
// `probe-skill-org` in the app data root: org agent `org-writer` (skill `org-writer-skill`) and org
// team `org-crew` (shared `org-crew-shared`, team-local `member` with `org-member-skill`).
const ORG_ID = 'probe-skill-org'
const orgOwnedId = (kind, local) => `${kind === 'agent' ? 'agent-org-owned-agent' : 'agent-org-owned-team'}:${encodeURIComponent(ORG_ID)}:${encodeURIComponent(local)}`
const ORG_WRITER_ID = orgOwnedId('agent', 'org-writer')
const ORG_MEMBER_ID = `team-local-agent:${encodeURIComponent(orgOwnedId('agent_team', 'org-crew'))}:member`
const writeProbeOrg = async () => {
  const orgDir = path.join(dataRoot, 'agent-orgs', ORG_ID)
  const writer = path.join(orgDir, 'agents', 'org-writer')
  const crew = path.join(orgDir, 'agent-teams', 'org-crew')
  const member = path.join(crew, 'agents', 'member')
  const agentFiles = async (dir, name, skillNames) => {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${name} probe agent\nrole: Helper\n---\n\nYou are a helper. Follow the user's request exactly and reply briefly.\n`)
    await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames, defaultLaunchConfig: null }, null, 2))
  }
  await agentFiles(writer, 'Org Writer', ['org-writer-skill'])
  await writeSkill(path.join(writer, 'skills', 'org-writer-skill'), 'org-writer-skill', 'Org agent own skill', 'ORG-WRITER-OK')
  await fs.mkdir(crew, { recursive: true })
  await fs.writeFile(path.join(crew, 'team.md'), '---\nname: Org Crew\ndescription: Org team probe\n---\n\nCoordinate briefly.\n')
  await fs.writeFile(path.join(crew, 'team-config.json'), JSON.stringify({ coordinatorMemberName: 'member', members: [{ memberName: 'member', ref: 'member', refType: 'agent', refScope: 'team_local' }], handoffs: [] }, null, 2))
  await writeSkill(path.join(crew, 'skills', 'org-crew-shared'), 'org-crew-shared', 'Org team shared skill', 'ORG-SHARED-OK')
  await agentFiles(member, 'Crew Member', ['org-member-skill', 'org-crew-shared'])
  await writeSkill(path.join(member, 'skills', 'org-member-skill'), 'org-member-skill', 'Org team-local agent skill', 'ORG-MEMBER-OK')
  await fs.writeFile(path.join(orgDir, 'org-config.json'), JSON.stringify({ avatarUrl: null, members: [
    { memberName: 'org_writer', ref: ORG_WRITER_ID, refType: 'agent', refScope: 'org_local' },
    { memberName: 'org_crew', ref: orgOwnedId('agent_team', 'org-crew'), refType: 'agent_team', refScope: 'org_local' },
  ], handoffs: [], defaultLaunchConfig: null }, null, 2))
  await fs.writeFile(path.join(orgDir, 'org.md'), `---\nname: Probe Skill Org\ndescription: DEC-017a probe org\ncategory: test\n---\n\nReply briefly.\n`)
}
const launchStandalone = async (agentDefinitionId, workspace) => {
  const res = await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: {
    agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: state.model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', runtimeKind: runtime } })
  assert(res.createAgentRun.success, `Launch of ${agentDefinitionId} failed`, res.createAgentRun)
  return res.createAgentRun.runId
}
const askInRunView = async (page, runId, text, marker) => {
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await runInput(page).fill(text)
  await runSend(page).click()
  await waitForReply(page, marker)
}
defineCase('C23', 'DEC-017a: Agent Org agents use their own skills — org skills on the Skills page and in /, org agent and org team-local agent reply with their skill markers, links point to the org folders', async (page) => {
  const orgDir = path.join(dataRoot, 'agent-orgs', ORG_ID)
  const expected = {
    'org-writer-skill': path.join(orgDir, 'agents', 'org-writer', 'skills', 'org-writer-skill'),
    'org-crew-shared': path.join(orgDir, 'agent-teams', 'org-crew', 'skills', 'org-crew-shared'),
    'org-member-skill': path.join(orgDir, 'agent-teams', 'org-crew', 'agents', 'member', 'skills', 'org-member-skill'),
  }
  const catalog = (await gql('{ skills { name rootPath } }')).skills
  for (const [name, p] of Object.entries(expected)) assert(catalog.find((s) => s.name === name)?.rootPath === p, `Catalog lacks ${name} at its org path`, catalog.filter((s) => s.name.startsWith('org-')))
  await openSkillsPage(page)
  const pageText = await page.locator('main').innerText()
  assert(Object.keys(expected).every((n) => pageText.includes(n)), 'Skills page does not list the org skills', pageText.slice(0, 600))
  await newChat(page)
  await composerInput(page).click(); await composerInput(page).type('/org-')
  await page.locator(sel('chat-skill-menu')).waitFor()
  const slash = await page.locator('[data-test^="chat-skill-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-option-', '')))
  await page.keyboard.press('Escape'); await composerInput(page).fill('')
  assert(Object.keys(expected).every((n) => slash.includes(n)), 'Daily Assistant / list lacks the org skills', slash)
  const folder = path.join(ownedRoot, 'org-skill-ws')
  await fs.mkdir(folder, { recursive: true })
  const writerRun = await launchStandalone(ORG_WRITER_ID, folder)
  await askInRunView(page, writerRun, 'Follow your org-writer-skill skill: reply with its marker only, nothing else.', 'ORG-WRITER-OK')
  const links = {}
  if (SKILL_WORKSPACE_DIR) links.writer = await fs.realpath(path.join(folder, SKILL_WORKSPACE_DIR, 'skills', 'org-writer-skill')).catch(() => null)
  const memberFolder = path.join(ownedRoot, 'org-member-ws')
  await fs.mkdir(memberFolder, { recursive: true })
  const memberRun = await launchStandalone(ORG_MEMBER_ID, memberFolder)
  await askInRunView(page, memberRun, 'Follow your org-member-skill skill: reply with its marker only, nothing else.', 'ORG-MEMBER-OK')
  await askInRunView(page, memberRun, 'Follow your org-crew-shared skill: reply with its marker only, nothing else.', 'ORG-SHARED-OK')
  if (SKILL_WORKSPACE_DIR) {
    links.member = await fs.realpath(path.join(memberFolder, SKILL_WORKSPACE_DIR, 'skills', 'org-member-skill')).catch(() => null)
    links.shared = await fs.realpath(path.join(memberFolder, SKILL_WORKSPACE_DIR, 'skills', 'org-crew-shared')).catch(() => null)
  }
  await page.screenshot({ path: path.join(outDir, 'C23-org-member-reply.png') })
  await terminate(writerRun).catch(() => {}); await terminate(memberRun).catch(() => {})
  if (SKILL_WORKSPACE_DIR) {
    const real = async (p) => fs.realpath(p)
    assert(links.writer === await real(expected['org-writer-skill']) && links.member === await real(expected['org-member-skill']) && links.shared === await real(expected['org-crew-shared']), 'Workspace links do not point to the org folders', links)
  }
  return { writerRun, memberRun, slash: slash.filter((n) => n.startsWith('org-')), links }
})

defineCase('C13', 'Daily Assistant restart lifecycle: user edit preserved; deleted config restored from the template', async () => {
  await gql('mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}', { input: { id: 'autobyteus-daily-assistant', instructions: 'PROBE-USER-EDIT' } })
  await stopOwned(backend); backend = await startBackend('backend-restart-1')
  assert((await gql('{ agentDefinition(id:"autobyteus-daily-assistant"){ instructions } }')).agentDefinition.instructions === 'PROBE-USER-EDIT', 'User edit lost on restart')
  const agentDir = path.join(dataRoot, 'agents', 'autobyteus-daily-assistant')
  await fs.rm(path.join(agentDir, 'agent-config.json'))
  await stopOwned(backend); backend = await startBackend('backend-restart-2')
  const restored = await fs.readFile(path.join(agentDir, 'agent-config.json'), 'utf8')
  const template = await fs.readFile(path.join(serverDir, 'dist/built-in-agents/templates/daily-assistant/agent-config.json'), 'utf8')
  assert(restored === template, 'Deleted config not restored from the template')
  assert((await gql('{ agentDefinition(id:"autobyteus-daily-assistant"){ instructions skillScope } }')).agentDefinition.instructions === 'PROBE-USER-EDIT', 'agent.md overwritten on re-seed')
  return { restored: true }
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-entry-live-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  if (useOwnedCodexHome) { ownedCodexHome = path.join(await fs.realpath(ownedRoot), 'home', '.codex'); await fs.mkdir(path.join(ownedCodexHome, 'skills'), { recursive: true }) }
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  backendPort = await freePort(); frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  // Fixtures: global skills, a skill bundled in another agent's folder, a skill that gets disabled,
  // and pre-existing agent configs without `skillScope`.
  await writeSkill(path.join(dataRoot, 'skills', 'probe-alpha'), 'probe-alpha', 'Alpha probe skill', 'ALPHA-OK')
  await writeSkill(path.join(dataRoot, 'skills', 'probe-disabled'), 'probe-disabled', 'Must not reach runtimes', 'DISABLED-LEAK')
  await writeAgent('probe-bundle-owner', 'Probe Bundle Owner', ['probe-bundled'])
  await writeSkill(path.join(dataRoot, 'agents', 'probe-bundle-owner', 'skills', 'probe-bundled'), 'probe-bundled', 'Bundled in another agent folder', 'BUNDLED-OK')
  await writeAgent('probe-legacy', 'Probe Legacy', ['probe-alpha'])
  // Configured agent naming a skill it does not own (bundled in probe-bundle-owner): resolves as unresolved.
  await writeAgent('probe-borrower', 'Probe Borrower', ['probe-bundled'])
  // An out-of-band duplicate (D-19): a configured agent's private `probe-alpha` next to the skills-folder
  // copy. The catalog uses the skills-folder copy (tier 1); the private copy is ignored (banner, C21).
  await writeAgent('probe-shadow-owner', 'Probe Shadow Owner', ['probe-alpha'])
  await writeSkill(path.join(dataRoot, 'agents', 'probe-shadow-owner', 'skills', 'probe-alpha'), 'probe-alpha', 'Configured private copy', 'SHADOW-OK')
  await writeProbeOrg()
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  backend = await startBackend('backend')
  await gql('mutation { disableSkill(name: "probe-disabled") { isDisabled } }')
  await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: 'Probe Team', description: 'Chat quick path', instructions: 'Coordinate briefly.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'probe-legacy', refScope: 'SHARED' }, { memberName: 'helper', ref: 'probe-bundle-owner', refScope: 'SHARED' }] } })
  await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: 'Probe Org', description: 'RSK-005', instructions: 'Reply briefly.', members: [{ memberName: 'director', ref: 'probe-legacy', refType: 'AGENT', refScope: 'SHARED' }], handoffs: [] } })
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  for (const c of cases) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const iterations = repeats[c.id] ?? 1
    for (let i = 1; i <= iterations; i += 1) {
      const key = iterations > 1 ? `${c.id}#${i}` : c.id
      const started = Date.now()
      try {
        const details = await c.fn(page, context)
        evidence.cases[key] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
      } catch (error) {
        exitCode = 1
        await page.screenshot({ path: path.join(outDir, `${key.replace('#', '-')}-failure.png`) }).catch(() => {})
        evidence.cases[key] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      }
      console.log(`${key} ${evidence.cases[key].result} ${c.title}${evidence.cases[key].error ? ` — ${evidence.cases[key].error}` : ''}`)
      await fs.writeFile(path.join(outDir, 'chat-entry-live-evidence.json'), JSON.stringify(evidence, null, 2))
    }
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[chat-entry-live] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'chat-entry-live-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
