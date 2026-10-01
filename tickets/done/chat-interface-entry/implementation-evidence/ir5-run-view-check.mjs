#!/usr/bin/env node
// IR-005 (D-17) rendered checks against the running dev environment (`pnpm dev`: web :3000,
// backend :8000, data root .autobyteus/development). Real Chrome via playwright-core, real Codex.
//
// Usage: node ir5-run-view-check.mjs [--team-run <teamRunId>] [--output-dir <dir>] [--only A,B]
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(scriptDir, '../../../../autobyteus-web/package.json'))
const { chromium } = require('playwright-core')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const FRONT = 'http://127.0.0.1:3000'
const BACK = 'http://127.0.0.1:8000'
const outDir = path.resolve(arg('output-dir', path.join(scriptDir, 'ir5-run-view')))
const teamRunId = arg('team-run', null)
const only = arg('only', null)?.split(',')
const MODEL = 'gpt-5.5'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const results = { startedAt: new Date().toISOString(), checks: {} }
const sel = (t) => `[data-test="${t}"]`

const gql = async (query, variables = {}) => {
  const res = await fetch(`${BACK}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors).slice(0, 300))
  return json.data
}
const runConfig = async (runId) => (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier runtimeKind}}}', { runId })).getAgentRunResumeConfig
const terminate = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })

// Page helpers
const center = (page) => page.locator(sel('workspace-center-pane'))
const routeRunId = (page) => new URL(page.url()).searchParams.get('id')
const waitForPermanentChat = (page) => page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
const waitForReply = (page, marker, timeout = 180000) => page.waitForFunction(({ m }) => {
  const root = document.querySelector('[data-test="workspace-center-pane"]')
  return !!root && [...root.querySelectorAll('*')].some((n) => n.children.length === 0 && n.textContent.trim() === m)
}, { m: marker }, { timeout })
const runBoxTextarea = (page) => center(page).locator('textarea').first()
const activeTab = (page) => page.evaluate(() => document.querySelector('[data-test="right-side-tab-list"] [aria-selected="true"]')?.getAttribute('data-tab-name') ?? null)
const panelOpen = (page) => page.locator(sel('workspace-right-panel')).isVisible().catch(() => false)
const selectTab = (page, name) => page.locator(`${sel('right-side-tab-list')} [data-tab-name="${name}"]`).click()
const collapsePanel = async (page) => { if (await panelOpen(page)) await page.locator(sel('right-side-panel-toggle')).click(); await delay(400) }
const stripClick = async (page, name) => { await page.locator(`${sel('workspace-right-tool-strip')} [data-tab-name="${name}"]`).click({ timeout: 8000 }); await delay(600) }
const status = (page) => page.evaluate(() => document.querySelector('[data-testid="agent-workspace-surface"]')?.querySelector('.border-b')?.innerText ?? null)
const geometry = (page) => page.evaluate(() => {
  const rect = (el) => el ? (({ top, left, right, bottom, height, width }) => ({ top, left, right, bottom, height, width }))(el.getBoundingClientRect()) : null
  const centerPane = document.querySelector('[data-test="workspace-center-pane"]')
  const header = centerPane?.querySelector('.border-b') ?? null
  return {
    centerPane: rect(centerPane),
    header: rect(header),
    rightPanel: rect(document.querySelector('[data-test="workspace-right-panel"]')),
    tabList: rect(document.querySelector('[data-test="right-side-tab-list"]')),
    resizeHandle: rect(document.querySelector('[data-test="workspace-right-resize-handle"]')),
  }
})
const newChatWithModel = async (page) => {
  await page.goto(`${FRONT}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(1500)
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel('chat-runtime-codex_app_server')).click()
  await page.locator(sel(`chat-model-option-${MODEL}`)).click()
}
const sendInNewChat = async (page, text) => {
  await page.locator(`${sel('chat-composer')} textarea`).first().fill(text)
  await page.locator(sel('chat-primary-action')).first().click()
}
// In-app navigation (the Vue router): module state such as the active tab survives, as for a user.
const appNavigate = async (page, target) => {
  await page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), target)
  await delay(1500)
}
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const graphqlOps = (page) => {
  const ops = []
  page.on('request', (request) => {
    if (!request.url().endsWith('/graphql')) return
    const name = /"operationName":"([^"]+)"/.exec(request.postData() ?? '')?.[1] ?? /(query|mutation)\s+(\w+)/.exec(request.postData() ?? '')?.[2] ?? 'anonymous'
    ops.push({ at: Date.now(), name })
  })
  return ops
}
// Picks a model in the ⚙ SearchableGroupedSelect other than the current one; returns its id.
const pickOtherModelInSettings = async (page) => {
  const trigger = center(page).locator('button[aria-haspopup="listbox"]').first()
  await trigger.click()
  const options = page.locator('[role="listbox"] [role="option"]')
  await options.first().waitFor({ timeout: 60000 })
  const count = await options.count()
  for (let i = 0; i < count; i++) {
    const option = options.nth(i)
    if ((await option.getAttribute('aria-selected')) === 'true') continue
    const label = (await option.innerText()).split('\n')[0].trim()
    await option.click()
    return label
  }
  return null
}

