#!/usr/bin/env node
// D-15 validation probe (ticket chat-interface-entry, IR-002): V-A..V-E against the real backend
// (dist/app.js) and real runtimes, in an owned temp data root on a free port with a sanitized env.
//
// Runs are started with `createAgentRun` (bootstrap + skill materialization, no model turn) and
// stopped with `terminateAgentRun`. Each case uses a fresh workspace folder shared by its runs.
//
// Same-name, different-source pairs (real skill content):
//   claude_agent_sdk / grok_build / antigravity_cli: software-tutorial-video-maker
//     - configured (strong): agent-private copy in the real agent folder `software-tutorial-video-maker`
//     - Daily Assistant (ALL_INSTALLED, weak): the real global copy from ~/.codex/skills
//   codex_app_server: resume-designer (the tutorial name is natively discoverable from the
//     user's ~/.codex/skills, which makes Codex skip workspace links for it entirely)
//     - configured: agent-private copy in the real agent folder `resume-designer`
//     - Daily Assistant: a global copy of the same content (a different source path)
//
// Usage: node d15-skill-strength-probe.mjs --runtimes claude_agent_sdk,codex_app_server,grok_build,antigravity_cli
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
const agentsRepo = '/Users/normy/autobyteus_org/autobyteus-agents-main-merge/agents'
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const runtimes = arg('runtimes', 'claude_agent_sdk,codex_app_server,grok_build,antigravity_cli').split(',')
const outDir = path.resolve(arg('output-dir', path.join(scriptDir, 'd15-skill-strength')))

const RUNTIMES = {
  claude_agent_sdk: { dir: ['.claude', 'skills'], pair: 'software-tutorial-video-maker', prefer: /haiku/i, cases: ['V-A', 'V-B', 'V-C', 'V-D'] },
  codex_app_server: { dir: ['.codex', 'skills'], pair: 'resume-designer', prefer: /^gpt-5\.5$/, cases: ['V-A', 'V-B', 'V-C', 'V-D'] },
  grok_build: { dir: ['.grok', 'skills'], pair: 'software-tutorial-video-maker', prefer: null, cases: ['V-A', 'V-B', 'V-C', 'V-D'] },
  antigravity_cli: { dir: ['.agents', 'skills'], pair: 'software-tutorial-video-maker', prefer: null, cases: ['V-D'] },
}
const PAIRS = {
  'software-tutorial-video-maker': { agentId: 'software-tutorial-video-maker', global: path.join(os.homedir(), '.codex', 'skills', 'software-tutorial-video-maker') },
  'resume-designer': { agentId: 'resume-designer', global: path.join(agentsRepo, 'resume-designer', 'skills', 'resume-designer') },
}
const DAILY_ASSISTANT = 'autobyteus-daily-assistant'

const evidence = { startedAt: new Date().toISOString(), runtimes: {}, cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const assert = (cond, message, details) => { if (!cond) throw Object.assign(new Error(message), { details }) }

let ownedRoot, dataRoot, backendUrl, backend, backendLogPath
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(300000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const createRun = async (runtimeKind, model, agentDefinitionId, workspaceRootPath) => (await gql(
  'mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
  { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', runtimeKind } },
)).createAgentRun
const terminate = async (runId) => runId && (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: runId })).terminateAgentRun
const isActive = async (runId) => (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive}}', { runId })).getAgentRunResumeConfig.isActive
const linkTarget = async (link) => {
  try { const st = await fs.lstat(link); if (!st.isSymbolicLink()) return { kind: st.isDirectory() ? 'directory' : 'file' } } catch { return { kind: 'absent' } }
  return { kind: 'symlink', target: await fs.realpath(link).catch(() => path.resolve(path.dirname(link), '(broken)')) }
}
const logLines = async (runId) => (await fs.readFile(backendLogPath, 'utf8')).split('\n').filter((l) => l.includes(`run='${runId}'`) || l.includes(`run=${runId}`) || (runId && l.includes(`yieldingRuns='`) && l.includes(runId)))
const disposition = async (runId, name) => (await logLines(runId)).find((l) => l.includes(name)) ?? null
// createAgentRun reports only "Failed to prepare agent run '<id>'"; the cause is in the backend log.
const collisionCause = async (created) => {
  if (created.success) return null
  const runId = /agent run '([^']+)'/.exec(created.message)?.[1]
  const line = (await fs.readFile(backendLogPath, 'utf8')).split('\n')
    .find((l) => (runId ? l.includes(runId) : true) && /Workspace skill path collision|AGY_SKILL_NAME_COLLISION/.test(l))
  return line ? line.replace(/^.*?(Workspace skill path collision|AGY_SKILL_NAME_COLLISION)/, '$1').slice(0, 400) : null
}
const pickModel = async (runtimeKind, prefer) => {
  const snapshots = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: runtimeKind })).providerModelCatalogSnapshots
  const ids = snapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
  return (prefer && ids.find((id) => prefer.test(id))) || ids[0] || null
}

