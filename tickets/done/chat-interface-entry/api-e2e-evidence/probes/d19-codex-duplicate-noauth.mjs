#!/usr/bin/env node
// API-REV-006 — D-19 Codex path match without any credential.
//
// Owned CODEX_HOME holding only `skills/` (no auth.json, no config.toml: nothing is copied or linked
// from ~/.codex). The skill preflight (`skills/list`) runs at bootstrap before any model call, so the
// duplicate decision is observable even if the model turn later fails for lack of auth.
//   K1: desk-lead (CONFIGURED desk-alpha, catalog copy = package tier 2) with a stale
//       CODEX_HOME/skills/desk-alpha → `codex-runtime-duplicate` logged, workspace link → catalog copy.
//   K2: codex-user (CONFIGURED codex-only, used copy = CODEX_HOME/skills/codex-only, tier 4)
//       → reconcile-discoverable: no workspace link, no duplicate log.
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '../../../../..')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const deskPackage = path.resolve(scriptDir, '../test-data/chat-entry-desk-package')
const outDir = path.resolve(scriptDir, '../round6/codex-duplicate-noauth')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const evidence = { startedAt: new Date().toISOString(), checks: {}, cleanup: [] }
let backendUrl, backend, backendLogPath, owned
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(300000) })
  return res.json()
}
const writeSkill = async (dir, name, body) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} (${body})\n---\n\n${body}\n`)
  return dir
}
const writeAgent = async (root, id, skillNames) => {
  const dir = path.join(root, 'agents', id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${id}\ndescription: ${id}\nrole: Helper\n---\n\nReply briefly.\n`)
  await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames, defaultLaunchConfig: null }, null, 2))
}
const logLines = async (needle) => (await fs.readFile(backendLogPath, 'utf8')).split('\n').filter((l) => l.includes(needle))

const launch = async (agentDefinitionId, workspace) => (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: {
  agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: 'gpt-5.5', autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', runtimeKind: 'codex_app_server',
} }))

try {
  await fs.mkdir(outDir, { recursive: true })
  owned = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'api-rev-006-codexdup-')))
  const dataRoot = path.join(owned, 'server-data')
  const codexHome = path.join(owned, 'codex-home')
  const codexSkills = path.join(codexHome, 'skills')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  await fs.cp(path.join(deskPackage, 'agents'), path.join(dataRoot, 'agents'), { recursive: true })
  const stale = await writeSkill(path.join(codexSkills, 'desk-alpha'), 'desk-alpha', 'STALE CODEX DESK-ALPHA')
  const codexOnly = await writeSkill(path.join(codexSkills, 'codex-only'), 'codex-only', 'CODEX ONLY')
  await writeAgent(dataRoot, 'codex-user', ['codex-only'])
  evidence.codexHomeEntries = (await fs.readdir(codexHome)).sort()

  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const port = await freePort(); backendUrl = `http://127.0.0.1:${port}`
  await fs.writeFile(path.join(dataRoot, '.env'), [`APP_ENV=development`, `DB_TYPE=sqlite`, `DATABASE_URL=${dbUrl}`, `AUTOBYTEUS_SERVER_HOST=${backendUrl}`, `AUTOBYTEUS_SKILLS_PATHS=${codexSkills}`, ''].join('\n'))
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  backendLogPath = path.join(outDir, 'backend.log')
  const log = createWriteStream(backendLogPath)
  backend = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], { cwd: serverDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...baseEnv(), CODEX_HOME: codexHome, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' } })
  backend.stdout.pipe(log); backend.stderr.pipe(log)
  const t0 = Date.now()
  while (Date.now() - t0 < 120000) { try { if ((await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok) break } catch {} await delay(500) }

  const catalog = await gql('{ skills { name rootPath } skillNameIssues { name usedPath ignoredPaths kind } }')
  const deskCopy = path.join(dataRoot, 'agents', 'desk-helper', 'skills', 'desk-alpha')
  evidence.catalog = catalog.data
  evidence.checks.K0 = { title: 'Catalog: package desk-alpha used over the Codex copy; codex-only used from CODEX_HOME/skills (AC-019)',
    result: catalog.data.skills.find((s) => s.name === 'desk-alpha')?.rootPath === deskCopy
      && catalog.data.skills.find((s) => s.name === 'codex-only')?.rootPath === codexOnly
      && catalog.data.skillNameIssues.some((i) => i.name === 'desk-alpha' && i.kind === 'shadowed_runtime_default' && i.ignoredPaths[0] === stale) ? 'Pass' : 'Fail' }

  const ws1 = await fs.realpath(await fs.mkdtemp(path.join(owned, 'ws-k1-')))
  const k1 = await launch('desk-lead', ws1)
  await delay(1500)
  const k1Link = await fs.realpath(path.join(ws1, '.codex', 'skills', 'desk-alpha')).catch(() => null)
  const k1Log = await logLines('codex-runtime-duplicate')
  evidence.checks.K1 = { title: 'Stale CODEX_HOME copy → codex-runtime-duplicate logged and the catalog copy exposed', run: k1, link: k1Link, log: k1Log.map((l) => l.slice(0, 400)),
    result: k1Link === deskCopy && k1Log.some((l) => l.includes("skill='desk-alpha'") && l.includes(`codexPaths='${stale}'`) && l.includes(`chosenPath='${deskCopy}'`)) ? 'Pass' : 'Fail' }
  if (k1.data?.createAgentRun?.runId) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: k1.data.createAgentRun.runId })

  const ws2 = await fs.realpath(await fs.mkdtemp(path.join(owned, 'ws-k2-')))
  const k2 = await launch('codex-user', ws2)
  await delay(1500)
  const k2Entries = await fs.readdir(path.join(ws2, '.codex', 'skills')).catch(() => [])
  const k2Log = (await logLines('codex-runtime-duplicate')).filter((l) => l.includes("skill='codex-only'"))
  evidence.checks.K2 = { title: 'Used copy is the Codex copy → reconcile-discoverable: no workspace link, no duplicate log', run: k2, workspaceSkillEntries: k2Entries, duplicateLog: k2Log,
    result: !k2Entries.includes('codex-only') && k2Log.length === 0 ? 'Pass' : 'Fail' }
  if (k2.data?.createAgentRun?.runId) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: k2.data.createAgentRun.runId })
  evidence.codexHomeEntriesAfter = (await fs.readdir(codexHome)).sort()
  evidence.authPresentInOwnedCodexHome = evidence.codexHomeEntriesAfter.includes('auth.json')
} catch (error) {
  evidence.fatal = String(error?.stack ?? error); console.error(error)
} finally {
  if (backend && backend.exitCode === null) {
    try { process.kill(-backend.pid, 'SIGTERM') } catch {}
    await Promise.race([new Promise((r) => backend.once('exit', r)), delay(15000)])
    try { process.kill(-backend.pid, 'SIGKILL') } catch {}
  }
  if (owned) { await fs.rm(owned, { recursive: true, force: true }); evidence.cleanup.push({ removed: owned }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
  for (const [id, c] of Object.entries(evidence.checks)) console.log(`${id}: ${c.result} — ${c.title}`)
}
