#!/usr/bin/env node
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
      {
        kind: 'configured_team',
        address: '/Nested',
        team_definition_id: 'nested-team-definition',
        role: 'Review Team',
        description: null,
        team_run_id: 'nested-team-run-browser-1',
        coordinator_address: '/Nested/lead',
        default_launch_configuration: launch('low'),
        task_executions: [],
        members: [
          {
            kind: 'configured_agent',
            address: '/Nested/lead',
            agent_definition_id: 'lead-definition',
            role: 'Lead',
            description: null,
            agent_run_id: 'lead-run-browser-1',
            platform_agent_run_id: null,
            launch_configuration: launch('low'),
          },
          {
            kind: 'configured_agent',
            address: '/Nested/reviewer',
            agent_definition_id: 'reviewer-definition',
            role: 'Reviewer',
            description: null,
            agent_run_id: 'reviewer-run-browser-1',
            platform_agent_run_id: null,
            launch_configuration: launch('low'),
          },
        ],
      },
    ],
  },
}
const findConfigured = (tree, address) => {
  const visit = (members) => {
    for (const member of members) {
      if (member.address === address) return member
      if (member.kind === 'configured_team') {
        const nested = visit(member.members)
        if (nested) return nested
      }
    }
    return null
  }
  return address === '/' ? tree.root_team : visit(tree.root_team.members)
}
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

