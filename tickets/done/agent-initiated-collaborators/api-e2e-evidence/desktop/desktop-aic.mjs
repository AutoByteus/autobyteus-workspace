#!/usr/bin/env node
// Real desktop journeys (agent-initiated-collaborators, API/E2E round 1): an isolated AutoByteus desktop
// instance built from this worktree (`pnpm --silent isolated-app start --build`), the public agent
// package imported through Settings, real Claude runs. Attaches to the instance's control port only.
// Usage (from autobyteus-web so playwright-core resolves):
//   node <this file> --control-port <n> --backend <url> [--phases D0,D1,D2,D3,D4] [--model haiku]
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright-core')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
const controlPort = arg('control-port'); const backend = arg('backend'); const model = arg('model', 'haiku')
const phases = arg('phases', 'D0,D1,D2,D3,D4').split(',')
const outDir = path.dirname(fileURLToPath(import.meta.url))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const reportFile = path.join(outDir, arg('report', 'desktop-report.json'))
const prior = await fs.readFile(reportFile, 'utf8').then(JSON.parse).catch(() => ({}))
const report = { startedAt: prior.startedAt ?? new Date().toISOString(), controlPort, backend, model, phases: prior.phases ?? {}, observations: prior.observations ?? [], state_teamRunId: arg('team-run-id', prior.state_teamRunId), restoreBaseline: prior.restoreBaseline }
const note = (t, d) => { report.observations.push({ t, d: d ?? null }); console.log(`  · ${t}`) }
const check = (ok, label, details) => { (report.current.checks ??= []).push({ ok: Boolean(ok), label, details: details ?? null }); console.log(`  ${ok ? '✓' : '✗'} ${label}`) }
const waitFor = async (label, fn, timeout = 120000, interval = 1000) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { last = await fn(); if (last) return last } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data
}
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
let page
const shot = async (name) => { const file = path.join(outDir, `${name}.png`); await page.screenshot({ path: file }); (report.current.shots ??= []).push(path.basename(file)) }
const push = (to) => page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), to)
const runComposer = () => page.locator('main textarea[aria-autocomplete="list"]').last()
const menuOptions = () => page.locator(`${sel('run-mention-menu')} [data-test^="run-mention-option-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('run-mention-option-', '')))
const fromLabels = () => page.locator('main').first().locator('[data-testid="inter-agent-inline"]').evaluateAll((els) => els.map((e) => (e.innerText.match(/From [^:]+:/) ?? [''])[0]))
const toolCards = () => page.locator('main .my-2 > .rounded-lg').evaluateAll((cards) => cards.map((c) => ({ text: c.innerText.slice(0, 120), error: Boolean(c.querySelector('.text-red-500')) })))
const transientRows = () => page.locator(sel('workspace-team-transient-execution-row')).evaluateAll((els) => els.map((e) => ({ kind: e.getAttribute('data-transient-kind'), label: e.getAttribute('aria-label'), text: e.innerText.trim() })))
const messageRows = () => page.locator(sel('team-communication-message-row')).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
const headerStatusIs = (wanted) => page.evaluate((w) => {
  const main = document.querySelector('main'); if (!main) return false
  const top = main.getBoundingClientRect().top
  return [...main.querySelectorAll('*')].some((n) => n.children.length === 0 && w.includes(n.textContent.trim()) && n.getBoundingClientRect().top - top < 60)
}, wanted)
const waitNotBusy = (timeout = 300000) => waitFor('focused agent not busy', () => headerStatusIs(['Idle', 'Offline']), timeout, 1500)
const clickRightTab = async (label) => {
  // The desktop window may show the right panel collapsed to its icon strip; open it from there.
  if (!(await page.locator(sel('right-side-tab-list')).isVisible().catch(() => false))) {
    await page.locator(`${sel('workspace-right-tool-strip')} button[title="${label}"]`).first().click(); await delay(1000)
  }
  await page.locator(`${sel('right-side-tab-list')} [role="tab"]`).filter({ hasText: label }).first().click(); await delay(800)
}
const openMenu = async () => {
  const input = runComposer(); await input.click(); await input.fill(''); await page.keyboard.type('@')
  await page.locator(sel('run-mention-menu')).waitFor({ timeout: 30000 })
  await waitFor('menu options', async () => (await menuOptions()).length > 0 || await page.locator(sel('run-mention-menu-empty')).isVisible(), 30000, 300)
  await delay(500)
}
const mentionAndSend = async (prefix, query, id, rest) => {
  await waitNotBusy()
  const input = runComposer(); await input.click(); await input.fill('')
  await page.keyboard.type(`${prefix}@${query}`)
  await page.locator(sel(`run-mention-option-${id}`)).waitFor({ timeout: 30000 }); await delay(300)
  await page.locator(sel(`run-mention-option-${id}`)).click()
  await page.keyboard.type(rest)
  await page.keyboard.press('Enter')
}
const pickModel = async () => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel('chat-runtime-claude_agent_sdk')).click()
  const row = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
  await page.locator(row).first().waitFor({ timeout: 120000 })
  const models = await page.locator(row).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = models.includes(model) ? model : models[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click(); return chosen
}
const newChat = async () => { await push('/chat'); await page.locator(sel('chat-new')).waitFor({ timeout: 60000 }); await delay(1000) }
const defs = {}
const loadDefinitions = async () => {
  const d = await gql('{ agentDefinitions { id name } agentTeamDefinitions { id name } }')
  const find = (list, re) => list.find((x) => re.test(x.name))?.id
  Object.assign(defs, {
    productPrototyper: find(d.agentDefinitions, /^product prototyper$/i), seTeam: find(d.agentTeamDefinitions, /^software engineering team$/i),
    productTeam: find(d.agentTeamDefinitions, /^product team$/i), marketingTeam: find(d.agentTeamDefinitions, /^marketing team$/i),
    researchEngineer: find(d.agentDefinitions, /^research engineer$/i),
  })
  report.definitions = defs
}
const conversationText = () => page.locator('main').first().innerText()


const PM_INSTRUCTIONS = 'You are a precise project manager. Follow the user\'s instructions exactly, one tool call at a time, call only the tools the user names, and keep every reply to one short sentence.'
const ensurePm = async () => {
  const d = await gql('{ agentDefinitions { id name toolNames } }')
  const existing = d.agentDefinitions.find((x) => x.name === 'Project Manager')
  if (existing) return existing.id
  return (await gql('mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id } }', { input: {
    name: 'Project Manager', description: 'Plans work and hands it to agents and teams.', instructions: PM_INSTRUCTIONS, toolNames: ['list_available_agents'] } })).createAgentDefinition.id
}
const startChat = async (query, targetId, firstMessage) => {
  await newChat(); report.current.model = await pickModel()
  const chat = page.locator(`${sel('chat-composer')} textarea`).first()
  await chat.click(); await page.keyboard.type(`@${query}`)
  await page.locator(sel(`chat-target-option-${targetId}`)).click()
  await page.keyboard.type(firstMessage)
  await page.locator(sel('chat-primary-action')).first().click()
}
const sendInRun = async (text) => {
  await waitNotBusy()
  const input = runComposer(); await input.click(); await input.fill(''); await page.keyboard.type(text); await page.keyboard.press('Enter')
  await delay(3000)
}
const rowsText = (rows) => rows.map((r) => `${r.kind}:${r.text.replace(/\s+/g, ' ')}:${/offline/i.test(r.label ?? '') ? 'offline' : 'live'}`)

const PHASES = {
  async D0() {
    await push('/settings'); await delay(1500)
    await page.locator('[data-testid="settings-nav-agent-packages"]').click(); await delay(1000)
    if (!(await page.locator('[data-testid="agent-package-row-github_repository"]').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="agent-package-source-input"]').fill('https://github.com/AutoByteus/autobyteus-agents')
      await page.locator('[data-testid="agent-package-import-button"]').click()
      await page.locator('[data-testid="agent-package-row-github_repository"]').first().waitFor({ timeout: 300000 })
    }
    await delay(1500); await shot('D0-public-package-imported')
    await loadDefinitions()
    const orgs = await gql('{ agentOrgDefinitions { id name } }').catch(() => ({ agentOrgDefinitions: [] }))
    report.orgs = orgs.agentOrgDefinitions
    defs.pm = await ensurePm()
    // The renderer caches definitions; reload so it knows the Project Manager.
    await page.reload({ waitUntil: 'domcontentloaded' }); await delay(6000)
    check(defs.seTeam && defs.productTeam && defs.marketingTeam && defs.productPrototyper && defs.pm, 'public package imported; Project Manager defined with list_available_agents', { defs, orgs: report.orgs })
    // AC-001 UI: the tool picker lists list_available_agents and it is selected on the PM.
    await push(`/agents?view=edit&id=${encodeURIComponent(defs.pm)}`); await delay(4000)
    const visible = await page.getByText('list_available_agents').first().isVisible().catch(() => false)
    await page.getByText('list_available_agents').first().scrollIntoViewIfNeeded().catch(() => undefined)
    check(visible, 'the tool picker shows list_available_agents on the Project Manager')
    await shot('D0-tool-picker')
  },
  async DA() {
    if (!defs.pm) defs.pm = await ensurePm()
    // Agent root (SC-001/SC-002): the PM lists, brings in a team by message, delegates two catalog copies.
    await startChat('project', defs.pm, 'Step 1: call list_available_agents. Step 2: call send_message_to with recipient_address set to the address of "Software Engineering Team" and content "Solution designer: reply to me with send_message_to in one short sentence. Text only, no files." Step 3: call delegate_task twice with recipient_address set to the address of "Product Team": first with description "Reply in one sentence about a login screen. Text only, no files.", then with description "Reply in one sentence about a settings page. Text only, no files." Then reply DONE.')
    await page.waitForURL((u) => /id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    report.state_pmRunId = decodeURIComponent(page.url().split('id=')[1] ?? '').split('&')[0]
    await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
    const rows = await waitFor('SE team collaborator and two product team copies', async () => {
      const r = await transientRows()
      return r.some((x) => x.kind === 'task_team' && /software engineering team/i.test(x.text)) && r.filter((x) => x.kind === 'task_team' && /product team/i.test(x.text)).length >= 2 ? r : null
    }, 600000, 2000).catch(async () => { note('DA rows not complete', rowsText(await transientRows())); return transientRows() })
    report.current.rows = rowsText(rows)
    check(rows.some((x) => x.kind === 'task_team' && /software engineering team/i.test(x.text)), 'agent-initiated collaborator Team row under the PM run', report.current.rows)
    check(rows.filter((x) => x.kind === 'task_team' && /product team/i.test(x.text)).length === 2, 'two catalog-copy rows for Product Team under the PM run', report.current.rows)
    await waitNotBusy(600000).catch(() => null)
    await shot('DA-01-pm-rows')
    const view = await gql('query($id:String!){ agentRunCollaboration(runId:$id) }', { id: report.state_pmRunId })
    const tree = view.agentRunCollaboration?.root_agent?.execution_tree
    report.current.tree = { collaborators: tree?.collaborators?.map((c) => [c.kind, c.address, c.addedViaAgentRunId]), copies: tree?.taskExecutions?.map((t) => [t.address, Boolean(t.source)]) }
    check(tree?.collaborators?.length === 1 && tree.collaborators[0].addedViaAgentRunId === report.state_pmRunId, 'one collaborator, added by the PM', report.current.tree)
    check(tree?.taskExecutions?.length === 2 && tree.taskExecutions.every((t) => t.source?.kind === 'agent_team'), 'two catalog copies with source; no collaborator for Product Team (Q-1)', report.current.tree)
    // The brought-in coordinator's conversation starts with the PM's message.
    await page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: /solution designer/i }).first().click(); await delay(3000)
    const from = await fromLabels(); check(from[0] === 'From Project Manager:', 'solution designer view starts "From Project Manager:"', from)
    await shot('DA-02-solution-designer-view')
    // A catalog copy's coordinator view renders.
    await page.locator(`${sel('workspace-team-transient-execution-row')}[data-transient-kind="task_team_child"]`).filter({ hasText: /product prototyper/i }).first().click(); await delay(3000)
    const copyText = await conversationText()
    check(/Task delegator|delegat/i.test(copyText) || copyText.length > 50, 'catalog copy coordinator view renders its task', copyText.slice(0, 200))
    await shot('DA-03-product-team-copy-view')
    // SC-005: the brought-in team is not offered again by @ (one instance).
    await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${report.state_pmRunId}"]`).first().click(); await delay(2500)
    await openMenu(); const options = await menuOptions()
    check(!options.includes(defs.seTeam) && options.includes(defs.marketingTeam), '@ menu no longer offers the brought-in Software Engineering Team', options.slice(0, 40))
    await page.keyboard.press('Escape')
    await clickRightTab('Team'); const tab = await messageRows(); report.current.teamTab = tab
    check(tab.some((t) => /solution designer/i.test(t)), 'Team tab lists the PM\'s message to the solution designer', tab)
    await shot('DA-04-pm-team-tab')
  },
  async DT() {
    // Team root: the solution designer brings in Product Prototyper and delegates a Marketing Team copy.
    await startChat('software', defs.seTeam, 'Hello team. Solution designer: reply with one short sentence only.')
    await page.waitForURL(/workspace/, { timeout: 180000 }); await delay(5000); await waitNotBusy(600000)
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
    report.state_teamRunId = h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === defs.seTeam)?.runs?.[0]?.teamRunId
    await sendInRun('Call send_message_to exactly once with recipient_address "/product_prototyper" and content "Reply to me with send_message_to in one short sentence. Text only, no files." Then call delegate_task exactly once with recipient_address "/marketing_team" and description "Reply in one sentence about a dark-mode announcement. Text only, no files, publish nothing." Do not call any other tool. Then reply DONE.')
    const rows = await waitFor('Team-root rows', async () => {
      const r = await transientRows()
      return r.some((x) => x.kind === 'task_agent' && /product prototyper/i.test(x.text)) && r.some((x) => x.kind === 'task_team' && /marketing team/i.test(x.text)) ? r : null
    }, 600000, 2000).catch(async () => { note('DT rows not complete', rowsText(await transientRows())); return transientRows() })
    report.current.rows = rowsText(rows)
    check(rows.some((x) => x.kind === 'task_agent' && /product prototyper/i.test(x.text)), 'Team root: agent-initiated collaborator row (Product Prototyper)', report.current.rows)
    check(rows.some((x) => x.kind === 'task_team' && /marketing team/i.test(x.text)), 'Team root: catalog-copy row (Marketing Team)', report.current.rows)
    await waitNotBusy(600000).catch(() => null)
    await shot('DT-01-team-rows')
    // F-02: the catalog copy row and its members read as spaced names (no raw address segments).
    const copyRow = page.locator(`${sel('workspace-team-transient-execution-row')}[data-transient-kind="task_team"]`).filter({ hasText: /marketing/i }).last()
    await copyRow.scrollIntoViewIfNeeded().catch(() => {})
    if (await copyRow.getAttribute('aria-expanded') === 'false') { await copyRow.click(); await delay(2000) }
    const after = await transientRows(); report.current.rowsExpanded = rowsText(after)
    const marketing = after.filter((x) => /marketing|computer use/i.test(x.text))
    check(marketing.some((x) => /^marketing team$/i.test(x.text.replace(/^[A-Z]{1,2} /, ''))) && marketing.some((x) => /marketing content creator/i.test(x.text)) && marketing.some((x) => /computer use operator/i.test(x.text)) && !marketing.some((x) => /_/.test(x.text)),
      'F-02: Team-root catalog copy and its members show spaced names', marketing.map((x) => `${x.kind}:${x.text}:${x.label}`))
    await shot('DT-02-team-copy-names')
    await page.locator(`${sel('workspace-team-transient-execution-row')}[data-transient-kind="task_agent"]`).filter({ hasText: /product prototyper/i }).last().click(); await delay(3000)
    const from = await fromLabels(); check(from[0] === 'From Solution Designer:', 'Product Prototyper view starts "From Solution Designer:"', from)
    await shot('DT-02b-product-prototyper-view')
    await page.locator(`${sel('workspace-team-transient-execution-row')}[data-transient-kind="task_team_child"]`).filter({ hasText: /marketing content creator/i }).last().click(); await delay(3000)
    await shot('DT-03-marketing-copy-view')
    await clickRightTab('Team'); const tab = await messageRows(); report.current.teamTab = tab
    check(tab.some((t) => /product prototyper/i.test(t)), 'Team tab lists the message to Product Prototyper', tab)
  },
  async DTtab() {
    // The solution designer's Team tab lists its message to the brought-in Product Prototyper.
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
    const teamRunId = h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === defs.seTeam)?.runs?.[0]?.teamRunId
    await page.locator(`[data-test^="workspace-team-member-${teamRunId}-"]`).filter({ hasText: /solution_designer|solution designer/i }).first().click(); await delay(3000)
    await clickRightTab('Team'); const tab = await messageRows(); report.current.teamTab = tab
    check(tab.some((t) => /product prototyper/i.test(t)), 'Team tab (solution designer) lists the message to Product Prototyper', tab)
    await shot('DT-06-team-tab')
  },
  async DO() {
    // Org root: a member brings in Product Prototyper and delegates a Marketing Team copy.
    const org = (report.orgs ?? []).find((o) => /software development/i.test(o.name)) ?? (report.orgs ?? [])[0]
    if (!org) { note('DO: the public package has no Agent Org definition'); return }
    report.current.org = org
    await startChat(org.name.split(/\s+/)[0].toLowerCase(), org.id, 'Hello. Reply with one short sentence only.')
    await page.waitForURL(/workspace/, { timeout: 180000 }); await delay(6000); await waitNotBusy(600000).catch(() => null)
    await shot('DO-00-org-started')
    await sendInRun('Call send_message_to exactly once with recipient_address "/product_prototyper" and content "Reply to me with send_message_to in one short sentence. Text only, no files." Then call delegate_task exactly once with recipient_address "/marketing_team" and description "Reply in one sentence about a dark-mode announcement. Text only, no files, publish nothing." Do not call any other tool. Then reply DONE.')
    const rows = await waitFor('Org-root rows', async () => {
      const r = await transientRows()
      return r.some((x) => /product prototyper/i.test(x.text)) && r.some((x) => /marketing team/i.test(x.text)) ? r : null
    }, 600000, 2000).catch(async () => { note('DO rows not complete', rowsText(await transientRows())); return transientRows() })
    report.current.rows = rowsText(rows)
    check(rows.some((x) => /product prototyper/i.test(x.text)), 'Org root: agent-initiated collaborator row (Product Prototyper)', report.current.rows)
    check(rows.some((x) => x.kind === 'task_team' && /marketing team/i.test(x.text)), 'Org root: catalog-copy row (Marketing Team)', report.current.rows)
    await waitNotBusy(600000).catch(() => null)
    await shot('DO-01-org-rows')
  },
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`)
page = browser.contexts().flatMap((c) => c.pages()).find((p) => /renderer\/index\.html/.test(p.url()))
if (!page) throw new Error('renderer page not found on the control port')
page.setDefaultTimeout(30000)
const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
if (!phases.includes('D0')) await loadDefinitions()
for (const id of phases) {
  report.current = report.phases[id] = { startedAt: new Date().toISOString() }
  console.log(`== ${id}`)
  try { await PHASES[id](); report.current.result = report.current.checks?.every((c) => c.ok) === false ? 'Fail' : 'Pass' }
  catch (error) { report.current.result = 'Error'; report.current.error = error.message; await shot(`${id}-error`).catch(() => {}) }
  console.log(`${id} ${report.current.result}${report.current.error ? ` — ${report.current.error}` : ''}`)
  delete report.current
  await fs.writeFile(reportFile, JSON.stringify({ ...report, pageErrors }, null, 2))
}
await browser.close().catch(() => {})
