#!/usr/bin/env node
// Frontend-only approval regression: real New chat (target switcher, model/workspace menus, Team
// member settings drawer) → first-send GraphQL transport. Own Nuxt/Chrome and deterministic reads. Launch mutations intentionally
// return a fixture rejection AFTER recording inputs, so no provider or user data is accessed.
// This proves submitted client booleans, not server execution, desktop packaging or restart.
// Prerequisites: pnpm install, nuxt prepare, Chrome (or --browser-executable). Run via
// pnpm test:e2e:fresh-run-auto-approval [--output-dir <path>]. Cases persist immediately.
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const fixturePath = path.join(scriptDir, 'fixtures/fresh-run-auto-approval.page.vue')
const installedPagePath = path.join(webDir, 'pages/api-e2e-fresh-run-auto-approval.vue')
const routePath = '/api-e2e-fresh-run-auto-approval'

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback
}

const timeoutMs = Number(getArg('timeout-ms', '90000'))
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/fresh-run-auto-approval'))
const ledgerArg = getArg('ledger-file')
const ledgerPath = ledgerArg ? path.resolve(webDir, ledgerArg) : null
const explicitPort = getArg('port')
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate))

await fs.mkdir(outputDir, { recursive: true })
const evidencePath = path.join(outputDir, 'fresh-run-auto-approval-evidence.json')
const devLogPath = path.join(outputDir, 'nuxt-dev.log')
const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  webDir,
  fixturePath,
  installedPagePath,
  routePath,
  graphqlOperations: [],
  scenarios: {},
  browserEvents: [],
  failures: [],
  cleanup: {},
}

