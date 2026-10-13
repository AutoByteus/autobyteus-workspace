#!/usr/bin/env node
// Renderer composition/preservation regression. Prerequisites: pnpm install, nuxt prepare, Chrome.
// Run: pnpm -C autobyteus-web test:e2e:agent-team-detail --output-dir <fresh path>
// Options: --browser-executable <path>, --ledger-file <path>. No opt-in gate/provider credentials.
// B01: six-member long-content geometry/order at 1440/600. B02: real input/disclosure/dialog/emits.
// B03: second Team/ownership/empty rules/missing state. Parent routing is covered by org-definition-navigation.spec.ts.
// Owns a clean-environment Nuxt, loopback health boundary, private HOME, fixture route and headless browser.
// Does not prove backend or Electron shell; unexpected API calls and browser errors fail; finally cleans owned resources.
import fs from 'node:fs/promises'
import { createWriteStream, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, fallback) => {
  const inline = process.argv.find(value => value.startsWith(`--${name}=`))
  const index = process.argv.indexOf(`--${name}`)
  return inline ? inline.slice(name.length + 3) : index >= 0 ? process.argv[index + 1] : fallback
}
const output = path.resolve(web, arg('output-dir', `test-results/agent-team-detail-${Date.now()}`))
const ledger = arg('ledger-file')
const candidates = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || candidates.find(existsSync))
const installed = path.join(web, 'pages/api-e2e-agent-team-detail.vue')
const fixture = path.join(web, 'tests/e2e/fixtures/agent-team-detail.page.vue')
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const waitFor = async (label, predicate) => {
  const deadline = Date.now() + 90000
  while (Date.now() < deadline) {
    if (await predicate()) return
    await delay(100)
  }
  throw new Error(`Timed out: ${label}`)
}
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => resolve(server.address().port))
})
const close = server => new Promise((resolve, reject) => {
  if (!server?.listening) return resolve()
  server.closeAllConnections?.()
  server.close(error => error ? reject(error) : resolve())
})
const portFree = async port => {
  if (!port) return true
  const socket = net.createConnection({ host: '127.0.0.1', port })
  return new Promise(resolve => {
    socket.once('connect', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => { socket.destroy(); resolve(true) })
  })
}
const groupAlive = pid => {
  if (!pid) return false
  try { process.kill(process.platform === 'win32' ? pid : -pid, 0); return true } catch (e) { if (e.code === 'ESRCH') return false; throw e }
}
const stopNuxt = async child => {
  if (!child || !groupAlive(child.pid)) return
  const pid = process.platform === 'win32' ? child.pid : -child.pid
  process.kill(pid, 'SIGTERM')
  for (let i = 0; i < 100 && groupAlive(child.pid); i++) await delay(100)
  if (groupAlive(child.pid)) process.kill(pid, 'SIGKILL')
  for (let i = 0; i < 50 && groupAlive(child.pid); i++) await delay(100)
  assert(!groupAlive(child.pid), 'Owned Nuxt process group still alive')
}
await fs.mkdir(output, { recursive: true })
assert.equal((await fs.readdir(output)).length, 0, 'Use a fresh output directory; never overwrite evidence')
const evidencePath = path.join(output, 'evidence.json')
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version, scenarios: {}, browserEvents: [], requests: [], cleanup: {} }
let home, stub, nuxt, browser, page, log, fixtureInstalled = false
const record = () => fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
const checkpoint = async (id, status, description) => {
  await record()
  if (ledger) await fs.appendFile(ledger, `\n${new Date().toISOString()} ${id} ${status} — ${description}. Evidence: ${evidencePath}.\n`)
}
const noBoundaryErrors = () => {
  assert.deepEqual(evidence.browserEvents.filter(e => ['error', 'pageerror', 'requestfailed'].includes(e.type)), [], 'Browser errors')
  assert(evidence.requests.every(r => r.path === '/rest/health' || r.method === 'OPTIONS'), 'Unexpected backend operation')
}
const scenario = async (id, description, run) => {
  await checkpoint(id, 'Started', description)
  try {
    const details = await run()
    noBoundaryErrors()
    evidence.scenarios[id] = { result: 'Pass', description, details }
    await checkpoint(id, 'Completed Pass', description)
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(output, `${id}-failure.png`), fullPage: true }).catch(() => {})
      await fs.writeFile(path.join(output, `${id}-failure.html`), await page.content()).catch(() => {})
    }
    evidence.scenarios[id] = { result: 'Fail', description, failure: { message: error.message, stack: error.stack } }
    await checkpoint(id, 'Completed Fail', error.message)
    throw error
  }
}
try {
  assert(executablePath, 'Chrome missing; pass --browser-executable')
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-team-detail-probe-'))
  // EXCL prevents another process's route being overwritten/deleted.
  await fs.copyFile(fixture, installed, (await import('node:fs')).constants.COPYFILE_EXCL)
  fixtureInstalled = true
  stub = http.createServer((req, res) => {
    evidence.requests.push({ method: req.method, path: req.url })
    res.statusCode = req.method === 'OPTIONS' || req.url === '/rest/health' ? 200 : 404
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', 'content-type')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(res.statusCode === 200 ? { status: 'ok' } : { error: 'Unexpected probe boundary' }))
  })
  const backendPort = await listen(stub)
  const reserve = net.createServer()
  const port = await listen(reserve); await close(reserve)
  evidence.ports = { renderer: port, backend: backendPort }
  log = createWriteStream(path.join(output, 'nuxt.log'))
  nuxt = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: web, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR || os.tmpdir(), NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` },
  })
  evidence.nuxtPid = nuxt.pid
  nuxt.stdout.pipe(log); nuxt.stderr.pipe(log)
  nuxt.on('error', error => { evidence.spawnError = error.message })
  const url = `http://127.0.0.1:${port}/api-e2e-agent-team-detail`
  await waitFor('Nuxt readiness', async () => {
    if (evidence.spawnError || nuxt.exitCode !== null || nuxt.signalCode !== null) throw new Error(evidence.spawnError || 'Nuxt exited before readiness')
    try { return (await fetch(url)).ok } catch { return false }
  })
  browser = await chromium.launch({ headless: true, executablePath })
  evidence.browserVersion = browser.version()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', colorScheme: 'light' })
  await context.routeWebSocket(/\/ws\/agent-package-definitions/, ws => ws.send(JSON.stringify({ type: 'connected' })))
  page = await context.newPage(); page.setDefaultTimeout(60000)
  page.on('pageerror', e => evidence.browserEvents.push({ type: 'pageerror', text: e.message }))
  page.on('console', e => { if (['warning', 'error'].includes(e.type())) evidence.browserEvents.push({ type: e.type(), text: e.text() }) })
  page.on('requestfailed', r => evidence.browserEvents.push({ type: 'requestfailed', url: r.url(), reason: r.failure() }))
  await page.goto(url)
  await page.getByRole('heading', { name: 'Members (6)', exact: true }).waitFor()
  await delay(2000); await page.reload()
  await page.getByRole('heading', { name: 'Members (6)', exact: true }).waitFor()
  await page.locator('[data-test="instruction-toggle"]').waitFor()
  // Retain warmup events too; a fatal error is never hidden by clearing the event list.
  await scenario('B01', 'Long-content production detail order, roster and responsive geometry', async () => {
    const layouts = {}
    for (const width of [1440, 600]) {
      await page.setViewportSize({ width, height: 1000 }); await delay(200)
      const state = await page.locator('[data-test="agent-team-detail-probe"]').evaluate(main => {
        const sections = [...main.querySelectorAll('section')]
        const box = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom, right: b.right } }
        const roster = sections[1]
        return {
          headings: sections.map(s => s.querySelector('h2')?.textContent.trim()), sections: sections.map(box),
          cards: [...roster.querySelectorAll('article')].map(box), cardText: [...roster.querySelectorAll('article')].map(c => c.textContent.trim()),
          viewCount: roster.querySelectorAll('[data-test="agent-member-view"]').length,
          overflow: main.scrollWidth > main.clientWidth, instructions: sections[2].querySelector('[data-test="instruction-viewport"]').textContent,
          handoffs: [...sections[3].querySelectorAll('[data-test^="handoff-card-"]')].map(c => c.textContent),
        }
      })
      assert.deepEqual(state.headings, ['Description', 'Members (6)', 'Instructions', 'Handoffs'])
      assert.equal(state.viewCount, 6); assert.equal(state.cards.length, 6); assert.equal(state.overflow, false)
      assert(state.sections.every((b, i, all) => !i || b.y >= all[i - 1].bottom), 'Sections overlap/out of visual order')
      assert(state.cards.every(c => c.x >= state.sections[1].x && c.right <= state.sections[1].right), 'Card containment')
      assert.equal(state.cards[0].y === state.cards[1].y, width >= 1024, 'Responsive columns')
      for (const [i, name] of ['coordinator', 'architect', 'implementer', 'reviewer', 'validator', 'delivery'].entries()) assert(state.cardText[i].includes(name), `Member ${name}`)
      assert.deepEqual(state.cardText.filter(c => c.includes('COORDINATOR')), [state.cardText[0]])
      assert(state.cardText[2].includes('Team-local Worker'))
      assert(state.instructions.includes('Instruction 1:') && state.instructions.includes('Instruction 34:'))
      assert.equal(state.handoffs.length, 8)
      state.handoffs.forEach((text, i) => assert(text.includes(`Handoff ${i + 1}:`), 'Handoff order/content'))
      layouts[width] = state
      await page.screenshot({ path: path.join(output, `width-${width}.png`), fullPage: true })
    }
    return layouts
  })
  await scenario('B02', 'Real controls: disclosure, shared/local View, Edit/Back and Delete cancel', async () => {
    const toggle = page.locator('[data-test="instruction-toggle"]')
    await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
    const expanded = await page.locator('[data-test="instruction-viewport"]').evaluate(e => e.clientHeight)
    await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    const collapsed = await page.locator('[data-test="instruction-viewport"]').evaluate(e => e.clientHeight)
    assert(expanded > collapsed)
    const navigation = async () => JSON.parse(await page.locator('[data-test="probe-navigation"]').textContent())
    const view = page.locator('[data-test="agent-member-view"]')
    await view.nth(0).focus(); await page.keyboard.press('Enter')
    assert.deepEqual(await navigation(), { target: 'agents', view: 'detail', id: 'probe-agent-0', returnToTeam: 'probe-team' })
    await view.nth(2).click()
    assert.deepEqual(await navigation(), { target: 'agents', view: 'detail', id: 'team-local-agent:probe-team:local-worker', returnToTeam: 'probe-team' })
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    assert.deepEqual(await navigation(), { view: 'team-edit', id: 'probe-team' })
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Delete Definition', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Delete Definition', exact: true }).count(), 0)
    await page.getByRole('button', { name: /Back to Agent Teams/ }).click()
    assert.deepEqual(await navigation(), { view: 'team-list' })
    return { expanded, collapsed, sharedKeyboardView: true, localView: true, deleteCancelledWithoutAPI: true }
  })
  await scenario('B03', 'Alternate Team ownership/empty rules and not-found state', async () => {
    await page.goto(url + '?team=probe-research')
    await page.getByRole('heading', { name: 'Research Team', exact: true }).waitFor()
    assert.deepEqual(await page.locator('section').evaluateAll(ss => ss.map(s => s.querySelector('h2')?.textContent.trim())), ['Description', 'Members (6)', 'Instructions', 'Handoffs'])
    assert.equal(await page.getByRole('button', { name: 'Delete', exact: true }).count(), 0)
    assert.equal(await page.locator('[data-test="handoff-empty-state"]').count(), 1)
    await page.goto(url + '?team=missing')
    await page.getByRole('heading', { name: /Agent team not found/i }).waitFor()
    assert.equal(await page.locator('section').count(), 0)
    return { applicationOwned: true, emptyHandoffs: true, missingTeamHasNoSections: true }
  })
  evidence.result = 'Pass'
} catch (error) {
  evidence.result = 'Fail'; evidence.failure = { message: error.message, stack: error.stack }; process.exitCode = 1
} finally {
  // Attempt every cleanup even when one fails; a cleanup failure makes the whole probe fail.
  const cleanup = async (name, run) => {
    try { evidence.cleanup[name] = await run() } catch (e) { evidence.cleanup[name] = { error: e.message }; evidence.result = 'Fail'; process.exitCode = 1 }
  }
  await cleanup('browser', async () => { await browser?.close(); return { closed: true } })
  await cleanup('nuxt', async () => { await stopNuxt(nuxt); return { pid: nuxt?.pid, groupAbsent: !groupAlive(nuxt?.pid) } })
  await cleanup('fixture', async () => { if (fixtureInstalled) await fs.rm(installed); return { removed: fixtureInstalled ? !existsSync(installed) : 'not-owned' } })
  await cleanup('boundary', async () => { await close(stub); return { closed: !stub?.listening } })
  await cleanup('home', async () => { if (home) await fs.rm(home, { recursive: true, force: true }); return { removed: home ? !existsSync(home) : 'not-created' } })
  await cleanup('ports', async () => { const renderer = await portFree(evidence.ports?.renderer), backend = await portFree(evidence.ports?.backend); assert(renderer && backend, 'Owned port still listening'); return { rendererFree: renderer, backendFree: backend } })
  log?.end(); evidence.completedAt = new Date().toISOString(); await record()
  console.log(JSON.stringify({ result: evidence.result, failure: evidence.failure, cleanup: evidence.cleanup, evidencePath }))
}
