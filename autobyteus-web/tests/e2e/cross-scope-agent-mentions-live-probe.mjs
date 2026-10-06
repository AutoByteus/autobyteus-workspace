#!/usr/bin/env node
// Live probe for cross-scope-agent-mentions (SR-008/SR-010): `@` in a live run adds one collaborator
// instance (Agent or Agent Team) to the current run when the user sends (Offline until its first message);
// the focused agent briefs it with `send_message_to`; every agent-to-agent message shows "From <Sender>:"
// live and on replay (RD-004). Covers standalone Agent, Team and Org runs, the product-wide task rows,
// the add-failure notice with a real failure (F01), the Agent-root lifecycle (Stop → reopen, server
// restart, host crash → history cleanup), old traces and old-data reopen.
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → a real
// runtime (default Claude Agent SDK, model `haiku`). Everything runs in an owned temp data root on
// free ports with a sanitized environment, so a running desktop app or `~/.autobyteus` is never touched.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome, a logged-in runtime CLI.
// Usage: pnpm test:e2e:cross-scope-agent-mentions [--runtime claude_agent_sdk] [--model haiku]
//        [--output-dir test-results/cross-scope-agent-mentions] [--cases A01,A02] [--keep]
// Host-crash cases L01/L02: pnpm test:e2e:cross-scope-agent-mentions --runtime antigravity_cli --cases L01,L02
// (they only kill runtime processes under this probe's own backend).
// Cases run in order and share state (A01 creates the standalone run used by A02–A04; T01 the Team run
// used by T02; O01 the Org run). `--cases` adds the producers a selected case needs. F01 needs LM Studio
// on 127.0.0.1:1234 (AutoByteus runtime) and reports not-applicable otherwise.
import { spawn, execFileSync } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const rootDir = path.resolve(webDir, '..')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const runtime = arg('runtime', 'claude_agent_sdk')
const preferredModel = arg('model', runtime === 'claude_agent_sdk' ? 'haiku' : null)
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/cross-scope-agent-mentions'))
const keep = process.argv.includes('--keep')
const PRODUCER = { agentRun: 'A01', teamRun: 'T01', orgRun: 'O01' }
const NEEDS = { A02: ['agentRun'], A03: ['agentRun'], A04: ['agentRun'], A05: ['agentRun'], T02: ['teamRun'], O02: ['orgRun'] }
const withPrerequisites = (ids) => {
  const all = new Set(ids)
  for (const id of ids) for (const need of NEEDS[id] ?? []) all.add(PRODUCER[need])
  return [...all]
}
const onlyCases = arg('cases', null) ? withPrerequisites(arg('cases', null).split(',')) : null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))

const evidence = { startedAt: new Date().toISOString(), runtime, cases: {}, processes: [], cleanup: [], observations: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const note = (text, details) => { evidence.observations.push({ text, details: details ?? null }); console.log(`  · ${text}`) }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 500) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { last = await fn(); if (last) return last } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}

const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`), { flags: 'a' })
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log)
  owned.push(child); evidence.processes.push({ label, pid: child.pid })
  return child
}
const stopOwned = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  return exited ? 'SIGTERM' : 'SIGKILL'
}

let ownedRoot, dataRoot, backend, frontend, browser, backendPort, frontendPort, backendUrl, frontUrl, dbUrl
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const startBackend = async (label) => {
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
  const child = spawnOwned(label, process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor(`${label} health`, async () => { assert(child.exitCode === null, `${label} exited`); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  return child
}
const restartBackend = async (label) => {
  evidence.cleanup.push({ pid: backend.pid, stop: await stopOwned(backend) })
  backend = await startBackend(label)
}

// ---------------------------------------------------------------------------------------------
// Fixtures: shared definitions created through the product's GraphQL API.
// How a runtime's model reaches the AutoByteus Agent Tools (pre-existing runtime tool indirection).
const TOOL_HINT = {
  antigravity_cli: ' AutoByteus tools such as send_message_to, delegate_task and get_handoff_rules are invoked with call_mcp_tool, ServerName autobyteus_agent_tools and the tool name as ToolName.',
  grok_build: ' AutoByteus tools such as send_message_to, delegate_task and get_handoff_rules are tools of the MCP server autobyteus_agent_tools: find them with search_tool and call them with use_tool.',
}[runtime] ?? ''
// SR-010: the focused agent briefs a mentioned collaborator with send_message_to by address.
const HOST_RULE = 'When the user message ends with a "[Mentioned collaborators]" section, call send_message_to once for each '
  + 'listed collaborator, using the address given there as recipient_address and the user request as the content; '
  + 'ask it to report back to you with send_message_to. After the tool calls return, tell the user in one short sentence. '
  + 'Otherwise reply in one short sentence. Never call get_handoff_rules or delegate_task.' + TOOL_HINT
const REPORT_RULE = 'When another agent messages you, do what it asks in one short sentence, then call send_message_to exactly once '
  + 'with target_agent_run_id set to the sender id given in that message and your one-sentence result as content. '
  + 'When the user talks to you directly, just reply in one short sentence without tools.' + TOOL_HINT
const ids = {}
const createAgent = async (key, name, description, instructions) => {
  const r = await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, description, instructions, toolNames: [] } })
  ids[key] = r.createAgentDefinition.id
}
const seed = async () => {
  await createAgent('research', 'Research Assistant', 'Looks things up and summarizes them.', `You are a research assistant. ${HOST_RULE}`)
  await createAgent('reviewer', 'Code Reviewer', 'Reviews text and code.', `You review what you are given. ${REPORT_RULE}`)
  await createAgent('researcher', 'Researcher', 'Team researcher.', `You are the team researcher. ${HOST_RULE}`)
  await createAgent('writer', 'Writer', 'Team writer.', 'You write. Reply in one short sentence.')
  await createAgent('analyst', 'Analyst', 'Org analyst.', `You are the Org analyst. ${HOST_RULE}`)
  await createAgent('prototyper', 'Product Prototyper', 'Builds UI prototypes.',
    'You coordinate the product team. When another agent gives you a task: first call get_handoff_rules and follow the handoff '
    + '(send_message_to the recipient_address it gives you); after your teammate answers, report the result to the agent that gave you '
    + 'the task with send_message_to and its sender id. Keep every message to one short sentence. When the user talks to you directly, '
    + 'reply in one short sentence without tools.' + TOOL_HINT)
  await createAgent('bootstrapper', 'Prototype Bootstrapper', 'Sets up prototype repositories.',
    'If a teammate messages you, answer it with send_message_to (the sender id given in the message) in one short sentence. '
    + 'When the user talks to you directly, reply in one short sentence without tools.' + TOOL_HINT)
  const team = async (key, name, description, coordinator, nodes, handoffs = []) => {
    const r = await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
      name, description, instructions: 'Work together on the request.', coordinatorMemberName: coordinator,
      nodes: nodes.map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })), handoffs,
    } })
    ids[key] = r.createAgentTeamDefinition.id
  }
  await team('productTeam', 'Product Team', 'Designs and prototypes product UI.', 'product_prototyper',
    [['product_prototyper', ids.prototyper], ['prototype_bootstrapper', ids.bootstrapper]],
    [{ from: '/product_prototyper', to: '/prototype_bootstrapper', rules: ['Before reporting back, ask the bootstrapper to confirm the repository is ready.'] }])
  await team('reviewTeam', 'Review Team', 'Researches and writes.', 'researcher', [['researcher', ids.researcher], ['writer', ids.writer]])
  const org = await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
    name: 'Launch Org', description: 'Launch planning.', instructions: 'Plan the launch.',
    members: [{ memberName: 'analyst', ref: ids.analyst, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'reviewers', ref: ids.reviewTeam, refType: 'AGENT_TEAM', refScope: 'SHARED' }], handoffs: [],
  } })
  ids.org = org.createAgentOrgDefinition.id
}

// ---------------------------------------------------------------------------------------------
// Page helpers (the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const runComposer = (page) => page.locator('main textarea[aria-autocomplete="list"]').last()
const menuOptions = (page) => page.locator(`${sel('run-mention-menu')} [data-test^="run-mention-option-"]`)
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('run-mention-option-', '')))
const shot = async (page, name) => { await page.screenshot({ path: path.join(outDir, `${name}.png`) }) }
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const state = { model: null, agentRunId: null, teamRunId: null, orgRunId: null, children: {} }
/**
 * Opens one runtime's model list in the open model menu and returns it. The desktop menu opens runtime flyouts on
 * hover, and clicking a runtime row whose flyout is already open can toggle it shut; so hover, verify, and click
 * only when needed. Then enter the flyout sideways at the row's height: a diagonal pointer path would cross the
 * next runtime rows (e.g. an installed Grok Build) and open their flyouts instead. On phones the menu drills in.
 */
const openRuntimeList = async (page, runtimeKind) => {
  const list = page.locator(sel(`chat-model-list-${runtimeKind}`))
  const row = page.locator(sel(`chat-runtime-${runtimeKind}`))
  for (let attempt = 0; attempt < 6 && !(await list.isVisible().catch(() => false)); attempt += 1) {
    await row.hover().catch(() => {}); await delay(400)
    if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await delay(700) }
  }
  await list.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const rowBox = await row.boundingBox({ timeout: 1000 }).catch(() => null)
  const listBox = await list.boundingBox({ timeout: 1000 }).catch(() => null)
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 })
  return list
}
const pickModel = async (page) => {
  await page.locator(sel('chat-model-trigger')).click()
  const list = await openRuntimeList(page, runtime)
  const models = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = preferredModel && models.includes(preferredModel) ? preferredModel : models[0]
  await list.locator(sel(`chat-model-option-${chosen}`)).click()
  state.model = chosen
}
const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(800)
}
// run-settings-ui-unification: New chat's target is chosen in the heading switcher; `@` only mentions collaborators.
const switchTarget = async (page, query, id) => {
  await page.locator(sel('run-target-switcher-trigger')).click()
  await page.locator(sel('run-target-switcher-search')).fill(query)
  await page.locator(sel(`run-target-switcher-option-${id}`)).click()
  await page.locator(sel('run-target-switcher-menu')).waitFor({ state: 'detached', timeout: 30000 })
}
const openMenu = async (page, query = '') => {
  const input = runComposer(page)
  await input.click(); await input.fill(''); await page.keyboard.type(`@${query}`)
  await page.locator(sel('run-mention-menu')).waitFor({ timeout: 30000 })
  await waitFor('menu settled', async () => {
    const empty = await page.locator(sel('run-mention-menu-empty')).isVisible().catch(() => false)
    return empty || (await menuOptions(page)).length > 0
  }, 30000, 200)
  await delay(500)
}
const choose = async (page, query, id) => {
  await page.keyboard.type(query)
  await page.locator(sel(`run-mention-option-${id}`)).waitFor({ timeout: 30000 })
  await delay(300)
  const highlighted = await page.locator(`${sel('run-mention-menu')} [aria-selected="true"]`).getAttribute('data-test')
  if (highlighted !== `run-mention-option-${id}`) await page.locator(sel(`run-mention-option-${id}`)).click()
  else await page.keyboard.press('Enter')
}
const toolCards = (page, root = 'main') => page.locator(`${root} .my-2 > .rounded-lg`).evaluateAll((cards) => cards.map((card) => ({
  text: card.innerText.slice(0, 160),
  error: Boolean(card.querySelector('.text-red-500')),
  success: Boolean(card.querySelector('.text-green-500')),
  classes: card.className,
})))
/** The focused agent's header status reads Idle (the run view's own status badge). */
/** The focused agent's status badge in the center view's header bar (agent and Team/Org views). */
const headerStatusIs = (page, statuses) => page.evaluate((wanted) => {
  const main = document.querySelector('main')
  if (!main) return false
  const top = main.getBoundingClientRect().top
  return [...main.querySelectorAll('*')].some((node) => node.children.length === 0
    && wanted.includes(node.textContent.trim()) && node.getBoundingClientRect().top - top < 60)
}, statuses)
const waitHostIdle = (page, timeout = 300000) => waitFor('focused agent idle', () => headerStatusIs(page, ['Idle']), timeout, 1000)
/** Not working on a turn: Idle, or Offline for a stopped agent that a send will wake. */
const waitNotBusy = (page, timeout = 300000) => waitFor('focused agent not busy', () => headerStatusIs(page, ['Idle', 'Offline']), timeout, 1000)
const agentRootView = async (runId) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId })).agentRunCollaboration?.root_agent ?? null
const agentRunActive = async (runId) => {
  const r = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { agentDefinitions { runs { runId isActive status hasCollaboration } } } }')
  return r.listWorkspaceRunHistory.flatMap((w) => w.agentDefinitions).flatMap((a) => a.runs).find((run) => run.runId === runId)?.isActive ?? null
}
const teamTree = async (teamRunId) => (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId })).getTeamRunResumeConfig.executionTree
/** Expands the workspace folder rows so run groups are visible after a fresh load. */
const expandWorkspaces = async (page) => {
  const folders = page.getByText('Temp Workspace', { exact: true })
  for (let i = 0; i < await folders.count(); i += 1) {
    const folder = folders.nth(i)
    const row = folder.locator('xpath=ancestor::*[@aria-expanded][1]')
    if (await row.count() && await row.getAttribute('aria-expanded') === 'false') { await folder.click(); await delay(500) }
  }
}
const openOrgGroup = async (page) => {
  const group = page.locator(sel(`agent-org-definition-${ids.org}`))
  if (!(await group.isVisible().catch(() => false))) { await expandWorkspaces(page); if (!(await group.isVisible().catch(() => false))) await page.getByText('Temp Workspace', { exact: true }).first().click() }
  await group.waitFor({ timeout: 60000 })
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
}
const findAgentRunRow = async (page, runId) => {
  const row = page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`)
  if (!(await row.isVisible().catch(() => false))) {
    const agentRow = page.locator(`${sel('workspace-agent-row')}[data-agent-definition-id="${ids.research}"]`).first()
    if (await agentRow.isVisible().catch(() => false) && await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click()
  }
  await row.first().waitFor({ timeout: 60000 })
  return row.first()
}
const taskRowsUnder = (page, runId) => page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"] ~ ${sel('workspace-agent-run-task-tree')} ${sel('workspace-team-transient-execution-row')}`)
const rowFacts = (locator) => locator.evaluateAll((els) => els.map((e) => ({
  kind: e.getAttribute('data-transient-kind'), label: e.getAttribute('aria-label'), text: e.innerText.trim(),
  avatar: Boolean(e.querySelector('[data-test="workspace-task-agent-avatar"]')),
  dot: Boolean(e.querySelector('[data-test="workspace-transient-status-dot"]')),
  startedByVisible: /Started by/i.test(e.innerText),
})))
const rightTabs = (page) => page.locator(`${sel('right-side-tab-list')} [role="tab"]`).evaluateAll((els) => els.map((e) => e.innerText.trim()))
const clickRightTab = async (page, label) => {
  const tab = page.locator(`${sel('right-side-tab-list')} [role="tab"]`).filter({ hasText: label }).first()
  await tab.click(); await delay(800)
}
const messageRows = (page) => page.locator(sel('team-communication-message-row')).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
const conversationText = (page) => page.locator('main').first().innerText()
const sendInComposer = async (page, text) => {
  // The composer does not send while the focused agent is still working.
  await waitNotBusy(page)
  const input = runComposer(page)
  await input.click()
  await page.keyboard.type(text)
  await page.keyboard.press('Enter')
}
const waitMessageFrom = (runId, childRunId, label) => waitFor(label, async () => {
  const view = await agentRootView(runId)
  return view?.communication_messages.messages.find((m) => m.senderAgentRunId === childRunId) ?? null
}, 300000, 1500)

