#!/usr/bin/env node
// IR-002 render check (CR-002, REQ-011) in a Team root. Not an API/E2E suite.
// A one-member "PM Team" whose coordinator is the Project Manager (seeded by render-check-aic.mjs, with only
// `list_available_agents` selected) brings Code Reviewer in and delegates two Product Team catalog copies.
// Checks: the Team-root rows of the collaborator, the catalog copies and their members read as spaced names
// (`product team`, `product prototyper`), never raw segments. Uses the worktree's own `pnpm dev` stack.
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
const outDir = path.resolve(arg('out', path.join(here, 'render-check-aic-team')))
const model = arg('model', 'haiku')
const backendUrl = 'http://127.0.0.1:8000'
const frontUrl = 'http://127.0.0.1:3000'
const workspaceRoot = path.resolve(here, '../../../../.autobyteus/render-check-workspace')
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const TEAM_VIEW = '[data-testid="team-workspace-surface"]'
const report = { shots: [], checks: {}, notes: [] }

const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 500)}`)
  return json.data
}

const rowsOf = (page) => page.locator('[data-test="workspace-team-transient-execution-row"]').evaluateAll((els) => els.map((e) => ({
  kind: e.getAttribute('data-transient-kind'), address: e.getAttribute('data-member-address'), text: e.innerText.replace(/\s+/g, ' ').trim(),
})))

const main = async () => {
  await fs.mkdir(outDir, { recursive: true }); await fs.mkdir(workspaceRoot, { recursive: true })
  const existing = await gql('{ agentDefinitions { id name } agentTeamDefinitions { id name } }')
  const pm = existing.agentDefinitions.find((d) => d.name === 'Project Manager')
  if (!pm) throw new Error('Run render-check-aic.mjs first: it seeds the Project Manager.')
  let teamId = existing.agentTeamDefinitions.find((d) => d.name === 'PM Team')?.id
  if (!teamId) {
    teamId = (await gql('mutation($input: CreateAgentTeamDefinitionInput!){ createAgentTeamDefinition(input:$input){ id } }', { input: {
      name: 'PM Team', description: 'A project manager.', instructions: 'Plan and hand work to others.', coordinatorMemberName: 'pm',
      nodes: [{ memberName: 'pm', ref: pm.id, refScope: 'SHARED' }],
    } })).createAgentTeamDefinition.id
  }
  const launch = { llmModelIdentifier: model, autoExecuteTools: true, workspaceRootPath: workspaceRoot, llmConfig: null, runtimeKind: 'claude_agent_sdk' }
  const created = await gql('mutation($input: CreateAgentTeamRunInput!){ createAgentTeamRun(input:$input){ success message teamRunId } }', { input: {
    teamDefinitionId: teamId, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: [{ memberAddress: '/pm', agentDefinitionId: pm.id, ...launch }],
  } })
  if (!created.createAgentTeamRun.success) throw new Error(`Team run: ${created.createAgentTeamRun.message}`)
  const teamRunId = created.createAgentTeamRun.teamRunId
  report.teamRunId = teamRunId
  const browser = await chromium.launch({ executablePath: chrome, headless: true })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, deviceScaleFactor: 1, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
  try {
    await page.goto(`${frontUrl}/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=${encodeURIComponent(teamRunId)}`, { waitUntil: 'domcontentloaded' })
    await page.locator(TEAM_VIEW).waitFor({ timeout: 180000 })
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
    await delay(3000)
    const input = page.locator(`${TEAM_VIEW} textarea`).first()
    await input.click(); await input.fill('Please start: work through your steps.')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('[data-transient-kind="task_team"]').length >= 2, null, { timeout: 300000 })
      .catch(() => report.notes.push('fewer than two task-team copy rows appeared'))
    await delay(15000)
    report.checks.rows = await rowsOf(page)
    report.checks.rawSegmentsShown = report.checks.rows.filter((row) => /_/.test(row.text)).map((row) => row.text)
    await page.screenshot({ path: path.join(outDir, 'B1-team-root-catalog-copy-rows-1512x952.png') }); report.shots.push('B1')
    const member = page.locator('[data-test="workspace-team-transient-execution-row"][data-member-address="/product_team/product_prototyper"]').first()
    if (await member.count()) {
      await member.click(); await delay(3000)
      report.checks.memberHeader = await page.locator(`${TEAM_VIEW} h4`).first().innerText().catch(() => null)
      await page.screenshot({ path: path.join(outDir, 'B2-team-root-copy-member-1512x952.png') }); report.shots.push('B2')
    } else report.notes.push('no copy member row to open')
  } finally {
    report.pageErrors = pageErrors
    await fs.writeFile(path.join(outDir, 'render-check-report.json'), JSON.stringify(report, null, 2))
    await context.close(); await browser.close()
    if (!process.argv.includes('--keep-run')) await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId }).catch(() => undefined)
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => { console.error(error); process.exit(1) })
