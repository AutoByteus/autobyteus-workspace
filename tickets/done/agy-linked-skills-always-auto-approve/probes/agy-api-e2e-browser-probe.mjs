#!/usr/bin/env node
// API/E2E broader-validation probe for ticket agy-linked-skills-always-auto-approve (API-REV-001).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → installed `agy`.
// Everything runs in an owned temp data root on free ports with a sanitized environment; the user's running
// app and `~/.autobyteus` are never touched.
//
// Cases (see api-e2e-test-case-ledger.md):
//   B01 Chat (Daily Assistant, ALL_INSTALLED) on AGY with the user's REAL skill set, read-only through
//       AUTOBYTEUS_SKILLS_PATHS (includes browser-automation with its real .venv): the run starts, the agent
//       reads browser-automation/SKILL.md through the capsule link and quotes it (AC-001, ASM-001).
//   B02 New Team run form with AGY: team auto-approve on, locked, explained; member override for an AGY
//       member shows it locked; switching the team runtime away restores the editable switch (AC-007).
//   B03 New Org run panel with AGY: same checks on the org root (AC-007).
//   B04 Mobile launch card at a phone viewport with AGY: same checks (AC-007).
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Google Chrome, a logged-in `agy` CLI.
// Usage (from autobyteus-web): node <this file> --output-dir <dir> [--cases B01,B02] [--real-skills <dir>]
//        [--explore]   (bring up the stack + seed data, print URLs, wait for Ctrl+C)
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const webDir = process.cwd()
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const serverDir = path.join(path.resolve(webDir, '..'), 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), 'agy-api-e2e-browser-probe')))
const realSkills = path.resolve(arg('real-skills', '/Users/normy/autobyteus_org/autobyteus-skills'))
const onlyCases = arg('cases', null)?.split(',')
const explore = process.argv.includes('--explore')
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync)
const AGY = 'antigravity_cli'
const MODEL = arg('model', 'gemini-3.8-flash-low')
const LOCKED_HELP = "Antigravity always runs with auto-approve, so it can't be turned off."

const evidence = { startedAt: new Date().toISOString(), commit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: webDir, encoding: 'utf8' }).stdout.trim(),
  agyVersion: spawnSync('agy', ['--version'], { encoding: 'utf8' }).stdout.trim(), cases: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 250) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch (e) { last = e } await delay(interval) }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`)
}
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`))
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

let ownedRoot, dataRoot, backendUrl, frontUrl, workspace
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const terminate = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })
const sel = (t) => `[data-test="${t}"]`
const state = { runs: [], seed: {} }
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn, ...(id === 'B04' ? { viewport: { width: 390, height: 844 }, mobile: true } : {}) })

