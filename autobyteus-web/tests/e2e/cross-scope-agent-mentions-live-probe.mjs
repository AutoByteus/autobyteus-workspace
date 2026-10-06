#!/usr/bin/env node
// Live probe for `@` in a live run (cross-scope-agent-mentions, updated by mention-delegation-dismissal SR-003/SR-005):
// sending with `@X` adds nothing to the run (no collaborator entry, no row); the stored message carries a note telling
// the focused agent to delegate_task to X's address; the agent delegates, which creates an ad-hoc Task (no Project,
// text only, `<appData>/ad-hoc-tasks/<id>/`) and returns its task_id; when the work is finished the agent — on its
// own after a report, or when the user says so — calls create_or_update_task({task_id, status: DONE}), a tool it has
// without selecting it, and the copy's row leaves the tree for good (live, after reload, Stop and a real backend
// restart). Permanent delete removes the run's ad-hoc Tasks. Stored collaborators (now only from an agent's own
// send_message_to to a catalog address) keep working. Covers standalone Agent, Team and Org runs, the first-send
// mention, an ineligible mention, old traces and old data, and the Agent-root host-crash lifecycle.
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → a real runtime
// (default Claude Agent SDK, model `haiku`; also `--runtime codex_app_server`). Everything runs in an owned temp
// data root on free ports with a sanitized environment, so a running desktop app or `~/.autobyteus` is never touched.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome, a logged-in runtime CLI.
// Usage: pnpm test:e2e:cross-scope-agent-mentions [--runtime claude_agent_sdk] [--model haiku]
//        [--output-dir test-results/cross-scope-agent-mentions] [--cases A01,A02] [--ledger-file <abs path>] [--keep]
// Host-crash cases L01/L02: pnpm test:e2e:cross-scope-agent-mentions --runtime antigravity_cli --cases L01,L02
// (they only kill runtime processes under this probe's own backend).
// Cases run in order and share state (A01 creates the standalone run used by A02–A06 and D01; T01 the Team run
// used by T02/T03; O01 the Org run used by O02/O03). `--cases` adds the producers a selected case needs.
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
const ledgerFile = arg('ledger-file', null)
const PRODUCER = { agentRun: 'A01', teamRun: 'T01', orgRun: 'O01' }
const NEEDS = { A02: ['agentRun'], A03: ['agentRun'], A04: ['agentRun'], A05: ['agentRun'], A06: ['agentRun'], D01: ['agentRun'], T02: ['teamRun'], T03: ['teamRun'], O02: ['orgRun'], O03: ['orgRun'] }
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
// mention-delegation-dismissal: the note itself tells the focused agent what to do with a mentioned collaborator
// (delegate_task, then create_or_update_task with the returned task_id when the work is finished). An agent may close
// on its own once a copy reports (supported, SCN-002); the user-driven close is asserted with a copy that never
// reports back (Note Taker).
const HOST_RULE = 'When the user message ends with a "[Mentioned collaborators]" section, follow that section for each listed '
  + 'collaborator, using the user request as the work description, then tell the user in one short sentence. '
  + 'When the user says some delegated work is finished, mark exactly that delegated work as done as the delegation told you, '
  + 'then reply in one short sentence. When the user asks you to use a specific tool, do exactly that. '
  + 'Otherwise reply in one short sentence. Never call get_handoff_rules.' + TOOL_HINT
const REPORT_RULE = 'When another agent messages you or gives you work, do what it asks in one short sentence, then call send_message_to exactly once '
  + 'to report back to that agent: use target_agent_run_id set to the sender id given in the message, or recipient_address set to the '
  + 'task delegator address given in the message, and your one-sentence result as content. '
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
  await createAgent('noteTaker', 'Note Taker', 'Notes things down.', 'When you are given work, do it in one short sentence. Never call any tool and never message anyone.')
  await createAgent('tempHelper', 'Temp Helper', 'A definition that F01 deletes while a draft mentions it.', 'Reply in one short sentence.')
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
const state = { model: null, agentRunId: null, teamRunId: null, orgRunId: null, children: {}, tasks: {} }
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
  // A cold Nuxt start can re-render the list right after its first row appears; read it once it is stable and non-empty.
  const models = await waitFor('model list', async () => {
    const found = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
    return found.length ? found : null
  }, 60000, 300)
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

// mention-delegation-dismissal helpers ---------------------------------------------------------
// `@` adds nothing; the focused agent delegates; every described delegation by an unowned sender gets an ad-hoc
// Task at <appData>/ad-hoc-tasks/<id>/ that the agent marks DONE with create_or_update_task(task_id) alone.
const adHocDir = () => path.join(dataRoot, 'ad-hoc-tasks')
const adHocTasks = async () => {
  const out = []
  for (const id of (await fs.readdir(adHocDir()).catch(() => [])).sort()) {
    const dir = path.join(adHocDir(), id)
    out.push({
      id,
      task: JSON.parse(await fs.readFile(path.join(dir, 'task.json'), 'utf8').catch(() => 'null')),
      resources: await fs.readFile(path.join(dir, 'agent_run_resources.json'), 'utf8').catch(() => ''),
      files: (await fs.readdir(dir).catch(() => [])).filter((name) => !name.endsWith('.lock')).sort(),
    })
  }
  return out
}
const adHocTaskOf = async (runId) => (await adHocTasks()).find((task) => task.resources.includes(runId)) ?? null
const refId = (ref) => ref?.teamRunId ?? ref?.team_run_id ?? ref?.agentRunId ?? ref?.agent_run_id ?? null
/** Delegated copies (task execution nodes) anywhere in a root tree; camelCase or snake_case. */
const taskNodesIn = (tree) => {
  const found = []
  const visit = (value) => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    const startedAt = value.startedAt ?? value.started_at
    const runId = value.teamRunId ?? value.team_run_id ?? value.agentRunId ?? value.agent_run_id
    if (typeof startedAt === 'string' && runId) {
      found.push({ runId, kind: (value.teamRunId ?? value.team_run_id) ? 'team' : 'agent', address: value.address,
        delegatorAgentRunId: value.delegatorAgentRunId ?? value.delegator_agent_run_id })
    }
    Object.values(value).forEach(visit)
  }
  visit(tree)
  return found
}
/** Every collaborator entry of a root tree. */
const collaboratorsIn = (tree) => {
  const found = []
  const visit = (value) => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) { if (key === 'collaborators' && Array.isArray(child)) found.push(...child); else visit(child) }
  }
  visit(tree)
  return found
}
/** Server facts of one root: its tree, closed task executions and collaborators (live or stored). */
const rootFacts = async (kind, rootId) => {
  if (kind === 'agent') {
    const view = await agentRootView(rootId)
    return { tree: view?.execution_tree ?? null, closed: (view?.closed_task_executions ?? []).map(refId), collaborators: collaboratorsIn(view?.execution_tree) }
  }
  if (kind === 'team') {
    const r = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree closedTaskExecutions}}', { id: rootId })).getTeamRunResumeConfig
    return { tree: r.executionTree, closed: (r.closedTaskExecutions ?? []).map(refId), collaborators: collaboratorsIn(r.executionTree) }
  }
  const o = (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org closed_task_executions}}', { id: rootId })).getAgentOrgRootHistory
  return { tree: o.org, closed: (o.closed_task_executions ?? []).map(refId), collaborators: collaboratorsIn(o.org) }
}
const copyIds = async (kind, rootId) => new Set(taskNodesIn((await rootFacts(kind, rootId)).tree).map((node) => node.runId))
/**
 * Waits for a new copy at `address` delegated by `delegatorRunId` and for its ad-hoc Task, sampling the root's
 * collaborators all the while: a `@` send must never add one (AC-001).
 */
