#!/usr/bin/env node
// Implementation render check for SR-010 (cross-scope-agent-mentions). Not an API/E2E suite.
//
// Drives Chrome (playwright-core) against the worktree's own `pnpm dev` stack (backend
// http://127.0.0.1:8000, frontend http://127.0.0.1:3000, data under <worktree>/.autobyteus/development).
// It seeds shared definitions through GraphQL, then uses real Claude Agent SDK runs:
//   A. a standalone Agent run: `@` adds a collaborator on send (Offline row at once, VIS-015), the run's
//      agent briefs it with `send_message_to`, its view has the ⚙/＋ controls, the "Message <name>…" box and
//      the briefing as "From <Sender>:" (VIS-012/013, F-04, RD-004); a Team collaborator opens once (F-02);
//   B. a Team run: the same from a Team member (VIS-015/004/005, F-02/F-03 names in rows and the Team tab);
//   C. the failure notice above a kept draft (VIS-007) — rendered from an injected rejection, because a
//      collaborator that cannot run with the run's own settings cannot be produced from the UI.
//
// Usage (from autobyteus-web): node <this file> [--out <dir>] [--model <id>] [--skip-team-run]
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright-core')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback }
const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(arg('out', path.join(here, 'render-check-sr010')))
const preferredModel = arg('model', 'claude-haiku-4-5-20251001')
const backendUrl = 'http://127.0.0.1:8000'
const frontUrl = 'http://127.0.0.1:3000'
const workspaceRoot = path.resolve(here, '../../../../.autobyteus/render-check-workspace')
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const sel = (t) => `[data-test="${t}"]`
const AGENT_VIEW = '[data-testid="agent-workspace-surface"]'
const TEAM_VIEW = '[data-testid="team-workspace-surface"]'
const report = { shots: [], checks: {}, notes: [] }

