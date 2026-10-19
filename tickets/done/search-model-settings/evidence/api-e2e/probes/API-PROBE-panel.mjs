// API/E2E probe (ticket evidence, not product code): drives Settings → Server Settings → Embedding in a Chrome that the
// run started with --remote-debugging-port (or an isolated desktop instance's control port), through playwright-core's
// connectOverCDP. State is read from the panel's test ids; nothing here changes the product.
// Usage: node API-PROBE-panel.mjs <cdpPort> <command> [...args]
//   open <url>                         navigate the first page and wait for the panel
//   snap                               print the panel state as JSON
//   click <testid>                     click an element by test id (inside the panel or its dialog)
//   wait <jsCondition over s> <ms>     poll snap until the condition holds; prints elapsed, distinct texts seen and state
//   shot <file.png>                    screenshot of the page
import { createRequire } from 'node:module'

const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, command, ...args] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts()[0].pages().find((p) => !p.url().startsWith('devtools')) ?? browser.contexts()[0].pages()[0]

const SNAP = () => {
  const q = (sel, root = document) => root.querySelector(sel)
  const text = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null
  const panel = q('[data-testid="settings-embedding-panel"]')
  const models = [...document.querySelectorAll('[data-testid^="embedding-model-"]')]
    .filter((el) => /^embedding-model-[a-z0-9-]+$/.test(el.dataset.testid) && !/-(actions|cancel|download|facts|failed|preparing|progress|remove|retry|status|unavailable|use|confirm|confirmation)$/.test(el.dataset.testid))
    .map((el) => {
      const id = el.dataset.testid.replace('embedding-model-', '')
      const t = (s) => text(q(`[data-testid="embedding-model-${id}-${s}"]`))
      const has = (s) => Boolean(q(`[data-testid="embedding-model-${id}-${s}"]`))
      return { id, status: t('status'), facts: t('facts'), progress: t('progress'), preparing: t('preparing'), failed: t('failed'), unavailable: t('unavailable'),
        actions: ['download', 'cancel', 'use', 'remove', 'retry'].filter(has) }
    })
  const projects = [...document.querySelectorAll('[data-testid^="embedding-project-project_"]')]
    .filter((el) => /^embedding-project-project_[^-]+(-[^-]+)*$/.test(el.dataset.testid) && !/-(index|rebuild|status|cancel|confirm|confirmation)$/.test(el.dataset.testid))
    .map((el) => {
      const id = el.dataset.testid.replace('embedding-project-', '')
      return { id, text: text(el).slice(0, 120), status: text(q(`[data-testid="embedding-project-${id}-status"]`)),
        actions: ['index', 'rebuild'].filter((s) => Boolean(q(`[data-testid="embedding-project-${id}-${s}"]`))) }
    })
  const indexAll = q('[data-testid="embedding-index-all"]')
  return {
    panel: Boolean(panel), loading: Boolean(q('[data-testid="embedding-loading"]')), loadError: text(q('[data-testid="embedding-load-error"]')),
    actionError: text(q('[data-testid="embedding-action-error"]')), actionErrorRole: q('[data-testid="embedding-action-error"]')?.getAttribute('role') ?? null,
    disk: text(q('[data-testid="embedding-disk-total"]')), subtitle: text(q('[data-testid="embedding-projects-subtitle"]')),
    indexAll: indexAll ? { disabled: indexAll.disabled, title: indexAll.getAttribute('title') } : null,
    filters: text(q('[data-testid="embedding-project-filters"]')), empty: Boolean(q('[data-testid="embedding-projects-empty"]')),
    dialog: text(q('[data-testid="embedding-switch-dialog"]')), announce: text(q('[data-testid="embedding-announce"]')),
    models, projects,
  }
}

if (command === 'open') {
  const t0 = Date.now()
  // A '#/…' argument navigates a desktop window (hash router) in place; anything else is a full URL.
  if (args[0].startsWith('#')) await page.evaluate((hash) => { location.hash = hash }, args[0])
  else await page.goto(args[0], { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="embedding-models-card"]', { timeout: 60000 })
  console.log(JSON.stringify({ url: page.url(), msToCards: Date.now() - t0 }))
} else if (command === 'snap') {
  console.log(JSON.stringify(await page.evaluate(SNAP), null, 1))
} else if (command === 'click') {
  await page.click(`[data-testid="${args[0]}"]`, { timeout: 15000 })
  await page.waitForTimeout(300)
  console.log(JSON.stringify({ clicked: args[0], at: Date.now() }))
} else if (command === 'wait') {
  const [condition, ms] = args
  const t0 = Date.now()
  const seen = []
  let s
  for (;;) {
    s = await page.evaluate(SNAP)
    const key = JSON.stringify(s.models.map((m) => [m.id, m.status, m.progress, m.preparing, m.failed, m.unavailable]).concat(s.projects.map((p) => [p.status])).concat([s.actionError]))
    if (seen.at(-1)?.key !== key) seen.push({ t: Date.now() - t0, key })
    if (new Function('s', `return (${condition})`)(s)) break
    if (Date.now() - t0 > Number(ms)) { s.timeout = true; break }
    await page.waitForTimeout(250)
  }
  console.log(JSON.stringify({ elapsedMs: Date.now() - t0, timeout: Boolean(s.timeout), seen: seen.map((x) => ({ t: x.t, state: JSON.parse(x.key) })), state: s }, null, 1))
} else if (command === 'shot') {
  await page.screenshot({ path: args[0], fullPage: true })
  console.log(args[0])
} else {
  throw new Error(`unknown command ${command}`)
}
await browser.close().catch(() => {})
