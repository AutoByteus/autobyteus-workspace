// Temporary live probe (API/E2E, ticket agy-docker-node-availability-diagnostics). Not a committed probe:
// it needs Docker, the server image, and a real signed-in `agy` streamed from one of the user's nodes.
//
// Real Chrome (playwright-core) → this worktree's Nuxt dev → a test-owned Docker node
// (`autobyteus/autobyteus-server:beta` with this branch's server dist mounted read-only) → the image's real agy.
//
// Usage: node docker-node-live.mjs <worktree> <outDir> <backendUrl> <testContainer> <signInSourceContainer>
// The sign-in source is only read (tar of the agy oauth token file), streamed straight into the test container.
// Nothing is printed or written to the host. The test container is removed by the caller.
import { spawn, execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'

const [wt, outDir, backendUrl, container, signInSource] = process.argv.slice(2)
const webDir = path.join(wt, 'autobyteus-web')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const exec = promisify(execFile)
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const sel = (t) => `[data-test="${t}"]`
const SIGN_IN = process.env.AGY_SIGN_IN_TEXT ?? "Not signed in on this node. Run `agy` to sign in."
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })
const waitFor = async (what, fn, timeout) => { const t = Date.now(); while (Date.now() - t < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(500) } throw new Error('timeout ' + what) }
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message + (details === undefined ? '' : ' ' + JSON.stringify(details))); throw e } }
const sh = (cmd) => exec('/bin/sh', ['-c', cmd], { maxBuffer: 1 << 20 })

const ledger = path.join(outDir, 'cases.jsonl')
const results = { startedAt: new Date().toISOString(), backendUrl, container, cases: {}, cleanup: {} }
const record = async (id, result, data) => { results.cases[id] = { result, ...data }; await fs.appendFile(ledger, JSON.stringify({ id, at: new Date().toISOString(), result, ...data }) + '\n') }
const ONLY = process.env.CASES ? process.env.CASES.split(',') : null
const runCase = async (id, fn) => {
  if (ONLY && !ONLY.includes(id)) return
  await fs.appendFile(ledger, JSON.stringify({ id, at: new Date().toISOString(), event: 'Started' }) + '\n')
  try { await record(id, 'Pass', await fn()) } catch (e) { await record(id, 'Fail', { error: String(e.message ?? e) }) }
}

