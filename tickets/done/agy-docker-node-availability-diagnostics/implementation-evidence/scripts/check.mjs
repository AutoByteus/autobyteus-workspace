// Ad-hoc rendered check (implementation self-validation, not a committed probe).
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const wt = process.argv[2]
const outDir = process.argv[3]
const webDir = path.join(wt, 'autobyteus-web'); const serverDir = path.join(wt, 'autobyteus-server-ts')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })
const waitFor = async (what, fn, timeout) => { const t = Date.now(); while (Date.now() - t < timeout) { try { if (await fn()) return } catch {} await delay(500) } throw new Error('timeout ' + what) }
const owned = []
const spawnOwned = (name, cmd, args, cwd, env) => { const log = createWriteStream(path.join(outDir, name + '.log')); const c = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }); c.stdout.pipe(log); c.stderr.pipe(log); owned.push(c); return c }
const results = {}
let browser, root
try {
  await fs.mkdir(outDir, { recursive: true })
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-diag-render-'))
  const home = path.join(root, 'home'); await fs.mkdir(home)
  const dataRoot = path.join(root, 'data'); await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const stateFile = path.join(root, 'agy-state'); await fs.writeFile(stateFile, 'signed-out')
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'r.db')).href
  const bp = await freePort(), fp = await freePort()
  const backendUrl = `http://127.0.0.1:${bp}`, frontUrl = `http://127.0.0.1:${fp}`
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  const base = { HOME: home, PATH: process.env.PATH, USER: process.env.USER, LANG: process.env.LANG ?? 'en_US.UTF-8', TMPDIR: process.env.TMPDIR }
  await new Promise((res, rej) => spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...base, HOME: process.env.HOME, DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' }).once('exit', (c) => c === 0 ? res() : rej(new Error('migrate ' + c))))
  spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(bp), '--data-dir', dataRoot], serverDir,
    { ...base, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true',
      ANTIGRAVITY_CLI_COMMAND: '/tmp/agy-diag-render/fake-agy.cjs', AGY_RENDER_STATE: stateFile })
  await waitFor('backend', async () => (await fetch(`${backendUrl}/rest/health`)).ok, 120000)
  const gql = async (q, v) => (await (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) })).json())
  results.graphqlSignedOut = await gql('query($k:String!){runtimeAvailability(runtimeKind:$k){runtimeKind enabled reason}}', { k: 'antigravity_cli' })
  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(fp)], webDir, { ...base, HOME: process.env.HOME, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('nuxt', async () => (await fetch(`${frontUrl}/chat`)).ok, 240000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  for (const locale of ['en-US']) {
    const ctx = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale })
    const page = await ctx.newPage(); page.setDefaultTimeout(60000)
    const errors = []; page.on('pageerror', (e) => errors.push(e.message))
    const gqlOps = []; page.on('request', (r) => { if (r.url().includes('/graphql')) { try { const b = JSON.parse(r.postData() ?? '{}'); gqlOps.push(`${b.operationName ?? '?'}:${JSON.stringify(b.variables ?? {})}`) } catch {} } })
    await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-test="chat-composer"]').waitFor({ timeout: 180000 }); await delay(3000)
    // Warm-up open (cold Nuxt may reload); then a real open.
    await page.locator('[data-test="chat-model-trigger"]').click(); await delay(4000)
    await page.screenshot({ path: path.join(outDir, '01-signed-out-menu.png') })
    const row = page.locator('[data-test="chat-runtime-antigravity_cli"]')
    results.signedOutRow = await row.evaluate((e) => ({ text: e.innerText, title: e.getAttribute('title'), ariaDisabled: e.getAttribute('aria-disabled'),
      reasonBox: e.querySelector('[data-test="chat-runtime-reason"]')?.getBoundingClientRect().toJSON(), rowBox: e.getBoundingClientRect().toJSON(),
      label: e.querySelector('[data-test="chat-runtime-unavailable"]')?.textContent }))
    results.menuText = await page.locator('[data-test="chat-model-menu"]').innerText()
    results.allRows = await page.locator('[data-test^="chat-runtime-"][data-runtime]').evaluateAll((els) => els.map((e) => ({ kind: e.dataset.runtime, disabled: e.getAttribute('aria-disabled'), text: e.innerText })))
    // Arrow keys skip disabled rows.
    await page.keyboard.press('Escape'); await delay(500)
    // Sign in, reopen.
    await fs.writeFile(stateFile, 'signed-in')
    const before = gqlOps.length
    await page.locator('[data-test="chat-model-trigger"]').click()
    await page.waitForFunction(() => document.querySelector('[data-test="chat-runtime-antigravity_cli"]')?.getAttribute('aria-disabled') !== 'true', null, { timeout: 30000 }).catch(() => {})
    await delay(1000)
    results.recheckRequests = gqlOps.slice(before)
    results.signedInRow = await row.evaluate((e) => ({ text: e.innerText, ariaDisabled: e.getAttribute('aria-disabled') }))
    await row.hover(); await delay(3000)
    results.submenu = await page.locator('[data-test="chat-model-submenu"]').innerText().catch((e) => 'NO SUBMENU ' + e.message)
    await page.screenshot({ path: path.join(outDir, '02-signed-in-reopened.png') })
    // Third open: all-available runtimes must not be forced again.
    await page.keyboard.press('Escape'); await delay(500)
    const before3 = gqlOps.length
    await page.locator('[data-test="chat-model-trigger"]').click(); await delay(2000)
    results.thirdOpenRequests = gqlOps.slice(before3)
    results.pageErrors = errors
    await ctx.close()
  }
  // Narrow (bottom sheet) look at signed-out state.
  await fs.writeFile(stateFile, 'signed-out')
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage(); page.setDefaultTimeout(60000)
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-test="chat-composer"]').waitFor({ timeout: 180000 }); await delay(3000)
  await page.locator('[data-test="chat-model-trigger"]').click(); await delay(4000)
  await page.screenshot({ path: path.join(outDir, '03-narrow-signed-out.png') })
  results.narrowRow = await page.locator('[data-test="chat-runtime-antigravity_cli"]').innerText()
  await ctx.close()
} catch (e) { results.fatal = String(e.stack ?? e) }
finally {
  await browser?.close().catch(() => {})
  for (const c of owned.reverse()) { try { process.kill(-c.pid, 'SIGTERM') } catch {} }
  await delay(2000)
  for (const c of owned) { try { process.kill(-c.pid, 'SIGKILL') } catch {} }
  if (root) await fs.rm(root, { recursive: true, force: true })
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
