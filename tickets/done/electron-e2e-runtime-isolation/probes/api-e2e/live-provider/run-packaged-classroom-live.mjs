#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const worktree = '/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation'
const webRoot = path.join(worktree, 'autobyteus-web')
const ticketRoot = path.join(worktree, 'tickets/in-progress/electron-e2e-runtime-isolation')
const outDir = path.join(ticketRoot, 'probes/api-e2e/live-provider')
const dataRoot = path.join(outDir, 'isolated-electron-data-root')
const controlledHome = path.join(outDir, 'controlled-caller-home')
const executablePath = path.join(webRoot, 'electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus')
const packageSource = '/Users/normy/autobyteus_org/autobyteus-agents'
const model = 'deepseek-v4-flash'
const runtime = 'autobyteus'
const mode = process.argv[2] ?? 'run'
const evidencePath = path.join(outDir, mode === 'init' ? 'initialization.json' : 'classroom-deepseek-v4-flash.json')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function assert(condition, message, details = undefined) {
  if (condition) return
  const error = new Error(message)
  error.details = details
  throw error
}

function execFileText(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { maxBuffer: 4 * 1024 * 1024, timeout: options.timeout ?? 15000 }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr
        reject(error)
      } else resolve(stdout)
    })
  })
}

async function pathExists(target) {
  try { await fs.access(target); return true } catch { return false }
}

