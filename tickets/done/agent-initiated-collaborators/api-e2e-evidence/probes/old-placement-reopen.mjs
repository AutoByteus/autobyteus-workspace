#!/usr/bin/env node
// AC-013 "existing stored copies open where they were recorded" (agent-initiated-collaborators round 3).
// 1) The round-2 server (old rule: a copy is hosted by the delegator's team) records, in an owned temp data root:
//    - Org: a mounted-team member's copy of a top-level (catalog) agent  → rootOrg.members[squad].taskExecutions
//    - Agent root: a collaborator-team member's copy of a top-level agent → collaborators[squad].taskExecutions
// 2) The round-3 server (new rule) opens the same data: the stored copies stay where they were recorded and answer
//    when messaged; a new copy by the same member goes to the top level (REQ-012).
// Usage (from autobyteus-server-ts so `ws` resolves):
//   node <file> --old-server /tmp/aic-r2old/autobyteus-server-ts --new-server <worktree>/autobyteus-server-ts [--model haiku]
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { openSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const WebSocket = require('ws')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
// Real paths: the server only starts when argv[1] matches its own real module path (/tmp is a symlink on macOS).
const oldServer = await fs.realpath(arg('old-server')); const newServer = await fs.realpath(arg('new-server')); const model = arg('model', 'haiku')
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'old-placement-reopen')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const report = { checks: [], paths: {} }
const check = (ok, label, details) => { report.checks.push({ ok: Boolean(ok), label, details: details ?? null }); console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` ${JSON.stringify(details ?? null).slice(0, 500)}`}`) }
const waitFor = async (label, fn, timeout = 300000, interval = 1000) => {
  console.log(`  … ${label}`)
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { last = await fn(); if (last) return last } catch (e) { last = e.message } await delay(interval) }
  throw new Error(`Timed out waiting for ${label}: ${String(JSON.stringify(last) ?? last).slice(0, 300)}`)
}
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))

await fs.mkdir(outDir, { recursive: true })
const ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aic-old-placement-'))
const dataRoot = path.join(ownedRoot, 'server-data')
await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
const port = await freePort(); const backend = `http://127.0.0.1:${port}`
await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backend}\n`)
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'aic-old-placement-ws-'))
let child = null
const start = async (serverDir, label) => {
  await new Promise((resolve, reject) => {
    const p = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    p.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`migrate ${code}`))))
  })
  const logFd = openSync(path.join(outDir, `${label}.log`), 'a')
  child = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], { cwd: serverDir, detached: true,
    env: { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backend, DISABLE_HTTP_REQUEST_LOGS: 'true' }, stdio: ['ignore', logFd, logFd] })
  console.log(`  [${label}] ${child.spawnargs.join(' ')}`)
  child.once('exit', (code, signal) => console.log(`  [${label}] exited code=${code} signal=${signal}`))
  child.once('error', (error) => console.log(`  [${label}] spawn error ${error.message}`))
  await waitFor(`${label} health`, async () => (await fetch(`${backend}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok, 120000, 500)
}
const stop = async () => {
  if (!child) return
  try { process.kill(-child.pid, 'SIGTERM') } catch {}
  await Promise.race([new Promise((r) => child.once('exit', r)), delay(15000)])
  try { process.kill(-child.pid, 'SIGKILL') } catch {}
  child = null
}
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data
}
const socket = async (urlPath) => {
  const ws = new WebSocket(`${backend.replace('http', 'ws')}${urlPath}`)
  const frames = []
  ws.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j) })
  return { ws, frames }
}
const pathsOf = (tree, runId) => {
  const found = []
  const visit = (v, at) => {
    if (Array.isArray(v)) return v.forEach((x, i) => visit(x, `${at}[${i}]`))
    if (!v || typeof v !== 'object') return
    if ([v.agentRunId, v.agent_run_id, v.teamRunId, v.team_run_id].includes(runId) && 'address' in v) found.push(at)
    for (const [k, x] of Object.entries(v)) visit(x, at ? `${at}.${k}` : k)
  }
  visit(tree, '')
  return found.filter((at) => /task_?[eE]xecutions\[\d+\]$/.test(at)).sort((a, b) => a.length - b.length)[0] ?? ''
}
const operator = (tool, args) => `Call ${tool} exactly once now with these exact JSON arguments: ${JSON.stringify(args)}. Do not call any other tool. Then reply with the single word DONE.`
const orgSend = (conn, orgRunId, target, content) => { const id = `aic-${randomUUID()}`; conn.ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: target, command_id: `cmd-${id}`, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:old:${id}` } })) }
const agentSend = (conn, hostRunId, target, content) => { const id = `aic-${randomUUID()}`; conn.ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent', root_run_id: hostRunId, target_agent_run_id: target, command_id: `cmd-${id}`, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:old:${id}` } })) }
const orgTree = async (orgRunId) => { const c = await socket(`/ws/agent-org/${orgRunId}`); const snap = await waitFor('org snapshot', async () => c.frames.find((f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'), 60000, 300); c.ws.close(); return snap.payload.root_org.execution_tree.rootOrg }
const agentView = async (runId) => (await gql('query($id:String!){ agentRunCollaboration(runId:$id) }', { id: runId })).agentRunCollaboration.root_agent
const startedBy = (frames, delegator, address) => frames.map((f) => f.type === 'ROOT_EXECUTION_EVENT' && f.payload?.event?.kind === 'task_execution_started' ? f.payload.event.execution : null)
  .find((x) => x && x.delegatorAgentRunId === delegator && x.address === address)

try {
  // ---- Phase 1: the round-2 server records copies by the old rule.
  await start(oldServer, 'old-server')
  const s = randomUUID().slice(0, 6)
  const operatorInstructions = 'You are a precise tool operator. Follow the user\'s instructions exactly, call only the tools named, and keep every reply to one short sentence. Never call get_handoff_rules unless told to.'
  const def = async (name, instructions, toolNames = []) => (await gql('mutation($i: CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, description: name, instructions, toolNames } })).createAgentDefinition.id
  const lead = await def(`Old Lead ${s}`, operatorInstructions); const mate = await def(`Old Mate ${s}`, operatorInstructions)
  const coord = await def(`Old Coord ${s}`, operatorInstructions, ['list_available_agents']); const pm = await def(`Old PM ${s}`, operatorInstructions, ['list_available_agents'])
  const echoName = `Old Echo ${s}`; await def(echoName, 'Reply to any message in one short sentence without tools.')
  const echoAddress = `/old_echo_${s}`
  const squad = (await gql('mutation($i: CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: `Old Squad ${s}`, description: 'squad', instructions: 'Work together.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'mate', ref: mate, refScope: 'SHARED' }], handoffs: [] } })).createAgentTeamDefinition.id
  const org = (await gql('mutation($i: CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: `Old Org ${s}`, description: 'org', instructions: 'Follow instructions.',
    members: [{ memberName: 'coordinator', ref: coord, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'squad', ref: squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition.id
  const orgRunId = (await gql('mutation($i: CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}', { i: { agentOrgDefinitionId: org,
    rootConfiguration: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace }, agentOverrides: [] } })).createAgentOrgRun.agentOrgRunId
  let orgConn = await socket(`/ws/agent-org/${orgRunId}`)
  const snap = await waitFor('org snapshot', async () => orgConn.frames.find((f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'), 60000, 300)
  const ids = new Map(); const visit = (ms) => { for (const m of ms ?? []) { if (m.agentRunId) ids.set(m.address, m.agentRunId); visit(m.members) } }; visit(snap.payload.root_org.execution_tree.rootOrg.members)
  const mountedLead = ids.get('/squad/lead')
  orgSend(orgConn, orgRunId, mountedLead, operator('delegate_task', { recipient_address: echoAddress, description: 'Reply in one short sentence.' }))
  const oldOrgCopy = await waitFor('old-rule Org copy', async () => startedBy(orgConn.frames, mountedLead, echoAddress))
  const oldOrgPath = pathsOf(await orgTree(orgRunId), oldOrgCopy.agentRunId)
  report.paths.oldOrg = oldOrgPath
  check(/^members\[\d+\]\.taskExecutions\[\d+\]$/.test(oldOrgPath), 'round-2 server: the mounted member\'s top-level copy is stored under its team (old rule)', oldOrgPath)

  const pmRunId = (await gql('mutation($i: CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: pm, workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: 'claude_agent_sdk' } })).createAgentRun.runId
  const pmConn = await socket(`/ws/agent/${pmRunId}`); await delay(1500)
  pmConn.ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: operator('send_message_to', { recipient_address: `/old_squad_${s}`, content: 'Reply with the single word READY. Do not call any tool.' }), context_file_paths: [], image_urls: [], message_id: `m-${randomUUID()}`, dedupe_key: `agent_run_input:old:${randomUUID()}`, command_id: randomUUID() } }))
  const collaborator = await waitFor('squad brought in', async () => (await agentView(pmRunId))?.execution_tree.collaborators.find((c) => c.address === `/old_squad_${s}`))
  const collaboratorLead = collaborator.members.find((m) => m.address.endsWith('/lead')).agentRunId
  const collabConn = await socket(`/ws/agent-collaboration/${pmRunId}`); await delay(1500)
  agentSend(collabConn, pmRunId, collaboratorLead, operator('delegate_task', { recipient_address: echoAddress, description: 'Reply in one short sentence.' }))
  const oldAgentCopy = await waitFor('old-rule Agent-root copy', async () => {
    const tree = (await agentView(pmRunId)).execution_tree
    const found = []; const v = (x) => { if (Array.isArray(x)) return x.forEach(v); if (!x || typeof x !== 'object') return; if (x.delegatorAgentRunId === collaboratorLead && x.address === echoAddress) found.push(x); Object.values(x).forEach(v) }; v(tree)
    return found[0]
  })
  const oldAgentPath = pathsOf((await agentView(pmRunId)).execution_tree, oldAgentCopy.agentRunId)
  report.paths.oldAgent = oldAgentPath
  check(/^collaborators\[\d+\]\.taskExecutions\[\d+\]$/.test(oldAgentPath), 'round-2 server: the collaborator member\'s top-level copy is stored inside the collaborator team (old rule)', oldAgentPath)
  await delay(8000)
  await gql('mutation($id:String!){ terminateAgentOrgRun(agentOrgRunId:$id){ success } }', { id: orgRunId })
  await gql('mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success } }', { id: pmRunId })
  orgConn.ws.close(); pmConn.ws.close(); collabConn.ws.close()
  await delay(3000)
  await stop()

  // ---- Phase 2: the round-3 server opens the same data.
  await start(newServer, 'new-server')
  const restored = await gql('mutation($id:String!){ restoreAgentOrgRun(agentOrgRunId:$id){ success message } }', { id: orgRunId })
  check(restored.restoreAgentOrgRun.success, 'round-3 server restores the stored Org run', restored.restoreAgentOrgRun.message)
  const newOrgPath = pathsOf(await orgTree(orgRunId), oldOrgCopy.agentRunId)
  report.paths.reopenedOrg = newOrgPath
  check(newOrgPath === oldOrgPath, 'Org: the stored copy opens where it was recorded', { oldOrgPath, newOrgPath })
  orgConn = await socket(`/ws/agent-org/${orgRunId}`); await delay(1500)
  orgSend(orgConn, orgRunId, oldOrgCopy.agentRunId, 'Reply with the single word WOKEN, without tools.')
  const woke = await waitFor('stored Org copy answers', async () => orgConn.frames.filter((f) => f.type === 'ROOT_EXECUTION_EVENT' && f.payload?.event?.kind === 'agent_presentation' && f.payload.event.agent_run_id === oldOrgCopy.agentRunId)
    .map((f) => f.payload.event.message?.payload?.delta ?? '').join('').includes('WOKEN') || null).catch(() => null)
  check(Boolean(woke), 'Org: the stored copy answers on the round-3 server')
  orgSend(orgConn, orgRunId, mountedLead, operator('delegate_task', { recipient_address: echoAddress, description: 'Reply in one short sentence.' }))
  const newCopy = await waitFor('new-rule Org copy', async () => orgConn.frames.map((f) => f.type === 'ROOT_EXECUTION_EVENT' && f.payload?.event?.kind === 'task_execution_started' ? f.payload.event.execution : null)
    .find((x) => x && x.delegatorAgentRunId === mountedLead && x.address === echoAddress && x.agentRunId !== oldOrgCopy.agentRunId))
  const newCopyPath = pathsOf(await orgTree(orgRunId), newCopy.agentRunId)
  report.paths.newOrgCopy = newCopyPath
  check(/^taskExecutions\[\d+\]$/.test(newCopyPath), 'Org: a new copy by the same member goes to rootOrg.taskExecutions (new rule) beside the stored one', newCopyPath)
  orgConn.ws.close()

  const stored = await agentView(pmRunId)
  const newAgentPath = pathsOf(stored.execution_tree, oldAgentCopy.agentRunId)
  report.paths.reopenedAgent = newAgentPath
  check(newAgentPath === oldAgentPath, 'Agent root: the stored copy opens where it was recorded', { oldAgentPath, newAgentPath })
  const agentConn = await socket(`/ws/agent-collaboration/${pmRunId}`); await delay(1500)
  agentSend(agentConn, pmRunId, oldAgentCopy.agentRunId, 'Reply with the single word WOKEN, without tools.')
  const wokeAgent = await waitFor('stored Agent-root copy answers', async () => {
    const c = (await gql('query($h:String!,$a:String!,$r:String!){ agentRunCollaborationMemberProjection(hostRunId:$h, memberAddress:$a, agentRunId:$r){ conversation } }', { h: pmRunId, a: oldAgentCopy.address, r: oldAgentCopy.agentRunId })).agentRunCollaborationMemberProjection.conversation
    return c.some((x) => x.role === 'assistant' && /WOKEN/.test(x.content ?? ''))
  }).catch(() => false)
  check(wokeAgent, 'Agent root: the stored copy answers on the round-3 server')
  agentConn.ws.close()
} catch (error) {
  check(false, `probe error: ${error.message}`)
} finally {
  await stop()
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
  await fs.rm(ownedRoot, { recursive: true, force: true }); await fs.rm(workspace, { recursive: true, force: true })
  console.log(report.checks.every((c) => c.ok) ? 'OLD-PLACEMENT PASS' : 'OLD-PLACEMENT FAIL')
}
