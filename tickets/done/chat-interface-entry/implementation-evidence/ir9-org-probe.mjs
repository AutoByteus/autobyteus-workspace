#!/usr/bin/env node
// D-19 Agent Org layouts (IR-009, SR-018/SR-019): org-owned agents and an org team's team-local
// agent run with their own skills; the Skills catalog lists them; a duplicate org import is rejected.
//
// Owned temp data root, free port, sanitized env, real backend (dist/app.js), real runtimes.
// A package root (AUTOBYTEUS_AGENT_PACKAGE_ROOTS) holds `agent-orgs/org-desk` with an org-owned agent
// `org-writer` (skill `org-writer-skill`) and an org-owned team `org-crew` (shared `org-crew-shared`,
// team-local agent `member` with `org-member-skill`). Results: `ir9-org/` (`evidence.json`, `backend.log`).
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
const outDir = path.join(scriptDir, 'ir9-org')
const RUNTIMES = {
  codex_app_server: { link: ['.codex', 'skills'], prefer: /^gpt-5\.5$/ },
  claude_agent_sdk: { link: ['.claude', 'skills'], prefer: /haiku/i },
  grok_build: { link: ['.grok', 'skills'], prefer: null },
  antigravity_cli: { capsule: true, prefer: null },
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const evidence = { startedAt: new Date().toISOString(), checks: {}, runtimes: {}, cleanup: [] }
let backendUrl, backend, backendLogPath, owned

const gqlRaw = async (query, variables = {}) => (await fetch(`${backendUrl}/graphql`, { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(300000) })).json()
const gql = async (query, variables) => {
  const json = await gqlRaw(query, variables)
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const ownedId = (kind, org, local) => `${kind === 'agent' ? 'agent-org-owned-agent' : 'agent-org-owned-team'}:${encodeURIComponent(org)}:${encodeURIComponent(local)}`
const writeSkill = async (dir, name) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} (org fixture)\n---\n\nReply briefly.\n`)
  return dir
}
const writeAgent = async (dir, name, skillNames) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${name}\nrole: Helper\n---\n\nReply briefly.\n`)
  await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames, defaultLaunchConfig: null }, null, 2))
}
const writeOrg = async (root, orgId, { agents = [], teams = [] }) => {
  const orgDir = path.join(root, 'agent-orgs', orgId)
  await fs.mkdir(orgDir, { recursive: true })
  const members = [...agents.map((a) => ({ memberName: a.replace(/-/g, '_'), ref: ownedId('agent', orgId, a), refType: 'agent', refScope: 'org_local' })),
    ...teams.map((t) => ({ memberName: t.replace(/-/g, '_'), ref: ownedId('agent_team', orgId, t), refType: 'agent_team', refScope: 'org_local' }))]
  await fs.writeFile(path.join(orgDir, 'org-config.json'), JSON.stringify({ avatarUrl: null, members, handoffs: [], defaultLaunchConfig: null }, null, 2))
  await fs.writeFile(path.join(orgDir, 'org.md'), `---\nname: ${orgId}\ndescription: Org fixture\ncategory: test\n---\n\nFixture.\n`)
  for (const a of agents) await fs.mkdir(path.join(orgDir, 'agents', a), { recursive: true })
  for (const t of teams) await fs.mkdir(path.join(orgDir, 'agent-teams', t), { recursive: true })
  return orgDir
}
const check = async (id, title, fn) => {
  try { evidence.checks[id] = { title, ...(await fn()) } } catch (error) { evidence.checks[id] = { title, result: 'Fail', error: String(error?.stack ?? error).slice(0, 800) } }
  console.log(`${id}: ${evidence.checks[id].result} — ${title}`)
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
}
const findDirs = async (root, name) => {
  const hits = []
  for (const entry of await fs.readdir(root, { recursive: true }).catch(() => [])) {
    if (path.basename(entry) === name && entry.split(path.sep).slice(-3, -1).join('/') === '.agents/skills') hits.push(path.join(root, entry))
  }
  return hits
}

