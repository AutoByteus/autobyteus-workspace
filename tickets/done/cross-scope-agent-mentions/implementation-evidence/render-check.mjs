#!/usr/bin/env node
// Implementation render check (cross-scope-agent-mentions). Not an API/E2E suite.
//
// Drives Chrome (playwright-core) against the worktree's own `pnpm dev` stack
// (backend http://127.0.0.1:8000, frontend http://127.0.0.1:3000, data under
// <worktree>/.autobyteus/development). It seeds shared definitions through GraphQL, starts one
// real standalone Claude Agent SDK run, and captures the `@` menu, chips, the task rows under the
// run, the Team tab and a task Agent's conversation for comparison with VIS-002/003/011/012/013/014.
//
// Usage (from autobyteus-web): node <this file> [--out <dir>] [--model <id>] [--skip-team]
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright-core')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback }
const outDir = path.resolve(arg('out', path.join(path.dirname(fileURLToPath(import.meta.url)), 'render-check')))
const preferredModel = arg('model', 'claude-haiku-4-5-20251001')
const backendUrl = 'http://127.0.0.1:8000'
const frontUrl = 'http://127.0.0.1:3000'
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const report = { shots: [], checks: {}, notes: [] }

const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 500)}`)
  return json.data
}

const AGENTS = [
  ['Research Assistant', 'Looks things up and summarizes them.', 'You are a research assistant. When the user mentions a collaborator with @, bring it into this run with delegate_task using the address in the note, pass on the request, then tell the user in one short sentence. Keep every reply to one or two short sentences.'],
  ['Code Reviewer', 'Reviews text and code.', 'You review what you are given. When you finish, report back to the agent that delegated to you with send_message_to (use its AgentRun ID) in one short sentence, then stop.'],
  ['Computer Use Agent', 'Operates a desktop.', 'Report back to your delegator with send_message_to in one short sentence, then stop.'],
  ['Product Prototyper', 'Builds UI prototypes.', 'You coordinate the product team. Report back to your delegator with send_message_to in one short sentence, then stop.'],
  ['Prototype Bootstrapper', 'Sets up prototype repositories.', 'Reply in one short sentence.'],
]

const seed = async () => {
  const existing = (await gql('{ agentDefinitions { id name } agentTeamDefinitions { id name } }'))
  const ids = Object.fromEntries(existing.agentDefinitions.map((d) => [d.name, d.id]))
  for (const [name, description, instructions] of AGENTS) {
    if (ids[name]) continue
    const created = await gql('mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id name } }',
      { input: { name, description, instructions } })
    ids[name] = created.createAgentDefinition.id
  }
  if (!existing.agentTeamDefinitions.some((d) => d.name === 'Product Team')) {
    await gql('mutation($input: CreateAgentTeamDefinitionInput!){ createAgentTeamDefinition(input:$input){ id } }', { input: {
      name: 'Product Team', description: 'Designs and prototypes product UI.', instructions: 'Work together on the request.',
      coordinatorMemberName: 'product_prototyper',
      nodes: [
        { memberName: 'product_prototyper', ref: ids['Product Prototyper'], refScope: 'SHARED' },
        { memberName: 'prototype_bootstrapper', ref: ids['Prototype Bootstrapper'], refScope: 'SHARED' },
      ],
    } })
  }
  return ids
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

const waitIdle = async (page, timeout = 240000) => {
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-testid="agent-workspace-surface"] h4')?.parentElement?.innerText ?? ''
    return /Idle/.test(text)
  }, null, { timeout }).catch(() => report.notes.push('host did not report Idle in time'))
}

const main = async () => {
  await fs.mkdir(outDir, { recursive: true })
  const ids = await seed()
  report.definitions = ids
  const browser = await chromium.launch({ executablePath: chrome, headless: true })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, deviceScaleFactor: 1, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
  let runId = null
  try {
    await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await page.locator(sel('chat-composer')).waitFor({ timeout: 180000 })
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
    report.model = await pickModel(page)
    const input = page.locator(sel('chat-message-input'))
    await input.click(); await input.fill(''); await page.keyboard.type('@Research')
    await page.locator(sel(`chat-target-option-${ids['Research Assistant']}`)).waitFor()
    await page.keyboard.press('Enter')
    await page.keyboard.type('Compare current navigation states in one short sentence.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    runId = new URL(page.url()).searchParams.get('id')
    report.runId = runId
    await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
    await waitIdle(page)

    // VIS-011: `@` in a standalone run lists outside-run Agents, then Teams; the run's own agent is not offered.
    const runInput = page.locator(`${RUN_VIEW} textarea`).first()
    await runInput.click(); await runInput.fill(''); await page.keyboard.type('@')
    await page.locator(sel('run-mention-menu')).waitFor()
    await page.locator(`${sel('run-mention-menu')} [data-test^="run-mention-option-"]`).first().waitFor({ timeout: 30000 })
    await delay(400)
    report.checks.menuOptions = await listedOptions(page)
    report.checks.hostOffered = report.checks.menuOptions.includes(ids['Research Assistant'])
    report.checks.textareaAria = await runInput.evaluate((e) => ({ role: e.getAttribute('role'), expanded: e.getAttribute('aria-expanded'), controls: e.getAttribute('aria-controls'), active: e.getAttribute('aria-activedescendant') }))
    report.checks.menuGeometry = await page.evaluate(() => {
      const menu = document.querySelector('[data-test="run-mention-menu"]').getBoundingClientRect()
      const box = document.querySelector('[data-testid="agent-workspace-surface"] textarea').getBoundingClientRect()
      return { menuBottom: menu.bottom, menuTop: menu.top, menuLeft: menu.left, width: menu.width, textareaTop: box.top, above: menu.bottom <= box.top }
    })
    await shot(page, '01-agent-run-at-menu-1512x952')

    // VIS-002: no match.
    await page.keyboard.type('zzz'); await delay(300)
    report.checks.emptyShown = await page.locator(sel('run-mention-menu-empty')).isVisible()
    await shot(page, '02-at-menu-empty-1512x952')
    await page.keyboard.press('Enter')
    report.checks.enterWithNoMatchKeptText = (await runInput.inputValue()) === '@zzz'
    await page.keyboard.press('Escape')
    report.checks.escapeClosed = !(await page.locator(sel('run-mention-menu')).isVisible().catch(() => false))

    // VIS-003: choose by keyboard; the chip appears above the text.
    await runInput.fill(''); await page.keyboard.type('please ask @code-rev')
    await page.locator(sel(`run-mention-option-${ids['Code Reviewer']}`)).waitFor()
    await page.keyboard.press('Enter')
    await page.keyboard.type('to review the phrase "hello world" and report back.')
    await page.locator('[data-test="run-mention-chip-Code Reviewer"]').waitFor()
    report.checks.textAfterChoose = await runInput.inputValue()
    await shot(page, '03-composer-mention-chip-1512x952')

    // Send: the host delegates; a task row appears under the run and the Team tab appears.
    await page.keyboard.press('Enter')
    await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 30000 })
    await page.locator(sel('workspace-agent-run-task-tree')).waitFor({ timeout: 300000 })
      .catch(() => report.notes.push('no task tree appeared under the run'))
    await waitIdle(page)
    await delay(8000)
    await shot(page, '04-agent-run-task-agent-added-1512x952')
    report.checks.taskRows = await page.locator(sel('workspace-team-transient-execution-row')).evaluateAll((els) => els.map((e) => ({ kind: e.getAttribute('data-transient-kind'), label: e.getAttribute('aria-label') })))

    // VIS-013: open the task Agent; the header is its name and the run row loses its highlight.
    const child = page.locator(`${sel('workspace-agent-run-task-tree')} ${sel('workspace-team-transient-execution-row')}`).first()
    if (await child.count()) {
      await child.click(); await delay(2500)
      report.checks.childTitle = await page.locator(sel('agent-workspace-title')).innerText()
      report.checks.runRowHighlighted = await page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`).evaluate((e) => e.className.includes('bg-indigo-50'))
      await shot(page, '05-task-agent-conversation-1512x952')
      await page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`).click(); await delay(1500)
      report.checks.backToHostTitle = await page.locator(sel('agent-workspace-title')).innerText()
    }

    if (!process.argv.includes('--skip-team')) {
      // A Team collaborator: task Team rows with members (opened once when it appears).
      await runInput.click(); await runInput.fill(''); await page.keyboard.type('@product-team')
      await page.locator(sel('run-mention-menu')).waitFor()
      await page.locator(sel('run-mention-option-product-team')).waitFor()
      await delay(800)
      await page.keyboard.press('Enter')
      await page.keyboard.type('please fix the UI first and report back.')
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.querySelector('[data-transient-kind="task_team"]'), null, { timeout: 300000 })
        .catch(() => report.notes.push('no task Team row appeared'))
      await waitIdle(page)
      await delay(8000)
      await shot(page, '06-agent-run-task-team-added-1512x952')
      report.checks.taskRowsAfterTeam = await page.locator(sel('workspace-team-transient-execution-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-transient-kind')))
    }

    // What is in the run is no longer offered.
    await runInput.click(); await runInput.fill(''); await page.keyboard.type('@')
    await page.locator(sel('run-mention-menu')).waitFor(); await delay(1500)
    report.checks.menuOptionsAfter = await listedOptions(page)
    await shot(page, '07-at-menu-after-adds-1512x952')
    await page.keyboard.press('Escape')

    // VIS-014: small window.
    await page.setViewportSize({ width: 1024, height: 640 }); await delay(600)
    await runInput.click(); await runInput.fill(''); await page.keyboard.type('@')
    await page.locator(sel('run-mention-menu')).waitFor(); await delay(600)
    report.checks.smallWindowGeometry = await page.evaluate(() => {
      const menu = document.querySelector('[data-test="run-mention-menu"]').getBoundingClientRect()
      return { top: menu.top, bottom: menu.bottom, vh: innerHeight, onScreen: menu.top >= 0 && menu.bottom <= innerHeight }
    })
    await shot(page, '08-at-menu-small-window-1024x640')
    await page.keyboard.press('Escape')
  } finally {
    report.pageErrors = pageErrors
    await fs.writeFile(path.join(outDir, 'render-check-report.json'), JSON.stringify(report, null, 2))
    await context.close(); await browser.close()
    if (runId && !process.argv.includes('--keep-run')) {
      await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId }).catch(() => undefined)
    }
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => { console.error(error); process.exit(1) })