const waitDelegation = async (kind, rootId, delegatorRunId, before, address, label, timeout = 300000) => {
  let maxCollaborators = 0
  const found = await waitFor(label, async () => {
    const facts = await rootFacts(kind, rootId)
    maxCollaborators = Math.max(maxCollaborators, facts.collaborators.length)
    const node = taskNodesIn(facts.tree).find((n) => n.delegatorAgentRunId === delegatorRunId && !before.has(n.runId) && n.address === address)
    if (!node) return null
    const task = await adHocTaskOf(node.runId)
    return task ? { node, task } : null
  }, timeout, 1500)
  return { ...found, maxCollaborators }
}
/** Waits until the ad-hoc Task is DONE and the root reports the copy closed (AC-007). */
const waitDone = (kind, rootId, taskId, runId, label) => waitFor(label, async () => {
  const task = (await adHocTasks()).find((t) => t.id === taskId)
  if (task?.task?.status !== 'DONE') return null
  const facts = await rootFacts(kind, rootId)
  return facts.closed.includes(runId) ? { task, facts } : null
}, 300000, 1500)
/** The stored text of one member's conversation, for the stored-note check (AC-002). */
const conversationJson = async (kind, rootId, agentRunId, address) => {
  if (kind === 'agent') return JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: agentRunId })).getRunProjection.conversation)
  if (kind === 'team') return JSON.stringify((await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: rootId, a: agentRunId })).getTeamMemberRunProjection.conversation)
  return JSON.stringify((await gql('query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}', { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection.conversation)
}
const NOTE_GUIDANCE_START = 'Delegate the work with delegate_task to its address'
const assertStoredNote = (text, entries) => {
  assert(text.includes('[Mentioned collaborators]') && text.includes(NOTE_GUIDANCE_START), 'stored message lacks the delegate_task note (AC-002)', text.slice(0, 1500))
  for (const entry of entries) assert(text.includes(entry), `stored note lacks "${entry}"`, text.slice(0, 1500))
  assert(!text.includes('Message a collaborator with send_message_to'), 'stored note still has the old collaborator guidance', text.slice(0, 1500))
}
/** The member run (agent) at `address` in a Team/Org tree. */
const memberRunIdIn = (tree, address) => {
  let found = null
  const visit = (value) => {
    if (found || !value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.forEach(visit); return }
    const runId = value.agentRunId ?? value.agent_run_id
    if (runId && (value.address === address || value.memberAddress === address || value.member_address === address) && !(value.startedAt ?? value.started_at)) { found = runId; return }
    Object.values(value).forEach(visit)
  }
  visit(tree)
  return found
}
const conversationShowsNote = async (page) => /\[Mentioned collaborators\]/.test(await conversationText(page))
const markDone = async (page, what) => sendInComposer(page, `The ${what} work is finished. Mark that delegated work as done.`)
const REVIEWER_ADDRESS = '/code_reviewer'
const PRODUCT_TEAM_ADDRESS = '/product_team'
const NOTE_TAKER_ADDRESS = '/note_taker'
/**
 * A copy that reports back may be marked DONE by its delegator on its own once the report arrives (SCN-002, "or the
 * agent decides itself"). Returns whether that happened; when it did, the Task must be DONE and the copy closed.
 */
const agentClosedOnItsOwn = async (kind, rootId, taskId, runId) => {
  const task = (await adHocTasks()).find((t) => t.id === taskId)
  const closed = (await rootFacts(kind, rootId)).closed.includes(runId)
  assert((task?.task?.status === 'DONE') === closed, 'ad-hoc Task status and copy closure disagree', { taskId, runId, status: task?.task?.status, closed })
  return closed
}

// ---------------------------------------------------------------------------------------------
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('A01', 'SCN-001 standalone run: menu (VIS-011, a11y), inline mention; the send adds no collaborator and no row (AC-001); stored delegate_task note, chip in the UI (AC-002); the host delegates (delegate_task card) and gets an ad-hoc Task, text only (AC-003, AC-015); the delegated row appears; the copy reports "From Code Reviewer:" (Task-linked scope allows its delegator); the host may close it on its own (SCN-002); a non-reporting copy and a Team copy are delegated the same way', async (page) => {
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

  // VIS-011: outside-run shared Agents, then Teams; own agent, Daily Assistant and Orgs not offered (UI unchanged).
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(!r.options.includes(ids.research), 'host agent offered', r.options)
  assert(!r.options.includes('autobyteus-daily-assistant') && !r.options.includes(ids.org), 'Daily Assistant or Org offered', r.options)
  assert(r.options.includes(ids.reviewer) && r.options.includes(ids.productTeam) && r.options.indexOf(ids.productTeam) > r.options.indexOf(ids.reviewer), 'candidate order wrong', r.options)
  r.menuText = await page.locator(sel('run-mention-menu')).innerText()
  r.footer = await page.locator(sel('run-mention-menu-footer')).innerText()
  note('A01 menu copy (unchanged by scope)', { menuText: r.menuText, footer: r.footer })
  const input = runComposer(page)
  r.aria = await input.evaluate((e) => ({ role: e.getAttribute('role'), expanded: e.getAttribute('aria-expanded'), controls: e.getAttribute('aria-controls'), active: e.getAttribute('aria-activedescendant') }))
  assert(r.aria.role === 'combobox' && r.aria.expanded === 'true' && r.aria.controls && r.aria.active, 'combobox attributes', r.aria)
  await shot(page, 'A01-01-agent-run-at-menu')
  await page.keyboard.press('Escape')

  // Inline mention, then send: nothing is added at send time; the host delegates.
  await input.fill(''); await page.keyboard.type('please ask @')
  await page.locator(sel('run-mention-menu')).waitFor()
  await choose(page, 'code', ids.reviewer)
  await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').filter({ hasText: '@Code Reviewer' }).waitFor()
  await page.keyboard.type('to review the phrase "hello world" and report back.')
  await shot(page, 'A01-02-composer-inline-mention')
  const before = await copyIds('agent', state.agentRunId)
  await page.keyboard.press('Enter')
  await delay(1500)
  r.rowsRightAfterSend = await rowFacts(taskRowsUnder(page, state.agentRunId))
  r.collaboratorsRightAfterSend = collaboratorsOf(await agentRootView(state.agentRunId)).length
  assert(r.collaboratorsRightAfterSend === 0, 'the @ send added a collaborator entry (AC-001)', r)
  assert(!r.rowsRightAfterSend.some(isOffline), 'an Offline row appeared from the send itself (AC-001)', r.rowsRightAfterSend)
  const d = await waitDelegation('agent', state.agentRunId, state.agentRunId, before, REVIEWER_ADDRESS, 'host delegates to Code Reviewer')
  state.children.reviewer = d.node.runId; state.tasks.reviewer = d.task.id
  r.delegation = { copyRunId: d.node.runId, taskId: d.task.id, task: d.task.task, files: d.task.files, maxCollaborators: d.maxCollaborators }
  assert(d.maxCollaborators === 0, 'a collaborator entry appeared while the host delegated (AC-001)', r.delegation)
  assert(/^ad_hoc_task_/.test(d.task.id) && /hello world/.test(d.task.task.description)
    && Array.isArray(d.task.task.referenceFiles) && !('projectId' in d.task.task), 'ad-hoc Task record (AC-003, AC-015)', r.delegation)
  assert(JSON.stringify(d.task.files) === JSON.stringify(['agent_run_resources.json', 'task.json']), 'ad-hoc Task folder holds only its two text records (AC-015)', d.task.files)
  await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 30000 })
  assert(!(await conversationShowsNote(page)), 'the note is shown as text instead of a chip (AC-002)')
  assert((await input.inputValue()) === '' && !(await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').count()), 'composer not cleared after an accepted send')
  assertStoredNote(await conversationJson('agent', state.agentRunId, state.agentRunId), [`- Code Reviewer (Agent) at ${REVIEWER_ADDRESS}`])
  r.rowSeen = await waitFor('delegated Code Reviewer row', async () => {
    const rows = await rowFacts(taskRowsUnder(page, state.agentRunId))
    return rows.find((row) => /code reviewer/i.test(row.text)) ?? null
  }, 60000, 300)
  assert(r.rowSeen.kind === 'task_agent', 'delegated Code Reviewer row kind', r.rowSeen)
  await shot(page, 'A01-03-delegated-row')
  await waitFor('report "From Code Reviewer:"', async () => (await fromLabels(page)).includes('From Code Reviewer:'), 300000, 2000)
  await waitHostIdle(page); await delay(2500)
  r.cards = await toolCards(page, RUN_VIEW)
  assert(r.cards.some((c) => /delegate_task/.test(c.text) && !c.error), 'expected a delegate_task card', r.cards)
  r.reviewerClosedByAgent = await agentClosedOnItsOwn('agent', state.agentRunId, state.tasks.reviewer, state.children.reviewer)
  r.rowsAfterReport = await rowFacts(taskRowsUnder(page, state.agentRunId))
  if (r.reviewerClosedByAgent) {
    assert(r.cards.some((c) => /create_or_update_task/.test(c.text) && !c.error) && !r.rowsAfterReport.some((row) => /code reviewer/i.test(row.text)),
      'agent-initiated DONE: create_or_update_task card and the row gone (AC-007, AC-009)', r)
    note('A01: the host marked the Code Reviewer work DONE on its own after the report (SCN-002, agent decides)')
  } else {
    assert(r.rowsAfterReport.some((row) => /code reviewer/i.test(row.text)), 'open Code Reviewer row missing', r.rowsAfterReport)
  }
  assert(collaboratorsOf(await agentRootView(state.agentRunId)).length === 0, 'collaborator entry after the delegation (AC-001)')
  await shot(page, 'A01-04-after-report')

  // A copy that does not report back stays open until the user says it is finished; its view and direct chat.
  const beforeNotes = await copyIds('agent', state.agentRunId)
  await mentionAndSend(page, 'please ask @', 'note', ids.noteTaker, 'to note down "launch on Friday".')
  const n = await waitDelegation('agent', state.agentRunId, state.agentRunId, beforeNotes, NOTE_TAKER_ADDRESS, 'host delegates to Note Taker')
  state.children.notes = n.node.runId; state.tasks.notes = n.task.id
  r.notes = { copyRunId: n.node.runId, taskId: n.task.id, maxCollaborators: n.maxCollaborators }
  assert(n.maxCollaborators === 0 && n.task.id !== d.task.id, 'Note Taker delegation', r.notes)
  await waitFor('delegated Note Taker row', async () => (await rowFacts(taskRowsUnder(page, state.agentRunId))).some((row) => /note taker/i.test(row.text)), 60000)
  await waitHostIdle(page); await delay(1500)
  await taskRowsUnder(page, state.agentRunId).filter({ hasText: /note taker/i }).first().click(); await delay(2500)
  r.childTitle = await page.locator(sel('agent-workspace-title')).innerText()
  assert(/note taker/i.test(r.childTitle), 'copy view header', r.childTitle)
  await shot(page, 'A01-05-delegated-copy-view')
  await sendInComposer(page, 'Reply with the single word CHILD-OK.')
  await replyAppears(page, 'CHILD-OK')
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(2000)

  // A Team is delegated the same way: a Team copy with its own ad-hoc Task.
  const beforeTeam = await copyIds('agent', state.agentRunId)
  await mentionAndSend(page, '@', 'product', ids.productTeam, ' please design a tiny settings page and report back.')
  const t = await waitDelegation('agent', state.agentRunId, state.agentRunId, beforeTeam, PRODUCT_TEAM_ADDRESS, 'host delegates to Product Team', 420000)
  state.children.productTeam = t.node.runId; state.tasks.productTeam = t.task.id
  r.teamDelegation = { copyRunId: t.node.runId, kind: t.node.kind, taskId: t.task.id, maxCollaborators: t.maxCollaborators }
  assert(t.node.kind === 'team' && t.maxCollaborators === 0, 'Team delegation with its own ad-hoc Task (AC-001, AC-003)', r.teamDelegation)
  await waitFor('delegated Team row', async () => (await rowFacts(taskRowsUnder(page, state.agentRunId))).some((row) => row.kind === 'task_team'), 60000)
  await shot(page, 'A01-06-delegated-team')
  await waitHostIdle(page, 420000); await delay(2000)
  r.teamClosedByAgent = await agentClosedOnItsOwn('agent', state.agentRunId, state.tasks.productTeam, state.children.productTeam)
  await openMenu(page)
  r.optionsAfter = await menuOptions(page)
  note('A01 menu after delegations (SCN-004: the definitions stay mentionable)', r.optionsAfter)
  assert(r.optionsAfter.includes(ids.noteTaker), 'a delegated definition is no longer offered (SCN-004)', r.optionsAfter)
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1024, height: 640 }); await delay(600)
  await openMenu(page)
  r.small = await page.evaluate(() => { const m = document.querySelector('[data-test="run-mention-menu"]').getBoundingClientRect(); return { top: m.top, bottom: m.bottom, vh: innerHeight } })
  assert(r.small.top >= 0 && r.small.bottom <= r.small.vh, 'menu off screen at 1024x640', r.small)
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1512, height: 952 })
  return r
})