const signIn = () => sh(`docker exec ${signInSource} tar -C /root/.gemini/antigravity-cli -cf - antigravity-oauth-token | docker exec -i ${container} sh -c 'mkdir -p /root/.gemini/antigravity-cli && tar -C /root/.gemini/antigravity-cli -xf - && chmod 600 /root/.gemini/antigravity-cli/antigravity-oauth-token'`)
const signOut = () => sh(`docker exec ${container} rm -f /root/.gemini/antigravity-cli/antigravity-oauth-token`)
const gql = async (query, variables = {}) => (await (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json())

let frontend, browser
try {
  await fs.mkdir(outDir, { recursive: true })
  const fp = await freePort()
  const frontUrl = `http://127.0.0.1:${fp}`
  const log = createWriteStream(path.join(outDir, 'nuxt-dev.log'))
  frontend = spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(fp)], { cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LANG: 'en_US.UTF-8', TMPDIR: process.env.TMPDIR, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl } })
  frontend.stdout.pipe(log); frontend.stderr.pipe(log)
  await waitFor('nuxt', async () => (await fetch(`${frontUrl}/chat`)).ok, 300000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })

  const openPage = async (locale, viewport = { width: 1512, height: 952 }) => {
    const ctx = await browser.newContext({ viewport, locale })
    const page = await ctx.newPage(); page.setDefaultTimeout(60000)
    const errors = []; page.on('pageerror', (e) => errors.push(e.message))
    const ops = []; page.on('request', (r) => { if (r.url().includes('/graphql') && r.method() === 'POST') { try { const b = JSON.parse(r.postData() ?? '{}'); ops.push({ op: b.operationName ?? '?', vars: b.variables ?? {} }) } catch {} } })
    await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await page.locator(sel('chat-composer')).waitFor({ timeout: 240000 }); await delay(3000)
    return { ctx, page, errors, ops }
  }
  const openMenu = async (page) => { await page.locator(sel('chat-model-trigger')).click(); await page.locator(sel('chat-model-menu')).waitFor() }
  const closeMenu = async (page) => { await page.keyboard.press('Escape'); await page.locator(sel('chat-model-menu')).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {}) }
  const rowState = (page, kind) => page.locator(sel(`chat-runtime-${kind}`)).evaluate((e) => ({
    text: e.innerText, title: e.getAttribute('title'), ariaDisabled: e.getAttribute('aria-disabled'),
    label: e.querySelector('[data-test="chat-runtime-unavailable"]')?.textContent ?? null,
    reason: e.querySelector('[data-test="chat-runtime-reason"]')?.textContent ?? null,
    reasonLines: (() => { const r = e.querySelector('[data-test="chat-runtime-reason"]'); return r ? Math.round(r.getBoundingClientRect().height / parseFloat(getComputedStyle(r).lineHeight)) : null })(),
    reasonClamped: (() => { const r = e.querySelector('[data-test="chat-runtime-reason"]'); return r ? r.scrollHeight > r.clientHeight + 1 : null })(),
    nameBox: e.querySelector('span > span')?.getBoundingClientRect().toJSON(),
    labelBox: e.querySelector('[data-test="chat-runtime-unavailable"]')?.getBoundingClientRect().toJSON() ?? null,
    dotBox: e.querySelector('.rounded-full.bg-blue-600')?.getBoundingClientRect().toJSON() ?? null,
  }))
  const availabilityOps = (ops) => ops.filter((o) => /availab/i.test(o.op))

  // ---- en page, signed out
  const en = await openPage('en-US')
  await openMenu(en.page); await delay(3000); await closeMenu(en.page) // warm-up open (first load of availability)

  await runCase('LIVE-002', async () => {
    await openMenu(en.page)
    await en.page.waitForFunction(() => document.querySelector('[data-test="chat-runtime-antigravity_cli"]')?.getAttribute('aria-disabled') === 'true', null, { timeout: 30000 })
    await delay(2500)
    const row = await rowState(en.page, 'antigravity_cli')
    const menuText = await en.page.locator(sel('chat-model-menu')).innerText()
    await en.page.screenshot({ path: path.join(outDir, 'LIVE-002-signed-out-en.png') })
    // Arrow keys skip the unavailable row.
    const visited = []
    await en.page.locator(sel('chat-runtime-autobyteus')).focus()
    for (let i = 0; i < 8; i += 1) { await en.page.keyboard.press('ArrowDown'); visited.push(await en.page.evaluate(() => document.activeElement?.getAttribute('data-runtime') ?? document.activeElement?.getAttribute('data-test'))) }
    await en.page.mouse.move(5, 5); await en.page.locator(sel('chat-runtime-antigravity_cli')).click({ force: true }); await delay(800)
    const submenuAfterClick = await en.page.locator(sel('chat-model-list-antigravity_cli')).isVisible().catch(() => false)
    assert(row.ariaDisabled === 'true', 'row not aria-disabled', row)
    assert(row.label === 'Unavailable', 'label', row)
    assert(row.reason === SIGN_IN, 'reason line', row)
    assert(row.title === SIGN_IN, 'title', row)
    assert(!/not installed/i.test(menuText), 'menu says Not installed', menuText)
    assert(!visited.includes('antigravity_cli'), 'arrow keys reached the unavailable row', visited)
    assert(!submenuAfterClick, 'unavailable row opened its model list')
    await closeMenu(en.page)
    return { row, visited, submenuAfterClick, menuRuntimeRows: menuText.split('\n').slice(0, 20) }
  })

  await runCase('LIVE-003', async () => {
    const zh = await openPage('zh-CN')
    try {
      await openMenu(zh.page)
      await zh.page.waitForFunction(() => document.querySelector('[data-test="chat-runtime-antigravity_cli"]')?.getAttribute('aria-disabled') === 'true', null, { timeout: 30000 })
      await delay(2000)
      const row = await rowState(zh.page, 'antigravity_cli')
      const menuText = await zh.page.locator(sel('chat-model-menu')).innerText()
      await zh.page.screenshot({ path: path.join(outDir, 'LIVE-003-signed-out-zh-CN.png') })
      assert(row.label === '不可用', 'zh label', row)
      assert(row.reason === SIGN_IN, 'zh reason', row)
      assert(!/not installed|未安装/i.test(menuText), 'zh menu says not installed', menuText)
      return { row, pageErrors: zh.errors }
    } finally { await zh.ctx.close() }
  })

  await runCase('LIVE-004', async () => {
    await signIn()
    const before = en.ops.length
    const t0 = Date.now()
    await openMenu(en.page)
    const immediate = await rowState(en.page, 'antigravity_cli')
    await en.page.waitForFunction(() => document.querySelector('[data-test="chat-runtime-antigravity_cli"]')?.getAttribute('aria-disabled') !== 'true', null, { timeout: 60000 })
    const enabledAfterMs = Date.now() - t0
    await delay(1500)
    const requests = en.ops.slice(before)
    const row = await rowState(en.page, 'antigravity_cli')
    // Open the AGY model list (hover; click if needed).
    const list = en.page.locator(sel('chat-model-list-antigravity_cli'))
    for (let i = 0; i < 6 && !(await list.isVisible().catch(() => false)); i += 1) {
      await en.page.locator(sel('chat-runtime-antigravity_cli')).hover(); await delay(500)
      if (!(await list.isVisible().catch(() => false))) { await en.page.locator(sel('chat-runtime-antigravity_cli')).click(); await delay(800) }
    }
    await list.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
    const models = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
    await en.page.screenshot({ path: path.join(outDir, 'LIVE-004-signed-in-reopened.png') })
    const avail = availabilityOps(requests)
    // Observation only: the re-check may already have answered when the menu first paints.
    assert(immediate.ariaDisabled === null || (immediate.ariaDisabled === 'true' && immediate.reason === SIGN_IN), 'row showed neither its last state nor the new state while re-checking', immediate)
    assert(avail.length === 1 && JSON.stringify(avail[0].vars).includes('antigravity_cli'), 'expected exactly one forced AGY availability request', requests)
    assert(row.ariaDisabled === null && row.label === null && row.reason === null && row.title === null, 'row not enabled', row)
    assert(models.length > 0, 'no models')
    await closeMenu(en.page)
    return { requests, enabledAfterMs, immediate: { ariaDisabled: immediate.ariaDisabled, reason: immediate.reason }, row: { text: row.text }, models }
  })

  await runCase('LIVE-005', async () => {
    const before = en.ops.length
    await openMenu(en.page); await delay(3000)
    const requests = en.ops.slice(before)
    assert(availabilityOps(requests).length === 0, 'availability request sent with all runtimes available', requests)
    await closeMenu(en.page)
    return { requests }
  })

  if (ONLY && !ONLY.includes('LIVE-004')) await signIn()
  await runCase('LIVE-006', async () => {
    const page = en.page
    const prefs = (process.env.AGY_MODELS ?? 'gemini-3.6-flash-low').split(',')
    const attempts = []
    for (const preferred of prefs) {
      await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
      await page.locator(sel('chat-composer')).waitFor({ timeout: 120000 }); await delay(2000)
      await openMenu(page)
      const list = page.locator(sel('chat-model-list-antigravity_cli'))
      await page.waitForFunction(() => document.querySelector('[data-test="chat-runtime-antigravity_cli"]')?.getAttribute('aria-disabled') !== 'true', null, { timeout: 60000 })
      for (let i = 0; i < 6 && !(await list.isVisible().catch(() => false)); i += 1) {
        await page.locator(sel('chat-runtime-antigravity_cli')).hover(); await delay(500)
        if (!(await list.isVisible().catch(() => false))) { await page.locator(sel('chat-runtime-antigravity_cli')).click(); await delay(800) }
      }
      await list.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
      const models = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
      if (!models.includes(preferred)) { attempts.push({ model: preferred, outcome: 'not offered', models }); await closeMenu(page); continue }
      const rowBox = await page.locator(sel('chat-runtime-antigravity_cli')).boundingBox(); const listBox = await list.boundingBox()
      if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 })
      await list.locator(sel(`chat-model-option-${preferred}`)).click()
      const trigger = await page.locator(sel('chat-model-trigger')).innerText()
      const marker = 'PONG-7731'
      const input = page.locator(`${sel('chat-composer')} textarea`).first()
      await input.click(); await input.type(`Reply with exactly the word ${marker} and nothing else. Do not use any tools.`)
      const t0 = Date.now()
      await page.locator(sel('chat-primary-action')).first().click()
      await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
      const runId = new URL(page.url()).searchParams.get('id')
      const replied = await page.waitForFunction(({ m }) => [...(document.querySelector('[data-testid="agent-workspace-surface"]')?.querySelectorAll('*') ?? [])].some((n) => n.children.length === 0 && n.textContent.trim() === m), { m: marker }, { timeout: 150000 }).then(() => true).catch(() => false)
      const replyAfterMs = Date.now() - t0
      let status = null
      if (replied) await waitFor('idle status', async () => { status = (await page.locator('[data-testid="agent-workspace-surface"] [title^="Agent Status:"]').first().getAttribute('title').catch(() => null)); return status && !/running|processing|thinking|executing|working|starting|bootstrapping/i.test(status) ? status : null }, 120000).catch(() => {})
      else status = await page.locator('[data-testid="agent-workspace-surface"] [title^="Agent Status:"]').first().getAttribute('title').catch(() => null)
      await page.screenshot({ path: path.join(outDir, `LIVE-006-${preferred}.png`) })
      const surface = (await page.locator('[data-testid="agent-workspace-surface"]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500)
      const projection = await gql('query($runId:String!){getRunProjection(runId:$runId){conversation}}', { runId })
      const conversation = projection.data?.getRunProjection?.conversation ?? projection
      const config = await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier runtimeKind}}}', { runId })
      const attempt = { model: preferred, trigger, runId, replied, replyAfterMs, status, runConfig: config.data?.getAgentRunResumeConfig,
        conversation: Array.isArray(conversation) ? conversation.map((e) => `${e.role}:${String(e.content ?? '').slice(0, 120)}`) : conversation, surface }
      attempts.push(attempt)
      if (replied && JSON.stringify(conversation).includes(marker) && attempt.runConfig?.metadataConfig?.runtimeKind === 'antigravity_cli') return { modelsOffered: models.length, attempts }
    }
    throw Object.assign(new Error('no AGY model completed a run: ' + JSON.stringify(attempts).slice(0, 3000)), {})
  })

  await runCase('LIVE-007', async () => {
    const node = (env) => sh(`docker exec -w /app/autobyteus-server-ts ${env} ${container} node --input-type=module -e "import('/app/autobyteus-server-ts/dist/runtime-management/antigravity-cli-capability.js').then(m=>m.listAntigravityModels()).then(r=>console.log(JSON.stringify({ok:r.length})),e=>console.log(JSON.stringify(e.diagnostic ?? String(e))))"`).then((r) => JSON.parse(r.stdout.trim().split('\n').pop()))
    const rawNetwork = await sh(`docker exec -w /app/autobyteus-server-ts -e HTTPS_PROXY=http://127.0.0.1:9 ${container} sh -c 'agy models >/tmp/n.txt 2>&1; echo $?; grep -ciE "sign in|signed in|log in|logged in|login" /tmp/n.txt; rm -f /tmp/n.txt'`).then((r) => r.stdout.trim().split('\n'))
    const signedInOk = await node('')
    const network = await node('-e HTTPS_PROXY=http://127.0.0.1:9')
    const emptyHome = await node('-e HOME=/tmp/agy-api-e2e-empty-home')
    const missing = await node('-e ANTIGRAVITY_CLI_COMMAND=/nonexistent/agy')
    assert(signedInOk.ok > 0, 'signed-in listing failed', signedInOk)
    assert(network.code === 'AGY_MODEL_DISCOVERY_FAILED' && network.message === 'Antigravity model discovery failed; check authentication or network and retry.', 'network', network)
    assert(emptyHome.code === 'AGY_SIGN_IN_REQUIRED' && emptyHome.message === SIGN_IN, 'empty home', emptyHome)
    assert(missing.code === 'AGY_CLI_UNAVAILABLE' && missing.message === "Antigravity CLI is not installed or not on this node's PATH. Install it, or set ANTIGRAVITY_CLI_COMMAND, then try again.", 'missing', missing)
    return { rawNetwork: { exit: rawNetwork[0], signInWordingLines: rawNetwork[1] }, signedInOk, network, emptyHome, missing }
  })

  await runCase('LIVE-008', async () => {
    await signOut()
    // Same browser profile (the last-used model lives there); a reload stands in for reopening the app later.
    const lapsed = en
    await lapsed.page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await lapsed.page.locator(sel('chat-composer')).waitFor({ timeout: 120000 }); await delay(3000)
    {
      const triggerBefore = await lapsed.page.locator(sel('chat-model-trigger')).innerText()
      await openMenu(lapsed.page)
      await lapsed.page.waitForFunction(() => document.querySelector('[data-test="chat-runtime-antigravity_cli"]')?.getAttribute('aria-disabled') === 'true', null, { timeout: 60000 })
      await delay(2500)
      const row = await rowState(lapsed.page, 'antigravity_cli')
      await lapsed.page.screenshot({ path: path.join(outDir, 'LIVE-008-lapsed-sign-in.png') })
      const rowBox = await lapsed.page.locator(sel('chat-runtime-antigravity_cli')).boundingBox()
      await lapsed.page.screenshot({ path: path.join(outDir, 'LIVE-008-row-zoom.png'), clip: { x: rowBox.x - 4, y: rowBox.y - 4, width: rowBox.width + 8, height: rowBox.height + 8 } })
      // New chat preselects the last-used model only when its runtime is enabled, so AGY is not current here.
      const currentRuntime = await lapsed.page.evaluate(() => document.querySelector('.rounded-full.bg-blue-600')?.closest('[data-runtime]')?.getAttribute('data-runtime') ?? null)
      assert(row.ariaDisabled === 'true' && row.label === 'Unavailable' && row.reason === SIGN_IN, 'lapsed row', row)
      const nameMid = row.nameBox.y + row.nameBox.height / 2, labelMid = row.labelBox.y + row.labelBox.height / 2
      assert(Math.abs(labelMid - nameMid) <= 3, 'label not aligned with the runtime name', { nameMid, labelMid })
      assert(currentRuntime !== 'antigravity_cli', 'unavailable AGY preselected as current runtime', { currentRuntime })
      return { triggerBefore, currentRuntime, row, alignment: { nameMid, labelMid } }
    }
  })

  results.pageErrorsEn = en.errors
  await en.ctx.close()
} catch (e) { results.fatal = String(e.stack ?? e) }
finally {
  await browser?.close().catch(() => {})
  if (frontend) {
    try { process.kill(-frontend.pid, 'SIGTERM') } catch {}
    await delay(3000)
    try { process.kill(-frontend.pid, 'SIGKILL'); results.cleanup.nuxt = 'SIGKILL' } catch { results.cleanup.nuxt = 'SIGTERM' }
  }
  results.finishedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
