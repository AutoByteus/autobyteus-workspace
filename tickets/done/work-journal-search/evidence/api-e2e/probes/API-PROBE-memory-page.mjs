// API/E2E probe (ticket evidence, not product code): drives the Memory page of an isolated desktop instance through
// its CDP control port (playwright-core connectOverCDP). It reads state from the page's data-test hooks; it changes
// nothing in the product.
// Usage: node API-PROBE-memory-page.mjs <cdpPort> <command> [...args]
//   go <hash>                 navigate the window in place (hash router), e.g. '#/memory'
//   snap                      the page state as JSON (tabs, index, search, results, Work Journal)
//   click <css>               click the first element matching a CSS selector ([data-test="…"], text=…)
//   fill <css> <text>         fill an input;  press <css> <key>
//   wait <jsCondition over s> <ms>   poll snap until the condition holds; prints elapsed, distinct states seen and the state
//   timed <css-to-click> <jsCondition over s> <ms>   click, then time until the condition holds
//   shot <file.png>           screenshot of the window
//   eval <js>                 evaluate an expression in the page and print it
import { createRequire } from 'node:module'

const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, command, ...args] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts()[0].pages().find((p) => !p.url().startsWith('devtools')) ?? browser.contexts()[0].pages()[0]

const SNAP = () => {
  const all = (sel, root = document) => [...root.querySelectorAll(sel)]
  const one = (sel, root = document) => root.querySelector(sel)
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null)
  const t = (name) => text(one(`[data-test="${name}"]`))
  const input = one('[data-test="memory-search-input"]')
  return {
    url: location.hash,
    sections: all('[data-test^="memory-section-"]').map((el) => ({ id: el.dataset.test, text: text(el), selected: el.getAttribute('aria-selected') ?? el.getAttribute('aria-pressed') ?? el.className.includes('bg-blue') })),
    indexBadge: t('memory-index-tab-badge'),
    index: one('[data-test="memory-index"]') ? {
      status: t('memory-index-status'), detail: t('memory-index-detail'), firstTime: t('memory-index-first-time'),
      modelChanged: t('memory-index-model-changed'), error: t('memory-index-error'),
      steps: all('[data-step]').map((el) => ({ step: el.getAttribute('data-step'), state: el.getAttribute('data-state'), text: text(el).slice(0, 160) })),
      buttons: all('[data-test="memory-index"] button').map((b) => ({ text: text(b), disabled: b.disabled, title: b.getAttribute('title') })),
      rebuildConfirm: t('memory-index-rebuild-confirm'),
    } : null,
    search: one('[data-test="memory-search-panel"]') ? {
      inputDisabled: input?.disabled ?? null, inputValue: input?.value ?? null, placeholder: input?.getAttribute('placeholder') ?? null,
      notIndexed: t('memory-search-not-indexed'), notice: t('memory-search-index-notice'),
      coverage: t('memory-search-coverage'), weak: t('memory-search-weak'), none: t('memory-search-none'), error: t('memory-search-error'),
      results: all('[data-test="memory-result"]').map((el) => ({
        text: text(el).slice(0, 220), days: text(one('[data-test="memory-result-days"]', el)),
        matches: all('[data-test="memory-match"]', el).map((m) => text(m).slice(0, 260)),
      })),
    } : null,
    journal: one('[data-test="work-journal"]') ? {
      found: t('work-journal-found'), missing: t('work-journal-missing'), range: t('work-journal-range'),
      files: all('[data-test="work-journal-file"]').map((el) => ({ text: text(el), selected: el.getAttribute('aria-current') ?? el.className.includes('bg-blue-50') })),
      matchButtons: all('[data-test="work-journal-match"]').map((el) => text(el)),
      lines: all('[data-line]').length,
      firstLine: one('[data-line]')?.getAttribute('data-line') ?? null, lastLine: all('[data-line]').at(-1)?.getAttribute('data-line') ?? null,
      highlighted: all('[data-line].bg-amber-50').map((el) => el.getAttribute('data-line')),
    } : null,
    tabs: all('[role="tab"]').map((el) => text(el)),
    taskTeamTags: all('[data-test="memory-task-team-tag"]').length,
    browseCards: one('[data-test="memory-browse"]') ? all('[data-test="memory-browse"] a, [data-test="memory-browse"] button').length : null,
  }
}

const snap = () => page.evaluate(SNAP)
const waitFor = async (condition, ms) => {
  const t0 = Date.now()
  const seen = []
  let s
  for (;;) {
    s = await snap()
    const key = JSON.stringify([s.indexBadge, s.index?.status, s.index?.steps?.map((x) => [x.state, x.text.match(/\d[\d,]* of [\d,]*[^·]*·? ?\d*%?/)?.[0]]), s.search?.inputDisabled, s.search?.coverage, s.search?.results?.length])
    if (seen.at(-1)?.key !== key) seen.push({ t: Date.now() - t0, key })
    if (new Function('s', `return (${condition})`)(s)) break
    if (Date.now() - t0 > Number(ms)) { s.timeout = true; break }
    await page.waitForTimeout(250)
  }
  return { elapsedMs: Date.now() - t0, timeout: Boolean(s.timeout), seen: seen.map((x) => ({ t: x.t, state: JSON.parse(x.key) })), state: s }
}

if (command === 'go') {
  const t0 = Date.now()
  await page.evaluate((hash) => { location.hash = hash }, args[0])
  await page.waitForTimeout(500)
  console.log(JSON.stringify({ url: page.url(), ms: Date.now() - t0 }))
} else if (command === 'snap') {
  console.log(JSON.stringify(await snap(), null, 1))
} else if (command === 'click') {
  await page.locator(args[0]).first().click({ timeout: 20000 })
  await page.waitForTimeout(300)
  console.log(JSON.stringify({ clicked: args[0], at: new Date().toISOString() }))
} else if (command === 'fill') {
  await page.locator(args[0]).first().fill(args[1])
  console.log(JSON.stringify({ filled: args[0] }))
} else if (command === 'press') {
  await page.locator(args[0]).first().press(args[1])
  console.log(JSON.stringify({ pressed: args[1], at: new Date().toISOString() }))
} else if (command === 'wait') {
  console.log(JSON.stringify(await waitFor(args[0], args[1]), null, 1))
} else if (command === 'timed') {
  const t0 = Date.now()
  await page.locator(args[0]).first().click({ timeout: 20000 })
  const r = await waitFor(args[1], args[2])
  console.log(JSON.stringify({ clickToConditionMs: Date.now() - t0, ...r }, null, 1))
} else if (command === 'shot') {
  await page.screenshot({ path: args[0], fullPage: true })
  console.log(args[0])
} else if (command === 'eval') {
  console.log(JSON.stringify(await page.evaluate(args[0]), null, 1))
} else {
  throw new Error(`unknown command ${command}`)
}
await browser.close().catch(() => {})
