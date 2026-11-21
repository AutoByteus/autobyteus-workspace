#!/usr/bin/env node
// team-run-follows-definition AC-009 (REQ-008), AC-008 and design note N-8 in the real desktop renderer against a real node.
// Ticket-owned probe (not a package script): the journey belongs to this ticket's validation.
//
// Stack (probe-owned, removed in `finally`): the built node (`autobyteus-server-ts/dist/app.js`) on a temp data root and
// HOME, with the scripted Antigravity CLI (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`: `CALL_TOOL:{…}` calls the
// real agent tool, `HOLD_TURN` keeps a turn running, anything else is answered `OK`), `nuxt dev` (the desktop renderer)
// and fresh headless Chromium. No model, no keys. A local agent package holds the Team; the probe edits its
// `team-config.json` on disk while the Team view is open (the package folder watcher reloads it).
//
//   TFU-01 (AC-009) the open Team view: lead and writer shown; the writer posted to the lead earlier. The definition gains a
//          reviewer and loses the writer: without a reload the reviewer row appears (Offline) and the writer row goes; the
//          user selects the reviewer and sends from the composer: it starts and answers; the Team tab still shows the
//          writer's earlier message, named by its address.
//   TFU-02 (AC-008) the coordinator becomes the reviewer: after a fresh load of the Team view the reviewer is the focused
//          member and carries the coordinator mark; a message from the composer goes to it.
//   TFU-03 (N-8, DEC-002) the reviewer holds a turn and is removed: its row shows "Leaving" while the sidebar's run-tree rows
//          already drop it (noted, by design); interrupted, it is released and its row goes.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`; Chromium (--browser-executable, default /usr/bin/chromium).
// Run: node tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs --output-dir <fresh dir>
import fs from 'node:fs/promises'
import { createWriteStream, existsSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const probeDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(probeDir, '../../../..')
const webDir = path.join(repoRoot, 'autobyteus-web')
const serverDir = path.join(repoRoot, 'autobyteus-server-ts')
const access = await import(pathToFileURL(path.join(webDir, 'tests/e2e/fixtures/probe-node-access.mjs')).href)
access.attachToProbeProcess()
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const WS = createRequire(path.join(serverDir, 'package.json'))('ws')

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback }
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `team-follows-ui-probe-${Date.now()}`)))
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/chromium')
const fakeAgy = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const u = randomUUID().slice(0, 6)
const ids = { lead: `tfu-lead-${u}`, writer: `tfu-writer-${u}`, reviewer: `tfu-reviewer-${u}` }
const teamName = `tfu-team-${u}`
const evidence = { startedAt: new Date().toISOString(), steps: [], processes: [], cleanup: [], browserErrors: [], cases: {} }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const step = (text, details) => { evidence.steps.push({ at: new Date().toISOString(), text, details: details ?? null }); console.log(`  · ${text}`) }
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.unref(); s.on('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const waitFor = async (label, fn, timeout = 90000, interval = 500) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}
const baseEnv = () => Object.fromEntries(['PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`), { flags: 'a' })
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
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

let ownedRoot, dataRoot, packageRoot, configFile, backendUrl, frontUrl, browser, teamRunId, teamDefinitionId
const runOf = {}
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const tree = async () => JSON.parse(await fs.readFile(path.join(dataRoot, 'memory', 'agent_teams', teamRunId, 'team_run_execution_tree.json'), 'utf8'))
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
let teamConfig
const writeConfig = async (next) => { teamConfig = next; await fs.writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`) }
const member = (memberName, ref) => ({ memberName, ref, refScope: 'shared' })

/** One command on the Team's own stream (the backend), e.g. a scripted message or an interrupt; waits for `until` frames. */
const teamSocket = async () => {
  const socket = new WS(access.ownerSocketUrl(`${backendUrl.replace('http', 'ws')}/ws/agent-team/${teamRunId}`))
  const frames = []
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
  await waitFor('team stream snapshot', () => frames.some((f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT'), 30000)
  const send = (agentRunId, content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: agentRunId, content, message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`, context_file_paths: [], image_urls: [] } }))
  const interrupt = (agentRunId) => socket.send(JSON.stringify({ type: 'INTERRUPT_GENERATION', payload: { agent_run_id: agentRunId, command_id: randomUUID() } }))
  return { socket, frames, send, interrupt, close: () => socket.terminate() }
}
const conversationText = async (agentRunId) => JSON.stringify((await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation ?? null)

// The rendered Team view.
// The app lists a running Team's members as rows of the sidebar's run tree (WorkspaceStableExecutionRow).
const rowPrefix = () => `workspace-team-member-${teamRunId}-`
const memberRows = async (page) => page.locator(`[data-test^="${rowPrefix()}/"]`).evaluateAll((rows, prefix) => rows.map((row) => ({
  address: row.getAttribute('data-test').slice(prefix.length), text: row.innerText.replace(/\s+/g, ' ').trim(),
  current: row.getAttribute('aria-current') ?? row.className.includes('bg-indigo') })), rowPrefix())
const hasRow = (rows, address) => rows.some((r) => r.address === address)
/** Anything the page shows about a leaving member: the "Leaving" tag (TeamMembersPanel) or the word. */
const leavingMarks = (page) => page.evaluate(() => ({ tags: document.querySelectorAll('[data-testid="team-member-leaving"]').length,
  membersPanels: document.querySelectorAll('[role="tree"][aria-label="Team members"]').length, word: /Leaving/.test(document.body.innerText) }))
const headerText = (page) => page.locator('main').first().evaluate((main) => (main.querySelector('header, h1, h2, [class*="header"]')?.textContent ?? main.innerText.slice(0, 80)).replace(/\s+/g, ' ').trim())
const dataTests = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('[data-test],[data-testid]')].map((e) => e.getAttribute('data-test') ?? e.getAttribute('data-testid')))])
const composer = (page) => page.locator('main textarea[aria-autocomplete="list"]').last()
const sendFromComposer = async (page, text) => {
  const input = composer(page); await input.waitFor({ timeout: 60000 })
  await input.click(); await page.keyboard.type(text); await delay(300); await page.keyboard.press('Enter')
}
const expandWorkspaces = async (page) => {
  const folders = page.locator('[data-test="workspace-row"]')
  for (let i = 0; i < await folders.count(); i += 1) {
    const row = folders.nth(i); const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
    if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
  }
}
const openTeamRun = async (page) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const row = page.locator(`[data-test="workspace-team-row-${teamRunId}"]`)
  await waitFor('team run row', async () => {
    if (await row.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    const group = page.locator(`[data-test="workspace-team-definition-row-${teamDefinitionId}"]`).first()
    if (await group.isVisible().catch(() => false) && await row.count() === 0) { await group.click(); await delay(600) }
    return row.isVisible().catch(() => false)
  }, 60000, 1500)
  await row.click(); await waitFor('member rows', async () => (await memberRows(page)).length > 0, 60000, 1000); await delay(2000)
}
const sidebarText = (page) => page.locator('aside, nav').first().innerText().catch(() => '')