defineCase('A02', 'SCN-002 / AC-007 / AC-009: the user tells the host the notes are finished; the host (no Project tool selected) calls create_or_update_task by task_id alone; Task DONE, copy closed, its row leaves live; history kept', async (page) => {
  const r = {}
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(1500)
  await markDone(page, 'Note Taker')
  const done = await waitDone('agent', state.agentRunId, state.tasks.notes, state.children.notes, 'Note Taker ad-hoc Task DONE and closed')
  r.closed = done.facts.closed
  await waitFor('Note Taker row leaves the tree live', async () => !(await rowFacts(taskRowsUnder(page, state.agentRunId))).some((row) => /note taker/i.test(row.text)), 60000)
  await waitHostIdle(page); await delay(1500)
  r.cards = await toolCards(page, RUN_VIEW)
  assert(r.cards.some((c) => /create_or_update_task/.test(c.text) && !c.error), 'expected a successful create_or_update_task card (AC-009)', r.cards)
  const kept = await gql('query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}', { h: state.agentRunId, a: NOTE_TAKER_ADDRESS, r: state.children.notes })
  r.closedConversationEntries = kept.agentRunCollaborationMemberProjection?.conversation?.length ?? 0
  assert(r.closedConversationEntries > 0, 'the closed copy\'s conversation must be kept', r)
  assert(collaboratorsOf(await agentRootView(state.agentRunId)).length === 0, 'collaborator entry after DONE')
  await shot(page, 'A02-row-gone-after-done')
  return r
})

