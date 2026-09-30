#!/usr/bin/env node
// New-chat composer polish probe (ticket chat-composer-polish).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → the real
// Claude Agent SDK model catalog. Everything runs in an owned temp data root on free ports with a
// sanitized environment, so a running desktop app or the user's `~/.autobyteus` data is never touched.
//
// Cases:
//   T01 merged thinking menu at desktop width (AC-001, AC-004, AC-005, REQ-001a/002/003, QR-002)
//   T02 a chat launched at "High" records {thinking_enabled:true, reasoning_effort:'high'} (AC-001)
//   T03 a chat launched Off records Off; in ⚙ run settings an Advanced effort edit turns the
//       Thinking toggle on and the saved config keeps the effort (AC-010, REQ-008)
//   T04 a model without an on/off switch keeps the per-parameter menu (AC-006)
//   T05 workspace search at desktop width with many workspaces (AC-007, AC-008, REQ-005/006/009, QR-001)
//   T06 new-chat layout at 1440×1000 and 1280×700: current padding (`pt-[14vh] pb-10`, set by ticket
//       chat-composer-menus-open-upward, whose own probe proves the exact position), no overlap/clipping (AC-009)
//   T07 narrow (bottom sheet) smoke of both menus
//
// Prerequisites: `pnpm -C autobyteus-server-ts build` (its workspace contract packages need `dist/`,
// e.g. `pnpm -C autobyteus-application-sdk-contracts build`), Google Chrome, and a logged-in `claude` CLI
// (T01–T03). T04 uses the Codex catalog when available (logged-in `codex` CLI); T02/T03 send one
// short message each to a real Claude SDK run.
//
// Usage: pnpm test:e2e:chat-composer-polish [--output-dir test-results/chat-composer-polish]
//        [--model claude-opus-5-5] [--cases T01,T05] [--keep]
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
const serverDir = path.join(path.resolve(webDir, '..'), 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/chat-composer-polish'))
const preferredModel = arg('model', 'claude-opus-5-5')
const keep = process.argv.includes('--keep')
const onlyCases = arg('cases', null)?.split(',') ?? null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const CLAUDE = 'claude_agent_sdk'
const CODEX = 'codex_app_server'

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

let ownedRoot, dataRoot, backendUrl, frontUrl
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const runConfig = async (runId) => (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier llmConfig runtimeKind}}}', { runId })).getAgentRunResumeConfig
const terminate = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })
/** `configSchema` → `{ key: { type, enum, default } }` (parameters list or JSON-schema properties). */
const schemaProps = (schema) => {
  if (!schema) return {}
  if (Array.isArray(schema.parameters)) return Object.fromEntries(schema.parameters.map((p) => [p.name, { type: p.type, enum: p.enum_values ?? p.enumValues ?? p.enum, default: p.default_value }]))
  return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([k, p]) => [k, { type: p.type, enum: p.enum, default: p.default }]))
}
const catalog = async (runtimeKind) => (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier configSchema}}}', { r: runtimeKind }))
  .providerModelCatalogSnapshots.flatMap((s) => s.llmModels).map((m) => ({ id: m.modelIdentifier, props: schemaProps(m.configSchema) }))