const cases = []
const defineCase = (id, fn) => cases.push({ id, fn })

defineCase('TFU-01', async (page) => {
  await openTeamRun(page)
  const before = await memberRows(page)
  await shot(page, 'TFU-01-a-before')
  step('team view open', { before, dataTests: (await dataTests(page)).slice(0, 120) })
  assert(hasRow(before, '/lead') && hasRow(before, '/writer'), 'lead and writer are shown', before)
  await writeConfig({ ...teamConfig, members: [member('lead', ids.lead), member('reviewer', ids.reviewer)],
    handoffs: [{ from: '/lead', to: '/reviewer', rules: ['Review drafts.'] }] })
  const after = await waitFor('reviewer row shown and writer row gone, without a reload', async () => {
    const rows = await memberRows(page)
    return hasRow(rows, '/reviewer') && !hasRow(rows, '/writer') ? rows : null
  }, 60000)
  await shot(page, 'TFU-01-b-after-change')
  step('rows after the change (no reload)', { after })
  const reviewerRow = after.find((r) => r.address === '/reviewer')
  const t = await tree(); runOf['/reviewer'] = t.rootTeam.members.find((m) => m.address === '/reviewer').agentRunId
  const reviewerStatusBefore = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId })).getTeamRunResumeConfig
  await page.locator(`[data-test="${rowPrefix()}/reviewer"]`).first().click(); await delay(1500)
  step('reviewer selected', { header: await headerText(page), reviewerRow })
  await sendFromComposer(page, 'Hello reviewer, please answer.')
  await waitFor('the reviewer started and answered', async () => (await conversationText(runOf['/reviewer'])).includes('"OK"'), 90000)
  await waitFor('the answer is rendered', async () => (await page.locator('main').innerText()).includes('OK'), 30000)
  await shot(page, 'TFU-01-c-reviewer-answered')
  // The Team tab (filtered by the focused member) keeps the removed writer's earlier message to the lead.
  await page.locator(`[data-test="${rowPrefix()}/lead"]`).first().click(); await delay(1500)
  const tab = page.getByText('Team', { exact: true }).first()
  const tabFound = await tab.isVisible().catch(() => false)
  if (tabFound) { await tab.click(); await delay(1500) }
  const mainText = await page.locator('body').innerText()
  await shot(page, 'TFU-01-d-team-tab')
  const writerMessageShown = mainText.includes(`WRITER-NOTE-${u}`)
  step('Team tab', { tabFound, writerMessageShown, writerAddressShown: /\/?writer/.test(mainText), excerpt: mainText.slice(0, 1500) })
  assert(writerMessageShown, "the removed writer's earlier message is still in the Team tab", mainText.slice(0, 2000))
  return { before, after, reviewerRow, writerMessageShown, reviewerOfflineBeforeMessage: JSON.stringify(reviewerStatusBefore).slice(0, 300) }
})

