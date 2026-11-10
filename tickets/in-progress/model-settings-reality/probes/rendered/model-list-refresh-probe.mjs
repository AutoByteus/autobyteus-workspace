#!/usr/bin/env node
// Rendered check of the model-picker refresh (autobyteus-9 REQ-010, REQ-011, QR-001, QR-002; AC-010, AC-011).
// Real Nuxt dev + real chat model menu / launch-config picker components + real Pinia stores, in headless Chromium; the
// probe owns the GraphQL boundary so the Claude Agent SDK runtime's list can start offering a new model, answer slowly
// or fail. Run from anywhere:  node <this file> --output-dir <fresh folder>
// Temporary ticket-owned automation (it installs the fixture page under autobyteus-web/pages and removes it on exit).
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../../../../../autobyteus-web')
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const fixturePath = path.join(scriptDir, 'model-list-refresh.page.vue')
const installedPagePath = path.join(webDir, 'pages/api-e2e-model-list-refresh.vue')
const routePath = '/api-e2e-model-list-refresh'
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outputDir = path.resolve(arg('output-dir', path.join(scriptDir, '../../evidence/rendered-model-pickers')))
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ?? ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync))
if (existsSync(path.join(outputDir, 'evidence.json'))) throw new Error(`Refusing to overwrite evidence in ${outputDir}`)
await fs.mkdir(outputDir, { recursive: true })

const evidence = { startedAt: new Date().toISOString(), commit: process.env.PROBE_COMMIT ?? null, scenarios: {}, browserEvents: [], failures: [], cleanup: {} }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const waitFor = async (what, fn, timeout = 30000) => {
  const t0 = Date.now(); let last
  while (Date.now() - t0 < timeout) { try { last = await fn(); if (last) return last } catch {} await delay(100) }
  throw new Error(`Timed out waiting for ${what}; last=${JSON.stringify(last)}`)
}
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})