// SR-010 helpers ------------------------------------------------------------------------------
/** "From <Sender>:" labels of agent-to-agent messages in the center conversation (RD-004). */
const fromLabels = (page) => page.locator('main').first().locator('[data-testid="inter-agent-inline"]')
  .evaluateAll((els) => els.map((e) => (e.innerText.match(/From [^:]+:/) ?? [''])[0]))
const placeholderOf = (page) => runComposer(page).getAttribute('placeholder')
const isOffline = (row) => /\boffline\b/i.test(row.label ?? '')
const collaboratorsOf = (view) => view?.execution_tree?.collaborators ?? []
const waitCollaborators = (runId, count, label) => waitFor(label, async () => {
  const view = await agentRootView(runId)
  return collaboratorsOf(view).length >= count ? view : null
}, 120000, 500)
const teamCollaborators = async (teamRunId) => { const t = await teamTree(teamRunId); const root = t.rootTeam ?? t.root_team; return root?.collaborators ?? [] }
/** Polls the tree rows right after a send and returns the first observation that has the expected rows. */
const firstRowsSeen = async (locator, predicate, timeout = 30000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const rows = await rowFacts(locator).catch(() => [])
    if (predicate(rows)) return { rows, ms: Date.now() - start }
    await delay(150)
  }
  throw new Error('Timed out waiting for collaborator rows after send')
}
const ensureModel = async () => {
  if (state.model) return state.model
  const r = await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: runtime })
  const models = r.providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
  state.model = preferredModel && models.includes(preferredModel) ? preferredModel : models[0]
  return state.model
}
const mentionAndSend = async (page, prefix, query, id, rest) => {
  await waitNotBusy(page)
  const input = runComposer(page); await input.fill('')
  await page.keyboard.type(prefix)
  await choose(page, query, id)
  await page.keyboard.type(rest)
  await page.keyboard.press('Enter')
}