const checks = []
const check = (id, title, fn) => checks.push({ id, title, fn })
const state = { runId: arg('run-id', null) }

// D-18 / IC-3: the recorded llmConfig of a New chat run equals the launch form's schema defaults.
const THINKING_KEYS = new Set(['thinking_enabled', 'thinking_budget_tokens', 'reasoning_effort', 'thinking_type', 'thinking_level'])
const rawSchema = async (runtimeKind, modelId) => {
  const snapshots = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier configSchema}}}', { r: runtimeKind })).providerModelCatalogSnapshots
  return snapshots.flatMap((s) => s.llmModels).find((m) => m.modelIdentifier === modelId)?.configSchema ?? null
}
const schemaDefaults = (schema) => Object.fromEntries(
  (schema?.parameters ?? Object.entries(schema?.properties ?? {}).map(([name, p]) => ({ name, default_value: p.default })))
    .filter((p) => p.default_value !== undefined).map((p) => [p.name, p.default_value]))
const split = (config) => {
  const thinking = {}, other = {}
  for (const [k, v] of Object.entries(config ?? {})) (THINKING_KEYS.has(k) ? thinking : other)[k] = v
  return { thinking, other }
}
for (const [runtimeKind, modelId] of [['codex_app_server', 'gpt-5.5'], ['claude_agent_sdk', 'sonnet']]) {
  check(`M-${runtimeKind}`, `D-18/IC-3: New chat on ${modelId} (${runtimeKind}), default thinking untouched → explicit llmConfig recorded; live ⚙ shows the values (VIS-026), never "Not recorded"`, async (page) => {
    await page.goto(`${FRONT}/chat`, { waitUntil: 'domcontentloaded' })
    await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
    await delay(1500)
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
    await page.locator(sel(`chat-model-option-${modelId}`)).click()
    const marker = `M-${runtimeKind}-${Date.now()}`
    await sendInNewChat(page, `Reply with exactly ${marker} and nothing else.`)
    await waitForPermanentChat(page)
    const runId = routeRunId(page)
    await waitForReply(page, marker)
    const recorded = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{llmModelIdentifier runtimeKind llmConfig}}}', { runId })).getAgentRunResumeConfig.metadataConfig
    const defaults = split(schemaDefaults(await rawSchema(runtimeKind, modelId)))
    const got = split(recorded.llmConfig)
    await page.locator(sel('workspace-header-edit-config')).click()
    await page.locator(sel('save-existing-model-config')).waitFor({ timeout: 30000 })
    await delay(1500)
    await shot(page, `M-${runtimeKind}-live-settings`)
    const settingsText = await center(page).innerText()
    const result = {
      runId, recordedModel: recorded.llmModelIdentifier, recordedLlmConfig: recorded.llmConfig, schemaDefaults: defaults,
      nonThinkingEqualsLaunchForm: JSON.stringify(got.other) === JSON.stringify(defaults.other),
      thinkingKeysEqualSchemaDefaults: Object.keys(got.thinking).length > 0
        && Object.entries(got.thinking).every(([k, v]) => defaults.thinking[k] === v),
      notRecordedShown: /Not recorded/.test(settingsText),
      missingHistoricalMarkers: await center(page).locator('[data-testid^="missing-historical-config"]').count(),
      saveDisabled: await page.locator(sel('save-existing-model-config')).isDisabled(),
    }
    await page.locator(sel('run-config-back-to-events')).click()
    await terminate(runId).catch(() => undefined)
    return result
  })
}

