#!/usr/bin/env node
// TEMPORARY API/E2E measurement (cross-scope-agent-mentions round 2, CR item 7): how long a mention
// admission holds a Team root, and how much a concurrent plain send to another member of the same
// root waits. Owned backend (dist/app.js) on a free port with an owned temp data root; real runtimes.
// Usage (from autobyteus-web so playwright/ws resolve): node /tmp/csam2/latency-probe.mjs <runtime> <model>
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const serverDir = '/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/autobyteus-server-ts'
const [runtime = 'claude_agent_sdk', model = 'haiku'] = process.argv.slice(2)
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)) }) })
const env = Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k]).map((k) => [k, process.env[k]]))
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'csam-latency-'))
const dataRoot = path.join(root, 'server-data'); await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
const workspace = path.join(root, 'ws'); await fs.mkdir(workspace)
const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
const port = await freePort(); const base = `http://127.0.0.1:${port}`
await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${base}\n`)
await new Promise((res, rej) => spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...env, DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' }).once('exit', (c) => (c === 0 ? res() : rej(new Error(`migrate ${c}`)))))
const backend = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], { cwd: serverDir, env: { ...env, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: base, DISABLE_HTTP_REQUEST_LOGS: 'true' }, detached: true, stdio: 'ignore' })
const result = { runtime, model, samples: [] }
try {
  for (let i = 0; i < 240; i += 1) { if (await fetch(`${base}/rest/health`).then((x) => x.ok).catch(() => false)) break; await delay(500) }
  const gql = async (query, variables = {}) => { const j = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data }
  const cat = runtime === 'autobyteus' ? (await gql('mutation{ensureProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}')).ensureProviderModelCatalog.llmModels : (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: runtime })).providerModelCatalogSnapshots.flatMap((s) => s.llmModels)
  result.catalogModel = cat.map((m) => m.modelIdentifier).find((m) => m === model || m.startsWith(model)) ?? null
  const resolvedModel = result.catalogModel ?? model
  const def = async (name) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, description: name, instructions: 'Reply with one word. Never call tools.', toolNames: [] } })).createAgentDefinition.id
  const lead = await def('Lat Lead'); const writer = await def('Lat Writer')
  const helpers = []; for (let i = 1; i <= 4; i += 1) helpers.push(await def(`Lat Helper ${i}`))
  const team = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Lat Team', description: 'x', instructions: 'x', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'writer', ref: writer, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id
  const launch = { llmModelIdentifier: resolvedModel, autoExecuteTools: true, workspaceRootPath: workspace, llmConfig: null, runtimeKind: runtime }
  const run = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: team, teamConfigs: [{ teamAddress: '/', ...launch }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: lead, ...launch }, { memberAddress: '/writer', agentDefinitionId: writer, ...launch }] } })).createAgentTeamRun
  if (!run.success) throw new Error(run.message)
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/agent-team/${run.teamRunId}`)
  const frames = []; ws.onmessage = (e) => { try { frames.push({ at: performance.now(), ...JSON.parse(e.data) }) } catch {} }
  await new Promise((r) => { ws.onopen = r })
  const snapshot = await (async () => { for (let i = 0; i < 120; i += 1) { const s = frames.find((f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT'); if (s) return s; await delay(250) } throw new Error('no snapshot') })()
  const runIdOf = (address) => JSON.stringify(snapshot.payload).match(new RegExp(`"address":"${address}"[^}]*?"agent_?[rR]un_?[iI]d":"([^"]+)"`))?.[1]
    ?? JSON.stringify(snapshot.payload).match(new RegExp(`"agent_?[rR]un_?[iI]d":"([^"]+)"[^}]*?"address":"${address}"`))?.[1]
  const leadRun = runIdOf('/lead'); const writerRun = runIdOf('/writer')
  if (!leadRun || !writerRun) throw new Error(`member run IDs not found: ${JSON.stringify(snapshot.payload).slice(0, 600)}`)
  const send = (agentRunId, content, mentions) => {
    const messageId = randomUUID(); const t0 = performance.now()
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: agentRunId, content, context_file_paths: [], image_urls: [], message_id: messageId, dedupe_key: messageId, ...(mentions ? { mentions } : {}) } }))
    return (async () => { for (let i = 0; i < 1200; i += 1) { const f = frames.find((x) => (x.type === 'MEMBER_INPUT_MESSAGE' && x.payload.message_id === messageId) || (x.type === 'ERROR' && x.payload.agent_run_id === agentRunId && x.at > t0)); if (f) return { ms: Math.round(f.at - t0), type: f.type, code: f.payload.code ?? null, message: f.payload.message ?? null, collaborator: f.payload.collaborator_name ?? null }; await delay(25) } return { ms: null, type: 'timeout' } })()
  }
  const idle = async (ms = 45000) => { await delay(ms) }
  // Baseline plain sends (no mention).
  for (let i = 0; i < 3; i += 1) { result.samples.push({ case: 'plain', ...(await send(writerRun, 'Reply with OK.')) }); await idle(20000) }
  // Mention admission alone (a new definition each time, so every sample validates and adds).
  for (let i = 0; i < 2; i += 1) { result.samples.push({ case: 'mention', ...(await send(leadRun, 'Reply with OK.', [{ kind: 'agent', definition_id: helpers[i] }])) }); await idle(20000) }
  // Concurrent: a mention to the lead and, right after, a plain send to the writer in the same root.
  for (let i = 2; i < 4; i += 1) {
    const [m, p] = await Promise.all([send(leadRun, 'Reply with OK.', [{ kind: 'agent', definition_id: helpers[i] }]), (async () => { await delay(5); return send(writerRun, 'Reply with OK.') })()])
    result.samples.push({ case: 'concurrent-mention', ...m }, { case: 'concurrent-plain', ...p }); await idle(20000)
  }
  ws.close()
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: run.teamRunId }).catch(() => {})
} catch (error) { result.error = String(error?.stack ?? error) } finally {
  try { process.kill(-backend.pid, 'SIGTERM') } catch {}
  await delay(3000); try { process.kill(-backend.pid, 'SIGKILL') } catch {}
  await fs.rm(root, { recursive: true, force: true })
  console.log(JSON.stringify(result))
}