async function gql(endpoint, query, variables = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  })
  const payload = await response.json()
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(payload.errors ?? payload)}`)
  }
  return payload.data
}

async function ordinaryCheckpoint(label) {
  const health = await fetch('http://127.0.0.1:29695/rest/health', { signal: AbortSignal.timeout(5000) })
  assert(health.ok, `Ordinary application health failed at ${label}`, { status: health.status })
  const listenerText = await execFileText('lsof', ['-nP', '-t', '-iTCP:29695', '-sTCP:LISTEN'])
  const listenerPids = [...new Set(listenerText.split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger))]
  assert(listenerPids.length > 0, `Ordinary listener absent at ${label}`)
  const identities = []
  for (const pid of listenerPids) {
    const text = (await execFileText('ps', ['-p', String(pid), '-o', 'pid=', '-o', 'ppid=', '-o', 'pgid=', '-o', 'lstart=', '-o', 'command='])).trim().replace(/\s+/g, ' ')
    identities.push({ pid, fingerprint: createHash('sha256').update(text).digest('hex'), commandIsAutoByteus: /AutoByteus/.test(text) })
  }
  return { label, healthStatus: health.status, listenerPids, identities }
}

async function packageTreeDigest(root) {
  const entries = []
  async function walk(current) {
    const children = await fs.readdir(current, { withFileTypes: true })
    children.sort((a, b) => a.name.localeCompare(b.name))
    for (const child of children) {
      if (child.name === '.git') continue
      const full = path.join(current, child.name)
      const relative = path.relative(root, full)
      if (child.isDirectory()) await walk(full)
      else if (child.isFile()) {
        const contents = await fs.readFile(full)
        entries.push(`${relative}\0${createHash('sha256').update(contents).digest('hex')}`)
      }
    }
  }
  await walk(root)
  return { fileCount: entries.length, sha256: createHash('sha256').update(entries.join('\n')).digest('hex') }
}

async function waitForWindow(page, timeoutMs = 120000) {
  await page.locator('body').waitFor({ state: 'visible', timeout: timeoutMs })
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ready = await page.evaluate(() => ({
      state: document.readyState,
      hasBridge: Boolean(window.electronAPI),
      textLength: document.body?.innerText?.length ?? 0,
    })).catch(() => null)
    if (ready?.state === 'complete' && ready.hasBridge && ready.textLength > 0) return ready
    await delay(250)
  }
  throw new Error('PACKAGED_WINDOW_NOT_READY')
}

const historyQuery = `query { listWorkspaceRunHistory(limitPerAgent:200) {
  workspaceRootPath
  teamDefinitions { teamDefinitionId teamDefinitionName runs {
    teamRunId teamDefinitionId createdAt isActive rootTeam
    members { memberAddress agentRunId runtimeKind status workspaceRootPath }
  }}
}}`
const messageQuery = `query($id:String!){getTeamCommunicationMessages(teamRunId:$id){
  messageId senderAgentRunId receiverAgentRunId content messageType createdAt
  referenceFiles{referenceId path type createdAt updatedAt}
}}`
const nestedRuns = (data) => data.listWorkspaceRunHistory
  .flatMap((workspace) => workspace.teamDefinitions)
  .filter((team) => team.teamDefinitionId === 'classroom-simulation-team')
  .flatMap((team) => team.runs)

async function run() {
  await fs.mkdir(outDir, { recursive: true })
  assert(fsSync.existsSync(executablePath), 'Packaged executable does not exist')
  assert(fsSync.existsSync(packageSource), 'Requested package source does not exist')
  if (!(await pathExists(dataRoot))) await fs.mkdir(dataRoot, { recursive: true, mode: 0o700 })
  await fs.chmod(dataRoot, 0o700)
  if (!(await pathExists(controlledHome))) await fs.mkdir(controlledHome, { recursive: true, mode: 0o700 })
  const retainedEnvironmentKeys = [
    'PATH', 'SHELL', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM',
    'DISPLAY', 'WAYLAND_DISPLAY', 'XPC_FLAGS', 'XPC_SERVICE_NAME',
  ]
  const sourceEnv = Object.fromEntries(retainedEnvironmentKeys
    .filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]]))
  Object.assign(sourceEnv, { HOME: controlledHome, NO_PROXY: '127.0.0.1,localhost' })

  const preparationModule = await import(pathToFileURL(path.join(webRoot, 'scripts/electron-e2e/electronE2ELaunchPreparation.mjs')).href)
  const adapterModule = await import(pathToFileURL(path.join(webRoot, 'scripts/electron-e2e/playwrightElectronProcessAdapter.mjs')).href)
  const { _electron } = await import(pathToFileURL(path.join(webRoot, 'node_modules/playwright-core/index.mjs')).href)
  const sourceDigestBefore = await packageTreeDigest(packageSource)
  const ordinaryBefore = await ordinaryCheckpoint(`${mode}-before`)
  const prepared = await preparationModule.prepareElectronE2ELaunch({
    webRoot,
    build: false,
    executablePath,
    dataRoot,
    // The API/E2E runner itself has ELECTRON_RUN_AS_NODE=1. Passing that
    // harness-only value to a desktop launch turns the executable into Node,
    // so use the same safe desktop caller subset as the durable package probe.
    sourceEnv,
  })
  assert(prepared.ownsDataRoot === false, 'Live validation root must remain caller-owned')
  let session = null
  let rootTeamRun = null
  let termination = null
  let cleanupResult = null
  let evidence = {
    schemaVersion: 1,
    scenarioId: 'E2E-LIVE-006',
    mode,
    startedAt: new Date().toISOString(),
    completedAt: null,
    result: 'RUNNING',
    artifact: { executablePath, sha256: createHash('sha256').update(await fs.readFile(executablePath)).digest('hex') },
    launch: prepared.metadata,
    databasePath: path.join(dataRoot, 'server-data/db/production.db'),
    secretKeyPath: path.join(dataRoot, 'server-data/db/production.db.secret.key'),
    packageSource,
    packageSourceBefore: sourceDigestBefore,
    ordinaryBefore,
  }
  const consoleEvents = []
  try {
    session = await adapterModule.launchPreparedElectronWithPlaywright(prepared, _electron)
    await session.waitUntilReady(120000)
    const page = await session.firstWindow()
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() })
    })
    const windowReady = await waitForWindow(page)
    const bridge = await page.evaluate(async () => ({
      status: await window.electronAPI.getServerStatus(),
      health: await window.electronAPI.checkServerHealth(),
      context: await window.electronAPI.getWindowContext(),
    }))
    assert(bridge.status.baseUrl === prepared.clientBaseUrl, 'Preload selected endpoint mismatch', bridge)
    assert(bridge.health.status === 'ok', 'Preload health failed', bridge)
    assert(await pathExists(evidence.databasePath), 'Packaged backend did not initialize its isolated database')

    if (mode === 'init') {
      evidence = {
        ...evidence,
        result: 'PASS',
        windowReady,
        bridge: { status: bridge.status.status, baseUrlMatches: true, health: bridge.health.status, nodeId: bridge.context.nodeId },
        databaseInitialized: true,
      }
      return
    }

    const endpoint = `${prepared.clientBaseUrl}/graphql`
    const providerGroups = (await gql(endpoint, `query { providerSettings(runtimeKind:"autobyteus") {
      provider { id name providerType apiKeyConfigured status statusMessage }
      llmModels { modelIdentifier name providerType }
    }}`)).providerSettings
    const modelProviderGroup = providerGroups.find((group) => group.llmModels.some((entry) => entry.modelIdentifier === model))
    assert(modelProviderGroup, `Requested model ${model} is absent from the AutoByteus runtime catalog`)
    assert(modelProviderGroup.provider.apiKeyConfigured === true, `Provider credential is not configured for ${model}`, modelProviderGroup.provider)

    const before = nestedRuns(await gql(endpoint, historyQuery))
    const beforeIds = new Set(before.map((entry) => entry.teamRunId))

    // Exercise local package import through the packaged Settings UI. A
    // retained root from a harness-only retry may already contain the exact
    // UI-linked package; in that case verify its real Settings row in place.
    const packagesBeforeUi = (await gql(endpoint, `query { agentPackages {
      packageId displayName path sourceKind source sharedAgentCount teamLocalAgentCount agentTeamCount isDefault isRemovable
    }}`)).agentPackages
    const alreadyLinkedPackage = packagesBeforeUi.find((entry) => entry.path === packageSource)
    await page.locator('[data-nav-key="settings"]:visible, [data-test="app-left-panel-shell"] footer button:visible').first().click({ timeout: 120000 })
    await page.getByTestId('settings-nav-agent-packages').click({ timeout: 120000 })
    let packageUiEvidence
    if (alreadyLinkedPackage) {
      const localRows = page.getByTestId('agent-package-row-local_path')
      await localRows.filter({ hasText: packageSource }).first().waitFor({ state: 'visible', timeout: 120000 })
      packageUiEvidence = 'verified-existing-link-from-prior-packaged-ui-attempt'
    } else {
      await page.getByTestId('agent-package-source-input').fill(packageSource)
      await page.getByTestId('agent-package-import-button').click()
      await page.getByTestId('agent-packages-success').waitFor({ state: 'visible', timeout: 120000 })
      const importSuccessText = await page.getByTestId('agent-packages-success').innerText()
      assert(/Agent package imported/i.test(importSuccessText), 'Packaged UI did not confirm agent package import', { importSuccessText })
      packageUiEvidence = 'imported-through-packaged-ui'
    }

    const importedPackages = (await gql(endpoint, `query { agentPackages {
      packageId displayName path sourceKind source sharedAgentCount teamLocalAgentCount agentTeamCount isDefault isRemovable
    }}`)).agentPackages
    const importedPackage = importedPackages.find((entry) => entry.path === packageSource)
    assert(importedPackage?.sourceKind === 'LOCAL_PATH', 'Requested package was not linked as a local path', importedPackages)
    const teamDefinitions = (await gql(endpoint, `query { agentTeamDefinitions {
      id name description coordinatorMemberName nodes { memberName ref refType refScope }
    }}`)).agentTeamDefinitions
    const classroom = teamDefinitions.find((entry) => entry.id === 'classroom-simulation-team')
    assert(classroom?.name === 'Classroom Simulation Team', 'Classroom Simulation Team was not imported', classroom)

    // Exercise the imported team through the actual packaged renderer.
    // Settings intentionally uses a standalone layout without the main shell.
    // Return through its real Back control before selecting Agent Teams.
    await page.getByTestId('settings-nav-back').click({ timeout: 120000 })
    const compactAgentTeams = page.locator('[data-nav-key="agentTeams"]:visible')
    if (await compactAgentTeams.count()) await compactAgentTeams.first().click({ timeout: 120000 })
    else await page.getByRole('button', { name: 'Agent Teams', exact: true }).click({ timeout: 120000 })
    const heading = page.getByRole('heading', { name: 'Classroom Simulation Team', exact: true })
    await heading.waitFor({ state: 'visible', timeout: 120000 })
    const card = heading.locator('xpath=ancestor::div[.//button[normalize-space()="Run"]][1]')
    await card.getByRole('button', { name: 'Run', exact: true }).click()
    await page.locator('#team-run-runtime-kind').waitFor({ state: 'visible', timeout: 120000 })
    await page.locator('#team-run-runtime-kind').selectOption(runtime)
    await delay(700)
    await page.getByRole('button', { name: 'Select a model', exact: true }).click()
    await page.getByPlaceholder('Search models...').fill(model)
    const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    await page.locator('li').filter({ hasText: new RegExp(escapedModel, 'i') }).first().click()
    const updateDismiss = page.getByTestId('app-update-dismiss')
    if (await updateDismiss.count()) {
      try { if (await updateDismiss.isVisible()) await updateDismiss.click({ force: true }) } catch {}
    }
    const autoExecute = page.locator('#team-auto-execute')
    if ((await autoExecute.getAttribute('class'))?.includes('bg-gray')) await autoExecute.click()
    assert((await autoExecute.getAttribute('class'))?.includes('bg-blue'), 'Auto-approve tools was not enabled')
    const effective = {
      runtimeKind: await page.locator('#team-run-runtime-kind').inputValue(),
      selectedModelText: await page.getByRole('button', { name: new RegExp(model, 'i') }).first().innerText(),
      autoExecuteClass: await autoExecute.getAttribute('class'),
    }
    assert(effective.runtimeKind === runtime, 'Effective runtime selection mismatch', effective)
    assert(effective.selectedModelText.toLowerCase().includes(model), 'Effective model selection mismatch', effective)

    await page.screenshot({ path: path.join(outDir, 'classroom-deepseek-v4-flash-launch.png'), fullPage: true })
    await page.getByRole('button', { name: 'Run Team', exact: true }).click()
    const input = page.getByPlaceholder('Type a message...')
    await input.waitFor({ state: 'visible', timeout: 180000 })
    const expectedReply = 'CLASSROOM_STUDENT_REPLY_DEEPSEEK_V4_FLASH'
    const expectedComplete = 'CLASSROOM_SIMULATION_COMPLETE_DEEPSEEK_V4_FLASH'
    const prompt = [
      'Run pwd using run_bash and create classroom-runs/e2e-live-006/homework.md under that exact workspace.',
      `The homework must ask the student to answer 6 * 7 and reply to /professor using send_message_to with the exact token ${expectedReply}, attaching the student's answer file as a reference.`,
      'Send the homework to /student using send_message_to with the homework file as a reference. Wait for the student reply.',
      `After the reply is received, respond to me with exactly ${expectedComplete}.`,
    ].join(' ')
    await input.fill(prompt)
    await input.press('Enter')

    for (let index = 0; index < 180; index += 1) {
      const fresh = nestedRuns(await gql(endpoint, historyQuery)).find((entry) => !beforeIds.has(entry.teamRunId))
      if (fresh) { rootTeamRun = fresh; break }
      await delay(500)
    }
    assert(rootTeamRun, 'Fresh Classroom Simulation Team run was not created')
    const memberAddressByRunId = new Map(rootTeamRun.members.map((member) => [member.agentRunId, member.memberAddress]))

    let messages = []
    let replySeen = false
    let completionSeen = false
    for (let index = 0; index < 900; index += 1) {
      await delay(500)
      for (const label of ['Approve', 'Allow', 'Accept']) {
        const buttons = page.getByRole('button', { name: label, exact: true })
        for (let buttonIndex = 0; buttonIndex < await buttons.count(); buttonIndex += 1) {
          try { if (await buttons.nth(buttonIndex).isVisible()) await buttons.nth(buttonIndex).click() } catch {}
        }
      }
      messages = (await gql(endpoint, messageQuery, { id: rootTeamRun.teamRunId })).getTeamCommunicationMessages
      replySeen = messages.some((entry) => entry.content.includes(expectedReply)
        && memberAddressByRunId.get(entry.senderAgentRunId) === '/student'
        && memberAddressByRunId.get(entry.receiverAgentRunId) === '/professor')
      completionSeen = await page.getByText(expectedComplete, { exact: true }).count() > 0
      if (replySeen && completionSeen) break
    }

    const professorRequests = messages.filter((entry) => memberAddressByRunId.get(entry.senderAgentRunId) === '/professor'
      && memberAddressByRunId.get(entry.receiverAgentRunId) === '/student')
    const studentReplies = messages.filter((entry) => entry.content.includes(expectedReply)
      && memberAddressByRunId.get(entry.senderAgentRunId) === '/student'
      && memberAddressByRunId.get(entry.receiverAgentRunId) === '/professor')
    const projectedMessages = messages.map((entry) => ({
      ...entry,
      senderMemberAddress: memberAddressByRunId.get(entry.senderAgentRunId) ?? null,
      receiverMemberAddress: memberAddressByRunId.get(entry.receiverAgentRunId) ?? null,
    }))
    const resume = (await gql(endpoint, `query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}`, { id: rootTeamRun.teamRunId })).getTeamRunResumeConfig
    const treeText = JSON.stringify(resume.executionTree)
    const memberAddresses = new Set(rootTeamRun.members.map((entry) => entry.memberAddress))
    const unexpectedConsoleErrors = consoleEvents.filter((entry) => entry.type === 'error'
      && !/app update|app-updater|get-state|initialize app updates/i.test(entry.text))
    const conditions = {
      isolatedEndpoint: bridge.status.baseUrl === prepared.clientBaseUrl,
      providerCredentialConfigured: modelProviderGroup.provider.apiKeyConfigured === true,
      requestedModelCatalogued: true,
      localPackageImportedViaPackagedUi: packageUiEvidence === 'imported-through-packaged-ui'
        || packageUiEvidence === 'verified-existing-link-from-prior-packaged-ui-attempt',
      classroomTeamImported: true,
      freshRun: !beforeIds.has(rootTeamRun.teamRunId),
      rootedTopology: ['/professor', '/student'].every((address) => memberAddresses.has(address)),
      effectiveRuntime: effective.runtimeKind === runtime
        && rootTeamRun.members.every((member) => member.runtimeKind.toLowerCase() === runtime),
      effectiveModelPersisted: treeText.includes(model),
      exactOneProfessorRequest: professorRequests.length === 1,
      requestHasReference: professorRequests[0]?.referenceFiles?.length > 0,
      exactOneStudentReply: studentReplies.length === 1,
      replyHasReference: studentReplies[0]?.referenceFiles?.length > 0,
      exactMemberRunRouting: projectedMessages.every((entry) =>
        ['/professor', '/student'].includes(entry.senderMemberAddress)
        && ['/professor', '/student'].includes(entry.receiverMemberAddress)),
      completionVisible: completionSeen,
      noUnexpectedConsoleErrors: unexpectedConsoleErrors.length === 0,
    }
    await page.screenshot({ path: path.join(outDir, 'classroom-deepseek-v4-flash-final.png'), fullPage: true })
    evidence = {
      ...evidence,
      result: Object.values(conditions).every(Boolean) ? 'PASS' : 'FAIL',
      windowReady,
      bridge: { status: bridge.status.status, baseUrlMatches: true, health: bridge.health.status, nodeId: bridge.context.nodeId },
      provider: {
        id: modelProviderGroup.provider.id,
        name: modelProviderGroup.provider.name,
        providerType: modelProviderGroup.provider.providerType,
        apiKeyConfigured: modelProviderGroup.provider.apiKeyConfigured,
        status: modelProviderGroup.provider.status,
        model,
      },
      importedPackage,
      packageUiEvidence,
      classroomDefinition: classroom,
      effective,
      rootTeamRunId: rootTeamRun.teamRunId,
      rootTeamMembers: rootTeamRun.members,
      conditions,
      communications: projectedMessages,
      resumeConfig: resume,
      consoleEvents,
      unexpectedConsoleErrors,
    }
    assert(evidence.result === 'PASS', 'Live classroom conditions failed', conditions)
  } catch (error) {
    evidence = {
      ...evidence,
      result: 'FAIL',
      failure: {
        message: error instanceof Error ? error.message : String(error),
        details: error?.details,
        stack: error instanceof Error ? error.stack : undefined,
      },
      consoleEvents,
    }
    throw error
  } finally {
    const endpoint = `${prepared.clientBaseUrl}/graphql`
    if (rootTeamRun?.teamRunId) {
      try {
        termination = (await gql(endpoint, `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: rootTeamRun.teamRunId })).terminateAgentTeamRun
      } catch (error) {
        termination = { success: false, message: error instanceof Error ? error.message : String(error) }
      }
    }
    if (session) {
      try { cleanupResult = await session.cleanup() }
      catch (error) { cleanupResult = { error: error instanceof Error ? error.message : String(error) } }
    }
    const sourceDigestAfter = await packageTreeDigest(packageSource)
    let ordinaryAfter = null
    try { ordinaryAfter = await ordinaryCheckpoint(`${mode}-after`) } catch (error) { ordinaryAfter = { error: error instanceof Error ? error.message : String(error) } }
    const ordinaryIdentityUnchanged = Boolean(ordinaryAfter?.identities)
      && JSON.stringify(ordinaryBefore.listenerPids) === JSON.stringify(ordinaryAfter.listenerPids)
      && JSON.stringify(ordinaryBefore.identities) === JSON.stringify(ordinaryAfter.identities)
    evidence = {
      ...evidence,
      completedAt: new Date().toISOString(),
      termination,
      cleanupResult,
      packageSourceAfter: sourceDigestAfter,
      packageSourceUnchanged: JSON.stringify(sourceDigestBefore) === JSON.stringify(sourceDigestAfter),
      ordinaryAfter,
      ordinaryIdentityUnchanged,
    }
    if (mode === 'run') {
      const complete = cleanupResult?.processTreeCompletion?.status === 'complete'
      if (complete && evidence.result === 'PASS') {
        await fs.rm(dataRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
        await fs.rm(controlledHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
        evidence.isolatedRootDisposed = !(await pathExists(dataRoot))
      } else evidence.isolatedRootDisposed = false
      evidence.isolatedRootRetainedAfterFailure = complete && evidence.result !== 'PASS'
    } else evidence.isolatedRootRetainedForSecretImport = await pathExists(dataRoot)
    await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
    process.stdout.write(`${JSON.stringify({
      scenarioId: evidence.scenarioId,
      mode,
      result: evidence.result,
      rootTeamRunId: evidence.rootTeamRunId ?? null,
      conditions: evidence.conditions ?? null,
      termination,
      cleanupStatus: cleanupResult?.processTreeCompletion?.status ?? cleanupResult?.error ?? null,
      isolatedRootDisposed: evidence.isolatedRootDisposed ?? null,
      ordinaryIdentityUnchanged,
      packageSourceUnchanged: evidence.packageSourceUnchanged,
      evidencePath,
    }, null, 2)}\n`)
  }
}

try {
  await run()
} catch {
  process.exitCode = 1
}
