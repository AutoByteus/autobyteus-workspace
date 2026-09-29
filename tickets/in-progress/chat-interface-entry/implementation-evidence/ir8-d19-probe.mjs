#!/usr/bin/env node
// D-19 validation (IR-008): one skill per name, decided at load; duplicates blocked at import.
//
// Owned temp data root, free port, sanitized env, real backend (dist/app.js). The Codex runtime
// default folder is an owned `CODEX_HOME/skills` (tier 4); `auth.json`/`config.toml` are copied from
// the real `~/.codex` only so the Codex check can start, and the owned root is deleted at the end.
// Results: `ir8-d19/` (`evidence.json`, `backend.log`).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
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
const outDir = path.join(scriptDir, 'ir8-d19')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const evidence = { startedAt: new Date().toISOString(), checks: {}, cleanup: [] }
let backendUrl, backend, backendLogPath, owned

const gqlRaw = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(300000) })
  return res.json()
}
const gql = async (query, variables) => {
  const json = await gqlRaw(query, variables)
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const writeSkill = async (dir, name, body) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} (${body})\n---\n\n${body}\n`)
  return dir
}
const writeAgent = async (root, id, skillNames = []) => {
  const dir = path.join(root, 'agents', id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${id}\ndescription: ${id}\nrole: Helper\n---\n\nReply briefly.\n`)
  await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames, defaultLaunchConfig: null }, null, 2))
  return dir
}
const hashTree = async (dir) => {
  const h = createHash('sha256')
  for (const entry of (await fs.readdir(dir, { recursive: true })).sort()) {
    const file = path.join(dir, entry)
    if ((await fs.stat(file)).isFile()) h.update(entry).update(await fs.readFile(file))
  }
  return h.digest('hex')
}
const exists = (p) => fs.access(p).then(() => true, () => false)
const conflictOf = (json) => ({ code: json.errors?.[0]?.extensions?.code ?? null, message: json.errors?.[0]?.message ?? null,
  conflicts: json.errors?.[0]?.extensions?.conflicts ?? null })
const issues = async () => (await gql('{skillNameIssues{name usedPath ignoredPaths kind}}')).skillNameIssues
const check = async (id, title, fn) => {
  try { evidence.checks[id] = { title, ...(await fn()) } } catch (error) { evidence.checks[id] = { title, result: 'Fail', error: String(error?.stack ?? error).slice(0, 800) } }
  console.log(`${id}: ${evidence.checks[id].result} — ${title}`)
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2))
}

