#!/usr/bin/env node
// V-F rerun under D-19 (IR-008): the desk-package team starts next to a live Daily Assistant with
// no special rule. `desk-alpha` resolves from the one catalog for both runs.
//
// Owned temp data root, free port, sanitized env, real backend (dist/app.js) and real runtimes.
// The desk package (api-e2e-evidence/test-data/chat-entry-desk-package) is copied into the data root:
// `desk-lead` (team coordinator) names `desk-alpha`, which lives only in `desk-helper`'s folder. Under
// D-19 it resolves from the catalog to that folder, the same copy the Daily Assistant (ALL_INSTALLED) links.
//
// Usage: node ir7-vf-probe.mjs [--runtimes codex_app_server,claude_agent_sdk,grok_build]
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '../../../..')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const deskPackage = path.resolve(scriptDir, '../api-e2e-evidence/test-data/chat-entry-desk-package')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const runtimes = arg('runtimes', 'codex_app_server,claude_agent_sdk,grok_build').split(',')
const outDir = path.resolve(arg('output-dir', path.join(scriptDir, 'ir8-vf')))
const SKILL_DIR = { codex_app_server: ['.codex', 'skills'], claude_agent_sdk: ['.claude', 'skills'], grok_build: ['.grok', 'skills'] }
const PREFER = { codex_app_server: /^gpt-5\.5$/, claude_agent_sdk: /haiku/i, grok_build: null }
const DAILY_ASSISTANT = 'autobyteus-daily-assistant'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const evidence = { startedAt: new Date().toISOString(), runtimes: {}, cleanup: [] }

let backendUrl, backend, backendLogPath, ownedRoot
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(300000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const pickModel = async (runtimeKind) => {
  const snapshots = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: runtimeKind })).providerModelCatalogSnapshots
  const ids = snapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
  return (PREFER[runtimeKind] && ids.find((id) => PREFER[runtimeKind].test(id))) || ids[0] || null
}
const linkTarget = async (link) => {
  try { if (!(await fs.lstat(link)).isSymbolicLink()) return 'non-symlink' } catch { return 'absent' }
  return fs.realpath(link).catch(() => 'broken')
}
/** Sends one message to a team member over /ws/agent-team and waits for `token` in its stream, or an error. */
const sendAndAwait = (teamRunId, agentRunId, content, token, timeoutMs = 180000) => new Promise((resolve) => {
  const ws = new WebSocket(`${backendUrl.replace(/^http/, 'ws')}/ws/agent-team/${teamRunId}`)
  const errors = []
  let settled = false
  const finish = (replied) => { if (settled) return; settled = true; clearTimeout(timer); try { ws.close() } catch {} resolve({ replied, errors }) }
  const timer = setTimeout(() => finish(false), timeoutMs)
  ws.onopen = () => {
    const messageId = `vf-${crypto.randomUUID()}`
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, agent_run_id: agentRunId, context_file_paths: [], image_urls: [], message_id: messageId, dedupe_key: `agent_run_input:vf:${messageId}` } }))
  }
  ws.onmessage = (event) => {
    const text = String(event.data)
    if (/"type":"(ERROR|COMMAND_REJECTED)"|TEAM_SEND_MESSAGE_(FAILED|REJECTED)|path collision/i.test(text)) errors.push(text.slice(0, 400))
    if (text.includes(token)) finish(true)
    else if (errors.length && /path collision|TEAM_SEND_MESSAGE_FAILED/i.test(text)) finish(false)
  }
  ws.onerror = (e) => { errors.push(`socket error: ${e.message ?? e.type}`); finish(false) }
})
const logLines = async (pattern) => (await fs.readFile(backendLogPath, 'utf8')).split('\n').filter((l) => pattern.test(l))

