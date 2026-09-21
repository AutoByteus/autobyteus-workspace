#!/usr/bin/env node
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const fixturePath = path.join(scriptDir, 'fixtures/existing-run-model-config.page.vue')
const installedPagePath = path.join(webDir, 'pages/api-e2e-existing-run-model-config.vue')
const routePath = '/api-e2e-existing-run-model-config'

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback
}

const timeoutMs = Number(getArg('timeout-ms', '90000'))
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/existing-run-model-config'))
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
const evidencePath = path.join(outputDir, 'existing-run-model-config-evidence.json')
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
// Hold canonical reads until the browser has actually observed loading. A fixed
// delay can expire during cold module/render work before the assertion runs.
let releaseInitialAgentRead
let releaseInitialTeamRead
const initialAgentRead = new Promise((resolve) => { releaseInitialAgentRead = resolve })
const initialTeamRead = new Promise((resolve) => { releaseInitialTeamRead = resolve })
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

const modelConfig = (effort = 'low', summary = 'auto') => ({ reasoning_effort: effort, reasoning_summary: summary })
const launch = (effort = 'low') => ({
  runtime_kind: 'autobyteus',
  llm_model_identifier: 'gpt-5.6-luna',
  llm_config: modelConfig(effort),
  auto_execute_tools: false,
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: '/workspace/browser-probe',
})
const teamTree = {
  schema_version: 2,
  created_at: '2026-08-25T00:00:00.000Z',
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    address: '/',
    team_definition_id: 'team-definition-browser-1',
    team_definition_name: 'Browser Probe Team',
    team_run_id: 'team-run-browser-1',
    coordinator_address: '/coordinator',
    default_launch_configuration: launch('low'),
    task_executions: [],
    members: [
      {
        kind: 'configured_agent',
        address: '/coordinator',
        agent_definition_id: 'coordinator-definition',
        role: 'Coordinator',
        description: null,
        agent_run_id: 'coordinator-run-browser-1',
        platform_agent_run_id: null,
        launch_configuration: launch('low'),
      },
      ...['lead', 'reviewer'].map((name) => ({
        kind: 'configured_agent',
        address: '/' + name,
        agent_definition_id: name + '-definition',
        role: name,
        description: null,
        agent_run_id: name + '-run-browser-1',
        platform_agent_run_id: null,
        launch_configuration: launch('low'),
      })),
    ],
  },
}
const findConfigured = (tree, address) => address === '/'
  ? tree.root_team
  : tree.root_team.members.find((member) => member.address === address)

