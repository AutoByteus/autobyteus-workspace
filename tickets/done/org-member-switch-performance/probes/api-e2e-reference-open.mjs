// API/E2E E-004 (AC-004/AC-005): on the snapshot org, open the FIRST and LAST of the 3,136
// references of code reviewer's newest message through the real UI and real server REST route.
// Proves: count + Show all copy, the client-derived (lazy) referenceId equals the server identity
// sha256(messageId\0path), the served bytes equal the file on disk, and repeated Show all timing.
// Usage: node api-e2e-reference-open.mjs <outDir>   (frontend 29812, isolated backend 29811)
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const DATA = '/tmp/omsp-api-e2e/data/memory/agent_orgs/autobyteus_org_be52ac58c92a412e9f30b2260237c7cf/agent_org_communication_messages.json'
const big = JSON.parse(fs.readFileSync(DATA, 'utf8')).messages.reduce((a, m) => (m.referenceFiles.length > a.referenceFiles.length ? m : a))
const serverId = (path) => crypto.createHash('sha256').update(`${big.messageId}\0${path}`).digest('hex')
const fileSha = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const results = { messageId: big.messageId, referenceCount: big.referenceFiles.length, checks: [] }
const check = (name, pass, detail) => { results.checks.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail)) }

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } })
const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
const contentResponses = []
page.on('response', (r) => { if (/\/references\/[^/]+\/content/.test(r.url())) contentResponses.push(r) })
await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
await page.getByText('autobyteus-workspace-superrepo').click(); await page.waitForTimeout(800)
await page.getByText('AutoByteus Org').click(); await page.waitForTimeout(800)
await page.getByText(/currently our project have/i).first().click(); await page.waitForTimeout(6000)
await page.getByText('software engineering team').click(); await page.waitForTimeout(1500)
const clickMember = (name) => page.evaluate((name) => {
  const c = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === name)
  c[c.length - 1].click()
}, name)
await clickMember('code reviewer'); await page.waitForTimeout(1500)
await page.locator('[data-test="right-side-tab-list"]').getByText('Org', { exact: true }).first().click(); await page.waitForTimeout(2500)
// The Org tab is the default right tab, so the panel may keep a message selected from the
// previous focus (preserved selection rule). Select the newest (3,136-reference) message explicitly.
await page.locator('[data-test="team-communication-message-summary"]').first().click(); await page.waitForTimeout(800)
await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask' }) })

const rows = page.locator('[data-test="team-communication-reference-row"]')
const selectedRow = page.locator('[data-test="team-communication-message-row"]').first()
const count = selectedRow.locator('[data-test="team-communication-reference-count"]')
check('selected newest message shows count 3,136', (await count.innerText()).includes('3,136') && (await count.getAttribute('title')) === '3,136 reference files', { text: await count.innerText(), title: await count.getAttribute('title') })
check('20 preview rows + Show all copy', (await rows.count()) === 20 && (await page.locator('[data-test="team-communication-show-all-references"]').innerText()) === 'Show all 3,136 files', { rows: await rows.count(), button: await page.locator('[data-test="team-communication-show-all-references"]').innerText() })
check('unselected messages render no reference rows', (await page.locator('[data-test="team-communication-reference-list"]').count()) === 1, { lists: await page.locator('[data-test="team-communication-reference-list"]').count() })

const openAndVerify = async (label, rowLocator, path) => {
  contentResponses.length = 0
  await rowLocator.scrollIntoViewIfNeeded(); await rowLocator.click()
  await page.waitForTimeout(500)
  for (let i = 0; i < 40 && !contentResponses.length; i++) await page.waitForTimeout(250)
  const response = contentResponses[contentResponses.length - 1]
  const url = response?.url() ?? null
  const rid = url ? decodeURIComponent(url.match(/references\/([^/]+)\/content/)[1]) : null
  const mid = url ? decodeURIComponent(url.match(/messages\/([^/]+)\/references/)[1]) : null
  check(`${label}: row label is the file name`, (await rowLocator.innerText()).trim() === path.split('/').pop(), { row: (await rowLocator.innerText()).trim() })
  check(`${label}: request uses server identity sha256(messageId\\0path)`, rid === serverId(path) && mid === big.messageId, { url, expected: serverId(path) })
  const browserBodies = []
  for (const r of contentResponses) { try { browserBodies.push({ status: r.status(), bytes: (await r.body()).length, type: r.headers()['content-type'] }) } catch (e) { browserBodies.push({ error: e.message }) } }
  // Authoritative server check: fetch the exact URL the UI requested and compare with the file on disk.
  const served = url ? Buffer.from(await (await fetch(url)).arrayBuffer()) : Buffer.alloc(0)
  const servedSha = crypto.createHash('sha256').update(served).digest('hex')
  check(`${label}: server serves the file's exact bytes at the UI-requested URL`, response?.status() === 200 && servedSha === fileSha(path), { status: response?.status(), servedBytes: served.length, fileBytes: fs.statSync(path).size, browserBodies })
  await page.waitForTimeout(1500)
  const shell = page.locator('[data-test="team-reference-viewer-shell"]')
  const shellText = (await shell.count()) ? await shell.first().innerText() : ''
  check(`${label}: viewer shows the reference`, shellText.includes(path.split('/').pop()), { viewerHead: shellText.slice(0, 160) })
  await page.screenshot({ path: `${OUT}/${label}.png` })
  return shellText
}
await openAndVerify('first-reference', rows.first(), big.referenceFiles[0])

// Show all, repeated: collapse by selecting another message, reselect the big one, reveal.
const summaries = page.locator('[data-test="team-communication-message-summary"]')
const showAllTimes = []
for (let i = 0; i < 5; i++) {
  await summaries.nth(1).click(); await page.waitForTimeout(400)
  await summaries.nth(0).click(); await page.waitForTimeout(400)
  showAllTimes.push(await page.evaluate(async () => {
    const btn = document.querySelector('[data-test="team-communication-show-all-references"]')
    window.__lt = []; const t0 = performance.now(); btn.click()
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
    const ff = performance.now() - t0; await new Promise((r) => setTimeout(r, 800))
    const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
    return { settledMs: Math.round(Math.max(ff, settled)), refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length,
      lists: document.querySelectorAll('[data-test="team-communication-reference-list"]').length }
  }))
}
check('Show all reveals 3,136 rows only under the selected message, each run <= 300 ms (QR-003)',
  showAllTimes.every((r) => r.refRows === 3136 && r.lists === 1 && r.settledMs <= 300), showAllTimes)
const lastText = await openAndVerify('last-reference', rows.last(), big.referenceFiles[big.referenceFiles.length - 1])
const firstLine = fs.readFileSync(big.referenceFiles.at(-1), 'utf8').split('\n').find((l) => l.trim()).replace(/^#+\s*/, '').trim()
check('last-reference: rendered markdown contains the file heading', lastText.includes(firstLine), { firstLine })
check('no page errors', pageErrors.length === 0, pageErrors)
results.showAllTimes = showAllTimes
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
await browser.close()
process.exit(results.checks.every((c) => c.pass) ? 0 : 1)
