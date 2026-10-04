// Reproduction: time AgentOrg member switches in the real built frontend against an isolated
// backend serving a snapshot of the user's long-running org run.
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const OUT = process.argv[2] || '/tmp/org-switch-repro'
const RIGHT_TAB = process.argv[3] || 'Org' // tab to have active while switching
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } })
page.on('pageerror', e => console.log('pageerror', e.message))
await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.getByText('autobyteus-workspace-superrepo').click(); await page.waitForTimeout(800)
await page.getByText('AutoByteus Org').click(); await page.waitForTimeout(800)
await page.getByText(/currently our project have/i).first().click(); await page.waitForTimeout(6000)
await page.getByText('software engineering team').click(); await page.waitForTimeout(1500)
await page.addInitScript(() => {})
await page.evaluate(() => {
  window.__longTasks = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longTasks.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask', buffered: false })
})
// The member rows in the sidebar tree
const clickMember = async (name) => page.evaluate(async (name) => {
  const candidates = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')]
    .filter((e) => e.children.length === 0 && e.textContent.trim() === name)
  const target = candidates[candidates.length - 1]
  if (!target) throw new Error('member row not found: ' + name)
  window.__longTasks = []
  const t0 = performance.now()
  target.click()
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
  const firstFrame = performance.now() - t0
  // settle: wait until 500ms pass with no new long task
  let last = performance.now()
  while (performance.now() - last < 500) {
    const before = window.__longTasks.length
    await new Promise((r) => setTimeout(r, 100))
    if (window.__longTasks.length !== before) last = performance.now()
  }
  const lt = window.__longTasks
  const settled = lt.length ? Math.max(...lt.map((e) => e.start + e.duration)) - t0 : firstFrame
  return { name, firstFrameMs: Math.round(firstFrame), settledMs: Math.round(Math.max(firstFrame, settled)), longTasks: lt.length,
    longTaskMs: Math.round(lt.reduce((n, e) => n + e.duration, 0)), domNodes: document.getElementsByTagName('*').length,
    refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length }
}, name)
await clickMember('api e2e engineer'); await page.waitForTimeout(1500)
// Select requested right tab
const tab = page.locator('[data-test="right-side-tab-list"]').getByText(RIGHT_TAB, { exact: true })
if (await tab.count()) { await tab.first().click(); await page.waitForTimeout(3000) } else console.log('tab not found', RIGHT_TAB)
await page.screenshot({ path: `${OUT}/shots/10-${RIGHT_TAB}-api-e2e.png` })
const results = []
const seq = ['code reviewer', 'api e2e engineer', 'code reviewer', 'architecture reviewer', 'solution designer', 'code reviewer', 'implementation engineer', 'api e2e engineer']
for (const m of seq) { results.push(await clickMember(m)); await page.waitForTimeout(800) }
await page.screenshot({ path: `${OUT}/shots/11-${RIGHT_TAB}-final.png` })
// CPU profile of one api e2e -> code reviewer switch
const cdp = await page.context().newCDPSession(page)
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')
results.push({ profiled: true, ...(await clickMember('code reviewer')) })
const { profile } = await cdp.send('Profiler.stop')
fs.writeFileSync(`${OUT}/switch-${RIGHT_TAB}.cpuprofile`, JSON.stringify(profile))
console.log(JSON.stringify(results, null, 1))
fs.writeFileSync(`${OUT}/switch-${RIGHT_TAB}-results.json`, JSON.stringify(results, null, 1))
await browser.close()
