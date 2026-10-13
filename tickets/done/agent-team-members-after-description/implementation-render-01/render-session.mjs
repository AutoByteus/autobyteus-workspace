// One-off implementation preview inspection, not independent executable sign-off.
// Saved for reproducibility; API/E2E owns any durable probe and full-stack coverage.
import fs from 'node:fs/promises'
import { createWriteStream, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
const root = process.cwd()
const web = path.join(root, 'autobyteus-web')
const output = path.dirname(new URL(import.meta.url).pathname)
const installed = path.join(web, 'pages/implementation-team-preview.vue')
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core')
const events = [], requests = [], details = { scope: 'Implementation rendered-result self-check; not API/E2E sign-off', layouts: {}, interactions: {}, cleanup: {} }
const home = await fs.mkdtemp(path.join(os.tmpdir(), 'team-preview-'))
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const stub = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk)
  let payload = {}; try { payload = JSON.parse(Buffer.concat(chunks).toString()) } catch {}
  requests.push({ method: req.method, path: req.url, operation: payload.operationName })
  let body
  if (req.method === 'OPTIONS') body = {}
  else if (req.url === '/rest/health') body = { status: 'ok' }
  else { res.statusCode = 404; body = { error: 'Unexpected preview boundary' } }
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
})
let nuxt, browser, log
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
try {
  assert(!existsSync(installed), 'Must not overwrite an existing page')
  await fs.copyFile(path.join(output, 'preview.page.vue'), installed)
  const backendPort = await listen(stub)
  const socket = net.createServer(); const port = await listen(socket); await new Promise((r) => socket.close(r))
  details.ports = { renderer: port, backend: backendPort }
  const backend = 'http://127.0.0.1:' + backendPort
  log = createWriteStream(path.join(output, 'nuxt.log'))
  nuxt = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: web, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR || os.tmpdir(), NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: backend },
  })
  details.nuxtPid = nuxt.pid
  nuxt.stdout.pipe(log); nuxt.stderr.pipe(log)
  const url = 'http://127.0.0.1:' + port + '/implementation-team-preview'
  let ready = false
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(url)).ok) { ready = true; break } } catch {}
    if (nuxt.exitCode !== null) throw new Error('Nuxt exited before readiness')
    await delay(1000)
  }
  assert(ready, 'Nuxt must be ready')
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
  await context.routeWebSocket(/\/ws\/agent-package-definitions/, (ws) => { ws.send(JSON.stringify({ type: 'connected' })) })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)
  page.on('pageerror', (e) => events.push({ type: 'pageerror', text: e.message }))
  page.on('console', (e) => { if (['warning', 'error'].includes(e.type())) events.push({ type: e.type(), text: e.text() }) })
  page.on('requestfailed', (r) => events.push({ type: 'requestfailed', url: r.url(), reason: r.failure() }))
  await page.goto(url); await page.getByRole('heading', { name: 'Members (6)', exact: true }).waitFor()
  // Warm the current-source dev renderer before making layout observations.
  await delay(2000); await page.reload(); await page.getByRole('heading', { name: 'Members (6)', exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('[data-test="instruction-toggle"]') !== null)
  const inspectLayout = async (label, width) => {
    await page.setViewportSize({ width, height: 1000 }); await delay(200)
    const observation = await page.locator('[data-test="implementation-preview"]').evaluate((main) => {
      const sections = [...main.querySelectorAll('section')]
      const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom, right: b.right } }
      const roster = sections[1]
      return {
        headings: sections.map((s) => s.querySelector('h2')?.textContent.trim()),
        sections: sections.map(box),
        columns: getComputedStyle(roster.querySelector('.grid')).gridTemplateColumns,
        cards: [...roster.querySelectorAll('article')].map(box),
        coordinator: [...roster.querySelectorAll('article')].filter((c) => c.textContent.includes('COORDINATOR')).map((c) => c.textContent.trim()),
        memberText: roster.textContent.trim(),
        viewCount: roster.querySelectorAll('[data-test="agent-member-view"]').length,
        horizontalOverflow: main.scrollWidth > main.clientWidth,
        handoffs: sections[3].querySelectorAll('[data-test^="handoff-card-"]').length,
      }
    })
    assert.deepEqual(observation.headings, ['Description', 'Members (6)', 'Instructions', 'Handoffs'])
    assert.equal(observation.viewCount, 6); assert.equal(observation.handoffs, 8); assert.equal(observation.horizontalOverflow, false)
    assert(observation.sections.every((b, index, all) => index === 0 || b.y >= all[index - 1].bottom), 'Section geometry order')
    assert.equal(observation.cards[0].y === observation.cards[1].y, width >= 1024, 'Preserve responsive card columns')
    assert(observation.coordinator.length === 1 && observation.coordinator[0].includes('solution_designer'))
    details.layouts[label] = observation
    await page.screenshot({ path: path.join(output, label + '.png'), fullPage: true })
  }
  await inspectLayout('desktop-1440', 1440)
  await inspectLayout('narrow-600', 600)
  const toggle = page.locator('[data-test="instruction-toggle"]')
  await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
  const expandedHeight = await page.locator('[data-test="instruction-viewport"]').evaluate((e) => e.clientHeight)
  await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
  const collapsedHeight = await page.locator('[data-test="instruction-viewport"]').evaluate((e) => e.clientHeight)
  assert(expandedHeight > collapsedHeight)
  details.interactions.instructions = { expandedHeight, collapsedHeight }
  await page.locator('[data-test="agent-member-view"]').nth(0).click()
  assert.deepEqual(JSON.parse(await page.locator('[data-test="preview-navigation"]').textContent()), { target: 'agents', view: 'detail', id: 'preview-agent-0', returnToTeam: 'preview-team' })
  await page.locator('[data-test="agent-member-view"]').nth(2).click()
  details.interactions.localMember = JSON.parse(await page.locator('[data-test="preview-navigation"]').textContent())
  assert.equal(details.interactions.localMember.id, 'team-local-agent:preview-team:implementer')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  assert.deepEqual(JSON.parse(await page.locator('[data-test="preview-navigation"]').textContent()), { view: 'team-edit', id: 'preview-team' })
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Back to Agent Teams', exact: false }).click()
  assert.deepEqual(JSON.parse(await page.locator('[data-test="preview-navigation"]').textContent()), { view: 'team-list' })
  details.interactions.preserved = ['instruction expand/collapse', 'shared and team-local View emits', 'Edit emit', 'Delete confirmation/cancel', 'Back emit']
  await page.goto(url + '?team=preview-research')
  await page.getByRole('heading', { name: 'Research Team', exact: true }).waitFor()
  assert.deepEqual(await page.locator('section').evaluateAll((sections) => sections.map((s) => s.querySelector('h2')?.textContent.trim())), ['Description', 'Members (6)', 'Instructions', 'Handoffs'])
  assert.equal(await page.getByRole('button', { name: 'Delete', exact: true }).count(), 0)
  assert.equal(await page.locator('[data-test="handoff-empty-state"]').count(), 1)
  details.interactions.alternativeTeam = { name: 'Research Team', ownership: 'APPLICATION_OWNED', deleteVisible: false, handoffs: 'empty', order: 'unchanged' }
  details.browserEvents = events; details.boundaryRequests = requests
  assert.equal(events.filter((e) => ['error', 'pageerror'].includes(e.type)).length, 0, 'No browser errors')
  assert(requests.every((r) => r.path === '/rest/health' || r.method === 'OPTIONS'), 'No unexpected backend calls')
  details.outcome = 'Implementation preview observations satisfied'
} catch (error) {
  details.outcome = 'Preview inspection incomplete'; details.failure = { message: error.message, stack: error.stack }; process.exitCode = 1
} finally {
  if (browser) { await browser.close(); details.cleanup.browserClosed = true }
  if (nuxt && nuxt.exitCode === null) {
    process.kill(-nuxt.pid, 'SIGTERM')
    await Promise.race([new Promise((r) => nuxt.once('exit', r)), delay(10000)])
    if (nuxt.exitCode === null && nuxt.signalCode === null) { process.kill(-nuxt.pid, 'SIGKILL'); await new Promise((r) => nuxt.once('exit', r)) }
  }
  details.cleanup.nuxt = { pid: nuxt?.pid, exitCode: nuxt?.exitCode, signal: nuxt?.signalCode }
  await fs.rm(installed, { force: true }); details.cleanup.pageRemoved = !existsSync(installed)
  stub.closeAllConnections(); await new Promise((r) => stub.close(r)); details.cleanup.boundaryClosed = !stub.listening
  await fs.rm(home, { recursive: true, force: true }); details.cleanup.homeRemoved = !existsSync(home)
  log?.end(); details.browserEvents = events; details.boundaryRequests = requests
  await fs.writeFile(path.join(output, 'observations.json'), JSON.stringify(details, null, 2) + '\n')
  console.log(JSON.stringify({ outcome: details.outcome, failure: details.failure, cleanup: details.cleanup, browserEvents: events }))
}
