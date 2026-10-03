#!/usr/bin/env node
// Frontend-only approval regression: real Library → RunConfigPanel/forms → Run → first-send
// GraphQL transport. Own Nuxt/Chrome and deterministic reads. Launch mutations intentionally
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
    case 'GetProjectsCapability': return { projectsCapability: { enabled: false, settingKey: 'ENABLE_PROJECTS', source: 'INITIALIZED_EMPTY_CATALOG' } }
    case 'GetSkillImprovementCapability': return { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } }
    default: throw new Error(`Unexpected GraphQL operation ${name}`)
  }
}
let pageInstalled = false, devServer, devLogStream, browser, browserServer, context, page
const persist = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
const scenario = async (id, description, run) => {
  try {
    evidence.scenarios[id] = { status: 'Pass', description, details: await run() }
  } catch (error) {
    const failure = { id, description, message: error.message, stack: error.stack,
      details: error.details, body: page ? await page.locator('body').innerText().catch(() => '') : '' }
    evidence.scenarios[id] = { status: 'Fail', failure }; evidence.failures.push(failure)
    await page?.screenshot({ path: path.join(outputDir, `${id}-failure.png`), fullPage: true }).catch(() => {})
    throw error
  } finally { evidence.inputs = inputs; await persist(); if (ledgerPath) await fs.appendFile(ledgerPath, `\n${new Date().toISOString()} ${id}: ${evidence.scenarios[id].status}; ${description}; evidence ${evidencePath}\n`) }
}
const sel = t => `[data-test="${t}"]`
const library = name => page.locator(sel('probe-library-host')).getByRole('button', { name: new RegExp(name) })
const approval = () => page.locator(sel('probe-config-host')).getByRole('switch').first()
const checkApproval = async (checked, disabled = false) => {
  await waitFor(`approval ${checked}`, async () => await approval().getAttribute('aria-checked') === String(checked) && await approval().isDisabled() === disabled)
  assert(await approval().isDisabled() === disabled, `Approval disabled expected ${disabled}`)
}
const open = async (name, viewport = { width: 1280, height: 900 }) => {
  await page.setViewportSize(viewport)
  await page.goto(`${evidence.baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
  await library(name).click({ timeout: 30000 })
  await approval().waitFor({ timeout: timeoutMs })
}
const modelTwo = async () => {
  const host = page.locator(sel('probe-config-host'))
  await host.locator('button[aria-haspopup="listbox"]').first().click()
  await page.getByRole('option', { name: /approval-model-two/ }).click()
}
const configureWorkspace = async (root = '/workspace/approval-two') => {
  const host = page.locator(sel('probe-config-host'))
  await host.getByRole('tab', { name: 'New', exact: true }).first().click()
  await host.getByPlaceholder('/absolute/path/to/workspace', { exact: true }).fill(root)
}
const agentSend = async (expected) => {
  const n = inputs.agents.length
  await page.locator('button.run-btn').click()
  await page.locator(sel('probe-input-host')).getByRole('textbox').fill('Validate approval boundary')
  await page.locator(sel('probe-input-host')).getByRole('textbox').press('Enter')
  await waitFor('PrepareAgentRun input', () => inputs.agents.length === n + 1)
  const input = inputs.agents.at(-1)
  assert(input.autoExecuteTools === expected, `Agent approval expected ${expected}`, input)
  return input
}
const teamSend = async (root, members) => {
  const n = inputs.teams.length
  await page.locator('button.run-btn').click()
  await waitFor('CreateAgentTeamRun input', () => inputs.teams.length === n + 1)
  const input = inputs.teams.at(-1)
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
  // Recheck the previously failing mobile journey before the remaining regression cases.
  await scenario('B08', 'Dedicated mobile Agent/Team setup defaults and helper agree', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${evidence.baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
    await library('Approval Agent').waitFor({ timeout: timeoutMs })
    await page.locator(sel('probe-mobile')).click()
    const observations = []
    for (const target of ['agent', 'team']) {
      await page.locator(`[data-testid="mobile-run-setup-${target}-mode"]`).click()
      await page.locator(`[data-testid="mobile-run-${target}-select-toggle"]`).click()
      await page.locator(`[data-testid="mobile-run-${target}-select-option"]`).filter({ hasText: target === 'agent' ? 'Approval Agent' : 'Approval Team' }).click()
      const toggle = page.locator('[data-testid="mobile-run-auto-approve-tools-switch"]')
      await waitFor('Mobile fresh true', async () => await toggle.getAttribute('aria-checked') === 'true')
      const help = await page.locator('[data-testid="mobile-run-auto-approve-tools-help"]').innerText()
      await page.screenshot({ path: path.join(outputDir, `B08-${target}-fresh.png`), fullPage: true })
      await toggle.click()
      await waitFor('Mobile opt-out false', async () => await toggle.getAttribute('aria-checked') === 'false')
      observations.push({ target, freshChecked: true, optOutChecked: false, help })
    }
    evidence.mobileObservations = observations
    assert(observations.every(row => !/off by default/i.test(row.help)), 'Mobile helper contradicts the approved fresh true default', observations)
    return observations
  })
  await scenario('B01', 'Library Agent fresh true and first-send true', async () => {
    await open('Approval Agent'); await checkApproval(true)
    await configureWorkspace(); return await agentSend(true)
  })
  await scenario('B02', 'Narrow Agent opt-out survives model/workspace/permitted runtime edits', async () => {
    await open('Approval Agent', { width: 390, height: 844 }); await approval().click(); await checkApproval(false)
    await modelTwo(); await checkApproval(false); await configureWorkspace(); await checkApproval(false)
    await page.locator(sel('probe-config-host')).locator('select').first().selectOption('claude_agent_sdk'); await checkApproval(false)
    await page.locator(sel('probe-config-host')).locator('select').first().selectOption('autobyteus'); await checkApproval(false)
    // Runtime changes legitimately clear the old model; choose the runnable current catalog model.
    await modelTwo(); await checkApproval(false)
    const input = await agentSend(false)
    assert(input.llmModelIdentifier === 'approval-model-two', 'Model edit should submit')
    return input
  })
  await scenario('B03', 'Library Team root and inherited members submit true', async () => {
    await open('Approval Team'); await checkApproval(true)
    await configureWorkspace(); return await teamSend(true, { '/lead': true, '/reviewer': true })
  })
  await scenario('B04', 'Team opt-out ordinary edits and explicit member false', async () => {
    await open('Approval Team'); await approval().click(); await checkApproval(false)
    await modelTwo(); await configureWorkspace(); await checkApproval(false)
    const off = await teamSend(false, { '/lead': false, '/reviewer': false })
    await open('Approval Team'); await configureWorkspace()
    await page.locator(sel('team-member-overrides-toggle')).click()
    const reviewer = page.locator(sel('member-override-item')).filter({ hasText: 'reviewer' })
    // The member control is three-state (Global → On → Off), not a binary root switch.
    await reviewer.getByRole('checkbox').click()
    await reviewer.getByRole('checkbox').click()
    assert((await reviewer.innerText()).includes('Off'), 'Member must explicitly show Off')
    return { off, explicit: await teamSend(true, { '/lead': true, '/reviewer': false }) }
  })
  await scenario('B05', 'Missing workspace blocks; Antigravity stays checked/locked', async () => {
    await open('Approval Agent'); await configureWorkspace('')
    assert(await page.locator('button.run-btn').isDisabled(), 'Missing workspace must block launch')
    await page.locator(sel('probe-config-host')).locator('select').first().selectOption('antigravity_cli'); await checkApproval(true, true)
    await open('Approval Team'); await page.locator('#team-scope-root-runtime-kind').selectOption('antigravity_cli')
    await checkApproval(true, true)
    return { missingWorkspaceBlocked: true, agentAndTeamAntigravityLocked: true }
  })
  await scenario('B06', 'Chat Agent/Team true defaults and deliberate opt-out reach launch boundaries', async () => {
    const runs = []
    for (const target of ['agent', 'team']) for (const expected of [true, false]) {
      await page.goto(`${evidence.baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' })
      await library('Approval Agent').waitFor({ timeout: timeoutMs })
      await page.locator(sel('probe-chat')).click()
      const toggle = page.locator(sel('chat-approval-toggle'))
      await waitFor('Chat true default', async () => await toggle.getAttribute('aria-pressed') === 'true')
      if (target === 'team') {
        await page.locator(sel('chat-message-input')).fill('@Approval')
        await page.locator(sel('chat-target-option-approval-team')).click()
        await waitFor('Chat Team stays true', async () => await toggle.getAttribute('aria-pressed') === 'true')
      }
      if (!expected) await toggle.click()
      const requests = target === 'agent' ? inputs.agents : inputs.teams
      const n = requests.length
      await page.locator(sel('chat-message-input')).fill('Validate Chat approval')
      await page.locator(sel('chat-primary-action')).click()
      await waitFor('Chat launch input', () => requests.length === n + 1)
      const input = requests.at(-1)
      if (target === 'agent') assert(input.autoExecuteTools === expected, 'Chat Agent approval mismatch', input)
      else {
        assert(input.teamConfigs[0].autoExecuteTools === expected, 'Chat Team root mismatch', input)
        assert(input.memberConfigs.length === 2 && input.memberConfigs.every(member => member.autoExecuteTools === expected), 'Chat Team inheritance mismatch', input)
      }
      runs.push({ target, expected, input })
    }
    return runs
  })
  await scenario('B07', 'Existing draft false copied through RunningAgentsPanel; fresh session resets only fresh defaults', async () => {
    await open('Approval Agent'); await approval().click(); await configureWorkspace()
    await page.locator('button.run-btn').click()
    await page.locator(sel('probe-running-host')).locator('button.create-btn').click()
    await checkApproval(false)
    const copied = await agentSend(false)
    await page.reload({ waitUntil: 'domcontentloaded' }); await library('Approval Agent').click(); await checkApproval(true)
    return { copied, freshPageReloadTrue: true, desktopRestartClaim: false }
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