// ---------------------------------------------------------------------------------------------
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('A01', 'UXJ-005 standalone run: menu (VIS-011/002/014, a11y), inline selected mentions; send adds the collaborator Offline at once; send_message_to briefing; "From" report; Team tab briefing + report rows (VIS-012); collaborator view (VIS-013, F-04); direct chat; run-row return; collaborator Team opened once with DI-001 handoff; exclusion', async (page) => {
  const r = {}
  await newChat(page)
  await pickModel(page)
  await switchTarget(page, 'Research', ids.research)
  const chatInput = page.locator(`${sel('chat-composer')} textarea`).first()
  await chatInput.click()
  await page.keyboard.type('Say hello in one short sentence.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  state.agentRunId = r.runId = new URL(page.url()).searchParams.get('id')
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await waitHostIdle(page)
  assert(collaboratorsOf(await agentRootView(state.agentRunId)).length === 0, 'collaborators before any mention')
  r.packageBeforeMention = existsSync(path.join(dataRoot, 'memory', 'agents', state.agentRunId, 'collaboration', 'collaboration_tree.json'))
  assert(!r.packageBeforeMention, 'Agent-root package written before any mention')

  // VIS-011: outside-run shared Agents, then Teams; own agent, Daily Assistant and Orgs not offered.
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(!r.options.includes(ids.research), 'host agent offered', r.options)
  assert(!r.options.includes('autobyteus-daily-assistant') && !r.options.includes(ids.org), 'Daily Assistant or Org offered', r.options)
  assert(r.options.includes(ids.reviewer) && r.options.includes(ids.productTeam) && r.options.indexOf(ids.productTeam) > r.options.indexOf(ids.reviewer), 'candidate order wrong', r.options)
  r.menuText = await page.locator(sel('run-mention-menu')).innerText()
  assert(/Bring into this run/.test(r.menuText) && /Agents/.test(r.menuText) && /Agent teams/.test(r.menuText), 'menu header/groups missing', r.menuText)
  r.footer = await page.locator(sel('run-mention-menu-footer')).innerText()
  assert(/Research Assistant gets your message and brings them into this run/i.test(r.footer), 'footer text', r.footer)
  const input = runComposer(page)
  r.aria = await input.evaluate((e) => ({ role: e.getAttribute('role'), expanded: e.getAttribute('aria-expanded'), controls: e.getAttribute('aria-controls'), active: e.getAttribute('aria-activedescendant') }))
  assert(r.aria.role === 'combobox' && r.aria.expanded === 'true' && r.aria.controls && r.aria.active, 'combobox attributes', r.aria)
  r.geometry = await page.evaluate(() => {
    const m = document.querySelector('[data-test="run-mention-menu"]').getBoundingClientRect()
    const t = [...document.querySelectorAll('main textarea[aria-autocomplete="list"]')].pop().getBoundingClientRect()
    return { menuBottom: m.bottom, textareaTop: t.top, above: m.bottom <= t.top + 1 }
  })
  assert(r.geometry.above, 'menu does not open above the composer', r.geometry)
  await page.keyboard.press('ArrowDown')
  assert((await input.getAttribute('aria-activedescendant')) !== r.aria.active, 'ArrowDown did not move the highlight')
  await shot(page, 'A01-01-agent-run-at-menu-VIS-011')
  await page.keyboard.type('zzz'); await delay(400)
  r.emptyText = await page.locator(sel('run-mention-menu-empty')).innerText()
  assert(/No agents or teams match/.test(r.emptyText) && /Agent Orgs can.t be mentioned/.test(r.emptyText), 'empty state', r.emptyText)
  await shot(page, 'A01-02-at-menu-empty-VIS-002')
  await page.keyboard.press('Enter'); await delay(300)
  assert((await input.inputValue()) === '@zzz', 'Enter with no match changed the text or sent')
  await page.keyboard.press('Escape'); await delay(300)
  assert(!(await page.locator(sel('run-mention-menu')).isVisible().catch(() => false)) && (await input.inputValue()) === '@zzz', 'Escape did not close or dropped text')

  // composer-mention-discoverability AC-002/003 supersedes historical VIS-003: native inline selection only.
  await input.fill(''); await page.keyboard.type('please ask @')
  await page.locator(sel('run-mention-menu')).waitFor()
  await choose(page, 'code', ids.reviewer)
  await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').filter({ hasText: '@Code Reviewer' }).waitFor()
  r.textAfterChoose = await input.inputValue()
  assert(r.textAfterChoose === 'please ask @Code Reviewer ', 'token not replaced by @Name', r.textAfterChoose)
  await input.evaluate((element) => { const at = element.value.indexOf('@Code Reviewer'); element.focus(); element.setSelectionRange(at + 1, at + 1) });
  await page.keyboard.press('Backspace'); await delay(300)
  r.textAfterRemove = await input.inputValue()
  assert(!(await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').count()) && r.textAfterRemove.trim() === 'please ask Code Reviewer', 'native @ deletion retains words and deactivates selection', r.textAfterRemove)
  await input.fill(''); await page.keyboard.type('please ask @')
  await choose(page, 'code', ids.reviewer)
  await page.keyboard.type('to review the phrase "hello world" and report back.')
  await shot(page, 'A01-03-composer-inline-AC002')

  // TR-006: send → the collaborator is added at once, Offline, before the briefing.
  await page.keyboard.press('Enter')
  const seen = await firstRowsSeen(taskRowsUnder(page, state.agentRunId), (rows) => rows.some((row) => /code reviewer/i.test(row.text)))
  r.firstSeen = seen
  assert(seen.rows.every(isOffline), 'collaborator row not Offline when it first appears (VIS-015)', seen)
  await shot(page, 'A01-04-collaborator-offline-on-send-VIS-015')
  const added = await waitCollaborators(state.agentRunId, 1, 'collaborator entry')
  const entry = collaboratorsOf(added)[0]
  state.children.reviewer = entry.agentRunId
  r.entry = { address: entry.address, agentRunId: entry.agentRunId, launch: entry.launchConfiguration }
  assert(entry.launchConfiguration.runtimeKind === runtime && entry.launchConfiguration.llmModelIdentifier === state.model, 'collaborator did not take the root settings', { entry, chosenModel: state.model, hostConfig: (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{runtimeKind llmModelIdentifier llmConfig}}}', { id: state.agentRunId }).catch(() => null))?.getAgentRunResumeConfig?.metadataConfig ?? null })
  await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 30000 })
  assert((await input.inputValue()) === '' && !(await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').count()) && !(await page.locator(sel('agent-input-mention-chips')).count()), 'composer not cleared after an accepted send')
  // The host briefs it with send_message_to; it starts and reports back.
  await waitFor('briefing and report', async () => {
    const msgs = (await agentRootView(state.agentRunId))?.communication_messages.messages ?? []
    return msgs.some((m) => m.senderAgentRunId === state.agentRunId && m.receiverAgentRunId === entry.agentRunId)
      && msgs.some((m) => m.senderAgentRunId === entry.agentRunId && m.receiverAgentRunId === state.agentRunId)
  }, 300000, 1500)
  await waitHostIdle(page); await delay(2500)
  r.rows = await rowFacts(taskRowsUnder(page, state.agentRunId))
  assert(r.rows.length === 1 && r.rows[0].kind === 'task_agent' && r.rows[0].avatar && r.rows[0].dot && !r.rows[0].startedByVisible && !isOffline(r.rows[0]), 'collaborator row presentation after first contact (REQ-009)', r.rows)
  r.cards = await toolCards(page, RUN_VIEW)
  assert(r.cards.some((c) => /send_message_to/.test(c.text) && !c.error) && !r.cards.some((c) => /delegate_task/.test(c.text)), 'expected a send_message_to briefing card and no delegate_task', r.cards)
  r.hostFrom = await fromLabels(page)
  assert(r.hostFrom.includes('From Code Reviewer:'), 'report not shown as "From Code Reviewer:" (RD-004)', r.hostFrom)
  r.tabs = await rightTabs(page)
  assert(r.tabs.includes('Team'), 'Team tab not shown for a standalone run with a collaborator', r.tabs)
  await clickRightTab(page, 'Team')
  r.teamTabRows = await messageRows(page)
  assert(r.teamTabRows.some((t) => /to code reviewer/i.test(t)) && r.teamTabRows.some((t) => /from code reviewer/i.test(t)), 'Team tab must show the briefing row and the report row (VIS-012)', r.teamTabRows)
  await shot(page, 'A01-05-briefed-and-reported-VIS-012')

  // VIS-013 / F-04 / AC-012: the collaborator view.
  await taskRowsUnder(page, state.agentRunId).first().click(); await delay(2500)
  r.childTitle = await page.locator(sel('agent-workspace-title')).innerText()
  r.runRowHighlighted = await (await findAgentRunRow(page, state.agentRunId)).evaluate((e) => e.className.includes('bg-indigo-50'))
  r.childHeaderControls = { settings: await page.locator(sel('workspace-header-edit-config')).isVisible().catch(() => false), newRun: await page.locator(sel('workspace-header-new-run')).isVisible().catch(() => false) }
  r.childPlaceholder = await placeholderOf(page)
  r.childFrom = await fromLabels(page)
  r.childHasNotice = /Task delegator address/.test(await conversationText(page))
  assert(/code reviewer/i.test(r.childTitle) && !r.runRowHighlighted, 'collaborator open: header/run-row highlight', r)
  assert(r.childHeaderControls.settings && r.childHeaderControls.newRun, 'F-04: header ⚙/+ controls missing on the collaborator view', r.childHeaderControls)
  // composer-mention-discoverability (2026-10-02) gave the mention placeholder precedence whenever `@` is available,
  // which supersedes F-04's per-collaborator placeholder (2026-10-01); the collaborator is named in the header instead.
  assert(/^(Message code reviewer|Ask anything · @ for an agent or team)/i.test(r.childPlaceholder ?? ''), 'F-04: unexpected collaborator-view placeholder', r.childPlaceholder)
  assert(r.childFrom[0] === 'From Research Assistant:' && !r.childHasNotice, 'the collaborator conversation must start with the briefing as "From Research Assistant:" and no task notice', r)
  await shot(page, 'A01-06-collaborator-conversation-VIS-013')
  await sendInComposer(page, 'Reply with the single word CHILD-OK.')
  await replyAppears(page, 'CHILD-OK')
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(2000)
  r.backTitle = await page.locator(sel('agent-workspace-title')).innerText()
  assert(!/code reviewer/i.test(r.backTitle), 'run row did not return to the host', r.backTitle)

  // A collaborator Team: opened once with members, Offline at once; its authored handoff reaches the teammate (DI-001).
  await mentionAndSend(page, '@', 'product', ids.productTeam, ' please design a tiny settings page and report back.')
  const teamSeen = await firstRowsSeen(taskRowsUnder(page, state.agentRunId), (rows) => rows.some((row) => row.kind === 'task_team') && rows.filter((row) => /prototyp/i.test(row.text)).length >= 2)
  r.teamFirstSeen = teamSeen
  assert(teamSeen.rows.filter((row) => /prototyp/i.test(row.text)).every(isOffline), 'collaborator Team members not Offline when they first appear', teamSeen)
  assert(teamSeen.rows.some((row) => /product team/i.test(row.text)) && teamSeen.rows.some((row) => /product prototyper/i.test(row.text)), 'collaborator Team names not formatted (F-03)', teamSeen)
  const withTeam = await waitCollaborators(state.agentRunId, 2, 'team collaborator entry')
  const teamEntry = collaboratorsOf(withTeam).find((c) => c.kind === 'agent_team')
  state.children.productTeam = teamEntry
  const coordinator = teamEntry.members.find((m) => m.address === teamEntry.coordinatorAddress)
  const mate = teamEntry.members.find((m) => m.address !== teamEntry.coordinatorAddress)
  // The report is required; whether the coordinator follows its handoff first is the model's choice, so
  // DI-001 here is an observation (the live E2E asserts it with explicit instructions).
  await waitFor('collaborator Team report', async () => {
    const msgs = (await agentRootView(state.agentRunId))?.communication_messages.messages ?? []
    return msgs.some((m) => m.senderAgentRunId === coordinator.agentRunId && m.receiverAgentRunId === state.agentRunId)
  }, 420000, 2000)
  const teamMsgs = (await agentRootView(state.agentRunId))?.communication_messages.messages ?? []
  r.di001 = teamMsgs.some((m) => m.senderAgentRunId === coordinator.agentRunId && m.receiverAgentRunId === mate.agentRunId)
    ? 'coordinator messaged its teammate by its handoff' : 'coordinator reported without using its handoff (model choice)'
  note(`A01 DI-001: ${r.di001}`)
  await waitHostIdle(page); await delay(2000)
  await shot(page, 'A01-07-collaborator-team-VIS-012')

  // AC-011: everything in the run is no longer offered.
  await openMenu(page)
  r.optionsAfter = await menuOptions(page)
  assert(![ids.reviewer, ids.productTeam, ids.prototyper, ids.bootstrapper].some((id) => r.optionsAfter.includes(id)), 'in-run definitions still offered', r.optionsAfter)
  await page.keyboard.type('code-rev'); await delay(400)
  assert(await page.locator(sel('run-mention-menu-empty')).isVisible(), 'empty state not shown for an in-run definition')
  await page.keyboard.press('Escape')
  // VIS-014: small window.
  await page.setViewportSize({ width: 1024, height: 640 }); await delay(600)
  await openMenu(page)
  r.small = await page.evaluate(() => { const m = document.querySelector('[data-test="run-mention-menu"]').getBoundingClientRect(); return { top: m.top, bottom: m.bottom, vh: innerHeight } })
  assert(r.small.top >= 0 && r.small.bottom <= r.small.vh, 'menu off screen at 1024x640', r.small)
  await shot(page, 'A01-08-menu-small-window-VIS-014')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1512, height: 952 })
  return r
})

defineCase('A02', 'AC-006 / AC-016: Stop → reopen → the collaborator shows the briefing as "From Research Assistant:" (replay) and wakes with the same run ID', async (page) => {
  const r = {}
  const row = await findAgentRunRow(page, state.agentRunId)
  await row.hover()
  await page.locator(`${sel('terminate-agent-run')}[data-run-id="${state.agentRunId}"]`).click()
  await waitFor('host stopped', async () => (await agentRunActive(state.agentRunId)) === false, 60000)
  const stopped = await waitFor('stored view', async () => { const v = await agentRootView(state.agentRunId); return v && !v.is_active ? v : null }, 60000)
  r.storedRunIds = collaboratorsOf(stopped).map((c) => c.agentRunId ?? c.teamRunId)
  assert(collaboratorsOf(stopped).find((c) => c.kind === 'agent').agentRunId === state.children.reviewer, 'collaborator run ID changed after Stop', r)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await findAgentRunRow(page, state.agentRunId)
  r.rowsAfterReopen = await rowFacts(taskRowsUnder(page, state.agentRunId))
  assert(r.rowsAfterReopen.filter((x) => x.kind === 'task_agent').every(isOffline), 'collaborators not Offline after Stop', r.rowsAfterReopen)
  assert((await agentRunActive(state.agentRunId)) === false, 'viewing the stopped run restored the host')
  await taskRowsUnder(page, state.agentRunId).filter({ hasText: /code reviewer/i }).first().click(); await delay(3000)
  r.replayFrom = await fromLabels(page)
  assert(r.replayFrom[0] === 'From Research Assistant:', 'briefing not "From Research Assistant:" after reopen (AC-016)', r.replayFrom)
  await sendInComposer(page, 'Reply with the single word WAKE-OK.')
  await replyAppears(page, 'WAKE-OK')
  const view = await agentRootView(state.agentRunId)
  r.hostActiveAfterWake = await agentRunActive(state.agentRunId)
  assert(r.hostActiveAfterWake === true && view.is_active && collaboratorsOf(view).find((c) => c.kind === 'agent').agentRunId === state.children.reviewer, 'not woken with the same run ID', r)
  await shot(page, 'A02-collaborator-woken-after-stop')
  return r
})

defineCase('A03', 'AC-006 / AC-016 server restart: rows stored; the host conversation shows "From Code Reviewer:" on replay; a send to the collaborator restores the host', async (page) => {
  const r = {}
  await restartBackend('backend-restart')
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(4000)
  const row = await findAgentRunRow(page, state.agentRunId)
  r.hostActive = await agentRunActive(state.agentRunId)
  r.rows = await rowFacts(taskRowsUnder(page, state.agentRunId))
  // An open page's stream reconnecting to the restarted server makes the root command-ready (AR-001, as Team
  // streams do), so the host may already be active here; only the stored rows are required.
  assert(r.rows.length >= 1, 'after restart: stored collaborator rows expected', r)
  await row.click(); await delay(3000)
  r.hostReplayFrom = await fromLabels(page)
  assert(r.hostReplayFrom.includes('From Code Reviewer:'), 'host replay does not show "From Code Reviewer:" (AC-016)', r.hostReplayFrom)
  await taskRowsUnder(page, state.agentRunId).filter({ hasText: /code reviewer/i }).first().click(); await delay(2500)
  await sendInComposer(page, 'Reply with the single word RESTART-OK.')
  await replyAppears(page, 'RESTART-OK')
  r.hostActiveAfter = await agentRunActive(state.agentRunId)
  assert(r.hostActiveAfter === true && collaboratorsOf(await agentRootView(state.agentRunId)).find((c) => c.kind === 'agent').agentRunId === state.children.reviewer, 'not restored with the same run ID', r)
  return r
})

defineCase('A04', 'AC-016: a stored delivery without a recorded sender (an old trace) keeps the user-style presentation; the user message is unchanged', async (page) => {
  const r = {}
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: state.agentRunId })
  await waitFor('host stopped', async () => (await agentRunActive(state.agentRunId)) === false, 60000)
  const runDir = path.join(dataRoot, 'memory', 'agents', state.agentRunId)
  // Raw traces serialize the sender as `sender_id` (active file and archived segments).
  let stripped = 0
  const traceFiles = (await fs.readdir(runDir, { recursive: true })).filter((name) => /raw_traces/.test(name) && name.endsWith('.jsonl'))
  for (const name of traceFiles) {
    const file = path.join(runDir, name)
    const lines = (await fs.readFile(file, 'utf8')).split('\n').map((line) => {
      if (!line.includes('"sender_id"')) return line
      const record = JSON.parse(line); if (record.sender_id) stripped += 1; delete record.sender_id; return JSON.stringify(record)
    })
    await fs.writeFile(file, lines.join('\n'))
  }
  r.traceFiles = traceFiles
  r.strippedTraces = stripped
  assert(stripped >= 1, 'no sender-bearing trace found in the host run', r)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(3000)
  r.from = await fromLabels(page)
  const text = await conversationText(page)
  r.userStyle = /You received a message from sender name/i.test(text)
  r.userMention = await page.locator(sel('user-message-mention')).count()
  assert(!r.from.includes('From Code Reviewer:') && r.userStyle && r.userMention >= 1, 'old trace should stay user-style; user messages unchanged', r)
  await shot(page, 'A04-old-trace-user-style')
  return r
})

