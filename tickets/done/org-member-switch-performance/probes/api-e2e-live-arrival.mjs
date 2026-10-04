// API/E2E E-005 (AC-007, QR-001, SCN-004 + SCN-A1/A2): live communication-message arrival at real
// scale in the production build. A live org is not available offline (no model runs), so the
// event is delivered to the page's real AgentOrgExecutionContext.applyEvent, the same call
// agentOrgStreamingService makes for a stream message. The context is marked `live`, as it would
// be for a running org. Events carry a realistic cumulative reference list (3,136 + 50 files).
// Usage: node api-e2e-live-arrival.mjs <outDir>   (frontend 29812, isolated backend 29811)
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const ORG = 'autobyteus_org_be52ac58c92a412e9f30b2260237c7cf'
const all = JSON.parse(fs.readFileSync(`/tmp/omsp-api-e2e/data/memory/agent_orgs/${ORG}/agent_org_communication_messages.json`, 'utf8')).messages
const big = all.reduce((a, m) => (m.referenceFiles.length > a.referenceFiles.length ? m : a))
const runOf = (prefix) => all.flatMap((m) => [m.senderAgentRunId, m.receiverAgentRunId]).find((id) => id.startsWith(prefix))
const API = runOf('api_e2e_engineer_'), CR = runOf('code_reviewer_'), SD = runOf('solution_designer_'), IMPL = runOf('implementation_engineer_')
const cumulative = [...big.referenceFiles, ...Array.from({ length: 50 }, (_, i) => `/tmp/omsp-api-e2e/live/new-${i}.md`)]
let minute = 0
const event = (sender, receiver, refs, label) => ({ kind: 'communication', message: {
  messageId: `api-e2e-live-${label}`, senderAgentRunId: sender, receiverAgentRunId: receiver,
  content: `Live arrival ${label}`, messageType: 'validation_status', referenceFiles: refs,
  createdAt: new Date(Date.parse('2026-10-04T08:00:00.000Z') + (++minute) * 60_000).toISOString() } })
const results = { cases: [], checks: [] }
const check = (name, pass, detail) => { results.checks.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail)) }

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } })
const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
const contentRequests = []; page.on('request', (r) => { if (/\/references\/[^/]+\/content/.test(r.url())) contentRequests.push(r.url()) })
await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
await page.getByText('autobyteus-workspace-superrepo').click(); await page.waitForTimeout(800)
await page.getByText('AutoByteus Org').click(); await page.waitForTimeout(800)
await page.getByText(/currently our project have/i).first().click(); await page.waitForTimeout(6000)
await page.getByText('software engineering team').click(); await page.waitForTimeout(1500)
await page.evaluate((name) => { const c = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === name); c[c.length - 1].click() }, 'code reviewer')
await page.waitForTimeout(1500)
await page.locator('[data-test="right-side-tab-list"]').getByText('Org', { exact: true }).first().click(); await page.waitForTimeout(2000)
await page.locator('[data-test="team-communication-message-summary"]').first().click(); await page.waitForTimeout(800)
await page.evaluate((org) => {
  const ctx = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentOrgContexts').contexts[org]
  ctx.phase = 'live'
  window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask' })
}, ORG)