const catalogSnapshot = {
  __typename: 'ProviderModelCatalogSnapshotObject',
  runtimeKind: 'autobyteus',
  ownerProvider: { __typename: 'CatalogProviderObject', id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false, baseUrl: null, catalogMode: 'STATIC' },
  sources: [{ __typename: 'ModelSourceStatusObject', modelKind: 'LLM', state: 'READY', modelCount: 1, successfulUnitCount: 1, failedUnitCount: 0, safeMessage: null }],
  llmModels: [{
    __typename: 'ModelDetail',
    modelIdentifier: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    description: 'Deterministic browser fixture model.',
    value: 'gpt-5.6-luna',
    canonicalName: 'gpt-5.6-luna',
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

// AC-004: selecting a different model must display its schema/defaults, not old settings.
catalogSnapshot.llmModels.push({ ...clone(catalogSnapshot.llmModels[0]),
  modelIdentifier: 'browser-larger-model', name: 'Browser Larger Model',
  value: 'browser-larger-model', canonicalName: 'browser-larger-model',
  maxContextTokens: 272000, activeContextTokens: 272000,
})
const state = {
  agentModel: 'gpt-5.6-luna',
  replacementsEnabled: false,
  teamMutationMode: 'success',
  failTeamReads: 0,
  agentConfig: modelConfig('low'),
  teamTree: teamRunExecutionTreeDtoSchema.parse(teamTree),
  agentResumeReads: 0,
  teamResumeReads: 0,
  agentMutations: [],
  teamMutations: [],
  agentMutationMode: 'success',
}
const operationResponse = async (operationName, variables) => {
  if (operationName === 'GetAgentRunResumeConfig') {
    state.agentResumeReads += 1
    await initialAgentRead
    return { data: { getAgentRunResumeConfig: {
      runId: 'agent-run-browser-1',
      isActive: false,
      metadataConfig: {
        agentDefinitionId: 'agent-definition-browser-1',
        workspaceRootPath: '/workspace/browser-probe',
        llmModelIdentifier: state.agentModel,
        llmConfig: clone(state.agentConfig),
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        runtimeKind: 'autobyteus',
        runtimeReference: { runtimeKind: 'autobyteus', sessionId: null, threadId: null, metadata: null },
      },
      modelConfigEditability: { editable: true, reason: null },
    } } }
  }
  if (operationName === 'GetTeamRunResumeConfig') {
    state.teamResumeReads += 1
    if (state.failTeamReads > 0) { state.failTeamReads -= 1; return { errors: [{ message: 'Canonical verification temporarily unavailable.' }] } }
    await initialTeamRead
    return { data: { getTeamRunResumeConfig: {
      teamRunId: 'team-run-browser-1',
      isActive: false,
      executionTree: clone(state.teamTree),
      modelConfigEditability: { editable: true, reason: null },
    } } }
  }
  const options = (current) => ({ __typename: 'RunModelOptionsObject', currentModelIdentifier: current,
    currentContextTokens: state.replacementsEnabled ? (current === 'browser-larger-model' ? 272000 : 128000) : null,
    replacements: state.replacementsEnabled && current !== 'browser-larger-model'
      ? [{ llmModelIdentifier: 'browser-larger-model', contextTokens: 272000 }] : [],
    unavailableReason: state.replacementsEnabled ? null : 'Fixture has no replacement metadata.' })
  if (operationName === 'AgentRunModelOptions') return { data: { agentRunModelOptions: options(state.agentModel) } }
  if (operationName === 'TeamRunModelOptions') return { data: { teamRunModelOptions:
    ['/', ...state.teamTree.root_team.members.map(member => member.address)].map(scopeAddress => {
      const node = findConfigured(state.teamTree, scopeAddress)
      const config = scopeAddress === '/' ? node.default_launch_configuration : node.launch_configuration
      return { ...options(config.llm_model_identifier), __typename: 'TeamScopeModelOptionsObject', scopeAddress,
        scopeKind: scopeAddress === '/' ? 'CONFIGURED_TEAM' : 'CONFIGURED_AGENT' }
    }) } }
  if (operationName === 'GetProviderModelCatalogSnapshots') return { data: { providerModelCatalogSnapshots: [catalogSnapshot] } }
  if (operationName === 'GetRuntimeAvailabilities') return { data: { runtimeAvailabilities: [{ runtimeKind: 'autobyteus', enabled: true, reason: null }] } }
  if (operationName === 'UpdateStoppedAgentRunModelConfig') {
    state.agentMutations.push(clone(variables))
    await delay(250)
    if (state.agentMutationMode === 'run-active') {
      return { data: { updateStoppedAgentRunModelConfig: {
        success: false,
        outcome: 'RUN_ACTIVE',
        message: 'A supported external workflow resumed this run.',
        isActive: true,
        editability: { editable: false, reason: 'RUN_ACTIVE' },
        canonicalSelection: { llmModelIdentifier: state.agentModel, llmConfig: clone(state.agentConfig) },
        fieldErrors: [],
      } } }
    }
    state.agentModel = variables.input.llmModelIdentifier
    state.agentConfig = clone(variables.input.llmConfig)
    return { data: { updateStoppedAgentRunModelConfig: {
      success: true,
      outcome: 'UPDATED',
      message: 'Agent model settings saved.',
      isActive: false,
      editability: { editable: true, reason: null },
      canonicalSelection: { llmModelIdentifier: state.agentModel, llmConfig: clone(state.agentConfig) },
      fieldErrors: [],
    } } }
  }
  if (operationName === 'UpdateStoppedTeamRunModelConfigs') {
    const previousTree = clone(state.teamTree)
    const nextTree = clone(state.teamTree)
    state.teamMutations.push(clone(variables))
    await delay(250)
    for (const patch of variables.input.patches) {
      const target = findConfigured(nextTree, patch.scopeAddress)
      assert(target, `Mutation patch addressed unknown scope ${patch.scopeAddress}`)
      assert(patch.scopeKind === (patch.scopeAddress === '/' ? 'CONFIGURED_TEAM' : 'CONFIGURED_AGENT'), 'Mutation scope kind must match the exact flat configured scope', patch)
      const configuration = patch.scopeAddress === '/'
        ? target.default_launch_configuration
        : target.launch_configuration
      configuration.llm_model_identifier = patch.llmModelIdentifier
      configuration.llm_config = clone(patch.llmConfig)
    }
    state.teamTree = teamRunExecutionTreeDtoSchema.parse(nextTree)
    if (state.teamMutationMode === 'indeterminate') {
      state.failTeamReads = 1
      return { data: { updateStoppedTeamRunModelConfigs: {
        success: false, outcome: 'PERSISTENCE_INDETERMINATE', message: 'Verify the saved outcome before saving again.',
        isActive: false, editability: { editable: true, reason: null },
        canonicalExecutionTree: previousTree, fieldErrors: [],
      } } }
    }
    return { data: { updateStoppedTeamRunModelConfigs: {
      success: true,
      outcome: 'UPDATED',
      message: 'Team model settings saved.',
      isActive: false,
      editability: { editable: true, reason: null },
      canonicalExecutionTree: clone(state.teamTree),
      fieldErrors: [],
    } } }
  }
  throw new Error(`Unexpected GraphQL operation '${operationName || 'unknown'}'`)
}

let pageInstalled = false
let devServer
let devLogStream
let browser
let context
let page
const runScenario = async (id, description, fn) => {
  const startedAt = new Date().toISOString()
  try {
    const details = await fn()
    evidence.scenarios[id] = { id, description, status: 'Pass', startedAt, finishedAt: new Date().toISOString(), details }
  } catch (error) {
    let browserState
    if (page) {
      try {
        browserState = await page.evaluate(() => {
          const app = document.querySelector('#__nuxt')?.__vue_app__
          const pinia = app?.config?.globalProperties?.$pinia
          const catalogs = pinia?._s?.get('llmProviderConfig')
          const draft = pinia?._s?.get('existingRunModelConfig')
          return {
            bodyText: document.body.innerText,
            catalogByRuntimeKind: catalogs?.catalogByRuntimeKind,
            draftState: draft ? {
              draft: draft.draft,
              schemaStateByAddress: draft.schemaStateByAddress,
              feedback: draft.feedback,
            } : null,
          }
        })
      } catch {}
    }
    const failure = { id, description, message: error instanceof Error ? error.message : String(error), details: error?.details, browserState, stack: error instanceof Error ? error.stack : undefined }
    evidence.scenarios[id] = { id, description, status: 'Fail', startedAt, finishedAt: new Date().toISOString(), failure }
    evidence.failures.push(failure)
    if (page) {
      try { await page.screenshot({ path: path.join(outputDir, `${id}-failure.png`), fullPage: true }) } catch {}
    }
  } finally {
    // Failed observations must not leave a fixture response blocked for cleanup.
    if (id === 'API-E2E-004-A') releaseInitialAgentRead()
    if (id === 'API-E2E-004-B') releaseInitialTeamRead()
    // Persist each independent case before starting the next long-running journey.
    await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  }
}

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`)
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`)
  await fs.copyFile(fixturePath, installedPagePath)
  pageInstalled = true

  const port = await choosePort()
  const baseUrl = `http://127.0.0.1:${port}`
  evidence.port = port
  evidence.baseUrl = baseUrl
  devLogStream = createWriteStream(devLogPath, { flags: 'w' })
  devServer = spawn('pnpm', ['dev', '--port', String(port)], {
    cwd: webDir,
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9', NUXT_TELEMETRY_DISABLED: '1' },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  devServer.stdout.pipe(devLogStream)
  devServer.stderr.pipe(devLogStream)
  await waitFor('Nuxt fixture route readiness', async () => {
    if (devServer.exitCode !== null) throw new Error(`Nuxt dev server exited with ${devServer.exitCode}`)
    try { return (await fetch(`${baseUrl}${routePath}`)).ok } catch { return false }
  })

  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] })
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'Etc/UTC' })
  page = await context.newPage()
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }))
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }))
  page.on('requestfailed', (request) => evidence.browserEvents.push({ type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }))
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' } })
      return
    }
    try {
      const payload = request.postDataJSON()
      const operationName = payload.operationName || /(?:query|mutation)\s+(\w+)/.exec(payload.query || '')?.[1] || ''
      evidence.graphqlOperations.push({ operationName, variables: clone(payload.variables ?? {}) })
      const body = await operationResponse(operationName, payload.variables ?? {})
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(body),
      })
    } catch (error) {
      evidence.failures.push({ id: 'GRAPHQL-HARNESS', message: error instanceof Error ? error.message : String(error) })
      await route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ errors: [{ message: error instanceof Error ? error.message : String(error) }] }) })
    }
  })

  await runScenario('API-E2E-004-A', 'Agent Settings loads network-fresh, locks runtime identity, and saves a same-model selection', async () => {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.locator('[data-test="existing-run-model-config-probe"]').waitFor({ state: 'visible', timeout: timeoutMs })
    await page.waitForFunction(() => Boolean(window.__existingRunModelConfigProbe), null, { timeout: timeoutMs })
    const editor = page.locator('[data-test="editor-host"] > div')
    await editor.waitFor({ state: 'visible', timeout: timeoutMs })
    assert(await editor.getAttribute('aria-busy') === 'true', 'Agent Settings must remain busy while the network-fresh canonical read is delayed')
    const save = page.locator('[data-test="save-existing-model-config"]')
    assert(await save.isDisabled(), 'Save must be disabled during Agent canonical loading')
    releaseInitialAgentRead()
    const effort = page.locator('#agent-run-reasoning_effort')
    await effort.waitFor({ state: 'visible', timeout: timeoutMs })
    await waitFor('Agent schema readiness', async () => await effort.isEnabled())
    assert(await page.locator('#agent-run-runtime-kind').isDisabled(), 'Existing Agent runtime must remain fixed')
    const modelButton = page.locator('#agent-run-runtime-kind').locator('xpath=../following-sibling::div[1]//button').first()
    assert(await modelButton.isEnabled(), 'Stopped Agent model selection must be editable')
    assert((await page.locator('[data-test="editor-host"]').innerText()).includes('This run is stopped.'), 'Agent stopped editability notice must render')
    await effort.selectOption('high')
    await waitFor('Agent Save enablement', async () => !(await save.isDisabled()))
    await save.click()
    await waitFor('Agent save completion', async () => (await page.locator('[role="status"]').allTextContents()).some((text) => text.includes('Agent model settings saved.')))
    assert(await save.isDisabled(), 'Agent Save must return to a clean disabled baseline')
    assert(state.agentMutations.length === 1, 'Exactly one Agent mutation must be sent', state.agentMutations)
    assert(JSON.stringify(state.agentMutations[0]) === JSON.stringify({ input: {
      agentRunId: 'agent-run-browser-1',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: modelConfig('high'),
    } }), 'Agent mutation must contain run ID and the required selection with no revision/runtime input', state.agentMutations[0])
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-A-agent-saved.png'), fullPage: true })
    return { mutation: state.agentMutations[0], resumeReads: state.agentResumeReads }
  })

  await runScenario('API-E2E-004-B', 'Flat Team Settings renders root plus direct Agents and saves one exact configured-Agent patch', async () => {
    await page.locator('[data-test="show-team"]').click()
    const editor = page.locator('[data-test="editor-host"] > div')
    await waitFor('Team canonical loading state', async () => await editor.getAttribute('aria-busy') === 'true')
    const save = page.locator('[data-test="save-existing-model-config"]')
    assert(await save.isDisabled(), 'Save must be disabled during Team canonical loading')
    releaseInitialTeamRead()
    const form = page.locator('[data-test="team-run-config-form"]')
    await form.waitFor({ state: 'visible', timeout: timeoutMs })
    assert(await form.getAttribute('data-mode') === 'existing', 'Team must render in existing-run mode')
    assert(await page.locator('[data-test="reset-team-scope"]').count() === 0, 'Existing Team Settings must expose no Reset affordance')
    assert(await page.locator('#team-scope-root-runtime-kind').isDisabled(), 'Root Team runtime must remain fixed')
    const disclosure = page.locator('[data-test="team-member-overrides-toggle"]')
    assert(await disclosure.getAttribute('aria-expanded') === 'false', 'Team member hierarchy must begin collapsed')
    await disclosure.click()
    assert(await disclosure.getAttribute('aria-expanded') === 'true', 'Team member hierarchy disclosure must be operable')
    assert(await page.locator('[data-test="member-override-item"]').count() === 3, 'Flat configured hierarchy must render coordinator, direct lead, and direct reviewer')
    assert(await page.locator('[data-test="root-team-config-fields"]').count() === 1, 'Exactly one root Team editor is present')
    assert(await page.locator('[data-test="team-scope-config-editor"]').count() === 0, 'Flat Team settings expose no mounted-Team scope editor')
    const reviewerEffort = page.locator('#existing--reviewer-reasoning_effort')
    await reviewerEffort.waitFor({ state: 'visible', timeout: timeoutMs })
    await waitFor('all Team schemas ready', async () => await reviewerEffort.isEnabled())
    assert(await page.locator('#existing--reviewer-runtime-kind').isDisabled(), 'Direct reviewer runtime must remain fixed')
    await reviewerEffort.selectOption('high')
    await waitFor('Team Save enablement', async () => !(await save.isDisabled()))
    await save.click()
    await waitFor('Team save completion', async () => (await page.locator('[role="status"]').allTextContents()).some((text) => text.includes('Team model settings saved.')))
    assert(await save.isDisabled(), 'Team Save must return to a clean disabled baseline')
    assert(state.teamMutations.length === 1, 'Exactly one Team mutation must be sent', state.teamMutations)
    assert(JSON.stringify(state.teamMutations[0]) === JSON.stringify({ input: {
      teamRunId: 'team-run-browser-1',
      patches: [{ scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/reviewer', llmModelIdentifier: 'gpt-5.6-luna', llmConfig: modelConfig('high') }],
    } }), 'Team mutation must contain one narrow configured-Agent patch with no revision/runtime input', state.teamMutations[0])
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-B-team-saved.png'), fullPage: true })
    return { mutation: state.teamMutations[0], renderedMembers: 3, resumeReads: state.teamResumeReads }
  })

  await runScenario('API-E2E-004-C', 'Narrow browser viewport keeps the existing Team Settings editor usable without page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    const save = page.locator('[data-test="save-existing-model-config"]')
    await save.scrollIntoViewIfNeeded()
    const layout = await page.evaluate(() => {
      const button = document.querySelector('[data-test="save-existing-model-config"]')
      const rect = button?.getBoundingClientRect()
      return {
        viewportWidth: innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        saveRect: rect ? { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom } : null,
      }
    })
    assert(layout.documentScrollWidth <= layout.viewportWidth + 1, 'Settings must not create page-level horizontal overflow', layout)
    assert(layout.saveRect && layout.saveRect.left >= 0 && layout.saveRect.right <= layout.viewportWidth + 1 && layout.saveRect.width > 0, 'Save action must remain horizontally reachable at narrow width', layout)
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-C-team-narrow.png'), fullPage: false })
    return layout
  })

  await runScenario('API-E2E-004-D', 'A supported external activation makes an already-open Agent Save return RUN_ACTIVE and relock', async () => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.locator('[data-test="show-agent"]').click()
    const effort = page.locator('#agent-run-reasoning_effort')
    await effort.waitFor({ state: 'visible', timeout: timeoutMs })
    await waitFor('reopened Agent schema readiness', async () => await effort.isEnabled())
    assert(await effort.inputValue() === 'high', 'A later fresh Settings load must use the previous successful canonical value')
    await effort.selectOption('low')
    const save = page.locator('[data-test="save-existing-model-config"]')
    await waitFor('Agent Save re-enablement', async () => !(await save.isDisabled()))
    state.agentMutationMode = 'run-active'
    const resumeReadsBeforeSave = state.agentResumeReads
    await save.click()
    await waitFor('RUN_ACTIVE feedback and relock', async () => {
      const alerts = await page.locator('[role="alert"]').allTextContents()
      return alerts.some((text) => text.includes('A supported external workflow resumed this run.')) && await effort.isDisabled()
    })
    assert(await save.isDisabled(), 'RUN_ACTIVE must disable repeat Save')
    assert(state.agentResumeReads === resumeReadsBeforeSave, 'RUN_ACTIVE must relock directly without an implicit canonical refresh', { resumeReadsBeforeSave, after: state.agentResumeReads })
    assert((await page.locator('[data-test="editor-host"]').innerText()).includes('Stop this run before changing model settings.'), 'Active Agent notice must replace the stopped notice')
    assert(JSON.stringify(state.agentMutations.at(-1)) === JSON.stringify({ input: {
      agentRunId: 'agent-run-browser-1',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: modelConfig('low'),
    } }), 'RUN_ACTIVE attempt must remain revision-free and contain the required selection', state.agentMutations.at(-1))
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-D-agent-run-active.png'), fullPage: true })
    return { mutation: state.agentMutations.at(-1), resumeReadsBeforeSave, resumeReadsAfterSave: state.agentResumeReads }
  })

  await runScenario('API-E2E-004-E', 'Compatible Agent replacement uses keyboard selection, target defaults and the complete canonical pair', async () => {
    state.replacementsEnabled = true
    state.agentMutationMode = 'success'
    // Isolate this stopped-subject case from the explicit active lock asserted in D.
    await page.reload({ waitUntil: 'domcontentloaded' })
    const runtime = page.locator('#agent-run-runtime-kind')
    await runtime.waitFor({ state: 'visible' })
    await waitFor('Agent replacement options', async () => !(await page.locator('[data-test="model-capacity-status"]').count()))
    assert(await runtime.isDisabled(), 'Replacement must not unlock runtime')
    const picker = runtime.locator('xpath=../following-sibling::div[1]//button').first()
    const mutationsBefore = state.agentMutations.length
    await picker.click()
    const search = page.getByPlaceholder('Search models...')
    await search.fill('browser-larger-model')
    await page.locator('li[role="option"]').first().waitFor({ state: 'visible' })
    await search.press('ArrowDown')
    await page.keyboard.press('Enter')
    const save = page.locator('[data-test="save-existing-model-config"]')
    await waitFor('replacement dirty Save', async () => await save.isEnabled())
    assert((await picker.innerText()).includes('browser-larger-model'), 'Picker must display target')
    assert(await page.locator('#agent-run-reasoning_effort').inputValue() === 'low', 'Target default must replace old explicit effort')
    await save.click()
    await waitFor('canonical Agent replacement', async () => state.agentModel === 'browser-larger-model' && await save.isDisabled()
      && (await page.locator('[role="status"]').allTextContents()).some(text => text.includes('Agent model settings saved.')))
    assert(state.agentMutations.length === mutationsBefore + 1, 'One Agent replacement mutation')
    const mutation = state.agentMutations.at(-1)
    assert(mutation.input.llmModelIdentifier === 'browser-larger-model', 'Save must include target identifier')
    assert(Object.hasOwn(mutation.input, 'llmConfig'), 'Save must include explicit nullable config')
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-E-agent-replaced.png'), fullPage: true })
    return { mutation, canonicalModel: state.agentModel, canonicalConfig: state.agentConfig }
  })

  await runScenario('API-E2E-004-F', 'Flat Team replacement preserves divergent and directly edited Agents and verifies one all-scope save with Retry', async () => {
    state.teamMutationMode = 'indeterminate'
    await page.locator('[data-test="show-team"]').click()
    const runtime = page.locator('#team-scope-root-runtime-kind')
    await runtime.waitFor({ state: 'visible' })
    await waitFor('Team replacement options', async () => !(await page.locator('[data-test="model-capacity-status"]').count()))
    const beforeMutations = state.teamMutations.length
    const beforeReads = state.teamResumeReads
    const priorTree = clone(state.teamTree)
    const disclosure = page.locator('[data-test="team-member-overrides-toggle"]')
    assert(await disclosure.getAttribute('aria-expanded') === 'false', 'Fresh Team settings begin collapsed')
    await disclosure.focus()
    await page.keyboard.press('Enter')
    const leadEffort = page.locator('#existing--lead-reasoning_effort')
    await leadEffort.waitFor({ state: 'visible' })
    assert(await leadEffort.inputValue() === 'low', 'Lead begins linked to the saved root')
    await leadEffort.selectOption('high')
    assert(await page.locator('#existing--reviewer-reasoning_effort').inputValue() === 'high', 'Reviewer begins divergent from its earlier saved edit')
    const picker = runtime.locator('xpath=../following-sibling::div[1]//button').first()
    await picker.click()
    const search = page.getByPlaceholder('Search models...')
    await search.fill('browser-larger-model')
    await page.locator('li[role="option"]').first().waitFor({ state: 'visible' })
    await search.press('ArrowDown')
    await page.keyboard.press('Enter')
    const save = page.locator('[data-test="save-existing-model-config"]')
    await waitFor('Team replacement Save', async () => await save.isEnabled())
    assert(await leadEffort.inputValue() === 'high', 'Directly edited lead must not inherit root replacement defaults')
    assert(await page.locator('#existing--coordinator-reasoning_effort').inputValue() === 'low', 'Linked coordinator follows replacement defaults')
    assert(await page.locator('#existing--reviewer-reasoning_effort').inputValue() === 'high', 'Divergent reviewer remains unchanged')
    await save.click()
    const retry = page.getByRole('button', {name:'Retry',exact:true})
    await retry.waitFor({ state: 'visible' })
    assert(await save.isDisabled() && await picker.isDisabled(), 'Unverified outcome must lock duplicate Save and model control')
    await retry.click()
    await waitFor('Team verification resolved', async () => await retry.count() === 0 && await picker.isEnabled())
    assert(await save.isDisabled(), 'Verified canonical pair must be clean')
    assert((await picker.innerText()).includes('browser-larger-model'), 'Canonical replacement must be displayed')
    assert(state.teamMutations.length === beforeMutations + 1, 'Retry must not repeat the mutation')
    assert(state.teamResumeReads === beforeReads + 2, 'One failed and one successful canonical verification')
    const patches = state.teamMutations.at(-1).input.patches
    assert(JSON.stringify(patches.map(p => p.scopeAddress).sort()) === JSON.stringify(['/', '/coordinator', '/lead'].sort()), 'One save includes root, linked coordinator and independently edited lead; saved divergent reviewer is excluded', patches)
    const expectedTree = clone(priorTree)
    for (const address of ['/', '/coordinator']) {
      const patch = patches.find(patch => patch.scopeAddress === address)
      assert(patch.llmModelIdentifier === 'browser-larger-model' && patch.llmConfig === null, 'Linked selections commit the exact replacement/null pair', patch)
      const node = findConfigured(expectedTree, address)
      const launchConfig = address === '/' ? node.default_launch_configuration : node.launch_configuration
      Object.assign(launchConfig, { llm_model_identifier: 'browser-larger-model', llm_config: null })
    }
    const leadPatch = patches.find(patch => patch.scopeAddress === '/lead')
    assert(JSON.stringify(leadPatch) === JSON.stringify({ scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/lead',
      llmModelIdentifier: 'gpt-5.6-luna', llmConfig: modelConfig('high') }), 'Directly edited lead retains its own model/settings pair', leadPatch)
    findConfigured(expectedTree, '/lead').launch_configuration.llm_config = modelConfig('high')
    assert(JSON.stringify(state.teamTree) === JSON.stringify(teamRunExecutionTreeDtoSchema.parse(expectedTree)), 'Canonical flat tree preserves divergent member, identities, task records and all fixed configuration', state.teamTree)
    assert(await leadEffort.inputValue() === 'high', 'Verification restores directly edited member value')
    assert(await page.locator('#existing--reviewer-reasoning_effort').inputValue() === 'high', 'Verification preserves divergent member value')
    assert(!(await page.locator('[role="alert"]').allTextContents()).some(text => text.includes('Verify the saved outcome')), 'Verified feedback must clear obsolete error')
    await page.setViewportSize({ width: 390, height: 844 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Verified expanded flat members must fit the narrow viewport')
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-F-team-verified-narrow.png'), fullPage: true })
    return { mutation: state.teamMutations.at(-1), verificationReads: state.teamResumeReads - beforeReads }
  })

  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror')
  if (pageErrors.length) evidence.failures.push({ id: 'BROWSER-PAGE-ERRORS', message: 'Unexpected browser page errors', details: pageErrors })
} catch (error) {
  evidence.failures.push({ id: 'HARNESS', message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
} finally {
  if (context) {
    try { await context.close(); evidence.cleanup.context = 'closed' } catch (error) { evidence.cleanup.context = cleanupFailure('CLEANUP-CONTEXT', 'browser context', error) }
  } else evidence.cleanup.context = 'not-started'
  if (browser) {
    try { await browser.close(); evidence.cleanup.browser = 'closed' } catch (error) { evidence.cleanup.browser = cleanupFailure('CLEANUP-BROWSER', 'browser', error) }
  } else evidence.cleanup.browser = 'not-started'
  try { evidence.cleanup.devServer = await killOwnedProcess(devServer) } catch (error) { evidence.cleanup.devServer = cleanupFailure('CLEANUP-DEV-SERVER', 'Nuxt dev server', error) }
  if (devLogStream) {
    try { await new Promise((resolve, reject) => { devLogStream.once('error', reject); devLogStream.end(resolve) }); evidence.cleanup.devLog = 'closed' } catch (error) { evidence.cleanup.devLog = cleanupFailure('CLEANUP-DEV-LOG', 'Nuxt log', error) }
  } else evidence.cleanup.devLog = 'not-started'
  if (pageInstalled) {
    try { await fs.rm(installedPagePath, { force: true }); assert(!existsSync(installedPagePath), 'Temporary fixture page still exists'); evidence.cleanup.temporaryPage = 'removed' } catch (error) { evidence.cleanup.temporaryPage = cleanupFailure('CLEANUP-TEMPORARY-PAGE', 'temporary Nuxt page', error) }
  } else evidence.cleanup.temporaryPage = 'not-installed'
  evidence.finishedAt = new Date().toISOString()
  evidence.result = evidence.failures.length ? 'Fail' : 'Pass'
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
}

if (evidence.failures.length) {
  console.error(`Existing run model-config probe failed with ${evidence.failures.length} failure(s). Evidence: ${evidencePath}`)
  for (const failure of evidence.failures) console.error(`- ${failure.id}: ${failure.message}`)
  process.exitCode = 1
} else {
  console.log(`Existing run model-config probe passed. Evidence: ${evidencePath}`)
}