const seed = async () => {
  const agent = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: `${name} probe agent`, instructions: 'Answer briefly.', category: 'probe', toolNames: [] } })).createAgentDefinition.id
  const lead = await agent('Probe Lead'); const member = await agent('Probe Member'); const director = await agent('Probe Director')
  const team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: 'Probe AGY Team', description: 'AC-007 team', instructions: 'Coordinate.', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'member', ref: member, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id
  const org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
    { input: { name: 'Probe AGY Org', description: 'AC-007 org', instructions: 'Answer.', members: [
      { memberName: 'director', ref: director, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'team', ref: team, refType: 'AGENT_TEAM', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition.id
  Object.assign(state.seed, { lead, member, director, team, org })
}

const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const pickChatModel = async (page, runtimeKind, model) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
  await page.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const ids = await page.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = ids.includes(model) ? model : ids[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  await delay(500)
  return chosen
}
const switchState = (page, selector) => page.locator(selector).first().evaluate((b) => ({
  checked: b.getAttribute('aria-checked') ?? String(b.checked), disabled: b.disabled }))
const selectRuntime = async (page, selectId, runtimeKind) => { await page.locator(`#${selectId}`).selectOption(runtimeKind); await delay(700) }
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true })

defineCase('B01', 'Live Chat on AGY with the real skill set incl. browser-automation/.venv (AC-001, ASM-001)', async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 })
  await delay(800)
  const model = await pickChatModel(page, AGY, MODEL)
  const input = page.locator(`${sel('chat-composer')} textarea`).first()
  await input.click()
  await input.fill('Do not run any commands or scripts. Read the SKILL.md file of your browser-automation skill and reply with only the first sentence that follows its "# Browser Automation" heading, quoted exactly.')
  await page.locator(sel('chat-primary-action')).first().click()
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 240000 })
  const runId = new URL(page.url()).searchParams.get('id')
  state.runs.push(runId)
  await waitFor('agent quotes the real SKILL.md', async () => /bundled launcher referenced here/.test(await page.locator('body').innerText()), 300000, 1000)
  await shot(page, 'B01-chat-agy-real-skills-reply')
  const config = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{runtimeKind llmModelIdentifier autoExecuteTools agentDefinitionId}}}', { runId })).getAgentRunResumeConfig.metadataConfig
  const skillsDir = path.join(dataRoot, 'memory', 'agents', runId, 'agy-project', '.agents', 'skills')
  const entries = await fs.readdir(skillsDir)
  const links = {}
  for (const name of entries) {
    const entry = path.join(skillsDir, name)
    links[name] = (await fs.lstat(entry)).isSymbolicLink() ? await fs.readlink(entry) : 'NOT-A-LINK'
  }
  const backendLog = await fs.readFile(path.join(outDir, 'backend.log'), 'utf8')
  const runLines = backendLog.split('\n').filter((l) => l.includes(runId) && /skipped|Failed to prepare|ACTIVATION_FAILED/.test(l)).map((l) => l.slice(0, 300))
  assert(config.runtimeKind === AGY && config.agentDefinitionId === 'autobyteus-daily-assistant', 'Not a Daily Assistant AGY run', config)
  assert(links['browser-automation'] === await fs.realpath(path.join(realSkills, 'browser-automation')), 'browser-automation is not linked to the real folder', links)
  assert(Object.values(links).every((t) => t !== 'NOT-A-LINK'), 'A capsule skill entry is not a link', links)
  assert(!runLines.some((l) => /Failed to prepare|ACTIVATION_FAILED/.test(l)), 'Run preparation failed', runLines)
  return { runId, model, metadataConfig: config, linkedSkills: links, skillCount: entries.length, runLogLines: runLines }
})