defineCase('TFU-02', async (page) => {
  await writeConfig({ ...teamConfig, coordinatorMemberName: 'reviewer' })
  await waitFor('stored coordinator', async () => (await tree()).rootTeam.coordinatorAddress === '/reviewer', 60000)
  await openTeamRun(page)
  const rows = await memberRows(page)
  await shot(page, 'TFU-02-a-new-coordinator')
  const header = await headerText(page)
  step('fresh load after the coordinator change', { rows, header })
  assert(/reviewer/i.test(header), 'the new coordinator is the focused member (the chat header names it)', { header, rows })
  const before = (await conversationText(runOf['/reviewer'])).split('"OK"').length
  await sendFromComposer(page, 'Hello coordinator.')
  await waitFor('the coordinator answered the composer message', async () => (await conversationText(runOf['/reviewer'])).split('"OK"').length > before, 90000)
  await shot(page, 'TFU-02-b-coordinator-answered')
  await writeConfig({ ...teamConfig, coordinatorMemberName: 'lead' })
  await waitFor('coordinator back to the lead', async () => (await tree()).rootTeam.coordinatorAddress === '/lead', 60000)
  return { rows, header }
})

defineCase('TFU-03', async (page) => {
  await openTeamRun(page)
  const stream = await teamSocket()
  try {
    // The user focuses the reviewer and starts a long turn from the composer; the definition then removes the reviewer.
    await page.locator(`[data-test="${rowPrefix()}/reviewer"]`).first().click(); await delay(1500)
    await sendFromComposer(page, 'HOLD_TURN')
    await waitFor('the reviewer is busy', () => stream.frames.some((f) => f.type === 'AGENT_STATUS' && f.payload?.agent_run_id === runOf['/reviewer'] && f.payload?.status === 'running'), 60000)
    await shot(page, 'TFU-03-a-busy')
    await writeConfig({ ...teamConfig, members: [member('lead', ids.lead)], handoffs: [] })
    await waitFor('the server shows the reviewer leaving', () => stream.frames.some((f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT'
      && JSON.stringify(f.payload).includes('"leaving":true')), 60000)
    await delay(3000)
    const rowsWhileLeaving = await memberRows(page)
    const marks = await leavingMarks(page)
    const header = await headerText(page)
    const stopButton = page.locator('main button[aria-label*="Stop" i], main button[title*="Stop" i]').first()
    const stopVisible = await stopButton.isVisible().catch(() => false)
    await shot(page, 'TFU-03-b-while-leaving')
    step('while the reviewer is leaving (server snapshot says leaving)', { rowsWhileLeaving, marks, header, stopVisible })
    let releasedBy = 'none'
    if (stopVisible) { await stopButton.click(); releasedBy = 'the composer Stop' } else { stream.interrupt(runOf['/reviewer']); releasedBy = 'the team stream interrupt (no Stop shown)' }
    await waitFor('the reviewer is released', async () => !JSON.stringify((await tree()).rootTeam.members).includes('/reviewer')
      && stream.frames.filter((f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT').at(-1) && !JSON.stringify(stream.frames.filter((f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT').at(-1).payload).includes(runOf['/reviewer']), 60000)
    await delay(2000)
    const rowsAfter = await memberRows(page)
    await shot(page, 'TFU-03-c-released')
    const result = { rowsWhileLeaving, reviewerRowWhileLeaving: hasRow(rowsWhileLeaving, '/reviewer'), marks, header, stopVisible, releasedBy, rowsAfter,
      releasedRowGone: !hasRow(rowsAfter, '/reviewer') }
    evidence.cases['TFU-03-observed'] = result
    // Design § Member States (visibility, AR-004): a leaving member stays in the open Team view, tagged "Leaving", until it stops.
    assert(result.reviewerRowWhileLeaving || marks.tags > 0, 'design: the leaving member is shown, tagged Leaving, until it stops (no row and no tag in the rendered app)', result)
    return result
  } finally { stream.close() }
})

let exitCode = 0
try {
  await fs.mkdir(outDir, { recursive: true })
  assert(existsSync(chrome), `Chromium not found: ${chrome}`)
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'team-follows-ui-probe-')))
  dataRoot = path.join(ownedRoot, 'server-data'); packageRoot = path.join(ownedRoot, 'package')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true }); await fs.mkdir(path.join(ownedRoot, 'home'), { recursive: true })
  const workspace = path.join(ownedRoot, 'workspace'); await fs.mkdir(workspace, { recursive: true })
  for (const id of Object.values(ids)) {
    const dir = path.join(packageRoot, 'agents', id); await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${id}\ndescription: Team follows UI probe agent\nrole: assistant\n---\n\nInstructions of ${id}.\n`)
    await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [] }))
  }
  const teamDir = path.join(packageRoot, 'agent-teams', teamName); await fs.mkdir(teamDir, { recursive: true })
  await fs.writeFile(path.join(teamDir, 'team.md'), `---\nname: ${teamName}\ndescription: Team follows UI probe\n---\n\nWork together.\n`)
  configFile = path.join(teamDir, 'team-config.json')
  await writeConfig({ coordinatorMemberName: 'lead', members: [member('lead', ids.lead), member('writer', ids.writer)], handoffs: [{ from: '/lead', to: '/writer', rules: ['Draft.'] }], avatarUrl: null })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn(path.join(serverDir, 'node_modules/.bin/prisma'), ['migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const env = { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl,
    AUTOBYTEUS_ALLOWED_ORIGINS: frontUrl, DISABLE_HTTP_REQUEST_LOGS: 'true', LMSTUDIO_HOSTS: 'http://127.0.0.1:1', ANTIGRAVITY_CLI_COMMAND: fakeAgy, AGY_FAKE_CASE: 'linked_skills' }
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, access.withNodeCredential(env))
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 1000)
  spawnOwned('frontend', path.join(webDir, 'node_modules/.bin/nuxt'), ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), HOME: process.env.HOME, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 300000, 1000)
  // Package, Team run, earlier work: the writer posts to the lead (the Team tab's message), the lead answers.
  await gql('mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }', { input: { sourceKind: 'LOCAL_PATH', source: packageRoot } })
  teamDefinitionId = (await gql('{ agentTeamDefinitions { id name } }')).agentTeamDefinitions.find((t) => t.name === teamName).id
  const launch = { workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' }
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: ids.lead, ...launch }, { memberAddress: '/writer', agentDefinitionId: ids.writer, ...launch }] } })).createAgentTeamRun
  assert(created.success, created.message)
  teamRunId = created.teamRunId
  for (const m of (await tree()).rootTeam.members) runOf[m.address] = m.agentRunId
  const seed = await teamSocket()
  seed.send(runOf['/writer'], `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/lead', content: `WRITER-NOTE-${u}` } })}`)
  await waitFor("the writer's message reached the lead", async () => (await conversationText(runOf['/lead'])).includes(`WRITER-NOTE-${u}`), 90000)
  seed.close()
  step('seeded', { teamRunId, runOf })
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  await access.attachToBrowserContext(context)
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => evidence.browserErrors.push(e.message))
  for (const route of ['/chat', '/workspace']) { await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000) }
  for (const entry of cases) {
    const started = Date.now()
    try { evidence.cases[entry.id] = { result: 'Pass', details: await entry.fn(page), ms: Date.now() - started } }
    catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${entry.id}-failure.png`) }).catch(() => {})
      evidence.cases[entry.id] = { result: 'Fail', error: error.message, details: error.details ?? null, ms: Date.now() - started }
    }
    console.log(`${entry.id} ${evidence.cases[entry.id].result}${evidence.cases[entry.id].error ? ` — ${evidence.cases[entry.id].error}` : ''}`)
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[team-follows-ui-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'team-follows-ui-evidence.json'), access.redactCredentials(JSON.stringify(evidence, null, 2)))
  process.exitCode = exitCode
}