defineCase('A05', 'AC-006 / design AR-001: viewing a stopped run\'s collaborator (clicking it, or reloading with it selected) does not restore the host; only a send does', async (page) => {
  const r = {}
  if (await agentRunActive(state.agentRunId)) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: state.agentRunId })
  await waitFor('host stopped', async () => (await agentRunActive(state.agentRunId)) === false, 60000)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(2000)
  r.afterReloadHostSelected = await agentRunActive(state.agentRunId)
  await taskRowsUnder(page, state.agentRunId).filter({ hasText: /code reviewer/i }).first().click(); await delay(8000)
  r.afterClickingCollaborator = await agentRunActive(state.agentRunId)
  r.url = page.url()
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(12000)
  r.afterReloadWithCollaboratorSelected = await agentRunActive(state.agentRunId)
  r.rootView = (await agentRootView(state.agentRunId))?.is_active ?? null
  await shot(page, 'A05-reload-with-collaborator-selected')
  assert(r.afterReloadHostSelected === false && r.afterClickingCollaborator === false && r.afterReloadWithCollaboratorSelected === false,
    'viewing a stopped run\'s collaborator restored the host (AR-001: no stream for an inactive run; only a send restores)', r)
  return r
})

defineCase('T01', 'UXJ-001 Team run: VIS-001 menu; send adds the collaborator Team at once, opened, Offline (VIS-015, F-02, F-03); send_message_to briefing; Team tab briefing + report rows; "From Product Prototyper:" (VIS-004); DI-001 handoff; CR-003 next send with a mention (VIS-006); exclusion', async (page) => {
  const r = {}
  const findings = []
  await newChat(page)
  await pickModel(page)
  await switchTarget(page, 'review', ids.reviewTeam)
  const chatInput = page.locator(`${sel('chat-composer')} textarea`).first()
  await chatInput.click()
  await page.keyboard.type('Say hello in one short sentence.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  const history = await waitFor('team run in history', async () => {
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
    return h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === ids.reviewTeam)?.runs?.[0]
  }, 60000)
  state.teamRunId = r.teamRunId = history.teamRunId
  await waitHostIdle(page)
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(![ids.reviewTeam, ids.researcher, ids.writer, ids.org, 'autobyteus-daily-assistant'].some((id) => r.options.includes(id)), 'in-run or excluded definitions offered in the Team run', r.options)
  assert(r.options.includes(ids.productTeam) && r.options.includes(ids.reviewer) && r.options.includes(ids.research), 'outside definitions missing', r.options)
  r.footer = await page.locator(sel('run-mention-menu-footer')).innerText()
  assert(/researcher gets your message/i.test(r.footer), 'footer must name the focused researcher', r.footer)
  await shot(page, 'T01-01-team-run-at-menu-VIS-001')
  await page.keyboard.press('Escape')
  await mentionAndSend(page, 'please ask @', 'product', ids.productTeam, 'to design a tiny settings page and report back.')
  const teamRows = page.locator(sel('workspace-team-transient-execution-row'))
  const seen = await firstRowsSeen(teamRows, (rows) => rows.some((row) => row.kind === 'task_team'))
  await delay(400)
  const firstRows = await rowFacts(teamRows)
  r.firstSeen = { ...seen, afterSettle: firstRows }
  const memberRows = firstRows.filter((row) => row.kind !== 'task_team')
  if (memberRows.length < 2) findings.push('F-02: the collaborator Team did not open once with its members (VIS-004/015)')
  if (!memberRows.every(isOffline)) findings.push('VIS-015: collaborator Team members not Offline right after the send')
  if (!firstRows.some((row) => row.kind === 'task_team' && /product team/i.test(row.text))) findings.push(`F-03: collaborator Team row reads "${firstRows.find((row) => row.kind === 'task_team')?.text}"`)
  await shot(page, 'T01-02-collaborator-offline-on-send-VIS-015')
  const collaborators = await waitFor('Team-root collaborator entry', async () => { const c = await teamCollaborators(state.teamRunId); return c.length ? c : null }, 60000)
  const teamEntry = collaborators[0]
  r.teamEntry = { address: teamEntry.address, teamRunId: teamEntry.teamRunId ?? teamEntry.team_run_id, members: (teamEntry.members ?? []).map((m) => m.agentRunId ?? m.agent_run_id) }
  // The researcher briefs it; the coordinator follows its handoff (DI-001) and reports.
  await waitFor('report "From Product Prototyper:"', async () => (await fromLabels(page)).includes('From Product Prototyper:'), 420000, 2000)
  await waitHostIdle(page); await delay(2000)
  r.cards = await toolCards(page)
  if (!r.cards.some((c) => /send_message_to/.test(c.text) && !c.error) || r.cards.some((c) => /delegate_task/.test(c.text))) findings.push('briefing is not a send_message_to card')
  await clickRightTab(page, 'Team')
  r.teamTabRows = await messageRows(page)
  if (!r.teamTabRows.some((t) => /to product prototyper/i.test(t)) || !r.teamTabRows.some((t) => /from product prototyper/i.test(t))) findings.push('Team tab must show "to product prototyper" (briefing) and "from product prototyper" (report) rows (VIS-004)')
  const settled = await rowFacts(teamRows)
  r.rowsAfterReport = settled
  const bootstrapperRow = settled.find((row) => /prototype bootstrapper/i.test(row.text))
  r.di001 = bootstrapperRow && !isOffline(bootstrapperRow) ? 'teammate started (handoff reached it)' : 'teammate not started (coordinator skipped its handoff; model choice)'
  note(`T01 DI-001: ${r.di001}`)
  await shot(page, 'T01-03-collaborator-briefed-VIS-004')
  // CR-003: the next send from the same member, again with a mention.
  await mentionAndSend(page, 'also ask @', 'code', ids.reviewer, 'to review the phrase "ship it" and report back.')
  const second = await waitFor('second send outcome', async () => {
    if (/already has a pending Team message admission/.test(await conversationText(page))) return 'pending-admission-error'
    return (await rowFacts(teamRows)).some((row) => row.kind === 'task_agent' && /code reviewer/i.test(row.text)) ? 'task-agent-row' : null
  }, 120000, 1000)
  r.secondSend = second
  if (second !== 'task-agent-row') findings.push('CR-003: the next send after an @ send failed')
  else {
    await waitFor('report "From Code Reviewer:"', async () => (await fromLabels(page)).includes('From Code Reviewer:'), 300000, 2000)
    await waitHostIdle(page); await delay(2000)
    r.rowsBoth = await rowFacts(teamRows)
    const reviewerRow = r.rowsBoth.find((row) => row.kind === 'task_agent' && /code reviewer/i.test(row.text))
    if (!(reviewerRow.avatar && reviewerRow.dot && !reviewerRow.startedByVisible)) findings.push('collaborator Agent row presentation (VIS-006)')
    await shot(page, 'T01-04-collaborator-agent-and-team-VIS-006')
  }
  await openMenu(page)
  r.optionsAfter = await menuOptions(page)
  if ([ids.productTeam, ids.prototyper, ids.bootstrapper, ids.reviewer].some((id) => r.optionsAfter.includes(id))) findings.push('AC-011: in-run collaborators still offered')
  await page.keyboard.press('Escape')
  r.findings = findings
  assert(findings.length === 0, findings.join('; '), r)
  return r
})