const state = {
  agentConfig: modelConfig('low'),
  teamTree: clone(teamTree),
  agentResumeReads: 0,
  teamResumeReads: 0,
  agentMutations: [],
  teamMutations: [],
  agentMutationMode: 'success',
}
const operationResponse = async (operationName, variables) => {
  if (operationName === 'GetAgentRunResumeConfig') {
    state.agentResumeReads += 1
    if (state.agentResumeReads === 1) await delay(700)
    return { data: { getAgentRunResumeConfig: {
      runId: 'agent-run-browser-1',
      isActive: false,
      metadataConfig: {
        agentDefinitionId: 'agent-definition-browser-1',
        workspaceRootPath: '/workspace/browser-probe',
        llmModelIdentifier: 'gpt-5.6-luna',
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
    if (state.teamResumeReads === 1) await delay(700)
    return { data: { getTeamRunResumeConfig: {
      teamRunId: 'team-run-browser-1',
      isActive: false,
      executionTree: clone(state.teamTree),
      modelConfigEditability: { editable: true, reason: null },
    } } }
  }
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
        canonicalLlmConfig: clone(state.agentConfig),
        fieldErrors: [],
      } } }
    }
    state.agentConfig = clone(variables.input.llmConfig)
    return { data: { updateStoppedAgentRunModelConfig: {
      success: true,
      outcome: 'UPDATED',
      message: 'Agent model settings saved.',
      isActive: false,
      editability: { editable: true, reason: null },
      canonicalLlmConfig: clone(state.agentConfig),
      fieldErrors: [],
    } } }
  }
  if (operationName === 'UpdateStoppedTeamRunModelConfigs') {
    state.teamMutations.push(clone(variables))
    await delay(250)
    for (const patch of variables.input.patches) {
      const target = findConfigured(state.teamTree, patch.scopeAddress)
      assert(target, `Mutation patch addressed unknown scope ${patch.scopeAddress}`)
      const configuration = patch.scopeAddress === '/' || target.kind === 'configured_team'
        ? target.default_launch_configuration
        : target.launch_configuration
      configuration.llm_config = clone(patch.llmConfig)
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

  await runScenario('API-E2E-004-A', 'Agent Settings loads network-fresh, locks fixed identity, and saves model config only', async () => {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.locator('[data-test="existing-run-model-config-probe"]').waitFor({ state: 'visible', timeout: timeoutMs })
    await page.waitForFunction(() => Boolean(window.__existingRunModelConfigProbe), null, { timeout: timeoutMs })
    const editor = page.locator('[data-test="editor-host"] > div')
    await editor.waitFor({ state: 'visible', timeout: timeoutMs })
    assert(await editor.getAttribute('aria-busy') === 'true', 'Agent Settings must remain busy while the network-fresh canonical read is delayed')
    const save = page.locator('[data-test="save-existing-model-config"]')
    assert(await save.isDisabled(), 'Save must be disabled during Agent canonical loading')
    const effort = page.locator('#agent-run-reasoning_effort')
    await effort.waitFor({ state: 'visible', timeout: timeoutMs })
    await waitFor('Agent schema readiness', async () => await effort.isEnabled())
    assert(await page.locator('#agent-run-runtime-kind').isDisabled(), 'Existing Agent runtime must remain fixed')
    const modelButton = page.locator('#agent-run-runtime-kind').locator('xpath=../following-sibling::div[1]//button').first()
    assert(await modelButton.isDisabled(), 'Existing Agent model identity must remain fixed')
    assert((await page.locator('[data-test="editor-host"]').innerText()).includes('This run is stopped.'), 'Agent stopped editability notice must render')
    await effort.selectOption('high')
    await waitFor('Agent Save enablement', async () => !(await save.isDisabled()))
    await save.click()
    await waitFor('Agent save completion', async () => (await page.locator('[role="status"]').allTextContents()).some((text) => text.includes('Agent model settings saved.')))
    assert(await save.isDisabled(), 'Agent Save must return to a clean disabled baseline')
    assert(state.agentMutations.length === 1, 'Exactly one Agent mutation must be sent', state.agentMutations)
    assert(JSON.stringify(state.agentMutations[0]) === JSON.stringify({ input: {
      agentRunId: 'agent-run-browser-1',
      llmConfig: modelConfig('high'),
    } }), 'Agent mutation must contain only run ID and model config with no revision or fixed-field input', state.agentMutations[0])
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-A-agent-saved.png'), fullPage: true })
    return { mutation: state.agentMutations[0], resumeReads: state.agentResumeReads }
  })

  await runScenario('API-E2E-004-B', 'Full nested Team Settings renders and saves one exact configured-Agent patch', async () => {
    await page.locator('[data-test="show-team"]').click()
    const editor = page.locator('[data-test="editor-host"] > div')
    await waitFor('Team canonical loading state', async () => await editor.getAttribute('aria-busy') === 'true')
    const save = page.locator('[data-test="save-existing-model-config"]')
    assert(await save.isDisabled(), 'Save must be disabled during Team canonical loading')
    const form = page.locator('[data-test="team-run-config-form"]')
    await form.waitFor({ state: 'visible', timeout: timeoutMs })
    assert(await form.getAttribute('data-mode') === 'existing', 'Team must render in existing-run mode')
    assert(await page.locator('[data-test="reset-team-scope"]').count() === 0, 'Existing Team Settings must expose no Reset affordance')
    assert(await page.locator('#team-scope-root-runtime-kind').isDisabled(), 'Root Team runtime must remain fixed')
    const disclosure = page.locator('[data-test="team-member-overrides-toggle"]')
    assert(await disclosure.getAttribute('aria-expanded') === 'false', 'Team member hierarchy must begin collapsed')
    await disclosure.click()
    assert(await disclosure.getAttribute('aria-expanded') === 'true', 'Team member hierarchy disclosure must be operable')
    assert(await page.locator('[data-test="member-override-item"]').count() === 3, 'Full configured hierarchy must render coordinator, nested lead, and nested reviewer')
    const nestedEditor = page.locator('[data-test="team-scope-config-editor"][data-team-address="/Nested"]')
    await nestedEditor.locator('button[aria-controls="team-scope-Nested-panel"]').click()
    const reviewerEffort = page.locator('#existing--Nested-reviewer-reasoning_effort')
    await reviewerEffort.waitFor({ state: 'visible', timeout: timeoutMs })
    await waitFor('all Team schemas ready', async () => await reviewerEffort.isEnabled())
    assert(await page.locator('#existing--Nested-reviewer-runtime-kind').isDisabled(), 'Nested reviewer runtime must remain fixed')
    await reviewerEffort.selectOption('high')
    await waitFor('Team Save enablement', async () => !(await save.isDisabled()))
    await save.click()
    await waitFor('Team save completion', async () => (await page.locator('[role="status"]').allTextContents()).some((text) => text.includes('Team model settings saved.')))
    assert(await save.isDisabled(), 'Team Save must return to a clean disabled baseline')
    assert(state.teamMutations.length === 1, 'Exactly one Team mutation must be sent', state.teamMutations)
    assert(JSON.stringify(state.teamMutations[0]) === JSON.stringify({ input: {
      teamRunId: 'team-run-browser-1',
      patches: [{ scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/Nested/reviewer', llmConfig: modelConfig('high') }],
    } }), 'Team mutation must contain one narrow configured-Agent patch with no revision or fixed-field input', state.teamMutations[0])
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
      llmConfig: modelConfig('low'),
    } }), 'RUN_ACTIVE attempt must remain revision-free and model-config-only', state.agentMutations.at(-1))
    await page.screenshot({ path: path.join(outputDir, 'API-E2E-004-D-agent-run-active.png'), fullPage: true })
    return { mutation: state.agentMutations.at(-1), resumeReadsBeforeSave, resumeReadsAfterSave: state.agentResumeReads }
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
