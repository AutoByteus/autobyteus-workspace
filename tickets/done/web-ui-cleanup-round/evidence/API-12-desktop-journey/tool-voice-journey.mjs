// ab320 temporary: AC-011 in the instance (Memory -> Search), keyboard-driven, with the microphone emulated (mic-inject.mjs).
// Usage: node voice-journey.mjs <controlPort> <label> [preset text] [shot prefix]
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, label, preset = '', shotPrefix = '', surface = 'memory'] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html'))
const gql = []
page.on('request', (r) => { if (r.url().includes('/graphql')) { try { const b = r.postDataJSON(); gql.push((Array.isArray(b) ? b : [b]).map((x) => x?.operationName).join('+')) } catch { gql.push('?') } } })
// The box and its voice button: Memory search input, or the chat composer's textarea (for comparison).
const input = surface === 'memory' ? page.locator('main input').first() : page.locator('[data-test=chat-composer] textarea').first()
const button = surface === 'memory' ? page.locator('main input ~ button, main input + * button, main .relative > button.rounded-full').first()
  : page.locator(['Start voice input', 'Stop recording', 'Starting microphone...', 'Transcribing...'].map((l) => `[data-test=chat-composer] button[aria-label="${l}"]`).join(', ')).first()
const focusInfo = () => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : ''}` : null })
const status = () => page.evaluate(() => [...document.querySelectorAll('[data-testid*=voice-status], [data-testid*=voice-error], [data-testid^=memory-search-voice], [data-testid*=task-voice]')].map((e) => `${e.getAttribute('data-testid')}: ${e.innerText.replace(/\s+/g, ' ').trim()}`))
const results = () => page.evaluate(() => (document.querySelector('main')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240))
const log = []
const snap = async (step) => log.push({ step, t: Date.now(), value: await input.inputValue(), button: await button.getAttribute('aria-label', { timeout: 2000 }).catch(() => null), disabled: await button.isDisabled({ timeout: 2000 }).catch(() => null), focus: await focusInfo(), status: await status() })
await input.fill(preset)
await input.focus()
await page.keyboard.press('End')
await page.keyboard.press('Tab')
const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
log.push({ step: 'tab from input', focused })
const before = await results()
const gqlBefore = gql.length
await page.keyboard.press('Enter')   // start
await page.waitForTimeout(400); await snap('after Enter (start)')
await page.waitForTimeout(2600); await snap('while recording')
if (shotPrefix) await page.screenshot({ path: `${shotPrefix}-recording.png` })
// Back to the button with the keyboard if focus left it (recorded in the log), then stop.
if (!/voice|record|stop/i.test(await focusInfo() || '')) { await input.focus(); await page.keyboard.press('End'); await page.keyboard.press('Tab'); log.push({ step: 'tab back to the button', focused: await focusInfo() }) }
await page.keyboard.press('Enter')   // stop
await page.waitForTimeout(300); await snap('after Enter (stop)')
if (shotPrefix) await page.screenshot({ path: `${shotPrefix}-transcribing.png` })
for (let i = 0; i < 60; i += 1) {
  await page.waitForTimeout(500)
  const lbl = await button.getAttribute('aria-label', { timeout: 2000 }).catch(() => null)
  const st = await status()
  if (/^Start/.test(lbl || '') && !st.some((s) => /transcrib/i.test(s))) break
}
await page.waitForTimeout(500); await snap('settled')
if (shotPrefix) await page.screenshot({ path: `${shotPrefix}-settled.png` })
const after = await results()
console.log(JSON.stringify({ label, log, graphqlDuringVoice: gql.slice(gqlBefore), resultsChanged: before !== after, resultsAfter: after.slice(0, 200), micCalls: await page.evaluate(() => window.__abMicCalls?.length ?? 0) }, null, 1))
process.exit(0)