check('A', 'Chat run view (VIS-015): workspace frame, product header with run title, ⚙ ＋, product box; geometry', async (page) => {
  await newChatWithModel(page)
  await sendInNewChat(page, 'Reply with exactly R1-OK and nothing else.')
  await waitForPermanentChat(page)
  state.runId = routeRunId(page)
  await waitForReply(page, 'R1-OK')
  await delay(1500)
  await shot(page, 'A-chat-run-view-live')
  const g = await geometry(page)
  const header = await page.locator('[data-testid="agent-workspace-surface"] [data-test="agent-workspace-title"]').innerText()
  return {
    runId: state.runId, title: header, geometry: g,
    headerActions: await page.locator(`${sel('workspace-header-edit-config')}, ${sel('workspace-header-new-run')}`).count(),
    hasChatFooter: await page.locator(sel('chat-composer-footer')).count(),
    tab: await activeTab(page),
  }
})

check('B', '`/` in the run-view box → chips on the message; sent-as tooltip (VIS-016)', async (page) => {
  const box = runBoxTextarea(page)
  await box.click(); await box.type('/')
  await page.locator(sel('chat-skill-menu')).waitFor({ timeout: 10000 })
  const skills = await page.locator('[data-test^="chat-skill-option-"]').evaluateAll((els) => els.slice(0, 3).map((e) => e.getAttribute('data-test')))
  await box.press('Enter')
  const chip = await page.locator(sel('agent-input-skill-chips')).innerText()
  await box.type('Reply with exactly R2-OK and nothing else.')
  await box.press('Enter')
  await waitForReply(page, 'R2-OK')
  await delay(1000)
  const messageChip = center(page).locator('[data-test^="skill-request-chip"], [data-test="skill-request-chips"]').first()
  if (await messageChip.count()) await messageChip.hover()
  await delay(600)
  await shot(page, 'B-sent-as-tooltip')
  return { offered: skills, chip }
})

check('C', '⚙ while live (VIS-026): model and thinking locked, note, Save disabled', async (page) => {
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('save-existing-model-config')).waitFor({ timeout: 30000 })
  await delay(1500)
  await shot(page, 'C-run-settings-live-locked')
  const result = {
    note: await center(page).innerText().then((t) => /Stop this run before changing model settings\./.test(t)),
    saveDisabled: await page.locator(sel('save-existing-model-config')).isDisabled(),
    modelDisabled: await center(page).locator('button[aria-haspopup="listbox"]').first().isDisabled(),
    selectedModelLabel: await center(page).locator('button[aria-haspopup="listbox"]').first().innerText(),
  }
  await page.locator(sel('run-config-back-to-events')).click()
  return result
})

