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
// C14/C15 (D-15 skill-path collisions) need a workspace-link runtime (Codex, Claude); they are
// skipped for other runtimes by leaving them out of `--cases`.
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
const onlyCases = arg('cases', null)?.split(',')
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

let ownedRoot, dataRoot, backend, frontend, browser, backendPort, frontendPort, backendUrl, frontUrl, dbUrl
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
const conversationText = async (page) => (await page.locator(sel('chat-run-view')).innerText()).replace(/SENT TO THE AGENT AS[\s\S]*?(?=\n(?:You|[A-Z]{2})\n)/g, '')
/** Waits for an assistant reply containing `marker` (the user message and header also contain the prompt). */
const waitForReply = (page, marker, timeout = 240000) => page.waitForFunction(({ m }) => {
  const root = document.querySelector('[data-test="chat-run-view"]')
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

const state = { model: null, modelLabel: null, models: [], taggedRunId: null }
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
  const exposure = SKILL_WORKSPACE_DIR ? await waitFor('workspace skill exposure', async () => { const l = await listDir(path.join(dataRoot, 'temp_workspace', SKILL_WORKSPACE_DIR, 'skills')); return l.length ? l : null }, 60000) : null
  if (exposure) assert(exposure.includes('probe-bundled') && !exposure.includes('probe-disabled'), 'ALL_INSTALLED exposure wrong', exposure)
  await page.waitForFunction(() => /ALPHA-OK/.test(document.querySelector('[data-test="chat-run-view"]')?.innerText ?? '') && /BUNDLED-OK/.test(document.querySelector('[data-test="chat-run-view"]')?.innerText ?? ''), null, { timeout: 300000 })
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

defineCase('C05', 'Live run footer: model and thinking locked (REQ-011, UIS-004, VIS-015)', async (page) => {
  await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-run-view')).waitFor({ timeout: 120000 })
  await delay(5000)
  const trigger = page.locator(sel('chat-model-trigger'))
  assert(await trigger.getAttribute('aria-disabled') === 'true', 'Model control not locked while live')
  assert(/Locked while the run is live/.test(await trigger.getAttribute('title') ?? ''), 'Lock tooltip missing')
  assert(await page.locator(`${sel('chat-workspace-trigger')}, ${sel('chat-approval-toggle')}`).count() === 0, 'Workspace/approval controls shown in the run view')
  const schemaModel = state.models.length > 0
  const thinking = await page.locator(sel('chat-thinking-trigger')).count()
  await page.screenshot({ path: path.join(outDir, 'C05-live-locked-footer.png') })
  // Runtimes whose chosen model exposes thinking parameters must show the locked thinking control.
  const cfg = await runConfig(state.taggedRunId)
  if (schemaModel && runtime === 'codex_app_server') assert(thinking === 1, 'Locked thinking control missing on a live run opened fresh (F-01)', { footer: await page.locator(sel('chat-composer-footer')).innerText(), cfg })
  return { thinking, editability: cfg.modelConfigEditability }
})

defineCase('C06', 'Terminate → Offline → runtime-fixed save → reload (D-08) → save → resume uses the saved model', async (page) => {
  const runId = state.taggedRunId
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-run-view')).waitFor({ timeout: 120000 })
  await page.locator(`[data-test="terminate-agent-run"][data-run-id="${runId}"]`).click()
  await page.waitForFunction(() => /Offline/.test(document.querySelector('[data-test="chat-run-status"]')?.innerText ?? ''), null, { timeout: 60000 })
  const alternatives = state.models.filter((m) => m !== state.model)
  assert(alternatives.length >= 2, 'Runtime needs at least three models for the D-08 journey', state.models)
  await page.locator(sel('chat-model-trigger')).click()
  const note = await page.locator(sel('chat-runtime-fixed-note')).innerText()
  assert(/^Runtime fixed · /.test(note), 'Runtime fixed note missing', note)
  await page.locator(sel(`chat-model-option-${alternatives[0]}`)).click()
  await waitFor('first Offline save', async () => (await runConfig(runId)).metadataConfig.llmModelIdentifier === alternatives[0], 30000)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-run-view')).waitFor({ timeout: 120000 })
  await delay(2500)
  await page.locator(sel('chat-model-trigger')).click()
  assert(await page.locator(sel('chat-runtime-fixed-note')).count() === 1, 'Reopened Offline run did not use the persisted mode')
  await page.locator(sel(`chat-model-option-${alternatives[1]}`)).click()
  await waitFor('second Offline save', async () => (await runConfig(runId)).metadataConfig.llmModelIdentifier === alternatives[1], 30000)
  await composerInput(page).fill('Reply with exactly RESUMED-OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await waitForReply(page, 'RESUMED-OK')
  const cfg = await runConfig(runId)
  assert(cfg.isActive && cfg.metadataConfig.llmModelIdentifier === alternatives[1], 'Resume did not use the saved model', cfg)
  assert(await page.locator(sel('chat-model-trigger')).getAttribute('aria-disabled') === 'true', 'Footer not re-locked after resume')
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
    if (!(await composerInput(page).inputValue())) await composerInput(page).fill('Reply with exactly RESENT-OK and nothing else.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const runId = routeRunId(page)
    await waitForReply(page, 'RESENT-OK').catch(async (error) => { throw Object.assign(new Error('Reply did not stream after resend on the temp chat (F-02)'), { details: { runId, status: await page.locator(sel('chat-run-status')).innerText() } }) })
    const cfg = await runConfig(runId)
    assert(cfg.metadataConfig.workspaceRootPath === folder && cfg.metadataConfig.autoExecuteTools === false, 'Folder/Ask first not applied', cfg)
    assert(/Ask first/.test(await page.locator(sel('chat-header-approval')).innerText()), 'Header does not show Ask first')
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
  await composerInput(page).fill('Reply with exactly CATALOG-OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  await waitForReply(page, 'CATALOG-OK')
  return { runId: routeRunId(page) }
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
  await page.locator(sel('chat-run-view')).waitFor({ timeout: 120000 })
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
  await page.screenshot({ path: path.join(outDir, 'C10-team-view.png') })
  return { teamRunId: teamRun.teamRunId, coordinator: teamRun.coordinatorAddress, memberConfig: JSON.parse(configs[0]) }
})

defineCase('C11', 'RSK-005 redirects, missing and unregistered ids, tool strip collapsed', async (page) => {
  const org = await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: 'probe-org', rootConfiguration: { runtimeKind: runtime, llmModelIdentifier: state.model, llmConfig: null, autoExecuteTools: true, skillAccessMode: 'NONE', workspaceRootPath: path.join(dataRoot, 'temp_workspace') }, agentOverrides: [], teamOverrides: [] } })
  assert(org.createAgentOrgRun.success, org.createAgentOrgRun.message)
  const orgRunId = org.createAgentOrgRun.agentOrgRunId
  const push = (to) => page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), to)
  await page.goto(`${frontUrl}/chat?id=${state.taggedRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-run-view')).waitFor({ timeout: 120000 })
  assert(!(await page.getByText('No file selected').first().isVisible().catch(() => false)), 'Right tool panel is open by default in the chat view')
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
    return { sheet: box }
  } finally { await page.close() }
})

// D-15 cases: a configured agent (`probe-shadow-owner`) owns a private `probe-alpha` that shadows the
// global `probe-alpha` the Daily Assistant (ALL_INSTALLED, weak) requests. Only workspace-link runtimes.
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
  const strongError = (await page.locator(sel('chat-run-view')).innerText()).match(/An Error Occurred\s*\n+([^\n]+)/)?.[1] ?? null
  const stat2 = await fs.lstat(owned)
  assert(stat2.isDirectory() && !stat2.isSymbolicLink(), 'User-owned skill folder replaced by the configured run')
  await terminate(daRun).catch(() => {})
  return { daRun, strongRun, strongError, userFolderIntact: true }
})

defineCase('C15', 'D-15 Rule 2: configured launch re-points a weak-held link (V-B), a new Daily Assistant chat skips a strong-held link (V-A), link removed after all terminate (V-E)', async (page) => {
  assert(SKILL_WORKSPACE_DIR, `No workspace skill path for runtime ${runtime}`)
  const folder = path.join(ownedRoot, 'shared-skill-ws')
  await fs.mkdir(folder, { recursive: true })
  const link = path.join(folder, SKILL_WORKSPACE_DIR, 'skills', 'probe-alpha')
  const globalSrc = await fs.realpath(path.join(dataRoot, 'skills', 'probe-alpha'))
  const privateSrc = await fs.realpath(path.join(dataRoot, 'agents', 'probe-shadow-owner', 'skills', 'probe-alpha'))
  const target = async () => fs.realpath(link).catch(() => null)
  const weak1 = await startChat(page, { folder, text: 'Reply with exactly WEAK-ONE-OK and nothing else.' })
  await waitForReply(page, 'WEAK-ONE-OK')
  assert(await target() === globalSrc, 'Weak run did not link the global source', await target())
  // V-B: the configured agent launches next to the live weak holder and takes the link over.
  const strong = await startChat(page, { folder, target: 'probe-shadow-owner', text: 'Reply with exactly STRONG-OK and nothing else.' })
  await waitForReply(page, 'STRONG-OK')
  await dispositionLogged('yielded-to-configured', strong)
  assert(await target() === privateSrc, 'Link not re-pointed to the configured source', await target())
  assert((await runConfig(weak1)).isActive, 'Weak run was stopped by the configured launch')
  // V-A: a new weak chat next to the live strong holder skips its own copy and starts.
  const weak2 = await startChat(page, { folder, text: 'Reply with exactly WEAK-TWO-OK and nothing else.' })
  await waitForReply(page, 'WEAK-TWO-OK')
  await dispositionLogged('skipped-held-by-other-run', weak2)
  assert(await target() === privateSrc, 'Weak run changed the strong-held link', await target())
  // V-E: release weak holders first, then the strong one; the link disappears only at the end.
  await terminate(weak1); await terminate(weak2)
  await delay(2000)
  assert(await target() === privateSrc, 'Link removed while the configured run still holds it')
  await terminate(strong)
  await waitFor('link removal', async () => !(await fs.lstat(link).then(() => true).catch(() => false)), 30000)
  return { weak1, strong, weak2 }
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
  // V-L2: a persisted Claude chat, Offline and reopened after reload: the fixed list and trigger use the same labels.
  await composerInput(page).fill('Reply with exactly LABEL-OK and nothing else.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const claudeRun = routeRunId(page)
  await waitForReply(page, 'LABEL-OK')
  await terminate(claudeRun)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => /Offline/.test(document.querySelector('[data-test="chat-run-status"]')?.innerText ?? ''), null, { timeout: 60000 })
  await delay(2000)
  assert((await trigger.innerText()).split('\n')[0] === pick.label, 'Persisted trigger label differs', await trigger.innerText())
  await trigger.click()
  await page.locator(sel('chat-runtime-fixed-note')).waitFor({ timeout: 60000 })
  const fixedRows = await readModelRows(page, sel('chat-model-menu'))
  const fixedMismatches = rowMismatches(fixedRows, claudeCatalog, 'claude_agent_sdk')
  assert(fixedMismatches.length === 0, 'Runtime-fixed rows do not follow the shared label policy', fixedMismatches.slice(0, 5))
  assert(recommendedFirst(fixedRows), 'Runtime-fixed rows are not recommended-first', fixedRows.map((r) => r.label))
  if (pickModelRecord?.name) {
    const fixedSearch = await searchIds(page, pickModelRecord.name)
    assert(fixedSearch.includes(pick.id), `Fixed-list search "${pickModelRecord.name}" misses ${pick.id}`, fixedSearch)
  }
  await page.keyboard.press('Escape')
  await page.screenshot({ path: path.join(outDir, 'C16-claude-offline-fixed.png') })
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
  // A configured agent whose private `probe-alpha` shadows the global one (D-15 same name, different source).
  await writeAgent('probe-shadow-owner', 'Probe Shadow Owner', ['probe-alpha'])
  await writeSkill(path.join(dataRoot, 'agents', 'probe-shadow-owner', 'skills', 'probe-alpha'), 'probe-alpha', 'Configured private copy', 'SHADOW-OK')
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