defineCase('A03', 'AC-008 / SCN-004: Stop → reopen: closed copies stay hidden, viewing does not restore; a second @Note Taker is delegated to a new copy (never the closed one)', async (page) => {
  const r = {}
  const row = await findAgentRunRow(page, state.agentRunId)
  await row.hover()
  await page.locator(`${sel('terminate-agent-run')}[data-run-id="${state.agentRunId}"]`).click()
  await waitFor('host stopped', async () => (await agentRunActive(state.agentRunId)) === false, 60000)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await findAgentRunRow(page, state.agentRunId)
  r.rowsAfterReopen = await rowFacts(taskRowsUnder(page, state.agentRunId))
  assert(!r.rowsAfterReopen.some((row) => /note taker/i.test(row.text)), 'after Stop: closed Note Taker copy listed', r.rowsAfterReopen)
  assert((await agentRunActive(state.agentRunId)) === false, 'viewing the stopped run restored the host')
  r.storedClosed = (await rootFacts('agent', state.agentRunId)).closed
  assert(r.storedClosed.includes(state.children.notes), 'stored read lacks the closed copy (AC-008)', r)
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(2000)
  const before = await copyIds('agent', state.agentRunId)
  await mentionAndSend(page, 'please ask @', 'note', ids.noteTaker, 'to note down "second pass on Monday".')
  const d = await waitDelegation('agent', state.agentRunId, state.agentRunId, before, NOTE_TAKER_ADDRESS, 'second Note Taker delegation')
  state.children.notes2 = d.node.runId; state.tasks.notes2 = d.task.id
  r.second = { copyRunId: d.node.runId, taskId: d.task.id, maxCollaborators: d.maxCollaborators }
  assert(d.node.runId !== state.children.notes && d.task.id !== state.tasks.notes && d.maxCollaborators === 0, 'the closed copy was reused or a collaborator was added', r)
  await waitFor('one open Note Taker row', async () => (await rowFacts(taskRowsUnder(page, state.agentRunId))).filter((row) => /note taker/i.test(row.text)).length === 1, 60000)
  await waitHostIdle(page, 300000); await delay(1500)
  await shot(page, 'A03-second-copy-after-stop')
  return r
})

defineCase('A04', 'AR-001 (prior feature): viewing a stopped run\'s open delegated copy (clicking it, or reloading with it selected) does not restore the host; only a send does', async (page) => {
  const r = {}
  if (await agentRunActive(state.agentRunId)) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: state.agentRunId })
  await waitFor('host stopped', async () => (await agentRunActive(state.agentRunId)) === false, 60000)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(2000)
  r.afterReloadHostSelected = await agentRunActive(state.agentRunId)
  await taskRowsUnder(page, state.agentRunId).filter({ hasText: /note taker/i }).first().click(); await delay(8000)
  r.afterClickingCopy = await agentRunActive(state.agentRunId)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(12000)
  r.afterReloadWithCopySelected = await agentRunActive(state.agentRunId)
  await shot(page, 'A04-reload-with-copy-selected')
  assert(r.afterReloadHostSelected === false && r.afterClickingCopy === false && r.afterReloadWithCopySelected === false,
    'viewing a stopped run\'s copy restored the host (AR-001: no stream for an inactive run; only a send restores)', r)
  return r
})