const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 500)}`)
  return json.data
}

const REPORT_BACK = 'When another agent messages you, do what it asks in one short sentence, then reply to that agent with send_message_to (target_agent_run_id = the sender id in the message) in one short sentence, then stop.'
const BRIEF = 'When the user mentions a collaborator with @, message it with send_message_to at the address in the [Mentioned collaborators] note (never delegate_task), pass on the request in one short sentence, then tell the user in one short sentence. Keep every reply to one or two short sentences.'
const AGENTS = [
  ['Research Assistant', 'Looks things up and summarizes them.', BRIEF],
  ['Researcher', 'Researches questions for the team.', BRIEF],
  ['Writer', 'Writes short texts.', 'Reply in one short sentence.'],
  ['Code Reviewer', 'Reviews text and code.', REPORT_BACK],
  ['Computer Use Agent', 'Operates a desktop.', REPORT_BACK],
  ['Product Prototyper', 'Builds UI prototypes.', REPORT_BACK],
  ['Prototype Bootstrapper', 'Sets up prototype repositories.', 'Reply in one short sentence.'],
]

const seed = async () => {
  const existing = await gql('{ agentDefinitions { id name } agentTeamDefinitions { id name } }')
  const ids = Object.fromEntries(existing.agentDefinitions.map((d) => [d.name, d.id]))
  for (const [name, description, instructions] of AGENTS) {
    if (ids[name]) {
      await gql('mutation($input: UpdateAgentDefinitionInput!){ updateAgentDefinition(input:$input){ id } }',
        { input: { id: ids[name], instructions } }).catch((error) => report.notes.push(`could not update '${name}': ${String(error).slice(0, 120)}`))
      continue
    }
    const created = await gql('mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id name } }',
      { input: { name, description, instructions } })
    ids[name] = created.createAgentDefinition.id
  }
  const teams = Object.fromEntries(existing.agentTeamDefinitions.map((d) => [d.name, d.id]))
  const ensureTeam = async (name, description, coordinator, members) => {
    if (teams[name]) return teams[name]
    const created = await gql('mutation($input: CreateAgentTeamDefinitionInput!){ createAgentTeamDefinition(input:$input){ id } }', { input: {
      name, description, instructions: 'Work together on the request.', coordinatorMemberName: coordinator,
      nodes: members.map(([memberName, agent]) => ({ memberName, ref: ids[agent], refScope: 'SHARED' })),
    } })
    teams[name] = created.createAgentTeamDefinition.id
    return teams[name]
  }
  await ensureTeam('Product Team', 'Designs and prototypes product UI.', 'product_prototyper',
    [['product_prototyper', 'Product Prototyper'], ['prototype_bootstrapper', 'Prototype Bootstrapper']])
  await ensureTeam('Review Team', 'Researches and writes reviews.', 'researcher', [['researcher', 'Researcher'], ['writer', 'Writer']])
  return { ids, teams }
}

const shot = async (page, name) => {
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file })
  report.shots.push(file)
}

const pickModel = async (page) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel('chat-runtime-claude_agent_sdk')).click()
  const row = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
  await page.locator(row).first().waitFor({ timeout: 120000 })
  const models = await page.locator(row).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = models.includes(preferredModel) ? preferredModel : models[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  return chosen
}

const listedOptions = (page) => page.locator(`${sel('run-mention-menu')} [data-test^="run-mention-option-"]`)
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('run-mention-option-', '')))

const waitIdle = async (page, view, timeout = 300000) => {
  await page.waitForFunction((root) => {
    const text = document.querySelector(root)?.querySelector('h4')?.parentElement?.innerText ?? ''
    return /Idle/.test(text)
  }, view, { timeout }).catch(() => report.notes.push(`${view} did not report Idle in time`))
}

const transientRows = (page) => page.locator(sel('workspace-team-transient-execution-row')).evaluateAll((els) => els.map((e) => ({
  kind: e.getAttribute('data-transient-kind'), address: e.getAttribute('data-member-address'),
  label: e.getAttribute('aria-label'), text: e.innerText.replace(/\s+/g, ' ').trim(), expanded: e.getAttribute('aria-expanded'),
})))

const mention = async (page, input, query, optionId, rest) => {
  await input.click(); await input.fill(''); await page.keyboard.type(query)
  await page.locator(sel(`run-mention-option-${optionId}`)).waitFor({ timeout: 30000 })
  await delay(500)
  await page.keyboard.press('Enter')
  await page.keyboard.type(rest)
}

const fromSegments = (page, view) => page.locator(`${view} [data-testid="inter-agent-inline"]`)
  .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)))

const partA = async (page, ids) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-composer')).waitFor({ timeout: 180000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  report.model = await pickModel(page)
  const input = page.locator(sel('chat-message-input'))
  await input.click(); await input.fill(''); await page.keyboard.type('@Research')
  await page.locator(sel(`chat-target-option-${ids['Research Assistant']}`)).waitFor()
  await page.keyboard.press('Enter')
  await page.keyboard.type('Say hello in one short sentence.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = new URL(page.url()).searchParams.get('id')
  report.agentRunId = runId
  await page.locator(AGENT_VIEW).waitFor({ timeout: 120000 })
  await waitIdle(page, AGENT_VIEW)
  const runInput = page.locator(`${AGENT_VIEW} textarea`).first()

  // Send with @: the collaborator is added on send and shows Offline before its first message (VIS-015).
  await mention(page, runInput, '@code-rev', ids['Code Reviewer'], 'to review the phrase "hello world" and report back.')
  await page.keyboard.press('Enter')
  await page.locator(`${sel('workspace-agent-run-task-tree')} ${sel('workspace-team-transient-execution-row')}`).first().waitFor({ timeout: 60000 })
    .catch(() => report.notes.push('A: no collaborator row appeared after send'))
  report.checks.a_rowsRightAfterSend = await transientRows(page)
  report.checks.a_composerClearedAfterAcceptance = (await runInput.inputValue()) === ''
  await shot(page, 'A1-agent-run-collaborator-offline-on-send-1512x952')

  // The run's agent briefs it with send_message_to; the Team tab appears (VIS-012).
  await waitIdle(page, AGENT_VIEW)
  await delay(15000)
  report.checks.a_hostToolCalls = await page.locator(`${AGENT_VIEW} [data-test^="tool-call"], ${AGENT_VIEW} [data-testid^="tool-call"]`)
    .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 80))).catch(() => [])
  report.checks.a_hostFromSegments = await fromSegments(page, AGENT_VIEW)
  await shot(page, 'A2-agent-run-collaborator-briefed-1512x952')

  // VIS-013 / F-04: open the collaborator.
  const child = page.locator(`${sel('workspace-agent-run-task-tree')} ${sel('workspace-team-transient-execution-row')}`).first()
  await child.click(); await delay(3000)
  report.checks.a_childTitle = await page.locator(sel('agent-workspace-title')).innerText()
  report.checks.a_childHeaderControls = {
    config: await page.locator(`${AGENT_VIEW} ${sel('workspace-header-edit-config')}`).count(),
    newRun: await page.locator(`${AGENT_VIEW} ${sel('workspace-header-new-run')}`).count(),
  }
  report.checks.a_childPlaceholder = await page.locator(`${AGENT_VIEW} textarea`).first().getAttribute('placeholder')
  report.checks.a_childFromSegments = await fromSegments(page, AGENT_VIEW)
  report.checks.a_runRowHighlighted = await page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`).evaluate((e) => e.className.includes('bg-indigo-50'))
  await shot(page, 'A3-collaborator-agent-conversation-1512x952')
  await page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`).click(); await delay(1500)

  // A Team collaborator: Team row with its members, opened once (F-02).
  await mention(page, runInput, '@product-team', 'product-team', 'please sketch a login screen and report back.')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('[data-transient-kind="task_team"]'), null, { timeout: 120000 })
    .catch(() => report.notes.push('A: no Team collaborator row appeared'))
  await delay(1500)
  report.checks.a_rowsAfterTeam = await transientRows(page)
  await waitIdle(page, AGENT_VIEW)
  await delay(15000)
  await shot(page, 'A4-agent-run-team-collaborator-1512x952')

  // What is in the run is no longer offered.
  await runInput.click(); await runInput.fill(''); await page.keyboard.type('@')
  await page.locator(sel('run-mention-menu')).waitFor(); await delay(1500)
  report.checks.a_menuOptionsAfter = await listedOptions(page)
  await page.keyboard.press('Escape')
  await runInput.fill('')
  return runId
}

const partB = async (page, ids, teams) => {
  await fs.mkdir(workspaceRoot, { recursive: true })
  const launch = { llmModelIdentifier: report.model, autoExecuteTools: true, workspaceRootPath: workspaceRoot, llmConfig: null, runtimeKind: 'claude_agent_sdk' }
  const created = await gql('mutation($input: CreateAgentTeamRunInput!){ createAgentTeamRun(input:$input){ success message teamRunId } }', { input: {
    teamDefinitionId: teams['Review Team'],
    teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: [
      { memberAddress: '/researcher', agentDefinitionId: ids['Researcher'], ...launch },
      { memberAddress: '/writer', agentDefinitionId: ids['Writer'], ...launch },
    ],
  } })
  if (!created.createAgentTeamRun.success) throw new Error(`Team run: ${created.createAgentTeamRun.message}`)
  const teamRunId = created.createAgentTeamRun.teamRunId
  report.teamRunId = teamRunId
  await page.goto(`${frontUrl}/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=${encodeURIComponent(teamRunId)}`, { waitUntil: 'domcontentloaded' })
  await page.locator(TEAM_VIEW).waitFor({ timeout: 180000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  await delay(3000)
  const teamInput = page.locator(`${TEAM_VIEW} textarea`).first()
  await mention(page, teamInput, '@product-team', 'product-team', 'please sketch a settings page and report back.')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('[data-transient-kind="task_team"]'), null, { timeout: 120000 })
    .catch(() => report.notes.push('B: no Team collaborator row appeared'))
  await delay(1000)
  report.checks.b_rowsRightAfterSend = await transientRows(page)
  await shot(page, 'B1-team-run-collaborator-offline-on-send-1512x952')
  await waitIdle(page, TEAM_VIEW)
  await delay(30000)
  report.checks.b_rowsLater = await transientRows(page)
  report.checks.b_researcherFromSegments = await fromSegments(page, TEAM_VIEW)
  report.checks.b_teamTab = await page.locator('[data-test^="collaboration-message-row"], [data-test^="team-communication-row"]')
    .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 100))).catch(() => [])
  await shot(page, 'B2-team-run-collaborator-briefed-1512x952')
  // VIS-005: the collaborator's coordinator conversation starts with "From Researcher:".
  const prototyper = page.locator(`${sel('workspace-team-transient-execution-row')}[data-member-address="/product_team/product_prototyper"]`)
  if (await prototyper.count()) {
    await prototyper.first().click(); await delay(3000)
    report.checks.b_prototyperFromSegments = await fromSegments(page, TEAM_VIEW)
    report.checks.b_prototyperPlaceholder = await page.locator(`${TEAM_VIEW} textarea`).first().getAttribute('placeholder')
    await shot(page, 'B3-team-run-collaborator-member-conversation-1512x952')
  } else report.notes.push('B: no product prototyper row to open')
  return teamRunId
}

const partC = async (page) => {
  // VIS-007: the notice above a kept draft with its chip (injected rejection on the focused context).
  const view = (await page.locator(TEAM_VIEW).count()) ? TEAM_VIEW : AGENT_VIEW
  const input = page.locator(`${view} textarea`).first()
  await input.click(); await input.fill(''); await page.keyboard.type('@code-rev')
  await page.locator(sel('run-mention-menu')).waitFor({ timeout: 30000 })
  const option = page.locator(`${sel('run-mention-menu')} [data-test^="run-mention-option-"]`).first()
  await option.waitFor({ timeout: 20000 }).catch(() => undefined)
  if (await option.count()) {
    await page.keyboard.press('Enter')
    await page.keyboard.type('please check the copy.')
  } else {
    await page.keyboard.press('Escape')
    report.notes.push('C: no option left to mention; the notice is shown over plain draft text')
  }
  const injected = await page.evaluate(() => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    const pinia = app?.config.globalProperties.$pinia
    const active = pinia?._s.get('activeContext')
    const context = active?.activeWorkspaceTarget?.context
    if (!context) return false
    context.collaboratorAddFailure = { name: 'Marketing Team', reason: 'The model \'gpt-5.5\' is not available on claude_agent_sdk.' }
    return true
  })
  report.checks.c_injected = injected
  await delay(800)
  report.checks.c_notice = await page.locator(sel('collaborator-add-failure')).evaluateAll((els) => els.map((e) => ({ role: e.getAttribute('role'), text: e.innerText.replace(/\s+/g, ' ').trim() })))
  report.checks.c_draftKept = await input.inputValue()
  await shot(page, 'C1-add-failed-notice-with-kept-draft-1512x952')
  await page.locator(sel('collaborator-add-failure-dismiss')).click().catch(() => undefined)
  await delay(300)
  report.checks.c_dismissed = (await page.locator(sel('collaborator-add-failure')).count()) === 0
  await input.fill('')
}

const main = async () => {
  await fs.mkdir(outDir, { recursive: true })
  const { ids, teams } = await seed()
  report.definitions = ids
  const browser = await chromium.launch({ executablePath: chrome, headless: true })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, deviceScaleFactor: 1, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
  let agentRunId = null; let teamRunId = null
  try {
    agentRunId = await partA(page, ids)
    if (!process.argv.includes('--skip-team-run')) teamRunId = await partB(page, ids, teams)
    await partC(page)
  } catch (error) {
    await shot(page, 'zz-failure').catch(() => undefined)
    report.failure = String(error).slice(0, 400)
    throw error
  } finally {
    report.pageErrors = pageErrors
    await fs.writeFile(path.join(outDir, 'render-check-report.json'), JSON.stringify(report, null, 2))
    await context.close(); await browser.close()
    if (!process.argv.includes('--keep-run')) {
      if (agentRunId) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: agentRunId }).catch(() => undefined)
      if (teamRunId) await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId }).catch(() => undefined)
    }
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => { console.error(error); process.exit(1) })
