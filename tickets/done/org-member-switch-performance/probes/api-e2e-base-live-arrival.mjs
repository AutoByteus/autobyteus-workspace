// Base (26b555126) comparison for E-005: live arrival cost and whether the open reference refetches.
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const ORG = 'autobyteus_org_be52ac58c92a412e9f30b2260237c7cf'
const all = JSON.parse(fs.readFileSync(`/tmp/omsp-api-e2e/data/memory/agent_orgs/${ORG}/agent_org_communication_messages.json`, 'utf8')).messages
const big = all.reduce((a, m) => (m.referenceFiles.length > a.referenceFiles.length ? m : a))
const runOf = (p) => all.flatMap((m) => [m.senderAgentRunId, m.receiverAgentRunId]).find((id) => id.startsWith(p))
const API = runOf('api_e2e_engineer_'), CR = runOf('code_reviewer_')
const refs = [...big.referenceFiles, ...Array.from({ length: 50 }, (_, i) => `/tmp/omsp-api-e2e/live/new-${i}.md`)]
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } })
const reqs = []; page.on('request', (r) => { if (/\/references\/[^/]+\/content/.test(r.url())) reqs.push(r.url()) })
await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
await page.getByText('autobyteus-workspace-superrepo').click(); await page.waitForTimeout(800)
await page.getByText('AutoByteus Org').click(); await page.waitForTimeout(800)
await page.getByText(/currently our project have/i).first().click(); await page.waitForTimeout(6000)
await page.getByText('software engineering team').click(); await page.waitForTimeout(1500)
await page.evaluate((n) => { const c = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === n); c[c.length - 1].click() }, 'code reviewer')
await page.waitForTimeout(6000)
await page.locator('[data-test="right-side-tab-list"]').getByText('Org', { exact: true }).first().click(); await page.waitForTimeout(4000)
await page.locator('[data-test="team-communication-message-summary"]').first().click(); await page.waitForTimeout(3000)
// last reference row of the first (3,136) message
const lastRef = page.locator('[data-test="team-communication-message-row"]').first().locator('[data-test="team-communication-reference-row"]').last()
await lastRef.scrollIntoViewIfNeeded(); await lastRef.click(); await page.waitForTimeout(4000)
const viewer = () => page.evaluate(() => document.querySelector('[data-test="team-reference-viewer-shell"]')?.innerText.split('\n')[0] ?? null)
const before = await viewer(); reqs.length = 0
const r = await page.evaluate(async ({ org, ev }) => {
  const ctx = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentOrgContexts').contexts[org]
  ctx.phase = 'live'; window.__lt = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask' })
  const t0 = performance.now(); const application = ctx.applyEvent(ctx.changeSequence + 1, ev)
  await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))); const ff = performance.now() - t0
  let last = performance.now(); while (performance.now() - last < 800) { const n = window.__lt.length; await new Promise((res) => setTimeout(res, 100)); if (window.__lt.length !== n) last = performance.now() }
  const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
  return { application, firstFrameMs: Math.round(ff), settledMs: Math.round(Math.max(ff, settled)), refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length }
}, { org: ORG, ev: { kind: 'communication', message: { messageId: 'api-e2e-base-live', senderAgentRunId: API, receiverAgentRunId: CR, content: 'Live arrival base', messageType: 'validation_status', referenceFiles: refs, createdAt: '2026-10-04T08:01:00.000Z' } } })
await page.waitForTimeout(1500)
const out = { build: 'base 26b555126', ...r, viewerBefore: before, viewerAfter: await viewer(), contentRequestsAfterArrival: reqs.length, sameUrl: new Set(reqs).size }
console.log(JSON.stringify(out)); fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1))
await browser.close()