check('D0', 'Open the chat under test (when run with --run-id)', async (page) => {
  await page.goto(`${FRONT}/chat?id=${state.runId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 120000 })
  return { tab: await activeTab(page) }
})

check('D', 'Tabs: chat (Files) → Team opens Team members; Team → chat opens a visible tab; frame geometry equals Team', async (page) => {
  if (!teamRunId) return { skipped: 'no --team-run' }
  await selectTab(page, 'files')
  const chatGeometry = await geometry(page)
  await appNavigate(page, `/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=${teamRunId}`)
  await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 120000 })
  await delay(2500)
  const teamTab = await activeTab(page)
  const teamGeometry = await geometry(page)
  await shot(page, 'D-team-view')
  await appNavigate(page, `/chat?id=${state.runId}`)
  await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 120000 })
  await delay(2000)
  const chatTabAfterTeam = await activeTab(page)
  return { teamTab, chatTabAfterTeam, chatGeometry, teamGeometry }
})

check('E', 'Reopening the same run keeps its tab', async (page) => {
  await selectTab(page, 'artifacts')
  await appNavigate(page, '/agents')
  await appNavigate(page, `/chat?id=${state.runId}`)
  await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 120000 })
  await delay(1500)
  return { tab: await activeTab(page) }
})

check('F', 'Strip Files/Terminal open exactly those tabs in Chat and Team; collapsed state shared (VIS-018)', async (page) => {
  const out = {}
  await collapsePanel(page)
  out.chatCollapsed = !(await panelOpen(page))
  await stripClick(page, 'files'); out.chatFiles = await activeTab(page)
  await collapsePanel(page); await stripClick(page, 'terminal'); out.chatTerminal = await activeTab(page)
  await collapsePanel(page); await stripClick(page, 'artifacts'); out.chatArtifacts = await activeTab(page)
  await shot(page, 'F-panel-from-strip-artifacts')
  if (teamRunId) {
    await collapsePanel(page)
    await appNavigate(page, `/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=${teamRunId}`)
    await page.locator(sel('workspace-right-tool-strip')).waitFor({ timeout: 120000 })
    await delay(1500)
    out.teamStartsCollapsed = !(await panelOpen(page))
    await stripClick(page, 'files'); out.teamFiles = await activeTab(page)
    await collapsePanel(page); await stripClick(page, 'terminal'); out.teamTerminal = await activeTab(page)
    await appNavigate(page, `/chat?id=${state.runId}`)
    await page.locator(sel('right-side-tab-list')).waitFor({ timeout: 120000 })
    out.chatOpenAfterTeamReopened = await panelOpen(page)
  }
  return out
})

check('G', 'Offline: collapsed stored chat (VIS-019); ⚙ editable (VIS-017); Save → resume uses the new model (AC-009)', async (page) => {
  await terminate(state.runId)
  await page.waitForFunction(() => /offline/i.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? ''), null, { timeout: 60000 })
  await collapsePanel(page)
  await shot(page, 'G-stored-chat-strip-collapsed')
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('save-existing-model-config')).waitFor({ timeout: 30000 })
  await delay(2500)
  const stoppedNote = await center(page).innerText().then((t) => /This run is stopped\./.test(t))
  const chosen = await pickOtherModelInSettings(page)
  await delay(800)
  await shot(page, 'G-run-settings-stopped')
  await page.locator(sel('save-existing-model-config')).click()
  await delay(2500)
  const saved = await runConfig(state.runId)
  await page.locator(sel('run-config-back-to-events')).click()
  const box = runBoxTextarea(page)
  const marker = `R3-${Date.now()}`
  await box.fill(`Reply with exactly ${marker} and nothing else.`)
  await box.press('Enter')
  await waitForReply(page, marker)
  const resumed = await runConfig(state.runId)
  return { stoppedNote, chosenLabel: chosen, savedModel: saved.metadataConfig.llmModelIdentifier, resumedActive: resumed.isActive, resumedModel: resumed.metadataConfig.llmModelIdentifier }
})

check('H', '＋ opens a New chat preset to this agent and workspace', async (page) => {
  await page.locator(sel('workspace-header-new-run')).click()
  await page.waitForURL((u) => u.pathname === '/chat' && !u.searchParams.get('id'), { timeout: 30000 })
  await page.locator(sel('chat-new')).waitFor({ timeout: 30000 })
  return { url: page.url(), workspaceChip: await page.locator(sel('chat-workspace-trigger')).innerText().catch(() => null) }
})

check('I', '⚙ on a failed New chat first send (temp-*): change model → back → send uses it, no server call before send', async (page) => {
  const ops = graphqlOps(page)
  await newChatWithModel(page)
  let injected = 0
  await page.route('**/graphql', (route) => {
    if (injected === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) {
      injected += 1
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected prepare failure (probe)' }] }) })
    }
    return route.continue()
  })
  await sendInNewChat(page, 'Reply with exactly R4-OK and nothing else.')
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
  await page.getByText('Injected prepare failure (probe)').first().waitFor({ timeout: 30000 })
  const openedAt = Date.now()
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('draft-run-config-editor')).waitFor({ timeout: 30000 })
  await delay(1500)
  await shot(page, 'I-draft-run-settings')
  const chosen = await pickOtherModelInSettings(page)
  await page.locator(sel('run-config-back-to-events')).click()
  const opsBeforeSend = ops.filter((op) => op.at >= openedAt).map((op) => op.name)
  const box = runBoxTextarea(page)
  if (!(await box.inputValue())) await box.fill('Reply with exactly R4-OK and nothing else.')
  await box.press('Enter')
  await waitForPermanentChat(page)
  const runId = routeRunId(page)
  await waitForReply(page, 'R4-OK')
  await page.unroute('**/graphql')
  const cfg = await runConfig(runId)
  await terminate(runId).catch(() => undefined)
  return { chosenLabel: chosen, opsBetweenGearAndSend: opsBeforeSend, model: cfg.metadataConfig.llmModelIdentifier }
})

check('J', '⚙ on a catalog "Run agent" draft (temp-*): change model → back → send uses it', async (page) => {
  const ops = graphqlOps(page)
  await page.goto(`${FRONT}/agents`, { waitUntil: 'domcontentloaded' })
  const name = 'Daily Assistant'
  await page.getByText(name, { exact: true }).first().waitFor({ timeout: 120000 })
  const card = page.locator('div,article,li').filter({ has: page.getByText(name, { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await card.getByRole('button', { name: /^Run/ }).first().click()
  await page.locator('main select').first().waitFor({ timeout: 60000 })
  await page.locator('main select').first().selectOption('codex_app_server')
  await delay(1500)
  const modelTrigger = page.locator('main button[aria-haspopup="listbox"]').first()
  await modelTrigger.click()
  await page.locator('[role="listbox"] [role="option"]').first().click()
  await page.getByRole('button', { name: 'Run Agent' }).click()
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
  const openedAt = Date.now()
  await page.locator(sel('workspace-header-edit-config')).click()
  await page.locator(sel('draft-run-config-editor')).waitFor({ timeout: 30000 })
  await delay(1000)
  const chosen = await pickOtherModelInSettings(page)
  await page.locator(sel('run-config-back-to-events')).click()
  const opsBeforeSend = ops.filter((op) => op.at >= openedAt).map((op) => op.name)
  const box = runBoxTextarea(page)
  await box.fill('Reply with exactly R5-OK and nothing else.')
  await box.press('Enter')
  await waitForPermanentChat(page)
  const runId = routeRunId(page)
  await waitForReply(page, 'R5-OK')
  const cfg = await runConfig(runId)
  await terminate(runId).catch(() => undefined)
  return { chosenLabel: chosen, opsBetweenGearAndSend: opsBeforeSend, model: cfg.metadataConfig.llmModelIdentifier }
})

check('L', 'CR-005: ⚙ left open on a chat, then a New chat (pencil) and send → the new chat shows its conversation (also on a failed first send)', async (page) => {
  const out = {}
  for (const failFirst of [false, true]) {
    await appNavigate(page, `/chat?id=${state.runId}`)
    await page.locator(sel('workspace-header-edit-config')).click()
    await page.locator(sel('run-config-back-to-events')).waitFor({ timeout: 30000 })
    await page.locator(sel('app-left-panel-new-chat')).click()
    await page.locator(sel('chat-new')).waitFor({ timeout: 30000 })
    await delay(1000)
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel('chat-runtime-codex_app_server')).click()
    await page.locator(sel(`chat-model-option-${MODEL}`)).click()
    let injected = failFirst ? 0 : 1
    await page.route('**/graphql', (route) => {
      if (injected === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) {
        injected += 1
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected prepare failure (probe)' }] }) })
      }
      return route.continue()
    })
    const marker = `L-${failFirst ? 'FAIL' : 'OK'}-${Date.now()}`
    await sendInNewChat(page, `Reply with exactly ${marker} and nothing else.`)
    if (failFirst) {
      await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
      await page.getByText('Injected prepare failure (probe)').first().waitFor({ timeout: 30000 })
    } else {
      await waitForPermanentChat(page)
      await waitForReply(page, marker)
    }
    await page.unroute('**/graphql')
    out[failFirst ? 'failedFirstSend' : 'firstSend'] = {
      url: page.url(),
      settingsShown: await page.locator(`${sel('draft-run-config-editor')}, ${sel('save-existing-model-config')}`).count(),
      conversationBox: await runBoxTextarea(page).isVisible(),
    }
    if (!failFirst) await terminate(routeRunId(page)).catch(() => undefined)
  }
  await shot(page, 'L-new-chat-after-settings')
  return out
})

try {
  await fs.mkdir(outDir, { recursive: true })
  const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(() => true)
  const browser = await chromium.launch({ headless: true, executablePath: chrome })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); results.pageErrors = errors
  for (const c of checks) {
    if (only && !only.includes(c.id)) continue
    try { results.checks[c.id] = { title: c.title, details: await c.fn(page) } }
    catch (e) { results.checks[c.id] = { title: c.title, error: e.message.slice(0, 1500) }; await shot(page, `${c.id}-failure`).catch(() => {}) }
    console.log(c.id, JSON.stringify(results.checks[c.id]).slice(0, 600))
    await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
  }
  // VIS-027: narrow chat run view.
  if (!only || only.includes('K')) {
    const narrow = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' })
    const small = await narrow.newPage()
    await small.goto(`${FRONT}/chat?id=${state.runId}`, { waitUntil: 'domcontentloaded' })
    await small.waitForTimeout(6000)
    await small.screenshot({ path: path.join(outDir, 'K-narrow-chat-run-view.png') })
    results.checks.K = { title: 'Narrow chat run view (VIS-027)', details: {
      leftStrip: await small.locator(sel('workspace-left-navigation-strip')).count(),
      rightStrip: await small.locator(sel('workspace-right-tool-strip')).count(),
      titleVisible: await small.locator('[data-test="agent-workspace-title"]').isVisible().catch(() => false),
    } }
    console.log('K', JSON.stringify(results.checks.K))
  }
  await browser.close()
} finally {
  results.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
}