// ---------------------------------------------------------------------------------------------
// Page helpers (selectors are the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
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
  await page.locator(sel(`chat-model-option-${model}`)).click()
  await page.locator(sel('chat-thinking-trigger')).waitFor({ timeout: 30000 })
}
/** The chat draft's llmConfig straight from the Pinia store (what a send would launch with). */
const draftConfig = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia
  const store = pinia._s.get('chatDraft')
  if (!store) throw new Error('chatDraft store not registered')
  return JSON.parse(JSON.stringify(store.draft?.context?.config?.llmConfig ?? null))
})
const triggerText = async (page) => (await page.locator(sel('chat-thinking-trigger')).innerText()).trim()
/** Bulb tint: `muted` is the `text-gray-300` class the control applies while thinking is off. */
const bulb = (page) => page.locator(sel('chat-thinking-bulb')).evaluate((e) => ({ muted: e.classList.contains('text-gray-300'), color: getComputedStyle(e).color }))
const openThinking = async (page) => {
  if (!(await page.locator(sel('chat-thinking-menu')).isVisible().catch(() => false))) await page.locator(sel('chat-thinking-trigger')).click()
  await page.locator(sel('chat-thinking-menu')).waitFor()
}
/** Menu snapshot: primary items with aria-checked, parameter groups, geometry and positioning. */
const thinkingMenu = (page) => page.locator(sel('chat-thinking-menu')).evaluate((menu) => {
  const items = [...menu.querySelectorAll('[role="menuitemradio"]')].map((e) => ({ test: e.getAttribute('data-test'), label: e.innerText.trim(), checked: e.getAttribute('aria-checked') }))
  const r = menu.getBoundingClientRect()
  return { items, text: menu.innerText, position: getComputedStyle(menu).position, box: { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right }, separator: menu.querySelectorAll('[role="separator"]').length }
})
const primary = (m) => m.items.filter((i) => i.test.startsWith('chat-thinking-option-primary-'))
const insideViewport = (box, vp) => box.x >= 0 && box.y >= 0 && box.right <= vp.width + 0.5 && box.bottom <= vp.height + 0.5
const choosePrimary = async (page, id) => {
  await openThinking(page)
  await page.locator(sel(`chat-thinking-option-primary-${id}`)).click()
  await page.locator(sel('chat-thinking-menu')).waitFor({ state: 'detached' })
}
const send = async (page, text) => {
  const input = page.locator(`${sel('chat-composer')} textarea`).first()
  await input.click(); await input.fill(text)
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  return new URL(page.url()).searchParams.get('id')
}

const state = { claudeModel: null, effortLevels: [], runs: [] }
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('T01', 'Claude SDK merged thinking menu at desktop width: Off state, pick High, Off, Medium, Off→Medium (A-1)', async (page) => {
  const models = (await catalog(CLAUDE)).filter((m) => m.props.thinking_enabled && Array.isArray(m.props.reasoning_effort?.enum) && m.props.reasoning_effort.enum.length)
  assert(models.length, 'No Claude SDK model with thinking_enabled + reasoning_effort in the catalog')
  const model = models.find((m) => m.id === preferredModel) ?? models[0]
  state.claudeModel = model.id; state.effortLevels = model.props.reasoning_effort.enum
  assert(state.effortLevels.includes('high') && state.effortLevels.includes('medium'), 'Effort list lacks high/medium', state.effortLevels)
  const vp = page.viewportSize()
  await newChat(page)
  await pickModel(page, CLAUDE, model.id)
  const initial = { trigger: await triggerText(page), bulb: await bulb(page), draft: await draftConfig(page) }
  assert(initial.trigger === 'Off' && initial.bulb.muted, 'AC-004: fresh trigger is not Off with a muted bulb', initial)
  assert(initial.draft?.thinking_enabled === false, 'Fresh draft does not record thinking off', initial)
  await openThinking(page)
  const off = await thinkingMenu(page)
  const ids = primary(off).map((i) => i.test.replace('chat-thinking-option-primary-', ''))
  assert(eq(ids, ['off', ...state.effortLevels]), 'AC-001: merged list is not Off · effort levels', ids)
  assert(off.items.every((i) => i.test.startsWith('chat-thinking-option-primary-')), 'Removed two-group menu still rendered (thinking_enabled / reasoning_effort groups)', off.items)
  assert(!/Reasoning effort|Thinking enabled/i.test(off.text), 'Old group captions still shown', off.text)
  assert(eq(off.items.filter((i) => i.checked === 'true').map((i) => i.test), ['chat-thinking-option-primary-off']), 'AC-004/REQ-002: only Off must be checked while off', off.items)
  assert(off.position === 'absolute' && Math.round(off.box.w) === 176 && insideViewport(off.box, vp), 'Desktop popover is not an anchored w-44 menu inside the viewport', off)
  await page.screenshot({ path: path.join(outDir, 'T01-menu-off-1440.png') })
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
  await page.locator(sel('chat-thinking-option-primary-high')).click()
  const high = { trigger: await triggerText(page), bulb: await bulb(page), draft: await draftConfig(page) }
  assert(high.trigger === 'High' && !high.bulb.muted && high.bulb.color !== initial.bulb.color, 'AC-001/REQ-003: trigger not "High" with an active bulb', high)
  assert(high.draft?.thinking_enabled === true && high.draft?.reasoning_effort === 'high', 'AC-001: draft llmConfig not {thinking_enabled:true, reasoning_effort:high}', high)
  await openThinking(page)
  const highMenu = await thinkingMenu(page)
  assert(eq(highMenu.items.filter((i) => i.checked === 'true').map((i) => i.test), ['chat-thinking-option-primary-high']), 'REQ-002: only High must be checked', highMenu.items)
  await page.screenshot({ path: path.join(outDir, 'T01-menu-high-1440.png') })
  await page.keyboard.press('Escape')
  await choosePrimary(page, 'off')
  const offAgain = { trigger: await triggerText(page), bulb: await bulb(page), draft: await draftConfig(page) }
  assert(offAgain.trigger === 'Off' && offAgain.bulb.muted && offAgain.bulb.color === initial.bulb.color && offAgain.draft?.thinking_enabled === false, 'AC-005: Off did not turn thinking off in one action', offAgain)
  await choosePrimary(page, 'medium')
  const medium = { trigger: await triggerText(page), draft: await draftConfig(page) }
  assert(medium.trigger === 'Medium' && medium.draft?.thinking_enabled === true && medium.draft?.reasoning_effort === 'medium', 'AC-005: Medium after Off did not re-enable at medium', medium)
  // A-1: stored {thinking_enabled:false, reasoning_effort:'medium'} and re-picking Medium must still enable.
  await choosePrimary(page, 'off')
  const storedOffMedium = await draftConfig(page)
  assert(storedOffMedium?.thinking_enabled === false && storedOffMedium?.reasoning_effort === 'medium', 'Setup for A-1 failed', storedOffMedium)
  await choosePrimary(page, 'medium')
  const repick = { trigger: await triggerText(page), draft: await draftConfig(page) }
  assert(repick.trigger === 'Medium' && repick.draft?.thinking_enabled === true, 'A-1: re-picking the stored effort while Off left thinking off', repick)
  return { model: model.id, effortLevels: state.effortLevels, initial, openFocus: focused, offMenu: { ids, box: off.box, position: off.position }, high, offAgain, medium, storedOffMedium, repick }
})