defineCase('T02', 'UXJ-002 / VIS-005: the collaborator Team coordinator view starts with "From Researcher:" (no task notice); direct chat', async (page) => {
  const r = {}
  const memberRow = page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: /product.prototyper/i }).first()
  await memberRow.click(); await delay(3000)
  r.from = await fromLabels(page)
  r.hasNotice = /Task delegator address/.test(await conversationText(page))
  r.title = await page.locator('main h4').first().innerText().catch(() => null)
  assert(r.from[0] === 'From Researcher:' && !r.hasNotice, 'coordinator conversation must start with "From Researcher:" and no task notice', r)
  await shot(page, 'T02-01-collaborator-member-conversation-VIS-005')
  await sendInComposer(page, 'Reply with the single word MEMBER-OK.')
  await replyAppears(page, 'MEMBER-OK')
  return r
})

defineCase('O01', 'UXJ-004 Org run: VIS-008 menu; two mentions add an Agent and a Team (Offline at once); send_message_to briefings; "From" reports; Org tab briefing + report rows with formatted names (VIS-009)', async (page) => {
  const r = {}
  const workspace = path.join(dataRoot, 'temp_workspace'); await fs.mkdir(workspace, { recursive: true })
  const org = await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: ids.org, rootConfiguration: { runtimeKind: runtime, llmModelIdentifier: await ensureModel(), llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace }, agentOverrides: [], teamOverrides: [] } })
  assert(org.createAgentOrgRun.success, org.createAgentOrgRun.message)
  state.orgRunId = r.orgRunId = org.createAgentOrgRun.agentOrgRunId
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(3000)
  await openOrgGroup(page)
  await page.locator(sel(`agent-org-run-open-${state.orgRunId}`)).click(); await delay(2000)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /analyst/i }).first().click(); await delay(3000)
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(![ids.org, ids.analyst, ids.reviewTeam, ids.researcher, ids.writer].some((id) => r.options.includes(id)), 'Org, members or mounted teams offered', r.options)
  assert(r.options.includes(ids.reviewer) && r.options.includes(ids.productTeam), 'outside candidates missing', r.options)
  r.footer = await page.locator(sel('run-mention-menu-footer')).innerText()
  assert(/analyst/i.test(r.footer), 'footer does not name the focused analyst', r.footer)
  await shot(page, 'O01-01-org-run-at-menu-VIS-008')
  await page.keyboard.press('Escape')
  const input = runComposer(page); await input.fill('')
  await page.keyboard.type('please ask @')
  await choose(page, 'code', ids.reviewer)
  await page.keyboard.type('and @')
  await choose(page, 'product', ids.productTeam)
  await page.keyboard.type('to plan the launch page and report back.')
  r.inlineHighlights = await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').count()
  await page.keyboard.press('Enter')
  const taskAgentRows = page.locator('[data-test^="agent-org-task-agent-row-"]')
  await taskAgentRows.first().waitFor({ timeout: 60000 })
  r.firstAgentRows = await taskAgentRows.evaluateAll((els) => els.map((e) => ({ text: e.innerText.trim(), status: e.getAttribute('data-status') })))
  await page.locator('[data-test^="agent-org-task-team-row-"]').first().waitFor({ timeout: 60000 })
  assert(r.firstAgentRows.every((row) => row.status === 'offline'), 'Org collaborator rows not Offline right after the send', r.firstAgentRows)
  await shot(page, 'O01-02-org-collaborators-offline-on-send')
  await waitFor('reports from both collaborators', async () => {
    const labels = await fromLabels(page)
    return labels.includes('From Code Reviewer:') && labels.includes('From Product Prototyper:')
  }, 420000, 2000)
  await waitHostIdle(page); await delay(2500)
  r.agentRows = await taskAgentRows.evaluateAll((els) => els.map((e) => ({ text: e.innerText.trim(), label: e.getAttribute('aria-label'), avatar: Boolean(e.querySelector('[data-test="agent-org-task-agent-avatar"]')) })))
  const reviewerRow = r.agentRows.find((row) => /code reviewer/i.test(row.text))
  assert(reviewerRow && reviewerRow.avatar && !/Started by/i.test(reviewerRow.text), 'Org collaborator Agent row (REQ-009)', r.agentRows)
  r.cards = await toolCards(page)
  assert(r.cards.filter((c) => /send_message_to/.test(c.text) && !c.error).length >= 2 && !r.cards.some((c) => /delegate_task/.test(c.text)), 'expected send_message_to briefing cards', r.cards)
  await clickRightTab(page, 'Org')
  r.orgTabRows = await messageRows(page)
  assert(['to code reviewer', 'from code reviewer', 'to product prototyper', 'from product prototyper'].every((s) => r.orgTabRows.some((t) => t.toLowerCase().includes(s))), 'Org tab must show briefing and report rows with formatted names (VIS-009, F-03)', r.orgTabRows)
  await shot(page, 'O01-03-org-run-collaborators-VIS-009')
  return r
})

