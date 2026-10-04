// API/E2E E-008 (ASM-002/UNK-002): Electron renderer spot check in an isolated desktop instance of the
// worktree build (`pnpm --silent isolated-app start --from-worktree --data-root <owned snapshot root>`).
// Attaches over the instance's CDP control port and repeats the Org-tab switch sequence, Show all
// and one live arrival (real AgentOrgExecutionContext.applyEvent) inside the desktop renderer.
// Usage: node api-e2e-electron-spot-check.mjs <controlPort> <outDir>
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [CONTROL_PORT, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true })
const ORG = 'autobyteus_org_be52ac58c92a412e9f30b2260237c7cf'
const all = JSON.parse(fs.readFileSync(`/tmp/omsp-api-e2e/electron-root/server-data/memory/agent_orgs/${ORG}/agent_org_communication_messages.json`, 'utf8')).messages
const big = all.reduce((a, m) => (m.referenceFiles.length > a.referenceFiles.length ? m : a))
const results = { checks: [] }
const check = (name, pass, detail) => { results.checks.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 900)) }

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CONTROL_PORT}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools://'))
const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
results.userAgent = await page.evaluate(() => navigator.userAgent)
results.viewport = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
console.log('page', page.url(), results.userAgent.match(/Electron\/[\d.]+/)?.[0], results.viewport)
await page.waitForTimeout(3000)
// Idempotent navigation (the desktop instance keeps its state between attaches); exact text matches,
// because the restored Team index adds a "Software Engineering Team" definition row.
const visible = async (text) => (await page.getByText(text, { exact: true }).count()) > 0
if (!(await visible('AutoByteus Org'))) { await page.getByText('autobyteus-workspace-superrepo', { exact: true }).first().click(); await page.waitForTimeout(800) }
if (!(await visible('software engineering team'))) { await page.getByText('AutoByteus Org', { exact: true }).first().click(); await page.waitForTimeout(800) }
if (!(await visible('software engineering team'))) { await page.getByText(/currently our project have/i).first().click(); await page.waitForTimeout(8000) }
if (!(await visible('code reviewer'))) { await page.getByText('software engineering team', { exact: true }).first().click(); await page.waitForTimeout(1500) }
await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask' }) })
const settle = `let last = performance.now(); while (performance.now() - last < 500) { const n = window.__lt.length; await new Promise((r) => setTimeout(r, 100)); if (window.__lt.length !== n) last = performance.now() }`
const clickMember = (name) => page.evaluate(async ({ name, settle }) => {
  const c = [...document.querySelectorAll('[data-test="app-left-panel-run-history"] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === name)
  window.__lt = []; const t0 = performance.now(); c[c.length - 1].click()
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const ff = performance.now() - t0
  await (new Function(`return (async () => { ${settle} })()`))()
  const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
  return { name, settledMs: Math.round(Math.max(ff, settled)), domNodes: document.getElementsByTagName('*').length,
    refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length }
}, { name, settle })
await clickMember('api e2e engineer'); await page.waitForTimeout(1500)
// At the default desktop window width the right tabs collapse into the tool strip ("Agent Org").
if (await page.locator('[data-test="right-side-tab-list"]').count()) await page.locator('[data-test="right-side-tab-list"]').getByText('Org', { exact: true }).first().click()
else await page.locator('[data-test="workspace-right-tool-strip"] button[aria-label="Agent Org"]').click()
await page.waitForTimeout(3000)
results.layout = { tabList: await page.locator('[data-test="right-side-tab-list"]').count(), messageRows: await page.locator('[data-test="team-communication-message-row"]').count() }
console.log('layout', JSON.stringify(results.layout))
results.switches = []
for (const m of ['code reviewer', 'api e2e engineer', 'code reviewer', 'architecture reviewer', 'solution designer', 'code reviewer', 'implementation engineer', 'api e2e engineer', 'code reviewer']) {
  results.switches.push(await clickMember(m)); await page.waitForTimeout(800)
}
results.switches.forEach((s) => console.log(JSON.stringify(s)))
check('Electron: every Org-tab member switch <= 200 ms with <= 50 reference rows (QR-001/QR-002)', results.switches.every((s) => s.settledMs <= 200 && s.refRows <= 50), results.switches.map((s) => [s.name, s.settledMs, s.refRows]))
await page.screenshot({ path: `${OUT}/electron-org-code-reviewer.png` })

await page.locator('[data-test="team-communication-message-summary"]').first().click(); await page.waitForTimeout(800)
results.showAll = []
for (let i = 0; i < 3; i++) {
  if (i) { await page.locator('[data-test="team-communication-message-summary"]').nth(1).click(); await page.waitForTimeout(400); await page.locator('[data-test="team-communication-message-summary"]').first().click(); await page.waitForTimeout(400) }
  results.showAll.push(await page.evaluate(async () => {
    window.__lt = []; const t0 = performance.now(); document.querySelector('[data-test="team-communication-show-all-references"]').click()
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const ff = performance.now() - t0; await new Promise((r) => setTimeout(r, 800))
    const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
    return { settledMs: Math.round(Math.max(ff, settled)), refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length }
  }))
}
check(`Electron: Show all ${big.referenceFiles.length} <= 300 ms (QR-003)`, results.showAll.every((r) => r.refRows === big.referenceFiles.length && r.settledMs <= 300), results.showAll)

results.liveArrival = await page.evaluate(async ({ org, ev, settle }) => {
  const ctx = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentOrgContexts').contexts[org]
  ctx.phase = 'live'; window.__lt = []
  const t0 = performance.now(); const application = ctx.applyEvent(ctx.changeSequence + 1, ev)
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const ff = performance.now() - t0
  await (new Function(`return (async () => { ${settle} })()`))()
  const settled = window.__lt.length ? Math.max(...window.__lt.map((e) => e.start + e.duration)) - t0 : ff
  return { application, settledMs: Math.round(Math.max(ff, settled)), refRows: document.querySelectorAll('[data-test="team-communication-reference-row"]').length,
    firstRow: document.querySelector('[data-test="team-communication-message-row"]')?.innerText.replace(/\s+/g, ' ').slice(0, 70) }
}, { org: ORG, settle, ev: { kind: 'communication', message: { messageId: 'api-e2e-electron-live', senderAgentRunId: big.senderAgentRunId,
  receiverAgentRunId: big.receiverAgentRunId, content: 'Live arrival (Electron)', messageType: 'validation_status',
  referenceFiles: [...big.referenceFiles, '/tmp/omsp-api-e2e/live/new.md'], createdAt: '2026-10-04T09:00:00.000Z' } } })
check('Electron: live arrival with Show all expanded <= 200 ms, rows kept', results.liveArrival.application === 'applied'
  && results.liveArrival.refRows === big.referenceFiles.length && results.liveArrival.settledMs <= 200, results.liveArrival)
check('Electron: no page errors', pageErrors.length === 0, pageErrors)
await page.screenshot({ path: `${OUT}/electron-after-live-arrival.png` })
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
await browser.close()
process.exit(results.checks.every((c) => c.pass) ? 0 : 1)
