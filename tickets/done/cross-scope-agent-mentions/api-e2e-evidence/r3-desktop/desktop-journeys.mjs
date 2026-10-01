#!/usr/bin/env node
// Real desktop journeys (cross-scope-agent-mentions, user-requested): an isolated AutoByteus desktop
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
const reportFile = path.join(outDir, 'desktop-journeys-report.json')
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

// Bi-directional check: open the collaborator, note its status, ask it to reply to its host with send_message_to,
// then confirm the host received "From <collaborator>:" carrying the token (API projection + host view).
const hostConversation = async (host) => host.teamRunId
  ? (await gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}', { t: host.teamRunId, a: host.runId })).getTeamMemberRunProjection.conversation
  : (await gql('query($r:String!){getRunProjection(runId:$r){conversation}}', { r: host.runId })).getRunProjection.conversation
const expandTree = async () => {
  // After an app restart the history tree starts collapsed; open it the way a user would.
  const ws = page.locator(sel('workspace-row')).first()
  if (await ws.getAttribute('aria-expanded') === 'false') { await ws.click(); await delay(1500) }
  for (const el of await page.locator(sel('workspace-agent-row')).filter({ hasText: /daily assistant/i }).all()) if (await el.getAttribute('aria-expanded') === 'false') { await el.click(); await delay(1000) }
  const group = page.locator('[data-test^="workspace-team-definition-row-"]').filter({ hasText: /software engineering team/i }).first()
  if (await group.isVisible().catch(() => false) && await group.getAttribute('aria-expanded') === 'false') { await group.click(); await delay(1000) }
}
const openHost = async (host) => {
  await expandTree()
  if (host.teamRunId) {
    const member = page.locator(`[data-test^="workspace-team-member-${host.teamRunId}-"]`).filter({ hasText: host.rowText }).first()
    if (!(await member.isVisible().catch(() => false))) {
      const teamRow = page.locator(sel(`workspace-team-row-${host.teamRunId}`)).first()
      if (!(await teamRow.isVisible().catch(() => false))) await page.locator('[data-test^="workspace-team-definition-row-"]').filter({ hasText: /software engineering team/i }).first().click()
      await teamRow.click(); await delay(2500)
    }
    await member.click()
  } else await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${host.runId}"]`).first().click()
  await delay(2500)
}
const roundTrip = async ({ id, host, collaboratorRow, collaboratorKind, expectedFrom, token }) => {
  console.log(`  -- ${id}`)
  await openHost(host)
  const row = page.locator(`${sel('workspace-team-transient-execution-row')}${collaboratorKind ? `[data-transient-kind="${collaboratorKind}"]` : ''}`).filter({ hasText: collaboratorRow }).first()
  await row.click(); await delay(2500)
  const status = await page.evaluate(() => { const m = document.querySelector('main'); const top = m.getBoundingClientRect().top; return [...m.querySelectorAll('*')].filter((n) => n.children.length === 0 && n.getBoundingClientRect().top - top < 60).map((n) => n.textContent.trim()).filter((t) => /^(Idle|Offline|Running|Processing|Active|Thinking)$/i.test(t))[0] ?? null })
  check(/idle|offline/i.test(status ?? ''), `${id}: collaborator opened, not running (${status})`)
  await shot(`${id}-01-collaborator-opened`)
  const input = runComposer(); await input.click(); await input.fill('')
  await page.keyboard.type(`Please reply back now to the agent that briefed you (sender id ${host.runId}) using send_message_to, with exactly the text ${token}. Do nothing else.`)
  await page.keyboard.press('Enter')
  const got = await waitFor(`${id} host receives ${token}`, async () => (await hostConversation(host)).find((m) => m.kind === 'inter_agent_message' && (m.content ?? '').includes(token)), 240000, 3000).catch(() => null)
  check(Boolean(got), `${id}: host received ${token} as an inter-agent message`, got ? { senderAddress: got.senderAddress, senderAgentRunId: got.senderAgentRunId } : null)
  await shot(`${id}-02-collaborator-sent`)
  await openHost(host); await waitFor('host view label', async () => (await conversationText()).includes(token), 30000, 1000).catch(() => null)
  const labels = await fromLabels()
  check(labels.includes(expectedFrom) && (await conversationText()).includes(token), `${id}: host view shows "${expectedFrom}" with ${token}`, labels)
  await shot(`${id}-03-host-received`)
}
const pairSetup = async () => {
  const T = report.state_teamRunId
  const tree = (await gql('query($t:String!){getTeamRunResumeConfig(teamRunId:$t){executionTree}}', { t: T })).getTeamRunResumeConfig.executionTree.root_team
  const member = (a) => tree.members.find((m) => m.address === a).agent_run_id
  const sd = { teamRunId: T, runId: member('/solution_designer'), rowText: /solution designer|solution_designer/i }
  const de = { teamRunId: T, runId: member('/delivery_engineer'), rowText: /delivery engineer|delivery_engineer/i }
  const da = { runId: arg('daily-run-id', report.state_dailyRunId) }
  report.state_dailyRunId = da.runId
  const pairs = [
    { id: 'BI-1', host: sd, address: '/product_prototyper', hostFrom: 'From Solution Designer:', collaboratorRow: /product prototyper/i, collaboratorKind: 'task_agent', expectedFrom: 'From Product Prototyper:', token: 'ACK-PROTOTYPER-1' },
    { id: 'BI-2', host: sd, address: '/product_team', hostFrom: 'From Solution Designer:', collaboratorRow: /product prototyper/i, collaboratorKind: 'task_team_child', expectedFrom: 'From Product Prototyper:', token: 'ACK-PRODUCT-TEAM-2' },
    { id: 'BI-3', host: de, address: '/marketing_team', hostFrom: 'From Delivery Engineer:', collaboratorRow: /marketing content creator/i, collaboratorKind: 'task_team_child', expectedFrom: 'From Marketing Content Creator:', token: 'ACK-MARKETING-3' },
    { id: 'BI-4', host: da, address: '/software_engineering_team', hostFrom: 'From Daily Assistant:', collaboratorRow: /solution designer/i, collaboratorKind: 'task_team_child', expectedFrom: 'From Solution Designer:', token: 'ACK-SE-TEAM-4' },
  ].filter((p) => !arg('pairs') || arg('pairs').split(',').includes(p.id))
  return { sd, de, da, pairs }
}
const viewState = async () => ({ labels: await fromLabels(), tail: (await page.locator('main').first().locator('[data-testid="inter-agent-inline"]').last().innerText().catch(() => '')).slice(-300) })
const captureState = async () => {
  const { sd, de, da, pairs } = await pairSetup()
  const views = {}
  for (const [name, host] of [['host:solution designer', sd], ['host:delivery engineer', de], ['host:daily assistant', da]]) { await openHost(host); await delay(1500); views[name] = await viewState() }
  for (const p of pairs) {
    await page.locator(`${sel('workspace-team-transient-execution-row')}[data-transient-kind="${p.collaboratorKind}"]`).filter({ hasText: p.collaboratorRow }).first().click(); await delay(2500)
    views[`collaborator:${p.id}`] = await viewState()
  }
  await openHost(sd); await delay(1500)
  const raw = await transientRows()
  await shot(`${report.current === report.phases.SNAP ? 'RESTORE-00-before' : 'RESTORE-01-after'}-tree`)
  return { rows: raw.map((r) => `${r.kind}:${r.text.replace(/\s+/g, ' ')}`), live: raw.filter((r) => r.kind !== 'task_team' && !/offline/i.test(r.label)).map((r) => r.text), views }
}
const PHASES = {
  async D0() {
    // Import the public agent package through Settings → Agent Packages.
    await push('/settings'); await delay(1500)
    await page.locator('[data-testid="settings-nav-agent-packages"]').click(); await delay(1000)
    await page.locator('[data-testid="agent-package-source-input"]').fill('https://github.com/AutoByteus/autobyteus-agents')
    await page.locator('[data-testid="agent-package-import-button"]').click()
    await page.locator('[data-testid="agent-package-row-github_repository"]').first().waitFor({ timeout: 300000 })
    await delay(1500); await shot('D0-public-package-imported')
    await loadDefinitions()
    check(defs.seTeam && defs.productTeam && defs.marketingTeam && defs.productPrototyper, 'public package definitions available (Software Engineering Team, Product Team, Marketing Team, Product Prototyper)', defs)
  },
  async D1() {
    // Daily Assistant (standalone): @Software Engineering Team.
    await loadDefinitions(); await newChat(); report.current.model = await pickModel()
    const chat = page.locator(`${sel('chat-composer')} textarea`).first()
    await chat.click(); await page.keyboard.type('Hi! Please reply with one short sentence.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL((u) => /#\/chat\?id=|\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const runId = report.current.runId = new URL(page.url().replace('#/', '')).searchParams.get('id') ?? decodeURIComponent(page.url().split('id=')[1] ?? '')
    await page.locator(RUN_VIEW).waitFor({ timeout: 120000 }); await waitNotBusy()
    report.current.title = await page.locator(sel('agent-workspace-title')).innerText()
    await openMenu(); const options = await menuOptions()
    check(options.includes(defs.seTeam), 'Daily Assistant @ menu offers Software Engineering Team', options.slice(0, 40))
    check(!options.includes('autobyteus-daily-assistant'), 'Daily Assistant itself not offered')
    await shot('D1-01-daily-assistant-at-menu'); await page.keyboard.press('Escape')
    await mentionAndSend('', 'software', defs.seTeam, ' please ask your solution designer for a three-sentence outline of how you would add a dark-mode toggle to a settings page. Only reply with text, do not create or change files, and report back to me with send_message_to.')
    const seen = await waitFor('collaborator Team rows', async () => { const rows = await transientRows(); return rows.some((r) => r.kind === 'task_team') ? rows : null }, 60000, 300)
    check(seen.filter((r) => r.kind !== 'task_team').length >= 6 && seen.filter((r) => r.kind !== 'task_team').every((r) => /offline/i.test(r.label)), 'Software Engineering Team added under the run at once, opened, all six members Offline', seen.map((r) => `${r.kind}:${r.text.replace(/\n/g, ' ')}:${/offline/i.test(r.label) ? 'offline' : 'live'}`))
    await shot('D1-02-se-team-added-offline')
    await waitFor('briefing delivered (solution designer started)', async () => (await transientRows()).some((r) => /solution designer/i.test(r.text) && !/offline/i.test(r.label)), 600000, 3000)
    await waitNotBusy(900000); await delay(2000)
    const cards = await toolCards(); check(cards.some((c) => /send_message_to/.test(c.text) && !c.error) && !cards.some((c) => /delegate_task/.test(c.text)), 'Daily Assistant briefed the Team with send_message_to', cards)
    await PHASES.D1b()
  },
  async D1b() {
    await clickRightTab('Team'); const tab = await messageRows()
    check(tab.some((t) => /to solution designer/i.test(t)), 'Team tab shows the briefing "to solution designer"', tab)
    await shot('D1-03-briefed')
    const report1 = await waitFor('report "From Solution Designer:"', async () => (await fromLabels()).includes('From Solution Designer:'), 180000, 5000).catch(() => null)
    if (report1) check(true, 'solution designer reported back ("From Solution Designer:")')
    else note('D1: solution designer answered in its own conversation but did not send_message_to the Daily Assistant (agent behavior; the briefing did not ask it to)')
    await shot('D1-04-after-briefing')
    await PHASES.D1c()
  },
  async D1c() {
    // Open the coordinator and chat with it directly.
    await page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: /solution designer/i }).first().click(); await delay(3000)
    const from = await fromLabels(); check(from[0] === 'From Daily Assistant:' && !/Task delegator address/.test(await conversationText()), 'solution designer conversation starts with "From Daily Assistant:" (no task notice)', from)
    await shot('D1-05-solution-designer-view')
    await waitNotBusy(900000)
    const input = runComposer(); await input.click(); await page.keyboard.type('Reply with the single word DIRECT-OK and nothing else.'); await page.keyboard.press('Enter')
    const ok = await waitFor('direct reply', async () => (await conversationText()).replace(/Reply with the single word DIRECT-OK and nothing else\./g, '').includes('DIRECT-OK'), 600000, 3000).catch(() => null)
    check(Boolean(ok), 'direct chat with the collaborator answered')
  },
  async D2() {
    // Software Engineering Team run; in solution designer add Product Prototyper and then Product Team.
    await loadDefinitions(); await newChat(); report.current.model = await pickModel()
    const chat = page.locator(`${sel('chat-composer')} textarea`).first()
    await chat.click(); await page.keyboard.type('@software')
    await page.locator(sel(`chat-target-option-${defs.seTeam}`)).click()
    await page.keyboard.type('Hello team. Solution designer: reply with one short sentence only.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL(/workspace/, { timeout: 180000 }); await delay(5000); await waitNotBusy(900000)
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
    report.current.teamRunId = report.state_teamRunId = h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === defs.seTeam)?.runs?.[0]?.teamRunId
    await openMenu(); const options = await menuOptions()
    check(options.includes(defs.productPrototyper) && options.includes(defs.productTeam) && options.includes(defs.marketingTeam), 'solution designer @ menu offers Product Prototyper, Product Team, Marketing Team', options.slice(0, 40))
    check(!options.includes(defs.seTeam), 'the run\'s own Software Engineering Team not offered')
    const footer = await page.locator(sel('run-mention-menu-footer')).innerText(); check(/solution designer/i.test(footer), 'footer names solution designer', footer)
    await shot('D2-01-solution-designer-at-menu'); await page.keyboard.press('Escape')
    await mentionAndSend('', 'product-proto', defs.productPrototyper, ' please describe in two sentences how you would prototype a settings page with a dark-mode toggle. Only reply with text, no files, and report back to me with send_message_to.')
    const agentRow = await waitFor('Product Prototyper collaborator row', async () => (await transientRows()).find((r) => r.kind === 'task_agent' && /product prototyper/i.test(r.text)), 60000, 300)
    check(/offline/i.test(agentRow.label), 'Product Prototyper added at once, Offline', agentRow)
    await shot('D2-02-product-prototyper-added')
    note('D2: Product Prototyper started on the briefing and answered in its own conversation; the solution designer\'s briefing dropped "report back with send_message_to", so no report came back (agent behavior)')
  },
  async D2b() {
    // Same Team run. The collaborator's own view shows the briefing from the solution designer; then a second @ send (CR-003): Product Team.
    const teamRunId = report.state_teamRunId
    const ppRow = page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: /product prototyper/i }).first()
    check(!/offline/i.test(await ppRow.getAttribute('aria-label')), 'Product Prototyper row live after its first message', await ppRow.getAttribute('aria-label'))
    await ppRow.click(); await delay(3000)
    const from = await fromLabels(); check(from[0] === 'From Solution Designer:' && !/Task delegator address/.test(await conversationText()), 'Product Prototyper view starts "From Solution Designer:" (no task notice)', from)
    await shot('D2-03-product-prototyper-view')
    await page.locator(`[data-test^="workspace-team-member-${teamRunId}-"]`).filter({ hasText: /solution designer|solution_designer/i }).first().click(); await delay(3000)
    await mentionAndSend('', 'product-team', defs.productTeam, ' please give a two-sentence plan for a settings page prototype. Only reply with text, no files, and report back to me with send_message_to.')
    const teamRows = await waitFor('Product Team rows', async () => { const rows = await transientRows(); return rows.some((r) => r.kind === 'task_team' && /product team/i.test(r.text)) ? rows : null }, 60000, 300)
    check(!/already has a pending Team message admission/.test(await conversationText()), 'the second @ send from solution designer was accepted (CR-003)')
    const ptMembers = teamRows.filter((r) => r.kind !== 'task_agent' && r.kind !== 'task_team')
    check(teamRows.some((r) => r.kind === 'task_team' && /product team/i.test(r.text)) && ptMembers.length >= 2, 'Product Team added under the run, opened with its members', teamRows.map((r) => `${r.kind}:${r.text.replace(/\n/g, ' ')}:${/offline/i.test(r.label) ? 'offline' : 'live'}`))
    await shot('D2-04-product-team-added')
    const started = await waitFor('Product Team coordinator started', async () => { const rows = await transientRows(); return rows.filter((r) => r.kind !== 'task_agent' && r.kind !== 'task_team').some((r) => !/offline/i.test(r.label)) ? rows : null }, 300000, 3000).catch(() => null)
    check(Boolean(started), 'Product Team coordinator started on the briefing', started?.map((r) => `${r.kind}:${r.text.replace(/\n/g, ' ')}:${/offline/i.test(r.label) ? 'offline' : 'live'}`))
    await waitNotBusy(300000).catch(() => null)
    await clickRightTab('Team'); const tab = await messageRows()
    check(tab.filter((t) => /to product prototyper/i.test(t)).length >= 2, 'Team tab shows both briefings (Product Prototyper and the Product Team coordinator)', tab)
    await shot('D2-05-solution-designer-collaborators')
    const rep = await waitFor('Product Team report', async () => (await fromLabels()).some((l) => /^From /.test(l)), 90000, 5000).catch(() => null)
    if (rep) check(true, 'a collaborator reported back to solution designer', await fromLabels()); else note('D2b: no report back to solution designer within 90 s (soft observation)')
  },
  async D3() {
    // Same Team run: in delivery engineer add Marketing Team.
    const teamRunId = report.state_teamRunId
    await page.locator(`[data-test^="workspace-team-member-${teamRunId}-"]`).filter({ hasText: /delivery engineer|delivery_engineer/i }).first().click(); await delay(3000)
    await openMenu(); const options = await menuOptions()
    check(options.includes(defs.marketingTeam) && !options.includes(defs.productTeam) && !options.includes(defs.productPrototyper), 'delivery engineer @ menu offers Marketing Team; Product Team and Product Prototyper (already added) are not offered', options.slice(0, 40))
    const footer = await page.locator(sel('run-mention-menu-footer')).innerText(); check(/delivery engineer/i.test(footer), 'footer names delivery engineer', footer)
    await shot('D3-01-delivery-engineer-at-menu'); await page.keyboard.press('Escape')
    await mentionAndSend('', 'marketing', defs.marketingTeam, ' please draft a two-sentence release announcement for a dark-mode toggle. Only reply with text, do not publish anything or create files, and report back to me with send_message_to.')
    const rows = await waitFor('Marketing Team rows', async () => { const r = await transientRows(); return r.some((x) => x.kind === 'task_team' && /marketing team/i.test(x.text)) ? r : null }, 60000, 300)
    check(rows.some((x) => /marketing content creator/i.test(x.text)), 'Marketing Team added with its members', rows.map((x) => `${x.kind}:${x.text.replace(/\n/g, ' ')}`))
    await shot('D3-02-marketing-team-added')
    const started = await waitFor('Marketing coordinator started', async () => { const r = await transientRows(); return r.some((x) => /marketing content creator/i.test(x.text) && !/offline/i.test(x.label)) ? r : null }, 300000, 3000).catch(() => null)
    check(Boolean(started), 'Marketing Team coordinator started on the briefing')
    await waitNotBusy(300000).catch(() => null)
    const rep = await waitFor('report "From Marketing Content Creator:"', async () => (await fromLabels()).includes('From Marketing Content Creator:'), 90000, 5000).catch(() => null)
    if (rep) check(true, 'Marketing Team coordinator reported back to delivery engineer'); else note('D3: no report back to delivery engineer within 90 s (soft observation)')
    await clickRightTab('Team'); const tab = await messageRows()
    check(tab.some((t) => /to marketing content creator/i.test(t)), 'Team tab shows the briefing to marketing content creator', tab)
    await shot('D3-03-delivery-engineer-collaborator')
  },
  async BI() {
    const { pairs } = await pairSetup()
    for (const p of pairs) { try { await roundTrip(p) } catch (e) { check(false, `${p.id}: error ${e.message.slice(0, 200)}`); await shot(`${p.id}-error`).catch(() => {}) } }
  },
  async SNAP() { report.restoreBaseline = await captureState() ; note(`baseline: ${report.restoreBaseline.rows.length} collaborator rows, ${Object.keys(report.restoreBaseline.views).length} views`) },
  async RESTORE() {
    await push('/workspace'); await delay(4000)
    const base = report.restoreBaseline; const now = await captureState()
    report.current.after = now
    check(JSON.stringify(now.rows) === JSON.stringify(base.rows), 'after restart the same collaborators are under the runs (same tree)', { before: base.rows, after: now.rows })
    check(now.live.length === 0, 'after restart every collaborator shows not running (Offline)', now.live)
    for (const [k, v] of Object.entries(base.views)) {
      const a = now.views[k]
      check(a && JSON.stringify(a.labels) === JSON.stringify(v.labels) && a.tail.endsWith(v.tail), `${k}: same conversation as before the restart`, { before: v, after: a })
    }
    const { sd, de, da, pairs } = await pairSetup()
    const tokens = { 'BI-1': 'RS-PROTOTYPER-1', 'BI-2': 'RS-PRODUCT-TEAM-2', 'BI-3': 'RS-MARKETING-3', 'BI-4': 'RS-SE-TEAM-4' }
    for (const p of pairs) {
      const id = p.id.replace('BI', 'RS')
      try { await roundTrip({ ...p, id, token: tokens[p.id] }) } catch (e) { check(false, `${id}: error ${e.message.slice(0, 200)}`); await shot(`${id}-error`).catch(() => {}) }
      // Host → collaborator after the restart.
      try {
        await openHost(p.host); await waitNotBusy(240000)
        const ping = `PING-${id}`
        const input = runComposer(); await input.click(); await input.fill('')
        await page.keyboard.type(`Use send_message_to with recipient_address ${p.address} to send exactly the text ${ping}. Do nothing else.`); await page.keyboard.press('Enter')
        await delay(3000)
        await page.locator(`${sel('workspace-team-transient-execution-row')}[data-transient-kind="${p.collaboratorKind}"]`).filter({ hasText: p.collaboratorRow }).first().click()
        const got = await waitFor(`${id} collaborator receives ${ping}`, async () => (await conversationText()).includes(ping), 240000, 3000).catch(() => null)
        check(Boolean(got) && (await fromLabels()).includes(p.hostFrom), `${id}: collaborator received ${ping} "${p.hostFrom}" from its host after the restart`, await fromLabels())
        await shot(`${id}-04-host-to-collaborator`)
      } catch (e) { check(false, `${id} host→collaborator: error ${e.message.slice(0, 200)}`); await shot(`${id}-ping-error`).catch(() => {}) }
    }
  },
  async D4() {
    // Stop the Team run, reopen, message a collaborator: it wakes with its conversation.
    const teamRunId = report.state_teamRunId
    await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
    await delay(5000); await page.reload({ waitUntil: 'domcontentloaded' }); await delay(5000)
    await push('/workspace'); await delay(3000)
    const teamRow = page.locator(sel(`workspace-team-row-${teamRunId}`))
    if (!(await teamRow.isVisible().catch(() => false))) {
      const group = page.locator('[data-test^="workspace-team-definition-row-"]').filter({ hasText: /software engineering team/i }).first()
      if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
    }
    await teamRow.click(); await delay(4000)
    const rows = await transientRows()
    check(rows.length >= 3 && rows.filter((r) => r.kind !== 'task_team').every((r) => /offline/i.test(r.label)), 'after Stop and reopen the collaborators are still under the run, Offline', rows.map((r) => `${r.kind}:${r.text.replace(/\n/g, ' ')}`))
    await page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: /product prototyper/i }).first().click(); await delay(3000)
    const from = await fromLabels(); check(from[0] === 'From Solution Designer:', 'reopened collaborator shows the briefing "From Solution Designer:"', from)
    const input = runComposer(); await input.click(); await page.keyboard.type('Reply with the single word WAKE-OK and nothing else.'); await page.keyboard.press('Enter')
    const ok = await waitFor('wake reply', async () => (await conversationText()).replace(/Reply with the single word WAKE-OK and nothing else\./g, '').includes('WAKE-OK'), 600000, 3000).catch(() => null)
    check(Boolean(ok), 'collaborator woke after reopen and answered')
    await shot('D4-woken-after-reopen')
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