const state = () => page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-test="team-communication-message-row"]')]
  return { header: document.querySelector('[data-test="collaboration-messages-header"]')?.innerText.replace(/\s+/g, ' '),
    firstRow: rows[0]?.innerText.replace(/\s+/g, ' ').slice(0, 80), selectedIndex: rows.findIndex((r) => r.className.includes('border-blue-500')),
    selectedText: rows.find((r) => r.className.includes('border-blue-500'))?.innerText.replace(/\s+/g, ' ').slice(0, 60),
    refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length,
    viewer: document.querySelector('[data-test="team-reference-viewer-shell"]')?.innerText.split('\n')[0] ?? null }
})
const arrive = async (name, ev) => {
  const before = await state()
  const r = await page.evaluate(async ({ org, ev }) => {
    const ctx = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentOrgContexts').contexts[org]
    const refs = [...document.querySelectorAll('[data-test="team-communication-reference-row"]')]
    refs.forEach((el) => { el.__apiE2eMarker = true })
    window.__lt = []
    const t0 = performance.now()
    const application = ctx.applyEvent(ctx.changeSequence + 1, ev)
    await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)))
    const firstFrame = performance.now() - t0
    let last = performance.now()
    while (performance.now() - last < 500) { const n = window.__lt.length; await new Promise((res) => setTimeout(res, 100)); if (window.__lt.length !== n) last = performance.now() }
    const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : firstFrame
    const after = [...document.querySelectorAll('[data-test="team-communication-reference-row"]')]
    return { application, firstFrameMs: Math.round(firstFrame), settledMs: Math.round(Math.max(firstFrame, settled)),
      longTaskMs: Math.round(window.__lt.reduce((n, e) => n + e.duration, 0)),
      refRowsBefore: refs.length, refRowsAfter: after.length, reusedRefElements: after.filter((el) => el.__apiE2eMarker).length }
  }, { org: ORG, ev })
  const after = await state()
  const result = { name, ...r, before, after }
  results.cases.push(result); console.log(JSON.stringify(result))
  await page.screenshot({ path: `${OUT}/${name}.png` })
  return result
}

// L1: preview state (20 rows) on the 3,136-reference message; cumulative 3,186-reference arrival.
let r = await arrive('L1-preview', event(API, CR, cumulative, 'L1'))
check('L1 applied; new message on top with count; header +1; selection kept; 20 rows reused; <= 200 ms',
  r.application === 'applied' && r.after.firstRow.includes('3,186') && r.after.firstRow.includes('Validation Status')
  && Number.parseInt(r.after.header.match(/(\d+) Messages/)[1]) === Number.parseInt(r.before.header.match(/(\d+) Messages/)[1]) + 1
  && r.after.selectedText === r.before.selectedText && r.after.selectedIndex === r.before.selectedIndex + 1
  && r.refRowsAfter === 20 && r.reusedRefElements === 20 && r.settledMs <= 200, r)

// L2: Show all expanded on the selected message (SCN-A1).
await page.locator('[data-test="team-communication-show-all-references"]').click(); await page.waitForTimeout(800)
r = await arrive('L2-show-all-expanded', event(CR, API, cumulative, 'L2'))
check('L2 Show all kept (3,136 rows, all DOM elements reused); selection kept; <= 200 ms',
  r.refRowsAfter === 3136 && r.reusedRefElements === 3136 && r.after.selectedText === r.before.selectedText && r.settledMs <= 200, r)

// L3: the last reference (index 3,135) open in the viewer while expanded (SCN-A2).
await page.locator('[data-test="team-communication-reference-row"]').last().scrollIntoViewIfNeeded()
await page.locator('[data-test="team-communication-reference-row"]').last().click(); await page.waitForTimeout(2500)
contentRequests.length = 0
r = await arrive('L3-last-reference-open', event(API, CR, cumulative, 'L3'))
check('L3 viewer keeps the open reference; rows kept and reused; <= 200 ms',
  r.after.viewer === big.referenceFiles.at(-1).split('/').pop() && r.before.viewer === r.after.viewer
  && r.refRowsAfter === 3136 && r.reusedRefElements === 3136 && r.settledMs <= 200, r)
// Observation only (not this change's scope): the unchanged viewer re-fetches the open reference when a
// re-projection hands it a new (equal-valued) reference object. Base 26b555126 does the same (2 requests).
results.observations = { openReferenceRefetchesOnArrival: contentRequests.length, distinctUrls: new Set(contentRequests).size }
console.log('OBSERVATION', JSON.stringify(results.observations))

// L4: arrival between two other members does not change the focused perspective.
r = await arrive('L4-unrelated-members', event(SD, IMPL, cumulative, 'L4'))
check('L4 unrelated arrival: header unchanged, rows kept, <= 200 ms',
  r.after.header === r.before.header && r.refRowsAfter === 3136 && r.reusedRefElements === 3136 && r.settledMs <= 200, r)

check('no page errors', pageErrors.length === 0, pageErrors)
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
await browser.close()
process.exit(results.checks.every((c) => c.pass) ? 0 : 1)