defineCase('B02', 'New Team run form + member override with AGY: locked on with explanation; other runtime editable (AC-007)', async (page) => {
  await page.goto(`${frontUrl}/agent-teams?view=team-detail&id=${state.seed.team}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Run', exact: true }).click({ timeout: 120000 })
  await page.locator(sel('team-run-config-form')).waitFor({ timeout: 60000 })
  const read = async () => ({ root: await switchState(page, '#team-scope-root-auto-execute'),
    help: (await page.locator(sel('team-auto-approve-help')).innerText()).trim(),
    members: await page.locator(sel('member-override-item')).evaluateAll((items) => items.map((it) => ({
      name: it.querySelector('[id^="override-auto--"]')?.id.replace('override-auto--', ''),
      checked: it.querySelector('[id^="override-auto--"]')?.checked, disabled: it.querySelector('[id^="override-auto--"]')?.disabled,
      lockedNote: it.querySelector('[data-test="member-auto-approve-locked"]')?.textContent.trim() ?? null }))) })
  await selectRuntime(page, 'team-scope-root-runtime-kind', AGY)
  await page.locator(sel('team-member-overrides-toggle')).click().catch(() => {})
  await delay(500)
  const agyTeam = await read()
  await shot(page, 'B02-team-agy-locked')
  // Clicking a locked switch changes nothing.
  await page.locator('#team-scope-root-auto-execute').dispatchEvent('click')
  const afterClick = await switchState(page, '#team-scope-root-auto-execute')
  await selectRuntime(page, 'team-scope-root-runtime-kind', 'codex_app_server')
  const codexTeam = await read()
  await selectRuntime(page, 'override-runtime--member', AGY)
  const agyMember = await read()
  await shot(page, 'B02-team-codex-member-agy-locked')
  assert(agyTeam.root.checked === 'true' && agyTeam.root.disabled && agyTeam.help === LOCKED_HELP, 'AGY team switch not locked on', agyTeam)
  assert(agyTeam.members.every((m) => m.checked && m.disabled && m.lockedNote === LOCKED_HELP), 'AGY team members not locked', agyTeam)
  assert(afterClick.checked === 'true', 'Locked switch changed on click', afterClick)
  assert(!codexTeam.root.disabled && codexTeam.help !== LOCKED_HELP && codexTeam.members.every((m) => !m.disabled && !m.lockedNote), 'Codex team not editable', codexTeam)
  const member = agyMember.members.find((m) => m.name === 'member'); const lead = agyMember.members.find((m) => m.name === 'lead')
  assert(member?.disabled && member.checked && member.lockedNote === LOCKED_HELP, 'AGY member override not locked', agyMember)
  assert(lead && !lead.disabled && !lead.lockedNote, 'Non-AGY member became locked', agyMember)
  return { agyTeam, afterClick, codexTeam, agyMember }
})

defineCase('B03', 'New Org run panel with AGY root and AGY nested team: locked on with explanation (AC-007)', async (page) => {
  await page.goto(`${frontUrl}/workspace?rootSubjectKind=agent_org&definitionId=${state.seed.org}&mode=configuration`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('agent-org-run-config')).waitFor({ timeout: 120000 })
  await delay(1500)
  const read = () => page.locator(sel('agent-org-run-config')).evaluate((p) => ({
    switches: [...p.querySelectorAll('button[aria-checked], input[type=checkbox]')].map((b) => ({ id: b.id || 'org-root',
      checked: b.getAttribute('aria-checked') ?? String(b.checked), disabled: b.disabled })),
    orgHelp: p.querySelector('[data-test="org-auto-approve-help"]')?.textContent.trim(),
    teamHelp: p.querySelector('[data-test="team-scope-auto-approve-help"]')?.textContent.trim() }))
  await page.locator(sel('org-member-overrides-toggle')).click().catch(() => {})
  await selectRuntime(page, 'org-run-runtime-kind', AGY)
  const agyRoot = await read()
  await shot(page, 'B03-org-agy-locked')
  await selectRuntime(page, 'org-run-runtime-kind', 'codex_app_server')
  const codexRoot = await read()
  // The nested team's own settings sit behind its disclosure chevron.
  if (!(await page.locator('#team-scope-team-runtime-kind').isVisible())) await page.locator(sel('team-scope-chevron')).first().click()
  await selectRuntime(page, 'team-scope-team-runtime-kind', AGY)
  const agyNestedTeam = await read()
  await shot(page, 'B03-org-codex-root-agy-team')
  const byId = (r, id) => r.switches.find((s) => s.id === id)
  assert(agyRoot.switches.length >= 3 && agyRoot.switches.every((s) => s.checked === 'true' && s.disabled), 'AGY org switches not all locked on', agyRoot)
  assert(agyRoot.orgHelp === LOCKED_HELP && agyRoot.teamHelp === LOCKED_HELP, 'AGY org explanation missing', agyRoot)
  assert(codexRoot.switches.every((s) => !s.disabled) && codexRoot.orgHelp !== LOCKED_HELP, 'Codex org not editable', codexRoot)
  assert(!byId(agyNestedTeam, 'org-root').disabled && !byId(agyNestedTeam, 'override-auto--director').disabled, 'Codex members locked', agyNestedTeam)
  assert(byId(agyNestedTeam, 'team-scope-team-auto-execute').disabled && byId(agyNestedTeam, 'team-scope-team-auto-execute').checked === 'true'
    && agyNestedTeam.teamHelp === LOCKED_HELP, 'AGY nested team not locked', agyNestedTeam)
  return { agyRoot, codexRoot, agyNestedTeam }
})

const B04 = { id: 'B04', title: 'Paired phone: mobile launch card with AGY locked on with explanation; mobile AGY run launches (AC-007, AC-006)',
  viewport: { width: 390, height: 844 }, mobile: true }
defineCase(B04.id, B04.title, async (page) => {
  const backendPort = new URL(backendUrl).port
  await fetch(`${backendUrl}/rest/remote-access/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneAccessEnabled: true }) })
  const session = await (await fetch(`${backendUrl}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serverBaseUrl: `http://probe-node:${backendPort}`, serverName: 'Probe node', trustedPrivateHttpAcknowledged: true }) })).json()
  await page.goto(`${frontUrl}/mobile?pairing=${new URL(session.mobileUrl).searchParams.get('pairing')}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid=mobile-pair-button]').click({ timeout: 120000 })
  await page.locator('[data-testid=mobile-home]').waitFor({ timeout: 60000 })
  await page.getByText('Choose work').first().click()
  await page.locator('[data-testid=mobile-context-segment-agents]').click()
  await page.locator('[data-testid=mobile-context-list] [data-testid=mobile-readable-work-row]', { hasText: 'Probe Lead' }).first().click()
  await page.locator('[data-testid=mobile-run-setup]').waitFor({ timeout: 60000 })
  const card = async () => ({ switch: await switchState(page, '[data-testid=mobile-run-auto-approve-tools-switch]'),
    help: (await page.locator('[data-testid=mobile-run-auto-approve-tools-help]').innerText()).trim() })
  await page.locator('#mobile-agent-run-runtime-kind').selectOption(AGY)
  await delay(800)
  const agy = await card()
  await page.locator('[data-testid=mobile-launch-run-options-card]').scrollIntoViewIfNeeded()
  await shot(page, 'B04-mobile-agy-locked')
  await page.locator('[data-testid=mobile-run-auto-approve-tools-switch]').dispatchEvent('click')
  const afterClick = await card()
  await page.locator('#mobile-agent-run-runtime-kind').selectOption('codex_app_server')
  await delay(800)
  const codex = await card()
  assert(agy.switch.checked === 'true' && agy.switch.disabled && agy.help === LOCKED_HELP, 'Mobile AGY switch not locked on', agy)
  assert(afterClick.switch.checked === 'true', 'Locked mobile switch changed', afterClick)
  assert(!codex.switch.disabled && codex.help !== LOCKED_HELP, 'Mobile Codex switch not editable', codex)
  // Launch an AGY run from the phone (mobile createAgentRun entry): the server must start agy with always-proceed.
  await page.locator('#mobile-agent-run-runtime-kind').selectOption(AGY)
  await delay(800)
  // The model control is a searchable dropdown: open it and pick the preferred AGY model.
  const modelCard = page.locator('[data-testid=mobile-launch-runtime-model-card]')
  await modelCard.getByText('Select a model').click()
  const option = await waitFor('AGY model option on phone', async () => {
    const candidates = page.locator('[role="option"], [role="menuitemradio"], li').filter({ hasText: /flash/i })
    return (await candidates.count()) > 0 ? candidates.first() : null
  }, 120000, 500)
  evidence.mobileModelOption = (await option.innerText()).trim()
  await option.click()
  await delay(500)
  await page.locator('[data-testid=mobile-run-workspace-path-input]').fill(workspace)
  await page.locator('[data-testid=mobile-run-workspace-load]').click()
  await waitFor('workspace loaded', async () => (await page.locator('[data-testid=mobile-run-setup-readiness]').innerText()).includes('Ready'), 60000, 500)
  const publishedBefore = (await fs.readFile(path.join(outDir, 'backend.log'), 'utf8')).length
  await page.locator('[data-testid=mobile-run-launch]').click()
  // The run is prepared; Chat opens and the first message activates it (the same lazy activation as desktop).
  const composer = page.locator('textarea').first()
  await composer.waitFor({ timeout: 60000 })
  await composer.fill('Reply with exactly MOBILE-AGY-OK and do not use tools.')
  await composer.press('Enter').catch(() => {})
  await delay(500)
  if ((await composer.inputValue().catch(() => '')).length) await page.locator('button[type=submit], [data-testid*=send]').last().click()
  const runId = await waitFor('mobile AGY run active', async () => {
    const log = (await fs.readFile(path.join(outDir, 'backend.log'), 'utf8')).slice(publishedBefore)
    return [...log.matchAll(/Published antigravity_cli agent run '([^']+)'/g)].map((x) => x[1]).at(-1)
  }, 180000, 1000)
  await waitFor('mobile AGY reply', async () => (await page.locator('body').innerText()).includes('MOBILE-AGY-OK\n') ||
    (await page.locator('body').innerText()).split('MOBILE-AGY-OK').length > 2, 180000, 1000).catch(() => null)
  state.runs.push(runId)
  const meta = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{runtimeKind autoExecuteTools}}}', { runId })).getAgentRunResumeConfig
  await shot(page, 'B04-mobile-agy-run-launched')
  assert(meta.isActive && meta.metadataConfig.runtimeKind === AGY, 'Mobile AGY run is not active', meta)
  return { agy, afterClick, codex, launchedRunId: runId, launchedMetadata: meta }
})

let exitCode = 0
let backend, frontend, browser
try {
  assert(chrome, 'Google Chrome not found')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agy-api-e2e-probe-')))
  dataRoot = path.join(ownedRoot, 'server-data')
  workspace = path.join(ownedRoot, 'workspace')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  await fs.mkdir(workspace, { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl, realSkills })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  // The user's real skills checkout is only read: AGY links its folders into the owned run capsules.
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl,
    DISABLE_HTTP_REQUEST_LOGS: 'true', AUTOBYTEUS_SKILLS_PATHS: realSkills }
  backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  frontend = spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  await seed()
  evidence.seed = state.seed
  if (explore) {
    console.log(JSON.stringify({ frontUrl, backendUrl, ownedRoot, seed: state.seed }))
    await fs.writeFile(path.join(outDir, 'explore-stack.json'), JSON.stringify({ frontUrl, backendUrl, ownedRoot, seed: state.seed, pids: owned.map((c) => c.pid) }, null, 2))
    await new Promise((resolve) => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
  } else {
    // `probe-node` stands in for the desktop's private LAN host name a paired phone uses (B04).
    browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--host-resolver-rules=MAP probe-node 127.0.0.1'] })
    for (const c of cases.filter((x) => !onlyCases || onlyCases.includes(x.id))) {
      const context = await browser.newContext({ viewport: c.viewport ?? { width: 1440, height: 900 }, locale: 'en-US', isMobile: Boolean(c.mobile), hasTouch: Boolean(c.mobile) })
      const page = await context.newPage(); page.setDefaultTimeout(30000)
      const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message))
      const started = Date.now()
      try {
        evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: 0, details: await c.fn(page, context) }
        evidence.cases[c.id].ms = Date.now() - started
      } catch (error) {
        exitCode = 1
        await page.screenshot({ path: path.join(outDir, `${c.id}-failure.png`), fullPage: true }).catch(() => {})
        evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      }
      evidence.cases[c.id].browserErrors = browserErrors
      console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
      await context.close()
      await fs.writeFile(path.join(outDir, 'probe-evidence.json'), JSON.stringify(evidence, null, 2))
    }
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[agy-api-e2e-browser-probe] ${error.message}`)
} finally {
  for (const runId of state.runs) await terminate(runId).catch(() => {})
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  evidence.realSkillsGitStatus = spawnSync('git', ['status', '--porcelain'], { cwd: realSkills, encoding: 'utf8' }).stdout
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'probe-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