const runCase = async (runtimeKind, spec, model, caseId, sources) => {
  const workspace = path.join(ownedRoot, `ws-${runtimeKind}-${caseId}`)
  await fs.mkdir(workspace, { recursive: true })
  const realWorkspace = await fs.realpath(workspace)
  const link = path.join(realWorkspace, ...spec.dir, spec.pair)
  const started = []
  const start = async (agentId) => { const r = await createRun(runtimeKind, model, agentId, realWorkspace); if (r.runId && r.success) started.push(r.runId); return r }
  const result = { workspace: realWorkspace, link }
  try {
    if (caseId === 'V-A') {
      const strong = await start(sources.agentId)
      assert(strong.success, 'configured run failed to start', strong)
      result.afterConfigured = await linkTarget(link)
      const weak = await start(DAILY_ASSISTANT)
      assert(weak.success, 'Daily Assistant failed to start next to a live configured run', weak)
      result.afterDailyAssistant = await linkTarget(link)
      result.log = await disposition(weak.runId, 'skipped-held-by-other-run')
      if (spec.dir[0] !== '.agents') {
        assert(result.afterDailyAssistant.target === sources.private, 'link no longer points to the configured source', result)
        assert(result.log, 'no skipped-held-by-other-run disposition logged', result)
      }
    }
    if (caseId === 'V-B') {
      const weak = await start(DAILY_ASSISTANT)
      assert(weak.success, 'Daily Assistant failed to start', weak)
      result.afterDailyAssistant = await linkTarget(link)
      assert(result.afterDailyAssistant.target === sources.global, 'Daily Assistant link does not point to the installed source', result)
      const strong = await start(sources.agentId)
      assert(strong.success, 'configured run failed to start next to a live Daily Assistant', strong)
      result.afterConfigured = await linkTarget(link)
      result.log = (await fs.readFile(backendLogPath, 'utf8')).split('\n').find((l) => l.includes(`run='${strong.runId}'`) && l.includes('yielded-to-configured')) ?? null
      result.dailyAssistantStillActive = await isActive(weak.runId)
      assert(result.afterConfigured.target === sources.private, 'link was not re-pointed to the configured source', result)
      assert(result.log && result.log.includes(weak.runId), 'no yielded-to-configured disposition naming the Daily Assistant run', result)
      assert(result.dailyAssistantStillActive, 'Daily Assistant run is no longer active', result)
      // V-E with the weak holder released first (its descriptor names the stale installed source).
      await terminate(weak.runId); started.splice(started.indexOf(weak.runId), 1)
      result.afterWeakTerminated = await linkTarget(link)
      assert(result.afterWeakTerminated.target === sources.private, 'link removed while the configured run still holds it', result)
    }
    if (caseId === 'V-C') {
      const first = await start(sources.agentId)
      assert(first.success, 'configured run failed to start', first)
      const second = await start('probe-configured-global')
      result.second = second
      result.cause = await collisionCause(second)
      assert(!second.success && /is being materialized from/.test(result.cause ?? ''), 'second configured run with a different source did not fail fast', result)
    }
    if (caseId === 'V-D') {
      const owned = link
      await fs.mkdir(owned, { recursive: true })
      await fs.writeFile(path.join(owned, 'SKILL.md'), `---\nname: ${spec.pair}\ndescription: user-owned\n---\n# user owned\n`)
      const weak = await start(DAILY_ASSISTANT)
      result.dailyAssistant = weak
      assert(weak.success, 'Daily Assistant failed next to a user-owned workspace skill', weak)
      result.log = spec.dir[0] === '.agents'
        ? (await fs.readFile(backendLogPath, 'utf8')).split('\n').find((l) => l.includes(`skill=${spec.pair}`) && l.includes('skipped-workspace-owned')) ?? null
        : await disposition(weak.runId, 'skipped-workspace-owned')
      assert(result.log, 'no skipped-workspace-owned disposition logged', result)
      assert((await fs.readFile(path.join(owned, 'SKILL.md'), 'utf8')).includes('user owned'), 'user-owned skill changed', result)
      const strong = await start(sources.agentId)
      result.configured = strong
      result.cause = /AGY_SKILL_NAME_COLLISION/.test(strong.message ?? '') ? strong.message : await collisionCause(strong)
      assert(!strong.success && /already exists as a directory|AGY_SKILL_NAME_COLLISION/.test(result.cause ?? ''), 'configured run did not fail fast on the user-owned entry', result)
    }
    result.result = 'Pass'
  } catch (error) {
    result.result = 'Fail'; result.error = error.message; result.details = error.details === result ? null : (error.details ?? null)
  } finally {
    for (const runId of started.reverse()) await terminate(runId).catch(() => undefined)
    await delay(1500)
    // V-E: once every holder is gone the materializer-owned link is removed.
    result.afterAllTerminated = await linkTarget(link)
    if (caseId !== 'V-D' && result.result === 'Pass' && result.afterAllTerminated.kind !== 'absent') {
      result.result = 'Fail'; result.error = 'V-E: link left behind after every run terminated'
    }
  }
  return result
}

