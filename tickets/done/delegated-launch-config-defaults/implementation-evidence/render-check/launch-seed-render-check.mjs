// Implementation self-check (delegated-launch-config-defaults, DS-006): renders the New chat Team
// member drawer and the Org launch page with definition defaults, on a test-owned backend + Nuxt dev.
// Not a durable probe. Usage: node launch-seed-render-check.mjs <worktree> <outDir>
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const worktree = process.argv[2]
const outDir = process.argv[3]
const webDir = path.join(worktree, 'autobyteus-web')
const serverDir = path.join(worktree, 'autobyteus-server-ts')
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const sel = (t) => `[data-test="${t}"]`
const results = { observations: [], browserErrors: [] }
const note = (key, value) => { results.observations.push({ key, value }); console.log(key, JSON.stringify(value)) }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`), { flags: 'a' })
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log); owned.push(child); return child
}
const waitFor = async (label, check, timeout, interval = 1000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) { try { const v = await check(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out: ${label}`)
}

let backendUrl, frontUrl, browser, ownedRoot
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const shot = async (page, name, width) => {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 }); await delay(800)
  await page.screenshot({ path: path.join(outDir, `${name}.png`) })
}

let exitCode = 0
try {
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dlcd-render-'))
  const dataRoot = path.join(ownedRoot, 'server-data'); await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`migrate ${code}`))))
  })
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir,
    { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' })
  await waitFor('backend', async () => backend.exitCode === null && (await fetch(`${backendUrl}/rest/health`)).ok, 120000, 500)

  // Definitions with defaults (Claude's catalog is static: haiku, sonnet).
  const haiku = { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'haiku' }
  const sonnet = { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet' }
  const agent = async (name, defaultLaunchConfig = null) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, description: `${name}.`, instructions: 'Reply briefly.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
  const lead = await agent('Lead')
  const engineer = await agent('Engineer', sonnet)
  const reviewer = await agent('Reviewer', { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'no-such-model' })
  const writer = await agent('Writer', sonnet)
  const team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name: 'Build Team', description: 'Builds.', instructions: 'Work together.', coordinatorMemberName: 'lead', handoffs: [], defaultLaunchConfig: haiku,
    nodes: [['lead', lead], ['engineer', engineer], ['reviewer', reviewer]].map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })),
  } })).createAgentTeamDefinition.id
  const org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
    name: 'Build Org', description: 'Org.', instructions: 'Plan.', handoffs: [], defaultLaunchConfig: haiku,
    members: [{ memberName: 'writer', ref: writer, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'build', ref: team, refType: 'AGENT_TEAM', refScope: 'SHARED' }],
  } })).createAgentOrgDefinition.id

  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('nuxt', async () => (await fetch(`${frontUrl}/chat`)).ok, 240000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => results.browserErrors.push(e.message))
  for (const route of ['/chat', '/agent-teams', '/agent-orgs']) { await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(5000) }
  results.browserErrors.length = 0

  // New chat for the Team (fresh start).
  await page.goto(`${frontUrl}/agent-teams`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Run', exact: true }).first().waitFor({ timeout: 120000 })
  await page.getByRole('button', { name: 'Run', exact: true }).first().click()
  await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await delay(4000)
  note('newChat.root', await page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).innerText())
  note('newChat.membersLine', (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' '))
  await shot(page, 'new-chat-team-members-line-804', 804)
  await page.locator(sel('run-members-open')).click()
  const drawer = page.locator(sel('run-member-settings-drawer')); await drawer.waitFor(); await delay(600)
  const row = (address) => drawer.locator(sel(`run-member-${address}`)).first()
  const rowState = async (address) => ({
    customized: await row(address).getAttribute('data-customized'),
    summary: (await row(address).locator(sel('run-member-summary')).innerText()).replace(/\s+/g, ' '),
    note: await row(address).locator(sel('run-member-launch-note')).innerText().catch(() => null),
  })
  note('drawer.seeded', { lead: await rowState('/lead'), engineer: await rowState('/engineer'), reviewer: await rowState('/reviewer') })
  await shot(page, 'new-chat-team-drawer-seeded-880', 880)
  await shot(page, 'new-chat-team-drawer-seeded-390', 390)
  await page.setViewportSize({ width: 1512, height: 952 }); await delay(500)
  // Engineer's own model equals Sonnet; switch the root to Sonnet: the pinned row stays its own (customized).
  await drawer.locator(sel('run-member-settings-done')).click(); await delay(500)
  await page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).click()
  await page.locator(sel('chat-model-menu')).first().waitFor()
  await page.locator(sel('chat-runtime-claude_agent_sdk')).hover(); await delay(500)
  await page.locator(sel('chat-model-list-claude_agent_sdk')).locator('button[role="menuitemradio"]').filter({ hasText: /sonnet/i }).first().click(); await delay(800)
  note('afterRootSonnet.root', await page.locator(`${sel('chat-composer')} ${sel('chat-model-trigger')}`).innerText())
  await page.locator(sel('run-members-open')).click(); await drawer.waitFor(); await delay(600)
  note('afterRootSonnet', { lead: await rowState('/lead'), engineer: await rowState('/engineer') })
  await row('/engineer').locator(sel('run-member-reset')).click(); await delay(600)
  note('afterEngineerReset', { engineer: await rowState('/engineer') })
  await shot(page, 'new-chat-team-drawer-after-reset-880', 880)
  await page.setViewportSize({ width: 1512, height: 952 }); await delay(500)

  // Org launch page (fresh start).
  await page.goto(`${frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  await page.locator(sel(`org-card-${org}`)).getByRole('button', { name: 'Run', exact: true }).click()
  await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await delay(4000)
  note('org.membersLine', (await page.locator(sel('run-members-line-text')).innerText()).replace(/\s+/g, ' '))
  await page.locator(sel('run-members-open')).click()
  const orgDrawer = page.locator(sel('run-member-settings-drawer')); await orgDrawer.waitFor(); await delay(800)
  const orgRow = (address) => orgDrawer.locator(sel(`run-member-${address}`)).first()
  const expandIfNeeded = async (address) => {
    const toggle = orgRow(address).locator(sel('run-member-toggle')).first()
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click(); await delay(500)
  }
  const orgState = async (address) => ({
    customized: await orgRow(address).getAttribute('data-customized'),
    summary: (await orgRow(address).locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' '),
    note: await orgRow(address).locator(sel('run-member-launch-note')).first().innerText().catch(() => null),
  })
  note('org.writer', await orgState('/writer'))
  note('org.build', await orgState('/build'))
  await expandIfNeeded('/build')
  note('org.build.members', { engineer: await orgState('/build/engineer'), reviewer: await orgState('/build/reviewer'), lead: await orgState('/build/lead') })
  await shot(page, 'org-launch-seeded-1280', 1280)
  await shot(page, 'org-launch-seeded-390', 390)
  note('browserErrors', results.browserErrors)
} catch (error) {
  exitCode = 1
  console.error('FAILED', error)
  results.error = String(error?.message ?? error)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned) { try { process.kill(-child.pid, 'SIGTERM') } catch {} }
  await delay(3000)
  for (const child of owned) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  if (ownedRoot) await fs.rm(ownedRoot, { recursive: true, force: true }).catch(() => {})
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
  console.log('cleanup done; owned processes', owned.map((c) => c.pid))
  process.exit(exitCode)
}
