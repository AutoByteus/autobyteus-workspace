// API/E2E E-006 (AC-008, REQ-007) + E-007 (zh-CN copy): the largest local Agent Team run in the
// isolated snapshot (320 messages, 11,315 references; code reviewer 241 messages / 9,798 refs).
// Team roots use server-provided reference ids. Proves bounded rows, switch timing, Show all and
// opening the last reference through the real team reference route, then zh-CN rendering.
// Usage: node api-e2e-team-root.mjs <outDir>   (frontend 29812, isolated backend 29811)
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const TEAM = 'software_engineering_team_e4b7ee1b5b9a4f7e9f0d3bfcd6ad0f58'
const teamMessages = JSON.parse(fs.readFileSync(`/tmp/omsp-api-e2e/data/memory/agent_teams/${TEAM}/team_communication_messages.json`, 'utf8')).messages
const results = { switches: [], checks: [] }
const check = (name, pass, detail) => { results.checks.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 700)) }
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })

const openTeam = async (locale) => {
  const context = await browser.newContext({ viewport: { width: 2000, height: 1250 } })
  if (locale) await context.addInitScript((l) => window.localStorage.setItem('autobyteus.localization.preference-mode', l), locale)
  const page = await context.newPage()
  page.pageErrors = []; page.on('pageerror', (e) => page.pageErrors.push(e.message))
  await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.getByText('autobyteus-workspace-superrepo').click(); await page.waitForTimeout(800)
  await page.getByText(/Software Engineering Team/i).first().click(); await page.waitForTimeout(800)
  await page.getByText(/Message-count probe/i).first().click(); await page.waitForTimeout(8000)
  await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask' }) })
  return page
}
const clickMember = (page, name) => page.evaluate(async (name) => {
  const c = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === name)
  if (!c.length) throw new Error('member row not found: ' + name)
  window.__lt = []; const t0 = performance.now(); c[c.length - 1].click()
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const ff = performance.now() - t0
  let last = performance.now(); while (performance.now() - last < 500) { const n = window.__lt.length; await new Promise((r) => setTimeout(r, 100)); if (window.__lt.length !== n) last = performance.now() }
  const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
  return { name, settledMs: Math.round(Math.max(ff, settled)), domNodes: document.getElementsByTagName('*').length,
    refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length,
    messageRows: document.querySelectorAll('[data-test="team-communication-message-row"]').length,
    counts: document.querySelectorAll('[data-test="team-communication-reference-count"]').length }
}, name)

// E-006 (en)
const page = await openTeam('en')
await clickMember(page, 'architecture_reviewer'); await page.waitForTimeout(1500)
const tabs = await page.locator('[data-test="right-side-tab-list"]').innerText()
await page.locator('[data-test="right-side-tab-list"]').getByText('Team', { exact: true }).first().click(); await page.waitForTimeout(3000)
for (const m of ['code_reviewer', 'architecture_reviewer', 'code_reviewer', 'implementation_engineer', 'api_e2e_engineer', 'code_reviewer', 'solution_designer', 'delivery_engineer', 'code_reviewer']) {
  results.switches.push(await clickMember(page, m)); await page.waitForTimeout(800)
}
console.log('tabs', tabs.replace(/\s+/g, ' ')); results.switches.forEach((s) => console.log(JSON.stringify(s)))
check('AC-008: every Team member switch mounts <= 50 reference rows (QR-002 bound)', results.switches.every((s) => s.refRows <= 50), results.switches.map((s) => [s.name, s.refRows, s.messageRows]))
// Timing is recorded, not asserted: QR-001 is defined on the Org snapshot and AC-008 asks for bounded
// rendering/reachability. A Files-tab control run below separates panel cost from the rest of the switch.
results.teamTabTimingMs = results.switches.map((s) => [s.name, s.settledMs, s.messageRows])
console.log('OBSERVATION team-tab switch timing', JSON.stringify(results.teamTabTimingMs))
const cr = results.switches.at(-1)
check('code reviewer lists all 241 messages with counts and only selected-message rows', cr.messageRows === 241 && cr.counts > 0 && cr.refRows <= 20, cr)

// Pick the code reviewer's largest message, select it, Show all, open its last reference.
const counts = page.locator('[data-test="team-communication-message-row"]')
const best = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-test="team-communication-message-row"]')]
  let idx = -1, max = 0
  rows.forEach((r, i) => { const c = r.querySelector('[data-test="team-communication-reference-count"]'); const n = c ? Number(c.getAttribute('title').replace(/[^0-9]/g, '')) : 0; if (n > max) { max = n; idx = i } })
  return { idx, max }
})
await counts.nth(best.idx).locator('[data-test="team-communication-message-summary"]').click(); await page.waitForTimeout(800)
check(`largest code-reviewer message (${best.max} refs) shows 20 rows + Show all`, (await page.locator('[data-test="team-communication-reference-row"]').count()) === Math.min(20, best.max)
  && (await page.locator('[data-test="team-communication-show-all-references"]').innerText()) === `Show all ${best.max} files`, best)