const runCase = async (runtimeKind, model) => {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(ownedRoot, `ws-${runtimeKind}-`)))
  const link = path.join(workspace, ...SKILL_DIR[runtimeKind], 'desk-alpha')
  const result = { workspace }
  let daRunId = null, teamRunId = null
  try {
    const da = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: {
      agentDefinitionId: DAILY_ASSISTANT, workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', runtimeKind,
    } })).createAgentRun
    if (!da.success) throw new Error(`Daily Assistant failed to start: ${da.message}`)
    daRunId = da.runId
    result.linkWithDailyAssistant = await linkTarget(link)
    const memberConfig = (memberAddress, agentDefinitionId) => ({ memberAddress, agentDefinitionId, llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: workspace, llmConfig: null, runtimeKind })
    const team = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
      teamDefinitionId: 'desk-team',
      teamConfigs: [{ teamAddress: '/', llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: workspace, llmConfig: null, runtimeKind }],
      memberConfigs: [memberConfig('/lead', 'desk-lead'), memberConfig('/helper', 'desk-helper')],
    } })).createAgentTeamRun
    result.team = team
    teamRunId = team.teamRunId ?? null
    if (!team.success) throw new Error(`Team failed to create: ${team.message}`)
    // Team members activate on their first message: send the coordinator (/lead) one message over the
    // team stream, exactly like the Chat quick path, and wait for its reply or a failure event.
    const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId })).getTeamRunResumeConfig.executionTree
    const leadRunId = (tree?.root_team?.members ?? []).find((m) => m.address === '/lead')?.agent_run_id
    if (!leadRunId) throw new Error('lead agent_run_id not found in the execution tree')
    result.leadTurn = await sendAndAwait(teamRunId, leadRunId, 'Reply with exactly DESK-TEAM-OK and nothing else.', 'DESK-TEAM-OK')
    result.linkWithTeam = await linkTarget(link)
    const forWorkspace = (lines) => lines.filter((l) => l.includes(workspace)).map((l) => l.slice(0, 400))
    result.collisions = forWorkspace(await logLines(/Workspace skill path collision/))
    result.removedRuleLogs = forWorkspace(await logLines(/skipped-unresolved-held-by-weak|skipped-held-by-other-run|yielded-to-configured/))
    result.leadDeskAlphaUnresolved = (await logLines(/Skill 'desk-alpha' defined in agent definition .* could not be resolved/)).length
    // One catalog copy: the lead and the Daily Assistant both use desk-helper's desk-alpha.
    result.sameCatalogCopy = result.linkWithDailyAssistant === result.linkWithTeam
      && String(result.linkWithTeam).endsWith(path.join('agents', 'desk-helper', 'skills', 'desk-alpha'))
    result.result = team.success && result.leadTurn.replied && result.collisions.length === 0
      && result.removedRuleLogs.length === 0 && result.leadDeskAlphaUnresolved === 0 && result.sameCatalogCopy ? 'Pass' : 'Fail'
  } catch (error) {
    result.result = 'Fail'; result.error = error.message
  } finally {
    if (teamRunId) await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId }).catch(() => undefined)
    if (daRunId) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: daRunId }).catch(() => undefined)
    await delay(2000)
    result.linkAfterAllTerminated = await linkTarget(link)
  }
  return result
}

try {
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cie-vf-')))
  const dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  await fs.cp(path.join(deskPackage, 'agents'), path.join(dataRoot, 'agents'), { recursive: true })
  await fs.cp(path.join(deskPackage, 'agent-teams'), path.join(dataRoot, 'agent-teams'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const port = await freePort(); backendUrl = `http://127.0.0.1:${port}`
  Object.assign(evidence, { ownedRoot, backendUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  backendLogPath = path.join(outDir, 'backend.log')
  const log = createWriteStream(backendLogPath)
  backend = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], { cwd: serverDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' } })
  backend.stdout.pipe(log); backend.stderr.pipe(log)
  const t0 = Date.now()
  while (Date.now() - t0 < 120000) { try { if ((await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok) break } catch {} await delay(500) }
  for (const runtimeKind of runtimes) {
    const model = await pickModel(runtimeKind).catch(() => null)
    if (!model) { evidence.runtimes[runtimeKind] = { unavailable: true }; console.log(`${runtimeKind}: unavailable`); continue }
    const r = await runCase(runtimeKind, model)
    evidence.runtimes[runtimeKind] = { model, ...r }
    console.log(`${runtimeKind}: ${r.result}${r.error ? ` — ${r.error}` : ''} | same catalog copy: ${r.sameCatalogCopy} | collisions: ${r.collisions?.length ?? '-'} | desk-alpha unresolved: ${r.leadDeskAlphaUnresolved} | lead replied: ${r.leadTurn?.replied} ${JSON.stringify(r.leadTurn?.errors ?? [])} | team: ${r.team?.success} ${r.team?.message ?? ''}`)
    await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
  }
} catch (error) {
  evidence.fatal = String(error?.stack ?? error); console.error(error)
} finally {
  if (backend && backend.exitCode === null) {
    try { process.kill(-backend.pid, 'SIGTERM') } catch {}
    await Promise.race([new Promise((r) => backend.once('exit', r)), delay(15000)])
    try { process.kill(-backend.pid, 'SIGKILL') } catch {}
  }
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
}