// ---- the probe-owned catalog boundary -------------------------------------------------------------------------
const owner = (id, name, type) => ({ __typename: 'CatalogProviderObject', id, name, providerType: type, isCustom: false, baseUrl: null, catalogMode: 'STATIC' })
const claudeModel = (id, name, canonical) => ({
  __typename: 'ModelDetail', modelIdentifier: id, name, description: null, value: id, canonicalName: canonical,
  providerId: 'ANTHROPIC', providerName: 'Anthropic', providerType: 'ANTHROPIC', runtime: 'api', hostUrl: null,
  configSchema: { type: 'object', properties: { reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'] } } },
  maxContextTokens: null, activeContextTokens: null, maxInputTokens: null, maxOutputTokens: null, metadataProvenance: null,
  selectionPresentation: { __typename: 'ModelSelectionPresentation', recommended: id === 'opus', aliasOfModelIdentifier: null },
})
const state = {
  claudeModels: [claudeModel('opus', 'Opus', 'claude-opus-5-5'), claudeModel('sonnet', 'Sonnet', 'claude-sonnet-5-5')],
  catalogReads: { claude_agent_sdk: 0, autobyteus: 0 },
  hold: null,            // a promise the next claude read waits for
  failNext: false,
}
const snapshot = (runtimeKind) => ({
  __typename: 'ProviderModelCatalogSnapshotObject', runtimeKind, ownerProvider: owner('ANTHROPIC', 'Anthropic', 'ANTHROPIC'),
  sources: [{ __typename: 'ModelSourceStatusObject', state: 'READY', modelCount: state.claudeModels.length, successfulUnitCount: 1, failedUnitCount: 0, safeMessage: null }],
  llmModels: state.claudeModels, audioModels: [], imageModels: [], videoModels: [],
})
const operationResponse = async (name, variables) => {
  if (name === 'GetRuntimeAvailabilityKinds') return { data: { runtimeAvailabilityKinds: ['claude_agent_sdk', 'codex_app_server'] } }
  if (name === 'GetRuntimeAvailability') return { data: { runtimeAvailability: { __typename: 'RuntimeAvailability', runtimeKind: variables.runtimeKind, enabled: true, reason: null } } }
  if (name === 'GetProviderModelCatalogSnapshots') {
    const runtimeKind = variables.runtimeKind
    if (runtimeKind !== 'claude_agent_sdk') return { data: { providerModelCatalogSnapshots: [] } }
    state.catalogReads.claude_agent_sdk += 1
    if (state.hold) await state.hold
    if (state.failNext) { state.failNext = false; return { errors: [{ message: 'Claude CLI could not list models.' }] } }
    return { data: { providerModelCatalogSnapshots: [snapshot('claude_agent_sdk')] } }
  }
  if (name === 'GetRuntimeCurrentModelDescriptors' || name === 'RuntimeCurrentModelDescriptors') {
    return { data: { runtimeCurrentModelDescriptors: (variables.identifiers ?? []).map((identifier) => ({ __typename: 'RuntimeCurrentModelDescriptorObject', identifier, model: state.claudeModels.find((m) => m.modelIdentifier === identifier) ?? null })) } }
  }
  return { data: {} }
}

let devServer, devLogStream, browser, context, page, pageInstalled = false
const killDev = async () => {
  if (!devServer || devServer.exitCode !== null) return 'not-running'
  try { process.kill(-devServer.pid, 'SIGTERM') } catch { devServer.kill('SIGTERM') }
  for (let i = 0; i < 50 && devServer.exitCode === null; i += 1) await delay(100)
  if (devServer.exitCode === null) { try { process.kill(-devServer.pid, 'SIGKILL') } catch {} }
  return 'terminated'
}
const scenario = async (id, description, fn) => {
  const record = { description, status: 'Running' }
  evidence.scenarios[id] = record
  try { record.details = await fn(); record.status = 'Pass' }
  catch (error) {
    record.status = 'Fail'; record.message = error.message; record.details = error.details
    evidence.failures.push({ id, message: error.message })
    if (page) await page.screenshot({ path: path.join(outputDir, `${id}-failure.png`) }).catch(() => undefined)
  }
  await fs.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
}

try {
  assert(!existsSync(installedPagePath), `Refusing to overwrite ${installedPagePath}`)
  await fs.copyFile(fixturePath, installedPagePath); pageInstalled = true
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  devLogStream = createWriteStream(path.join(outputDir, 'nuxt-dev.log'))
  devServer = spawn('pnpm', ['dev', '--port', String(port)], {
    cwd: webDir, env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9', NUXT_TELEMETRY_DISABLED: '1' },
    detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  devServer.stdout.pipe(devLogStream); devServer.stderr.pipe(devLogStream)
  await waitFor('Nuxt fixture route', async () => { if (devServer.exitCode !== null) throw new Error('nuxt exited'); try { return (await fetch(`${baseUrl}${routePath}`)).ok } catch { return false } }, 240000)

  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] })
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'Etc/UTC' })
  page = await context.newPage()
  page.on('console', (m) => evidence.browserEvents.push({ type: `console:${m.type()}`, text: m.text() }))
  page.on('pageerror', (e) => evidence.browserEvents.push({ type: 'pageerror', text: e.message }))
  await page.route('**/rest/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }))
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, (ws) => ws.send(JSON.stringify({ type: 'connected' })))
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    const cors = { 'access-control-allow-origin': '*' }
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' } }); return }
    try {
      const payload = request.postDataJSON()
      const name = payload.operationName || /(?:query|mutation)\s+(\w+)/.exec(payload.query || '')?.[1] || ''
      const body = await operationResponse(name, payload.variables ?? {})
      await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
    } catch (error) {
      await route.fulfill({ status: 500, contentType: 'application/json', headers: cors, body: JSON.stringify({ errors: [{ message: String(error) }] }) })
    }
  })

  const sel = (t) => `[data-test="${t}"]`
  const rowIds = async (scope) => (await page.locator(`${scope} button[data-test^="chat-model-option-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', ''))))
  const openChatClaude = async () => {
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel('chat-runtime-claude_agent_sdk')).click()
    await page.locator(sel('chat-model-submenu')).waitFor({ state: 'visible' })
  }
  const closeChat = async () => { if (await page.locator(sel('chat-model-menu')).count()) await page.keyboard.press('Escape'); if (await page.locator(sel('chat-model-menu')).count()) await page.locator(sel('chat-model-trigger')).click() }

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('model-list-refresh-probe')).waitFor({ state: 'visible', timeout: 120000 })

  await scenario('R1', 'Chat model menu: opening the runtime list re-reads it in the background; the list stays usable while it reads; a new model appears (AC-010)', async () => {
    await openChatClaude()
    await page.locator(`${sel('chat-model-submenu')} [role="menuitemradio"]`).first().waitFor({ state: 'visible', timeout: 30000 })
    const firstRows = await rowIds(sel('chat-model-submenu'))
    assert(firstRows.length === 2, 'first list has the two models', firstRows)
    const readsAfterFirstOpen = state.catalogReads.claude_agent_sdk
    assert(readsAfterFirstOpen >= 1, 'opening the runtime list reads it', readsAfterFirstOpen)
    await page.screenshot({ path: path.join(outputDir, 'R1-1-chat-menu-two-models.png') })
    await closeChat()

    // The runtime starts offering a model while the app runs; the next open answers slowly.
    state.claudeModels = [...state.claudeModels, claudeModel('fable', 'Fable', 'claude-fable-5-2')]
    let release; state.hold = new Promise((r) => { release = r })
    await openChatClaude()
    const submenu = sel('chat-model-submenu')
    await page.locator(`${submenu} ${sel('model-list-refreshing')}`).waitFor({ state: 'visible', timeout: 10000 })
    const during = await rowIds(submenu)
    assert(during.length === 2 && !during.includes('fable'), 'the loaded list stays usable and unchanged while reading', during)
    assert(await page.locator(`${submenu} ${sel('model-list-refresh-button')}`).isDisabled(), 'the refresh control is busy while reading')
    assert(!(await page.locator(`${submenu} ${sel('chat-model-loading')}`).count()), 'no blocking loading state replaces the list')
    await page.screenshot({ path: path.join(outputDir, 'R1-2-chat-menu-refreshing-list-usable.png') })
    // Choosing from the stale list still works while the read is in flight.
    release(); state.hold = null
    await waitFor('new model row', async () => (await rowIds(submenu)).includes('fable'))
    assert(!(await page.locator(`${submenu} ${sel('model-list-refreshing')}`).count()), 'busy state ends')
    await page.screenshot({ path: path.join(outputDir, 'R1-3-chat-menu-new-model-listed.png') })
    await page.locator(`${submenu} ${sel('chat-model-option-fable')}`).click()
    await waitFor('selection', async () => (await page.locator(sel('picked')).textContent()).includes('claude_agent_sdk:fable'))
    return { reads: state.catalogReads.claude_agent_sdk }
  })

  await scenario('R2', 'Chat model menu: a failed refresh keeps the last list, shows the error with Retry; Retry and "Refresh models" re-read (QR-001, AC-011)', async () => {
    await closeChat()
    state.failNext = true
    const before = state.catalogReads.claude_agent_sdk
    await openChatClaude()
    const submenu = sel('chat-model-submenu')
    await page.locator(`${submenu} ${sel('model-list-refresh-error')}`).waitFor({ state: 'visible', timeout: 10000 })
    assert(state.catalogReads.claude_agent_sdk === before + 1, 'opening the menu and then the runtime reads the list once', { before, after: state.catalogReads.claude_agent_sdk })
    const rows = await rowIds(submenu)
    assert(rows.length === 3, 'the last list (three models) is kept after a failed refresh', rows)
    assert((await page.locator(`${submenu} ${sel('model-list-refresh-button')}`).textContent()).trim() === 'Retry', 'the control offers Retry')
    await page.screenshot({ path: path.join(outputDir, 'R2-1-refresh-failed-list-kept.png') })
    state.claudeModels = state.claudeModels.filter((m) => m.modelIdentifier !== 'sonnet')
    await page.locator(`${submenu} ${sel('model-list-refresh-button')}`).click()
    await waitFor('error cleared and the removed model gone', async () => !(await page.locator(`${submenu} ${sel('model-list-refresh-error')}`).count()) && !(await rowIds(submenu)).includes('sonnet'))
    const afterRetry = state.catalogReads.claude_agent_sdk
    await page.locator(`${submenu} ${sel('model-list-refresh-button')}`).click()
    await waitFor('Refresh models read', async () => state.catalogReads.claude_agent_sdk > afterRetry)
    const result = { readsBefore: before, afterRetry, finalReads: state.catalogReads.claude_agent_sdk, rows: await rowIds(submenu) }
    await closeChat()
    return result
  })

  await scenario('R3', 'Concurrent opens share one server read (QR-002)', async () => {
    await closeChat()
    let release; state.hold = new Promise((r) => { release = r })
    const before = state.catalogReads.claude_agent_sdk
    await openChatClaude()
    await page.locator(sel('chat-model-submenu') + ' ' + sel('model-list-refreshing')).waitFor({ state: 'visible' })
    await closeChat(); await openChatClaude(); await closeChat(); await openChatClaude()
    release(); state.hold = null
    await waitFor('refresh settled', async () => !(await page.locator(sel('model-list-refreshing')).count()))
    const reads = state.catalogReads.claude_agent_sdk - before
    assert(reads === 1, 'one server read while one is in flight', reads)
    await closeChat()
    return { reads }
  })

  await scenario('R4', 'Launch-config picker: opening refreshes, "Refresh models" is inside the list, a new model appears and a failure shows Retry (AC-010, AC-011)', async () => {
    const host = sel('launch-host')
    state.claudeModels = [...state.claudeModels, claudeModel('haiku', 'Haiku', 'claude-haiku-5-5')]
    const before = state.catalogReads.claude_agent_sdk
    await page.locator(`${host} button[aria-haspopup="listbox"]`).click()
    await page.locator(sel('model-list-refresh-button')).waitFor({ state: 'visible' })
    await waitFor('refresh read on open', async () => state.catalogReads.claude_agent_sdk > before)
    await waitFor('new model option', async () => (await page.locator('li[role="option"]').allTextContents()).some((t) => t.includes('claude-haiku-5-5') || t.includes('Haiku')))
    await page.screenshot({ path: path.join(outputDir, 'R4-1-launch-picker-new-model.png') })
    state.failNext = true
    await page.locator(sel('model-list-refresh-button')).click()
    await page.locator(sel('model-list-refresh-error')).waitFor({ state: 'visible', timeout: 10000 })
    assert((await page.locator('li[role="option"]').count()) >= 3, 'rows kept after a failed refresh')
    await page.screenshot({ path: path.join(outputDir, 'R4-2-launch-picker-refresh-failed.png') })
    await page.keyboard.press('Escape')
    return { options: await page.locator('li[role="option"]').count() }
  })

  await scenario('R5', 'Narrow viewport (390x844): the chat model menu drill-in shows the refresh control and the list fits', async () => {
    await closeChat()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel('chat-runtime-claude_agent_sdk')).click()
    await page.locator(sel('model-list-refresh-button')).waitFor({ state: 'visible' })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow')
    await page.screenshot({ path: path.join(outputDir, 'R5-narrow-chat-menu-refresh.png') })
    await page.keyboard.press('Escape')
    return {}
  })

  await scenario('R6', 'Launch panel: the SDK effort-only schema (no default) - what the Thinking control and the effort setting read before a choice', async () => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator(sel('launch-host')).waitFor({ state: 'visible' })
    const host = sel('launch-host')
    await waitFor('launch panel Thinking control', async () => (await page.locator(host).innerText()).includes('Thinking'), 60000)
    const toggle = page.locator(`${host} [role="switch"]`).first()
    const toggleState = await toggle.evaluate((el) => ({ tag: el.tagName, checked: el.getAttribute('aria-checked'), disabled: el.disabled || el.getAttribute('aria-disabled') })).catch(() => 'no [role=switch]')
    const advanced = page.locator(`${host} button:has-text("Advanced")`)
    if (await advanced.count()) await advanced.first().click()
    await delay(300)
    await page.screenshot({ path: path.join(outputDir, 'R6-launch-panel-sdk-effort-only.png') })
    const text = await page.locator(host).innerText()
    return { toggleState, text }
  })

  const errors = evidence.browserEvents.filter((e) => e.type === 'pageerror')
  if (errors.length) evidence.failures.push({ id: 'BROWSER-PAGE-ERRORS', message: 'page errors', details: errors })
} catch (error) {
  evidence.failures.push({ id: 'HARNESS', message: error.message, stack: error.stack })
} finally {
  try { await context?.close(); evidence.cleanup.context = 'closed' } catch (e) { evidence.cleanup.context = String(e) }
  try { await browser?.close(); evidence.cleanup.browser = 'closed' } catch (e) { evidence.cleanup.browser = String(e) }
  evidence.cleanup.devServer = await killDev()
  devLogStream?.end()
  if (pageInstalled) { await fs.rm(installedPagePath, { force: true }); evidence.cleanup.temporaryPage = existsSync(installedPagePath) ? 'STILL PRESENT' : 'removed' }
  evidence.finishedAt = new Date().toISOString()
  evidence.result = evidence.failures.length ? 'Fail' : 'Pass'
  await fs.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
}
console.log(`${evidence.result}: ${Object.entries(evidence.scenarios).map(([k, v]) => `${k}=${v.status}`).join(' ')}; evidence ${path.join(outputDir, 'evidence.json')}`)
if (evidence.failures.length) { for (const f of evidence.failures) console.error(`- ${f.id}: ${f.message}`); process.exitCode = 1 }