const showAll = await page.evaluate(async () => {
  window.__lt = []; const t0 = performance.now(); document.querySelector('[data-test="team-communication-show-all-references"]').click()
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const ff = performance.now() - t0; await new Promise((r) => setTimeout(r, 800))
  const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
  return { settledMs: Math.round(Math.max(ff, settled)), refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length }
})
check('Team Show all reveals every reference of the selected message only', showAll.refRows === best.max && showAll.settledMs <= 300, showAll)
const responses = []; page.on('response', (r) => { if (/team-communication\/messages\/[^/]+\/references\/[^/]+\/content/.test(r.url())) responses.push(r) })
const lastRow = page.locator('[data-test="team-communication-reference-row"]').last()
const lastName = (await lastRow.innerText()).trim()
await lastRow.scrollIntoViewIfNeeded(); await lastRow.click()
for (let i = 0; i < 40 && !responses.length; i++) await page.waitForTimeout(250)
await page.waitForTimeout(1500)
const url = responses.at(-1)?.url()
const mid = url && decodeURIComponent(url.match(/messages\/([^/]+)\/references/)[1])
const message = teamMessages.find((m) => m.messageId === mid)
const path = message?.referenceFiles.at(-1)
const served = url ? await fetch(url) : null
const servedBuf = served ? Buffer.from(await served.arrayBuffer()) : Buffer.alloc(0)
const exists = path && fs.existsSync(path)
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
check('last Team reference resolves through the server-provided id to the file on disk (or the existing unavailable state)',
  Boolean(url) && path?.endsWith(lastName) && (exists ? served.status === 200 && sha(servedBuf) === sha(fs.readFileSync(path)) : served.status === 404),
  { url, lastName, path, exists, status: served?.status, servedBytes: servedBuf.length })
const viewerHead = await page.evaluate(() => document.querySelector('[data-test="team-reference-viewer-shell"]')?.innerText.slice(0, 160) ?? null)
const viewerText = await page.evaluate(() => document.querySelector('[data-test="team-reference-viewer-shell"]')?.innerText ?? '')
check('viewer shows the last Team reference (existing unavailable state when the file is gone)', viewerHead?.startsWith(lastName)
  && (exists || viewerText.includes('Reference file unavailable')), { viewerText: viewerText.slice(0, 300) })
await page.screenshot({ path: `${OUT}/team-last-reference.png` })
check('no page errors (en)', page.pageErrors.length === 0, page.pageErrors)
// Files-tab control on the same page: the Messages panel is not mounted.
await page.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click(); await page.waitForTimeout(2500)
results.filesTabControl = []
for (const m of ['architecture_reviewer', 'code_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'code_reviewer']) {
  results.filesTabControl.push(await clickMember(page, m)); await page.waitForTimeout(800)
}
console.log('OBSERVATION files-tab control timing', JSON.stringify(results.filesTabControl.map((s) => [s.name, s.settledMs])))

// E-007 (zh-CN): count title and Show all copy, rendered.
const zh = await openTeam('zh-CN')
await clickMember(zh, 'code_reviewer'); await zh.waitForTimeout(1500)
const zhTab = zh.locator('[data-test="right-side-tab-list"]').getByText('团队', { exact: true })
if (await zhTab.count()) { await zhTab.first().click(); await zh.waitForTimeout(3000) }
const zhRows = zh.locator('[data-test="team-communication-message-row"]')
await zhRows.nth(best.idx).locator('[data-test="team-communication-message-summary"]').click(); await zh.waitForTimeout(800)
const zhCount = zhRows.nth(best.idx).locator('[data-test="team-communication-reference-count"]')
const zhInfo = { title: await zhCount.getAttribute('title'), srText: (await zhCount.innerText()).replace(/\s+/g, ' '),
  showAll: await zh.locator('[data-test="team-communication-show-all-references"]').innerText(),
  header: (await zh.locator('[data-test="collaboration-messages-header"]').innerText()).replace(/\s+/g, ' ') }
check('zh-CN: count title and Show all copy render in Chinese with the number', zhInfo.title === `${best.max} 个引用文件` && zhInfo.showAll === `显示全部 ${best.max} 个文件`, zhInfo)
await zh.locator('[data-test="team-communication-split"]').screenshot({ path: `${OUT}/zh-CN-team-messages.png` })
check('no page errors (zh-CN)', zh.pageErrors.length === 0, zh.pageErrors)

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
await browser.close()
process.exit(results.checks.every((c) => c.pass) ? 0 : 1)
