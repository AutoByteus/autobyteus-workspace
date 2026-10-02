#!/usr/bin/env node
// Implementation render check for agent-initiated-collaborators (SR-005, REQ-011). Not an API/E2E suite.
//
// Drives Chrome (playwright-core) against the worktree's own `pnpm dev` stack (backend
// http://127.0.0.1:8000, frontend http://127.0.0.1:3000, data under <worktree>/.autobyteus/development).
// It seeds shared definitions through GraphQL, then runs one real Claude Agent SDK standalone run:
//   T. the tool picker lists `list_available_agents` and the Project Manager definition has it selected;
//   A. a standalone "Project Manager" (with `list_available_agents`) lists, brings a listed agent in with
//      `send_message_to`, and delegates two copies of a listed team with `delegate_task`, with no `@`
//      (SC-001/002). Its run shows the collaborator row and two task-team copy rows with the predecessor
//      look (VIS-015/004), the copies' members resolve from their recorded `source`, and the collaborator's
//      conversation opens with "From <Sender>:" (VIS-005/013, RD-004).
//
// Usage (from autobyteus-web): node <this file> [--out <dir>] [--model <id>] [--keep-run]
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright-core')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback }
const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(arg('out', path.join(here, 'render-check-aic')))
const preferredModel = arg('model', 'claude-haiku-4-5-20251001')
const backendUrl = 'http://127.0.0.1:8000'
const frontUrl = 'http://127.0.0.1:3000'
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const sel = (t) => `[data-test="${t}"]`
const AGENT_VIEW = '[data-testid="agent-workspace-surface"]'
const report = { shots: [], checks: {}, notes: [] }