try {
  await fs.mkdir(outDir, { recursive: true })
  owned = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cie-org-')))
  const dataRoot = path.join(owned, 'server-data')
  const pkg = path.join(owned, 'org-package')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const orgDir = await writeOrg(pkg, 'org-desk', { agents: ['org-writer'], teams: ['org-crew'] })
  const writerDir = path.join(orgDir, 'agents', 'org-writer')
  const crewDir = path.join(orgDir, 'agent-teams', 'org-crew')
  await writeAgent(writerDir, 'Org Writer', ['org-writer-skill'])
  const writerSkill = await writeSkill(path.join(writerDir, 'skills', 'org-writer-skill'), 'org-writer-skill')
  await fs.writeFile(path.join(crewDir, 'team.md'), '---\nname: Org Crew\ndescription: Org team fixture\n---\n\nFixture.\n')
  await fs.writeFile(path.join(crewDir, 'team-config.json'), JSON.stringify({
    coordinatorMemberName: 'member',
    members: [{ memberName: 'member', ref: 'member', refType: 'agent', refScope: 'team_local' }], handoffs: [] }, null, 2))
  await writeAgent(path.join(crewDir, 'agents', 'member'), 'Crew Member', ['org-crew-shared', 'org-member-skill'])
  const crewShared = await writeSkill(path.join(crewDir, 'skills', 'org-crew-shared'), 'org-crew-shared')
  const memberSkill = await writeSkill(path.join(crewDir, 'agents', 'member', 'skills', 'org-member-skill'), 'org-member-skill')
  Object.assign(evidence, { owned, layout: { writerSkill, crewShared, memberSkill } })

  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const port = await freePort(); backendUrl = `http://127.0.0.1:${port}`
  await fs.writeFile(path.join(dataRoot, '.env'), [`APP_ENV=development`, `DB_TYPE=sqlite`, `DATABASE_URL=${dbUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${backendUrl}`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=${pkg}`, ''].join('\n'))
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

  let agentIds = {}
  await check('O1', 'Skills catalog lists the org agent, org team shared and org team-local agent skills with their org paths', async () => {
    const skills = (await gql('{skills{name rootPath}}')).skills.filter((s) => s.name.startsWith('org-'))
    const byName = Object.fromEntries(skills.map((s) => [s.name, s.rootPath]))
    const defs = (await gql('{agentDefinitions{id name ownershipScope ownerTeamId ownerOrgId}}')).agentDefinitions
    // Org-owned definitions are not in the shared catalog listing; their ids are the owned ids.
    agentIds = {
      orgWriter: ownedId('agent', 'org-desk', 'org-writer'),
      crewMember: `team-local-agent:${encodeURIComponent(ownedId('agent_team', 'org-desk', 'org-crew'))}:member`,
    }
    evidence.resolvedDefinitions = await Promise.all(Object.values(agentIds).map(async (id) =>
      (await gqlRaw('query($id:String!){agentDefinition(id:$id){id name ownershipScope skillNames}}', { id })).data?.agentDefinition ?? null))
    evidence.definitions = defs.filter((d) => d.name === 'Org Writer' || d.name === 'Crew Member')
    return { byName, agentIds, result: byName['org-writer-skill'] === writerSkill && byName['org-crew-shared'] === crewShared
      && byName['org-member-skill'] === memberSkill ? 'Pass' : 'Fail' }
  })

  for (const [runtimeKind, spec] of Object.entries(RUNTIMES)) {
    const snapshots = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: runtimeKind }).catch(() => ({ providerModelCatalogSnapshots: [] }))).providerModelCatalogSnapshots
    const ids = snapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
    const model = (spec.prefer && ids.find((id) => spec.prefer.test(id))) || ids[0]
    if (!model) { evidence.runtimes[runtimeKind] = { unavailable: true }; console.log(`${runtimeKind}: unavailable`); continue }
    const results = {}
    for (const [label, definitionId, expected] of [
      ['org agent', agentIds.orgWriter, { 'org-writer-skill': writerSkill }],
      ['org team-local agent', agentIds.crewMember, { 'org-crew-shared': crewShared, 'org-member-skill': memberSkill }],
    ]) {
      const workspace = await fs.realpath(await fs.mkdtemp(path.join(owned, `ws-${runtimeKind}-`)))
      const run = await gqlRaw('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: {
        agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', runtimeKind } })
      const created = run.data?.createAgentRun ?? { success: false, message: JSON.stringify(run.errors).slice(0, 300) }
      const observed = {}
      for (const name of Object.keys(expected)) {
        if (spec.capsule) {
          const copies = await findDirs(dataRoot, name)
          observed[name] = copies.length ? (await fs.readFile(path.join(copies[0], 'SKILL.md'), 'utf8')).includes(`name: ${name}`) ? 'capsule-copy' : 'wrong-copy' : 'absent'
        } else {
          observed[name] = await fs.realpath(path.join(workspace, ...spec.link, name)).catch(() => 'absent')
        }
      }
      if (created.runId) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: created.runId }).catch(() => undefined)
      const ok = created.success && Object.entries(expected).every(([name, source]) => spec.capsule ? observed[name] === 'capsule-copy' : observed[name] === source)
      results[label] = { definitionId, run: created, observed, result: ok ? 'Pass' : 'Fail' }
    }
    evidence.runtimes[runtimeKind] = { model, ...results }
    console.log(`${runtimeKind}: ${Object.entries(results).map(([k, v]) => `${k}=${v.result}${v.result === 'Fail' ? ` (${v.run.message ?? ''} ${JSON.stringify(v.observed)})` : ''}`).join(' | ')}`)
    await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
  }

  await check('O2', 'Importing a second package with a same-named Agent Org skill → SKILL_NAME_CONFLICT; packages unchanged', async () => {
    const second = path.join(owned, 'second-package')
    await writeAgent(path.join(second, 'agents', 'plain'), 'Plain', [])
    const secondOrg = await writeOrg(second, 'org-copy', { teams: ['copy-team'] })
    const incoming = await writeSkill(path.join(secondOrg, 'agent-teams', 'copy-team', 'skills', 'org-writer-skill'), 'org-writer-skill')
    const before = (await gql('{agentPackages{packageId}}')).agentPackages
    const json = await gqlRaw('mutation($i:ImportAgentPackageInput!){importAgentPackage(input:$i){packageId}}', { i: { sourceKind: 'LOCAL_PATH', source: second } })
    const outcome = { code: json.errors?.[0]?.extensions?.code ?? null, conflicts: json.errors?.[0]?.extensions?.conflicts ?? null }
    const after = (await gql('{agentPackages{packageId}}')).agentPackages
    return { outcome, packagesUnchanged: JSON.stringify(before) === JSON.stringify(after),
      result: outcome.code === 'SKILL_NAME_CONFLICT' && outcome.conflicts?.[0]?.existingPath === writerSkill
        && outcome.conflicts?.[0]?.incomingPath === incoming && JSON.stringify(before) === JSON.stringify(after) ? 'Pass' : 'Fail' }
  })
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
}