defineCase('A05', 'AC-008 real backend restart: closed copies stay hidden, the open copy is listed, statuses are kept; after the restart the user has the host mark the second notes DONE and its row leaves', async (page) => {
  const r = {}
  await restartBackend('backend-restart')
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(4000)
  await findAgentRunRow(page, state.agentRunId)
  r.rows = await rowFacts(taskRowsUnder(page, state.agentRunId))
  assert(r.rows.filter((row) => /note taker/i.test(row.text)).length === 1, 'after restart: exactly the open Note Taker row', r.rows)
  r.closedAfterRestart = (await rootFacts('agent', state.agentRunId)).closed
  assert(r.closedAfterRestart.includes(state.children.notes) && !r.closedAfterRestart.includes(state.children.notes2), 'closure after restart', r)
  r.statuses = Object.fromEntries((await adHocTasks()).map((t) => [t.id, t.task?.status]))
  assert(r.statuses[state.tasks.notes] === 'DONE' && r.statuses[state.tasks.notes2] !== 'DONE', 'ad-hoc Task statuses after restart', r.statuses)
  await (await findAgentRunRow(page, state.agentRunId)).click(); await delay(3000)
  await markDone(page, 'second Note Taker')
  await waitDone('agent', state.agentRunId, state.tasks.notes2, state.children.notes2, 'second Note Taker DONE after restart')
  await waitFor('second Note Taker row leaves', async () => !(await rowFacts(taskRowsUnder(page, state.agentRunId))).some((row) => /note taker/i.test(row.text)), 60000)
  await waitHostIdle(page); await delay(1500)
  r.closedFinal = (await rootFacts('agent', state.agentRunId)).closed
  assert(r.closedFinal.includes(state.children.notes) && r.closedFinal.includes(state.children.notes2), 'both Note Taker copies closed', r)
  await shot(page, 'A05-after-restart-done')
  return r
})

defineCase('A06', 'AC-016 (prior feature): a stored delivery without a recorded sender (an old trace) keeps the user-style presentation; the user message is unchanged', async (page) => {
  const r = {}
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: state.agentRunId })
  await waitFor('host stopped', async () => (await agentRunActive(state.agentRunId)) === false, 60000)
  const runDir = path.join(dataRoot, 'memory', 'agents', state.agentRunId)
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
  await shot(page, 'A06-old-trace-user-style')
  return r
})

defineCase('S01', 'AC-012 / SCN-007: a collaborator added by the agent\'s own first send_message_to to a catalog address (the remaining producer of collaborator entries) is stored; after Stop and reopen its row loads, direct chat restores it with the same run ID', async (page) => {
  const r = {}
  const runId = r.runId = await startStandaloneRun(page, 'Say hello in one short sentence.')
  state.storedRunId = runId
  await sendInComposer(page, `Use send_message_to with recipient_address ${REVIEWER_ADDRESS} to ask Code Reviewer to review the phrase "ok" and report back to you.`)
  const view = await waitCollaborators(runId, 1, 'agent-initiated collaborator added')
  const entry = collaboratorsOf(view)[0]
  r.entry = { kind: entry.kind, address: entry.address, agentRunId: entry.agentRunId }
  assert(entry.kind === 'agent' && entry.address === REVIEWER_ADDRESS, 'bring-in collaborator entry', r.entry)
  await waitMessageFrom(runId, entry.agentRunId, 'collaborator report')
  await waitHostIdle(page)
  r.tasksForRun = (await adHocTasks()).filter((t) => t.resources.includes(entry.agentRunId)).map((t) => t.id)
  assert(r.tasksForRun.length === 0, 'a collaborator brought in by send_message_to must not get an ad-hoc Task', r)
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })
  await waitFor('host stopped', async () => (await agentRunActive(runId)) === false, 60000)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await findAgentRunRow(page, runId)
  r.rowsAfterReopen = await rowFacts(taskRowsUnder(page, runId))
  assert(r.rowsAfterReopen.some((row) => /code reviewer/i.test(row.text) && isOffline(row)), 'stored collaborator row (Offline) after reopen', r.rowsAfterReopen)
  await taskRowsUnder(page, runId).filter({ hasText: /code reviewer/i }).first().click(); await delay(3000)
  await sendInComposer(page, 'Reply with the single word STORED-OK.')
  await replyAppears(page, 'STORED-OK')
  const after = await agentRootView(runId)
  r.sameRunId = collaboratorsOf(after).find((c) => c.kind === 'agent')?.agentRunId === entry.agentRunId
  r.hostActive = await agentRunActive(runId)
  assert(r.sameRunId && r.hostActive === true, 'stored collaborator not restored with the same run ID', r)
  // The host still messages it by address after the restore (AC-012).
  await (await findAgentRunRow(page, runId)).click(); await delay(2000)
  const before = (await agentRootView(runId))?.communication_messages.messages.length ?? 0
  await sendInComposer(page, `Use send_message_to with recipient_address ${REVIEWER_ADDRESS} to ask Code Reviewer to review the phrase "again" and report back to you.`)
  await waitFor('host message to the stored collaborator', async () => {
    const msgs = (await agentRootView(runId))?.communication_messages.messages ?? []
    return msgs.length > before && msgs.slice(before).some((m) => m.senderAgentRunId === runId && m.receiverAgentRunId === entry.agentRunId)
  }, 300000, 1500)
  r.collaboratorsAfter = collaboratorsOf(await agentRootView(runId)).map((c) => c.agentRunId)
  assert(r.collaboratorsAfter.length === 1 && r.collaboratorsAfter[0] === entry.agentRunId, 'messaging by address created another collaborator', r)
  await waitHostIdle(page)
  await shot(page, 'S01-stored-collaborator-restored')
  return r
})

defineCase('F01', 'AC-001 alternate (ineligible mention): a mention whose definition no longer exists is refused — notice, draft and highlight kept, nothing sent, no row, no Task', async (page) => {
  const r = {}
  const runId = r.runId = await startStandaloneRun(page, 'Say hello in one short sentence.')
  const marker = `F01-${Date.now()}`
  const input = runComposer(page); await input.fill('')
  await page.keyboard.type(`${marker} please ask @`)
  await choose(page, 'temp', ids.tempHelper)
  await page.keyboard.type('to check the release notes.')
  // The definition is deleted while the draft holds its mention (e.g. from the Agents page); the send must be refused.
  r.deleted = (await gql('mutation($id:String!){deleteAgentDefinition(id:$id){success message}}', { id: ids.tempHelper })).deleteAgentDefinition
  assert(r.deleted.success, 'could not delete the Temp Helper definition', r.deleted)
  const tasksBefore = (await adHocTasks()).length
  await page.keyboard.press('Enter')
  await page.locator(sel('collaborator-add-failure')).waitFor({ timeout: 60000 })
  await delay(1500)
  r.notice = await page.locator(sel('collaborator-add-failure')).innerText()
  r.draft = await runComposer(page).inputValue()
  r.highlightKept = await page.locator('[data-test="composer-mention-mirror"] .mention-highlight').count() > 0
  // The stored conversation is the authority; the page text also contains the composer's mention mirror (the draft).
  r.messageSent = (await conversationJson('agent', runId, runId)).includes(marker)
  r.collaborators = collaboratorsOf(await agentRootView(runId)).length
  r.copies = taskNodesIn((await agentRootView(runId))?.execution_tree).length
  r.tasksAdded = (await adHocTasks()).length - tasksBefore
  await shot(page, 'F01-ineligible-mention-refused')
  assert(r.draft.includes(marker) && r.highlightKept && !r.messageSent, 'draft and highlight must stay and nothing be sent', r)
  assert(r.collaborators === 0 && r.copies === 0 && r.tasksAdded === 0, 'a refused mention added something', r)
  await page.locator(sel('collaborator-add-failure-dismiss')).click().catch(() => {})
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId }).catch(() => {})
  return r
})

