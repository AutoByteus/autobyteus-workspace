// Base (26b555126) Team-tab switch timing on the same snapshot Team run, for comparison with E-006.
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } })
await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
await page.getByText('autobyteus-workspace-superrepo').click(); await page.waitForTimeout(800)
await page.getByText(/Software Engineering Team/i).first().click(); await page.waitForTimeout(800)
await page.getByText(/Message-count probe/i).first().click(); await page.waitForTimeout(8000)
await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask' }) })
const clickMember = (name) => page.evaluate(async (name) => {
  const c = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === name)
  window.__lt = []; const t0 = performance.now(); c[c.length - 1].click()
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const ff = performance.now() - t0
  let last = performance.now(); while (performance.now() - last < 500) { const n = window.__lt.length; await new Promise((r) => setTimeout(r, 100)); if (window.__lt.length !== n) last = performance.now() }
  const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
  return [name, Math.round(Math.max(ff, settled)), document.querySelectorAll('[data-test="team-communication-reference-row"]').length, document.getElementsByTagName('*').length]
}, name)
await clickMember('architecture_reviewer'); await page.waitForTimeout(1500)
await page.locator('[data-test="right-side-tab-list"]').getByText('Team', { exact: true }).first().click(); await page.waitForTimeout(3000)
const out = []
for (const m of ['code_reviewer', 'architecture_reviewer', 'code_reviewer', 'implementation_engineer', 'api_e2e_engineer', 'code_reviewer', 'solution_designer', 'delivery_engineer', 'code_reviewer']) { out.push(await clickMember(m)); await page.waitForTimeout(800) }
console.log(JSON.stringify(out)); fs.writeFileSync(process.argv[2], JSON.stringify({ build: 'base 26b555126', switches: out }, null, 1))
await browser.close()