defineCase('T02', 'Launch a chat at High: the created run records thinking_enabled:true + reasoning_effort:high (AC-001)', async (page) => {
  assert(state.claudeModel, 'T01 must select a Claude SDK model first')
  await newChat(page)
  await pickModel(page, CLAUDE, state.claudeModel)
  await choosePrimary(page, 'high')
  const draft = await draftConfig(page)
  const runId = await send(page, 'Reply with the single word OK and nothing else.')
  state.runs.push(runId)
  const cfg = await runConfig(runId)
  const recorded = cfg.metadataConfig.llmConfig
  assert(cfg.metadataConfig.runtimeKind === CLAUDE && cfg.metadataConfig.llmModelIdentifier === state.claudeModel, 'Run launched with an unexpected runtime/model', cfg)
  assert(recorded?.thinking_enabled === true && recorded?.reasoning_effort === 'high', 'AC-001: recorded run llmConfig is not thinking on at high', { draft, recorded })
  const reply = await page.waitForFunction(() => /\bOK\b/.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? ''), null, { timeout: 180000 }).then(() => true).catch(() => false)
  await page.screenshot({ path: path.join(outDir, 'T02-run-high.png') })
  await terminate(runId).catch(() => {})
  return { runId, draft, recorded, runtimeReplied: reply }
})

