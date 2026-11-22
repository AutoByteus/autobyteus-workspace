#!/usr/bin/env node
// org-teams-follow-definition (autobyteus-29) API/E2E round 1: the Org view in the real desktop renderer against a real node.
// Ticket-owned probe (not a package script): the journey belongs to this ticket's validation.
//
// Stack (probe-owned, removed in `finally`): the built node (`autobyteus-server-ts/dist/app.js`) on a temp data root and
// HOME, with the scripted Antigravity CLI (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`: `CALL_TOOL:{…}` /
// `CALL_TOOLS:[…]` call real agent tools, a call with `untilFile` waits for a gate file, anything else is answered `OK`),
// `nuxt dev` (the desktop renderer) and fresh headless Chromium. No model, no keys. A local agent package holds the Org
// (`/concierge` + Team `/team`: lead, writer) and a second Team; the probe edits `team-config.json` / `org-config.json` on
// disk while the Org view is open (the package folder watcher reloads them).
//
//   OCU-01 (AC-001, REQ-006) the Org run in the Workspaces tree: the concierge row, the /team row and its members, Offline.
//   OCU-02 (AC-003) the concierge hands off to /team/writer, which hands back: the Org view shows both messages.
//   OCU-03 (AC-002) the Team gains a member: its row appears (Offline) without a reload.
//   OCU-04 (AC-002, REQ-002) a Team member removed while busy: its row stays, tagged "Leaving", until it finishes; then goes.
//   OCU-05 (AC-008, REQ-009) a second Team is mounted (its row appears Offline); /team is unmounted while its lead is busy: the
//          /team row is tagged "Leaving"; after it finishes, the row goes.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`; Chromium (--browser-executable, default /usr/bin/chromium).
// Run: node tickets/in-progress/org-teams-follow-definition/probes/org-container-ui-probe.mjs --output-dir <fresh dir>
import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
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
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `org-container-ui-probe-${Date.now()}`)))
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/chromium')
const fakeAgy = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const u = randomUUID().slice(0, 6)
const ids = { concierge: `ocu-concierge-${u}`, lead: `ocu-lead-${u}`, writer: `ocu-writer-${u}`, editor: `ocu-editor-${u}`, lead2: `ocu-lead2-${u}` }
const teamName = `ocu-team-${u}`
const team2Name = `ocu-team2-${u}`
const orgName = `ocu-org-${u}`
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

let ownedRoot, dataRoot, packageRoot, backendUrl, frontUrl, browser, orgRunId, orgDefinitionId, workspace
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const container = () => readJson(path.join(dataRoot, 'memory', 'agent_orgs', orgRunId, 'agent_org_run_execution_tree.json'))
const unitRun = async (address) => (await container()).rootOrg.units.find((unit) => unit.address === address)?.runId
const teamTree = async (teamRunId) => readJson(path.join(dataRoot, 'memory', 'agent_teams', teamRunId, 'team_run_execution_tree.json'))
const memberRun = async (orgAddress) => {
  const [, unit, name] = orgAddress.split('/')
  const tree = await teamTree(await unitRun(`/${unit}`))
  return tree.rootTeam.members.find((m) => m.address === `/${name}`)?.agentRunId
}
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const member = (memberName, ref) => ({ memberName, ref, refScope: 'shared' })
const orgMember = (memberName, ref, refType) => ({ memberName, ref, refType, refScope: 'shared' })
let teamConfig, orgConfig
const writeTeam = async (next) => { teamConfig = next; await fs.writeFile(path.join(packageRoot, 'agent-teams', teamName, 'team-config.json'), `${JSON.stringify(next, null, 2)}\n`) }
const writeOrg = async (next) => { orgConfig = next; await fs.writeFile(path.join(packageRoot, 'agent-orgs', orgName, 'org-config.json'), `${JSON.stringify(next, null, 2)}\n`) }
const gatePath = (name) => path.join(ownedRoot, 'gates', `${name}-${u}`)
const openGate = (name) => fs.writeFile(gatePath(name), 'open\n')