defineCase('T01', 'SCN-001 Team run: VIS-001 menu; @Product Team → no Team collaborator (AC-001), stored note (AC-002), the focused researcher delegates a Team copy with an ad-hoc Task (AC-003); "From Product Prototyper:"; the next send with @Note Taker (CR-003) delegates an Agent copy', async (page) => {
  const r = {}
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
  const researcherRunId = state.researcherRunId = memberRunIdIn(await teamTree(state.teamRunId), '/researcher')
  assert(researcherRunId, 'researcher run id', await teamTree(state.teamRunId))
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(![ids.reviewTeam, ids.researcher, ids.writer, ids.org, 'autobyteus-daily-assistant'].some((id) => r.options.includes(id)), 'in-run or excluded definitions offered in the Team run', r.options)
  assert(r.options.includes(ids.productTeam) && r.options.includes(ids.reviewer), 'outside definitions missing', r.options)
  await shot(page, 'T01-01-team-run-at-menu')
  await page.keyboard.press('Escape')
  const before = await copyIds('team', state.teamRunId)
  await mentionAndSend(page, 'please ask @', 'product', ids.productTeam, 'to design a tiny settings page and report back.')
  await delay(1500)
  r.collaboratorsRightAfterSend = (await rootFacts('team', state.teamRunId)).collaborators.length
  const t = await waitDelegation('team', state.teamRunId, researcherRunId, before, PRODUCT_TEAM_ADDRESS, 'researcher delegates to Product Team', 420000)
  state.teamChildren = { productTeam: t.node.runId }; state.teamTasks = { productTeam: t.task.id }
  r.teamDelegation = { copyRunId: t.node.runId, kind: t.node.kind, taskId: t.task.id, maxCollaborators: t.maxCollaborators }
  assert(r.collaboratorsRightAfterSend === 0 && t.maxCollaborators === 0 && t.node.kind === 'team', 'Team root: no collaborator; a Team copy (AC-001, AC-003)', r)
  assertStoredNote(await conversationJson('team', state.teamRunId, researcherRunId), [`- Product Team (Agent Team) at ${PRODUCT_TEAM_ADDRESS}`])
  const teamRows = page.locator(sel('workspace-team-transient-execution-row'))
  await waitFor('delegated Team row', async () => (await rowFacts(teamRows)).some((row) => row.kind === 'task_team'), 60000)
  await shot(page, 'T01-02-team-copy-delegated')
  await waitFor('report "From Product Prototyper:"', async () => (await fromLabels(page)).includes('From Product Prototyper:'), 420000, 2000)
  await waitHostIdle(page, 420000); await delay(2000)
  r.cards = await toolCards(page)
  assert(r.cards.some((c) => /delegate_task/.test(c.text) && !c.error), 'expected a delegate_task card', r.cards)
  assert(!(await conversationShowsNote(page)), 'note shown as text in the Team conversation (AC-002)')
  r.teamClosedByAgent = await agentClosedOnItsOwn('team', state.teamRunId, state.teamTasks.productTeam, state.teamChildren.productTeam)
  if (r.teamClosedByAgent) {
    await waitFor('agent-closed Team copy rows leave', async () => !(await rowFacts(teamRows)).some((row) => row.kind === 'task_team'), 60000)
    note('T01: the researcher marked the Product Team work DONE on its own after the report (SCN-002, agent decides)')
  }
  const beforeNotes = await copyIds('team', state.teamRunId)
  await mentionAndSend(page, 'also ask @', 'note', ids.noteTaker, 'to note down "ship it".')
  const d = await waitDelegation('team', state.teamRunId, researcherRunId, beforeNotes, NOTE_TAKER_ADDRESS, 'researcher delegates to Note Taker')
  state.teamChildren.notes = d.node.runId; state.teamTasks.notes = d.task.id
  assert(d.maxCollaborators === 0 && d.task.id !== t.task.id, 'second delegation in the Team run', d)
  await waitFor('delegated Note Taker row', async () => (await rowFacts(teamRows)).some((row) => row.kind === 'task_agent' && /note taker/i.test(row.text)), 60000)
  await waitHostIdle(page); await delay(2000)
  r.rowsBoth = await rowFacts(teamRows)
  await shot(page, 'T01-03-team-run-copies')
  return r
})

defineCase('T02', 'Team run: the delegated Note Taker copy view; direct chat', async (page) => {
  const r = {}
  await page.locator(sel('workspace-team-transient-execution-row')).filter({ hasText: /note taker/i }).first().click(); await delay(3000)
  r.title = await page.locator(sel('agent-workspace-title')).innerText().catch(() => null)
  await shot(page, 'T02-copy-view')
  await sendInComposer(page, 'Reply with the single word MEMBER-OK.')
  await replyAppears(page, 'MEMBER-OK')
  return r
})

defineCase('T03', 'AC-007 / AC-009 Team member: the user has the researcher mark the Note Taker work DONE by task_id; the row leaves live and stays hidden after reload', async (page) => {
  const r = {}
  await page.locator(`[data-test^="workspace-team-member-${state.teamRunId}-"]`).filter({ hasText: /researcher/i }).first().click(); await delay(2500)
  await markDone(page, 'Note Taker')
  const done = await waitDone('team', state.teamRunId, state.teamTasks.notes, state.teamChildren.notes, 'Team Note Taker copy DONE')
  r.closed = done.facts.closed
  const teamRows = page.locator(sel('workspace-team-transient-execution-row'))
  await waitFor('Note Taker row leaves', async () => !(await rowFacts(teamRows)).some((row) => /note taker/i.test(row.text)), 60000)
  await waitHostIdle(page); await delay(1500)
  r.cards = await toolCards(page)
  assert(r.cards.some((c) => /create_or_update_task/.test(c.text) && !c.error), 'expected a create_or_update_task card from the Team member (AC-009)', r.cards)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(4000)
  const teamRow = page.locator(sel(`workspace-team-row-${state.teamRunId}`))
  if (!(await teamRow.isVisible().catch(() => false))) await expandWorkspaces(page)
  if (!(await teamRow.isVisible().catch(() => false))) {
    const group = page.locator(sel(`workspace-team-definition-row-${ids.reviewTeam}`)).first()
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  }
  await teamRow.click(); await delay(3000)
  r.rowsAfterReload = await rowFacts(teamRows)
  assert(!r.rowsAfterReload.some((row) => /note taker/i.test(row.text)), 'after reload: closed Note Taker copy listed', r.rowsAfterReload)
  await shot(page, 'T03-team-copy-done')
  return r
})