try {
  await fs.mkdir(outDir, { recursive: true })
  owned = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cie-d19-')))
  const dataRoot = path.join(owned, 'server-data')
  const codexHome = path.join(owned, 'codex-home')
  const codexDefault = path.join(codexHome, 'skills')
  const autobyteusSkills = path.join(owned, 'autobyteus-skills')
  const skillsDir = path.join(dataRoot, 'skills')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  await fs.cp(path.join(deskPackage, 'agents'), path.join(dataRoot, 'agents'), { recursive: true })
  for (const file of ['auth.json', 'config.toml']) {
    await fs.mkdir(codexHome, { recursive: true })
    await fs.copyFile(path.join(os.homedir(), '.codex', file), path.join(codexHome, file)).catch(() => undefined)
  }
  // The real layout (AF-36): `~/.codex/skills` added before `autobyteus-skills`, with different contents.
  const stale = await writeSkill(path.join(codexDefault, 'resume-designer'), 'resume-designer', 'STALE CODEX COPY')
  const maintained = await writeSkill(path.join(autobyteusSkills, 'resume-designer'), 'resume-designer', 'MAINTAINED COPY')
  // AR-013 fixtures: tier 4 vs tier 3 and tier 2 vs tier 3 (out-of-band duplicates, different contents).
  const t4Ignored = await writeSkill(path.join(codexDefault, 'ar13-t4'), 'ar13-t4', 'IGNORED T4')
  const t4Used = await writeSkill(path.join(autobyteusSkills, 'ar13-t4'), 'ar13-t4', 'USED T3')
  await fs.writeFile(path.join(t4Used, 'used-only.md'), 'USED FILE T4')
  await writeAgent(dataRoot, 'ar13-agent')
  const t2Used = await writeSkill(path.join(dataRoot, 'agents', 'ar13-agent', 'skills', 'ar13-t2'), 'ar13-t2', 'USED T2')
  await fs.writeFile(path.join(t2Used, 'used-only.md'), 'USED FILE T2')
  const t2Ignored = await writeSkill(path.join(autobyteusSkills, 'ar13-t2'), 'ar13-t2', 'IGNORED T3')
  await writeSkill(path.join(codexDefault, 'codex-only-dup'), 'codex-only-dup', 'CODEX ONLY')
  // Codex runtime duplicate: a stale copy of the package skill `desk-alpha` in the Codex default folder.
  await writeSkill(path.join(codexDefault, 'desk-alpha'), 'desk-alpha', 'STALE CODEX DESK-ALPHA')

  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const port = await freePort(); backendUrl = `http://127.0.0.1:${port}`
  const envFile = path.join(dataRoot, '.env')
  await fs.writeFile(envFile, [`APP_ENV=development`, `DB_TYPE=sqlite`, `DATABASE_URL=${dbUrl}`, `AUTOBYTEUS_SERVER_HOST=${backendUrl}`,
    `AUTOBYTEUS_SKILLS_PATHS=${codexDefault},${autobyteusSkills}`, ''].join('\n'))
  Object.assign(evidence, { owned, backendUrl, layout: { skillsDir, codexDefault, autobyteusSkills, settingsOrder: [codexDefault, autobyteusSkills] } })
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

  await check('P1', 'Precedence, real layout: `~/.codex/skills` listed first in Settings, `autobyteus-skills` wins (AC-019)', async () => {
    const skill = (await gql('{skill(name:"resume-designer"){rootPath content}}')).skill
    const issue = (await issues()).find((i) => i.name === 'resume-designer')
    const listed = (await gql('{skills{name}}')).skills.filter((s) => s.name === 'resume-designer').length
    return { skill, issue, listedOnce: listed === 1,
      result: skill.rootPath === maintained && issue?.kind === 'shadowed_runtime_default' && issue.ignoredPaths[0] === stale && listed === 1 ? 'Pass' : 'Fail' }
  })

  for (const [id, name, used, ignored, label] of [
    ['AR13-T4', 'ar13-t4', t4Used, t4Ignored, 'tier 4 vs tier 3'],
    ['AR13-T2', 'ar13-t2', t2Used, t2Ignored, 'tier 2 vs tier 3'],
  ]) {
    await check(id, `AR-013 (${label}): detail, file tree, read, update and delete act on the used copy; the ignored copy is untouched`, async () => {
      const ignoredHash = await hashTree(ignored)
      const detail = (await gql('query($n:String!){skill(name:$n){rootPath content}}', { n: name })).skill
      const tree = (await gql('query($n:String!){skillFileTree(name:$n)}', { n: name })).skillFileTree
      const read = (await gql('query($n:String!){skillFileContent(skillName:$n,path:"used-only.md")}', { n: name })).skillFileContent
      const issue = (await issues()).find((i) => i.name === name)
      const updated = (await gql('mutation($i:UpdateSkillInput!){updateSkill(input:$i){rootPath content}}', { i: { name, description: 'edited', content: 'EDITED' } })).updateSkill
      const usedManifestEdited = (await fs.readFile(path.join(used, 'SKILL.md'), 'utf8')).includes('EDITED')
      const deleted = (await gql('mutation($n:String!){deleteSkill(name:$n){success}}', { n: name })).deleteSkill
      const usedGone = !(await exists(used))
      const ignoredUntouched = (await hashTree(ignored)) === ignoredHash
      const afterDelete = (await gql('query($n:String!){skill(name:$n){rootPath}}', { n: name })).skill
      return { detail, treeHasUsedOnlyFile: String(tree).includes('used-only.md'), read, issue, updated, usedManifestEdited, deleted, usedGone, ignoredUntouched, afterDelete,
        result: detail.rootPath === used && String(tree).includes('used-only.md') && /USED FILE/.test(read) && issue?.usedPath === used
          && issue.ignoredPaths.includes(ignored) && updated.rootPath === used && usedManifestEdited && deleted.success && usedGone
          && ignoredUntouched && afterDelete?.rootPath === ignored ? 'Pass' : 'Fail' }
    })
  }

  await check('I1', 'Add a skill folder with a tiers 1–3 duplicate → SKILL_NAME_CONFLICT; the setting is unchanged', async () => {
    const incoming = path.join(owned, 'incoming-folder')
    const incomingCopy = await writeSkill(path.join(incoming, 'desk-alpha'), 'desk-alpha', 'INCOMING')
    const envBefore = await fs.readFile(envFile, 'utf8')
    const sourcesBefore = (await gql('{skillSources{path}}')).skillSources
    const outcome = conflictOf(await gqlRaw('mutation($p:String!){addSkillSource(path:$p){path}}', { p: incoming }))
    const unchanged = envBefore === await fs.readFile(envFile, 'utf8')
      && JSON.stringify(sourcesBefore) === JSON.stringify((await gql('{skillSources{path}}')).skillSources)
    return { outcome, unchanged, result: outcome.code === 'SKILL_NAME_CONFLICT' && outcome.conflicts?.[0]?.incomingPath === incomingCopy
      && outcome.conflicts?.[0]?.existingPath.endsWith(path.join('agents', 'desk-helper', 'skills', 'desk-alpha')) && unchanged ? 'Pass' : 'Fail' }
  })

  await check('I2', 'Create a skill whose name exists in tiers 1–3 → SKILL_NAME_CONFLICT; nothing is created', async () => {
    const outcome = conflictOf(await gqlRaw('mutation($i:CreateSkillInput!){createSkill(input:$i){rootPath}}', { i: { name: 'desk-alpha', description: 'd', content: 'c' } }))
    const created = await exists(path.join(skillsDir, 'desk-alpha'))
    return { outcome, created, result: outcome.code === 'SKILL_NAME_CONFLICT' && outcome.conflicts?.length === 1 && !created ? 'Pass' : 'Fail' }
  })

  await check('I3', 'Create a skill that only duplicates a runtime default copy → accepted; the new copy wins, the Codex copy is shadowed', async () => {
    const created = (await gql('mutation($i:CreateSkillInput!){createSkill(input:$i){rootPath}}', { i: { name: 'codex-only-dup', description: 'd', content: 'c' } })).createSkill
    const used = (await gql('{skill(name:"codex-only-dup"){rootPath}}')).skill
    const issue = (await issues()).find((i) => i.name === 'codex-only-dup')
    return { created, used, issue, result: used.rootPath === path.join(skillsDir, 'codex-only-dup') && issue?.kind === 'shadowed_runtime_default' ? 'Pass' : 'Fail' }
  })

  await check('I4', 'Import a local package with a duplicate → SKILL_NAME_CONFLICT; packages unchanged', async () => {
    const pkg = path.join(owned, 'pkg-conflict')
    await writeAgent(pkg, 'dup-agent', ['resume-designer'])
    const incomingCopy = await writeSkill(path.join(pkg, 'agents', 'dup-agent', 'skills', 'resume-designer'), 'resume-designer', 'PACKAGE COPY')
    const before = (await gql('{agentPackages{packageId}}')).agentPackages
    const outcome = conflictOf(await gqlRaw('mutation($i:ImportAgentPackageInput!){importAgentPackage(input:$i){packageId}}', { i: { sourceKind: 'LOCAL_PATH', source: pkg } }))
    const after = (await gql('{agentPackages{packageId}}')).agentPackages
    return { outcome, packagesUnchanged: JSON.stringify(before) === JSON.stringify(after),
      result: outcome.code === 'SKILL_NAME_CONFLICT' && outcome.conflicts?.[0]?.existingPath === maintained
        && outcome.conflicts?.[0]?.incomingPath === incomingCopy && JSON.stringify(before) === JSON.stringify(after) ? 'Pass' : 'Fail' }
  })

  await check('I5', 'R-3: a reload after an out-of-band duplicate is rejected, keeps the registration; the banner lists the on-disk conflict', async () => {
    const pkg = path.join(owned, 'pkg-ok')
    await writeAgent(pkg, 'ok-agent')
    const imported = (await gql('mutation($i:ImportAgentPackageInput!){importAgentPackage(input:$i){packageId path}}', { i: { sourceKind: 'LOCAL_PATH', source: pkg } })).importAgentPackage
    const packageId = imported.find((p) => p.path === pkg)?.packageId
    const pulled = await writeSkill(path.join(pkg, 'agents', 'ok-agent', 'skills', 'desk-alpha'), 'desk-alpha', 'PULLED')
    const outcome = conflictOf(await gqlRaw('mutation($id:String!){reloadAgentPackage(packageId:$id){packageId}}', { id: packageId }))
    const stillRegistered = (await gql('{agentPackages{packageId}}')).agentPackages.some((p) => p.packageId === packageId)
    const issue = (await issues()).find((i) => i.name === 'desk-alpha' && i.kind === 'conflict')
    return { packageId, outcome, stillRegistered, issue,
      result: outcome.code === 'SKILL_NAME_CONFLICT' && stillRegistered && issue?.ignoredPaths.includes(pulled) ? 'Pass' : 'Fail' }
  })

  await check('C1', 'Codex: a stale `CODEX_HOME/skills` copy → the catalog copy is exposed and `codex-runtime-duplicate` is logged', async () => {
    const workspace = await fs.realpath(await fs.mkdtemp(path.join(owned, 'ws-codex-')))
    const snapshots = (await gql('query{providerModelCatalogSnapshots(runtimeKind:"codex_app_server"){llmModels{modelIdentifier}}}')).providerModelCatalogSnapshots
    const ids = snapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
    const model = ids.find((id) => id === 'gpt-5.5') ?? ids[0]
    if (!model) return { result: 'Unavailable', reason: 'no Codex model' }
    const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: {
      agentDefinitionId: 'desk-lead', workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', runtimeKind: 'codex_app_server',
    } })).createAgentRun
    const link = path.join(workspace, '.codex', 'skills', 'desk-alpha')
    const linkTarget = await fs.realpath(link).catch(() => null)
    const logLines = (await fs.readFile(backendLogPath, 'utf8')).split('\n').filter((l) => l.includes('codex-runtime-duplicate') && l.includes("skill='desk-alpha'"))
    if (run.runId) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: run.runId }).catch(() => undefined)
    await delay(1500)
    return { model, run, linkTarget, duplicateLog: logLines.map((l) => l.slice(0, 400)), linkAfterTerminate: await fs.lstat(link).then(() => 'present', () => 'absent'),
      result: run.success && String(linkTarget).endsWith(path.join('agents', 'desk-helper', 'skills', 'desk-alpha')) && logLines.length > 0 ? 'Pass' : 'Fail' }
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