/** The Org's own stream (the backend): a scripted message to one of its agents. */
const orgSocket = async () => {
  const socket = new WS(access.ownerSocketUrl(`${backendUrl.replace('http', 'ws')}/ws/agent-org/${orgRunId}`))
  const frames = []
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
  await waitFor('Org stream snapshot', () => frames.some((f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'), 30000)
  const send = (agentRunId, content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent_org', root_run_id: orgRunId,
    target_agent_run_id: agentRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }))
  const busy = (agentRunId, from) => frames.slice(from).filter((f) => f.type === 'ROOT_EXECUTION_EVENT').some((f) => {
    const e = f.payload.event
    return e.kind === 'agent_presentation' && e.agent_run_id === agentRunId && e.message?.type === 'AGENT_STATUS' && JSON.stringify(e.message.payload).includes('"running"')
  })
  return { socket, frames, send, busy, close: () => socket.terminate() }
}
const orgConversation = async (address, agentRunId) => JSON.stringify((await gql('query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}',
  { id: orgRunId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation ?? null)

// The rendered Org: its run row in the Workspaces tree, then its member tree (AgentOrgRunMemberTree).
const orgTree = (page) => page.locator(`[data-test="agent-org-run-children-${orgRunId}"]`)
const treeRows = (page) => orgTree(page).locator('[role="treeitem"]').evaluateAll((rows) => rows.map((row) => ({
  test: row.getAttribute('data-test'), label: row.getAttribute('aria-label'), text: row.innerText.replace(/\s+/g, ' ').trim(),
  status: row.getAttribute('data-status'), level: row.getAttribute('aria-level'), expanded: row.getAttribute('aria-expanded'),
  leaving: Boolean(row.querySelector('[data-test="workspace-member-leaving"]')) })))
const rowOf = (rows, test) => rows.find((r) => r.test === test)
const expandTeams = async (page) => {
  for (const team of await orgTree(page).locator('[data-test^="agent-org-team-row-"][aria-expanded="false"]').all()) { await team.click().catch(() => {}); await delay(500) }
}
const openOrgRun = async (page) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const run = page.locator(`[data-test="agent-org-run-open-${orgRunId}"]`)
  await waitFor('Org run row', async () => {
    if (await run.isVisible().catch(() => false)) return true
    const folders = page.locator('[data-test="workspace-row"]')
    for (let i = 0; i < await folders.count(); i += 1) {
      const row = folders.nth(i); const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
      if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
    }
    const group = page.locator(`[data-test="agent-org-definition-${orgDefinitionId}"]`).first()
    if (await group.isVisible().catch(() => false) && await run.count() === 0) { await group.click(); await delay(600) }
    return run.isVisible().catch(() => false)
  }, 60000, 1500)
  if (await run.getAttribute('aria-expanded') !== 'true') { await run.click(); await delay(1500) }
  await waitFor('Org member tree', async () => (await treeRows(page)).length > 0, 60000, 1000)
  await expandTeams(page)
}

const cases = []
const defineCase = (id, fn) => cases.push({ id, fn })

defineCase('OCU-01', async (page) => {
  await openOrgRun(page)
  const rows = await treeRows(page)
  await shot(page, 'OCU-01-org-tree')
  const concierge = await unitRun('/concierge')
  const team = await unitRun('/team')
  const lead = await memberRun('/team/lead'); const writer = await memberRun('/team/writer')
  step('Org tree rendered', { rows })
  assert(rowOf(rows, `agent-org-agent-row-${concierge}`), 'the concierge row', rows)
  assert(rowOf(rows, `agent-org-team-row-${team}`), 'the /team row', rows)
  assert(rowOf(rows, `agent-org-agent-row-${lead}`) && rowOf(rows, `agent-org-agent-row-${writer}`), 'the Team members', rows)
  assert([concierge, lead, writer].every((id) => rowOf(rows, `agent-org-agent-row-${id}`).status === 'offline'), 'members are Offline', rows)
  return { rows }
})

defineCase('OCU-02', async (page) => {
  const stream = await orgSocket()
  try {
    const concierge = await unitRun('/concierge')
    const writer = await memberRun('/team/writer')
    const there = `UI-THERE-${u}`; const back = `UI-BACK-${u}`
    const reply = `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/concierge', content: back } })}`
    stream.send(concierge, `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/team/writer', content: `${there} ${reply}` } })}`)
    await waitFor('the writer handed back', async () => (await orgConversation('/concierge', concierge)).includes(`received a message`) && (await orgConversation('/concierge', concierge)).includes(back), 90000)
    await page.locator(`[data-test="agent-org-agent-row-${concierge}"]`).first().click(); await delay(2000)
    const tab = page.getByText('Team', { exact: true }).first()
    const tabFound = await tab.isVisible().catch(() => false)
    if (tabFound) { await tab.click(); await delay(1500) }
    const body = await page.locator('body').innerText()
    await shot(page, 'OCU-02-org-messages')
    const shown = { there: body.includes(there), back: body.includes(back) }
    step('Org view messages', { tabFound, shown, writer })
    assert(shown.there && shown.back, 'both messages are shown in the Org view', { shown, excerpt: body.slice(0, 2000) })
    return { tabFound, shown }
  } finally { stream.close() }
})

defineCase('OCU-03', async (page) => {
  await openOrgRun(page)
  await writeTeam({ ...teamConfig, members: [...teamConfig.members, member('editor', ids.editor)] })
  const editor = await waitFor('the editor joined the Team unit', async () => memberRun('/team/editor'), 60000)
  const rows = await waitFor('the editor row appears without a reload', async () => { await expandTeams(page); const r = await treeRows(page); return rowOf(r, `agent-org-agent-row-${editor}`) ? r : null }, 60000)
  await shot(page, 'OCU-03-new-member')
  step('new member row', { rows })
  assert(rowOf(rows, `agent-org-agent-row-${editor}`).status === 'offline', 'the new member is Offline', rows)
  return { rows }
})

defineCase('OCU-04', async (page) => {
  await openOrgRun(page)
  const stream = await orgSocket()
  try {
    const writer = await memberRun('/team/writer')
    const from = stream.frames.length
    stream.send(writer, `CALL_TOOLS:${JSON.stringify([{ name: 'send_message_to', arguments: { recipient_address: '/concierge', content: `LATE-${u}` }, untilFile: gatePath('ocu04') }])}`)
    await waitFor('the writer is busy', async () => stream.busy(writer, from), 60000)
    await writeTeam({ ...teamConfig, members: teamConfig.members.filter((m) => m.memberName !== 'writer') })
    const team = await unitRun('/team')
    await waitFor('the writer is a leaving former member', async () => (await teamTree(team)).rootTeam.formerMembers?.some((m) => m.agentRunId === writer && m.leaving), 60000)
    const whileLeaving = await waitFor('the writer row is tagged Leaving', async () => { await expandTeams(page); const r = await treeRows(page); return rowOf(r, `agent-org-agent-row-${writer}`)?.leaving ? r : null }, 30000)
      .catch(async () => treeRows(page))
    await shot(page, 'OCU-04-a-while-leaving')
    const writerRow = rowOf(whileLeaving, `agent-org-agent-row-${writer}`) ?? null
    step('rows while the writer is leaving', { whileLeaving, writerRow })
    await openGate('ocu04')
    await waitFor('the writer was released', async () => !(await teamTree(team)).rootTeam.formerMembers?.some((m) => m.leaving), 60000)
    const afterRelease = await waitFor('the writer row goes', async () => { const r = await treeRows(page); return rowOf(r, `agent-org-agent-row-${writer}`) ? null : r }, 30000).catch(async () => treeRows(page))
    await shot(page, 'OCU-04-b-after-release')
    assert(!rowOf(afterRelease, `agent-org-agent-row-${writer}`), 'the released writer row is gone', afterRelease)
    assert(writerRow?.leaving === true, 'the leaving writer row stays, tagged Leaving (autobyteus-22 AC-003 in the Org view)', { writerRow, whileLeaving })
    return { whileLeaving, afterRelease }
  } finally { stream.close() }
})

defineCase('OCU-05', async (page) => {
  await openOrgRun(page)
  await writeOrg({ ...orgConfig, members: [...orgConfig.members, orgMember('team2', team2Name, 'agent_team')] })
  const team2 = await waitFor('the second Team joined', async () => unitRun('/team2'), 60000)
  const mounted = await waitFor('the /team2 row appears', async () => { await expandTeams(page); const r = await treeRows(page); return rowOf(r, `agent-org-team-row-${team2}`) ? r : null }, 60000)
  await shot(page, 'OCU-05-a-mounted')
  const stream = await orgSocket()
  try {
    const team = await unitRun('/team')
    const lead = await memberRun('/team/lead')
    const from = stream.frames.length
    stream.send(lead, `CALL_TOOLS:${JSON.stringify([{ name: 'send_message_to', arguments: { recipient_address: '/concierge', content: `LATE-UNIT-${u}` }, untilFile: gatePath('ocu05') }])}`)
    await waitFor('the lead is busy', async () => stream.busy(lead, from), 60000)
    await writeOrg({ ...orgConfig, members: orgConfig.members.filter((m) => m.memberName !== 'team'), handoffs: [] })
    await waitFor('/team is a leaving former unit', async () => (await container()).rootOrg.formerUnits.some((unit) => unit.runId === team && unit.leaving), 60000)
    const whileLeaving = await waitFor('the /team row is tagged Leaving', async () => { const r = await treeRows(page); return rowOf(r, `agent-org-team-row-${team}`)?.leaving ? r : null }, 30000).catch(async () => treeRows(page))
    await shot(page, 'OCU-05-b-unit-leaving')
    const teamRow = rowOf(whileLeaving, `agent-org-team-row-${team}`) ?? null
    step('rows while /team is leaving', { whileLeaving, teamRow })
    await openGate('ocu05')
    await waitFor('/team was released', async () => !(await container()).rootOrg.formerUnits.some((unit) => unit.leaving), 60000)
    const afterRelease = await waitFor('the /team row goes', async () => { const r = await treeRows(page); return rowOf(r, `agent-org-team-row-${team}`) ? null : r }, 30000)
    await shot(page, 'OCU-05-c-released')
    assert(rowOf(mounted, `agent-org-team-row-${team2}`), 'the mounted Team row', mounted)
    assert(teamRow?.leaving === true, 'the unmounted busy /team row is tagged Leaving', { teamRow, whileLeaving })
    return { mounted, whileLeaving, afterRelease }
  } finally { stream.close() }
})

let exitCode = 0
try {
  await fs.mkdir(outDir, { recursive: true })
  const base = path.join(os.homedir(), '.autobyteus-e2e')
  await fs.mkdir(base, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(base, 'org-container-ui-probe-'))
  dataRoot = path.join(ownedRoot, 'data'); packageRoot = path.join(ownedRoot, 'package'); workspace = path.join(ownedRoot, 'workspace')
  for (const dir of [path.join(dataRoot, 'db'), workspace, path.join(ownedRoot, 'home'), path.join(ownedRoot, 'gates')]) await fs.mkdir(dir, { recursive: true })
  for (const id of Object.values(ids)) {
    const dir = path.join(packageRoot, 'agents', id); await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${id}\ndescription: Org container UI probe agent\nrole: assistant\n---\n\nInstructions of ${id}.\n`)
    await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [] }, null, 2))
  }
  for (const name of [teamName, team2Name]) {
    const dir = path.join(packageRoot, 'agent-teams', name); await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'team.md'), `---\nname: ${name}\ndescription: Org container UI probe team\n---\n\nWork together.\n`)
  }
  await fs.writeFile(path.join(packageRoot, 'agent-teams', team2Name, 'team-config.json'), JSON.stringify({ coordinatorMemberName: 'lead2', members: [member('lead2', ids.lead2)], handoffs: [], avatarUrl: null }, null, 2))
  await writeTeam({ coordinatorMemberName: 'lead', members: [member('lead', ids.lead), member('writer', ids.writer)], handoffs: [], avatarUrl: null })
  await fs.mkdir(path.join(packageRoot, 'agent-orgs', orgName), { recursive: true })
  await fs.writeFile(path.join(packageRoot, 'agent-orgs', orgName, 'org.md'), `---\nname: ${orgName}\ndescription: Org container UI probe org\n---\n\nFollow requests.\n`)
  await writeOrg({ members: [orgMember('concierge', ids.concierge, 'agent'), orgMember('team', teamName, 'agent_team')],
    handoffs: [{ from: '/concierge', to: '/team', rules: ['Send requests to the team.'] }], avatarUrl: null, defaultLaunchConfig: null })
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
  await gql('mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }', { input: { sourceKind: 'LOCAL_PATH', source: packageRoot } })
  orgDefinitionId = (await gql('{ agentOrgDefinitions { id name } }')).agentOrgDefinitions.find((o) => o.name === orgName).id
  const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: orgDefinitionId,
    rootConfiguration: { workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun
  assert(created.success, created.message)
  orgRunId = created.agentOrgRunId
  step('Org run created', { orgRunId, units: (await container()).rootOrg.units })
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
  console.error(`[org-container-ui-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'org-container-ui-evidence.json'), access.redactCredentials(JSON.stringify(evidence, null, 2)))
  process.exitCode = exitCode
}