defineCase('O02', 'UXJ-004 / VIS-010: the Org collaborator Agent view starts with "From Analyst:"; direct chat', async (page) => {
  const r = {}
  await page.locator('[data-test^="agent-org-task-agent-row-"]').filter({ hasText: /code reviewer/i }).first().click(); await delay(3000)
  r.from = await fromLabels(page)
  r.hasNotice = /Task delegator address/.test(await conversationText(page))
  assert(r.from[0] === 'From Analyst:' && !r.hasNotice, 'Org collaborator conversation must start with "From Analyst:" and no task notice', r)
  await shot(page, 'O02-01-org-collaborator-conversation-VIS-010')
  await sendInComposer(page, 'Reply with the single word ORG-CHILD-OK.')
  await replyAppears(page, 'ORG-CHILD-OK')
  return r
})

defineCase('F01', 'UXJ-003 / VIS-007 / AC-008 / AC-011 with a real failure: the run\'s model becomes unavailable (LM Studio host changed in settings); a mention send is refused in standalone, Team and Org runs — notice, draft and inline highlight kept, no message, no row, still offered; the kept draft sends once the host is restored', async (page) => {
  const r = { attempts: {} }
  const lmStudioUp = await fetch('http://127.0.0.1:1234/v1/models', { signal: AbortSignal.timeout(3000) }).then((x) => x.ok).catch(() => false)
  if (!lmStudioUp) return { notApplicable: 'LM Studio is not reachable on 127.0.0.1:1234' }
  const catalog = await gql('mutation($p:String!,$r:String){ensureProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}', { p: 'LMSTUDIO', r: 'autobyteus' })
  const model = r.model = catalog.ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier).find((m) => /qwen/i.test(m) && !/embed/i.test(m))
  assert(model, 'no LM Studio chat model', catalog)
  const workspace = path.join(dataRoot, 'temp_workspace'); await fs.mkdir(workspace, { recursive: true })
  const launch = { llmModelIdentifier: model, autoExecuteTools: true, workspaceRootPath: workspace, llmConfig: null, runtimeKind: 'autobyteus' }
  const agentRun = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.research, workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: 'autobyteus' } })).createAgentRun
  assert(agentRun.success, agentRun.message)
  const teamRun = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
    teamDefinitionId: ids.reviewTeam, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: [{ memberAddress: '/researcher', agentDefinitionId: ids.researcher, ...launch }, { memberAddress: '/writer', agentDefinitionId: ids.writer, ...launch }],
  } })).createAgentTeamRun
  assert(teamRun.success, teamRun.message)
  const orgRun = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: ids.org, rootConfiguration: { runtimeKind: 'autobyteus', llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun
  assert(orgRun.success, orgRun.message)
  Object.assign(r, { agentRunId: agentRun.runId, teamRunId: teamRun.teamRunId, orgRunId: orgRun.agentOrgRunId })
  // The user points LM Studio at another host (Settings) and the catalog reloads: the runs' model is gone.
  await gql('mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}', { k: 'LMSTUDIO_HOSTS', v: 'http://127.0.0.1:9' })
  await gql('mutation($p:String!,$r:String){reloadProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}', { p: 'LMSTUDIO', r: 'autobyteus' }).catch((e) => { r.reloadError = e.message })
  const after = await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: 'autobyteus' })
  r.modelStillListed = after.providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier)).includes(model)
  assert(!r.modelStillListed, 'model still listed after the LM Studio host change', r)
  const marker = `F01-${Date.now()}`
  const attempt = async (key, rootKind, rootRunId, rowCount) => {
    const a = { before: await rowCount() }
    await mentionAndSend(page, `${marker} please ask @`, 'code', ids.reviewer, 'to check the release notes.')
    await page.locator(sel('collaborator-add-failure')).waitFor({ timeout: 60000 })
    await delay(1500)
    a.notice = await page.locator(sel('collaborator-add-failure')).innerText()
    a.alert = await page.locator(`${sel('collaborator-add-failure')}, ${sel('collaborator-add-failures')}`).evaluateAll((els) => els.map((e) => e.getAttribute('role')))
    a.draft = await runComposer(page).inputValue()
    a.highlightKept = await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').filter({ hasText: '@Code Reviewer' }).isVisible()
    a.messageSent = (await conversationText(page)).includes(marker)
    a.after = await rowCount()
    a.stillOffered = (await gql('query($k:String!,$id:String!){collaboratorMentionCandidates(rootSubjectKind:$k,rootRunId:$id){candidates{definitionId}}}', { k: rootKind, id: rootRunId }))
      .collaboratorMentionCandidates.candidates.some((c) => c.definitionId === ids.reviewer)
    r.attempts[key] = a
    await shot(page, `F01-${key}-add-failed-notice-VIS-007`)
    assert(/Couldn.t add Code Reviewer to this run/.test(a.notice) && /Nothing was added\./.test(a.notice) && a.alert.includes('alert'), `${key}: notice text/role`, a)
    assert(a.draft.includes(marker) && a.highlightKept && !a.messageSent, `${key}: draft and inline highlight must stay and nothing be sent`, a)
    assert(a.after === a.before && a.stillOffered, `${key}: a row was added or the definition is no longer offered`, a)
  }
  // Standalone run.
  await page.goto(`${frontUrl}/chat?id=${r.agentRunId}`, { waitUntil: 'domcontentloaded' })
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 }); await delay(2000)
  await attempt('agent', 'agent', r.agentRunId, async () => collaboratorsOf(await agentRootView(r.agentRunId)).length)
  await page.locator(sel('collaborator-add-failure-dismiss')).click(); await delay(400)
  assert(!(await page.locator(sel('collaborator-add-failure')).isVisible().catch(() => false)), 'notice not dismissed')
  // Team run, focused member researcher.
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(3000)
  const teamRow = page.locator(sel(`workspace-team-row-${r.teamRunId}`))
  if (!(await teamRow.isVisible().catch(() => false))) await expandWorkspaces(page)
  if (!(await teamRow.isVisible().catch(() => false))) {
    const group = page.locator(sel(`workspace-team-definition-row-${ids.reviewTeam}`)).first()
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  }
  await teamRow.click(); await delay(2500)
  await page.locator(`[data-test^="workspace-team-member-${r.teamRunId}-"]`).filter({ hasText: /researcher/i }).first().click(); await delay(2500)
  await attempt('team', 'agent_team', r.teamRunId, async () => (await teamCollaborators(r.teamRunId)).length)
  // Org run, focused analyst.
  await openOrgGroup(page)
  await page.locator(sel(`agent-org-run-open-${r.orgRunId}`)).click(); await delay(2000)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /analyst/i }).last().click(); await delay(2500)
  await attempt('org', 'agent_org', r.orgRunId, async () => page.locator('[data-test^="agent-org-task-agent-row-"]').count())
  // The user restores the host; the kept draft now sends and adds the collaborator.
  await gql('mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}', { k: 'LMSTUDIO_HOSTS', v: 'http://localhost:1234' })
  await gql('mutation($p:String!,$r:String){reloadProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}', { p: 'LMSTUDIO', r: 'autobyteus' })
  const restored = await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: 'autobyteus' })
  r.modelListedAfterRestore = restored.providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier)).includes(model)
  assert(r.modelListedAfterRestore, 'model not listed again after restoring the LM Studio host', r)
  await runComposer(page).click(); await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await page.locator('[data-test^="agent-org-task-agent-row-"]').first().waitFor({ timeout: 60000 })
  r.resentAfterRestore = await page.locator('[data-test^="agent-org-task-agent-row-"]').count()
  r.noticeClearedOnSend = !(await page.locator(sel('collaborator-add-failure')).isVisible().catch(() => false))
  assert(r.resentAfterRestore >= 1 && r.noticeClearedOnSend, 'the kept draft did not send after the host was restored', r)
  for (const [mutation, arg, id] of [['terminateAgentRun', 'agentRunId', r.agentRunId], ['terminateAgentTeamRun', 'teamRunId', r.teamRunId], ['terminateAgentOrgRun', 'agentOrgRunId', r.orgRunId]]) {
    await gql(`mutation($id:String!){${mutation}(${arg}:$id){success}}`, { id }).catch(() => {})
  }
  return r
})

// Host crash (LC-01): the host's runtime process exits on its own. Only processes under this probe's
// own backend are ever touched; the host's process is found by diffing that subtree around its first turn.
const ownedRuntimePids = () => {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' }).split('\n').map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }))
  const tree = new Set([backend.pid]); let grew = true
  while (grew) { grew = false; for (const row of rows) if (tree.has(row.ppid) && !tree.has(row.pid)) { tree.add(row.pid); grew = true } }
  return new Set(rows.filter((row) => tree.has(row.pid) && row.pid !== backend.pid && /(^|\/)(claude|codex|agy|grok)(\s|$)/.test(row.command)).map((row) => row.pid))
}
// A host "crash" leaves the run inactive only where run liveness follows the runtime process (AGY:
// isActive = active && processAlive). Claude resumes a dead CLI lazily and Codex shares one app server.
const CRASH_RUNTIMES = new Set(['antigravity_cli'])
const crashNotApplicable = () => (CRASH_RUNTIMES.has(runtime) ? null
  : { notApplicable: `host-crash cases need a process-bound runtime; run with --runtime antigravity_cli --cases L01,L02 (current: ${runtime})` })
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
const newPids = (before, after) => [...after].filter((pid) => !before.has(pid))
const startStandaloneRun = async (page, prompt) => {
  await newChat(page)
  await pickModel(page)
  await switchTarget(page, 'Research', ids.research)
  const chatInput = page.locator(`${sel('chat-composer')} textarea`).first()
  await chatInput.click()
  await page.keyboard.type(prompt)
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  const runId = new URL(page.url()).searchParams.get('id')
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  await waitHostIdle(page)
  return runId
}
const replyAppears = (page, marker) => page.waitForFunction((m) => new RegExp(m).test([...document.querySelectorAll('main *')].filter((n) => n.children.length === 0).map((n) => n.textContent).join(' ').replace(new RegExp(`Reply with the single word ${m}\\.`, 'g'), '')), marker, { timeout: 240000 })
const killHost = async (pids, runId) => {
  for (const pid of pids) { try { process.kill(pid, 'SIGKILL') } catch {} }
  await waitFor('host runtime inactive after its process died', async () => (await agentRunActive(runId)) === false, 120000, 1000)
}
const clickRowAction = async (page, runId, title) => {
  const row = await findAgentRunRow(page, runId)
  await row.hover()
  await row.locator(`button[title="${title}"]`).click()
}