defineCase('T03', 'Launch Off → recorded Off → ⚙ run settings: Advanced effort edit turns Thinking on → save keeps effort (AC-010)', async (page) => {
  assert(state.claudeModel, 'T01 must select a Claude SDK model first')
  await newChat(page)
  await pickModel(page, CLAUDE, state.claudeModel)
  assert(await triggerText(page) === 'Off', 'Fresh chat is not Off')
  const runId = await send(page, 'Reply with the single word OK and nothing else.')
  state.runs.push(runId)
  const recordedOff = (await runConfig(runId)).metadataConfig.llmConfig
  assert(recordedOff?.thinking_enabled === false, 'Off chat did not record thinking_enabled:false', recordedOff)
  await page.waitForFunction(() => /\bOK\b/.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? ''), null, { timeout: 180000 }).catch(() => {})
  await terminate(runId)
  await waitFor('run inactive', async () => !(await runConfig(runId)).isActive, 60000, 500)
  await page.goto(`${frontUrl}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('run-config-back-to-events')).waitFor({ timeout: 30000 })
  // The Thinking toggle (ModelConfigBasic), not the auto-approve switch.
  const toggle = page.locator('main button').filter({ has: page.locator('span.sr-only', { hasText: /^Use setting$/ }) }).first()
  const toggleOn = async () => /bg-blue-600/.test((await toggle.getAttribute('class')) ?? '')
  // Rendered state after the 200ms colour/knob transition: background colour and knob offset.
  const rendered = () => toggle.evaluate((b) => ({ background: getComputedStyle(b).backgroundColor, knobX: new DOMMatrix(getComputedStyle(b.querySelector('span[aria-hidden="true"]')).transform).m41 }))
  await toggle.waitFor({ timeout: 30000 })
  await delay(600)
  const offRendered = await rendered()
  assert(!(await toggleOn()) && offRendered.knobX === 0, 'Persisted Off config does not read as Off in run settings', { recordedOff, offRendered })
  const effort = page.locator('main select[id$="reasoning_effort"]').first()
  if (!(await effort.isVisible().catch(() => false))) await page.locator('main [data-testid="advanced-params-toggle"]').first().click()
  await effort.waitFor({ timeout: 15000 })
  const before = await effort.inputValue()
  const target = before === 'high' ? 'low' : 'high'
  await effort.selectOption(target)
  await waitFor('toggle on', toggleOn, 10000, 100).catch(() => {})
  await delay(600)
  const save = page.locator(sel('save-existing-model-config'))
  const after = { toggleOn: await toggleOn(), effort: await effort.inputValue(), rendered: await rendered(), saveEnabled: await save.isEnabled() }
  await page.screenshot({ path: path.join(outDir, 'T03-run-settings-after-edit.png') })
  assert(after.toggleOn && after.effort === target && after.rendered.knobX > 0 && after.rendered.background !== offRendered.background, 'AC-010: Advanced effort edit did not turn Thinking on (rendered) and keep the effort', { before, target, offRendered, after })
  assert(after.saveEnabled, 'Run settings Save not enabled after the edit', after)
  await save.click()
  const saved = await waitFor('saved config', async () => { const c = (await runConfig(runId)).metadataConfig.llmConfig; return c?.thinking_enabled === true ? c : null }, 30000, 500)
    .catch(async () => (await runConfig(runId)).metadataConfig.llmConfig)
  assert(saved?.thinking_enabled === true && saved?.reasoning_effort === target, 'AC-010: saved run llmConfig lacks thinking on with the chosen effort', saved)
  return { runId, recordedOff, offRendered, before, target, after, saved }
})

defineCase('T04', 'A model without an on/off switch keeps the per-parameter thinking menu (AC-006)', async (page) => {
  const candidates = []
  for (const runtimeKind of [CODEX, CLAUDE]) {
    const models = await catalog(runtimeKind).catch(() => [])
    for (const m of models) if (!m.props.thinking_enabled && !m.props.thinking_type && Object.keys(m.props).some((k) => ['reasoning_effort', 'reasoning_summary', 'thinking_level', 'include_thoughts'].includes(k))) candidates.push({ runtimeKind, ...m })
  }
  assert(candidates.length, 'No non-switch thinking model available in the Codex/Claude catalogs')
  const pick = candidates[0]
  await newChat(page)
  await pickModel(page, pick.runtimeKind, pick.id)
  const before = { trigger: await triggerText(page), draft: await draftConfig(page) }
  await openThinking(page)
  const menu = await thinkingMenu(page)
  assert(menu.items.length && menu.items.every((i) => !i.test.startsWith('chat-thinking-option-primary-')), 'AC-006: non-switch schema shows the merged list', menu.items)
  const effortItems = menu.items.filter((i) => i.test.startsWith('chat-thinking-option-reasoning_effort-'))
  let after = null
  if (effortItems.length) {
    const target = effortItems.find((i) => i.checked !== 'true') ?? effortItems[0]
    await page.locator(sel(target.test)).click()
    after = { trigger: await triggerText(page), draft: await draftConfig(page), picked: target.test.replace('chat-thinking-option-reasoning_effort-', '') }
    const changed = Object.keys({ ...(before.draft ?? {}), ...(after.draft ?? {}) }).filter((k) => !eq(before.draft?.[k], after.draft?.[k]))
    assert(eq(changed, ['reasoning_effort']) && after.draft.reasoning_effort === after.picked, 'AC-006: parameters-mode pick changed more than the picked key', { before, after, changed })
  } else {
    await page.keyboard.press('Escape')
  }
  return { runtimeKind: pick.runtimeKind, model: pick.id, keys: Object.keys(pick.props), before, items: menu.items.map((i) => i.test), after }
})

const WORKSPACES = ['alpha-notes', 'autobyteus_mcps', 'MCPS-tools', 'beta-site', 'gamma-api', 'delta-infra', 'epsilon-docs', 'zeta-mobile', 'eta-data', 'theta-ml', 'iota-web', 'kappa-cli', 'lambda-sdk', 'notes']
defineCase('T05', 'Workspace search at desktop width with 14 workspaces: focus, filter, path, empty state, keys, IME guard, Escape, reset (AC-007, AC-008)', async (page) => {
  const vp = page.viewportSize()
  await newChat(page)
  const trigger = page.locator(sel('chat-workspace-trigger'))
  const search = page.locator(sel('chat-workspace-search'))
  const menuSel = sel('chat-workspace-menu')
  const optionTests = () => page.locator(`${menuSel} [data-option]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test') ?? e.innerText.split('\n')[0]))
  const optionNames = () => page.locator(`${menuSel} [data-option]`).evaluateAll((els) => els.map((e) => e.querySelector('.truncate')?.textContent.trim()))
  const active = () => page.evaluate(() => document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName)
  const selectedName = async () => (await trigger.innerText()).trim()
  const initialSelection = await selectedName()
  await trigger.click()
  await page.locator(menuSel).waitFor()
  const open = await page.locator(menuSel).evaluate((m) => {
    const r = m.getBoundingClientRect(); const list = m.querySelector('[role="listbox"]'); const input = m.querySelector('[data-test="chat-workspace-search"]')
    return { position: getComputedStyle(m).position, box: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }, scrolls: list.scrollHeight > list.clientHeight, inputInListbox: list.contains(input), placeholder: input.placeholder, ariaLabel: input.getAttribute('aria-label'), options: list.querySelectorAll('[role="option"]').length }
  })
  const openFocus = await active()
  assert(openFocus === 'chat-workspace-search', 'REQ-005: search input not focused on open', openFocus)
  assert(open.placeholder === 'Search workspaces' && open.ariaLabel === 'Search workspaces' && !open.inputInListbox, 'REQ-009/QR-001: search row label/placement wrong', open)
  assert(open.options === WORKSPACES.length + 1, 'Empty query must list temp + every workspace', open)
  assert(open.position === 'absolute' && Math.round(open.box.w) === 384 && insideViewport(open.box, vp), 'Desktop workspace menu not an anchored w-96 popover inside the viewport', open)
  await page.screenshot({ path: path.join(outDir, 'T05-workspace-open-1440.png') })
  await search.fill('mcps')
  const mcps = await optionNames()
  assert(eq(mcps.sort(), ['MCPS-tools', 'autobyteus_mcps'].sort()) && !(await page.locator(sel('chat-workspace-option-temp')).count()), 'AC-007: "mcps" filter wrong or temp not hidden', mcps)
  await page.screenshot({ path: path.join(outDir, 'T05-workspace-mcps-1440.png') })
  await search.fill('NESTED-DIR')
  const byPath = await optionNames()
  assert(eq(byPath, ['lambda-sdk']), 'REQ-005: case-insensitive path match failed', byPath)
  await search.fill('temp')
  const temp = await optionTests()
  assert(temp.includes('chat-workspace-option-temp'), 'Temp workspace not shown when it matches', temp)
  await search.fill('zzz')
  const empty = (await page.locator(sel('chat-workspace-search-empty')).innerText()).trim()
  const openFolderVisible = await page.locator(sel('chat-workspace-open-folder')).isVisible()
  const headingShown = /Your workspaces/i.test(await page.locator(menuSel).innerText())
  assert(empty === 'No workspaces match “zzz”' && openFolderVisible && !headingShown && (await optionTests()).length === 0, 'AC-007: empty state / open-folder / heading wrong', { empty, openFolderVisible, headingShown })
  await page.screenshot({ path: path.join(outDir, 'T05-workspace-empty-1440.png') })
  // IME: Enter while composing must not pick.
  await search.fill('notes')
  await search.evaluate((input) => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true, cancelable: true })))
  const imeStillOpen = await page.locator(menuSel).isVisible()
  assert(imeStillOpen && (await selectedName()) === initialSelection, 'IME Enter picked a workspace', { imeStillOpen })
  // ArrowDown into results, ArrowDown, ArrowUp, ArrowUp from the first option returns to the input.
  const notesOrder = await optionNames()
  await search.press('ArrowDown')
  const k1 = await active()
  await page.keyboard.press('ArrowDown'); const k2 = await active()
  await page.keyboard.press('ArrowUp'); const k3 = await active()
  await page.keyboard.press('ArrowUp'); const k4 = await active()
  assert(eq(notesOrder, ['alpha-notes', 'notes']) && k1 === 'chat-workspace-option-' + (await wsId('alpha-notes')) && k2 === 'chat-workspace-option-' + (await wsId('notes')) && k3 === k1 && k4 === 'chat-workspace-search', 'AC-008: arrow-key focus path wrong', { notesOrder, k1, k2, k3, k4 })
  await search.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await page.locator(menuSel).waitFor({ state: 'detached' })
  const picked = await selectedName()
  const hint = (await page.locator(sel('chat-new-hint')).innerText()).trim()
  assert(picked === 'notes' && /notes/.test(hint), 'AC-008: ArrowDown+Enter did not select the highlighted workspace', { picked, hint })
  // Reopen: query reset; Escape closes without changing the selection.
  await trigger.click(); await page.locator(menuSel).waitFor()
  const reopenedQuery = await search.inputValue()
  await search.fill('beta'); await page.keyboard.press('Escape')
  await page.locator(menuSel).waitFor({ state: 'detached' })
  const afterEscape = await selectedName()
  assert(reopenedQuery === '' && afterEscape === 'notes', 'AC-008: reopen did not reset the query or Escape changed the selection', { reopenedQuery, afterEscape })
  // Enter in the search box picks the first match.
  await trigger.click(); await page.locator(menuSel).waitFor()
  await search.fill('gamma'); await search.press('Enter')
  await page.locator(menuSel).waitFor({ state: 'detached' })
  const enterPick = await selectedName()
  assert(enterPick === 'gamma-api', 'REQ-006: Enter in search did not pick the first match', enterPick)
  // Open another folder still works from a filtered menu.
  await trigger.click(); await search.fill('zzz'); await page.locator(sel('chat-workspace-open-folder')).click()
  const folderForm = await page.locator(sel('chat-workspace-folder-form')).isVisible()
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
  assert(folderForm, 'Open another folder… not usable after filtering')
  return { initialSelection, open, mcps, byPath, empty, notesOrder, keys: { k1, k2, k3, k4 }, picked, hint, reopenedQuery, afterEscape, enterPick, folderForm }
})
const wsIds = {}
const wsId = async (name) => wsIds[name]