defineCase('O01', 'SCN-001 Org run: VIS-008 menu; two mentions → no Org collaborator (AC-001), stored note with both entries (AC-002); the analyst delegates an Agent and a Team copy, each with an ad-hoc Task (AC-003); "From Product Prototyper:"', async (page) => {
  const r = {}
  const workspace = path.join(dataRoot, 'temp_workspace'); await fs.mkdir(workspace, { recursive: true })
  const org = await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: ids.org, rootConfiguration: { runtimeKind: runtime, llmModelIdentifier: await ensureModel(), llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace }, agentOverrides: [], teamOverrides: [] } })
  assert(org.createAgentOrgRun.success, org.createAgentOrgRun.message)
  state.orgRunId = r.orgRunId = org.createAgentOrgRun.agentOrgRunId
  const analystRunId = state.analystRunId = memberRunIdIn((await rootFacts('org', state.orgRunId)).tree, '/analyst')
  assert(analystRunId, 'analyst run id')
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(3000)
  await openOrgGroup(page)
  await page.locator(sel(`agent-org-run-open-${state.orgRunId}`)).click(); await delay(2000)
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /analyst/i }).first().click(); await delay(3000)
  await openMenu(page)
  r.options = await menuOptions(page)
  assert(![ids.org, ids.analyst, ids.reviewTeam, ids.researcher, ids.writer].some((id) => r.options.includes(id)), 'Org, members or mounted teams offered', r.options)
  assert(r.options.includes(ids.noteTaker) && r.options.includes(ids.productTeam), 'outside candidates missing', r.options)
  await shot(page, 'O01-01-org-run-at-menu')
  await page.keyboard.press('Escape')
  const before = await copyIds('org', state.orgRunId)
  const input = runComposer(page); await input.fill('')
  await page.keyboard.type('please ask @')
  await choose(page, 'note', ids.noteTaker)
  await page.keyboard.type('to note down the launch date and @')
  await choose(page, 'product', ids.productTeam)
  await page.keyboard.type('to plan the launch page and report back.')
  await page.keyboard.press('Enter')
  await delay(1500)
  r.collaboratorsRightAfterSend = (await rootFacts('org', state.orgRunId)).collaborators.length
  const d = await waitDelegation('org', state.orgRunId, analystRunId, before, NOTE_TAKER_ADDRESS, 'analyst delegates to Note Taker', 420000)
  const t = await waitDelegation('org', state.orgRunId, analystRunId, before, PRODUCT_TEAM_ADDRESS, 'analyst delegates to Product Team', 420000)
  state.orgChildren = { notes: d.node.runId, productTeam: t.node.runId }; state.orgTasks = { notes: d.task.id, productTeam: t.task.id }
  r.delegations = { notes: { runId: d.node.runId, taskId: d.task.id }, productTeam: { runId: t.node.runId, kind: t.node.kind, taskId: t.task.id } }
  assert(r.collaboratorsRightAfterSend === 0 && d.maxCollaborators === 0 && t.maxCollaborators === 0 && d.task.id !== t.task.id && t.node.kind === 'team', 'Org: two copies with two ad-hoc Tasks and no collaborator', r)
  assertStoredNote(await conversationJson('org', state.orgRunId, analystRunId, '/analyst'),
    [`- Note Taker (Agent) at ${NOTE_TAKER_ADDRESS}`, `- Product Team (Agent Team) at ${PRODUCT_TEAM_ADDRESS}`])
  await page.locator('[data-test^="agent-org-task-agent-row-"]').first().waitFor({ timeout: 60000 })
  await page.locator('[data-test^="agent-org-task-team-row-"]').first().waitFor({ timeout: 60000 })
  await shot(page, 'O01-02-org-two-copies')
  await waitFor('report "From Product Prototyper:"', async () => (await fromLabels(page)).includes('From Product Prototyper:'), 420000, 2000)
  await waitHostIdle(page, 420000); await delay(2500)
  r.cards = await toolCards(page)
  assert(r.cards.filter((c) => /delegate_task/.test(c.text) && !c.error).length >= 2, 'expected two delegate_task cards', r.cards)
  r.teamClosedByAgent = await agentClosedOnItsOwn('org', state.orgRunId, state.orgTasks.productTeam, state.orgChildren.productTeam)
  if (r.teamClosedByAgent) note('O01: the analyst marked the Product Team work DONE on its own after the report (SCN-002, agent decides)')
  return r
})

defineCase('O02', 'Org run: the delegated Note Taker copy view; direct chat', async (page) => {
  const r = {}
  await page.locator('[data-test^="agent-org-task-agent-row-"]').filter({ hasText: /note taker/i }).first().click(); await delay(3000)
  await shot(page, 'O02-copy-view')
  await sendInComposer(page, 'Reply with the single word ORG-CHILD-OK.')
  await replyAppears(page, 'ORG-CHILD-OK')
  return r
})

defineCase('O03', 'AC-007 / AC-009 Org member: the user has the analyst mark the delegated work DONE; the rows leave live and stay hidden after reload', async (page) => {
  const r = {}
  await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /analyst/i }).first().click(); await delay(2500)
  const teamOpen = !(await rootFacts('org', state.orgRunId)).closed.includes(state.orgChildren.productTeam)
  await sendInComposer(page, teamOpen
    ? 'Both the Note Taker and the Product Team work are finished. Mark both delegated works as done.'
    : 'The Note Taker work is finished. Mark that delegated work as done.')
  await waitDone('org', state.orgRunId, state.orgTasks.notes, state.orgChildren.notes, 'Org Note Taker copy DONE')
  await waitDone('org', state.orgRunId, state.orgTasks.productTeam, state.orgChildren.productTeam, 'Org Team copy DONE')
  const rowsGone = async () => (await page.locator('[data-test^="agent-org-task-agent-row-"], [data-test^="agent-org-task-team-row-"]').count()) === 0
  await waitFor('Org copy rows leave', rowsGone, 60000)
  await waitHostIdle(page); await delay(1500)
  await page.reload({ waitUntil: 'domcontentloaded' }); await delay(3000)
  await openOrgGroup(page)
  await page.locator(sel(`agent-org-run-open-${state.orgRunId}`)).click(); await delay(3000)
  r.rowsAfterReload = await page.locator('[data-test^="agent-org-task-agent-row-"], [data-test^="agent-org-task-team-row-"]').count()
  assert(r.rowsAfterReload === 0, 'closed Org copies listed after reload', r)
  await shot(page, 'O03-org-copies-done')
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