defineCase('L01', 'Host crash keeps the root and its child; the child still answers; the host wakes on a send; after another crash Delete ends the root first and removes the run', async (page) => {
  const r = {}
  const skip = crashNotApplicable(); if (skip) return skip
  const before = ownedRuntimePids()
  const runId = r.runId = await startStandaloneRun(page, 'Say hello in one short sentence.')
  let hostPids = newPids(before, ownedRuntimePids())
  r.hostPids = hostPids
  assert(hostPids.length >= 1, 'host runtime process not found under the owned backend', r)
  const beforeChild = ownedRuntimePids()
  const input = runComposer(page); await input.fill('')
  await page.keyboard.type('please ask @')
  await choose(page, 'code', ids.reviewer)
  await page.keyboard.type('to review the phrase "ok" and report back.')
  await page.keyboard.press('Enter')
  const view = await waitCollaborators(runId, 1, 'collaborator added')
  const childRunId = r.childRunId = collaboratorsOf(view)[0].agentRunId
  await waitMessageFrom(runId, childRunId, 'child report')
  await waitHostIdle(page)
  const childPids = r.childPids = newPids(beforeChild, ownedRuntimePids())
  // Crash the host.
  await killHost(hostPids, runId)
  const pidsAfterCrash = ownedRuntimePids()
  const afterCrash = await agentRootView(runId)
  r.rootActiveAfterCrash = afterCrash?.is_active
  r.childStatusAfterCrash = afterCrash?.agent_statuses.find((s) => s.agent_run_id === childRunId)?.status
  assert(r.rootActiveAfterCrash === true && r.childStatusAfterCrash && r.childStatusAfterCrash !== 'offline', 'root/child did not survive the host crash', r)
  assert(childPids.every(alive), 'child runtime process died with the host', r)
  // The child still answers while the host is down.
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await findAgentRunRow(page, runId)
  await taskRowsUnder(page, runId).filter({ hasText: /code reviewer/i }).first().click(); await delay(2500)
  await sendInComposer(page, 'Reply with the single word CRASH-CHILD-OK.')
  await replyAppears(page, 'CRASH-CHILD-OK')
  // A send to a child makes the root command-ready, which restores the crashed host (AR-001);
  // the host then answers its own next send.
  r.hostActiveAfterChildSend = await agentRunActive(runId)
  await (await findAgentRunRow(page, runId)).click(); await delay(2000)
  await sendInComposer(page, 'Reply with the single word WAKE-HOST-OK.')
  await replyAppears(page, 'WAKE-HOST-OK')
  r.hostActiveAfterWake = await agentRunActive(runId)
  assert(r.hostActiveAfterWake === true, 'host not woken by a send after its crash', r)
  hostPids = newPids(pidsAfterCrash, ownedRuntimePids()).filter((pid) => !childPids.includes(pid))
  r.wokenHostPids = hostPids
  assert(hostPids.length >= 1, 'woken host process not found', r)
  await shot(page, 'L01-01-after-crash-and-wake')
  // Crash again, then Delete from the history row: the root is ended first, then the run is removed.
  await waitHostIdle(page)
  await killHost(hostPids, runId)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  r.rootActiveBeforeDelete = (await agentRootView(runId))?.is_active
  await clickRowAction(page, runId, 'Delete run permanently')
  const confirm = page.locator(sel('delete-confirmation-confirm')).or(page.getByRole('button', { name: 'Delete', exact: true })).first()
  await confirm.waitFor({ timeout: 15000 }); await confirm.click()
  await waitFor('run row removed', async () => !(await page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`).count()), 60000)
  r.viewAfterDelete = await agentRootView(runId)
  r.runDirAfterDelete = existsSync(path.join(dataRoot, 'memory', 'agents', runId))
  await waitFor('child process stopped', async () => childPids.every((pid) => !alive(pid)), 60000).catch(() => {})
  r.childAliveAfterDelete = childPids.some(alive)
  assert(r.rootActiveBeforeDelete === true && r.viewAfterDelete === null && !r.runDirAfterDelete && !r.childAliveAfterDelete, 'Delete after crash did not end the root first and remove the run', r)
  return r
})

defineCase('L02', 'Host crash without collaborators: Archive succeeds and the lingering root is ended', async (page) => {
  const r = {}
  const skip = crashNotApplicable(); if (skip) return skip
  const before = ownedRuntimePids()
  const runId = r.runId = await startStandaloneRun(page, 'Say hello in one short sentence.')
  const hostPids = r.hostPids = newPids(before, ownedRuntimePids())
  assert(hostPids.length >= 1, 'host runtime process not found', r)
  r.rootBeforeCrash = Boolean(await agentRootView(runId))
  await killHost(hostPids, runId)
  r.rootAfterCrash = Boolean(await agentRootView(runId))
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await clickRowAction(page, runId, 'Archive run')
  await waitFor('archived', async () => {
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { agentDefinitions { runs { runId archivedAt } } } }')
    const run = h.listWorkspaceRunHistory.flatMap((w) => w.agentDefinitions).flatMap((a) => a.runs).find((x) => x.runId === runId)
    return !run || run.archivedAt
  }, 60000)
  r.rootAfterArchive = await agentRootView(runId)
  assert(r.rootBeforeCrash && r.rootAfterCrash && r.rootAfterArchive === null, 'Archive after crash did not end the lingering root', r)
  return r
})

defineCase('P01', 'Old data: Team and Org runs whose trees have no `collaborators` reopen, continue and offer `@`', async (page) => {
  const r = {}
  // Team run through the New chat quick path, then stopped.
  await newChat(page); await pickModel(page)
  await switchTarget(page, 'review', ids.reviewTeam)
  const chatInput = page.locator(`${sel('chat-composer')} textarea`).first()
  await chatInput.click()
  await page.keyboard.type('Say hi in one short sentence.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  const known = new Set([state.teamRunId])
  const teamRun = await waitFor('new team run', async () => {
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
    return h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).filter((t) => t.teamDefinitionId === ids.reviewTeam).flatMap((t) => t.runs).find((x) => !known.has(x.teamRunId))
  }, 60000)
  const teamRunId = r.teamRunId = teamRun.teamRunId
  await delay(15000)
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
  const teamTreePath = path.join(dataRoot, 'memory', 'agent_teams', teamRunId, 'team_run_execution_tree.json')
  const teamJson = JSON.parse(await fs.readFile(teamTreePath, 'utf8'))
  const teamRoot = teamJson.rootTeam ?? teamJson.root_team
  r.teamHadCollaboratorsKey = Object.prototype.hasOwnProperty.call(teamRoot, 'collaborators')
  delete teamRoot.collaborators
  await fs.writeFile(teamTreePath, JSON.stringify(teamJson, null, 2))
  // Org run, stopped, same rewrite.
  const workspace = path.join(dataRoot, 'temp_workspace'); await fs.mkdir(workspace, { recursive: true })
  const org = await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: ids.org, rootConfiguration: { runtimeKind: runtime, llmModelIdentifier: state.model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace }, agentOverrides: [], teamOverrides: [] } })
  const orgRunId = r.orgRunId = org.createAgentOrgRun.agentOrgRunId
  await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}', { id: orgRunId })
  const orgTreePath = path.join(dataRoot, 'memory', 'agent_orgs', orgRunId, 'agent_org_run_execution_tree.json')
  const orgJson = JSON.parse(await fs.readFile(orgTreePath, 'utf8'))
  r.orgHadCollaboratorsKey = Object.prototype.hasOwnProperty.call(orgJson.rootOrg, 'collaborators')
  delete orgJson.rootOrg.collaborators
  await fs.writeFile(orgTreePath, JSON.stringify(orgJson, null, 2))
  // Reopen the old-shape Team run from the tree, focus a member, check `@`, and continue.
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(3000)
  const teamRow = page.locator(sel(`workspace-team-row-${teamRunId}`))
  if (!(await teamRow.isVisible().catch(() => false))) await expandWorkspaces(page)
  if (!(await teamRow.isVisible().catch(() => false))) {
    const group = page.locator(sel(`workspace-team-definition-row-${ids.reviewTeam}`)).first()
    if (await group.isVisible().catch(() => false) && await group.getAttribute('aria-expanded') !== 'true') await group.click()
  }
  await teamRow.click(); await delay(3000)
  await page.locator(`[data-test^="workspace-team-member-${teamRunId}-"]`).filter({ hasText: /researcher/i }).first().click(); await delay(2500)
  await openMenu(page)
  r.teamMenu = await menuOptions(page)
  assert(r.teamMenu.includes(ids.reviewer) && !r.teamMenu.includes(ids.researcher), 'menu in the old-shape Team run', r.teamMenu)
  await page.keyboard.press('Escape')
  const input = runComposer(page); await input.fill('')
  await sendInComposer(page, 'Reply with the single word OLD-TEAM-OK.')
  await replyAppears(page, 'OLD-TEAM-OK')
  const rewritten = JSON.parse(await fs.readFile(teamTreePath, 'utf8'))
  r.teamCollaboratorsAfterContinue = (rewritten.rootTeam ?? rewritten.root_team).collaborators
  // Reopen the old-shape Org run and continue with its analyst.
  await openOrgGroup(page)
  await page.locator(sel(`agent-org-run-open-${orgRunId}`)).click(); await delay(2000)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /analyst/i }).last().click(); await delay(2500)
  await sendInComposer(page, 'Reply with the single word OLD-ORG-OK.')
  await replyAppears(page, 'OLD-ORG-OK')
  const orgAfter = JSON.parse(await fs.readFile(orgTreePath, 'utf8'))
  r.orgCollaboratorsAfterContinue = orgAfter.rootOrg.collaborators
  assert(r.teamHadCollaboratorsKey && r.orgHadCollaboratorsKey, 'new-build writer did not emit collaborators', r)
  return r
})

defineCase('N01', 'New chat: the heading switcher picks the target; `@` mentions collaborators only, never the target', async (page) => {
  await newChat(page)
  await page.locator(sel('run-target-switcher-trigger')).click()
  await page.locator(sel('run-target-switcher-menu')).waitFor({ timeout: 30000 })
  const targets = await page.locator('[data-test^="run-target-switcher-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('run-target-switcher-option-', '')))
  assert(targets.includes(ids.research) && targets.includes(ids.reviewTeam), 'New chat targets', targets)
  await page.keyboard.press('Escape')
  await switchTarget(page, 'Research', ids.research)
  await openMenu(page)
  const mentions = await menuOptions(page)
  assert(!(await page.locator(sel('chat-target-menu')).count()), 'the old `@` target picker is gone')
  assert(!mentions.includes(ids.research), 'the target is offered as its own mention', mentions)
  assert(mentions.includes(ids.reviewTeam), 'a shared Team is a mention candidate', mentions)
  await page.keyboard.press('Escape')
  return { targets, mentions }
})

// run-settings-ui-unification AF-009 / REQ-012: the first message of a new run keeps its `@` mentions, and the
// server admits them. The client list mirrors the server's CollaboratorCandidatePolicy (design AR-001).
const BUILT_IN_AGENT_IDS = ['autobyteus-daily-assistant', 'autobyteus-project-task-manager', 'autobyteus-retrospective-skill-improver']
const newChatInput = (page) => page.locator(`${sel('chat-composer')} textarea`).first()
const typeFirstMessageWithMention = async (page, prefix, query, id, rest) => {
  const input = newChatInput(page)
  await input.click(); await input.fill('')
  await page.keyboard.type(prefix)
  await page.locator(sel('run-mention-menu')).waitFor({ timeout: 30000 })
  await choose(page, query, id)
  await page.keyboard.type(rest)
  return input.inputValue()
}

defineCase('N02', 'AF-009 / REQ-012: an Agent New chat first send with an `@Team` mention starts the run and the server admits the collaborator Team; the host briefs it', async (page) => {
  const r = {}
  await newChat(page)
  await pickModel(page)
  await switchTarget(page, 'Research', ids.research)
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(!r.options.includes(ids.research) && !r.options.includes(ids.org) && !BUILT_IN_AGENT_IDS.some((id) => r.options.includes(id)), 'target, Org or a built-in agent offered in Agent New chat', r.options)
  assert(r.options.includes(ids.productTeam) && r.options.includes(ids.reviewer), 'shared candidates missing in Agent New chat', r.options)
  await page.keyboard.press('Escape')
  r.text = await typeFirstMessageWithMention(page, 'please ask @', 'product', ids.productTeam, 'to design a tiny settings page and report back.')
  assert(r.text.includes('@Product Team '), 'mention token not inserted in the New chat composer', r.text)
  await shot(page, 'N02-01-agent-new-chat-first-message-with-mention')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  r.runId = new URL(page.url()).searchParams.get('id')
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  // Server admission: the collaborator Team is in the new run's collaboration tree.
  const view = await waitCollaborators(r.runId, 1, 'first-send collaborator admitted')
  const entry = collaboratorsOf(view).find((c) => c.kind === 'agent_team')
  assert(entry, 'the first-send mention was not admitted as an Agent Team collaborator', collaboratorsOf(view))
  r.entry = { kind: entry.kind, address: entry.address, teamRunId: entry.teamRunId ?? entry.team_run_id, members: (entry.members ?? []).map((m) => m.address) }
  assert(r.entry.members.length === 2, 'collaborator Team not opened with its two members', r.entry)
  await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 30000 })
  r.userMention = await page.locator(sel('user-message-mention')).first().innerText()
  assert(/Product Team/.test(r.userMention), 'stored first message does not show the mention', r.userMention)
  // The mention reached the host model: it briefs the Team coordinator with send_message_to.
  const coordinator = entry.members.find((m) => m.address === entry.coordinatorAddress)
  await waitFor('host briefs the collaborator Team coordinator', async () => {
    const msgs = (await agentRootView(r.runId))?.communication_messages.messages ?? []
    return msgs.some((m) => m.senderAgentRunId === r.runId && m.receiverAgentRunId === coordinator.agentRunId)
  }, 300000, 1500)
  r.briefed = true
  await waitHostIdle(page); await delay(1500)
  await shot(page, 'N02-02-agent-first-send-collaborator-admitted')
  return r
})

defineCase('N03', 'AF-009 / AR-001: a Team New chat `@` list omits the team, its members, built-ins and Orgs; a first send with `@Agent` starts the Team run and the team root admits the collaborator', async (page) => {
  const r = {}
  const teamRunsBefore = async () => {
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { teamDefinitions { teamDefinitionId runs { teamRunId } } } }')
    return h.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).filter((t) => t.teamDefinitionId === ids.reviewTeam).flatMap((t) => t.runs.map((x) => x.teamRunId))
  }
  const before = new Set(await teamRunsBefore())
  await newChat(page)
  await pickModel(page)
  await switchTarget(page, 'review', ids.reviewTeam)
  await openMenu(page)
  r.options = await menuOptions(page)
  const excluded = [ids.reviewTeam, ids.researcher, ids.writer, ids.org, ...BUILT_IN_AGENT_IDS]
  assert(!excluded.some((id) => r.options.includes(id)), 'Team New chat offers the team, a member, a built-in or an Org', { options: r.options, excluded })
  assert([ids.research, ids.reviewer, ids.analyst, ids.productTeam].every((id) => r.options.includes(id)), 'shared outside candidates missing in Team New chat', r.options)
  r.footer = await page.locator(sel('run-mention-menu-footer')).innerText().catch(() => null)
  await shot(page, 'N03-01-team-new-chat-at-menu-VIS-030')
  await page.keyboard.press('Escape')
  r.text = await typeFirstMessageWithMention(page, 'please ask @', 'code', ids.reviewer, 'to review the phrase "hello team" and report back.')
  assert(r.text.includes('@Code Reviewer '), 'mention token not inserted in the Team New chat composer', r.text)
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run in history', async () => (await teamRunsBefore()).find((id) => !before.has(id)), 60000)
  const collaborators = await waitFor('team-root collaborator admitted', async () => { const c = await teamCollaborators(r.teamRunId); return c.length ? c : null }, 120000)
  const entry = collaborators.find((c) => c.kind === 'agent')
  assert(entry, 'the first-send mention was not admitted as an Agent collaborator on the team root', collaborators)
  r.entry = { kind: entry.kind, address: entry.address, agentRunId: entry.agentRunId ?? entry.agent_run_id }
  await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 60000 })
  r.userMention = await page.locator(sel('user-message-mention')).first().innerText()
  assert(/Code Reviewer/.test(r.userMention), 'stored first message does not show the mention', r.userMention)
  // The coordinator briefs the collaborator, which reports back "From Code Reviewer:".
  await waitFor('report "From Code Reviewer:"', async () => (await fromLabels(page)).includes('From Code Reviewer:'), 300000, 2000)
  r.reported = true
  await waitHostIdle(page); await delay(1500)
  await shot(page, 'N03-02-team-first-send-collaborator-admitted')
  return r
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cross-scope-mentions-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  backendPort = await freePort(); frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  backend = await startBackend('backend')
  await seed()
  evidence.definitions = ids
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
  for (const c of cases) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const started = Date.now()
    try {
      const details = await c.fn(page, context)
      // A case that cannot run here returns { notApplicable: reason }: reported as such, never counted as a pass.
      evidence.cases[c.id] = details?.notApplicable
        ? { title: c.title, result: 'Not Applicable', ms: Date.now() - started, reason: details.notApplicable }
        : { title: c.title, result: 'Pass', ms: Date.now() - started, details }
    } catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`) }).catch(() => {})
      evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
    }
    const outcome = evidence.cases[c.id]
    console.log(`${c.id} ${outcome.result} ${c.title}${outcome.error ? ` — ${outcome.error}` : ''}${outcome.reason ? ` — ${outcome.reason}` : ''}`)
    await fs.writeFile(path.join(outDir, 'cross-scope-agent-mentions-evidence.json'), JSON.stringify(evidence, null, 2))
  }
  const results = Object.values(evidence.cases).map((outcome) => outcome.result)
  evidence.summary = { pass: results.filter((x) => x === 'Pass').length, fail: results.filter((x) => x === 'Fail').length, notApplicable: results.filter((x) => x === 'Not Applicable').length }
  console.log(`Summary: ${evidence.summary.pass} Pass, ${evidence.summary.fail} Fail, ${evidence.summary.notApplicable} Not Applicable`)
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[cross-scope-agent-mentions] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'cross-scope-agent-mentions-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