const assert = (condition, message, details = undefined) => {
  if (condition) return
  const error = new Error(message)
  error.details = details
  throw error
}
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const clone = (value) => JSON.parse(JSON.stringify(value))
const waitFor = async (description, fn, timeout = timeoutMs, interval = 100) => {
  const startedAt = Date.now()
  let lastValue
  let lastError
  while (Date.now() - startedAt < timeout) {
    try {
      lastValue = await fn()
      if (lastValue) return lastValue
    } catch (error) {
      lastError = error
    }
    await delay(interval)
  }
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}${lastError ? `; error=${lastError.message}` : ''}`)
}
const choosePort = async () => explicitPort ? Number(explicitPort) : await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    server.close(() => resolve(port))
  })
})

const childHasExited = (child) => child.exitCode !== null || child.signalCode !== null
const waitForChildExit = async (child, timeout) => {
  if (childHasExited(child)) return true
  return await new Promise((resolve) => {
    let timer
    const finish = (exited) => {
      clearTimeout(timer)
      child.off('exit', onExit)
      resolve(exited)
    }
    const onExit = () => finish(true)
    child.once('exit', onExit)
    timer = setTimeout(() => finish(childHasExited(child)), timeout)
    if (childHasExited(child)) finish(true)
  })
}
const signalOwnedProcess = (child, signal) => {
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal)
      return 'process-group'
    } catch {}
  }
  if (!child.kill(signal) && !childHasExited(child)) throw new Error(`Child ${child.pid} rejected ${signal}`)
  return 'child'
}
const waitForProcessGroupExit = async (pid, timeout) => {
  if (process.platform === 'win32') return true
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    try { process.kill(-pid, 0) } catch (error) {
      if (error?.code === 'ESRCH') return true
      throw error
    }
    await delay(100)
  }
  try { process.kill(-pid, 0); return false } catch (error) {
    if (error?.code === 'ESRCH') return true
    throw error
  }
}
const killOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' }
  const details = { pid: child.pid, initialExitCode: child.exitCode, initialSignalCode: child.signalCode }
  if (!childHasExited(child)) {
    details.sigtermTarget = signalOwnedProcess(child, 'SIGTERM')
    details.exitedAfterSigterm = await waitForChildExit(child, 5000)
    if (!details.exitedAfterSigterm) {
      details.sigkillTarget = signalOwnedProcess(child, 'SIGKILL')
      details.exitedAfterSigkill = await waitForChildExit(child, 5000)
      assert(details.exitedAfterSigkill, `Owned process ${child.pid} did not exit after SIGKILL`, details)
    }
  }
  details.finalExitCode = child.exitCode
  details.finalSignalCode = child.signalCode
  details.processGroupExited = await waitForProcessGroupExit(child.pid, 5000)
  assert(childHasExited(child) && details.processGroupExited, `Owned process ${child.pid} was not fully cleaned up`, details)
  return { status: 'terminated', ...details }
}
const cleanupFailure = (id, resource, error) => {
  const failure = { id, description: `Clean up owned ${resource}`, message: error instanceof Error ? error.message : String(error) }
  evidence.failures.push(failure)
  return `failed: ${failure.message}`
}

const catalogSnapshot = {
  __typename: 'ProviderModelCatalogSnapshotObject',
  runtimeKind: 'autobyteus',
  ownerProvider: { __typename: 'CatalogProviderObject', id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false, baseUrl: null, catalogMode: 'STATIC' },
  sources: [{ __typename: 'ModelSourceStatusObject', modelKind: 'LLM', state: 'READY', modelCount: 1, successfulUnitCount: 1, failedUnitCount: 0, safeMessage: null }],
  llmModels: [{
    __typename: 'ModelDetail',
    modelIdentifier: 'approval-model',
    name: 'Approval Model',
    description: 'Deterministic browser fixture model.',
    value: 'approval-model',
    canonicalName: 'approval-model',
    providerId: 'OPENAI',
    providerName: 'OpenAI',
    providerType: 'OPENAI',
    runtime: 'autobyteus',
    hostUrl: null,
    configSchema: {
      type: 'object',
      properties: {
        reasoning_effort: { type: 'string', title: 'Reasoning Effort', enum: ['low', 'high'], default: 'low' },
        reasoning_summary: { type: 'string', title: 'Reasoning Summary', enum: ['none', 'auto'], default: 'auto' },
      },
    },
    maxContextTokens: 128000,
    activeContextTokens: 128000,
    maxInputTokens: 120000,
    maxOutputTokens: 8000,
    metadataProvenance: null,
  }],
  audioModels: [],
  imageModels: [],
  videoModels: [],
}


catalogSnapshot.llmModels.push({ ...clone(catalogSnapshot.llmModels[0]),
  modelIdentifier: 'approval-model-two', name: 'Approval Model Two', value: 'approval-model-two', canonicalName: 'approval-model-two' })
const agent = {
  __typename: 'AgentDefinition', id: 'approval-agent', name: 'Approval Agent', role: 'Validator',
  description: 'Deterministic approval fixture', instructions: 'Validate', category: 'Testing', avatarUrl: null,
  toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [], skillScope: 'CONFIGURED',
  defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'approval-model', llmConfig: null },
}
const team = {
  __typename: 'AgentTeamDefinition', id: 'approval-team', name: 'Approval Team', description: 'Deterministic team',
  instructions: 'Validate', category: 'Testing', avatarUrl: null, revision: '1', coordinatorMemberName: 'lead',
  nodes: [{ memberName: 'lead', ref: agent.id, refScope: 'SHARED' }, { memberName: 'reviewer', ref: agent.id, refScope: 'SHARED' }],
  handoffs: [], ownershipScope: 'SHARED', ownerOrgId: null, ownerOrgName: null, ownerTeamId: null, ownerTeamName: null,
  ownerApplicationId: null, ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null,
  defaultLaunchConfig: agent.defaultLaunchConfig,
}
const workspace = (root = '/workspace/approval') => ({ __typename: 'WorkspaceInfo', workspaceId: root.endsWith('two') ? 'approval-ws-two' : 'approval-ws',
  name: 'Approval Workspace', displayName: 'Approval Workspace', config: { root_path: root }, workspaceRootPath: root,
  absolutePath: root, kind: 'FILESYSTEM', isTemp: false })
const inputs = { agents: [], teams: [] }
const operationResponse = (name, variables) => {
  switch (name) {
    case 'GetAgentDefinitions': return { agentDefinitions: [agent] }
    case 'GetAgentTeamDefinitions': return { agentTeamDefinitions: [team] }
    case 'GetAllWorkspaces': return { workspaces: [workspace(), { ...workspace('/workspace/temp'), workspaceId: 'temp_ws_default', name: 'Temp Workspace', displayName: 'Temp Workspace', isTemp: true }] }
    case 'GetRuntimeAvailabilityKinds': return { runtimeAvailabilityKinds: ['autobyteus','codex_app_server','claude_agent_sdk','antigravity_cli'] }
    case 'GetRuntimeAvailability': return { runtimeAvailability: { runtimeKind: variables.runtimeKind, enabled: true, reason: null } }
    case 'GetProviderModelCatalogSnapshots': return { providerModelCatalogSnapshots: [{ ...clone(catalogSnapshot), runtimeKind: variables.runtimeKind ?? 'autobyteus' }] }
    case 'RuntimeCurrentModelDescriptors': return { runtimeCurrentModelDescriptors: variables.identifiers.map(identifier => ({ identifier, model: catalogSnapshot.llmModels.find(model => model.modelIdentifier === identifier) ?? null })) }
    case 'GetProviderCredentialSettings': return { providerCredentialSettings: [] }
    case 'CreateWorkspace': return { createWorkspace: workspace(variables.input.rootPath ?? variables.input.root_path ?? '/workspace/approval-two') }
    case 'GetWorkspaceMetadata': return { workspaceMetadata: workspace(variables.rootPath) }
    case 'PrepareAgentRun':
      inputs.agents.push(clone(variables.input))
      return { prepareAgentRun: { success: false, message: 'Approval probe stops at the recorded client boundary.', runId: null, activationState: null, preparedExpiresAt: null } }
    case 'CreateAgentTeamRun':
      inputs.teams.push(clone(variables.input))
      return { createAgentTeamRun: { success: false, message: 'Approval probe stops at the recorded client boundary.', teamRunId: null } }
    case 'GetAgentOrgDefinitions': return { agentOrgDefinitions: [] }
    case 'GetSkills': return { skills: [] }
    case 'GetServerSettings': return { serverSettings: [] }
    case 'GetSkillImprovementCapability': return { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } }
    default: throw new Error(`Unexpected GraphQL operation ${name}`)
  }
}
let pageInstalled = false, devServer, devLogStream, browser, browserServer, context, page
const persist = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
const devReloadCount = async () => ((await fs.readFile(devLogPath, 'utf8').catch(() => '')).match(/optimized dependencies changed/g) ?? []).length
const scenario = async (id, description, run) => {
  try {
    const reloadsBefore = await devReloadCount()
    try {
      evidence.scenarios[id] = { status: 'Pass', description, details: await run() }
    } catch (error) {
      // A Nuxt dependency re-optimization reload during the attempt (TESTING.md caveat) voids it: keep the failed
      // attempt in the evidence and repeat the case once after the reloads settle. Assertions are never relaxed.
      if ((await devReloadCount()) === reloadsBefore) throw error
      evidence.devReloadRetries = [...(evidence.devReloadRetries ?? []), { id, firstAttempt: error.message }]
      await page?.screenshot({ path: path.join(outputDir, `${id}-dev-reload-attempt.png`), fullPage: true }).catch(() => {})
      await waitFor('dev dependency optimization to settle', async () => { const n = await devReloadCount(); await delay(8000); return n === (await devReloadCount()) })
      evidence.scenarios[id] = { status: 'Pass', description, details: await run(), retriedAfterDevReload: true }
    }
  } catch (error) {
    const failure = { id, description, message: error.message, stack: error.stack,
      details: error.details, body: page ? await page.locator('body').innerText().catch(() => '') : '' }
    evidence.scenarios[id] = { status: 'Fail', failure }; evidence.failures.push(failure)
    await page?.screenshot({ path: path.join(outputDir, `${id}-failure.png`), fullPage: true }).catch(() => {})
    throw error
  } finally { evidence.inputs = inputs; await persist(); if (ledgerPath) await fs.appendFile(ledgerPath, `\n${new Date().toISOString()} ${id}: ${evidence.scenarios[id].status}; ${description}; evidence ${evidencePath}\n`) }
}
const sel = t => `[data-test="${t}"]`
const toggle = (scope = page) => scope.locator(sel('chat-approval-toggle')).first()
const composer = () => page.locator(sel('chat-composer'))
const checkApproval = async (checked, locked = false, scope = page) => {
  await waitFor(`approval ${checked}`, async () => await toggle(scope).getAttribute('aria-pressed') === String(checked)
    && (await toggle(scope).getAttribute('data-locked') === 'true') === locked)
}
const open = async (target = 'agent', viewport = { width: 1280, height: 900 }) => {
  await page.setViewportSize(viewport)
  await page.goto(`${evidence.baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
  await page.locator('main[data-ready="true"]').waitFor({ timeout: timeoutMs })
  await page.locator(sel(target === 'team' ? 'probe-team-chat' : 'probe-chat')).click({ timeout: 30000 })
  await page.locator(sel('chat-new')).waitFor({ timeout: timeoutMs })
  await waitFor('New chat model ready', async () => (await page.locator(sel('chat-model-trigger')).first().innerText()).toLowerCase().includes('approval'))
}
// The chip model menu: pick a runtime, then a model in it (side submenu on desktop, drill-in on phones).
const chooseModel = async (runtimeKind, modelIdentifier, scope = composer()) => {
  await scope.locator(sel('chat-model-trigger')).first().click()
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).first().click()
  await page.locator(sel(`chat-model-option-${modelIdentifier}`)).first().click()
}
const chooseFolder = async (root = '/workspace/approval-two') => {
  await composer().locator(sel('chat-workspace-trigger')).click()
  await page.locator(sel('chat-workspace-open-folder')).click()
  await page.locator('#chat-workspace-path').fill(root)
  await page.locator(sel('chat-workspace-folder-form')).locator('button[type="submit"]').click()
  await waitFor('workspace chosen', async () => (await composer().locator(sel('chat-workspace-trigger')).innerText()).length > 0
    && !(await page.locator(sel('chat-workspace-folder-form')).count()))
}
const switchTo = async (definitionId) => {
  await page.locator(sel('run-target-switcher-trigger')).click()
  await page.locator(sel(`run-target-switcher-option-${definitionId}`)).click()
  await waitFor(`target ${definitionId}`, async () => (await page.locator(sel('run-target-name')).innerText()).includes(definitionId === 'approval-team' ? 'Approval Team' : 'Approval Agent'))
}
const send = async (requests, label) => {
  const n = requests.length
  await page.locator(sel('chat-message-input')).fill('Validate approval boundary')
  await page.locator(sel('chat-primary-action')).click()
  await waitFor(`${label} input`, () => requests.length === n + 1)
  return requests.at(-1)
}
const agentSend = async (expected) => {
  const input = await send(inputs.agents, 'PrepareAgentRun')
  assert(input.autoExecuteTools === expected, `Agent approval expected ${expected}`, input)
  return input
}
const teamSend = async (root, members) => {
  const input = await send(inputs.teams, 'CreateAgentTeamRun')
  assert(input.teamConfigs[0].autoExecuteTools === root, 'Team root approval mismatch', input)
  for (const member of input.memberConfigs) assert(member.autoExecuteTools === members[member.memberAddress ?? member.agentAddress], 'Team member approval mismatch', input)
  assert(input.memberConfigs.length === 2, 'Expected both Team members', input)
  return input
}
try {
  assert(!ledgerPath || existsSync(ledgerPath), 'Explicit ledger must already exist')
  assert(!existsSync(installedPagePath), `Refusing to overwrite ${installedPagePath}`)
  await fs.copyFile(fixturePath, installedPagePath); pageInstalled = true
  const port = await choosePort(); evidence.port = port; evidence.baseUrl = `http://127.0.0.1:${port}`
  devLogStream = createWriteStream(devLogPath)
  devServer = spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9', NUXT_TELEMETRY_DISABLED: '1' },
  })
  devServer.stdout.pipe(devLogStream); devServer.stderr.pipe(devLogStream); evidence.devServerPid = devServer.pid; await persist()
  await waitFor('Nuxt readiness', async () => (await fetch(`${evidence.baseUrl}${routePath}`)).ok)
  browserServer = await chromium.launchServer({ executablePath, headless: true, args: ['--disable-dev-shm-usage'] })
  evidence.browserPid = browserServer.process().pid
  browser = await chromium.connect(browserServer.wsEndpoint())
  evidence.browserVersion = browser.version(); await persist()
  context = await browser.newContext({ locale: 'en-US', timezoneId: 'Etc/UTC' })
  await context.route('**/rest/health', route => route.fulfill({ json: { status: 'ok' }, headers: { 'access-control-allow-origin': '*' } }))
  await context.route('**/graphql', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' } }); return }
    const payload = route.request().postDataJSON()
    evidence.graphqlOperations.push({ operationName: payload.operationName, variables: payload.variables })
    try { await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { data: operationResponse(payload.operationName, payload.variables ?? {}) } }) }
    catch (error) { evidence.failures.push({ operationName: payload.operationName, message: error.message }); await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { errors: [{ message: error.message }] } }) }
  })
  page = await context.newPage()
  page.on('pageerror', error => evidence.browserEvents.push({ kind: 'pageerror', message: error.message }))
  // Warm up: a fresh Nuxt dev server optimizes New chat's dependencies on first use and then
  // reloads the page once. Let that settle before any case starts.
  for (const probe of ['probe-chat', 'probe-team-chat']) {
    await page.goto(`${evidence.baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
    await page.locator('main[data-ready="true"]').waitFor({ timeout: timeoutMs })
    await page.locator(sel(probe)).click()
    await page.locator(sel('chat-new')).waitFor({ timeout: timeoutMs }).catch(() => {})
  }
  await waitFor('dev dependency optimization to settle', async () => {
    const log = await fs.readFile(devLogPath, 'utf8').catch(() => '')
    const reloads = (log.match(/optimized dependencies changed/g) ?? []).length
    await delay(8000)
    return reloads === ((await fs.readFile(devLogPath, 'utf8').catch(() => '')).match(/optimized dependencies changed/g) ?? []).length
  })
  // Recheck the previously failing mobile journey before the remaining regression cases.
  await scenario('B08', 'Dedicated mobile Agent/Team setup defaults and helper agree', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${evidence.baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
    await page.locator('main[data-ready="true"]').waitFor({ timeout: timeoutMs })
    await page.locator(sel('probe-mobile')).click({ timeout: timeoutMs })
    const observations = []
    for (const target of ['agent', 'team']) {
      await page.locator(`[data-testid="mobile-run-setup-${target}-mode"]`).click()
      await page.locator(`[data-testid="mobile-run-${target}-select-toggle"]`).click()
      await page.locator(`[data-testid="mobile-run-${target}-select-option"]`).filter({ hasText: target === 'agent' ? 'Approval Agent' : 'Approval Team' }).click()
      const mobileToggle = page.locator('[data-testid="mobile-run-auto-approve-tools-switch"]')
      await waitFor('Mobile fresh true', async () => await mobileToggle.getAttribute('aria-checked') === 'true')
      const help = await page.locator('[data-testid="mobile-run-auto-approve-tools-help"]').innerText()
      await page.screenshot({ path: path.join(outputDir, `B08-${target}-fresh.png`), fullPage: true })
      await mobileToggle.click()
      await waitFor('Mobile opt-out false', async () => await mobileToggle.getAttribute('aria-checked') === 'false')
      observations.push({ target, freshChecked: true, optOutChecked: false, help })
    }
    evidence.mobileObservations = observations
    assert(observations.every(row => !/off by default/i.test(row.help)), 'Mobile helper contradicts the approved fresh true default', observations)
    return observations
  })
  await scenario('B01', 'New chat Agent fresh true and first-send true', async () => {
    await open('agent'); await checkApproval(true)
    return await agentSend(true)
  })
  await scenario('B02', 'Narrow Agent opt-out survives model/workspace/permitted runtime edits', async () => {
    await open('agent', { width: 390, height: 844 }); await toggle().click(); await checkApproval(false)
    await chooseModel('autobyteus', 'approval-model-two'); await checkApproval(false)
    await chooseFolder(); await checkApproval(false)
    await chooseModel('claude_agent_sdk', 'approval-model'); await checkApproval(false)
    await chooseModel('autobyteus', 'approval-model-two'); await checkApproval(false)
    await page.screenshot({ path: path.join(outputDir, 'B02-narrow-opt-out.png'), fullPage: true })
    const input = await agentSend(false)
    assert(input.llmModelIdentifier === 'approval-model-two', 'Model edit should submit', input)
    assert(input.runtimeKind === 'autobyteus', 'Runtime edit should submit', input)
    return input
  })
  await scenario('B03', 'Switcher to a Team: root and inherited members submit true', async () => {
    await open('agent'); await switchTo('approval-team'); await checkApproval(true)
    assert((await page.locator(sel('run-members-line-text')).innerText()).length > 0, 'Team shows its members line')
    return await teamSend(true, { '/lead': true, '/reviewer': true })
  })
  await scenario('B04', 'Team opt-out reaches every member; one member customized to Ask first', async () => {
    await open('team'); await toggle().click(); await checkApproval(false)
    await chooseModel('autobyteus', 'approval-model-two'); await checkApproval(false)
    const off = await teamSend(false, { '/lead': false, '/reviewer': false })
    await open('team'); await checkApproval(true)
    await page.locator(sel('run-members-open')).click()
    const drawer = page.locator(sel('run-member-settings-drawer'))
    await drawer.waitFor({ timeout: timeoutMs })
    const reviewer = drawer.locator(sel('run-member-/reviewer'))
    await reviewer.locator(sel('run-member-toggle')).click()
    const detail = reviewer.locator(sel('run-member-detail'))
    await checkApproval(true, false, detail)
    await toggle(detail).click(); await checkApproval(false, false, detail)
    assert((await reviewer.locator(sel('run-member-summary')).innerText()).length > 0, 'Member shows a summary')
    await page.screenshot({ path: path.join(outputDir, 'B04-member-ask-first.png'), fullPage: true })
    await page.keyboard.press('Escape')
    await waitFor('drawer closed', async () => !(await drawer.count()))
    assert((await page.locator(sel('run-members-line-text')).innerText()).includes('1'), 'Members line reports one customized member')
    return { off, explicit: await teamSend(true, { '/lead': true, '/reviewer': false }) }
  })
  await scenario('B05', 'Antigravity keeps approval on and locked for Agent and Team', async () => {
    await open('agent'); await toggle().click(); await checkApproval(false)
    await chooseModel('antigravity_cli', 'approval-model'); await checkApproval(true, true)
    const agentInput = await agentSend(true)
    await open('team'); await chooseModel('antigravity_cli', 'approval-model'); await checkApproval(true, true)
    const teamInput = await teamSend(true, { '/lead': true, '/reviewer': true })
    // New chat always has a workspace (temp by default), so the old "missing workspace blocks" case no longer exists.
    return { agentInput, teamInput, missingWorkspaceCase: 'not-applicable: New chat defaults to the temp workspace' }
  })
  await scenario('B06', 'Chat Agent/Team true defaults and deliberate opt-out reach launch boundaries', async () => {
    const runs = []
    for (const target of ['agent', 'team']) for (const expected of [true, false]) {
      await open('agent')
      await checkApproval(true)
      if (target === 'team') { await switchTo('approval-team'); await checkApproval(true) }
      if (!expected) await toggle().click()
      const input = target === 'agent' ? await agentSend(expected) : await teamSend(expected, { '/lead': expected, '/reviewer': expected })
      runs.push({ target, expected, input })
    }
    return runs
  })
  await scenario('B07', 'Retarget keeps a deliberate opt-out; a fresh New chat resets to the default', async () => {
    await open('agent'); await toggle().click(); await checkApproval(false)
    await switchTo('approval-team'); await checkApproval(false)
    const carried = await teamSend(false, { '/lead': false, '/reviewer': false })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('main[data-ready="true"]').waitFor({ timeout: timeoutMs })
    await page.locator(sel('probe-chat')).click(); await page.locator(sel('chat-new')).waitFor({ timeout: timeoutMs })
    await checkApproval(true)
    return { carried, freshPageReloadTrue: true, desktopRestartClaim: false }
  })
  assert(evidence.browserEvents.length === 0, 'Unexpected browser page errors', evidence.browserEvents)
  assert(evidence.failures.length === 0, 'Unexpected GraphQL requests', evidence.failures)
} catch (error) {
  if (!evidence.failures.length) evidence.failures.push({ message: error.message, stack: error.stack })
  process.exitCode = 1
  await persist(); console.error(error)
} finally {
  if (browserServer) { try { await browserServer.close(); evidence.cleanup.browser = { status: 'closed', pid: evidence.browserPid } } catch(error) { evidence.cleanup.browser = cleanupFailure('cleanup-browser', 'browser', error); process.exitCode = 1 } }
  try { evidence.cleanup.devServer = await killOwnedProcess(devServer) } catch (error) { evidence.cleanup.devServer = cleanupFailure('cleanup', 'Nuxt', error); process.exitCode = 1 }
  devLogStream?.end()
  if (pageInstalled) { await fs.unlink(installedPagePath); evidence.cleanup.page = 'removed' }
  evidence.finishedAt = new Date().toISOString(); await persist()
  console.log(JSON.stringify({ result: process.exitCode ? 'Fail' : 'Pass', evidencePath, scenarios: evidence.scenarios, cleanup: evidence.cleanup }, null, 2))
}