try {
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cie-d15-')))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const port = await freePort(); backendUrl = `http://127.0.0.1:${port}`
  Object.assign(evidence, { ownedRoot, backendUrl })
  const sourcesByPair = {}
  for (const [pair, spec] of Object.entries(PAIRS)) {
    await fs.cp(spec.global, path.join(dataRoot, 'skills', pair), { recursive: true })
    await fs.cp(path.join(agentsRepo, spec.agentId), path.join(dataRoot, 'agents', spec.agentId), { recursive: true })
    sourcesByPair[pair] = { agentId: spec.agentId,
      private: await fs.realpath(path.join(dataRoot, 'agents', spec.agentId, 'skills', pair)),
      global: await fs.realpath(path.join(dataRoot, 'skills', pair)) }
  }
  // V-C: a second configured agent naming the pair, resolving to the global copy.
  const probeAgent = path.join(dataRoot, 'agents', 'probe-configured-global')
  await fs.mkdir(probeAgent, { recursive: true })
  await fs.writeFile(path.join(probeAgent, 'agent.md'), '---\nname: Probe Configured Global\ndescription: V-C probe\nrole: Helper\n---\n\nReply briefly.\n')
  await fs.writeFile(path.join(probeAgent, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames: Object.keys(PAIRS), inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2))
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
  evidence.sources = sourcesByPair
  for (const runtimeKind of runtimes) {
    const spec = RUNTIMES[runtimeKind]
    const model = await pickModel(runtimeKind, spec.prefer).catch((e) => { evidence.runtimes[runtimeKind] = { unavailable: e.message }; return null })
    if (!model) { evidence.runtimes[runtimeKind] ??= { unavailable: 'no model in catalog' }; console.log(`${runtimeKind}: unavailable`); continue }
    evidence.runtimes[runtimeKind] = { model, pair: spec.pair, cases: {} }
    for (const caseId of spec.cases) {
      const r = await runCase(runtimeKind, spec, model, caseId, sourcesByPair[spec.pair])
      evidence.runtimes[runtimeKind].cases[caseId] = r
      console.log(`${runtimeKind} ${caseId}: ${r.result}${r.error ? ` — ${r.error}` : ''}`)
      await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
    }
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