defineCase('T06', 'Layout at 1440×1000 and 1280×700: pt-[14vh] pb-10; no overlap/clipping; menus inside viewport (AC-009)', async (page) => {
  const results = {}
  for (const vp of [{ width: 1440, height: 1000 }, { width: 1280, height: 700 }]) {
    await page.setViewportSize(vp)
    await newChat(page)
    // The preselected model's thinking control appears once its runtime catalog has loaded
    // (existing behavior); measure the settled footer, and record how long that took.
    const loadStarted = Date.now()
    const thinkingTriggerSettledMs = state.claudeModel
      ? await page.locator(sel('chat-thinking-trigger')).waitFor({ timeout: 60000 }).then(() => Date.now() - loadStarted).catch(() => null)
      : null
    const measure = () => page.evaluate(() => {
      const root = document.querySelector('[data-test="chat-new"]'); const inner = root.firstElementChild
      const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height } }
      const heading = box(inner.querySelector('h1')); const subtitle = box(inner.querySelector('[data-test="chat-new-subtitle"]'))
      const composer = box(inner.querySelector('[data-test="chat-composer"]')); const hint = box(inner.querySelector('[data-test="chat-new-hint"]'))
      const area = box(root)
      return { paddingBottom: parseFloat(getComputedStyle(inner).paddingBottom), paddingTop: parseFloat(getComputedStyle(inner).paddingTop), heading, subtitle, composer, hint, area, overflow: root.scrollHeight > root.clientHeight + 1, blockCenter: (heading.top + hint.bottom) / 2, areaCenter: (area.top + area.bottom) / 2 }
    })
    const now = await measure()
    const order = [now.heading, now.subtitle, now.composer, now.hint]
    const noOverlap = order.every((b, i) => i === 0 || b.top >= order[i - 1].bottom - 0.5)
    const inside = order.every((b) => b.top >= now.area.top - 0.5 && b.bottom <= now.area.bottom + 0.5)
    assert(Math.abs(now.paddingTop - 0.14 * vp.height) < 1 && now.paddingBottom === 40, 'New-chat padding is not pt-[14vh] pb-10', now)
    assert(noOverlap && inside && !now.overflow, 'AC-009: composer block overlaps, is clipped or overflows', now)
    await page.screenshot({ path: path.join(outDir, `T06-layout-${vp.width}x${vp.height}.png`) })
    // Popovers still fit at this height.
    await page.locator(sel('chat-workspace-trigger')).click()
    const wsBox = await page.locator(sel('chat-workspace-menu')).evaluate((m) => { const r = m.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom } })
    await page.screenshot({ path: path.join(outDir, `T06-workspace-menu-${vp.width}x${vp.height}.png`) })
    await page.keyboard.press('Escape')
    let thBox = null
    if (state.claudeModel) {
      await pickModel(page, CLAUDE, state.claudeModel)
      await openThinking(page)
      thBox = (await thinkingMenu(page)).box
      await page.screenshot({ path: path.join(outDir, `T06-thinking-menu-${vp.width}x${vp.height}.png`) })
      await page.keyboard.press('Escape')
    }
    assert(insideViewport(wsBox, vp) && (!thBox || insideViewport(thBox, vp)), 'AC-009: a composer menu is clipped by the viewport', { wsBox, thBox })
    results[`${vp.width}x${vp.height}`] = {
      thinkingTriggerSettledMs, paddingTop: now.paddingTop, paddingBottom: now.paddingBottom, composerTop: now.composer.top,
      blockCenterMinusAreaCenter: +(now.blockCenter - now.areaCenter).toFixed(1), noOverlap, inside, overflow: now.overflow, wsBox, thBox,
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  return results
})