const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 500)}`)
  return json.data
}

const PM = [
  'You are a project manager. Follow these steps exactly, one tool call at a time, and keep every message to one short sentence:',
  '1. Call list_available_agents.',
  '2. Find the entry named "Code Reviewer" and call send_message_to with its address as recipient_address, asking it to review the phrase "hello world" and reply to you.',
  '3. Find the entry named "Product Team" and call delegate_task twice with its address as recipient_address: first "Sketch a login screen.", then "Sketch a settings page.".',
  '4. Tell the user in one short sentence which addresses you used, then stop. Never call any other tool.',
].join('\n')
const REPORT_BACK = 'When another agent messages you, do what it asks in one short sentence, then reply to that agent with send_message_to (target_agent_run_id = the sender id in the message) in one short sentence, then stop.'
const AGENTS = [
  ['Project Manager', 'Plans work and hands it to agents and teams.', PM, ['list_available_agents']],
  ['Code Reviewer', 'Reviews text and code.', REPORT_BACK, []],
  ['Product Prototyper', 'Builds UI prototypes.', REPORT_BACK, []],
  ['Prototype Bootstrapper', 'Sets up prototype repositories.', 'Reply in one short sentence.', []],
]

const seed = async () => {
  const existing = await gql('{ agentDefinitions { id name } agentTeamDefinitions { id name } }')
  const ids = Object.fromEntries(existing.agentDefinitions.map((d) => [d.name, d.id]))
  for (const [name, description, instructions, toolNames] of AGENTS) {
    if (ids[name]) {
      await gql('mutation($input: UpdateAgentDefinitionInput!){ updateAgentDefinition(input:$input){ id } }',
        { input: { id: ids[name], instructions, toolNames } }).catch((error) => report.notes.push(`could not update '${name}': ${String(error).slice(0, 160)}`))
      continue
    }
    const created = await gql('mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id name } }',
      { input: { name, description, instructions, toolNames } })
    ids[name] = created.createAgentDefinition.id
  }
  const teams = Object.fromEntries(existing.agentTeamDefinitions.map((d) => [d.name, d.id]))
  if (!teams['Product Team']) {
    const created = await gql('mutation($input: CreateAgentTeamDefinitionInput!){ createAgentTeamDefinition(input:$input){ id } }', { input: {
      name: 'Product Team', description: 'Designs and prototypes product UI.', instructions: 'Work together on the request.',
      coordinatorMemberName: 'product_prototyper',
      nodes: [['product_prototyper', 'Product Prototyper'], ['prototype_bootstrapper', 'Prototype Bootstrapper']]
        .map(([memberName, agent]) => ({ memberName, ref: ids[agent], refScope: 'SHARED' })),
    } })
    teams['Product Team'] = created.createAgentTeamDefinition.id
  }
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

const waitIdle = async (page, timeout = 300000) => {
  await page.waitForFunction((root) => {
    const text = document.querySelector(root)?.querySelector('h4')?.parentElement?.innerText ?? ''
    return /Idle/.test(text)
  }, AGENT_VIEW, { timeout }).catch(() => report.notes.push('the agent view did not report Idle in time'))
}

const transientRows = (page) => page.locator(sel('workspace-team-transient-execution-row')).evaluateAll((els) => els.map((e) => ({
  kind: e.getAttribute('data-transient-kind'), address: e.getAttribute('data-member-address'),
  label: e.getAttribute('aria-label'), text: e.innerText.replace(/\s+/g, ' ').trim(), expanded: e.getAttribute('aria-expanded'),
})))

const fromSegments = (page) => page.locator(`${AGENT_VIEW} [data-testid="inter-agent-inline"]`)
  .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)))

const partT = async (page, ids) => {
  const grouped = await gql('{ toolsGroupedByCategory(origin: LOCAL) { categoryName tools { name } } }')
  report.checks.t_toolCategory = grouped.toolsGroupedByCategory
    .filter((group) => group.tools.some((tool) => tool.name === 'list_available_agents')).map((group) => group.categoryName)
  await page.goto(`${frontUrl}/agents?view=edit&id=${encodeURIComponent(ids['Project Manager'])}`, { waitUntil: 'domcontentloaded' })
  await page.getByText('list_available_agents').first().waitFor({ timeout: 120000 })
    .catch(() => report.notes.push('T: list_available_agents not visible on the edit page'))
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  report.checks.t_selectedOnPm = await page.getByText('list_available_agents').count()
  await page.getByText('list_available_agents').first().scrollIntoViewIfNeeded().catch(() => undefined)
  await shot(page, 'T1-tool-picker-list-available-agents-1512x952')
}

const partA = async (page, ids) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-composer')).waitFor({ timeout: 180000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  report.model = await pickModel(page)
  const input = page.locator(sel('chat-message-input'))
  await input.click(); await input.fill(''); await page.keyboard.type('@Project')
  await page.locator(sel(`chat-target-option-${ids['Project Manager']}`)).waitFor()
  await page.keyboard.press('Enter')
  await page.keyboard.type('Please start: work through your steps.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = new URL(page.url()).searchParams.get('id')
  report.agentRunId = runId
  await page.locator(AGENT_VIEW).waitFor({ timeout: 120000 })

  // The PM brings the reviewer in and delegates two Product Team copies, with no `@` (SC-001/002).
  await page.waitForFunction(() => document.querySelectorAll('[data-transient-kind="task_team"]').length >= 2, null, { timeout: 300000 })
    .catch(() => report.notes.push('A: fewer than two task-team copy rows appeared'))
  await waitIdle(page)
  await delay(20000)
  report.checks.a_rows = await transientRows(page)
  report.checks.a_hostFromSegments = await fromSegments(page)
  report.checks.a_toolCalls = await page.locator(`${AGENT_VIEW} [data-test^="tool-call"], ${AGENT_VIEW} [data-testid^="tool-call"]`)
    .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 100))).catch(() => [])
  await shot(page, 'A1-pm-brought-in-and-delegated-1512x952')

  // A copy row expanded: its members come from the copy's recorded source.
  const copyRow = page.locator('[data-transient-kind="task_team"]').first()
  if (await copyRow.count()) {
    if ((await copyRow.getAttribute('aria-expanded')) === 'false') { await copyRow.click(); await delay(1500) }
    report.checks.a_rowsExpanded = await transientRows(page)
    await shot(page, 'A2-catalog-copy-members-1512x952')
    const member = page.locator(`${sel('workspace-team-transient-execution-row')}[data-member-address="/product_team/product_prototyper"]`).first()
    if (await member.count()) {
      await member.click(); await delay(3000)
      report.checks.a_copyMemberTitle = await page.locator(sel('agent-workspace-title')).innerText().catch(() => null)
      report.checks.a_copyMemberFromSegments = await fromSegments(page)
      await shot(page, 'A3-catalog-copy-coordinator-conversation-1512x952')
    } else report.notes.push('A: no copy coordinator row to open')
  }

  // The collaborator brought in by the PM: its conversation starts "From project manager:".
  const reviewer = page.locator(`${sel('workspace-team-transient-execution-row')}[data-member-address="/code_reviewer"]`).first()
  if (await reviewer.count()) {
    await reviewer.click(); await delay(3000)
    report.checks.a_reviewerTitle = await page.locator(sel('agent-workspace-title')).innerText().catch(() => null)
    report.checks.a_reviewerFromSegments = await fromSegments(page)
    report.checks.a_reviewerPlaceholder = await page.locator(`${AGENT_VIEW} textarea`).first().getAttribute('placeholder')
    await shot(page, 'A4-brought-in-collaborator-conversation-1512x952')
  } else report.notes.push('A: no /code_reviewer collaborator row')
  const tree = await gql('query($id:String!){ agentRunCollaboration(runId:$id) }', { id: runId }).catch((error) => ({ error: String(error).slice(0, 200) }))
  report.checks.a_storedPackage = tree
  return runId
}

const main = async () => {
  await fs.mkdir(outDir, { recursive: true })
  const { ids, teams } = await seed()
  report.definitions = ids
  report.teams = teams
  const browser = await chromium.launch({ executablePath: chrome, headless: true })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, deviceScaleFactor: 1, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
  let agentRunId = null
  try {
    await partT(page, ids)
    agentRunId = await partA(page, ids)
  } catch (error) {
    await shot(page, 'zz-failure').catch(() => undefined)
    report.failure = String(error).slice(0, 400)
    throw error
  } finally {
    report.pageErrors = pageErrors
    await fs.writeFile(path.join(outDir, 'render-check-report.json'), JSON.stringify(report, null, 2))
    await context.close(); await browser.close()
    if (!process.argv.includes('--keep-run') && agentRunId) {
      await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: agentRunId }).catch(() => undefined)
    }
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => { console.error(error); process.exit(1) })