defineCase('L01', 'Host crash keeps the root and its delegated child; the child still answers; the host wakes on a send; after another crash Delete ends the root first and removes the run', async (page) => {
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
  const delegation = await waitDelegation('agent', runId, runId, new Set(), REVIEWER_ADDRESS, 'host delegates to Code Reviewer')
  const childRunId = r.childRunId = delegation.node.runId
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

defineCase('L02', 'Host crash without delegated copies: Archive succeeds and the lingering root is ended', async (page) => {
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

// run-settings-ui-unification AF-009 / REQ-012: the first message of a new run keeps its `@` mentions. Since
// mention-delegation-dismissal the server resolves them (nothing is added) and the focused agent delegates.
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

defineCase('N02', 'AF-009 + AC-001/003: an Agent New chat first send with an `@Team` mention starts the run; no collaborator; the host delegates a Team copy with an ad-hoc Task', async (page) => {
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
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  r.runId = new URL(page.url()).searchParams.get('id')
  await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
  const t = await waitDelegation('agent', r.runId, r.runId, new Set(), PRODUCT_TEAM_ADDRESS, 'first-send host delegates to Product Team', 420000)
  r.delegation = { runId: t.node.runId, kind: t.node.kind, taskId: t.task.id, maxCollaborators: t.maxCollaborators }
  assert(t.node.kind === 'team' && t.maxCollaborators === 0, 'first-send mention: Team copy with an ad-hoc Task and no collaborator', r.delegation)
  await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 30000 })
  r.userMention = await page.locator(sel('user-message-mention')).first().innerText()
  assert(/Product Team/.test(r.userMention), 'stored first message does not show the mention', r.userMention)
  assertStoredNote(await conversationJson('agent', r.runId, r.runId), [`- Product Team (Agent Team) at ${PRODUCT_TEAM_ADDRESS}`])
  await waitHostIdle(page, 420000); await delay(1500)
  await shot(page, 'N02-agent-first-send-delegated')
  return r
})

defineCase('N03', 'AF-009 / AR-001 + AC-001/003: a Team New chat `@` list omits the team, its members, built-ins and Orgs; a first send with `@Agent` starts the Team run; no collaborator; the coordinator delegates; "From Code Reviewer:"', async (page) => {
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
  await page.keyboard.press('Escape')
  r.text = await typeFirstMessageWithMention(page, 'please ask @', 'code', ids.reviewer, 'to review the phrase "hello team" and report back.')
  assert(r.text.includes('@Code Reviewer '), 'mention token not inserted in the Team New chat composer', r.text)
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  r.teamRunId = await waitFor('new team run in history', async () => (await teamRunsBefore()).find((id) => !before.has(id)), 60000)
  const researcherRunId = await waitFor('researcher run id', async () => memberRunIdIn(await teamTree(r.teamRunId), '/researcher'), 60000)
  const d = await waitDelegation('team', r.teamRunId, researcherRunId, new Set(), REVIEWER_ADDRESS, 'first-send coordinator delegates to Code Reviewer')
  r.delegation = { runId: d.node.runId, taskId: d.task.id, maxCollaborators: d.maxCollaborators }
  assert(d.maxCollaborators === 0, 'first-send Team mention added a collaborator', r.delegation)
  await page.locator(sel('user-message-mention')).first().waitFor({ timeout: 60000 })
  r.userMention = await page.locator(sel('user-message-mention')).first().innerText()
  assert(/Code Reviewer/.test(r.userMention), 'stored first message does not show the mention', r.userMention)
  await waitFor('report "From Code Reviewer:"', async () => (await fromLabels(page)).includes('From Code Reviewer:'), 300000, 2000)
  await waitHostIdle(page); await delay(1500)
  await shot(page, 'N03-team-first-send-delegated')
  return r
})

defineCase('D01', 'SCN-005 / AC-010: permanently deleting the standalone run from history removes its ad-hoc Tasks; the Team and Org runs\' ad-hoc Tasks stay', async (page) => {
  const r = {}
  const own = Object.values(state.tasks).filter(Boolean)
  const others = [...Object.values(state.teamTasks ?? {}), ...Object.values(state.orgTasks ?? {})]
  const present = new Set((await adHocTasks()).map((t) => t.id))
  r.before = { own, others, presentOwn: own.filter((id) => present.has(id)), presentOthers: others.filter((id) => present.has(id)) }
  assert(own.length >= 1 && r.before.presentOwn.length === own.length, 'own ad-hoc Tasks missing before delete', r.before)
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(3000)
  await expandWorkspaces(page)
  await clickRowAction(page, state.agentRunId, 'Delete run permanently')
  const confirm = page.locator(sel('delete-confirmation-confirm')).or(page.getByRole('button', { name: 'Delete', exact: true })).first()
  await confirm.waitFor({ timeout: 15000 }); await confirm.click()
  await waitFor('run row removed', async () => !(await page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${state.agentRunId}"]`).count()), 60000)
  await waitFor('own ad-hoc Tasks removed', async () => { const left = new Set((await adHocTasks()).map((t) => t.id)); return own.every((id) => !left.has(id)) }, 60000)
  const left = new Set((await adHocTasks()).map((t) => t.id))
  r.othersAfter = others.filter((id) => left.has(id))
  assert(r.othersAfter.length === r.before.presentOthers.length, 'another run\'s ad-hoc Task was removed', r)
  r.viewAfterDelete = await agentRootView(state.agentRunId).catch(() => null)
  assert(r.viewAfterDelete === null, 'deleted run still readable', r)
  await shot(page, 'D01-run-deleted')
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
    if (ledgerFile) await fs.appendFile(ledgerFile, `| ${c.id} | ${new Date().toISOString()} | Completed | runtime=${runtime} model=${state.model ?? ''} | ${outcome.result}${outcome.error ? ` — ${String(outcome.error).replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 300)}` : ''} | ${outDir} |\n`)
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