defineCase('T07', 'Narrow bottom sheet (413×738): merged thinking list and workspace search still work', async (page) => {
  await page.setViewportSize({ width: 413, height: 738 })
  await newChat(page)
  let thinking = null
  if (state.claudeModel) {
    await pickModel(page, CLAUDE, state.claudeModel)
    await openThinking(page)
    const m = await thinkingMenu(page)
    thinking = { position: m.position, ids: primary(m).map((i) => i.test.replace('chat-thinking-option-primary-', '')), box: m.box }
    assert(m.position === 'fixed' && thinking.ids[0] === 'off' && thinking.ids.length === state.effortLevels.length + 1, 'Narrow merged menu wrong', thinking)
    await page.locator(sel('chat-thinking-option-primary-low')).click()
    assert(await triggerText(page) === 'Low', 'Narrow pick did not update the trigger')
  }
  await page.locator(sel('chat-workspace-trigger')).click()
  await page.locator(sel('chat-workspace-search')).fill('kappa')
  const names = await page.locator(`${sel('chat-workspace-menu')} [data-option]`).evaluateAll((els) => els.map((e) => e.querySelector('.truncate')?.textContent.trim()))
  const focus = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
  await page.screenshot({ path: path.join(outDir, 'T07-narrow-workspace.png') })
  await page.keyboard.press('Escape')
  assert(eq(names, ['kappa-cli']) && focus === 'chat-workspace-search', 'Narrow workspace search wrong', { names, focus })
  await page.setViewportSize({ width: 1440, height: 900 })
  return { thinking, names }
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
let backend, frontend, browser
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-composer-polish-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
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
  // Fixture: 14 user workspaces; "lambda-sdk" lives under a unique path segment for the path match.
  for (const name of WORKSPACES) {
    const dir = name === 'lambda-sdk' ? path.join(ownedRoot, 'workspaces', 'nested-dir', name) : path.join(ownedRoot, 'workspaces', name)
    await fs.mkdir(dir, { recursive: true })
    const ws = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId name}}', { input: { rootPath: dir } })).createWorkspace
    wsIds[name] = ws.workspaceId
  }
  evidence.workspaces = wsIds
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  for (const c of cases) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const started = Date.now()
    try {
      const details = await c.fn(page, context)
      evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`) }).catch(() => {})
      evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      await page.keyboard.press('Escape').catch(() => {})
      await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
    }
    console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
    await fs.writeFile(path.join(outDir, 'chat-composer-polish-evidence.json'), JSON.stringify(evidence, null, 2))
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[chat-composer-polish] ${error.message}`)
} finally {
  for (const runId of state.runs) await terminate(runId).catch(() => {})
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'chat-composer-polish-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
